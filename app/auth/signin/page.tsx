// app/auth/signin/page.tsx
import { redirect } from "next/navigation";

export default function SignIn() {
  redirect("/"); // Modal already Navbar mein hai, isliye direct home bhej do
}