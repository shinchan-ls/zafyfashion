// app/api/products/category/[slug]/route.ts
//
// ⚠️  THIS ROUTE IS DEPRECATED.
//
// Use the main route with a query param instead:
//   GET /api/products?category=Watches&page=1&limit=20
//
// That route handles pagination, caching, and serialization correctly.
// This file is kept only for backward compatibility with any existing links.
//
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Canonical category names — must match exactly what's stored in DB
// (output of your map_categories.py script)
const VALID_CATEGORIES = new Set([
  "Watches", "Perfumes", "Wallets", "Sunglasses", "Belts", "Shoes",
  "Bags", "T-Shirts", "Shirts", "Polo T-Shirts", "Jeans & Denim",
  "Bottoms", "Jackets & Hoodies", "Sweatshirts", "Coord Sets",
  "Caps & Hats", "Accessories", "Clothing", "Kids", "Other",
]);

// slug in URL → DB category name
// e.g. /api/products/category/jeans-denim → "Jeans & Denim"
function slugToCategory(slug: string): string | null {
  // Try exact match first
  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug.toLowerCase()) {
      return cat;
    }
  }
  return null;
}

function serialize(p: any) {
  return {
    ...p,
    id:             p.id.toString(),
    price:          Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    images:         p.images?.slice(0, 1) ?? [],
  };
}

const PRODUCT_SELECT = {
  id: true, title: true, slug: true, price: true,
  compareAtPrice: true, discountPercentage: true,
  stockQuantity: true, category: true, subCategory: true,
  images: true, status: true, isFeatured: true, isNewArrival: true,
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);

    const rawLimit = parseInt(searchParams.get("limit") ?? "20");
    const rawPage  = parseInt(searchParams.get("page")  ?? "1");
    const limit    = isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);
    const page     = isNaN(rawPage)  ? 1  : Math.max(rawPage, 1);
    const skip     = (page - 1) * limit;

    // Resolve slug → DB category name
    const category = slugToCategory(slug);

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const where = {
      status:   "Active" as const,
      category: { equals: category, mode: "insensitive" as const },
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take:    limit,
        skip,
        select:  PRODUCT_SELECT,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json(
      {
        products:    products.map(serialize),
        total,
        page,
        limit,
        totalPages:  Math.ceil(total / limit),
        hasNextPage: skip + products.length < total,
        category,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );

  } catch (err) {
    console.error("[GET /api/products/category/[slug]]", err);
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 });
  }
}