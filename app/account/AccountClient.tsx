
"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

declare global {
  interface Window { Razorpay: any; }
}

export default function AccountClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const pendingOrderNumber = searchParams.get("pending");
  const failReason = searchParams.get("reason");

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderNumber, setPayingOrderNumber] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const rzpScriptLoaded = useRef(false);
  const rzpInstanceRef = useRef<any>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) fetchOrders();
    else setLoading(false);
  }, [session, fetchOrders]);

  const ensureRazorpayScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (rzpScriptLoaded.current && window.Razorpay) return resolve();

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = () => {
        rzpScriptLoaded.current = true;
        resolve();
      };

      script.onerror = () => reject(new Error("Failed to load Razorpay"));

      document.body.appendChild(script);
    });
  }, []);

  const destroyRzp = useCallback(() => {
    if (rzpInstanceRef.current) {
      try { rzpInstanceRef.current.close(); } catch { }
      rzpInstanceRef.current = null;
    }
  }, []);

  const handlePayNow = async (orderNumber: string) => {
    setPayingOrderNumber(orderNumber);

    try {
      await ensureRazorpayScript();

      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        body: JSON.stringify({ orderNumber }),
      });

      const rzpOrder = await res.json();

      rzpInstanceRef.current = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: "INR",
        order_id: rzpOrder.id,

        handler: async (response: any) => {
          await fetch("/api/payment/verify", {
            method: "POST",
            body: JSON.stringify(response),
          });

          router.push(`/order-success?orderNumber=${orderNumber}`);
        },
      });

      rzpInstanceRef.current.open();
    } catch (err) {
      console.error(err);
    } finally {
      setPayingOrderNumber(null);
    }
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={() => signIn("google")}>Login</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <h1 className="text-4xl font-light mb-8">My Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="border rounded-3xl p-6 space-y-3 sticky top-24">

              <div className="font-medium text-lg">
                {session?.user?.name || "User"}
              </div>

              <div className="text-sm text-gray-500 break-all">
                {session?.user?.email}
              </div>

              <hr className="my-4" />

              <button
                onClick={() => router.push("/account")}
                className="block w-full text-left hover:text-black text-gray-600"
              >
                Dashboard
              </button>

              <button
                onClick={() => router.push("/account/addresses")}
                className="block w-full text-left hover:text-black text-gray-600"
              >
                Addresses
              </button>

              <button
                onClick={() => router.push("/account/wishlist")}
                className="block w-full text-left hover:text-black text-gray-600"
              >
                Wishlist
              </button>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-red-600 block w-full text-left"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Orders */}
          <div className="md:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl">Your Orders</h2>

              <span className="text-sm text-gray-500">
                {orders.length} Orders
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="border rounded-3xl p-10 text-center">
                <p className="text-gray-500 mb-4">
                  No orders yet
                </p>

                <button
                  onClick={() => router.push("/")}
                  className="bg-black text-white px-6 py-3 rounded-xl"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-5">

                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-3xl p-6 hover:shadow-sm transition"
                  >
                    {/* Top Row */}
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-4">

                      <div>
                        <div className="font-semibold text-lg">
                          #{order.orderNumber}
                        </div>

                        <div className="text-sm text-gray-500 mt-1">
                          Status: {order.status}
                        </div>

                        <div className="text-sm text-gray-500">
                          Payment: {order.paymentStatus}
                        </div>

                        {order.createdAt && (
                          <div className="text-sm text-gray-400 mt-1">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="text-xl font-semibold">
                        ₹{Number(order.finalAmount).toLocaleString()}
                      </div>
                    </div>

                    {/* Products */}
                    {order.items?.length > 0 && (
                      <div className="mt-5 border-t pt-4 space-y-2">
                        {order.items.slice(0, 2).map((item: any) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="line-clamp-1 pr-3">
                              {item.title} × {item.quantity}
                            </span>

                            <span>
                              ₹
                              {Number(item.subtotal).toLocaleString()}
                            </span>
                          </div>
                        ))}

                        {order.items.length > 2 && (
                          <div className="text-sm text-gray-500">
                            + {order.items.length - 2} more item(s)
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tracking */}
                    {order.trackingEvents?.length > 0 && (
                      <div className="mt-4 bg-green-50 text-green-700 text-sm p-3 rounded-xl">
                        Latest Update:{" "}
                        {order.trackingEvents[0]?.message ||
                          order.trackingEvents[0]?.status ||
                          "Processing"}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 mt-5">

                      <button
                        onClick={() =>
                          router.push(
                            `/track/${order.orderNumber}`
                          )
                        }
                        className="border px-4 py-2 rounded-xl hover:bg-gray-50"
                      >
                        Track Order
                      </button>

                      {order.paymentStatus === "PENDING" && (
                        <button
                          onClick={() =>
                            handlePayNow(order.orderNumber)
                          }
                          disabled={
                            payingOrderNumber === order.orderNumber
                          }
                          className="bg-black text-white px-5 py-2 rounded-xl disabled:bg-gray-400"
                        >
                          {payingOrderNumber ===
                            order.orderNumber
                            ? "Opening..."
                            : "Pay Now"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              </div>
            )}
          </div>

        </div>
      </main>

      <WhatsappButton />
      <Footer />
    </div>
  );
}

