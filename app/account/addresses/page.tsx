// app/account/addresses/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

export default function AddressesPage() {
  const { data: session } = useSession();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [adding, setAdding] = useState(false);

  const loadAddresses = async () => {
    const res = await fetch("/api/user/addresses");
    const data = await res.json();
    setAddresses(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (session?.user?.id) loadAddresses();
  }, [session]);

  const handleEdit = (addr: any) => {
    setEditing(addr);
    setForm(addr);
  };

  const handleSave = async () => {
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/user/addresses/${editing.id}` : "/api/user/addresses";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setEditing(null);
      setAdding(false);
      setForm({});
      loadAddresses();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this address?")) return;
    await fetch(`/api/user/addresses/${id}`, { method: "DELETE" });
    loadAddresses();
  };

  const handleDefault = async (id: number) => {
    await fetch(`/api/user/addresses/${id}`, { method: "PATCH" });
    loadAddresses();
  };

  if (!session) return <div className="text-center py-20">Please login</div>;

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-gray-50 rounded-3xl p-6 sticky top-6">
              <h2 className="font-semibold text-lg mb-6">My Account</h2>
              <div className="space-y-2">
                <Link href="/account" className="block px-5 py-3 hover:bg-gray-100 rounded-2xl transition">Dashboard</Link>
                <Link href="/account/addresses" className="block px-5 py-3 bg-white rounded-2xl font-medium shadow-sm">Your Addresses</Link>
                <Link href="/account/wishlist" className="block px-5 py-3 hover:bg-gray-100 rounded-2xl transition">Your Wishlist</Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full text-left px-5 py-3 hover:bg-gray-100 rounded-2xl transition text-red-600">Log Out</button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-light">Your Addresses</h1>
              <button
                onClick={() => { setAdding(true); setForm({}); }}
                className="bg-black text-white px-6 py-3 rounded-2xl hover:bg-gray-900"
              >
                + Add New Address
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {addresses.map((addr) => (
                <div key={addr.id} className={`border p-6 rounded-3xl ${addr.isDefault ? "border-black" : "border-gray-200"}`}>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{addr.name}</p>
                      <p className="text-sm text-gray-600">{addr.phone}</p>
                    </div>
                    {addr.isDefault && <span className="text-green-600 text-xs">Default</span>}
                  </div>

                  <p className="mt-3 text-sm text-gray-600">{addr.address}</p>
                  <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>

                  <div className="flex gap-4 mt-6 text-sm">
                    <button onClick={() => handleEdit(addr)} className="text-blue-600 hover:underline">Edit</button>
                    {!addr.isDefault && <button onClick={() => handleDefault(addr.id)} className="text-blue-600 hover:underline">Set Default</button>}
                    <button onClick={() => handleDelete(addr.id)} className="text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(adding || editing) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-medium mb-6">{editing ? "Edit Address" : "Add New Address"}</h2>

            <div className="space-y-4">
              <input placeholder="Full Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-2xl px-4 py-3" />
              <input placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-2xl px-4 py-3" />
              <textarea placeholder="Full Address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full border rounded-2xl px-4 py-3 h-24" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="City" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border rounded-2xl px-4 py-3" />
                <input placeholder="State" value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} className="border rounded-2xl px-4 py-3" />
              </div>
              <input placeholder="Pincode" value={form.pincode || ""} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="w-full border rounded-2xl px-4 py-3" />
              <input placeholder="Landmark (Optional)" value={form.landmark || ""} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className="w-full border rounded-2xl px-4 py-3" />
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={handleSave} className="flex-1 bg-black text-white py-3 rounded-2xl">Save Address</button>
              <button onClick={() => { setAdding(false); setEditing(null); }} className="flex-1 border py-3 rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}