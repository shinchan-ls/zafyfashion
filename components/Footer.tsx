import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black text-gray-400 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-y-12">

        {/* Brand */}
        <div>
          <h3 className="text-white text-3xl font-bold tracking-wider mb-6">ZAFY</h3>
          <p className="text-sm max-w-xs">
            Premium fashion accessories for those who appreciate quality and timeless style.
          </p>
        </div>

        {/* Shop */}
        <div>
          <h4 className="text-white font-semibold mb-5">SHOP</h4>
          <div className="space-y-3 text-sm">
            <Link href="/collections/watch" className="hover:text-white block">Watches</Link>
            <Link href="/collections/eyewear" className="hover:text-white block">Eyewear</Link>
            <Link href="/collections/wallets" className="hover:text-white block">Wallets</Link>
            <Link href="/collections/belts" className="hover:text-white block">Belts</Link>
            <Link href="/collections/shoes" className="hover:text-white block">Shoes</Link>
            <Link href="/collections/perfumes" className="hover:text-white block">Perfumes</Link>
          </div>
        </div>

        {/* Support */}
        <div>
          <h4 className="text-white font-semibold mb-5">SUPPORT</h4>
          <div className="space-y-3 text-sm">
            <Link href="/contact" className="hover:text-white block">Contact Us</Link>
            <Link href="/shipping" className="hover:text-white block">Shipping</Link>
            <Link href="/returns" className="hover:text-white block">Returns</Link>
            <Link href="/faq" className="hover:text-white block">FAQ</Link>
          </div>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-white font-semibold mb-5">COMPANY</h4>
          <div className="space-y-3 text-sm">
            <Link href="/about" className="hover:text-white block">About Us</Link>
            <Link href="/privacy" className="hover:text-white block">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white block">Terms of Service</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-900 mt-16 pt-8 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Zafy Fashion. All Rights Reserved.
      </div>
    </footer>
  );
}