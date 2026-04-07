"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function OrderTrackingPage() {
  const { orderNumber } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/track?orderNumber=${orderNumber}`)
      .then(res => res.json())
      .then(setData)
      .catch(() => setData({ type: "error", message: "Something went wrong" }))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return <div className="text-center py-20">Fetching order details...</div>;
  }

  if (data?.type === "error" || !data) {
    return <div className="text-center py-20 text-red-600">{data?.message}</div>;
  }

  const order = data.order;
  const tracking = data.tracking?.data?.[0];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">

      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-light">Order Details</h1>
        <p className="text-gray-600">Order #{order.orderNumber}</p>
      </div>

      {/* STATUS CARD */}
      <div className="bg-white border rounded-2xl p-6 mb-6 flex justify-between">
        <div>
          <p className="text-sm text-gray-500">Order Status</p>
          <p className="text-xl font-semibold capitalize">{order.status}</p>
          <p className="text-sm text-gray-500 mt-1">
            Payment: {order.paymentMethod} ({order.paymentStatus})
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-semibold">₹{order.finalAmount}</p>
        </div>
      </div>

      {/* ADDRESS */}
      <div className="bg-white border rounded-2xl p-6 mb-6">
        <h2 className="font-medium mb-3">Shipping Address</h2>
        <p>{order.customerName}</p>
        <p>{order.shippingAddress}</p>
        <p>{order.city}, {order.state} - {order.pincode}</p>
        <p>{order.customerPhone}</p>
      </div>

      {/* PRODUCTS */}
      <div className="bg-white border rounded-2xl p-6 mb-6">
        <h2 className="font-medium mb-4">Items</h2>

        <div className="space-y-4">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex gap-4 border-t pt-4">

              <img
                src={item.product?.images?.[0] || "/placeholder.jpg"}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg";
                }}
                className="w-16 h-16 object-cover rounded"
              />

              <div className="flex-1">
                <p className="font-medium">
                  {item.product?.title || item.title}
                </p>
                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
              </div>

              <p className="font-medium">₹{item.price * item.quantity}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TRACKING */}
      {data.type === "pending" ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
          <p className="text-yellow-700 text-lg">Order Confirmed</p>
          <p className="text-yellow-600">Tracking will be available once shipped.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl p-6">

          <h2 className="font-medium mb-6">Tracking Details</h2>

          {/* BASIC INFO */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <p><span className="text-gray-500">Courier:</span> {tracking?.shpping_partner || "Not assigned"}</p>
            <p><span className="text-gray-500">Tracking ID:</span> {tracking?.tracking_id || "N/A"}</p>
            <p><span className="text-gray-500">Status:</span> {tracking?.show_status}</p>
            <p><span className="text-gray-500">Order Date:</span> {tracking?.order_date}</p>
          </div>

          {/* TIMELINE */}
          <div className="space-y-4">
            {[
              { label: "Order Created", date: tracking?.order_created_date },
              { label: "Accepted", date: tracking?.accept_order_date },
              { label: "Picked Up", date: tracking?.pickup_date },
              { label: "In Transit", date: tracking?.transit_date },
              { label: "Delivered", date: tracking?.delivered_date },
            ]
              .filter(step => step.date && step.date !== "0000-00-00 00:00:00")
              .map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-3 h-3 bg-black rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">{step.label}</p>
                    <p className="text-sm text-gray-500">{step.date}</p>
                  </div>
                </div>
              ))}
          </div>

        </div>
      )}

      {/* BACK */}
      <div className="text-center mt-10">
        <Link href="/account" className="underline">
          ← Back to Orders
        </Link>
      </div>
    </div>
  );
}