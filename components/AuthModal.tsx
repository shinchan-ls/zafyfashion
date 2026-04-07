// components/AuthModal.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!isLogin) {
      // === REGISTER ===
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        setSuccess("Account created! Logging you in...");

        // Auto Login after registration (Best UX)
        const loginRes = await signIn("credentials", {
          redirect: false,
          email: formData.email,
          password: formData.password,
        });

        if (loginRes?.ok) {
          setTimeout(() => {
            onClose();
            window.location.reload();
          }, 800);
        } else {
          setError("Account created but login failed. Please login manually.");
        }
      }
    } else {
      // === LOGIN ===
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        setSuccess("Login successful!");
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 600);
      }
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-5 border-b">
          <h2 className="text-2xl font-semibold">
            {isLogin ? "Sign In" : "Create Account"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black">
            <X size={26} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <p className="text-red-600 text-center text-sm">{error}</p>}
          {success && <p className="text-green-600 text-center text-sm">{success}</p>}

          {!isLogin && (
            <>
              <input name="firstName" placeholder="First Name *" value={formData.firstName} onChange={handleChange} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-black outline-none" required />
              <input name="lastName" placeholder="Last Name *" value={formData.lastName} onChange={handleChange} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-black outline-none" required />
            </>
          )}

          <input name="email" type="email" placeholder="Your email *" value={formData.email} onChange={handleChange} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-black outline-none" required />

          <div className="relative">
            <input name="password" type={showPassword ? "text" : "password"} placeholder="Password *" value={formData.password} onChange={handleChange} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-black outline-none" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {!isLogin && (
            <div className="relative">
              <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password *" value={formData.confirmPassword} onChange={handleChange} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-black outline-none" required />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3.5">
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-black text-white py-3.5 rounded-2xl font-medium hover:bg-gray-900 disabled:opacity-70">
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>

          <button type="button" onClick={() => signIn("google", { callbackUrl: "/" })} className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3.5 rounded-2xl hover:bg-gray-50">
            <img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google" className="w-6 h-6" />
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }} className="font-medium text-black hover:underline">
              {isLogin ? "Create Account" : "Sign In"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}