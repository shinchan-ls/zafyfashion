// app/api/payment/status/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get("orderNumber");

  if (!orderNumber) {
    return NextResponse.json(
      { error: "Missing orderNumber" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      userId: true,
      paymentStatus: true,
      status: true,
      paymentMethod: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Ensure the order belongs to the requesting user
  if (order.userId !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    paymentStatus: order.paymentStatus,
    status: order.status,
    paymentMethod: order.paymentMethod,
  });
}
