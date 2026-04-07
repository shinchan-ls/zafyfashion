// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Navbar from "@/components/Navbar";   // ← Yeh line add ki hai
import { useEffect, useState } from "react";
import HeroSlider from "@/components/HeroSlider";

// Category Configuration
const categories = [
  { name: "Perfumes", slug: "perfumes" },
  { name: "Watches", slug: "watches" },
  { name: "Men's Wallets", slug: "wallets" },
  { name: "Sunglasses", slug: "sunglasses" },
  { name: "Belts", slug: "belts" },
  { name: "Shoes", slug: "shoes" },
];

export default function Home() {
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products?limit=20");
        const allProducts = await res.json();

        if (Array.isArray(allProducts)) {
          setTrendingProducts(allProducts.slice(0, 8));

          const imagesMap: Record<string, string> = {};

          categories.forEach((cat) => {
            const found = allProducts.find((p: any) =>
              p.category?.toLowerCase().includes(cat.slug) ||
              p.subCategory?.toLowerCase().includes(cat.slug)
            );

            imagesMap[cat.slug] = found?.images?.[0]
              ? found.images[0]
              : "https://images.zafyfashion.com/products/default.jpg";
          });

          setCategoryImages(imagesMap);
        }
      } catch (error) {
        console.error("Failed to fetch homepage data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <>


      {/* Rolling Bar - Exact like Reference */}
      <div className="bg-black text-white py-2 text-xs md:text-sm overflow-hidden">
        <div className="flex w-max animate-marquee">

          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-12 px-6">
              <span>WELCOME TO OUR STORE</span>
              <span>FREE DELIVERY ALL OVER INDIA</span>
              <span>CASH ON DELIVERY AVAILABLE</span>
            </div>
          ))}

        </div>
      </div>

      {/* Navbar */}
      < Navbar />

    <HeroSlider />

      {/* Shop by Category */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-light text-center mb-12 tracking-wide">
            Shop by Category
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((cat) => {
              const imageUrl = categoryImages[cat.slug] || "https://images.zafyfashion.com/products/default.jpg";

              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="group relative aspect-[4/3.2] overflow-hidden rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500"
                >
                  <Image
                    src={imageUrl}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute bottom-6 left-6 text-white z-10">
                    <h3 className="text-2xl font-medium tracking-widest">
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
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-10">
            <h2 className="text-4xl font-light">Trending Products</h2>
            <Link href="/products" className="text-black hover:underline text-sm font-medium">
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading trending products...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {trendingProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}