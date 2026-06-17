"use client";

import { Sparkles } from "lucide-react";

type DashboardHeroBannerProps = {
  isAr: boolean;
  heroImage: string;
  badgeText: string;
  titleText: string;
  descriptionText: string;
  realtimeText: string;
};

export function DashboardHeroBanner({
  isAr,
  heroImage,
  badgeText,
  titleText,
  descriptionText,
  realtimeText,
}: DashboardHeroBannerProps) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-border p-6 md:p-8"
      style={{
        backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.72)), url('${heroImage}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 font-bold">
            {badgeText}
          </p>
          <h1 className="mt-2 text-2xl md:text-3xl font-black text-white">
            {titleText}
          </h1>
          <p className="mt-2 text-sm text-slate-200 max-w-2xl">
            {descriptionText}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 self-start rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-emerald-200 backdrop-blur-sm sm:self-auto">
          <Sparkles size={14} />
          {realtimeText}
        </span>
      </div>
    </section>
  );
}
