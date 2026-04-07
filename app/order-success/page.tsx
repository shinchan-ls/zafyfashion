import { Suspense } from "react";
import OrderSuccessClient from "@/app/order-success/OrderSuccessClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderSuccessClient />
    </Suspense>
  );
}