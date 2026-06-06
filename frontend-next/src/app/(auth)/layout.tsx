export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 px-4 py-10">
      <main className="mx-auto w-full max-w-md">{children}</main>
    </div>
  );
}
