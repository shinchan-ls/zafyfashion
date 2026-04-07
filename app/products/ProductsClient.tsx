"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ProductsClient() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const rawQuery = searchParams.get("search") || "";
  const searchQuery = rawQuery.replace(/[<>]/g, "").trim().toLowerCase();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState("newest");

  const [showInStock, setShowInStock] = useState(true);
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const itemsPerPage = 12;

  // FETCH PRODUCTS
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

  // WISHLIST
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

  // BASE FILTER
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

  // FINAL FILTER + SORT
  const filteredProducts = useMemo(() => {
    let result = [...baseFiltered];

    result = result.filter(p => {
      const inStock = p.stockQuantity > 0;
      return (showInStock && inStock) || (showOutOfStock && !inStock);
    });

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
      default:
        result.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }

    return result;
  }, [baseFiltered, showInStock, showOutOfStock, sortOption]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, showInStock, showOutOfStock, minPrice, maxPrice, sortOption]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

        {searchQuery && (
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-light">
              Search: <span className="font-medium">"{searchQuery}"</span>
            </h1>
            <p className="text-gray-600 mt-1">{filteredProducts.length} products found</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {currentProducts.map((product: any) => {
            const isWishlisted = wishlist.has(product.id.toString());

            return (
              <div key={product.id} className="border rounded-2xl overflow-hidden">
                <Link href={`/product/${product.id}`}>
                  <div className="relative aspect-square bg-gray-50">
                    <Image
                      src={product.images?.[0] || "/placeholder.jpg"}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Link>

                <div className="p-4">
                  <h3 className="text-sm font-medium">{product.title}</h3>
                  <div className="mt-2 font-semibold">₹{product.price}</div>

                  <button
                    onClick={() => toggleWishlist(product.id.toString())}
                    className="mt-3 text-sm"
                  >
                    {isWishlisted ? "♥ Remove" : "♡ Wishlist"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}