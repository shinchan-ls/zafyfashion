// components/Navbar.tsx
"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { ShoppingCart, User, Search, Menu, X, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";   // ← New Component

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [cartCount, setCartCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Cart Count Logic (Backend wala same rakha)
  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(cart.length);
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    const interval = setInterval(updateCartCount, 1000);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      clearInterval(interval);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowMobileSearch(false);
    }
  };

  const handleUserClick = () => {
    if (session) {
      router.push("/account");
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      {/* Main Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <Image
              src="/logo/logo.png"
              alt="Zafy Logo"
              width={140}
              height={50}
              className="w-[100px] md:w-[140px] h-auto object-contain"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-base font-medium">
            <Link href="/category/watches" className="hover:text-black transition">Watch</Link>
            <Link href="/category/perfumes" className="hover:text-black transition">Perfumes</Link>
            <Link href="/category/wallets" className="hover:text-black transition">Wallets</Link>
            <Link href="/category/sunglasses" className="hover:text-black transition">Goggles</Link>
            <Link href="/category/belts" className="hover:text-black transition">Belts</Link>
            <Link href="/category/shoes" className="hover:text-black transition">Shoes</Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-5">
            {/* Desktop Search */}
            <div className="hidden md:block relative w-72">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-3.5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="I'm looking for..."
                    className="w-full bg-gray-100 pl-11 pr-5 py-3 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </form>
            </div>

            {/* Mobile Search Button */}
            <button onClick={() => setShowMobileSearch(!showMobileSearch)} className="md:hidden p-2">
              <Search size={24} />
            </button>

            {/* Wishlist */}
            <Link href="/account/wishlist" className="relative p-2 hover:text-black transition">
              <Heart size={24} />
            </Link>

            {/* User Icon - Main Change */}
            <button
              onClick={handleUserClick}
              className="p-2 hover:text-black transition"
              aria-label="Account"
            >
              <User size={24} />
            </button>

            {/* Cart */}
            <Link href="/cart" className="relative p-2 hover:text-black transition">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-medium w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
              {mobileOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        {showMobileSearch && (
          <div className="md:hidden mt-4 px-2 pb-4">
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-gray-100 px-5 py-3 rounded-full text-sm focus:outline-none"
                autoFocus
              />
            </form>
          </div>
        )}
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t px-6 py-8">
          <div className="flex flex-col gap-6 text-lg font-medium">
            <Link href="/category/watches" onClick={() => setMobileOpen(false)}>Watch</Link>
            <Link href="/category/perfumes" onClick={() => setMobileOpen(false)}>Perfumes</Link>
            <Link href="/category/wallets" onClick={() => setMobileOpen(false)}>Wallets</Link>
            <Link href="/category/sunglasses" onClick={() => setMobileOpen(false)}>Goggles</Link>
            <Link href="/category/belts" onClick={() => setMobileOpen(false)}>Belts</Link>
            <Link href="/category/shoes" onClick={() => setMobileOpen(false)}>Shoes</Link>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </header>
  );
}