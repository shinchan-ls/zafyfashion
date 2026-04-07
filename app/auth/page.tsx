"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center">
        <h2 className="text-3xl font-bold mb-2">Welcome to Zafy Fashion</h2>
        <p className="text-gray-600 mb-8">Sign in to continue to checkout</p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/checkout" })}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:bg-gray-50 py-4 rounded-xl text-lg font-medium"
        >
          <img 
            src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" 
            alt="Google" 
            className="w-6 h-6" 
          />
          Continue with Google
        </button>

        <p className="mt-6 text-sm text-gray-500">
          No account? You can create one instantly with Google
        </p>
      </div>
    </div>
  );
}