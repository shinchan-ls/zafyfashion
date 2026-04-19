// app/account/addresses/page.tsx
// FIX: loadAddresses was running before session was ready (status === "loading"),
//      GET returned 401, data was { error: "Unauthorized" } — not an array —
//      so setAddresses([]) wiped the list. Now we guard with status check +
//      show a proper loading state until session is confirmed.

"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

// ── Types ────────────────────────────────────────────────────────────────────
type Address = {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
};

type FieldErrors = Record<string, string>;

// ── Constants ────────────────────────────────────────────────────────────────
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands",
  "Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi",
  "Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

const EMPTY_FORM = {
  name: "", phone: "", address: "", city: "",
  state: "", pincode: "", landmark: "",
};

// ── Field component (outside page = stable ref = no focus loss on keystroke) ──
type FieldProps = {
  label: string; value: string; placeholder: string;
  onChange: (val: string) => void; error?: string;
  required?: boolean; type?: string; maxLength?: number;
};

function Field({ label, value, placeholder, onChange, error, required, type = "text", maxLength }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border px-4 py-3 rounded-xl text-sm transition focus:outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-200 bg-red-50/30"
            : "border-gray-300 focus:border-black focus:ring-black/10"
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">⚠ {error}</p>}
    </div>
  );
}

function StateSelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        State<span className="text-red-500 ml-0.5">*</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border px-4 py-3 rounded-xl text-sm bg-white transition focus:outline-none focus:ring-2 ${
          error ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-black focus:ring-black/10"
        }`}
      >
        <option value="">Select your state</option>
        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">⚠ {error}</p>}
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateForm(form: typeof EMPTY_FORM): FieldErrors {
  const e: FieldErrors = {};
  if (!form.name.trim() || form.name.trim().length < 2)
    e.name = "Full name must be at least 2 characters";
  if (!/^\d{10}$/.test(form.phone.trim()))
    e.phone = "Enter a valid 10-digit mobile number (no spaces, no +91)";
  if (!form.address.trim() || form.address.trim().length < 10)
    e.address = "Enter a complete address (flat/house no., street, area)";
  if (!form.city.trim())
    e.city = "City is required";
  if (!form.state)
    e.state = "Please select your state";
  if (!/^\d{6}$/.test(form.pincode.trim()))
    e.pincode = "Enter a valid 6-digit pincode";
  return e;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AddressesPage() {
  const { data: session, status } = useSession();

  const [addresses,   setAddresses]   = useState<Address[]>([]);
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error,       setError]       = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [form,        setForm]        = useState({ ...EMPTY_FORM });

  const setField = (key: keyof typeof EMPTY_FORM) => (val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(false);
    setError("");
    setFieldErrors({});
  };

  // ✅ KEY FIX: Only call loadAddresses when session is fully confirmed.
  // Previously this ran while status === "loading" → GET returned 401
  // → { error: "Unauthorized" } is not an array → setAddresses([]) wiped list.
  const loadAddresses = async () => {
    try {
      const res  = await fetch("/api/user/addresses");
      if (!res.ok) {
        // Don't wipe existing addresses on auth errors (401) or server errors
        if (res.status !== 401) {
          console.error("Failed to load addresses:", res.status);
        }
        return;
      }
      const data = await res.json();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadAddresses error:", err);
      // Network error — keep whatever we had, don't wipe
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    // ✅ FIX: Wait for session to be confirmed before hitting the API.
    // status "loading" → do nothing (keep spinner)
    // status "unauthenticated" → clear and stop spinner
    // status "authenticated" → fetch addresses
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setPageLoading(false);
      return;
    }
    // authenticated
    loadAddresses();
  }, [status]); // Re-runs only when session status changes

  const scrollToForm = () => setTimeout(() => {
    document.getElementById("addr-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);

  const openAdd = () => {
    if (addresses.length >= 5) return;
    resetForm();
    setShowForm(true);
    scrollToForm();
  };

  const openEdit = (addr: Address) => {
    setEditingId(addr.id);
    setError("");
    setFieldErrors({});
    setForm({
      name:     addr.name     || "",
      phone:    addr.phone    || "",
      address:  addr.address  || "",
      city:     addr.city     || "",
      state:    addr.state    || "",
      pincode:  addr.pincode  || "",
      landmark: addr.landmark || "",
    });
    setShowForm(true);
    scrollToForm();
  };

  const handleSubmit = async () => {
    setError("");
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      const firstErrKey = Object.keys(errs)[0];
      document.getElementById(`field-${firstErrKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    try {
      const isEdit = editingId !== null;
      const res = await fetch(
        isEdit ? `/api/user/addresses/${editingId}` : "/api/user/addresses",
        {
          method:  isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:     form.name.trim(),
            phone:    form.phone.trim(),
            address:  form.address.trim(),
            city:     form.city.trim(),
            state:    form.state,
            pincode:  form.pincode.trim(),
            landmark: form.landmark.trim(),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save. Please try again.");
        return;
      }

      resetForm();
      await loadAddresses();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this address?")) return;
    await fetch(`/api/user/addresses/${id}`, { method: "DELETE" });
    await loadAddresses();
  };

  const handleDefault = async (id: number) => {
    await fetch(`/api/user/addresses/${id}`, { method: "PATCH" });
    await loadAddresses();
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (status === "loading" || pageLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Link href="/auth/signin" className="bg-black text-white px-6 py-3 rounded-xl">
            Login to Continue
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const maxReached = addresses.length >= 5;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1250px] mx-auto w-full px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-[260px_1fr] gap-10">

          {/* Sidebar */}
          <aside>
            <div className="bg-gray-50 rounded-3xl p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-6">My Account</h2>
              <nav className="space-y-1 text-sm">
                <Link href="/account"           className="block px-4 py-3 rounded-xl hover:bg-white transition">Dashboard</Link>
                <Link href="/account/addresses" className="block px-4 py-3 rounded-xl bg-white shadow-sm font-medium">Your Addresses</Link>
                <Link href="/account/wishlist"  className="block px-4 py-3 rounded-xl hover:bg-white transition">Wishlist</Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left px-4 py-3 rounded-xl text-red-600 hover:bg-white transition"
                >
                  Logout
                </button>
              </nav>
            </div>
          </aside>

          {/* Main */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <h1 className="text-3xl sm:text-4xl font-medium">Your Addresses</h1>
              {!showForm && (
                <button
                  onClick={openAdd}
                  disabled={maxReached}
                  className={`px-6 py-3 rounded-xl font-medium text-sm transition ${
                    maxReached
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-black text-white hover:bg-gray-900"
                  }`}
                >
                  {maxReached ? "Max 5 addresses reached" : "+ Add New Address"}
                </button>
              )}
            </div>

            {/* Form */}
            {showForm && (
              <div id="addr-form" className="border border-gray-200 rounded-3xl p-6 sm:p-8 mb-8 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {editingId ? "Edit Address" : "Add New Address"}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-xl transition"
                  >
                    ×
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div id="field-name">
                    <Field label="Full Name" required value={form.name} onChange={setField("name")} placeholder="Rahul Sharma" error={fieldErrors.name} />
                  </div>
                  <div id="field-phone">
                    <Field label="Mobile Number" required type="tel" maxLength={10} value={form.phone} onChange={setField("phone")} placeholder="9876543210" error={fieldErrors.phone} />
                  </div>
                  <div className="sm:col-span-2" id="field-address">
                    <Field label="House / Flat / Street" required value={form.address} onChange={setField("address")} placeholder="Flat 201, Shree Apartment, MG Road" error={fieldErrors.address} />
                  </div>
                  <div id="field-city">
                    <Field label="City / District" required value={form.city} onChange={setField("city")} placeholder="Surat" error={fieldErrors.city} />
                  </div>
                  <div id="field-state">
                    <StateSelect value={form.state} onChange={setField("state")} error={fieldErrors.state} />
                  </div>
                  <div id="field-pincode">
                    <Field label="Pincode" required maxLength={6} value={form.pincode} onChange={setField("pincode")} placeholder="395001" error={fieldErrors.pincode} />
                  </div>
                  <div id="field-landmark">
                    <Field label="Landmark (optional)" value={form.landmark} onChange={setField("landmark")} placeholder="Near City Centre Mall" />
                  </div>
                </div>

                {error && (
                  <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    ⚠ {error}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-black text-white px-8 py-3 rounded-xl font-medium disabled:bg-gray-400 transition"
                  >
                    {loading ? "Saving…" : editingId ? "Update Address" : "Save Address"}
                  </button>
                  <button onClick={resetForm} className="border border-gray-300 px-6 py-3 rounded-xl hover:bg-gray-50 transition text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {addresses.length === 0 && !showForm && (
              <div className="border-2 border-dashed border-gray-200 rounded-3xl py-24 text-center">
                <p className="text-gray-400 text-lg mb-2">No addresses saved yet</p>
                <p className="text-gray-400 text-sm mb-6">Add your delivery address to speed up checkout</p>
                <button onClick={openAdd} className="bg-black text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-900 transition">
                  Add Your First Address
                </button>
              </div>
            )}

            {/* Address cards */}
            {addresses.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-5">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`relative border rounded-3xl p-6 transition ${
                      addr.isDefault ? "border-black shadow-md" : "border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    {addr.isDefault && (
                      <span className="absolute top-4 right-4 bg-black text-white text-[11px] font-medium px-3 py-1 rounded-full">
                        Default
                      </span>
                    )}
                    <p className="font-semibold pr-20">{addr.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">+91 {addr.phone}</p>
                    <div className="mt-3 text-sm text-gray-600 space-y-0.5">
                      <p>{addr.address}</p>
                      <p>{addr.city}, {addr.state} — {addr.pincode}</p>
                      {addr.landmark && <p className="text-gray-400 text-xs">Near: {addr.landmark}</p>}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-5 text-sm font-medium border-t border-gray-100 pt-4">
                      <button onClick={() => openEdit(addr)} className="text-blue-600 hover:underline">Edit</button>
                      {!addr.isDefault && (
                        <button onClick={() => handleDefault(addr.id)} className="text-green-700 hover:underline">Make Default</button>
                      )}
                      <button onClick={() => handleDelete(addr.id)} className="text-red-500 hover:underline ml-auto">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {addresses.length > 0 && (
              <p className="text-xs text-gray-400 mt-4 text-right">{addresses.length} / 5 addresses saved</p>
            )}
          </div>
        </div>
      </main>

      <WhatsappButton />
      <Footer />
    </div>
  );
}