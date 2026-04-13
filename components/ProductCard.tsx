"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import WishlistButton from "@/components/WishlistButton";

interface Product {
  id: string | number;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  discountPercentage?: number;
  images: string[];
  isFeatured?: boolean;
  stockQuantity?: number;
}

type ProductCardProps = {
  product: Product;
  showStockStatus?: boolean; // ✅ optional prop
};

export default function ProductCard({
  product,
  showStockStatus,
}: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);

  const discount = product.discountPercentage || 0;
  const imageUrl = product.images?.[0] || "/placeholder.jpg";

  const hasDiscount =
    discount > 0 &&
    product.compareAtPrice &&
    product.compareAtPrice > product.price;

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAdding(true);

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    const existingIndex = cart.findIndex(
      (item: any) => item.id === product.id
    );

    if (existingIndex !== -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        ...product,
        quantity: 1,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    setTimeout(() => {
      setIsAdding(false);
    }, 600);
  };

  const inStock = (product.stockQuantity ?? 0) > 0;

  return (
    <div className="group relative border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-white">

      {/* 🔥 HOVER ICONS */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">

        {/* ❤️ WISHLIST */}
        <WishlistButton productId={product.id} />

        {/* 👁 VIEW */}
        <Link href={`/product/${product.id}`}>
          <div className="bg-white p-2 rounded-full shadow hover:scale-110 transition">
            👁
          </div>
        </Link>

      </div>

      {/* 🔥 SALE BADGE */}
      {hasDiscount && (
        <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          SALE
        </div>
      )}

      {/* PRODUCT IMAGE */}
      <div className="relative aspect-square bg-gray-50">
        <Image
          src={imageUrl}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* CONTENT */}
      <div className="p-4">
        <h3 className="font-medium text-sm line-clamp-2 min-h-[42px]">
          {product.title}
        </h3>

        {/* PRICE */}
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-xl font-semibold">₹{product.price}</span>
          {hasDiscount && (
            <span className="text-gray-400 line-through text-sm">
              ₹{product.compareAtPrice}
            </span>
          )}
        </div>

        {/* ✅ STOCK STATUS */}
        {showStockStatus && (
          <p
            className={`text-xs mt-2 font-medium ${
              inStock ? "text-green-600" : "text-red-500"
            }`}
          >
            {inStock ? "In Stock" : "Out of Stock"}
          </p>
        )}

        {/* ADD TO CART */}
        <button
          onClick={addToCart}
          disabled={isAdding || !inStock}
          className="mt-4 w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white py-3 rounded-xl text-sm font-medium transition"
        >
          {isAdding
            ? "Adding..."
            : inStock
            ? "Add to Cart →"
            : "Out of Stock"}
        </button>

        {/* VIEW DETAILS */}
        <Link
          href={`/product/${product.id}`}
          className="block text-center text-xs text-gray-500 mt-3 hover:underline"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}