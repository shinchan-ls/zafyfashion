// components/WishlistButton.tsx
"use client";

import { useSession } from "next-auth/react";
import { useWishlist } from "@/app/context/WishlistContext";

export default function WishlistButton({ productId }: { productId: number | string }) {
  const { data: session } = useSession();
  const { wishlist, toggleWishlist } = useWishlist();

  const isWishlisted = wishlist.includes(Number(productId));

  return (
    <button
      onClick={() => toggleWishlist(productId)}
      className="bg-white p-2 rounded-full shadow hover:scale-110 transition-all active:scale-95"
      title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
    >
      {isWishlisted ? "❤️" : "♡"}
    </button>
  );
}