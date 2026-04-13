"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

export default function OrderTrackingPage() {
  const { orderNumber } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;

    fetch(`/api/track?orderNumber=${orderNumber}`)
      .then(res => res.json())
      .then(result => {
        setData(result);
        if (result.type === "error") setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Fetching order details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !data || data.type === "error") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-red-600">
          Unable to fetch order details. Please try again later.
        </div>
        <Footer />
      </div>
    );
  }

  const order = data.order;
  const tracking = data.tracking?.data?.[0];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-light">Order Details</h1>
          <p className="text-gray-600 mt-1">Order #{order.orderNumber}</p>
        </div>

        {/* Status Card */}
        <div className="bg-white border rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-sm text-gray-500">Order Status</p>
            <p className="text-2xl font-semibold capitalize text-green-600">
              {order.status}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Payment: {order.paymentMethod} ({order.paymentStatus})
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-3xl font-semibold">₹{order.finalAmount}</p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white border rounded-2xl p-6 mb-8">
          <h2 className="font-medium mb-4">Shipping Address</h2>
          <div className="text-gray-700">
            <p className="font-medium">{order.customerName}</p>
            <p>{order.shippingAddress}</p>
            <p>{order.city}, {order.state} - {order.pincode}</p>
            <p className="mt-1">{order.customerPhone}</p>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white border rounded-2xl p-6 mb-8">
          <h2 className="font-medium mb-4">Items</h2>
          {/* Items Section - Improved Image Handling */}
          {/* ITEMS SECTION - STRONG IMAGE HANDLING */}
          <div className="space-y-6">
            {order.items?.map((item: any) => {
              // Multiple fallback sources for image
              let imageUrl = "/placeholder.jpg";

              // 1. From joined product (most common)
              if (item.product?.images && Array.isArray(item.product.images) && item.product.images.length > 0) {
                imageUrl = item.product.images[0];
              }
              // 2. Direct images in order item (if any)
              else if (item.images && Array.isArray(item.images) && item.images.length > 0) {
                imageUrl = item.images[0];
              }
              // 3. Single image string (some APIs send this)
              else if (typeof item.image === "string" && item.image.length > 5) {
                imageUrl = item.image;
              }

              return (
                <div key={item.id} className="flex gap-4 border-t pt-6 first:border-t-0 first:pt-0">
                  {/* Image Container */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={imageUrl}
                      alt={item.title || "Product"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.jpg";
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-tight line-clamp-2">
                      {item.title || item.product?.title || "Product Name"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Qty: {item.quantity}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right font-medium whitespace-nowrap">
                    ₹{(item.price * item.quantity).toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tracking Section */}
        {tracking ? (
          <div className="bg-white border rounded-2xl p-6">
            <h2 className="font-medium mb-6">Tracking Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 text-sm">
              <p><span className="text-gray-500">Courier:</span> {tracking.shpping_partner || "Not Assigned"}</p>
              <p><span className="text-gray-500">Tracking ID:</span> {tracking.tracking_id || "N/A"}</p>
              <p><span className="text-gray-500">Current Status:</span> {tracking.show_status}</p>
              <p><span className="text-gray-500">Order Date:</span> {tracking.order_date}</p>
            </div>

            {/* Simple Timeline */}
            <div className="mt-10 space-y-8">
              {[
                { label: "Order Placed", date: order.createdAt },
                { label: "Order Accepted", date: tracking.accept_order_date },
                { label: "Picked Up", date: tracking.pickup_date },
                { label: "In Transit", date: tracking.transit_date },
                { label: "Delivered", date: tracking.delivered_date },
              ]
                .filter(item => item.date && item.date !== "0000-00-00 00:00:00")
                .map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-4 h-4 bg-black rounded-full mt-1.5 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-gray-500 text-sm">{item.date}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
            <p className="text-yellow-700 font-medium">Order Confirmed</p>
            <p className="text-yellow-600 mt-2">Tracking information will be available once the order is shipped.</p>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center mt-12">
          <Link href="/account" className="text-black underline hover:text-gray-600">
            ← Back to My Orders
          </Link>
        </div>
      </main>

      <WhatsappButton />
      <Footer />
    </div>
  );
}