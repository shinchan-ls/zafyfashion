// app/debug-orders/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function DebugOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders?page=1&limit=10")
      .then(res => res.json())
      .then(data => {
        console.log("🔥 FULL ORDERS DATA FROM API:", data);
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Debug fetch error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-10 text-center">Loading orders for debug...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-red-600">🛠️ DEBUG ORDERS PAGE</h1>
      <p className="mb-6 text-gray-600">Check console (F12) for full raw JSON</p>

      {orders.map((order: any) => (
        <div key={order.id} className="border border-gray-300 rounded-2xl p-6 mb-8 bg-white">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold">Order #{order.orderNumber}</h2>
              <p className="text-sm text-gray-500">Status: {order.status}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-medium">₹{order.finalAmount}</p>
            </div>
          </div>

          <div className="space-y-6">
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="flex gap-6 border-t pt-6">
                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={item.product?.images?.[0] || "/placeholder.jpg"}
                    alt={item.product?.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <p className="font-medium">{item.product?.title || item.title}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>

                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-1">Product Images Array:</p>
                    <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(item.product?.images || [], null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-12 text-center text-sm text-gray-500">
        Check browser console (F12) → "FULL ORDERS DATA FROM API" for complete raw data
      </div>
    </div>
  );
}