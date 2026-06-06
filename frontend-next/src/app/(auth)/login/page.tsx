import { LoginForm } from "@/features/auth/ui/LoginForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : "";
  const reason = typeof params.reason === "string" ? params.reason : "";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm md:p-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">GCM App</p>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-600">Sign in with your email and password to access your dashboard.</p>
      </div>

      {reason === "session_expired" ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Your session expired. Please sign in again.
        </p>
      ) : null}

      {reason === "signed_out" ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          You have been signed out successfully.
        </p>
      ) : null}

      <LoginForm nextPath={nextPath} />
    </section>
  );
}
