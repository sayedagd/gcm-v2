import { LogoutForm } from "@/features/auth/ui/LogoutForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function LogoutPage() {
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-surface p-6">
      <h2 className="text-2xl font-semibold">Sign out</h2>
      <p className="mt-2 text-muted">This clears the temporary migration session cookies.</p>
      <LogoutForm />
    </section>
  );
}
