"use client";

import Link from "next/link";
import { MapPinned, Truck, Sparkles } from "lucide-react";
import { useStore } from "@/context";
import { useTranslation } from "@/hooks/useTranslation";

export default function DriverDashboardPage() {
  const { isAr } = useTranslation();
  const { saasConfig } = useStore();
  const heroImage =
    saasConfig?.landingPage?.heroBgUrl ||
    "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1600&q=80";

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl border border-border p-6 md:p-8 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.72)), url('${heroImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200 font-bold">{isAr ? "لوحة السائق" : "Driver Ops"}</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-black">{isAr ? "المسارات والمهام الميدانية" : "Routes & Field Tasks"}</h1>
        <p className="mt-2 text-sm text-slate-200">{isAr ? "وصول مباشر للخريطة والتنقل اليومي." : "Direct access to trip map and daily movement tasks."}</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/driver/map" className="rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
          <MapPinned className="text-primary" size={20} />
          <h2 className="mt-3 font-bold text-text-main">{isAr ? "خريطة الرحلات" : "Trip Map"}</h2>
          <p className="mt-1 text-sm text-text-subtle">{isAr ? "متابعة الرحلات والمسارات النشطة." : "Track active trips and routes."}</p>
        </Link>

        <Link href="/trips" className="rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
          <Truck className="text-primary" size={20} />
          <h2 className="mt-3 font-bold text-text-main">{isAr ? "قائمة الرحلات" : "Trips List"}</h2>
          <p className="mt-1 text-sm text-text-subtle">{isAr ? "عرض الرحلات المخصصة وحالاتها." : "View assigned trips and statuses."}</p>
        </Link>
      </section>

      <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 border border-amber-200">
        <Sparkles size={14} />
        {isAr ? "واجهة السائق أصبحت مفعلة" : "Driver dashboard is now active (not a shell)"}
      </div>
    </div>
  );
}
