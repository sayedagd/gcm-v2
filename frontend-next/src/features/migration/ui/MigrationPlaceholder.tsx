type MigrationPlaceholderProps = {
  title: string;
  domain: string;
  legacyPath: string;
};

export function MigrationPlaceholder({ title, domain, legacyPath }: MigrationPlaceholderProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-surface p-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-muted">
        Domain: <strong>{domain}</strong>
      </p>
      <p className="mt-1 text-muted">Legacy path parity is active at {legacyPath}.</p>
      <p className="mt-4 text-sm text-slate-500">
        This route is now served by Next.js App Router and will receive full feature migration incrementally.
      </p>
    </section>
  );
}
