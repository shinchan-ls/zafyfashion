// app/context/WishlistContext.tsx
// FIXES:
//   ISSUE 2 — Type error: wishlist.includes(Number(product.id))
//             WishlistItem is an object, not a number.
//             Added isWishlisted(productId) helper — use this in components.

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Product = {
  id:            string;
  title:         string;
  images:        string[];
  price:         number;
  stockQuantity: number;
};

type WishlistItem = {
  id:        string;   // wishlist row id
  productId: string;   // product id (string because BigInt → string)
  product:   Product | null;
};

type WishlistContextType = {
  wishlist:       WishlistItem[];
  toggleWishlist: (productId: string | number) => Promise<void>;
  // ✅ Use this helper in components instead of wishlist.includes(...)
  isWishlisted:   (productId: string | number) => boolean;
  loading:        boolean;
};

// ─── Context ──────────────────────────────────────────────────────────────────
const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [wishlist, setWishlist]   = useState<WishlistItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const hasFetched                = useRef(false);

  // ── Fetch wishlist once per session ────────────────────────────────────────
  useEffect(() => {
    if (!session?.user?.id || hasFetched.current) return;
    hasFetched.current = true;

    fetch("/api/wishlist")
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => setWishlist(Array.isArray(data.items) ? data.items : []))
      .catch(() => setWishlist([]))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  // Reset when user logs out
  useEffect(() => {
    if (!session?.user?.id) {
      setWishlist([]);
      setLoading(false);
      hasFetched.current = false;
    }
  }, [session?.user?.id]);

  // ── Toggle ──────────────────────────────────────────────────────────────────
  const toggleWishlist = async (productId: string | number) => {
    if (!session?.user?.id) {
      alert("Please login to save items to your wishlist");
      return;
    }

    // Optimistic update
    const idStr    = productId.toString();
    const existing = wishlist.find(w => w.productId === idStr);

    if (existing) {
      setWishlist(prev => prev.filter(w => w.productId !== idStr));
    } else {
      // Add placeholder optimistically
      setWishlist(prev => [
        { id: `tmp-${idStr}`, productId: idStr, product: null },
        ...prev,
      ]);
    }

    try {
      await fetch("/api/wishlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ productId }),
      });

      // Sync with server for accuracy
      const res  = await fetch("/api/wishlist", { cache: "no-store" });
      const data = await res.json();
      setWishlist(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Wishlist toggle error:", err);
      // Revert optimistic on error
      const res  = await fetch("/api/wishlist", { cache: "no-store" }).catch(() => null);
      const data = await res?.json().catch(() => ({ items: [] }));
      setWishlist(Array.isArray(data?.items) ? data.items : []);
    }
  };

  // ✅ CORRECT way to check — compares productId strings
  const isWishlisted = (productId: string | number): boolean => {
    const idStr = productId.toString();
    return wishlist.some(w => w.productId === idStr);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted, loading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
};