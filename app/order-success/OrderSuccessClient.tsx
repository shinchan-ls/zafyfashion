"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrderSuccessClient() {
  const params = useSearchParams();
  const router = useRouter();

  const orderNumber = params.get("orderNumber");

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!orderNumber) {
      router.replace("/checkout");
      return;
    }

    const checkOrder = async () => {
      try {
        const res = await fetch(`/api/orders/status?orderNumber=${orderNumber}`);
        const data = await res.json();

        if (data.paymentStatus === "PAID" || data.paymentMethod === "COD") {
          setValid(true);
        } else {
          router.replace("/checkout");
        }
      } catch (err) {
        router.replace("/checkout");
      } finally {
        setLoading(false);
      }
    };

    checkOrder();
  }, [orderNumber, router]);

  if (loading) return <div>Checking payment...</div>;
  if (!valid) return null;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-semibold">
        🎉 Payment Successful! Order Confirmed
      </h1>
    </div>
  );
}