import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/context';
import {
  format, parseISO, isWithinInterval, startOfMonth,
  endOfDay, startOfDay, startOfWeek, subMonths, isSameMonth
} from 'date-fns';
import {
  ReportsFilters, ReportsStats, LogisticsMap, PeakHoursChart,
  ServiceMixChart, VolumeTrendChart, TopDriversList, DrilldownSelection,
  StatusDistributionChart, TopProjectsChart, MonthlyTonnageChart, VehicleUtilizationChart
} from '@/components';
import { safeParseArray } from '@/utils/helpers';
import { Role, TripStatus } from '@/types';
import { generateExcelReport } from '@/utils/exportHelpers';

const Reports: React.FC = () => {
  const { trips, projects, services, vehicles, drivers, companies, saasConfig, currentUser, darkMode } = useStore();
  const isAr = saasConfig.language === 'ar';

  // --- 1. RBAC ---
  const { visibleTrips, visibleProjects, visibleCompanies } = useMemo(() => {
    let vTrips = trips || [];
    let vProjects = projects || [];
    let vCompanies = companies || [];

    if (currentUser.role === Role.ADMIN || currentUser.role === Role.USER) {
      // Full access
    } else if (currentUser.role === Role.COMPANY_USER) {
      vCompanies = companies.filter(comp => comp.company_id === currentUser.company_id);
      vProjects = projects.filter(p => p.company_id === currentUser.company_id);
      const pIds = new Set(vProjects.map(p => p.project_id));
      vTrips = trips.filter(t => pIds.has(t.project_id));
    } else if (currentUser.role === Role.PROJECT_USER) {
      vProjects = projects.filter(proj => proj.project_id === currentUser.project_id);
      vCompanies = companies.filter(c => c.company_id === vProjects[0]?.company_id);
      vTrips = trips.filter(t => t.project_id === currentUser.project_id);
    }
    return { visibleTrips: vTrips, visibleProjects: vProjects, visibleCompanies: vCompanies };
  }, [currentUser, trips, projects, companies]);


  // --- 2. Filters ---
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM'>('MONTH');
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [missingDocsOnly, setMissingDocsOnly] = useState(false);

  useEffect(() => { if (visibleCompanies.length === 1) setSelectedCompany(visibleCompanies[0].company_id); }, [visibleCompanies]);
  useEffect(() => { if (selectedCompany && !visibleCompanies.some(c => c.company_id === selectedCompany)) setSelectedCompany(null); }, [selectedCompany, visibleCompanies]);


  // --- 3. Data Logic Helper ---
  const getNormalizedTonnage = (t: any) => {
    const val = Number(t.quantity || 0);
    return t.unit === 'KG' ? val / 1000 : val;
  };

  const filteredData = useMemo(() => {
    let targetTrips = visibleTrips;
    const now = new Date();
    let startDate = new Date(0); let endDate = now;

    if (timeRange === 'TODAY') { startDate = startOfDay(now); endDate = endOfDay(now); }
    if (timeRange === 'WEEK') { startDate = startOfWeek(now); endDate = endOfDay(now); }
    if (timeRange === 'MONTH') { startDate = startOfMonth(now); endDate = endOfDay(now); }
    if (timeRange === 'QUARTER') {
      startDate = subMonths(now, 3);
      endDate = endOfDay(now);
    }
    if (timeRange === 'YEAR') { startDate = new Date(now.getFullYear(), 0, 1); endDate = endOfDay(now); }
    if (timeRange === 'CUSTOM') { startDate = parseISO(customStart); endDate = endOfDay(parseISO(customEnd)); }

    targetTrips = targetTrips.filter(t => isWithinInterval(parseISO(t.date), { start: startOfDay(startDate), end: endOfDay(endDate) }));

    if (selectedCompany) {
      const pIds = new Set(projects.filter(p => p.company_id === selectedCompany).map(p => p.project_id));
      targetTrips = targetTrips.filter(t => pIds.has(t.project_id));
    }
    if (selectedProject) targetTrips = targetTrips.filter(t => t.project_id === selectedProject);
    if (selectedService) targetTrips = targetTrips.filter(t => t.service_id === selectedService);
    if (selectedDriver) targetTrips = targetTrips.filter(t => t.driver_id === selectedDriver);
    if (selectedVehicleType) {
      const vIds = new Set(vehicles.filter(v => v.vehicle_type === selectedVehicleType).map(v => v.vehicle_id));
      targetTrips = targetTrips.filter(t => vIds.has(t.vehicle_id));
    }
    if (missingDocsOnly) targetTrips = targetTrips.filter(t => (!t.waste_manifest_no || t.waste_manifest_no.length < 3) || (safeParseArray(t.proof_images).length === 0));

    return targetTrips;
  }, [visibleTrips, projects, vehicles, timeRange, customStart, customEnd, selectedCompany, selectedProject, selectedService, selectedDriver, selectedVehicleType, missingDocsOnly]);

  const availableProjects = useMemo(() => selectedCompany ? visibleProjects.filter(p => p.company_id === selectedCompany) : visibleProjects, [selectedCompany, visibleProjects]);
  const availableServices = useMemo(() => {
    const serviceIdsInTrips = new Set(filteredData.map(t => t.service_id));
    return services.filter(s => serviceIdsInTrips.has(s.service_id) || !selectedProject);
  }, [filteredData, services, selectedProject]);


  // --- 4. Analytics Data Preparation ---

  // A. Volume Trend
  const trendData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(t => {
      map[t.date] = (map[t.date] || 0) + getNormalizedTonnage(t);
    });
    return Object.entries(map)
      .map(([date, val]) => ({ date: format(parseISO(date), 'MMM d'), val, rawDate: date }))
      .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
  }, [filteredData]);

  // B. Peak Hours
  const peakHours = useMemo(() => {
    const hours = Array(24).fill(0);
    filteredData.forEach(t => {
      if (t.time) {
        const h = parseInt(t.time.split(':')[0]);
        if (!isNaN(h) && h >= 0 && h < 24) hours[h]++;
      }
    });
    return hours.map((count, hour) => ({ hour: `${hour}:00`, count }));
  }, [filteredData]);

  // C. Service Mix (Category)
  const serviceMix = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(t => {
      const s = services.find(srv => srv.service_id === t.service_id);
      const cat = isAr ? ((s as any)?.category_ar || (s as any)?.category || 'عام') : ((s as any)?.category || 'General');
      map[cat] = (map[cat] || 0) + getNormalizedTonnage(t);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData, services, isAr]);

  // D. Status Distribution
  const statusDistribution = useMemo(() => {
    const stats = {
      [TripStatus.COMPLETED]: { name: isAr ? 'مكتمل' : 'Completed', color: '#10b981', value: 0 },
      [TripStatus.PENDING_REVIEW]: { name: isAr ? 'قيد المراجعة' : 'Pending', color: '#f59e0b', value: 0 },
      [TripStatus.CANCELLED]: { name: isAr ? 'ملغي' : 'Cancelled', color: '#ef4444', value: 0 },
      'OTHERS': { name: isAr ? 'أخرى' : 'Others', color: '#64748b', value: 0 }
    };
    filteredData.forEach(t => {
      if (stats[t.status as keyof typeof stats]) stats[t.status as keyof typeof stats].value++;
      else stats['OTHERS'].value++;
    });
    return Object.values(stats).filter(s => s.value > 0);
  }, [filteredData, isAr]);

  // E. Top Projects
  const topProjectsData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(t => {
      const p = projects.find(proj => proj.project_id === t.project_id);
      const name = isAr
        ? ((p as any)?.project_name_ar || p?.project_name || t.project_id)
        : (p?.project_name || t.project_id);
      map[name] = (map[name] || 0) + getNormalizedTonnage(t);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData, projects, isAr]);

  // F. Monthly Tonnage (Last 6 Months)
  const monthlyTonnage = useMemo(() => {
    const lastSixMonths = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), i)).reverse();
    return lastSixMonths.map(m => {
      const monthLabel = format(m, isAr ? 'MMM yyyy' : 'MMM yyyy');
      const tonnage = trips.filter(t => isSameMonth(parseISO(t.date), m)).reduce((acc, t) => acc + getNormalizedTonnage(t), 0);
      return { month: monthLabel, tonnage };
    });
  }, [trips, isAr]);

  // G. Vehicle Utilization
  const vehicleUtilization = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(t => {
      const v = vehicles.find(veh => veh.vehicle_id === t.vehicle_id);
      const type = isAr
        ? ((v as any)?.vehicle_type_ar || v?.vehicle_type || 'أخرى')
        : (v?.vehicle_type || 'Other');
      map[type] = (map[type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData, vehicles, isAr]);

  // H. Top Drivers
  const topDrivers = useMemo(() => {
    const map: Record<string, { trips: number, volume: number }> = {};
    filteredData.forEach(t => {
      if (!map[t.driver_id]) map[t.driver_id] = { trips: 0, volume: 0 };
      map[t.driver_id].trips++;
      map[t.driver_id].volume += getNormalizedTonnage(t);
    });
    return Object.entries(map).map(([id, stats]) => ({
      id, name: drivers.find(d => d.driver_id === id)?.name || id, ...stats
    })).sort((a, b) => b.volume - a.volume).slice(0, 5);
  }, [filteredData, drivers]);


  // --- 5. Handlers ---
  const handleExport = () => generateExcelReport(filteredData, visibleProjects, drivers, vehicles, services, visibleCompanies);
  const reset = () => {
    setTimeRange('MONTH'); setSelectedCompany(null); setSelectedProject(null); setSelectedDriver(null); setSelectedVehicleType(null); setMissingDocsOnly(false);
  };

  const stats = useMemo(() => {
    const pending = filteredData.filter(t => t.status === TripStatus.PENDING_REVIEW);
    const completed = filteredData.filter(t => t.status === TripStatus.COMPLETED);
    return {
      pendingCount: pending.length,
      pendingTonnage: pending.reduce((a, b) => a + getNormalizedTonnage(b), 0),
      completedCount: completed.length,
      totalTonnage: filteredData.reduce((a, b) => a + getNormalizedTonnage(b), 0)
    };
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-surface-subtle pb-20">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 space-y-8 py-8">

        {/* HEADER & FILTERS */}
        <ReportsFilters
          filteredCount={filteredData.length}
          timeRange={timeRange} setTimeRange={setTimeRange}
          customStart={customStart} setCustomStart={setCustomStart}
          customEnd={customEnd} setCustomEnd={setCustomEnd}
          visibleCompanies={visibleCompanies}
          availableProjects={availableProjects}
          availableServices={availableServices}
          vehicles={vehicles}
          drivers={drivers}
          selectedCompany={selectedCompany} setSelectedCompany={setSelectedCompany}
          selectedProject={selectedProject} setSelectedProject={setSelectedProject}
          selectedService={selectedService} setSelectedService={setSelectedService}
          selectedVehicleType={selectedVehicleType} setSelectedVehicleType={setSelectedVehicleType}
          selectedDriver={selectedDriver} setSelectedDriver={setSelectedDriver}
          missingDocsOnly={missingDocsOnly} setMissingDocsOnly={setMissingDocsOnly}
          onExport={handleExport}
          onReset={reset}
          isAr={isAr}
          trips={filteredData}
          isRestricted={currentUser.role === Role.COMPANY_USER || currentUser.role === Role.PROJECT_USER}
        />

        {/* DRILLDOWN SELECTION */}
        <div className="bg-surface/50 backdrop-blur-md rounded-3xl p-6 border border-border/50 shadow-sm transition-all hover:shadow-md">
          <DrilldownSelection
            isAr={isAr}
            companies={visibleCompanies}
            projects={availableProjects}
            services={availableServices}
            selectedCompany={selectedCompany}
            selectedProject={selectedProject}
            selectedService={selectedService}
            onSelectCompany={setSelectedCompany}
            onSelectProject={setSelectedProject}
            onSelectService={setSelectedService}
            isRestricted={currentUser.role === Role.COMPANY_USER || currentUser.role === Role.PROJECT_USER}
          />
        </div>

        {/* SUMMARY STATS */}
        <ReportsStats stats={stats} isAr={isAr} />

        {/* PREMIUM ANALYTICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">

          {/* Main Trend Chart - Takes 8 columns */}
          <div className="lg:col-span-8 min-h-[450px]">
            <VolumeTrendChart trendData={trendData} isAr={isAr} />
          </div>

          {/* Status Breakdown - Takes 4 columns */}
          <div className="lg:col-span-4 min-h-[450px]">
            <StatusDistributionChart data={statusDistribution} isAr={isAr} />
          </div>

          {/* Productivity & Map Row */}
          <div className="lg:col-span-4 min-h-[400px]">
            <TopProjectsChart data={topProjectsData} isAr={isAr} />
          </div>
          <div className="lg:col-span-3 min-h-[400px]">
            <LogisticsMap activeProjectsCount={availableProjects.length} isAr={isAr} darkMode={darkMode} />
          </div>
          <div className="lg:col-span-5 min-h-[400px]">
            <PeakHoursChart peakHours={peakHours} isAr={isAr} />
          </div>

          {/* Assets & Growth Row */}
          <div className="lg:col-span-4 min-h-[400px]">
            <ServiceMixChart serviceMix={serviceMix} isAr={isAr} />
          </div>
          <div className="lg:col-span-4 min-h-[400px]">
            <VehicleUtilizationChart data={vehicleUtilization} isAr={isAr} />
          </div>
          <div className="lg:col-span-4 min-h-[400px]">
            <MonthlyTonnageChart data={monthlyTonnage} isAr={isAr} />
          </div>

          {/* Personnel Row */}
          <div className="lg:col-span-12">
            <TopDriversList topDrivers={topDrivers} isAr={isAr} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Reports;



