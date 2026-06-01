import Image from "next/image";
import { CORE_API_OPERATIONS } from "@/features/core/api";

export const revalidate = 600;

export default async function LandingPage() {
  const systemConfig = await CORE_API_OPERATIONS.getSystemConfig({ revalidateSeconds: 600 });

  return (
    <section className="rounded-xl border border-slate-200 bg-surface p-6">
      <h2 className="text-2xl font-semibold">Landing</h2>
      <p className="mt-2 text-muted">
        Next.js App Router scaffold is active. Legacy landing content will be migrated in P4.5.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <figure className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Image
            src="/globe.svg"
            alt="Global sustainability network graphic"
            width={320}
            height={180}
            className="h-auto w-full"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          <figcaption className="mt-2 text-xs text-slate-600">Primary hero media (optimized by Next image pipeline).</figcaption>
        </figure>

        <figure className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Image
            src="/window.svg"
            alt="Operations dashboard preview graphic"
            width={320}
            height={180}
            className="h-auto w-full"
            sizes="(max-width: 768px) 100vw, 50vw"
            loading="lazy"
          />
          <figcaption className="mt-2 text-xs text-slate-600">Secondary media lazy-loaded for better initial route performance.</figcaption>
        </figure>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        API connectivity: {systemConfig ? "config reachable" : "config not available in current environment"}.
      </p>
    </section>
  );
}
