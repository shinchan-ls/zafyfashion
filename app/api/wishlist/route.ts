// app/api/wishlist/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";


// ==================== GET - CURRENT USER WISHLIST ====================
export async function GET(req: NextRequest) {
  const session = await auth();

  // 🔒 AUTH CHECK
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 🔥 BLOCK ANY QUERY PARAMS
  if (req.nextUrl.searchParams.toString()) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userId = parseInt(session.user.id);

  try {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      select: {
        id: true,
        productId: true,
        product: {
          select: {
            id: true,
            title: true,
            images: true,
            price: true,
            stockQuantity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 🔥 CLEAN RESPONSE (NO userId, NO createdAt)
    const safeItems = items.map((item) => ({
      id: item.id.toString(),
      productId: item.productId.toString(),
      product: item.product
        ? {
            id: item.product.id.toString(),
            title: item.product.title,
            images: item.product.images,
            price: item.product.price,
            stockQuantity: item.product.stockQuantity,
          }
        : null,
    }));

    return NextResponse.json({ items: safeItems });

  } catch (error) {
    console.error("Wishlist GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    );
  }
}


// ==================== POST - TOGGLE WISHLIST ====================
export async function POST(req: NextRequest) {
  const session = await auth();

  // 🔒 AUTH CHECK
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const body = await req.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 }
      );
    }

    const parsedProductId = BigInt(productId);

    // 🔒 VALIDATE PRODUCT EXISTS
    const productExists = await prisma.product.findUnique({
      where: { id: parsedProductId },
      select: { id: true },
    });

    if (!productExists) {
      return NextResponse.json(
        { error: "Invalid product" },
        { status: 404 }
      );
    }

    // 🔥 SAFE TOGGLE (DELETE FIRST)
    const deleted = await prisma.wishlist.deleteMany({
      where: {
        userId,
        productId: parsedProductId,
      },
    });

    // ✅ REMOVED
    if (deleted.count > 0) {
      return NextResponse.json({
        success: true,
        added: false,
        message: "Removed from wishlist",
      });
    }

    // ✅ ADD (SAFE WITH UNIQUE CONSTRAINT)
    await prisma.wishlist.create({
      data: {
        userId,
        productId: parsedProductId,
      },
    });

    return NextResponse.json({
      success: true,
      added: true,
      message: "Added to wishlist",
    });

  } catch (error: any) {
    console.error("Wishlist POST error:", error);

    // 🔥 HANDLE DUPLICATE SAFELY
    if (error.code === "P2002") {
      return NextResponse.json({
        success: true,
        added: true,
      });
    }

    return NextResponse.json(
      { error: "Failed to update wishlist" },
      { status: 500 }
    );
  }
}