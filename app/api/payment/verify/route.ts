// app/api/payment/verify/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { pushToSelloship } from "@/app/api/checkout/create/route";
import { checkRateLimit } from "@/lib/ratelimit";
import { NextRequest } from "next/server";

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
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    // ── Signature verification (HMAC-SHA256) ────────────────────────────────────
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // timingSafeEqual prevents timing-based attacks
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(razorpay_signature,  "hex")
    );

    if (!signaturesMatch) {
      console.error("Signature mismatch");
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // ── Find order by razorpayOrderId — never trust orderNumber from frontend ───
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ── Idempotency: webhook may have already processed this ────────────────────
    if (order.paymentStatus === "PAID") {
      console.log("Already paid (webhook ran first):", order.orderNumber);
      return NextResponse.json({ success: true });
    }

    // ── Atomic transaction: mark paid + race-condition-proof stock deduction ────
    const updatedOrder = await prisma.$transaction(async (tx: typeof prisma) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "Confirmed",
          razorpayPaymentId: razorpay_payment_id,
        },
      });

      const orderItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
      });

      for (const item of orderItems) {
        // RACE-CONDITION FIX:
        // updateMany with WHERE stockQuantity >= quantity
        // Two simultaneous transactions: only ONE will match the WHERE clause.
        // The other gets count=0 — stock can never go below 0.
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQuantity: { gte: item.quantity },
          },
          data: { stockQuantity: { decrement: item.quantity } },
        });

        if (result.count === 0) {
          // Payment is real — log for manual fulfilment, don't throw
          console.error(
            `Insufficient stock: product ${item.productId}, order ${order.orderNumber} — manual review needed`
          );
        }
      }

      return updated;
    });

    console.log(`Payment verified: ${updatedOrder.orderNumber}`);

    pushToSelloship(updatedOrder).catch((err) =>
      console.error("Selloship async error (verify):", err)
    );

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("VERIFY ERROR:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}