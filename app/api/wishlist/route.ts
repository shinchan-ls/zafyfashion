import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ✅ GET USER WISHLIST
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    const items = await prisma.wishlist.findMany({
      where: { userId: Number(userId) },
      include: {
        product: true, // ⭐ product details also
      },
      orderBy: { createdAt: "desc" },
    });

    const safeItems = items.map((item) => ({
      ...item,
      productId: item.productId.toString(), // ⭐ FIX
      product: {
        ...item.product,
        id: item.product.id.toString(), // ⭐ FIX
      },
    }));

    return NextResponse.json(safeItems);
  } catch (error) {
    console.error("Wishlist GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    );
  }
}

// ✅ ADD / REMOVE (TOGGLE)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, productId } = body;

    if (!userId || !productId) {
      return NextResponse.json(
        { error: "Missing userId or productId" },
        { status: 400 }
      );
    }

    const parsedProductId = BigInt(productId); // ⭐ IMPORTANT

    // 🔍 check if exists
    const existing = await prisma.wishlist.findFirst({
      where: {
        userId: Number(userId),
        productId: parsedProductId,
      },
    });

    // ❌ REMOVE
    if (existing) {
      await prisma.wishlist.delete({
        where: { id: existing.id },
      });

      return NextResponse.json({ added: false });
    }

    // ✅ ADD
    await prisma.wishlist.create({
      data: {
        userId: Number(userId),
        productId: parsedProductId,
      },
    });

    return NextResponse.json({ added: true });
  } catch (error) {
    console.error("Wishlist POST error:", error);
    return NextResponse.json(
      { error: "Wishlist operation failed" },
      { status: 500 }
    );
  }
}