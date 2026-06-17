"use client";

import { motion } from "framer-motion";
import { LayoutDashboard } from "lucide-react";
import { DashboardHeroBanner } from "@/components/dashboard/DashboardHeroBanner";
import { CommunicationsDeck } from "@/components/dashboard/CommunicationsDeck";
import { FleetAnalytics } from "@/components/dashboard/FleetAnalytics";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OperationsHub } from "@/components/dashboard/OperationsHub";
import { ServiceDistribution } from "@/components/dashboard/ServiceDistribution";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { LiveOpsCenter } from "@/components/dashboard/LiveOpsCenter";
import { PendingDocumentationSection } from "@/components/dashboard/PendingDocumentationSection";
import { useStore } from "@/context";
import { useTranslation } from "@/hooks/useTranslation";

type InternalDashboardClientProps = {
  initialHeroImage?: string;
};

export function InternalDashboardClient({ initialHeroImage }: InternalDashboardClientProps) {
  const { isAr } = useTranslation();
  const { saasConfig } = useStore();
  const systemShowcase = saasConfig?.landingPage?.systemShowcase;

  const dashboardTopTitle = isAr ? "الصفحة الرئيسية" : "Home";
  const dashboardTopSummary = isAr
    ? (systemShowcase?.descAr || "التحكم الكامل في العمليات، الأسطول، والموارد البشرية.")
    : (systemShowcase?.descEn || "Total control over operations, fleet, and human resources.");

  const heroBadge = isAr ? "مركز القيادة" : "Command Center";
  const heroTitle = isAr
    ? (systemShowcase?.titleAr || "لوحة العمليات الداخلية")
    : (systemShowcase?.titleEn || "Internal Operations Dashboard");
  const heroDescription = isAr
    ? (systemShowcase?.descAr || "مؤشرات فورية لحركة الرحلات، جاهزية الأسطول، وتوزيع الخدمات مع روابط تشغيل مباشرة.")
    : (systemShowcase?.descEn || "Live operational metrics for trips, fleet readiness, service allocation, and direct action surfaces.");
  const realtimeLabel = isAr ? "بيانات لحظية" : "Realtime";

  const heroImage =
    saasConfig?.landingPage?.heroBgUrl ||
    initialHeroImage ||
    "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=1600&q=80";

  return (
    <div className="w-full min-w-0 space-y-6 pb-12 md:space-y-8 md:pb-16">
      <div className={`px-4 md:px-0 ${isAr ? "text-right" : "text-left"}`}>
        <div className={`flex items-center gap-3 mb-1.5 ${isAr ? "flex-row-reverse justify-end" : ""}`}>
          <div className="p-2.5 bg-surface-subtle border border-border rounded-xl shadow-sm flex items-center justify-center shrink-0">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
              <LayoutDashboard className="text-primary" size={22} />
            </motion.div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-main tracking-tight">
            {dashboardTopTitle}
          </h1>
        </div>
        <p className="text-text-subtle font-medium text-sm max-w-xl">
          {dashboardTopSummary}
        </p>
      </div>

      <DashboardHeroBanner
        isAr={isAr}
        heroImage={heroImage}
        badgeText={heroBadge}
        titleText={heroTitle}
        descriptionText={heroDescription}
        realtimeText={realtimeLabel}
      />

      <StatsGrid isAr={isAr} />

      <LiveOpsCenter isAr={isAr} />

      <PendingDocumentationSection />

      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-3 px-2 sm:px-4 md:px-0">
          <div className="h-1 w-10 bg-primary rounded-full" />
          <h2 className="text-base font-bold text-text-subtle">{isAr ? "الرؤى والتحليلات" : "Insights & Analytics"}</h2>
        </div>

        <RevenueChart isAr={isAr} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">
          <OperationsHub isAr={isAr} />
          <ServiceDistribution isAr={isAr} />
        </div>

        <div className="min-h-128 md:min-h-144">
          <FleetAnalytics isAr={isAr} />
        </div>

        <CommunicationsDeck isAr={isAr} />
      </div>
    </div>
  );
}
