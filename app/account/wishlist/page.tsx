"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";
import { useWishlist } from "@/app/context/WishlistContext";

export default function WishlistPage() {
  const { data: session } = useSession();
  const { wishlist, toggleWishlist, loading } = useWishlist();

  // ✅ DIRECT PRODUCTS FROM CONTEXT (NO API CALL)
  const products = wishlist
    .map((item) => item.product)
    .filter((p) => p !== null);

  const removeFromWishlist = async (productId: number | string) => {
    await toggleWishlist(productId);
  };

  const addToCart = (product: any) => {
    if (!product) return;

    const stock = Number(product.stockQuantity) || 0;

    if (stock <= 0) {
      alert("Out of stock");
      return;
    }

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    const existing = cart.find((item: any) => item.id === product.id);

    if (existing) {
      if (existing.quantity + 1 > stock) {
        alert(`Only ${stock} available`);
        return;
      }
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart");
  };

  // ================= UI =================

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <p className="text-2xl text-gray-400 mb-6">
              Please login to view wishlist
            </p>

            <Link
              href="/auth/signin"
              className="bg-black text-white px-6 py-3 rounded-xl"
            >
              Login
            </Link>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <div className="flex-1 flex items-center justify-center">
          Loading wishlist...
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-10">

            {/* Sidebar */}
            <div className="lg:w-72">
              <div className="bg-gray-50 rounded-3xl p-6 sticky top-6">
                <h2 className="font-semibold text-lg mb-6">My Account</h2>

                <div className="space-y-2">
                  <Link href="/account" className="block px-5 py-3 hover:bg-gray-100 rounded-2xl">
                    Dashboard
                  </Link>

                  <Link href="/account/addresses" className="block px-5 py-3 hover:bg-gray-100 rounded-2xl">
                    Your Addresses
                  </Link>

                  <Link href="/account/wishlist" className="block px-5 py-3 bg-white rounded-2xl shadow-sm font-medium">
                    Your Wishlist
                  </Link>

                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left px-5 py-3 text-red-600 hover:bg-gray-100 rounded-2xl"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h1 className="text-4xl font-light mb-8">Your Wishlist</h1>

              {products.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-2xl text-gray-400">
                    Your wishlist is empty
                  </p>

                  <Link
                    href="/"
                    className="mt-6 inline-block bg-black text-white px-8 py-3 rounded-2xl"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                  {products.map((product: any) => (
                    <div
                      key={product.id}
                      className="border rounded-3xl overflow-hidden hover:shadow-lg transition"
                    >
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

                      <div className="p-5">
                        <h3 className="font-medium line-clamp-2">
                          {product.title}
                        </h3>

                        <p className="text-xl font-semibold mt-3">
                          ₹{product.price}
                        </p>

                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => removeFromWishlist(product.id)}
                            className="flex-1 border border-red-500 text-red-500 py-2 rounded-xl hover:bg-red-50"
                          >
                            Remove
                          </button>

                          <button
                            onClick={() => addToCart(product)}
                            className="flex-1 bg-black text-white py-2 rounded-xl hover:bg-gray-800"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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