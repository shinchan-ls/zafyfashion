// app/account/page.tsx
"use client";

import { useSession, signOut, signIn } from "next-auth/react";   // ← signIn add kiya
import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) fetchOrders();
    else setLoading(false);
  }, [session]);

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-6">Please login to view your account</h2>
          <button
            onClick={() => signIn("google")}   // ← Ab error nahi aayega
            className="bg-black text-white px-8 py-3.5 rounded-2xl hover:bg-gray-800 transition text-lg"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }


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
                <Link href="/account" className="block px-5 py-3 bg-white rounded-2xl font-medium shadow-sm">Dashboard</Link>
                <Link href="/account/addresses" className="block px-5 py-3 hover:bg-gray-100 rounded-2xl transition">Your Addresses</Link>
                <Link href="/account/wishlist" className="block px-5 py-3 hover:bg-gray-100 rounded-2xl transition">Your Wishlist</Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left px-5 py-3 hover:bg-gray-100 rounded-2xl transition text-red-600 font-medium"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <h1 className="text-4xl font-light mb-8">My Account</h1>

            <div className="mb-12">
              <h2 className="text-2xl font-medium mb-6">Order History</h2>

              {orders.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
                  <p className="text-green-800">You haven't placed any orders yet.</p>
                  <Link href="/" className="mt-6 inline-block bg-black text-white px-8 py-3 rounded-2xl hover:bg-gray-800">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order: any) => (
                    <div key={order.id} className="border rounded-3xl p-6 bg-white">
                      <div className="flex justify-between mb-4">
                        <div>
                          <p className="font-medium">Order #{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{order.finalAmount}</p>
                          <p className={`text-sm ${order.status === "Confirmed" ? "text-green-600" : "text-orange-500"}`}>
                            {order.status}
                          </p>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p>Payment: {order.paymentMethod}</p>
                        <p>Ship to: {order.city}, {order.state}</p>
                      </div>

                      <div className="mt-6 flex justify-end">
                        <Link href={`/track/${order.orderNumber}`} className="text-blue-600 text-sm hover:underline">
                          Track Order →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Details */}
            <div>
              <h2 className="text-2xl font-medium mb-6">Account Details</h2>
              <div className="bg-white border border-gray-200 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-lg mt-1">{session.user?.name || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-lg mt-1">{session.user?.email}</p>
                </div>
              </div>
            </div>
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