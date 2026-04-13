// app/api/payment/create-order/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderNumber } = await req.json();

  if (!orderNumber) {
    return NextResponse.json({ error: "Missing orderNumber" }, { status: 400 });
  }

  // Fetch order from DB — never trust frontend for amounts
  const order = await prisma.order.findUnique({
    where: { orderNumber },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Security: ensure this order belongs to the requesting user
  if (order.userId !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If already paid — no point creating a new Razorpay order
  if (order.paymentStatus === "PAID") {
    return NextResponse.json(
      { error: "Order is already paid" },
      { status: 409 }
    );
  }

  // ── Idempotency: reuse existing Razorpay order if present ─────────────────
  if (order.razorpayOrderId) {
    try {
      // Fetch from Razorpay to make sure it's still open
      const existing = await razorpay.orders.fetch(order.razorpayOrderId);
      if (existing.status !== "paid") {
        return NextResponse.json({
          id: existing.id,
          amount: existing.amount,
          currency: existing.currency,
        });
      }
      // If razorpay says paid but we don't — handle gracefully
    } catch (err) {
      console.error("Failed to fetch existing Razorpay order:", err);
      // Fall through to create a new one
    }
  }

  // ── Create new Razorpay order ──────────────────────────────────────────────
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(Number(order.finalAmount) * 100), // paise
    currency: "INR",
    receipt: order.orderNumber,
  });

  // Store Razorpay order ID
  await prisma.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: razorpayOrder.id },
  });

  return NextResponse.json({
    id: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
  });
}
