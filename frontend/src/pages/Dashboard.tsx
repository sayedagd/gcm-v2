import React, { useState } from 'react';
import { useStore } from '@/context';
import {
  Moon, Sun, MapPin, Zap, LayoutDashboard, Clock, CheckCircle2, AlertTriangle,
  FileText, FileCheck, Recycle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Button, Card } from '@/components';
import { TripStatus, Role, Trip } from '@/types';
import { formatDate } from '@/utils/helpers';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { SkeletonFullPage } from '@/components/common/PageSkeleton';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { OperationsHub } from '@/components/dashboard/OperationsHub';
import { ServiceDistribution } from '@/components/dashboard/ServiceDistribution';
import { AssetAllocationWidget } from '@/components/dashboard/AssetAllocationWidget';
import { FleetAnalytics } from '@/components/dashboard/FleetAnalytics';
import { InventoryAnalytics } from '@/components/dashboard/InventoryAnalytics';
import { CommunicationsDeck } from '@/components/dashboard/CommunicationsDeck';
import TripWizard from '@/components/trips/TripWizard';
import DriverDashboard from '@/pages/driver/DriverDashboard';

const Dashboard: React.FC = () => {
  const { saasConfig, darkMode, setDarkMode, trips, projects, services, currentUser, booting } = useStore();
  const isAr = saasConfig.language === 'ar';
  const isSuperUser = [Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role);
  const isDataEntry = currentUser.role === Role.DATA_ENTRY;
  const isDriver = currentUser.role === Role.DRIVER;
  const showPendingDocs = isDataEntry || isSuperUser;

  const [wizardTrip, setWizardTrip] = useState<Trip | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pendingDocsVisible, setPendingDocsVisible] = useState(3);
  const { projectMap, serviceMap } = useLookupMaps();

  // Pending Docs trips for Data Entry section
  const pendingDocsTrips = useMemo(() => {
    if (!showPendingDocs) return [];
    return trips
      .filter(t => t.status === TripStatus.PENDING_DOCS)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [trips, showPendingDocs]);

  // Real-time Trip Stats
  const tripStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const active = trips.filter(t => ['EN_ROUTE_PICKUP', 'ON_SITE', 'EN_ROUTE_DROP'].includes(t.status)).length;
    const pending = trips.filter(t => ['PENDING', 'SCHEDULED'].includes(t.status)).length;
    const completedToday = trips.filter(t => t.status === 'COMPLETED' && t.date === todayStr).length; // Assuming t.date is YYYY-MM-DD
    const warning = trips.filter(t => t.status === 'CANCELLED' && t.date === todayStr).length;

    return [
      { label: isAr ? 'نشطه الآن' : 'Active Now', value: active, icon: Zap, color: 'text-primary', bg: 'bg-primary/10' },
      { label: isAr ? 'في الانتظار' : 'Pending', value: pending, icon: Clock, color: 'text-amber', bg: 'bg-amber-muted' },
      { label: isAr ? 'مكتملة اليوم' : 'Done Today', value: completedToday, icon: CheckCircle2, color: 'text-success', bg: 'bg-success-muted' },
      { label: isAr ? 'تنبيهات' : 'Alerts', value: warning, icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger-muted' },
    ];
  }, [trips, isAr]);

  if (isDriver) {
    return <DriverDashboard />;
  }

  if (booting) {
    return <SkeletonFullPage variant="dashboard" />;
  }

  return (
    <div className={`space-y-8 pb-16 max-w-[1920px] mx-auto ${isAr ? 'text-right' : 'text-left'}`}>

      {/* 1. HERO SECTION & HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 px-4 md:px-0">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-surface-subtle border border-border rounded-xl shadow-lg flex items-center justify-center">
              {/* Animated Logo Icon */}
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                <LayoutDashboard className="text-primary" size={24} />
              </motion.div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-text-main tracking-tight">
              {isAr ? 'مركز القيادة' : 'Command Center'}
            </h1>
          </div>
          <p className="text-text-subtle font-medium text-sm max-w-xl">
            {isAr ? 'التحكم الكامل في العمليات، الأسطول، والموارد البشرية.' : 'Total control over operations, fleet, and human resources.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Server Health Pills */}
          <div className="hidden md:flex gap-2 bg-surface p-1.5 rounded-xl shadow-sm border border-border">
            {tripStats.map((stat, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 ${stat.bg} rounded-lg`}
              >
                <stat.icon size={16} className={stat.color} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-text-subtle leading-none mb-0.5">{stat.label}</span>
                  <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            icon={darkMode ? Moon : Sun}
            onClick={() => setDarkMode(!darkMode)}
            className="w-10 h-10 rounded-xl bg-surface shadow-sm border border-border hover:scale-105 active:scale-95 transition-all text-text-main"
          />
        </div>
      </div>

      {/* 2. STATS GRID (The Power Grid) */}
      <StatsGrid isAr={isAr} />

      {/* PENDING DOCUMENTATION SECTION (DATA_ENTRY & SuperUser) */}
      {showPendingDocs && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-1 w-12 bg-amber-500 rounded-full" />
            <h2 className="text-lg font-bold text-text-subtle">{isAr ? 'مستندات بانتظار التوثيق' : 'Pending Documentation'}</h2>
            <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{pendingDocsTrips.length}</span>
          </div>

          {pendingDocsTrips.length === 0 ? (
            <Card className="p-10 text-center !rounded-2xl border-2 border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
              <p className="text-lg font-bold text-text-main">{isAr ? 'لا توجد مستندات معلقة' : 'All Clear!'}</p>
              <p className="text-sm text-text-subtle mt-1">{isAr ? 'جميع الرحلات موثقة بالكامل' : 'No trips awaiting documentation'}</p>
            </Card>
          ) : (<>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingDocsTrips.slice(0, pendingDocsVisible).map(trip => {
                const project = projectMap[trip.project_id];
                const service = serviceMap[trip.service_id];
                const hasManifest = !!trip.manifest_file;
                const hasDelivery = !!trip.delivery_note_file;
                const hasRecycle = !!trip.recycle_file;
                const allRequiredDone = hasManifest && hasDelivery;

                return (
                  <Card key={trip.trip_id} className="p-5 !rounded-2xl space-y-4 hover:shadow-lg transition-shadow">
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
                      <p className="text-xs text-text-subtle font-bold">{service.service_name} • {trip.quantity || '?'} {trip.unit}</p>
                    )}

                    {/* Document Status Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: isAr ? 'بيان النفايات' : 'Manifest', icon: FileText, done: hasManifest, required: true },
                        { label: isAr ? 'سند التسليم' : 'Delivery Note', icon: FileCheck, done: hasDelivery, required: true },
                        { label: isAr ? 'إيصال التدوير' : 'Recycle', icon: Recycle, done: hasRecycle, required: false },
                      ].map((doc, i) => (
                        <div key={i} className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center ${doc.done
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                          : doc.required
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-surface-subtle border-border'
                          }`}>
                          <doc.icon size={14} className={doc.done ? 'text-emerald-500' : doc.required ? 'text-red-400 animate-pulse' : 'text-text-subtle'} />
                          <span className={`text-[9px] font-bold uppercase ${doc.done ? 'text-emerald-600' : doc.required ? 'text-red-500' : 'text-text-subtle'}`}>
                            {doc.done ? '✓' : (doc.required ? (isAr ? 'مطلوب' : 'Missing') : (isAr ? 'اختياري' : 'Optional'))}
                          </span>
                          <span className="text-[8px] text-text-subtle font-bold leading-tight">{doc.label}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => { setWizardTrip(trip); setWizardOpen(true); }}
                      className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${allRequiredDone
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/20'
                        }`}
                    >
                      <FileText size={16} />
                      {allRequiredDone
                        ? (isAr ? 'مراجعة وإكمال' : 'Review & Complete')
                        : (isAr ? 'إكمال التوثيق' : 'Complete Documentation')}
                    </button>
                  </Card>
                );
              })}
            </div>

            {/* Load More Button */}
            {pendingDocsTrips.length > pendingDocsVisible && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setPendingDocsVisible(prev => prev + 6)}
                  className="relative px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                >
                  <FileCheck size={16} />
                  {isAr ? 'عرض المزيد' : 'Load More'}
                  <span className="absolute -top-2.5 -right-2.5 min-w-[22px] h-[22px] flex items-center justify-center bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 shadow-lg shadow-amber-500/30 animate-pulse">
                    {pendingDocsTrips.length - pendingDocsVisible}
                  </span>
                </button>
              </div>
            )}
          </>)}
        </div>
      )}

      {/* TripWizard Modal for Documentation */}
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
      {/* 3. OPERATIONS SECTOR */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-1 w-12 bg-primary rounded-full" />
          <h2 className="text-lg font-bold text-text-subtle">{isAr ? 'قطاع العمليات' : 'Operations Sector'}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Live Map (Dominant Visual) */}
          <div className="lg:col-span-8">
            <Card className="h-[480px] rounded-2xl overflow-hidden shadow-lg relative group bg-surface border-border">
              <div className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-700">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  style={{
                    filter: darkMode
                      ? 'grayscale(100%) invert(92%) contrast(83%)'
                      : 'none'
                  }}
                  src="https://maps.google.com/maps?q=Riyadh&z=11&output=embed"
                ></iframe>
              </div>
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent pointer-events-none" />

              {/* Map Controls Overlay */}
              <div className="absolute bottom-8 left-8 right-8 pointer-events-none flex justify-between items-end">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse">
                    <MapPin className="text-surface" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-text-main">{isAr ? 'الخارطة الحية' : 'Live Ops Map'}</h3>
                    <p className="text-primary font-medium text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                      {isAr ? 'تحديث لحظي' : 'Real-time Link'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Service Distribution Donut */}
          <div className="lg:col-span-4 h-full">
            <div className="h-full">
              <ServiceDistribution isAr={isAr} />
            </div>
          </div>
        </div>

        {/* Volume & Projects Charts */}
        <div className="w-full">
          <OperationsHub isAr={isAr} />
        </div>
      </div>

      {/* 4. LOGISTICS & RESOURCES SECTOR */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <div className="h-1 w-12 bg-primary rounded-full" />
          <h2 className="text-lg font-bold text-text-subtle">{isAr ? 'اللوجستيات والموارد' : 'Logistics & Assets'}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 h-[360px]">
            <FleetAnalytics isAr={isAr} />
          </div>
          <div className="xl:col-span-1 h-[360px]">
            <InventoryAnalytics isAr={isAr} />
          </div>
        </div>
      </div>

      {/* 5. COMMUNICATIONS & STREAM SECTOR */}
      <div className="space-y-6 pt-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="h-1 w-12 bg-primary rounded-full" />
          <h2 className="text-lg font-bold text-text-subtle">{isAr ? 'التشغيل ومركز الاتصال' : 'Ops & Comms Center'}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <CommunicationsDeck isAr={isAr} />
          </div>
          <div className="lg:col-span-2">
            <AssetAllocationWidget isAr={isAr} />
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
