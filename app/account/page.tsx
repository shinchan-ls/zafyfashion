// app/account/page.tsx

import { Suspense } from "react";
import AccountClient from "@/app/account/AccountClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <AccountClient />
    </Suspense>
  );
}

