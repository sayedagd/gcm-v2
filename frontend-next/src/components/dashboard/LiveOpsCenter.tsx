"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, FileText, MoreHorizontal, Route, Sparkles } from "lucide-react";
import { useStore } from "@/context";
import { TripStatus, Role } from "@/types";
import { formatDate, formatTripStatusByRole, getTripStatusColor } from "@/utils/helpers";
import Card from "@/components/ui/Card";

type LiveOpsCenterProps = {
  isAr: boolean;
};

export function LiveOpsCenter({ isAr }: LiveOpsCenterProps) {
  const { trips, projects, currentUser } = useStore();

  const todayKey = new Date().toISOString().slice(0, 10);

  const liveSummary = useMemo(() => {
    const activeTrips = trips.filter((trip) =>
      [TripStatus.EN_ROUTE, TripStatus.LOADING, TripStatus.IN_PROGRESS, TripStatus.PENDING_APPROVAL].includes(trip.status),
    );
    const pendingApproval = trips.filter((trip) => trip.status === TripStatus.PENDING_APPROVAL);
    const pendingDocs = trips.filter((trip) => trip.status === TripStatus.PENDING_DOCS);
    const alerts = trips.filter((trip) => trip.status === TripStatus.CANCELLED && (trip.date || "").slice(0, 10) === todayKey);

    return {
      activeTrips,
      pendingApproval,
      pendingDocs,
      alerts,
    };
  }, [todayKey, trips]);

  const actionableTrips = useMemo(() => {
    return trips
      .filter((trip) =>
        [TripStatus.REQUESTED, TripStatus.ASSIGNED, TripStatus.PENDING_APPROVAL, TripStatus.PENDING_DOCS].includes(trip.status),
      )
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5);
  }, [trips]);

  return (
    <Card className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-text-main flex items-center gap-3">
            <div className="tone-success tone-success-bg tone-success-border p-2.5 rounded-2xl border">
              <Route size={20} />
            </div>
            {isAr ? "مركز العمليات الحي" : "Live Ops Center"}
          </h3>
          <p className="mt-1 text-sm text-text-subtle font-medium">
            {isAr
              ? "ملخص تنفيذي للحالات التشغيلية التي تحتاج متابعة أو إجراء سريع."
              : "Executive summary of operational items that need follow-up or immediate action."}
          </p>
        </div>
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-subtle px-3 py-2 text-xs font-bold text-text-subtle sm:w-auto">
          <MoreHorizontal size={14} />
          {isAr ? "خيارات" : "Options"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: isAr ? "نشطة الآن" : "Active Now",
            value: liveSummary.activeTrips.length,
            icon: Sparkles,
            color: "tone-success",
            bg: "tone-success-bg tone-success-border",
          },
          {
            label: isAr ? "بانتظار الموافقة" : "Pending Approval",
            value: liveSummary.pendingApproval.length,
            icon: Clock3,
            color: "tone-info",
            bg: "tone-info-bg tone-info-border",
          },
          {
            label: isAr ? "بانتظار التوثيق" : "Pending Docs",
            value: liveSummary.pendingDocs.length,
            icon: FileText,
            color: "tone-warning",
            bg: "tone-warning-bg tone-warning-border",
          },
          {
            label: isAr ? "تنبيهات اليوم" : "Today Alerts",
            value: liveSummary.alerts.length,
            icon: AlertTriangle,
            color: "tone-danger",
            bg: "tone-danger-bg tone-danger-border",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-surface-subtle p-4">
            <div className={`inline-flex items-center justify-center rounded-xl p-2 border ${item.bg} ${item.color}`}>
              <item.icon size={16} />
            </div>
            <p className="mt-3 text-2xl font-black text-text-main">{item.value}</p>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-subtle mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-subtle p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-text-main">{isAr ? "الإجراءات العاجلة" : "Action Queue"}</h4>
            <Link href="/trips" className="text-xs font-bold text-primary hover:opacity-80">
              {isAr ? "عرض الكل" : "View all"}
            </Link>
          </div>

          <div className="space-y-3">
            {actionableTrips.map((trip) => {
              const project = projects.find((item) => item.project_id === trip.project_id);
              const status = getTripStatusColor(trip.status);

              return (
                <Link
                  key={trip.trip_id}
                  href={`/trips?trip=${trip.trip_id}`}
                  className="block rounded-2xl border border-border bg-surface p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-text-main">{project?.project_name || trip.project_id}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle mt-1">{trip.trip_id}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.solidBg}`}>
                      {formatTripStatusByRole(trip.status, currentUser.role, isAr)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-text-subtle">
                    <span>{formatDate(trip.date)}</span>
                    <span>{trip.quantity || "?"} {trip.unit || ""}</span>
                  </div>
                </Link>
              );
            })}

            {actionableTrips.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-text-subtle">
                {isAr ? "لا توجد عناصر عاجلة حالياً" : "No urgent items right now"}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-subtle p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-text-main">{isAr ? "ملخص المسار التشغيلي" : "Operational Snapshot"}</h4>
            <Link href="/reports-dashboard" className="text-xs font-bold text-primary hover:opacity-80">
              {isAr ? "التقارير" : "Reports"}
            </Link>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-subtle">{isAr ? "مستندات معلقة" : "Pending documentation"}</p>
                <p className="mt-1 text-lg font-black text-text-main">{liveSummary.pendingDocs.length}</p>
              </div>
              <FileText className="tone-warning" size={22} />
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-subtle">{isAr ? "رحلات بحاجة متابعة" : "Trips requiring follow-up"}</p>
                <p className="mt-1 text-lg font-black text-text-main">{liveSummary.pendingApproval.length + liveSummary.alerts.length}</p>
              </div>
              <CheckCircle2 className="tone-success" size={22} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
