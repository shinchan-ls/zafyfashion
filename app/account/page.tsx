// app/account/page.tsx
"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

declare global {
  interface Window { Razorpay: any; }
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const pendingOrderNumber = searchParams.get("pending");   // from checkout redirect
  const failReason = searchParams.get("reason");             // "failed" | null

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderNumber, setPayingOrderNumber] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const rzpScriptLoaded = useRef(false);
  const rzpInstanceRef = useRef<any>(null);

  // ── Fetch orders ─────────────────────────────────────────────────────────────
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

  // ── Load Razorpay script once ─────────────────────────────────────────────
  const ensureRazorpayScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (rzpScriptLoaded.current && window.Razorpay) return resolve();
      document.querySelectorAll('script[src*="checkout.razorpay.com"]').forEach((el) => el.remove());
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => { rzpScriptLoaded.current = true; resolve(); };
      script.onerror = () => reject(new Error("Failed to load payment system"));
      document.body.appendChild(script);
    });
  }, []);

  const destroyRzp = useCallback(() => {
    if (rzpInstanceRef.current) {
      try { rzpInstanceRef.current.close(); } catch (_) { }
      rzpInstanceRef.current = null;
    }
    document.querySelectorAll('iframe[src*="razorpay"]').forEach((el) => el.remove());
    document.querySelectorAll(".razorpay-backdrop").forEach((el) => el.remove());
  }, []);

  useEffect(() => () => destroyRzp(), [destroyRzp]);

  // ── Pay Now handler ───────────────────────────────────────────────────────
  const handlePayNow = useCallback(async (orderNumber: string) => {
    setPayingOrderNumber(orderNumber);
    setPayError(null);

    try {
      // First check current status (maybe already paid in another tab)
      const statusRes = await fetch(`/api/payment/status?orderNumber=${orderNumber}`);
      let statusData: any = {};

      try {
        statusData = await statusRes.json();
      } catch {
        console.error("Invalid JSON response from status API");
        return;
      }
      if (statusData.paymentStatus === "PAID") {
        router.push(`/order-success?orderNumber=${orderNumber}`);
        return;
      }

      await ensureRazorpayScript();

      // Get/create Razorpay order (idempotent on backend)
      const payRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });

      if (!payRes.ok) {
        const err = await payRes.json();
        setPayError(err.error || "Failed to initiate payment");
        setPayingOrderNumber(null);
        return;
      }

      const rzpOrder = await payRes.json();

      // Get phone from the order in state
      const order = orders.find((o) => o.orderNumber === orderNumber);

      rzpInstanceRef.current = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: "INR",
        order_id: rzpOrder.id,
        name: "Zafy Fashion",
        description: `Order #${orderNumber}`,
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
          contact: order?.customerPhone || "",
        },
        theme: { color: "#000000" },

        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, orderNumber }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              destroyRzp();
              router.push(`/order-success?orderNumber=${orderNumber}`);
            } else {
              setPayError("Payment verification failed. Contact support with order #" + orderNumber);
              setPayingOrderNumber(null);
            }
          } catch {
            setPayError("Network error during verification. Contact support.");
            setPayingOrderNumber(null);
          } finally {
            destroyRzp();
          }
        },

        modal: {
          escape: false,
          backdropclose: false,
          ondismiss: () => {
            destroyRzp();
            setPayingOrderNumber(null);
            // Clear the URL param so banner doesn't re-appear confusingly
            router.replace("/account");
          },
        },
      });

      rzpInstanceRef.current.on("payment.failed", (response: any) => {
        destroyRzp();
        setPayError(`Payment failed: ${response.error?.description || "Try again"}`);
        setPayingOrderNumber(null);
      });

      rzpInstanceRef.current.open();
    } catch (err: any) {
      setPayError(err.message || "Something went wrong");
      setPayingOrderNumber(null);
    }
  }, [session, orders, ensureRazorpayScript, destroyRzp, router]);

  // ── Auto-trigger if coming from checkout with pending order ──────────────
  // We don't auto-open — better UX to show the banner and let user click
  // (auto-opening Razorpay on page load gets blocked by browsers)

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isPendingRazorpay = (order: any) =>
    order.paymentMethod === "RAZORPAY" && order.paymentStatus === "PENDING";

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-6">Please login to view your account</h2>
          <button
            onClick={() => signIn("google")}
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

        {/* ── Pending payment banner (from checkout redirect) ── */}
        {pendingOrderNumber && (
          <div className={`mb-8 p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${failReason === "failed"
            ? "bg-red-50 border-red-200"
            : "bg-amber-50 border-amber-200"
            }`}>
            <div>
              <p className={`font-semibold text-base ${failReason === "failed" ? "text-red-800" : "text-amber-800"}`}>
                {failReason === "failed"
                  ? "Your payment failed"
                  : "You left before completing payment"}
              </p>
              <p className={`text-sm mt-1 ${failReason === "failed" ? "text-red-700" : "text-amber-700"}`}>
                Order #{pendingOrderNumber} is saved. Complete your payment now to confirm it.
              </p>
            </div>
            <button
              onClick={() => handlePayNow(pendingOrderNumber)}
              disabled={payingOrderNumber === pendingOrderNumber}
              className="shrink-0 bg-black text-white px-6 py-3 rounded-2xl text-sm font-medium hover:bg-gray-900 disabled:bg-gray-400 transition"
            >
              {payingOrderNumber === pendingOrderNumber ? "Opening Payment…" : "Complete Payment"}
            </button>
          </div>
        )}

        {/* ── Pay error message ── */}
        {payError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800">
            {payError}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-gray-50 rounded-3xl p-6 sticky top-6">
              <h2 className="font-semibold text-lg mb-6">My Account</h2>
              <div className="space-y-2">
                <Link href="/account" className="block px-5 py-3 bg-white rounded-2xl font-medium shadow-sm">
                  Dashboard
                </Link>
                <Link href="/account/addresses" className="block px-5 py-3 hover:bg-gray-100 rounded-2xl transition">
                  Your Addresses
                </Link>
                <Link href="/account/wishlist" className="block px-5 py-3 hover:bg-gray-100 rounded-2xl transition">
                  Your Wishlist
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left px-5 py-3 hover:bg-gray-100 rounded-2xl transition text-red-600 font-medium"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="flex-1">
            <h1 className="text-4xl font-light mb-8">My Account</h1>

            <div className="mb-12">
              <h2 className="text-2xl font-medium mb-6">Order History</h2>

              {orders.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
                  <p className="text-green-800">You haven&apos;t placed any orders yet.</p>
                  <Link href="/" className="mt-6 inline-block bg-black text-white px-8 py-3 rounded-2xl hover:bg-gray-800">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order: any) => (
                    <div
                      key={order.id}
                      className={`border rounded-3xl p-6 bg-white transition ${isPendingRazorpay(order) ? "border-amber-300 bg-amber-50/30" : "border-gray-200"
                        }`}
                    >
                      <div className="flex justify-between mb-4">
                        <div>
                          <p className="font-medium">Order #{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{Number(order.finalAmount).toLocaleString()}</p>
                          <p className={`text-sm font-medium ${order.status === "Confirmed" || order.status === "Delivered"
                            ? "text-green-600"
                            : order.paymentStatus === "PENDING" && order.paymentMethod === "RAZORPAY"
                              ? "text-amber-600"
                              : "text-orange-500"
                            }`}>
                            {isPendingRazorpay(order) ? "Payment Pending" : order.status}
                          </p>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Payment: {order.paymentMethod}</p>
                        <p>Ship to: {order.city}, {order.state}</p>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                        <Link
                          href={`/track/${order.orderNumber}`}
                          className="text-blue-600 text-sm hover:underline"
                        >
                          Track Order →
                        </Link>

                        {/* Pay Now button for pending Razorpay orders */}
                        {isPendingRazorpay(order) && (
                          <button
                            onClick={() => handlePayNow(order.orderNumber)}
                            disabled={payingOrderNumber === order.orderNumber}
                            className="bg-black text-white px-5 py-2.5 rounded-2xl text-sm font-medium hover:bg-gray-900 disabled:bg-gray-400 transition"
                          >
                            {payingOrderNumber === order.orderNumber
                              ? "Opening Payment…"
                              : "Pay Now"}
                          </button>
                        )}
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

      <WhatsappButton />
      <Footer />
    </div>
  );
}