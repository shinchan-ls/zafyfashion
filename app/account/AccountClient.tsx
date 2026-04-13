
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
      try { rzpInstanceRef.current.close(); } catch {}
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
    <div>
      <Navbar />

      <h1 className="text-3xl p-6">My Account</h1>

      {orders.map((order) => (
        <div key={order.id}>
          {order.orderNumber}

          {order.paymentStatus === "PENDING" && (
            <button onClick={() => handlePayNow(order.orderNumber)}>
              Pay Now
            </button>
          )}
        </div>
      ))}

      <Footer />
      <WhatsappButton />
    </div>
  );
}

