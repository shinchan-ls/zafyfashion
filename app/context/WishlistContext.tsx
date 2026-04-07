// app/context/WishlistContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";

type WishlistContextType = {
  wishlist: number[];
  setWishlist: React.Dispatch<React.SetStateAction<number[]>>;
  toggleWishlist: (productId: number | string) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [wishlist, setWishlist] = useState<number[]>([]);

  // Fetch wishlist when user logs in
  useEffect(() => {
    if (!session?.user?.id) {
      setWishlist([]);
      return;
    }

    fetch(`/api/wishlist?userId=${session.user.id}`)
      .then((res) => res.json())
      .then((data) => {
        const ids = Array.isArray(data) 
          ? data.map((item: any) => Number(item.productId))
          : [];
        setWishlist(ids);
      })
      .catch((err) => {
        console.error("Failed to fetch wishlist:", err);
        setWishlist([]);
      });
  }, [session?.user?.id]);

  const toggleWishlist = async (productId: number | string) => {
    if (!session?.user?.id) {
      alert("Please login to add to wishlist");
      return;
    }

    const id = Number(productId);
    const isCurrentlyWishlisted = wishlist.includes(id);

    try {
      const res = await fetch("/api/wishlist", {
        method: isCurrentlyWishlisted ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });

      if (res.ok) {
        if (isCurrentlyWishlisted) {
          setWishlist((prev) => prev.filter((item) => item !== id));
        } else {
          setWishlist((prev) => [...prev, id]);
        }
      }
    } catch (err) {
      console.error("Wishlist toggle failed:", err);
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, setWishlist, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
};