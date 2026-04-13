// app/checkout/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type PaymentState =
  | "idle"
  | "creating_order"
  | "awaiting_payment"
  | "verifying"
  | "success"
  | "failed";

export default function CheckoutPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [cart, setCart] = useState<any[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "RAZORPAY">("COD");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rzpInstanceRef = useRef<any>(null);
  const rzpScriptLoaded = useRef(false);
  const activeOrderNumber = useRef<string | null>(null);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(savedCart);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/user/addresses")
      .then((r) => r.json())
      .then((data) => {
        const addresses = Array.isArray(data) ? data : [];
        setSavedAddresses(addresses);
        if (addresses.length > 0) {
          const def = addresses.find((a: any) => a.isDefault);
          setSelectedAddressId(def ? def.id.toString() : addresses[0].id.toString());
        }
      })
      .catch(console.error);
  }, [session]);

  const ensureRazorpayScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (rzpScriptLoaded.current && window.Razorpay) return resolve();
      document.querySelectorAll('script[src*="checkout.razorpay.com"]').forEach((el) => el.remove());
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => { rzpScriptLoaded.current = true; resolve(); };
      script.onerror = () => reject(new Error("Razorpay script failed to load"));
      document.body.appendChild(script);
    });
  }, []);

  const destroyRzp = useCallback(() => {
    if (rzpInstanceRef.current) {
      try { rzpInstanceRef.current.close(); } catch (_) {}
      rzpInstanceRef.current = null;
    }
    document.querySelectorAll('iframe[src*="razorpay"]').forEach((el) => el.remove());
    document.querySelectorAll(".razorpay-backdrop").forEach((el) => el.remove());
  }, []);

  useEffect(() => () => destroyRzp(), [destroyRzp]);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

  const isLoading =
    paymentState === "creating_order" ||
    paymentState === "awaiting_payment" ||
    paymentState === "verifying";

  const canCheckout = !isLoading && cart.length > 0 && !!selectedAddressId && paymentState !== "success";

  const createOrder = useCallback(async (): Promise<string | null> => {
    const finalShipping = savedAddresses.find((a) => a.id.toString() === selectedAddressId);
    if (!finalShipping) { setErrorMsg("Selected address not found"); return null; }

    setPaymentState("creating_order");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems: cart, shippingAddress: finalShipping, paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to create order");
        setPaymentState("failed");
        return null;
      }
      activeOrderNumber.current = data.orderNumber;
      return data.orderNumber;
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPaymentState("failed");
      return null;
    }
  }, [cart, savedAddresses, selectedAddressId, paymentMethod]);

  const openRazorpay = useCallback(async (orderNumber: string) => {
    destroyRzp();

    try {
      await ensureRazorpayScript();
    } catch {
      setErrorMsg("Payment system failed to load. Please try again.");
      setPaymentState("failed");
      return;
    }

    const payRes = await fetch("/api/payment/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber }),
    });

    if (!payRes.ok) {
      setErrorMsg("Failed to initiate payment. Please retry.");
      setPaymentState("failed");
      return;
    }

    const rzpOrder = await payRes.json();
    const shippingData = savedAddresses.find((a) => a.id.toString() === selectedAddressId);

    setPaymentState("awaiting_payment");

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
        contact: shippingData?.phone || "",
      },
      theme: { color: "#000000" },

      handler: async (response: any) => {
        setPaymentState("verifying");
        try {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, orderNumber }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            localStorage.removeItem("cart");
            setPaymentState("success");
            router.push(`/order-success?orderNumber=${orderNumber}`);
          } else {
            setErrorMsg("Payment received but verification failed. Contact support with order #" + orderNumber);
            setPaymentState("failed");
          }
        } catch {
          setErrorMsg("Verification network error. Contact support with order #" + orderNumber);
          setPaymentState("failed");
        } finally {
          destroyRzp();
        }
      },

      modal: {
        escape: false,
        backdropclose: false,
        ondismiss: () => {
          destroyRzp();
          // Order exists in DB — redirect to account so user can pay later
          localStorage.removeItem("cart");
          router.push(`/account?pending=${orderNumber}`);
        },
      },
    });

    rzpInstanceRef.current.on("payment.failed", (response: any) => {
      console.error("Razorpay payment.failed:", response.error);
      destroyRzp();
      localStorage.removeItem("cart");
      router.push(`/account?pending=${orderNumber}&reason=failed`);
    });

    rzpInstanceRef.current.open();
  }, [session, savedAddresses, selectedAddressId, ensureRazorpayScript, destroyRzp, router]);

  const processOrder = async () => {
    if (!canCheckout) return;

    if (paymentMethod === "COD") {
      const orderNumber = await createOrder();
      if (!orderNumber) return;
      localStorage.removeItem("cart");
      setPaymentState("success");
      router.push(`/order-success?orderNumber=${orderNumber}`);
      return;
    }

    const orderNumber = await createOrder();
    if (!orderNumber) return;
    await openRazorpay(orderNumber);
  };

  const maxAddressesReached = savedAddresses.length >= 5;

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-light text-center mb-10">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left */}
          <div className="lg:col-span-3 space-y-10">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-medium">Shipping Address</h2>
                {maxAddressesReached && (
                  <span className="text-amber-600 text-sm">Max 5 addresses reached</span>
                )}
              </div>

              {savedAddresses.length > 0 ? (
                <div className="space-y-4">
                  {savedAddresses.map((addr: any) => (
                    <label
                      key={addr.id}
                      className={`block border p-6 rounded-3xl cursor-pointer transition-all hover:border-gray-400 ${
                        selectedAddressId === addr.id?.toString()
                          ? "border-black bg-gray-50 shadow-sm"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === addr.id?.toString()}
                          onChange={() => setSelectedAddressId(addr.id?.toString() || null)}
                          className="mt-1 accent-black"
                        />
                        <div>
                          <div className="font-medium">{addr.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{addr.phone}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {addr.address}, {addr.city}, {addr.state} - {addr.pincode}
                            {addr.landmark && ` (${addr.landmark})`}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-3xl">
                  <p className="text-gray-500">No saved addresses found</p>
                  <p className="text-sm text-gray-400 mt-2">Please add address from your Account → Addresses page</p>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-medium mb-6">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 border p-5 rounded-3xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={paymentMethod === "COD"}
                    onChange={() => { setPaymentMethod("COD"); setErrorMsg(null); setPaymentState("idle"); }}
                    className="accent-black"
                  />
                  <div>
                    <div className="font-medium">Cash on Delivery (COD)</div>
                    <div className="text-sm text-gray-500">Pay when your order arrives</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 border p-5 rounded-3xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={paymentMethod === "RAZORPAY"}
                    onChange={() => { setPaymentMethod("RAZORPAY"); setErrorMsg(null); setPaymentState("idle"); }}
                    className="accent-black"
                  />
                  <div>
                    <div className="font-medium">Pay Online via Razorpay</div>
                    <div className="text-sm text-gray-500">UPI, Credit/Debit Card, Net Banking, Wallet</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 sticky top-28">
              <h3 className="font-semibold text-lg mb-6">Order Summary</h3>

              <div className="space-y-4 mb-6 max-h-80 overflow-auto">
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="line-clamp-1 flex-1 pr-2">{item.title} × {item.quantity}</span>
                    <span className="whitespace-nowrap">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t my-6" />

              <div className="flex justify-between text-xl font-semibold">
                <span>Total</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>

              {paymentState === "verifying" && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
                  Verifying your payment, please wait…
                </div>
              )}

              {paymentState === "failed" && errorMsg && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800">
                  {errorMsg}
                </div>
              )}

              {(paymentState === "idle" || paymentState === "creating_order") && (
                <button
                  onClick={processOrder}
                  disabled={!canCheckout}
                  className="w-full bg-black text-white py-4 rounded-2xl font-medium mt-8 hover:bg-gray-900 disabled:bg-gray-400 transition"
                >
                  {paymentState === "creating_order"
                    ? "Creating Order…"
                    : paymentMethod === "COD"
                    ? "Place Order (COD)"
                    : "Pay Now with Razorpay"}
                </button>
              )}

              {paymentState === "awaiting_payment" && (
                <button disabled className="w-full bg-gray-800 text-white py-4 rounded-2xl font-medium mt-8 cursor-not-allowed">
                  Complete Payment in Popup…
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <WhatsappButton />
      <Footer />
    </div>
  );
}