"use client";

import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AssetAllocationWidget } from "@/components/dashboard/AssetAllocationWidget";
import { CommunicationsDeck } from "@/components/dashboard/CommunicationsDeck";
import { FleetAnalytics } from "@/components/dashboard/FleetAnalytics";
import { InventoryAnalytics } from "@/components/dashboard/InventoryAnalytics";
import { OperationsHub } from "@/components/dashboard/OperationsHub";
import { ServiceAnalytics } from "@/components/dashboard/ServiceAnalytics";
import { ServiceDistribution } from "@/components/dashboard/ServiceDistribution";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { useStore } from "@/context";
import { useTranslation } from "@/hooks/useTranslation";
import { Sparkles } from "lucide-react";

type InternalDashboardClientProps = {
  initialHeroImage?: string;
};

export function InternalDashboardClient({ initialHeroImage }: InternalDashboardClientProps) {
  const { isAr } = useTranslation();
  const { saasConfig } = useStore();

  const heroImage =
    saasConfig?.landingPage?.heroBgUrl ||
    initialHeroImage ||
    "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=1600&q=80";

  return (
    <div className="space-y-8">
      <section
        className="relative overflow-hidden rounded-3xl border border-border p-6 md:p-8"
        style={{
          backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.72)), url('${heroImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 font-bold">
              {isAr ? "مركز القيادة" : "Command Center"}
            </p>
            <h1 className="mt-2 text-2xl md:text-3xl font-black text-white">
              {isAr ? "لوحة العمليات الداخلية" : "Internal Operations Dashboard"}
            </h1>
            <p className="mt-2 text-sm text-slate-200 max-w-2xl">
              {isAr
                ? "مؤشرات فورية لحركة الرحلات، جاهزية الأسطول، وتوزيع الخدمات مع روابط تشغيل مباشرة."
                : "Live operational metrics for trips, fleet readiness, service allocation, and direct action surfaces."}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-emerald-200 backdrop-blur-sm">
            <Sparkles size={14} />
            {isAr ? "بيانات لحظية" : "Realtime"}
          </span>
        </div>
      </section>

      <StatsGrid isAr={isAr} />

      <OperationsHub isAr={isAr} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FleetAnalytics isAr={isAr} />
        <InventoryAnalytics isAr={isAr} />
      </div>

      <ServiceAnalytics isAr={isAr} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AssetAllocationWidget isAr={isAr} />
        </div>
        <CommunicationsDeck isAr={isAr} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ServiceDistribution isAr={isAr} />
        <ActivityFeed isAr={isAr} />
      </div>
    </div>
  );
}
