// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useEffect, useState } from "react";

// Updated Category List (Women Purse removed, Watch added)
const categories = [
  { name: "Perfumes", slug: "perfumes" },
  { name: "Watch", slug: "watches" },
  { name: "Men's Wallets", slug: "wallets" },
  { name: "Goggles", slug: "sunglasses" },
  { name: "Belts", slug: "belts" },
  { name: "Shoes", slug: "shoes" },
];

export default function Home() {
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Fetch trending products + one image per category
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products");
        const allProducts = await res.json();

        if (Array.isArray(allProducts)) {
          // Trending Products (first 8)
          setTrendingProducts(allProducts.slice(0, 8));

          // Get one good image for each category
          const imagesMap: Record<string, string> = {};

          categories.forEach(cat => {
            const found = allProducts.find((p: any) => 
              p.category.toLowerCase().includes(cat.slug) ||
              (p.subCategory && p.subCategory.toLowerCase().includes(cat.slug))
            );

            if (found && found.images && found.images.length > 0) {
              imagesMap[cat.slug] = found.images[0];   // first image of that category
            } else {
              imagesMap[cat.slug] = "https://images.zafyfashion.com/products/default.jpg";
            }
          });

          setCategoryImages(imagesMap);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      {/* Hero Banner */}
      <div className="relative h-[80vh] bg-black overflow-hidden">
        <Image
          src="https://images.zafyfashion.com/hero/watch-hero.jpg"
          alt="Hero"
          fill
          className="object-cover opacity-90"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
          <h1 className="text-6xl md:text-7xl font-light tracking-wide mb-4">
            CAPTURING LIFE
          </h1>
          <h2 className="text-5xl md:text-6xl font-light italic mb-8">
            ONE SECOND <span className="not-italic">at a</span> TIME
          </h2>
          <p className="max-w-md text-lg mb-10">
            Crafted with uncompromising attention to detail
          </p>
          <Link
            href="/products"
            className="bg-white text-black px-10 py-4 rounded-full font-medium hover:bg-gray-200 transition text-lg"
          >
            SHOP NOW
          </Link>
        </div>
      </div>

      {/* Shop by Category */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-light text-center mb-12">Shop by Category</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((cat) => {
              const imageUrl = categoryImages[cat.slug] || "https://images.zafyfashion.com/products/default.jpg";

              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500"
                >
                  <Image
                    src={imageUrl}
                    alt={cat.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute bottom-6 left-6 text-white z-10">
                    <h3 className="text-2xl md:text-3xl font-medium tracking-wider leading-none">
                      {cat.name.toUpperCase()}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trending Products */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-10">
            <h2 className="text-4xl font-light">Trending Products</h2>
            <Link href="/products" className="text-black hover:underline">
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-10">Loading trending products...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {trendingProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}