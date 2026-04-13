// app/api/products/route.ts
// FIX: default route now returns { products, total, hasNextPage } — same shape as category route
//      so ProductsClient can show the correct total count instead of just the loaded page count.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PRODUCT_SELECT = {
  id:                 true,
  title:              true,
  slug:               true,
  price:              true,
  compareAtPrice:     true,
  discountPercentage: true,
  stockQuantity:      true,
  category:           true,
  subCategory:        true,
  images:             true,
  status:             true,
  isFeatured:         true,
  isNewArrival:       true,
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
    images:             p.images?.slice(0, 1) ?? [],
    status:             p.status,
    isFeatured:         p.isFeatured,
    isNewArrival:       p.isNewArrival,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const featured  = searchParams.get("featured") === "true";
    const category  = searchParams.get("category")?.trim() ?? "";
    const rawLimit  = parseInt(searchParams.get("limit") ?? "20");
    const rawPage   = parseInt(searchParams.get("page")  ?? "1");
    const limit     = isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);
    const page      = isNaN(rawPage)  ? 1  : Math.max(rawPage, 1);
    const skip      = (page - 1) * limit;

    // ── ?featured=true ───────────────────────────────────────────────────────
    if (featured) {
      const rows = await prisma.product.findMany({
        where:   { isFeatured: true, status: "Active" },
        orderBy: { id: "desc" },
        take:    10,
        select:  PRODUCT_SELECT,
      });
      return NextResponse.json(rows.map(serialize), {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }

    // ── ?category=Watches ────────────────────────────────────────────────────
    if (category) {
      const where = {
        status:   "Active" as const,
        category: { equals: category, mode: "insensitive" as const },
      };
      const [rows, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { id: "desc" },
          take: limit,
          skip,
          select: PRODUCT_SELECT,
        }),
        prisma.product.count({ where }),
      ]);
      return NextResponse.json(
        {
          products:    rows.map(serialize),
          total,
          page,
          limit,
          totalPages:  Math.ceil(total / limit),
          hasNextPage: skip + rows.length < total,
        },
        { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
      );
    }

    // ── default: all active products (homepage trending + /products page) ────
    // ✅ FIX: Now returns { products, total, hasNextPage } instead of a plain array.
    //         This lets ProductsClient show the real total count (e.g. "9,842 total")
    //         instead of just the page count (e.g. "24 total").
    const where = { status: "Active" as const };
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { id: "desc" },
        take: limit,
        skip,
        select: PRODUCT_SELECT,
      }),
      prisma.product.count({ where }),
    ]);
    return NextResponse.json(
      {
        products:    rows.map(serialize),
        total,
        page,
        limit,
        totalPages:  Math.ceil(total / limit),
        hasNextPage: skip + rows.length < total,
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );

  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}