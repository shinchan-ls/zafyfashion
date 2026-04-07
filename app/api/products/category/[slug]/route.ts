// app/api/products/category/[slug]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { category: { contains: slug, mode: "insensitive" } },
          { subCategory: { contains: slug, mode: "insensitive" } },
        ],
      },
      orderBy: { 
        createdAt: "desc" 
      },
    });

    // Convert BigInt to string before sending JSON
    const serializedProducts = products.map(product => ({
      ...product,
      id: product.id.toString(),           // BigInt → String
    }));

    return NextResponse.json(serializedProducts);
  } catch (error) {
    console.error("Category fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch category products" }, 
      { status: 500 }
    );
  }
}