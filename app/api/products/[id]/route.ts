// app/api/products/[id]/route.ts
// FIXES:
//   ISSUE 3 — Secure: strip internal/sensitive fields, validate id strictly

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// What the PDP (product detail page) needs — nothing more
const PUBLIC_SELECT = {
  id:                 true,
  title:              true,
  slug:               true,
  price:              true,
  compareAtPrice:     true,
  discountPercentage: true,
  stockQuantity:      true,
  category:           true,
  subCategory:        true,
  size:               true,
  color:              true,
  description:        true,
  images:             true,   // all images on detail page
  tags:               true,
  variants:           true,
  status:             true,
  vendor:             true,
  isFeatured:         true,
  isNewArrival:       true,
  averageRating:      true,
  reviewCount:        true,
  // NOT included: weightGrams, createdAt, updatedAt, sourceUrl
} as const;

function serialize(p: any) {
  return {
    id:                 p.id.toString(),
    title:              p.title,
    slug:               p.slug,
    price:              Number(p.price),
    compareAtPrice:     p.compareAtPrice ? Number(p.compareAtPrice) : null,
    discountPercentage: p.discountPercentage,
    stockQuantity:      p.stockQuantity,
    category:           p.category,
    subCategory:        p.subCategory ?? null,
    size:               p.size ?? null,
    color:              p.color ?? null,
    description:        p.description ?? null,
    images:             p.images ?? [],
    tags:               p.tags ?? [],
    variants:           p.variants ?? null,
    status:             p.status,
    vendor:             p.vendor ?? null,
    isFeatured:         p.isFeatured,
    isNewArrival:       p.isNewArrival,
    averageRating:      Number(p.averageRating),
    reviewCount:        p.reviewCount,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Strict validation — only digits, no negative, no floats
    if (!/^\d{1,20}$/.test(id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where:  { id: BigInt(id) },
      select: PUBLIC_SELECT,
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Only serve Active products publicly
    if (product.status !== "Active") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(serialize(product), {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
    });

  } catch (err) {
    console.error("[GET /api/products/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}