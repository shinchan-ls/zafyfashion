// app/checkout/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

declare global {
  interface Window {
    Razorpay: any;
    __rzp_opened?: boolean;
  }
}

export default function CheckoutPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [cart, setCart] = useState<any[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "RAZORPAY">("COD");

  const [newAddress, setNewAddress] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
  });

  const [useNewAddress, setUseNewAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [razorpayScriptLoaded, setRazorpayScriptLoaded] = useState(false);

  // Load Cart
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(savedCart);
  }, []);

  // Load Saved Addresses
  useEffect(() => {
    if (!session?.user?.id) return;

    fetch("/api/user/addresses")
      .then(res => res.json())
      .then(data => {
        const addresses = Array.isArray(data) ? data : [];
        setSavedAddresses(addresses);

        if (addresses.length > 0) {
          const defaultAddr = addresses.find((a: any) => a.isDefault);
          setSelectedAddressId(defaultAddr ? defaultAddr.id.toString() : addresses[0].id.toString());
        } else {
          setUseNewAddress(true);
        }
      })
      .catch(() => setUseNewAddress(true));
  }, [session]);

  // Dynamically load Razorpay only when needed
  const loadRazorpay = () => {
    return new Promise<void>((resolve, reject) => {
      if (window.Razorpay) {
        setRazorpayScriptLoaded(true);
        return resolve();
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        setRazorpayScriptLoaded(true);
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.body.appendChild(script);
    });
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewAddress({ ...newAddress, [e.target.name]: e.target.value });
  };

  const processOrder = async () => {
    if (loading || cart.length === 0) return;
    setLoading(true);

    let finalShipping = useNewAddress
      ? newAddress
      : savedAddresses.find(a => a.id.toString() === selectedAddressId);

    if (!finalShipping) {
      alert("Please select or add a shipping address");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cart,
          shippingAddress: finalShipping,
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to create order");
        setLoading(false);
        return;
      }

      // Clear Cart
      localStorage.removeItem("cart");

      if (paymentMethod === "RAZORPAY") {
        try {
          await loadRazorpay();
          initRazorpay(data.orderNumber, finalShipping);
        } catch (err) {
          console.error(err);
          alert("Payment system failed to load. Please try again.");
        }
      } else {
        // COD
        router.push(`/order-success?orderNumber=${data.orderNumber}`);
      }
    } catch (err: any) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initRazorpay = async (orderNumber: string, shippingData: any) => {
    if (window.__rzp_opened) return;
    window.__rzp_opened = true;

    try {
      const paymentRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: subtotal }),
      });

      const order = await paymentRes.json();

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
        name: "Zafy Fashion",
        description: `Order #${orderNumber}`,
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
          contact: shippingData.phone || "",
        },
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, orderNumber }),
          });

          const verifyData = await verifyRes.json();

          window.__rzp_opened = false;

          if (verifyData.success) {
            router.push(`/order-success?orderNumber=${orderNumber}`);
          } else {
            alert("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: () => {
            window.__rzp_opened = false;
            alert("Payment was cancelled by user.");
          },
        },
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      window.__rzp_opened = false;
      alert("Payment failed or cancelled. Your order is still pending.");
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-light text-center mb-10">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left - Address & Payment */}
          <div className="lg:col-span-3 space-y-10">
            <div>
              <h2 className="text-2xl font-medium mb-6">Shipping Address</h2>

              {savedAddresses.length > 0 && (
                <div className="space-y-3 mb-6">
                  {savedAddresses.map((addr: any) => (
                    <label
                      key={addr.id}
                      className={`block border p-5 rounded-2xl cursor-pointer transition ${selectedAddressId === addr.id.toString() ? "border-black bg-gray-50" : "border-gray-200"
                        }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === addr.id.toString()}
                        onChange={() => {
                          setSelectedAddressId(addr.id.toString());
                          setUseNewAddress(false);
                        }}
                      />
                      <div className="ml-3">
                        <strong>{addr.name}</strong> • {addr.phone}
                        <p className="text-sm text-gray-600 mt-1">
                          {addr.address}, {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <button
                onClick={() => setUseNewAddress(!useNewAddress)}
                className="text-black underline text-sm"
              >
                {useNewAddress ? "Use saved address" : "+ Add new address"}
              </button>

              {useNewAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <input name="name" placeholder="Full Name" value={newAddress.name} onChange={handleChange} className="border rounded-xl px-4 py-3" />
                  <input name="phone" placeholder="Phone" value={newAddress.phone} onChange={handleChange} className="border rounded-xl px-4 py-3" />
                  <input name="pincode" placeholder="Pincode" value={newAddress.pincode} onChange={handleChange} className="border rounded-xl px-4 py-3" />
                  <input name="city" placeholder="City" value={newAddress.city} onChange={handleChange} className="border rounded-xl px-4 py-3" />
                  <input name="state" placeholder="State" value={newAddress.state} onChange={handleChange} className="border rounded-xl px-4 py-3" />
                  <textarea name="address" placeholder="Full Address" value={newAddress.address} onChange={handleChange} className="border rounded-xl px-4 py-3 md:col-span-2 h-24" />
                  <input name="landmark" placeholder="Landmark" value={newAddress.landmark} onChange={handleChange} className="border rounded-xl px-4 py-3 md:col-span-2" />
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <h2 className="text-2xl font-medium mb-6">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 border p-5 rounded-2xl cursor-pointer">
                  <input type="radio" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
                  Cash on Delivery (COD)
                </label>
                <label className="flex items-center gap-3 border p-5 rounded-2xl cursor-pointer">
                  <input type="radio" checked={paymentMethod === "RAZORPAY"} onChange={() => setPaymentMethod("RAZORPAY")} />
                  Pay Online via Razorpay
                </label>
              </div>
            </div>
          </div>

          {/* Right - Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 sticky top-28">
              <h3 className="font-semibold text-lg mb-6">Order Summary</h3>

              <div className="space-y-4 mb-6">
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.title} × {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t my-6"></div>

              <div className="flex justify-between text-xl font-semibold">
                <span>Total</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>

              <button
                onClick={processOrder}
                disabled={loading || cart.length === 0}
                className="w-full bg-black text-white py-4 rounded-2xl font-medium mt-8 hover:bg-gray-900 disabled:bg-gray-400 transition"
              >
                {loading ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}