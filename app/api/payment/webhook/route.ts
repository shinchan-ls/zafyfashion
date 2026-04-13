// app/api/payment/webhook/route.ts
//
// ─── SETUP INSTRUCTIONS ───────────────────────────────────────────────────────
// 1. Razorpay Dashboard → Settings → Webhooks → Add New Webhook
// 2. URL: https://www.zafyfashion.com/api/payment/webhook
// 3. Secret: generate a strong random string, save as RAZORPAY_WEBHOOK_SECRET in .env
// 4. Events to enable: payment.captured  (also tick payment.failed for logging)
// 5. Active: YES
//
// NOTE: This is the FALLBACK. Your /api/payment/verify still runs when the user's
// browser is open. The webhook catches the cases where the browser closes first.
// Both routes are safe to run — the PAID idempotency check prevents double-processing.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
// import { Prisma } from "@prisma/client";
import { pushToSelloship } from "@/app/api/checkout/create/route";

// Razorpay sends raw body — we MUST read it as text to verify the signature.
// If we call req.json() first, the raw bytes change and signature check fails.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // ── 1. Verify webhook signature ─────────────────────────────────────────────
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

  if (!crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(razorpaySignature,  "hex")
  )) {
    console.error("❌ Webhook signature mismatch — possible spoofed request");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── 2. Parse event ───────────────────────────────────────────────────────────
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = event?.event;
  console.log(`📨 Razorpay webhook received: ${eventType}`);

  // ── 3. Handle payment.captured ───────────────────────────────────────────────
  if (eventType === "payment.captured") {
    const payment = event?.payload?.payment?.entity;

    if (!payment) {
      console.error("❌ Webhook: missing payment entity");
      // Return 200 so Razorpay doesn't retry — this is a malformed event
      return NextResponse.json({ received: true });
    }

    const razorpayOrderId  = payment.order_id;   // rzp_ord_xxx
    const razorpayPaymentId = payment.id;          // pay_xxx

    if (!razorpayOrderId || !razorpayPaymentId) {
      console.error("❌ Webhook: missing order_id or payment id in payload");
      return NextResponse.json({ received: true });
    }

    try {
      await handlePaymentCaptured(razorpayOrderId, razorpayPaymentId);
    } catch (err) {
      console.error("❌ Webhook handler error:", err);
      // Return 500 so Razorpay retries this webhook
      return NextResponse.json({ error: "Handler failed" }, { status: 500 });
    }
  }

  // ── 4. Handle payment.failed (logging only) ──────────────────────────────────
  if (eventType === "payment.failed") {
    const payment = event?.payload?.payment?.entity;
    console.warn(`⚠️ Payment failed webhook — order: ${payment?.order_id}, reason: ${payment?.error_description}`);
    // No DB change needed — order stays Pending, user can retry via account page
  }

  // Always return 200 for events we don't handle — prevents Razorpay retry spam
  return NextResponse.json({ received: true });
}

// ─── Core handler (shared logic with /api/payment/verify) ────────────────────
async function handlePaymentCaptured(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<void> {
  // Find our order by Razorpay order ID
  const order = await prisma.order.findUnique({
    where: { razorpayOrderId },
  });

  if (!order) {
    // Could be a test payment or a payment for an order that was already cancelled
    console.warn(`⚠️ Webhook: no order found for razorpayOrderId=${razorpayOrderId}`);
    return;
  }

  // ── Idempotency: already marked paid (browser verify ran first) ──────────────
  if (order.paymentStatus === "PAID") {
    console.log(`✅ Webhook: order ${order.orderNumber} already paid — skipping`);
    return;
  }

  // ── Atomic transaction: mark paid + deduct stock ─────────────────────────────
  const updatedOrder = await prisma.$transaction(async (tx: typeof prisma) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: "Confirmed",
        razorpayPaymentId,
      },
    });

    // Safe stock deduction (race-condition-proof version)
    const orderItems = await tx.orderItem.findMany({
      where: { orderId: order.id },
    });

    for (const item of orderItems) {
      const result = await tx.product.updateMany({
        where: {
          id: item.productId,
          stockQuantity: { gte: item.quantity }, // only deduct if enough stock
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      if (result.count === 0) {
        // Stock ran out between order creation and payment — log but don't fail
        // The order is paid; you handle fulfilment manually for this edge case
        console.error(
          `⚠️ Stock insufficient for product ${item.productId} on order ${order.orderNumber} — manual fulfilment needed`
        );
      }
    }

    return updated;
  });

  console.log(`✅ Webhook: order ${updatedOrder.orderNumber} confirmed via webhook`);

  // Push to Selloship non-blocking
  pushToSelloship(updatedOrder).catch((err) =>
    console.error("Selloship async error (webhook):", err)
  );
}