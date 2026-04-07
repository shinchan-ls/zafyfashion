// app/api/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        handle: true,
        price: true,
        compareAtPrice: true,
        discountPercentage: true,
        stockQuantity: true,
        category: true,
        subCategory: true,
        images: true,
        tags: true,
        status: true,
        vendor: true,
        isFeatured: true,
        isNewArrival: true,
      },
    });

    // Convert BigInt to string
    const serializedProducts = products.map((product: any) => ({
      ...product,
      id: product.id.toString(),
    }));

    return NextResponse.json(serializedProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}