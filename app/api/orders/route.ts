// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "5");
    const skip = (page - 1) * limit;

    const totalOrders = await prisma.order.count({ where: { userId } });
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,   // ← Changed to true (full product)
          },
        },
        trackingEvents: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Safe + Robust Serialization
    const safeOrders = orders.map((order: any) => ({
      ...order,
      id: String(order.id),
      userId: String(order.userId),
      totalAmount: Number(order.totalAmount),
      finalAmount: Number(order.finalAmount),

      items: order.items.map((item: any) => ({
        ...item,
        id: String(item.id),
        orderId: String(item.orderId),
        productId: item.productId ? String(item.productId) : null,
        price: Number(item.price),
        subtotal: Number(item.subtotal),

        // Fallback if product is missing
        product: item.product ? {
          id: String(item.product.id),
          title: item.product.title,
          images: Array.isArray(item.product.images) ? item.product.images : [],
          price: Number(item.product.price),
        } : {
          id: "0",
          title: item.title || "Product",
          images: ["/placeholder.jpg"],
          price: Number(item.price),
        },
      })),

      trackingEvents: order.trackingEvents.map((e: any) => ({
        ...e,
        id: String(e.id),
        orderId: String(e.orderId),
      })),
    }));

    return NextResponse.json({
      orders: safeOrders,
      totalPages,
      currentPage: page,
      totalOrders,
    });

  } catch (error: any) {
    console.error("Orders API Error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}