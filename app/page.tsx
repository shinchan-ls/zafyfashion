// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";
import ProductCard from "@/components/ProductCard";
import HeroSlider from "@/components/HeroSlider";

const CATEGORIES = [
  { name: "Shoes",             href: "/category/shoes",           image: "https://images.zafyfashion.com/products/69d8d8ffc8679.jpeg" },
  { name: "Watches",           href: "/category/watches",         image: "https://images.zafyfashion.com/products/69d9165cb1fa2.jpeg" },
  { name: "Bags",              href: "/category/bags",            image: "https://images.zafyfashion.com/products/69d913b33e8b70.jpg" },
  { name: "Shirts",            href: "/category/shirts",          image: "https://images.zafyfashion.com/products/68643ec4bc6f00.jpeg" },
  { name: "T-Shirts",          href: "/category/t-shirts",        image: "https://images.zafyfashion.com/products/68d529e9e349b0.jpeg" },
  { name: "Polo T-Shirts",     href: "/category/polo-t-shirts",   image: "https://images.zafyfashion.com/products/67372e5add8210.jpeg" },
  { name: "Sunglasses",        href: "/category/sunglasses",      image: "https://images.zafyfashion.com/products/69d906043f4ca0.jpeg" },
  { name: "Perfumes",          href: "/category/perfumes",        image: "https://images.zafyfashion.com/products/69d90d3b47e770.jpg" },
  { name: "Wallets",           href: "/category/wallets",         image: "https://images.zafyfashion.com/products/69d7dbd382a730.jpg" },
  { name: "Jeans & Denim",     href: "/category/jeans-denim",     image: "https://images.zafyfashion.com/products/686e23729d3d90.jpg" },
  { name: "Jackets & Hoodies", href: "/category/jackets-hoodies", image: "https://images.zafyfashion.com/products/675804407d5880.jpg" },
  { name: "Belts",             href: "/category/belts",           image: "https://images.zafyfashion.com/products/69d9129d89d5b0.jpeg" },
  { name: "Caps & Hats",       href: "/category/caps-hats",       image: "https://images.zafyfashion.com/products/66349c84dc0030.jpeg" },
  { name: "Bottoms",           href: "/category/bottoms",         image: "https://images.zafyfashion.com/products/66aa55d292c960.jpeg" },
  { name: "Coord Sets",        href: "/category/coord-sets",      image: "https://images.zafyfashion.com/products/683ebf8ac764b0.jpg" },
  { name: "Clothing",          href: "/category/clothing",        image: "https://images.zafyfashion.com/products/67d5412ce5e6c0.jpg" },
  { name: "Accessories",       href: "/category/accessories",     image: "https://images.zafyfashion.com/products/68dd0cdf19c7a0.png" },
  { name: "Other",             href: "/category/other",           image: "https://images.zafyfashion.com/products/683b48f5453a00.jpg" },
];

function ProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 aspect-[3/4] rounded-2xl mb-3" />
      <div className="bg-gray-200 h-4 rounded w-3/4 mb-2" />
      <div className="bg-gray-200 h-4 rounded w-1/2" />
    </div>
  );
}

const LIMIT = 12;

export default function Home() {
  const [products, setProducts]             = useState<any[]>([]);
  const [hasMore, setHasMore]               = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);

  const loaderRef   = useRef<HTMLDivElement>(null);
  const pageRef     = useRef(1);
  const fetchingRef = useRef(false);
  const seenIds     = useRef(new Set<string>());

  const fetchPage = useCallback(async (pageNum: number, signal?: AbortSignal) => {
    // Guard: skip if already fetching (for scroll observer calls only)
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (pageNum === 1) setInitialLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/products?limit=${LIMIT}&page=${pageNum}`, { signal });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const items: any[] = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];

      const fresh = items.filter(p => !seenIds.current.has(p.id));
      fresh.forEach(p => seenIds.current.add(p.id));

      setProducts(prev => pageNum === 1 ? fresh : [...prev, ...fresh]);
      setHasMore(typeof data.hasNextPage === "boolean" ? data.hasNextPage : items.length === LIMIT);
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      fetchingRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    // ✅ RACE CONDITION FIX:
    // React StrictMode unmounts+remounts instantly. The sequence is:
    //   Effect 1: fetchingRef=true, fetch starts (async)
    //   Cleanup 1: ac.abort() fires — but finally() hasn't run yet, so fetchingRef is STILL true
    //   Effect 2: fetchingRef is true → "if guard" blocks the fetch → stuck loading forever!
    //
    // Fix: forcefully reset fetchingRef BEFORE abort so Effect 2 always proceeds.
    fetchingRef.current = false;
    seenIds.current.clear();
    pageRef.current = 1;
    setProducts([]);
    setHasMore(true);
    setInitialLoading(true);
    fetchPage(1, ac.signal);

    return () => {
      fetchingRef.current = false; // ✅ Reset guard BEFORE abort
      ac.abort();
    };
  }, [fetchPage]);

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingRef.current) {
          pageRef.current += 1;
          fetchPage(pageRef.current);
        }
      },
      { rootMargin: "300px" }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, fetchPage]);

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Navbar />

      <div className="bg-black text-white py-2 text-xs md:text-sm overflow-hidden">
        <div className="flex w-max animate-marquee">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-12 px-6 whitespace-nowrap">
              <span>WELCOME TO ZAFY FASHION</span>
              <span>FREE SHIPPING ACROSS INDIA</span>
              <span>CASH ON DELIVERY AVAILABLE</span>
            </div>
          ))}
        </div>
      </div>

      <HeroSlider />

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-10 tracking-wide">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {CATEGORIES.map((cat, idx) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group relative aspect-square overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  priority={idx < 6}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                  <p className="text-white text-[10px] sm:text-xs font-semibold tracking-wide text-center leading-tight">
                    {cat.name.toUpperCase()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-end mb-10">
            <h2 className="text-3xl md:text-4xl font-light tracking-wide">Trending Products</h2>
            <Link href="/products" className="text-black hover:underline font-medium text-sm">View All →</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {initialLoading
              ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
              : products.map(p => <ProductCard key={p.id} product={p} />)
            }
          </div>

          {loadingMore && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-4">
              {Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          )}

          {hasMore && !initialLoading && <div ref={loaderRef} className="h-10 mt-4" aria-hidden />}
          {!hasMore && products.length > 0 && (
            <p className="text-center text-gray-400 text-sm mt-10">Showing all {products.length} products</p>
          )}
        </div>
      </section>

      <WhatsappButton />
      <Footer />
    </div>
  );
}