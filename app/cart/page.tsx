// app/cart/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

export default function CartPage() {
  const router = useRouter();

  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(storedCart);
    setLoading(false);
  }, []);

  const updateCart = (newCart: any[]) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const increaseQty = (index: number) => {
    const updated = [...cart];
    const item = updated[index];
    const available = Number(item.stockQuantity) || 0;

    if (item.quantity + 1 > available) {
      alert(`Only ${available} items available in stock`);
      return;
    }

    updated[index].quantity += 1;
    updateCart(updated);
  };

  const decreaseQty = (index: number) => {
    const updated = [...cart];
    if (updated[index].quantity > 1) {
      updated[index].quantity -= 1;
    } else {
      updated.splice(index, 1);
    }
    updateCart(updated);
  };

  const removeItem = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    updateCart(updated);
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

  // Check if cart has any out of stock items
  const hasOutOfStock = cart.some(item => Number(item.stockQuantity) <= 0);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading cart...</div>;
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-light">Shopping Cart</h1>
          <p className="text-gray-500 mt-2">Review your selected items before checkout</p>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-400">Your cart is empty</p>
            <Link
              href="/products"
              className="mt-6 inline-block bg-black text-white px-8 py-3 rounded-2xl hover:bg-gray-900 transition"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Cart Items */}
            <div className="lg:col-span-8 space-y-8">
              {cart.map((item, index) => {
                const availableStock = Number(item.stockQuantity) || 0;
                const isOutOfStock = availableStock <= 0;

                return (
                  <div key={index} className="flex gap-6 border-b pb-8 last:border-b-0">
                    {/* Image */}
                    <div className="w-36 h-36 flex-shrink-0 bg-gray-100 rounded-2xl overflow-hidden relative">
                      <Image
                        src={
                          Array.isArray(item.images) && item.images.length > 0
                            ? item.images[0]
                            : typeof item.image === "string"
                              ? item.image
                              : "/placeholder.jpg"
                        }
                        alt={item.title || "Product"}
                        fill
                        sizes="144px"
                        className="object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-lg leading-tight line-clamp-2">{item.title}</h3>
                      <p className="text-gray-600 mt-1">₹{Number(item.price).toLocaleString()}</p>

                      {isOutOfStock && (
                        <p className="text-red-600 text-sm mt-2 font-medium">Out of Stock</p>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4 mt-6">
                        <button
                          onClick={() => decreaseQty(index)}
                          className="w-10 h-10 border rounded-xl flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
                          disabled={isOutOfStock}
                        >
                          −
                        </button>
                        <span className="font-semibold w-8 text-center text-lg">{item.quantity}</span>
                        <button
                          onClick={() => increaseQty(index)}
                          className="w-10 h-10 border rounded-xl flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
                          disabled={isOutOfStock || item.quantity >= availableStock}
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 text-sm mt-4 hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-right font-semibold text-lg whitespace-nowrap self-start">
                      ₹{(Number(item.price) * item.quantity).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4">
              <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 sticky top-28">
                <h3 className="font-semibold text-lg mb-6">Order Summary</h3>

                <div className="flex justify-between py-4 border-b">
                  <span>Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-4 border-b text-sm text-gray-600">
                  <span>Shipping & Taxes</span>
                  <span>Calculated at checkout</span>
                </div>

                <div className="flex justify-between py-6 text-2xl font-semibold">
                  <span>Total</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>

                <button
                  onClick={() => router.push("/checkout")}
                  disabled={hasOutOfStock}
                  className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white py-4 rounded-2xl font-medium transition mt-6"
                >
                  {hasOutOfStock ? "Remove Out of Stock Items" : "Proceed to Checkout"}
                </button>

                <p className="text-center text-xs text-gray-500 mt-6">
                  Taxes and shipping calculated at checkout
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <WhatsappButton />
      <Footer />
    </div>
  );
}