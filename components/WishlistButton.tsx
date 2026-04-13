"use client";

import { useSession } from "next-auth/react";
import { useWishlist } from "@/app/context/WishlistContext";
import { useState } from "react";

export default function WishlistButton({ productId }: { productId: number | string }) {
  const { data: session, status } = useSession();
  const { wishlist, toggleWishlist, loading: contextLoading } = useWishlist();

  // ✅ FIXED CHECK
  const isWishlisted = wishlist.some(
    (item) => Number(item.productId) === Number(productId)
  );

  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    if (status === "loading") return;

    if (!session?.user?.id) {
      alert("Please login to add to wishlist");
      return;
    }

    if (isProcessing || contextLoading) return;

    setIsProcessing(true);
    await toggleWishlist(productId);
    setIsProcessing(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing || contextLoading || status === "loading"}
      className={`bg-white p-2.5 rounded-full shadow hover:scale-110 active:scale-95 transition-all ${
        isProcessing || contextLoading ? "opacity-70 cursor-wait" : ""
      }`}
      title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
    >
      {isWishlisted ? "❤️" : "♡"}
    </button>
  );
}