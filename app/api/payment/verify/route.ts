import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderNumber,
    } = body;

    // 🔒 Signature verification
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 🔒 Fetch order
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 🔁 Prevent duplicate processing
    if (existingOrder.paymentStatus === "PAID") {
      return NextResponse.json({ success: true });
    }

    // ✅ Mark as PAID
    const order = await prisma.order.update({
      where: { orderNumber },
      data: {
        paymentStatus: "PAID",
        status: "Confirmed",
      },
    });

    // 🚀 SELLOSHIP CALL (ONLY HERE)
    try {
      const formData = new FormData();

      formData.append("vendor_id", process.env.SELLOSHIP_VENDOR_ID!);
      formData.append("device_from", "4");
      formData.append("product_name", "Order Items");
      formData.append("price", order.totalAmount.toString());
      formData.append("first_name", order.customerName);
      formData.append("mobile_no", order.customerPhone);
      formData.append("address", order.shippingAddress);
      formData.append("state", order.state);
      formData.append("city", order.city);
      formData.append("zip_code", order.pincode);
      formData.append("payment_method", "1"); // prepaid
      formData.append("qty", "1");
      formData.append("custom_order_id", order.orderNumber);

      const res = await fetch("https://selloship.com/web_api/Create_order", {
        method: "POST",
        headers: {
          Authorization: process.env.SELLOSHIP_API_KEY!,
        },
        body: formData,
      });

      const data = await res.json();

      if (data?.order_id) {
        await prisma.order.update({
          where: { id: order.id },
          data: { selloshipOrderId: data.order_id.toString() },
        });
      }
    } catch (err) {
      console.error("Selloship error:", err);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("VERIFY ERROR:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}