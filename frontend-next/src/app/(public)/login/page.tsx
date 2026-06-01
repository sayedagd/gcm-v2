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

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-surface p-6">
      <h2 className="text-2xl font-semibold">Login</h2>
      <p className="mt-2 text-muted">Temporary migration login for validating App Router auth boundaries.</p>
      <LoginForm nextPath={nextPath} />
    </section>
  );
}
