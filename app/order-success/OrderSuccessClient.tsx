"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { purchase } from "@/lib/metaPixel";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderNumber = searchParams.get("orderNumber");

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!orderNumber) {
      router.replace("/checkout");
      return;
    }

    const checkOrder = async () => {
      try {
        const res = await fetch(
          `/api/orders/status?orderNumber=${orderNumber}`
        );

        const data = await res.json();

        if (
          data.paymentStatus === "PAID" ||
          data.paymentMethod === "COD"
        ) {
          setValid(true);

          purchase(
            orderNumber,
            Number(
              data.finalAmount ||
              data.totalAmount ||
              0
            )
          );
        } else {
          router.replace("/checkout");
        }
      } catch (err) {
        console.error(err);
        router.replace("/checkout");
      } finally {
        setLoading(false);
      }
    };

    checkOrder();
  }, [orderNumber, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        Loading...
      </div>
    );
  }

  if (!valid) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-20">
        <div className="text-center px-6 max-w-md">
          <div className="text-6xl mb-6">🎉</div>

          <h1 className="text-4xl font-light mb-3">
            Payment Successful!
          </h1>

          <p className="text-2xl text-green-600 mb-8">
            Order Confirmed
          </p>

          <div className="bg-gray-50 border rounded-2xl p-8 mb-10">
            <p className="text-gray-600 mb-2">Order Number</p>

            <p className="text-2xl font-mono font-semibold">
              {orderNumber}
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/account"
              className="block w-full bg-black text-white py-4 rounded-xl"
            >
              View Order in Account
            </Link>

            <Link
              href="/products"
              className="block w-full border border-black py-4 rounded-xl"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}