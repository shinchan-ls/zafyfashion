// app/auth/signin/page.tsx
"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";

// ── Inner component (uses useSearchParams — must be inside Suspense) ──────────
function SignInContent() {
  const { data: session, status } = useSession();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") || "/account";

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Already logged in — redirect away
  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, router, callbackUrl]);

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError("Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="border-b border-gray-200 py-4 px-6">
        <Link href="/" className="flex items-center justify-center">
          <span className="text-2xl font-bold tracking-tight">ZAFY FASHION</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Card */}
          <div className="border border-gray-200 rounded-3xl p-8 shadow-sm">

            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
              <p className="text-gray-500 text-sm mt-2">
                {callbackUrl.includes("checkout")
                  ? "Login to complete your order"
                  : "Access your account, orders & wishlist"}
              </p>
            </div>

            {/* Checkout context banner */}
            {callbackUrl.includes("checkout") && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 text-center">
                🛒 Your cart is saved — login to place your order
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-center">
                ⚠ {error}
              </div>
            )}

            {/* Google Sign In */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-3 border border-gray-300 rounded-2xl py-3.5 px-4 text-sm font-medium transition
                ${loading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700 active:scale-[0.99]"
                }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loading ? "Signing in…" : "Continue with Google"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">secure login</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Trust signals */}
            <div className="space-y-2.5">
              {[
                { icon: "🔒", text: "Your data is encrypted & secure" },
                { icon: "📦", text: "Track all your orders in one place" },
                { icon: "❤️", text: "Save your wishlist & addresses" },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-xs text-gray-400">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline">Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" className="underline">Privacy Policy</Link>
            </p>
            <Link href="/" className="block text-xs text-gray-500 hover:text-black transition">
              ← Back to shopping
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom strip */}
      <footer className="border-t border-gray-100 py-4 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Zafy Fashion. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ── Page export (wrapped in Suspense for useSearchParams) ─────────────────────
export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}