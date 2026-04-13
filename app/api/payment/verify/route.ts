
import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import crypto from "crypto";
import { pushToSelloship } from "@/app/api/checkout/create/route";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 verify attempts per minute per IP
    const rateLimited = await checkRateLimit(req);
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment fields" },
        { status: 400 }
      );
    }

    // ── Signature verification (HMAC-SHA256) ─────────────────────────────
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(razorpay_signature, "hex")
    );

    if (!signaturesMatch) {
      console.error("Signature mismatch");
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // ── Find order ───────────────────────────────────────────────────────
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // ── Idempotency check ────────────────────────────────────────────────
    if (order.paymentStatus === "PAID") {
      console.log("Already paid (webhook ran first):", order.orderNumber);
      return NextResponse.json({ success: true });
    }

    // ── Atomic transaction ───────────────────────────────────────────────
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Mark order as paid
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "Confirmed",
          razorpayPaymentId: razorpay_payment_id,
        },
      });

      // 2. Fetch order items
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
      });

      // 3. Deduct stock safely
      for (const item of orderItems) {
        const result = await tx.product.updateMany({
          where: {
            id: item.productId, // BigInt safe
            stockQuantity: { gte: item.quantity },
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        if (result.count === 0) {
          console.error(
            `⚠️ Stock issue: product ${item.productId}, order ${order.orderNumber}`
          );
        }
      }

      return updated;
    });

    console.log(`Payment verified: ${updatedOrder.orderNumber}`);

    // ── Async fulfillment (non-blocking) ─────────────────────────────────
    pushToSelloship(updatedOrder).catch((err) =>
      console.error("Selloship async error (verify):", err)
    );

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("VERIFY ERROR:", err);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}

