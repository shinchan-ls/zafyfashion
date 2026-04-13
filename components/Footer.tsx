// components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand + Newsletter */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl font-bold tracking-tighter">ZAFY</div>
              <div className="text-sm text-gray-400">FASHION HUB</div>
            </div>

            <p className="text-gray-400 mb-8 max-w-md">
              Premium fashion destination offering luxury watches, perfumes, 
              wallets, sunglasses, belts and shoes with free shipping across India.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold mb-5 text-white">Shop</h4>
            <div className="space-y-3 text-sm text-gray-400">
              <Link href="/category/watches" className="block hover:text-white transition">Watches</Link>
              <Link href="/category/perfumes" className="block hover:text-white transition">Perfumes</Link>
              <Link href="/category/wallets" className="block hover:text-white transition">Wallets</Link>
              <Link href="/category/sunglasses" className="block hover:text-white transition">Goggles</Link>
              <Link href="/category/belts" className="block hover:text-white transition">Belts</Link>
              <Link href="/category/shoes" className="block hover:text-white transition">Shoes</Link>
            </div>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-semibold mb-5 text-white">Policies</h4>
            <div className="space-y-3 text-sm text-gray-400">
              <Link href="/policies/shipping-policy" className="block hover:text-white transition">Shipping Policy</Link>
              <Link href="/policies/refund-policy" className="block hover:text-white transition">Refund & Returns</Link>
              <Link href="/policies/privacy-policy" className="block hover:text-white transition">Privacy Policy</Link>
              <Link href="/policies/terms-of-service" className="block hover:text-white transition">Terms of Service</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-5 text-white">Support</h4>
            <div className="space-y-3 text-sm text-gray-400">
              <Link href="/policies/contact-us" className="block hover:text-white transition">Contact Us</Link>
            </div>

            <div className="mt-8">
              <p className="text-sm text-gray-400">Email</p>
              <a href="mailto:zafyfashionhub@gmail.com" className="text-white hover:underline">
                zafyfashionhub@gmail.com
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-800 mt-16 pt-8 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Zafy Fashion Hub. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}