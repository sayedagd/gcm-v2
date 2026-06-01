import React, { useState, useMemo } from 'react';
import { useStore } from '@/context';
import {
  Calculator, RotateCcw, Download
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import {
  FinanceStats, FinanceFilters, CompanyFinancials, SupplierFinancials
} from '@/components';
import { exportToCSV } from '@/utils/csvUtils';
import { calculateAccountantStats } from '@/utils/accountant_utils';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { subMonths, format } from 'date-fns';

const AccountantPortal: React.FC = () => {
  const { trips, projects, companies, services, saasConfig, exportEnabled, suppliers, vehicles, containers, tanks, drivers, projectServices } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<string>('ALL');

  // Tabs State
  const [activeTab, setActiveTab] = useState<'COMPANIES' | 'SUPPLIERS'>('COMPANIES');

  const { serviceMap } = useLookupMaps();
  const isAr = saasConfig.language === 'ar';

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
    setSelectedStatus('ALL');
    setSelectedService('ALL');
  };

  // --- Global Stats Calculation ---
  const stats = useMemo(() => {
    const today = new Date();
    const currentMonthStr = format(today, 'yyyy-MM');
    const lastMonthStr = format(subMonths(today, 1), 'yyyy-MM');

    let countAllTime = 0;
    let countThisMonth = 0;
    let chartData: any[] = [];
    let trend = 0;
    let topServices: any[] = [];
    let maxCount = 1;

    try {
      countAllTime = trips?.length || 0;
      countThisMonth = trips?.filter(t => t.date && t.date.startsWith(currentMonthStr))?.length || 0;
      const countLastMonth = trips?.filter(t => t.date && t.date.startsWith(lastMonthStr))?.length || 0;

      if (countLastMonth > 0) trend = Math.round(((countThisMonth - countLastMonth) / countLastMonth) * 100);
      else if (countThisMonth > 0) trend = 100;

      chartData = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(today, 5 - i);
        try {
          const mStr = format(d, 'yyyy-MM');
          const count = trips?.filter(t => t.date && t.date.startsWith(mStr))?.length || 0;
          return { month: mStr, count, label: format(d, 'MMM') };
        } catch (e) {
          return { month: '', count: 0, label: '' };
        }
      });

      maxCount = Math.max(...chartData.map(d => d.count)) || 1;

      const serviceStats: Record<string, number> = {};
      (trips || []).forEach(t => {
        if (t.service_id) serviceStats[t.service_id] = (serviceStats[t.service_id] || 0) + 1;
      });
      topServices = Object.entries(serviceStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([id, count]) => {
          const s = serviceMap[id];
          return { name: s?.service_name || id, count };
        });
    } catch (err) {
      console.error("Error calculating stats:", err);
    }

    return { countAllTime, countThisMonth, trend, chartData, maxCount, topServices };
  }, [trips, services]);

  // --- Filtered Data ---
  const accountantData = useMemo(() => {
    return calculateAccountantStats(trips, projects, companies, services, {
      searchTerm,
      dateRange,
      selectedStatus,
      selectedService
    });
  }, [trips, projects, companies, services, searchTerm, dateRange, selectedStatus, selectedService]);

  const handleExportFullReport = () => {
    const headers = [
      isAr ? 'الشركة' : 'Company',
      isAr ? 'المشروع' : 'Project',
      isAr ? 'الخدمة' : 'Service',
      isAr ? 'الكمية' : 'Quantity',
      isAr ? 'الوحدة' : 'Unit',
      isAr ? 'الردود' : 'Trip Count'
    ];
    const rows: any[] = [];
    accountantData.forEach((comp: any) => {
      Object.values(comp.projects).forEach((proj: any) => {
        Object.values(proj.services).forEach((svc: any) => {
          rows.push([comp.info.company_name, proj.info.project_name, svc.info?.service_name || 'N/A', svc.qty.toFixed(2), svc.unit, svc.trips]);
        });
      });
    });

    exportToCSV(`GCM_Finance_Data`, headers, rows, (row: any) => row);
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-40 px-4 md:px-8">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pt-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold flex items-center gap-4 tracking-tight text-text-main">
            <Calculator className="text-purple-600" size={48} /> {isAr ? 'المحاسبة' : 'Accounting'}
          </h1>
          <p className="text-text-subtle font-bold text-lg mt-1">{isAr ? 'تحليل شامل للعمليات والردود الميدانية' : 'Granular analysis of operations and field trips.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={RotateCcw} onClick={resetFilters} title={isAr ? 'إعادة ضبط' : 'Reset Filters'} className="p-4" />
          {exportEnabled && (
            <Button
              variant="primary"
              icon={Download}
              onClick={handleExportFullReport}
              className="px-8 py-4 text-xs"
            >
              {isAr ? 'تصدير البيانات المفلترة' : 'Export Filtered Data'}
            </Button>
          )}
        </div>
      </div>

      {/* TOP ANALYTICS (GLOBAL) */}
      <FinanceStats stats={stats} isAr={isAr} />

      {/* TABS SWITCHER */}
      <div className="flex p-1 bg-surface-subtle rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('COMPANIES')}
          className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'COMPANIES' ? 'bg-surface shadow-md text-text-main' : 'text-text-subtle hover:text-text-main'}`}
        >
          {isAr ? 'العملاء والمشاريع' : 'Customers & Projects'}
        </button>
        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'SUPPLIERS' ? 'bg-surface shadow-md text-text-main' : 'text-text-subtle hover:text-text-main'}`}
        >
          {isAr ? 'الموردين والأصول' : 'Suppliers & Assets'}
        </button>
      </div>

      {/* FILTER SEARCH BAR */}
      <FinanceFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedService={selectedService}
        setSelectedService={setSelectedService}
        services={services}
        isAr={isAr}
      />

      <AnimatePresence mode="wait">
        {activeTab === 'COMPANIES' && (
          <CompanyFinancials
            key="companies"
            accountantData={accountantData}
            projectServices={projectServices}
            isAr={isAr}
            resetFilters={resetFilters}
          />
        )}

        {activeTab === 'SUPPLIERS' && (
          <SupplierFinancials
            key="suppliers"
            suppliers={suppliers}
            vehicles={vehicles}
            containers={containers}
            tanks={tanks}
            drivers={drivers}
            trips={trips}
            projects={projects}
            services={services}
            isAr={isAr}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountantPortal;

