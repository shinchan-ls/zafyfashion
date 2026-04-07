// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { serializeData } from "@/lib/serialize";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        if (isNaN(userId)) {
            return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "5");

        const skip = (page - 1) * limit;

        const totalOrders = await prisma.order.count({ where: { userId } });
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, title: true, images: true, price: true },
                        },
                    },
                },
                trackingEvents: true,
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        });

        const safeData = JSON.parse(
            JSON.stringify(
                {
                    orders,
                    totalPages,
                    currentPage: page,
                    totalOrders,
                },
                (_, value) => (typeof value === "bigint" ? value.toString() : value)
            )
        );
        console.log(typeof orders[0].totalAmount);

        return NextResponse.json(safeData);

    } catch (error: any) {
        console.error("Error fetching orders:", error);
        
        return NextResponse.json(
            { error: "Failed to fetch orders" },
            { status: 500 }
        );
    }
}