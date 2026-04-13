
// app/api/payment/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { pushToSelloship } from "@/app/api/checkout/create/route";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("❌ RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const razorpaySignature = req.headers.get("x-razorpay-signature");
  if (!razorpaySignature) {
    return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (
    !crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(razorpaySignature, "hex")
    )
  ) {
    console.error("❌ Webhook signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = event?.event;
  console.log(`📨 Razorpay webhook received: ${eventType}`);

  if (eventType === "payment.captured") {
    const payment = event?.payload?.payment?.entity;

    if (!payment) {
      console.error("❌ Missing payment entity");
      return NextResponse.json({ received: true });
    }

    const razorpayOrderId = payment.order_id;
    const razorpayPaymentId = payment.id;

    if (!razorpayOrderId || !razorpayPaymentId) {
      console.error("❌ Missing IDs in payload");
      return NextResponse.json({ received: true });
    }

    try {
      await handlePaymentCaptured(razorpayOrderId, razorpayPaymentId);
    } catch (err) {
      console.error("❌ Handler error:", err);
      return NextResponse.json({ error: "Handler failed" }, { status: 500 });
    }
  }

  if (eventType === "payment.failed") {
    const payment = event?.payload?.payment?.entity;
    console.warn(
      `⚠️ Payment failed — order: ${payment?.order_id}, reason: ${payment?.error_description}`
    );
  }

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────

async function handlePaymentCaptured(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { razorpayOrderId },
  });

  if (!order) {
    console.warn(`⚠️ No order for ${razorpayOrderId}`);
    return;
  }

  if (order.paymentStatus === "PAID") {
    console.log(`✅ Already paid: ${order.orderNumber}`);
    return;
  }

  // ✅ FIXED HERE
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: "Confirmed",
        razorpayPaymentId,
      },
    });

    const orderItems = await tx.orderItem.findMany({
      where: { orderId: order.id },
    });

    for (const item of orderItems) {
      const result = await tx.product.updateMany({
        where: {
          id: item.productId,
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

  console.log(`✅ Webhook confirmed: ${updatedOrder.orderNumber}`);

  pushToSelloship(updatedOrder).catch((err) =>
    console.error("Selloship error:", err)
  );
}

