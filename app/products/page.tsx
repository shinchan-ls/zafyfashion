// app/products/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function AllProductsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const rawQuery = searchParams.get("search") || "";
  const searchQuery = rawQuery.replace(/[<>]/g, "").trim().toLowerCase();

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
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const data = await res.json();

        if (!isMounted) return;

        const allProducts = Array.isArray(data) ? data : [];
        setProducts(allProducts);

        if (allProducts.length > 0) {
          const maxP = Math.max(...allProducts.map((p: any) => Number(p.price) || 0));
          setMaxPrice(maxP);
        }
      } catch (err) {
        console.error("Products fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();

    return () => { isMounted = false; };
  }, []);

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

    if (searchQuery) {
      result = result.filter(p =>
        p.title?.toLowerCase().includes(searchQuery) ||
        p.description?.toLowerCase().includes(searchQuery)
      );
    }

    result = result.filter(p => p.price >= minPrice && p.price <= maxPrice);

    return result;
  }, [products, searchQuery, minPrice, maxPrice]);

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, showInStock, showOutOfStock, minPrice, maxPrice, sortOption]);

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
      alert("Login required");
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">

        {/* Search Header */}
        {searchQuery && (
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-light">
              Search: <span className="font-medium">"{searchQuery}"</span>
            </h1>
            <p className="text-gray-600 mt-1">{filteredProducts.length} products found</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-10">

          {/* FILTERS SIDEBAR */}
          <div className="lg:w-80 w-full">
            <div className="bg-white border rounded-3xl p-6 md:p-8 sticky top-24">

              <div className="flex justify-between mb-6">
                <h2 className="font-semibold text-lg">Filters</h2>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="text-sm text-red-500 hover:underline">
                    Clear
                  </button>
                )}
              </div>

              {/* Availability */}
              <div className="mb-8">
                <h3 className="mb-3 font-medium">Availability</h3>
                <label className="flex gap-3 mb-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showInStock} 
                    onChange={() => setShowInStock(!showInStock)} 
                  />
                  In Stock ({inStockCount})
                </label>
                <label className="flex gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showOutOfStock} 
                    onChange={() => setShowOutOfStock(!showOutOfStock)} 
                  />
                  Out of Stock ({outOfStockCount})
                </label>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="mb-3 font-medium">Price Range</h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Math.max(minPrice, Number(e.target.value) || minPrice))}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PRODUCTS AREA */}
          <div className="flex-1">

            {/* Sorting */}
            <div className="flex justify-end mb-6">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="border border-gray-300 bg-white rounded-2xl px-5 py-2.5 focus:outline-none focus:border-black text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name-az">Name: A to Z</option>
              </select>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {currentProducts.map((product: any) => {
                const isWishlisted = wishlist.has(product.id.toString());

                return (
                  <div key={product.id} className="border rounded-2xl overflow-hidden group">
                    <Link href={`/product/${product.id}`}>
                      <div className="relative aspect-square bg-gray-50">
                        <Image
                          src={product.images?.[0] || "/placeholder.jpg"}
                          alt={product.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    </Link>

                    <div className="p-4">
                      <Link href={`/product/${product.id}`} className="hover:underline">
                        <h3 className="text-sm font-medium line-clamp-2">{product.title}</h3>
                      </Link>

                      <div className="mt-2 font-semibold">₹{product.price}</div>

                      <button
                        onClick={() => toggleWishlist(product.id.toString())}
                        className="mt-3 text-sm text-gray-600 hover:text-black"
                      >
                        {isWishlisted ? "♥ Remove from Wishlist" : "♡ Add to Wishlist"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-4 mt-12">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="px-6 py-2 border rounded-xl disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-6 py-2">Page {currentPage} of {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  className="px-6 py-2 border rounded-xl disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}