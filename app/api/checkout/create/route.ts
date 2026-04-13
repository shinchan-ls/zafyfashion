// app/api/checkout/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { checkCheckoutRateLimit } from "@/lib/ratelimit";

interface CartItem {
  id: string | number;
  title: string;
  price: number;
  quantity: number;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please login" }, { status: 401 });
  }

  // Rate limit: 3 checkout attempts per minute per user
  const rateLimited = await checkCheckoutRateLimit(req, session.user.id);
  if (rateLimited) return rateLimited;

  const { cartItems, shippingAddress, paymentMethod = "COD" } = await req.json();

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  if (
    !shippingAddress?.name ||
    !shippingAddress?.phone ||
    !shippingAddress?.address ||
    !shippingAddress?.city ||
    !shippingAddress?.state ||
    !shippingAddress?.pincode
  ) {
    return NextResponse.json({ error: "Complete shipping address is required" }, { status: 400 });
  }

  if (!/^\d{6}$/.test(shippingAddress.pincode)) {
    return NextResponse.json({ error: "Invalid pincode. Must be exactly 6 digits." }, { status: 400 });
  }

  if (!/^\d{10}$/.test(shippingAddress.phone)) {
    return NextResponse.json({ error: "Invalid phone number. Must be exactly 10 digits." }, { status: 400 });
  }

  try {
    const totalAmount = cartItems.reduce(
      (sum: number, item: CartItem) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    // ── Stock check (read-only, fast fail before creating anything) ───────────
    for (const item of cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: BigInt(item.id) },
      });
      if (!product || product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `"${product?.title || "Item"}" is out of stock or insufficient quantity` },
          { status: 400 }
        );
      }
    }

    const isCOD = paymentMethod === "COD";

    // ── Create order ───────────────────────────────────────────────────────────
    const order = await prisma.order.create({
      data: {
        userId: parseInt(session.user.id),
        orderNumber: `ZF${Date.now()}`,
        totalAmount,
        finalAmount: totalAmount,
        paymentMethod,
        paymentStatus: "PENDING",
        status: isCOD ? "Confirmed" : "Pending",

        customerName: shippingAddress.name || "Customer",
        customerPhone: shippingAddress.phone,
        customerEmail: session.user.email || "",

        shippingAddress: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,

        items: {
          create: cartItems.map((item: CartItem) => ({
            productId: BigInt(item.id),
            title: item.title,
            price: Number(item.price),
            quantity: Number(item.quantity),
            subtotal: Number(item.price) * Number(item.quantity),
          })),
        },
      },
    });

    // ── COD: deduct stock atomically + push to Selloship ──────────────────────
    if (isCOD) {
      const stockOk = await deductStockSafe(order.id);
      if (!stockOk) {
        // Another user grabbed the last item between our check and now
        // Roll back by deleting the order we just created
        await prisma.order.delete({ where: { id: order.id } });
        return NextResponse.json(
          { error: "One or more items just went out of stock. Please review your cart." },
          { status: 409 }
        );
      }

      pushToSelloship(order).catch((err) =>
        console.error("Selloship async error (COD):", err)
      );
    }
    // Razorpay: stock deducted ONLY after payment.captured (in verify + webhook)

    return NextResponse.json({ success: true, orderNumber: order.orderNumber });

  } catch (error: any) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Failed to place order" }, { status: 500 });
  }
}

// ─── Race-condition-proof stock deduction ────────────────────────────────────
// Uses updateMany with WHERE stockQuantity >= quantity.
// If two requests run simultaneously, only one will match — the other gets count=0.
// Returns false if ANY item couldn't be deducted (triggers order rollback for COD).
export async function deductStockSafe(orderId: number): Promise<boolean> {
  const orderItems = await prisma.orderItem.findMany({ where: { orderId } });

  for (const item of orderItems) {
    const result = await prisma.product.updateMany({
      where: {
        id: item.productId,
        stockQuantity: { gte: item.quantity }, // atomic guard — this is the key line
      },
      data: { stockQuantity: { decrement: item.quantity } },
    });

    if (result.count === 0) {
      // This item lost the race — stock hit 0 between check and deduction
      console.error(`Stock race lost: product ${item.productId}, order ${orderId}`);
      return false;
    }
  }

  return true;
}

// ─── Selloship integration ────────────────────────────────────────────────────
export async function pushToSelloship(order: any): Promise<void> {
  try {
    if (order.selloshipOrderId) return; // idempotent

    const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });

    const formData = new FormData();
    formData.append("vendor_id", process.env.SELLOSHIP_VENDOR_ID!);
    formData.append("device_from", "4");

    const productName =
      orderItems
        .map((item: { title: string }) => item.title)
        .join(", ")
        .slice(0, 200) || "Multiple Items"; formData.append("product_name", productName);
    formData.append("price", order.totalAmount.toString());
    formData.append("old_price", order.totalAmount.toString());

    const fullName = order.customerName || "Customer User";
    const [firstName, ...rest] = fullName.split(" ");
    formData.append("first_name", firstName);
    formData.append("last_name", rest.join(" ") || "User");

    formData.append("mobile_no", order.customerPhone);
    formData.append("email", order.customerEmail || "zafyfashionhub@gmail.com");
    formData.append("address", order.shippingAddress);
    formData.append("state", order.state);
    formData.append("city", order.city);
    formData.append("zip_code", order.pincode);
    formData.append("landmark", "Near Main Road");
    formData.append("payment_method", order.paymentMethod === "COD" ? "3" : "1");

    const totalQty = orderItems.reduce(
      (sum: number, item: { quantity: number }) => sum + item.quantity,
      0
    );
    formData.append("qty", totalQty.toString());
    formData.append("custom_order_id", order.orderNumber);

    const res = await fetch("https://selloship.com/web_api/Create_order", {
      method: "POST",
      headers: { Authorization: process.env.SELLOSHIP_API_KEY! },
      body: formData,
    });

    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { }

    const selloshipId = data.selloship_order_id || data.order_id;
    if (selloshipId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { selloshipOrderId: selloshipId.toString() },
      });
      console.log("Selloship linked:", selloshipId);
    } else {
      throw new Error(data.msg || "Invalid Selloship response");
    }
  } catch (err) {
    console.error("Selloship failed for order:", order.id, err);
    // Never re-throw — order must not fail because of Selloship
  }
}