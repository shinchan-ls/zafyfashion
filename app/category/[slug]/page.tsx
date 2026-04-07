// app/category/[slug]/page.tsx
"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";

const categoryNames: Record<string, string> = {
  perfumes: "Perfumes",
  wallets: "Men's Wallets",
  purse: "Women Purse",
  sunglasses: "Goggles",
  belts: "Belts",
  shoes: "Shoes",
  watches: "Watches",
};

export default function CategoryPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const categoryName = categoryNames[slug as string] || "Products";

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState("newest");

  // Filters
  const [showInStock, setShowInStock] = useState(true);
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const itemsPerPage = 12;

  // ================= FETCH PRODUCTS =================
  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/category/${slug}`)
      .then(res => res.json())
      .then(data => {
        const allProducts = Array.isArray(data) ? data : [];
        setProducts(allProducts);
        if (allProducts.length > 0) {
          const maxP = Math.max(...allProducts.map((p: any) => Number(p.price) || 0));
          setMaxPrice(maxP);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // ================= WISHLIST =================
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/wishlist?userId=${session.user.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setWishlist(new Set(data.map((item: any) => item.productId.toString())));
        }
      });
  }, [session?.user?.id]);

  // ================= BASE FILTER =================
  const baseFiltered = useMemo(() => {
    let result = [...products];
    result = result.filter(p => p.price >= minPrice && p.price <= maxPrice);
    return result;
  }, [products, minPrice, maxPrice]);

  const inStockCount = baseFiltered.filter(p => p.stockQuantity > 0).length;
  const outOfStockCount = baseFiltered.filter(p => p.stockQuantity === 0).length;

  // ================= FINAL FILTER + SORTING =================
  const filteredProducts = useMemo(() => {
    let result = [...baseFiltered];

    // Stock Filter
    result = result.filter(p => {
      const inStock = p.stockQuantity > 0;
      return (showInStock && inStock) || (showOutOfStock && !inStock);
    });

    // Sorting Logic
    switch (sortOption) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name-az":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "newest":
      default:
        result.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }

    return result;
  }, [baseFiltered, showInStock, showOutOfStock, sortOption]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [showInStock, showOutOfStock, minPrice, maxPrice, sortOption]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters =
    !showInStock || !showOutOfStock ||
    minPrice > 0 || maxPrice < Math.max(...products.map(p => Number(p.price) || 0), 0);

  const clearAllFilters = () => {
    setShowInStock(true);
    setShowOutOfStock(true);
    setMinPrice(0);
    setMaxPrice(Math.max(...products.map(p => Number(p.price) || 0), 0));
  };

  const toggleWishlist = async (productId: string) => {
    if (!session?.user?.id) {
      alert("Please login to use wishlist");
      return;
    }
    const isWishlisted = wishlist.has(productId);
    await fetch("/api/wishlist", {
      method: isWishlisted ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    setWishlist(prev => {
      const next = new Set(prev);
      isWishlisted ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  if (loading) return <div className="flex justify-center py-20">Loading {categoryName}...</div>;

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-light mb-2">{categoryName}</h1>
        <p className="text-gray-600 mb-8">{filteredProducts.length} products found</p>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* FILTERS SIDEBAR */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-3xl p-8 sticky top-24">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-semibold">Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Availability */}
              <div className="mb-10">
                <h3 className="font-medium mb-4">Availability</h3>
                <label className="flex items-center gap-3 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInStock}
                    onChange={() => setShowInStock(!showInStock)}
                    className="w-5 h-5 accent-black"
                  />
                  <span>In Stock ({inStockCount})</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOutOfStock}
                    onChange={() => setShowOutOfStock(!showOutOfStock)}
                    className="w-5 h-5 accent-black"
                  />
                  <span>Out of Stock ({outOfStockCount})</span>
                </label>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="font-medium mb-4">Price Range</h3>
                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-gray-500 block mb-1">Min Price</label>
                    <div className="border border-gray-300 rounded-2xl px-5 py-3.5 flex items-center bg-white focus-within:border-black transition">
                      <span className="text-gray-500 text-base">₹</span>
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) =>
                          setMinPrice(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full bg-transparent focus:outline-none ml-2 text-lg font-medium min-w-0"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-gray-500 block mb-1">Max Price</label>
                    <div className="border border-gray-300 rounded-2xl px-5 py-3.5 flex items-center bg-white focus-within:border-black transition">
                      <span className="text-gray-500 text-base">₹</span>
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) =>
                          setMaxPrice(Math.max(minPrice, Number(e.target.value) || minPrice))
                        }
                        className="w-full bg-transparent focus:outline-none ml-2 text-lg font-medium min-w-0"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-600 mt-5 font-medium">
                  ₹{minPrice.toLocaleString()} - ₹{maxPrice.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* PRODUCTS AREA */}
          <div className="flex-1">
            {/* Sorting Dropdown */}
            <div className="flex justify-end mb-8">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="border border-gray-300 bg-white rounded-2xl px-6 py-3 focus:outline-none focus:border-black"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name-az">Name: A to Z</option>
              </select>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {currentProducts.map((product: any) => {
                const isWishlisted = wishlist.has(product.id.toString());
                return (
                  <div key={product.id} className="group bg-white border border-gray-100 rounded-3xl overflow-hidden hover:border-gray-300 transition-all">
                    <Link href={`/product/${product.id}`}>
                      <div className="relative aspect-square bg-gray-50">
                        <Image
                          src={product.images?.[0] || "/placeholder.jpg"}
                          alt={product.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        {product.discountPercentage > 0 && (
                          <div className="absolute top-4 right-4 bg-red-600 text-white text-xs px-3 py-1 rounded-full">
                            {product.discountPercentage}% OFF
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="p-6">
                      <Link href={`/product/${product.id}`} className="block hover:underline">
                        <h3 className="font-medium line-clamp-2 min-h-[2.8em]">{product.title}</h3>
                      </Link>

                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-2xl font-semibold">₹{product.price}</span>
                        {product.compareAtPrice && (
                          <span className="text-sm text-gray-400 line-through">₹{product.compareAtPrice}</span>
                        )}
                      </div>

                      <div className="mt-6 flex justify-between items-center">
                        <button
                          onClick={() => toggleWishlist(product.id.toString())}
                          className={`text-3xl transition ${isWishlisted ? "text-red-500" : "text-gray-300 hover:text-gray-400"}`}
                        >
                          {isWishlisted ? "♥" : "♡"}
                        </button>
                        <Link href={`/product/${product.id}`} className="text-sm font-medium text-black underline hover:text-gray-700">
                          View Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-4 mt-16">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-8 py-3 border border-gray-300 rounded-2xl disabled:opacity-50 hover:bg-gray-100"
                >
                  Previous
                </button>
                <span className="px-8 py-3 text-sm">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-8 py-3 border border-gray-300 rounded-2xl disabled:opacity-50 hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-16 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-400">© 2026 Zafy Fashion. All rights reserved.</p>
          <p className="text-sm text-gray-500 mt-2">Premium Fashion • Fast Shipping • Secure Payments</p>
        </div>
      </footer>
    </div>
  );
}