import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";

interface CartItem {
  id: string | number;
  title: string;
  price: number;
  quantity: number;
}

export async function POST(req: NextRequest) {
  console.log("🔵 [CHECKOUT] API called");

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please login" }, { status: 401 });
  }

  const { cartItems, shippingAddress, paymentMethod = "COD" } = await req.json();

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  if (
    !shippingAddress?.phone ||
    !shippingAddress?.address ||
    !shippingAddress?.city ||
    !shippingAddress?.state ||
    !shippingAddress?.pincode
  ) {
    return NextResponse.json(
      { error: "Complete shipping address required" },
      { status: 400 }
    );
  }

  try {
    const totalAmount = cartItems.reduce(
      (sum: number, item: CartItem) =>
        sum + Number(item.price) * Number(item.quantity),
      0
    );

    // ✅ STOCK CHECK ONLY
    for (const item of cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: BigInt(item.id) },
      });

      if (!product || product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `${product?.title || "Item"} is out of stock` },
          { status: 400 }
        );
      }
    }

    // ✅ CREATE ORDER
    const order = await prisma.order.create({
      data: {
        userId: parseInt(session.user.id),
        orderNumber: `ZF${Date.now()}`,
        totalAmount,
        finalAmount: totalAmount,
        paymentMethod,
        paymentStatus: "PENDING",
        status: paymentMethod === "COD" ? "Confirmed" : "Pending",

        customerName:
          `${shippingAddress.firstName || ""} ${shippingAddress.lastName || ""}`.trim() ||
          "Customer",
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

    console.log(`✅ Order created: ${order.orderNumber}`);

    // =========================================
    // 🔥 COD FLOW
    // =========================================
    if (paymentMethod === "COD") {
      try {
        console.log("🚀 COD Order processing...");

        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: order.id },
        });

        // ✅ Reduce stock
        for (const item of orderItems) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        // ===============================
        // 🔥 FULL DEBUG SELLOSHIP
        // ===============================

        console.log("========== SELLOSHIP DEBUG START ==========");

        console.log("🔑 API KEY:", process.env.SELLOSHIP_API_KEY ? "EXISTS" : "MISSING");
        console.log("🏢 VENDOR ID:", process.env.SELLOSHIP_VENDOR_ID);

        console.log("🧾 Order:", {
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          name: order.customerName,
          phone: order.customerPhone,
          email: order.customerEmail,
        });

        console.log("🛒 Items:", orderItems);

        const formData = new FormData();

        const vendorId = process.env.SELLOSHIP_VENDOR_ID || "65518";
        formData.append("vendor_id", vendorId);
        formData.append("device_from", "4");

        const productName =
          orderItems.map(i => i.title).join(", ").slice(0, 200) || "Order Items";
        formData.append("product_name", productName);

        formData.append("price", order.totalAmount.toString());
        formData.append("old_price", order.totalAmount.toString());

        const fullName = order.customerName || "Customer User";
        const [firstName, ...rest] = fullName.split(" ");
        const lastName = rest.join(" ") || "User";

        formData.append("first_name", firstName);
        formData.append("last_name", lastName);

        formData.append("mobile_no", order.customerPhone);
        formData.append("email", order.customerEmail || "test@gmail.com");

        formData.append("address", order.shippingAddress);
        formData.append("state", order.state);
        formData.append("city", order.city);
        formData.append("zip_code", order.pincode);

        formData.append("landmark", "Near Main Road");

        formData.append("payment_method", "3");

        const totalQty = orderItems.reduce((sum, i) => sum + i.quantity, 0);
        formData.append("qty", totalQty.toString());

        formData.append("custom_order_id", order.orderNumber);

        console.log("📤 FINAL FORMDATA:");
        for (const pair of formData.entries()) {
          console.log(pair[0] + ": " + pair[1]);
        }

        const res = await fetch("https://selloship.com/web_api/Create_order", {
          method: "POST",
          headers: {
            Authorization: process.env.SELLOSHIP_API_KEY!,
          },
          body: formData,
        });

        console.log("📡 HTTP STATUS:", res.status);

        const text = await res.text();
        console.log("📦 RAW RESPONSE:", text);

        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          console.log("❌ JSON PARSE FAILED");
        }

        console.log("📦 PARSED:", data);

        const selloshipOrderId =
          data?.order_id ||
          data?.data?.order_id ||
          data?.selloship_order_id;

        console.log("🆔 ORDER ID:", selloshipOrderId);

        if (selloshipOrderId) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              selloshipOrderId: selloshipOrderId.toString(),
            },
          });

          console.log("✅ SAVED IN DB");
        } else {
          console.log("❌ FAILED:", data?.msg);
        }

        console.log("========== SELLOSHIP DEBUG END ==========");

      } catch (err) {
        console.error("❌ COD ERROR:", err);
      }
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
    });

  } catch (error: any) {
    console.error("💥 Checkout Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to place order" },
      { status: 500 }
    );
  }
}