"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileCheck, FileText, Recycle } from "lucide-react";
import { useStore } from "@/context";
import { useTranslation } from "@/hooks/useTranslation";
import { TripStatus, Trip } from "@/types";
import { formatDate } from "@/utils/helpers";
import Card from "@/components/ui/Card";
import TripWizard from "@/components/trips/TripWizard";

export function PendingDocumentationSection() {
  const { currentUser, trips, services, allProjects } = useStore();
  const { isAr } = useTranslation();

  const showPendingDocs = currentUser.role === "DATA_ENTRY" || ["ADMIN", "REPORTS_MANAGER"].includes(currentUser.role);
  const [wizardTrip, setWizardTrip] = useState<Trip | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pendingDocsVisible, setPendingDocsVisible] = useState(3);

  const pendingDocsTrips = useMemo(() => {
    if (!showPendingDocs) return [];

    return trips
      .filter((trip) => trip.status === TripStatus.PENDING_DOCS)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [showPendingDocs, trips]);

  if (!showPendingDocs) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="h-1 w-12 progress-fill-warning rounded-full" />
        <h2 className="text-lg font-bold text-text-subtle">{isAr ? "مستندات بانتظار التوثيق" : "Pending Documentation"}</h2>
        <span className="tone-warning tone-warning-bg tone-warning-border text-xs font-bold px-2 py-0.5 rounded-full border">
          {pendingDocsTrips.length}
        </span>
      </div>

      {pendingDocsTrips.length === 0 ? (
        <Card className="p-10 text-center rounded-2xl! border-2 tone-success-border">
          <div className="tone-success tone-success-bg tone-success-border mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] border">
            <CheckCircle2 size={32} />
          </div>
          <p className="text-lg font-bold text-text-main">{isAr ? "لا توجد مستندات معلقة" : "All Clear!"}</p>
          <p className="text-sm text-text-subtle mt-1">{isAr ? "جميع الرحلات موثقة بالكامل" : "No trips awaiting documentation"}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingDocsTrips.slice(0, pendingDocsVisible).map((trip) => {
              const project = allProjects.find((item) => item.project_id === trip.project_id);
              const service = services.find((item) => item.service_id === trip.service_id);
              const hasManifest = !!trip.manifest_file;
              const hasDelivery = !!trip.delivery_note_file;
              const hasRecycle = !!trip.recycle_file;
              const allRequiredDone = hasManifest && hasDelivery;

              return (
                <Card key={trip.trip_id} className="p-5 rounded-2xl! space-y-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-text-main">{project?.project_name || trip.project_id}</p>
                      <p className="text-[10px] text-text-subtle font-bold uppercase tracking-widest">{trip.trip_id}</p>
                    </div>
                    <span className="text-xs font-bold text-text-subtle bg-surface-subtle px-2 py-1 rounded-lg">
                      {formatDate(trip.date)}
                    </span>
                  </div>

                  {service && (
                    <p className="text-xs text-text-subtle font-bold">
                      {service.service_name} • {trip.quantity || "?"} {trip.unit}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: isAr ? "بيان النفايات" : "Manifest", icon: FileText, done: hasManifest, required: true },
                      { label: isAr ? "سند التسليم" : "Delivery Note", icon: FileCheck, done: hasDelivery, required: true },
                      { label: isAr ? "إيصال التدوير" : "Recycle", icon: Recycle, done: hasRecycle, required: false },
                    ].map((doc, index) => (
                      <div
                        key={index}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center ${doc.done
                          ? "tone-success-bg tone-success-border"
                          : doc.required
                            ? "tone-danger-bg tone-danger-border"
                            : "bg-surface-subtle border-border"
                          }`}
                      >
                        <doc.icon size={14} className={doc.done ? "tone-success" : doc.required ? "tone-danger animate-pulse" : "text-text-subtle"} />
                        <span className={`text-[9px] font-bold uppercase ${doc.done ? "tone-success" : doc.required ? "tone-danger" : "text-text-subtle"}`}>
                          {doc.done ? "✓" : doc.required ? (isAr ? "مطلوب" : "Missing") : isAr ? "اختياري" : "Optional"}
                        </span>
                        <span className="text-[8px] text-text-subtle font-bold leading-tight">{doc.label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setWizardTrip(trip);
                      setWizardOpen(true);
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 border ${allRequiredDone
                      ? "tone-success accent-chip-strong tone-success-border"
                      : "tone-warning-bg tone-warning tone-warning-border hover:opacity-90"
                      }`}
                  >
                    <FileText size={16} />
                    {allRequiredDone
                      ? isAr
                        ? "مراجعة وإكمال"
                        : "Review & Complete"
                      : isAr
                        ? "إكمال التوثيق"
                        : "Complete Documentation"}
                  </button>
                </Card>
              );
            })}
          </div>

          {pendingDocsTrips.length > pendingDocsVisible && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setPendingDocsVisible((prev) => prev + 6)}
                className="tone-warning tone-warning-bg tone-warning-border relative px-6 py-3 border rounded-2xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 hover:opacity-90"
              >
                <FileCheck size={16} />
                {isAr ? "عرض المزيد" : "Load More"}
                <span className="accent-chip-strong absolute -top-2.5 -right-2.5 min-w-5.5 h-5.5 flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 animate-pulse">
                  {pendingDocsTrips.length - pendingDocsVisible}
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {wizardOpen && wizardTrip && (
        <TripWizard
          isOpen={wizardOpen}
          tripToEdit={wizardTrip}
          onClose={() => {
            setWizardOpen(false);
            setWizardTrip(null);
          }}
          initialStep={4}
        />
      )}
    </section>
  );
}
