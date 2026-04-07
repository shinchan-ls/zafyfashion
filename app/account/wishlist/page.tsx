// app/account/wishlist/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";

export default function WishlistPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    if (!session?.user?.id) return;
    const res = await fetch(`/api/wishlist?userId=${session.user.id}`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    if (session?.user?.id) loadWishlist();
    else setLoading(false);
  }, [session]);

  const removeFromWishlist = async (productId: any) => {
    await fetch("/api/wishlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    loadWishlist();
  };

  if (!session) return <div className="text-center py-20">Please login to view wishlist</div>;

  if (loading) return <div className="text-center py-20">Loading wishlist...</div>;

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-gray-50 rounded-3xl p-6 sticky top-6">
              <h2 className="font-semibold text-lg mb-6">My Account</h2>
              <div className="space-y-2">
                <Link href="/account" className="block px-5 py-3 hover:bg-gray-100 rounded-2xl transition">Dashboard</Link>
                <Link href="/account/addresses" className="block px-5 py-3 hover:bg-gray-100 rounded-2xl transition">Your Addresses</Link>
                <Link href="/account/wishlist" className="block px-5 py-3 bg-white rounded-2xl font-medium shadow-sm">Your Wishlist</Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full text-left px-5 py-3 hover:bg-gray-100 rounded-2xl transition text-red-600">Log Out</button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <h1 className="text-4xl font-light mb-8">Your Wishlist</h1>

            {items.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-2xl text-gray-400">Your wishlist is empty</p>
                <Link href="/" className="mt-6 inline-block bg-black text-white px-8 py-3 rounded-2xl hover:bg-gray-900">
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {items.map((item) => {
                  const product = item.product;
                  return (
                    <div key={item.id} className="group border border-gray-100 rounded-3xl overflow-hidden hover:shadow-lg transition">
                      <Link href={`/product/${product.id}`}>
                        <div className="relative aspect-square bg-gray-50">
                          <Image
                            src={product.images?.[0] || "/placeholder.jpg"}
                            alt={product.title}
                            fill
                            sizes="(max-width: 640px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      </Link>

                      <div className="p-5">
                        <Link href={`/product/${product.id}`} className="hover:underline">
                          <h3 className="font-medium line-clamp-2">{product.title}</h3>
                        </Link>

                        <p className="text-xl font-semibold mt-3">₹{product.price}</p>

                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => removeFromWishlist(product.id)}
                            className="flex-1 border border-red-500 text-red-500 py-2.5 rounded-2xl text-sm hover:bg-red-50"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => {
                              // Add to cart logic
                              const cart = JSON.parse(localStorage.getItem("cart") || "[]");
                              const exists = cart.find((c: any) => c.id === product.id);
                              if (exists) exists.quantity += 1;
                              else cart.push({ ...product, quantity: 1 });
                              localStorage.setItem("cart", JSON.stringify(cart));
                              alert("Added to cart");
                            }}
                            className="flex-1 bg-black text-white py-2.5 rounded-2xl text-sm hover:bg-gray-900"
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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