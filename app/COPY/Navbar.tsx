"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(cart.length);
    };

    updateCartCount();

    window.addEventListener("storage", updateCartCount);
    const interval = setInterval(updateCartCount, 800);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      clearInterval(interval);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md px-6 py-4 flex justify-between items-center">
      <Link href="/" className="text-2xl font-bold">
        Zafy Fashion
      </Link>

      <div className="flex items-center gap-8">
        <Link href="/" className="hover:text-gray-600">Home</Link>

        <Link href="/cart" className="relative hover:text-gray-600">
          Cart 🛒
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {cartCount}
            </span>
          )}
        </Link>

        {status === "loading" ? (
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
        ) : session ? (
          <div className="flex items-center gap-3">
            {session.user?.image && (
              <img 
                src={session.user.image} 
                alt="" 
                className="w-8 h-8 rounded-full border border-gray-300"
              />
            )}
            <span className="font-medium">{session.user?.name?.split(" ")[0]}</span>
            <button 
              onClick={() => signOut()} 
              className="text-sm text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}