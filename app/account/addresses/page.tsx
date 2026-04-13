"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

export default function AddressesPage() {
  const { data: session } = useSession();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAddresses = async () => {
    if (!session?.user?.id) return;
    const res = await fetch("/api/user/addresses");
    const data = await res.json();
    setAddresses(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (session?.user?.id) loadAddresses();
  }, [session]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this address?")) return;
    await fetch(`/api/user/addresses/${id}`, { method: "DELETE" });
    loadAddresses();
  };

  const handleDefault = async (id: number) => {
    await fetch(`/api/user/addresses/${id}`, { method: "PATCH" });
    loadAddresses();
  };

  const maxReached = addresses.length >= 5;

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Link href="/auth/signin" className="bg-black text-white px-6 py-3 rounded-xl">
            Login to continue
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

      <main className="flex-1 max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* SIDEBAR */}
          <div className="lg:w-72">
            <div className="bg-gray-50 rounded-3xl p-6 sticky top-6">
              <h2 className="font-semibold text-lg mb-6">My Account</h2>

              <div className="space-y-2 text-sm">
                <Link href="/account" className="block px-4 py-3 hover:bg-gray-100 rounded-xl">Dashboard</Link>
                <Link href="/account/addresses" className="block px-4 py-3 bg-white rounded-xl font-medium shadow">Your Addresses</Link>
                <Link href="/account/wishlist" className="block px-4 py-3 hover:bg-gray-100 rounded-xl">Wishlist</Link>

                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left px-4 py-3 text-red-600 hover:bg-gray-100 rounded-xl"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* MAIN */}
          <div className="flex-1">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl md:text-4xl font-medium">Your Addresses</h1>

              <button
                onClick={() => {
                  if (maxReached) return alert("Max 5 addresses allowed");
                  setAdding(true);
                  setEditing(null);
                  setForm({});
                }}
                className={`px-6 py-3 rounded-xl ${
                  maxReached
                    ? "bg-gray-300 text-gray-500"
                    : "bg-black text-white hover:bg-gray-900"
                }`}
              >
                + Add Address
              </button>
            </div>

            {maxReached && (
              <p className="text-amber-600 text-sm mb-6">
                Maximum 5 addresses allowed.
              </p>
            )}

            {/* EMPTY STATE */}
            {addresses.length === 0 ? (
              <div className="text-center py-20 border border-dashed rounded-3xl">
                <p className="text-gray-400 mb-4">No addresses yet</p>
                <button
                  onClick={() => setAdding(true)}
                  className="bg-black text-white px-6 py-2 rounded-xl"
                >
                  Add Address
                </button>
              </div>
            ) : (

              /* GRID */
              <div className="grid sm:grid-cols-2 gap-6">

                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`relative border rounded-3xl p-6 transition ${
                      addr.isDefault
                        ? "border-black shadow-md"
                        : "border-gray-200 hover:shadow-sm"
                    }`}
                  >

                    {/* DEFAULT */}
                    {addr.isDefault && (
                      <span className="absolute top-4 right-4 bg-black text-white text-xs px-3 py-1 rounded-full">
                        Default
                      </span>
                    )}

                    {/* NAME */}
                    <p className="font-semibold">{addr.name}</p>
                    <p className="text-sm text-gray-500">{addr.phone}</p>

                    {/* ADDRESS */}
                    <div className="mt-4 text-sm text-gray-600">
                      <p>{addr.address}</p>
                      <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                      {addr.landmark && (
                        <p className="text-gray-500 mt-1">{addr.landmark}</p>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-4 mt-6 text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditing(addr);
                          setForm(addr);
                          setAdding(false);
                        }}
                        className="text-blue-600"
                      >
                        Edit
                      </button>

                      {!addr.isDefault && (
                        <button
                          onClick={() => handleDefault(addr.id)}
                          className="text-green-600"
                        >
                          Make Default
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

              </div>
            )}
          </div>
        </div>
      </main>

      <WhatsappButton />
      <Footer />
    </div>
  );
}