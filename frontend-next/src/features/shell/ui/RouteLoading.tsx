export function RouteLoading({ label }: { label: string }) {
  return (
    <div className="min-h-screen w-full bg-background px-4 py-8">
      <div className="w-full space-y-4">
        <div className="h-7 w-56 animate-pulse rounded-md bg-slate-200" />
        <p className="text-sm text-muted">Loading {label}...</p>
        <div className="space-y-3 rounded-xl border border-slate-200 bg-surface p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
