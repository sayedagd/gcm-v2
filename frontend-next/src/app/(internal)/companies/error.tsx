"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CompaniesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[CompaniesFeatureError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-surface p-8 text-center space-y-4">
        <h2 className="text-2xl font-black text-text-main">Companies page failed to load</h2>
        <p className="text-sm text-text-subtle">
          We could not load company records right now. You can retry or return safely.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-primary text-surface font-bold text-sm"
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-5 py-2.5 rounded-xl border border-border text-text-main font-bold text-sm"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
