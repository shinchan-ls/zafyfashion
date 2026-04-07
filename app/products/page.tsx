import { Suspense } from "react";
import ProductsClient from "@/app/products/ProductsClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading products...</div>}>
      <ProductsClient />
    </Suspense>
  );
}