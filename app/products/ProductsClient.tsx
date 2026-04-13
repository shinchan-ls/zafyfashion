// app/products/ProductsClient.tsx
"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";
import { useWishlist } from "@/app/context/WishlistContext";

type Product = {
  id: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  discountPercentage: number;
  stockQuantity: number;
  images: string[];
};

function ProductSkeleton() {
  return (
    <div className="animate-pulse bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="bg-gray-200 aspect-square" />
      <div className="p-4 space-y-2">
        <div className="bg-gray-200 h-3 rounded w-3/4" />
        <div className="bg-gray-200 h-3 rounded w-1/2" />
      </div>
    </div>
  );
}

const LIMIT = 24;

export default function ProductsClient() {
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [products, setProducts]             = useState<Product[]>([]);
  const [total, setTotal]                   = useState(0);
  const [hasMore, setHasMore]               = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [sortOption, setSortOption]         = useState("newest");
  const [showInStock, setShowInStock]       = useState(true);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [minPrice, setMinPrice]             = useState(0);
  const [maxPrice, setMaxPrice]             = useState(999999);
  const [priceInitted, setPriceInitted]     = useState(false);
  const [filterOpen, setFilterOpen]         = useState(false);

  const loaderRef   = useRef<HTMLDivElement>(null);
  const pageRef     = useRef(1);
  const fetchingRef = useRef(false);
  const seenIds     = useRef(new Set<string>());

  const fetchPage = useCallback(async (pageNum: number, signal?: AbortSignal) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (pageNum === 1) setInitialLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/products?limit=${LIMIT}&page=${pageNum}`, { signal });
      if (!res.ok) throw new Error("fetch error");
      const data = await res.json();

      // Handle both plain array (old API) and {products,total,hasNextPage} (new API)
      const items: Product[] = Array.isArray(data)
        ? data
        : Array.isArray(data.products) ? data.products : [];

      // ✅ Total fix: use server total if provided, else keep accumulating
      const serverTotal = typeof data.total === "number" ? data.total : 0;
      const hasNext     = typeof data.hasNextPage === "boolean"
        ? data.hasNextPage
        : items.length === LIMIT;

      const fresh = items.filter(p => !seenIds.current.has(p.id));
      fresh.forEach(p => seenIds.current.add(p.id));

      setProducts(prev => pageNum === 1 ? fresh : [...prev, ...fresh]);
      if (pageNum === 1) setTotal(serverTotal);
      setHasMore(hasNext);

      if (pageNum === 1 && fresh.length > 0 && !priceInitted) {
        const mx = Math.max(...fresh.map(p => Number(p.price) || 0));
        setMaxPrice(mx);
        setPriceInitted(true);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      fetchingRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [priceInitted]);

  // ✅ RACE CONDITION FIX — same as category page:
  // StrictMode: Effect1 sets fetchingRef=true → Cleanup1 calls ac.abort() before finally runs →
  // Effect2 sees fetchingRef=true → blocks fetch → stuck loading forever.
  // Fix: reset fetchingRef in cleanup BEFORE abort, and again at effect start.
  useEffect(() => {
    const ac = new AbortController();
    fetchingRef.current = false; // force clear — async finally from prev mount may not have run yet
    seenIds.current.clear();
    pageRef.current = 1;
    setProducts([]);
    setTotal(0);
    setHasMore(true);
    setPriceInitted(false);
    setMinPrice(0);
    setMaxPrice(999999);
    setInitialLoading(true);
    fetchPage(1, ac.signal);

    return () => {
      fetchingRef.current = false; // ✅ reset BEFORE abort so next mount's fetch isn't blocked
      ac.abort();
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!hasMore || initialLoading) return;
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
  }, [hasMore, initialLoading, fetchPage]);

  const displayProducts = useMemo(() => {
    let result = products.filter(p => {
      const price   = Number(p.price) || 0;
      const inStock = p.stockQuantity > 0;
      return (
        price >= minPrice && price <= maxPrice &&
        ((showInStock && inStock) || (showOutOfStock && !inStock))
      );
    });
    if (sortOption === "price-low")  result.sort((a, b) => a.price - b.price);
    if (sortOption === "price-high") result.sort((a, b) => b.price - a.price);
    if (sortOption === "name-az")    result.sort((a, b) => a.title.localeCompare(b.title));
    if (sortOption === "discount")   result.sort((a, b) => b.discountPercentage - a.discountPercentage);
    return result;
  }, [products, minPrice, maxPrice, showInStock, showOutOfStock, sortOption]);

  const inStockCount    = products.filter(p => p.stockQuantity > 0).length;
  const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;
  const hasActiveFilters = !showInStock || showOutOfStock || minPrice > 0;

  const clearFilters = () => {
    setShowInStock(true);
    setShowOutOfStock(false);
    setMinPrice(0);
    setMaxPrice(Math.max(...products.map(p => Number(p.price) || 0), 999999));
    setSortOption("newest");
  };

  // ✅ Total display: show server total if available, else show loaded count
  const displayTotal = total > 0 ? total : products.length;

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          <div className="mb-6">
            <h1 className="text-3xl font-light">All Products</h1>
            <p className="text-gray-500 text-sm mt-1">
              {initialLoading
                ? "Loading…"
                : `${displayTotal.toLocaleString("en-IN")} total  •  ${displayProducts.length} showing${hasMore ? " — scroll for more" : ""}`}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">

            <button
              onClick={() => setFilterOpen(o => !o)}
              className="lg:hidden flex items-center gap-2 self-start border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" />
              </svg>
              Filters {hasActiveFilters && <span className="bg-black text-white text-xs rounded-full px-1.5 py-0.5 leading-none">!</span>}
            </button>

            <aside className={`lg:w-60 flex-shrink-0 ${filterOpen ? "block" : "hidden"} lg:block`}>
              <div className="bg-white border border-gray-100 rounded-2xl p-5 sticky top-24">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="font-semibold">Filters</h2>
                  {hasActiveFilters && <button onClick={clearFilters} className="text-red-500 text-xs font-medium">Clear all</button>}
                </div>

                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Availability</p>
                  <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={showInStock} onChange={() => setShowInStock(v => !v)} className="w-4 h-4 accent-black" />
                    In Stock ({inStockCount})
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={showOutOfStock} onChange={() => setShowOutOfStock(v => !v)} className="w-4 h-4 accent-black" />
                    Out of Stock ({outOfStockCount})
                  </label>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Price Range</p>
                  {[
                    { label: "Min", value: minPrice, onChange: (v: number) => setMinPrice(Math.max(0, v)) },
                    { label: "Max", value: maxPrice, onChange: (v: number) => setMaxPrice(Math.max(minPrice, v)) },
                  ].map(({ label, value, onChange }) => (
                    <div key={label} className="mb-2">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <div className="border border-gray-200 rounded-lg px-3 py-2 flex gap-1 items-center focus-within:border-black">
                        <span className="text-gray-400 text-xs">₹</span>
                        <input type="number" value={value} onChange={e => onChange(Number(e.target.value) || 0)} className="flex-1 bg-transparent text-sm focus:outline-none min-w-0" />
                      </div>
                    </div>
                  ))}
                  <p className="text-center text-xs text-gray-400 mt-2">₹{minPrice.toLocaleString("en-IN")} – ₹{maxPrice.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="flex justify-end mb-5">
                <select value={sortOption} onChange={e => setSortOption(e.target.value)}
                  className="border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-black">
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low → High</option>
                  <option value="price-high">Price: High → Low</option>
                  <option value="discount">Biggest Discount</option>
                  <option value="name-az">Name: A → Z</option>
                </select>
              </div>

              {initialLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
                </div>
              ) : displayProducts.length === 0 ? (
                <div className="text-center py-24 text-gray-400">No products found. Try adjusting your filters.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {displayProducts.map(product => {
                      const wishlisted = isWishlisted(product.id);
                      return (
                        <div key={product.id} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200">
                          <Link href={`/product/${product.id}`}>
                            <div className="relative aspect-square bg-gray-50">
                              <Image src={product.images?.[0] || "/placeholder.jpg"} alt={product.title} fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-500" />
                              {product.discountPercentage > 0 && (
                                <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{product.discountPercentage}%</span>
                              )}
                              {product.stockQuantity === 0 && (
                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                  <span className="text-[10px] font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full border">Out of Stock</span>
                                </div>
                              )}
                            </div>
                          </Link>
                          <div className="p-4">
                            <Link href={`/product/${product.id}`}>
                              <h3 className="text-sm font-medium line-clamp-2 min-h-[2.6em] hover:underline">{product.title}</h3>
                            </Link>
                            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                              <span className="text-base font-bold">₹{Number(product.price).toLocaleString("en-IN")}</span>
                              {product.compareAtPrice && (
                                <span className="text-xs text-gray-400 line-through">₹{Number(product.compareAtPrice).toLocaleString("en-IN")}</span>
                              )}
                            </div>
                            <div className="mt-3 flex justify-between items-center">
                              <button onClick={() => toggleWishlist(product.id)}
                                className={`text-xl transition-colors ${wishlisted ? "text-red-500" : "text-gray-300 hover:text-gray-400"}`}
                                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                                {wishlisted ? "♥" : "♡"}
                              </button>
                              <Link href={`/product/${product.id}`} className="text-xs font-semibold underline hover:text-gray-600">View Details</Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {loadingMore && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                      {Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}
                    </div>
                  )}
                  {hasMore && <div ref={loaderRef} className="h-10 mt-4" aria-hidden />}
                  {!hasMore && products.length > 0 && (
                    <p className="text-center text-gray-400 text-sm py-10">All {products.length.toLocaleString("en-IN")} products loaded ✓</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <WhatsappButton />
      <Footer />
    </div>
  );
}