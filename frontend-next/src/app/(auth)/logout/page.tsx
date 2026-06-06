import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LogoutPage() {
  redirect("/login?reason=signed_out");
}
