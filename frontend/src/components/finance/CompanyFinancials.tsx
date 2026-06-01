import React, { useState, useMemo } from 'react';
import {
    Building2, Scale, Truck, ChevronDown, Briefcase, Calendar, AlertCircle,
    Wallet, TrendingDown, AlertTriangle, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, StatCard, EmptyState } from '@/components';
import { formatNumber, formatCurrency } from '@/utils/helpers';
import { ProjectService } from '@/types';

interface ServiceAlert {
    companyName: string;
    projectName: string;
    projectId: string;
    serviceName: string;
    serviceId: string;
    actualTrips: number;
    contractedTrips: number;
    warningThreshold: number;
    unitPrice: number;
    level: 'WARNING' | 'CRITICAL' | 'EXCEEDED';
}

interface CompanyFinancialsProps {
    accountantData: any[];
    projectServices: ProjectService[];
    isAr: boolean;
    resetFilters: () => void;
}

const CompanyFinancials: React.FC<CompanyFinancialsProps> = ({ accountantData, projectServices, isAr, resetFilters }) => {
    const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);

    const toggleCompany = (id: string) => {
        setExpandedCompanies(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // Build a lookup map: project_id+service_id → ProjectService
    const psLookup = useMemo(() => {
        const map: Record<string, ProjectService> = {};
        (projectServices || []).forEach(ps => {
            map[`${ps.project_id}::${ps.service_id}`] = ps;
        });
        return map;
    }, [projectServices]);

    // Compute all service consumption alerts across all companies/projects
    const alerts = useMemo<ServiceAlert[]>(() => {
        const result: ServiceAlert[] = [];
        accountantData.forEach((company: any) => {
            Object.values(company.projects).forEach((proj: any) => {
                Object.values(proj.services).forEach((svc: any) => {
                    const key = `${proj.info.project_id}::${svc.info?.service_id}`;
                    const ps = psLookup[key];
                    if (!ps) return;

                    const actual = svc.trips || 0;
                    const contracted = ps.quantity || 0;
                    const threshold = ps.warning_threshold || 0;

                    if (contracted <= 0) return;

                    let level: ServiceAlert['level'] | null = null;
                    if (actual >= contracted) level = 'EXCEEDED';
                    else if (contracted > 0 && actual >= contracted * 0.9) level = 'CRITICAL';
                    else if (threshold > 0 && actual >= threshold) level = 'WARNING';

                    if (level) {
                        result.push({
                            companyName: company.info.company_name,
                            projectName: proj.info.project_name,
                            projectId: proj.info.project_id,
                            serviceName: svc.info?.service_name || 'Service',
                            serviceId: svc.info?.service_id || '',
                            actualTrips: actual,
                            contractedTrips: contracted,
                            warningThreshold: threshold,
                            unitPrice: ps.unit_price || 0,
                            level
                        });
                    }
                });
            });
        });
        // Sort: EXCEEDED first, then CRITICAL, then WARNING
        const order = { EXCEEDED: 0, CRITICAL: 1, WARNING: 2 };
        result.sort((a, b) => order[a.level] - order[b.level]);
        return result;
    }, [accountantData, psLookup]);

    const getProjectTimeline = (project: any) => {
        const today = new Date();
        const startDate = project.start_date ? new Date(project.start_date) : null;
        const endDate = project.end_date ? new Date(project.end_date) : null;

        if (!startDate || !endDate) {
            return { durationDays: null, daysRemaining: null, status: 'NO_DATES', isOverdue: false };
        }

        const durationMs = endDate.getTime() - startDate.getTime();
        const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
        const remainingMs = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        const isOverdue = daysRemaining < 0;
        const status = isOverdue ? 'OVERDUE' : daysRemaining <= 7 ? 'URGENT' : 'ACTIVE';

        return { durationDays, daysRemaining, status, isOverdue };
    };

    const getAlertStyle = (level: ServiceAlert['level']) => {
        switch (level) {
            case 'EXCEEDED': return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', icon: 'text-red-600', badge: 'bg-red-600' };
            case 'CRITICAL': return { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400', icon: 'text-orange-600', badge: 'bg-orange-500' };
            case 'WARNING': return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-600', badge: 'bg-amber-500' };
        }
    };

    const getAlertLabel = (level: ServiceAlert['level']) => {
        switch (level) {
            case 'EXCEEDED': return isAr ? 'تجاوز الحد' : 'EXCEEDED';
            case 'CRITICAL': return isAr ? 'حرج' : 'CRITICAL';
            case 'WARNING': return isAr ? 'تنبيه' : 'WARNING';
        }
    };

    // Helper to get consumption info for a service row
    const getConsumption = (projectId: string, serviceId: string, actualTrips: number) => {
        const ps = psLookup[`${projectId}::${serviceId}`];
        if (!ps || !ps.quantity) return null;
        const contracted = ps.quantity;
        const pct = Math.min((actualTrips / contracted) * 100, 100);
        const exceeded = actualTrips >= contracted;
        const threshold = ps.warning_threshold || 0;
        const atThreshold = threshold > 0 && actualTrips >= threshold;
        const critical = contracted > 0 && actualTrips >= contracted * 0.9;
        return { contracted, pct, exceeded, threshold, atThreshold, critical, unitPrice: ps.unit_price || 0 };
    };

    return (
        <motion.div
            key="companies"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
        >
            {/* PERSISTENT WARNING ALERTS BANNER */}
            {alerts.length > 0 && (
                <Card className="p-0 overflow-hidden border-2 border-amber-300 dark:border-amber-700">
                    <div className="px-8 py-5 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldAlert size={24} className="text-amber-600" />
                            <div>
                                <h3 className="font-bold text-amber-800 dark:text-amber-300 text-lg tracking-tight">
                                    {isAr ? 'تنبيهات استهلاك الخدمات' : 'Service Consumption Alerts'}
                                </h3>
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                    {isAr
                                        ? `${alerts.length} خدمة تقترب أو تجاوزت الحد المتعاقد عليه`
                                        : `${alerts.length} service(s) approaching or exceeding contracted limits`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {alerts.filter(a => a.level === 'EXCEEDED').length > 0 && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white bg-red-600">
                                    {alerts.filter(a => a.level === 'EXCEEDED').length} {isAr ? 'تجاوز' : 'exceeded'}
                                </span>
                            )}
                            {alerts.filter(a => a.level === 'CRITICAL').length > 0 && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white bg-orange-500">
                                    {alerts.filter(a => a.level === 'CRITICAL').length} {isAr ? 'حرج' : 'critical'}
                                </span>
                            )}
                            {alerts.filter(a => a.level === 'WARNING').length > 0 && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white bg-amber-500">
                                    {alerts.filter(a => a.level === 'WARNING').length} {isAr ? 'تنبيه' : 'warning'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="divide-y divide-amber-100 dark:divide-amber-900/30 max-h-[400px] overflow-y-auto">
                        {alerts.map((alert, idx) => {
                            const style = getAlertStyle(alert.level);
                            const pct = alert.contractedTrips > 0 ? Math.min((alert.actualTrips / alert.contractedTrips) * 100, 120) : 0;
                            return (
                                <div key={idx} className={`px-8 py-4 ${style.bg} flex flex-col md:flex-row md:items-center gap-4 md:gap-8`}>
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <AlertTriangle size={18} className={style.icon} />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold text-white ${style.badge}`}>
                                                    {getAlertLabel(alert.level)}
                                                </span>
                                                <span className="font-bold text-sm text-text-main truncate">{alert.serviceName}</span>
                                            </div>
                                            <p className="text-[10px] text-text-subtle mt-0.5 truncate">
                                                {alert.companyName} &middot; {alert.projectName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 flex-shrink-0">
                                        <div className="text-center">
                                            <p className="text-[9px] font-bold text-text-subtle uppercase">{isAr ? 'الفعلي' : 'Actual'}</p>
                                            <p className={`text-lg font-bold ${alert.level === 'EXCEEDED' ? 'text-red-600' : alert.level === 'CRITICAL' ? 'text-orange-600' : 'text-amber-600'}`}>
                                                {alert.actualTrips}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-bold text-text-subtle uppercase">{isAr ? 'المتعاقد' : 'Contract'}</p>
                                            <p className="text-lg font-bold text-text-main">{alert.contractedTrips}</p>
                                        </div>
                                        <div className="w-32 hidden md:block">
                                            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${alert.level === 'EXCEEDED' ? 'bg-red-500' : alert.level === 'CRITICAL' ? 'bg-orange-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] font-bold text-text-subtle text-center mt-1">{Math.round(pct)}%</p>
                                        </div>
                                        {alert.unitPrice > 0 && (
                                            <div className="text-center hidden lg:block">
                                                <p className="text-[9px] font-bold text-text-subtle uppercase">{isAr ? 'سعر الرحلة' : 'Trip Price'}</p>
                                                <p className="text-sm font-bold text-purple-600">{formatCurrency(alert.unitPrice)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* COMPANIES STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title={isAr ? 'إجمالي الكمية (مفلترة)' : 'Net Quantity (Filtered)'}
                    value={formatNumber(accountantData.reduce((acc: any, c: any) => acc + (c.totalQty || 0), 0) as number)}
                    unit={isAr ? 'وحدة' : 'Qty'}
                    icon={Scale}
                    variant="primary"
                />
                <StatCard
                    title={isAr ? 'عدد الردود (مفلترة)' : 'Total Volume (Filtered)'}
                    value={formatNumber(accountantData.reduce((acc: any, c: any) => acc + (c.totalTrips || 0), 0) as number)}
                    unit={isAr ? 'رد' : 'Trips'}
                    icon={Truck}
                    variant="blue"
                />
                <StatCard
                    title={isAr ? 'العملاء النشطون (مفلترة)' : 'Active Portfolios (Filtered)'}
                    value={formatNumber(accountantData.length)}
                    icon={Building2}
                    variant="purple"
                />
            </div>

            {/* COMPANIES LIST */}
            {accountantData.map((company: any) => (
                <Card key={company.info.company_id} className="overflow-hidden p-0">
                    <div onClick={() => toggleCompany(company.info.company_id)} className="p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 cursor-pointer group hover:bg-surface-subtle transition-colors">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-surface-subtle rounded-xl flex items-center justify-center text-text-subtle group-hover:bg-purple-600 group-hover:text-white transition-all duration-500">
                                {company.info.logo_url ? <img src={company.info.logo_url} className="w-12 h-12 object-contain" alt="" /> : <Building2 size={36} />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-text-main group-hover:text-purple-600 transition-colors tracking-tight">{company.info.company_name}</h3>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[9px] font-bold bg-surface-subtle px-3 py-1.5 rounded-full text-text-subtle uppercase tracking-widest border border-border">Reg: {company.info.commercial_reg || 'N/A'}</span>
                                    <span className="text-[9px] font-bold bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-full text-purple-600 uppercase tracking-widest border border-purple-100 dark:border-purple-800/50">{Object.keys(company.projects).length} {isAr ? 'مشاريع' : 'Projects'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-10">
                            <div className="text-right hidden md:block">
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'إجمالي الكمية' : 'Net Metric'} </p>
                                <p className="text-3xl font-bold text-primary-600 tracking-tight">{formatNumber(company.totalQty)}</p>
                            </div>
                            <ChevronDown className={`text-text-subtle transition-transform duration-300 ${expandedCompanies.includes(company.info.company_id) ? 'rotate-180 text-purple-500' : ''}`} />
                        </div>
                    </div>

                    <AnimatePresence>
                        {expandedCompanies.includes(company.info.company_id) && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-surface-subtle border-t border-border">
                                <div className="p-8 md:p-10 space-y-8">
                                    {Object.values(company.projects).map((proj: any) => {
                                        const timeline = getProjectTimeline(proj.info);
                                        const hasMissingData = !proj.info.budget || !proj.info.start_date || !proj.info.end_date;

                                        return (
                                            <Card key={proj.info.project_id} className="p-8 md:p-10 shadow-sm">
                                                <div className="space-y-6 mb-8">
                                                    {/* Project Header with Timeline */}
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-xl flex items-center gap-3 tracking-tight mb-2">
                                                                    <Briefcase size={24} className="text-blue-500" />
                                                                    {proj.info.project_name}
                                                                </h4>

                                                                {/* Timeline Info */}
                                                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                                                    {timeline.status !== 'NO_DATES' ? (
                                                                        <>
                                                                            <div className="flex items-center gap-2 text-xs bg-surface-subtle px-3 py-1.5 rounded-full">
                                                                                <Calendar size={12} className="text-text-subtle" />
                                                                                <span className="font-bold text-text-subtle">
                                                                                    {isAr ? 'المدة:' : 'Duration:'} {timeline.durationDays} {isAr ? 'يوم' : 'days'}
                                                                                </span>
                                                                            </div>

                                                                            {timeline.isOverdue ? (
                                                                                <div className="flex items-center gap-2 text-xs bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800">
                                                                                    <AlertCircle size={12} className="text-red-600" />
                                                                                    <span className="font-bold text-red-600">
                                                                                        {isAr ? 'متأخر' : 'OVERDUE'} ({Math.abs(timeline.daysRemaining!)} {isAr ? 'يوم' : 'days'})
                                                                                    </span>
                                                                                </div>
                                                                            ) : timeline.status === 'URGENT' ? (
                                                                                <div className="flex items-center gap-2 text-xs bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800">
                                                                                    <AlertCircle size={12} className="text-amber-600" />
                                                                                    <span className="font-bold text-amber-600">
                                                                                        {isAr ? 'باقي' : 'Remaining:'} {timeline.daysRemaining} {isAr ? 'يوم' : 'days'}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2 text-xs bg-primary-600 px-3 py-1.5 rounded-full text-white">
                                                                                    <span className="font-bold text-white">
                                                                                        {isAr ? 'باقي' : 'Remaining:'} {timeline.daysRemaining} {isAr ? 'يوم' : 'days'}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 text-xs bg-surface-subtle px-3 py-1.5 rounded-full border border-border">
                                                                            <AlertCircle size={12} className="text-text-subtle" />
                                                                            <span className="font-bold text-text-subtle">
                                                                                {isAr ? 'لا توجد تواريخ' : 'No dates set'}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {hasMissingData && (
                                                                        <div className="flex items-center gap-2 text-xs bg-rose-100 dark:bg-rose-900/30 px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-800">
                                                                            <AlertCircle size={12} className="text-rose-600" />
                                                                            <span className="font-bold text-rose-600">
                                                                                {isAr ? 'بيانات ناقصة' : 'MISSING DATA'}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Quick Stats */}
                                                            <div className="flex flex-wrap gap-4 md:gap-6">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[9px] font-bold uppercase text-text-subtle mb-1">{isAr ? 'أطنان الموقع' : 'Project Tons'}</span>
                                                                    <span className="text-lg font-bold text-primary-600">{formatNumber(proj.totalQty || 0)}t</span>
                                                                </div>
                                                                <div className="flex flex-col items-end border-l border-border pl-4">
                                                                    <span className="text-[9px] font-bold uppercase text-text-subtle mb-1">{isAr ? 'الردود' : 'Trips'}</span>
                                                                    <span className="text-lg font-bold text-blue-600">{formatNumber(proj.totalTrips || 0)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Financial Progress */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <StatCard title={isAr ? 'الميزانية' : 'Budget'} value={proj.info.budget ? formatCurrency(proj.info.budget) : (isAr ? 'غير محدد' : 'Not Set')} variant="blue" className="p-4 rounded-2xl" icon={Wallet} />
                                                        <StatCard title={isAr ? 'المصروف' : 'Spent'} value={formatCurrency(proj.spent || 0)} variant="rose" className="p-4 rounded-2xl" icon={TrendingDown} />
                                                        <StatCard title={isAr ? 'المتبقي' : 'Remaining'} value={formatCurrency((proj.info?.budget || 0) - (proj.spent || 0))} variant="primary" className="p-4 rounded-2xl" icon={Wallet} />
                                                    </div>
                                                </div>

                                                {/* Enhanced Services Table with Consumption Tracking */}
                                                <div className="space-y-3">
                                                    {Object.values(proj.services).map((svc: any) => {
                                                        const consumption = getConsumption(proj.info.project_id, svc.info?.service_id, svc.trips || 0);
                                                        const barColor = consumption
                                                            ? consumption.exceeded ? 'bg-red-500' : consumption.critical ? 'bg-orange-500' : consumption.atThreshold ? 'bg-amber-500' : 'bg-emerald-500'
                                                            : 'bg-gray-300';
                                                        const statusIcon = consumption
                                                            ? consumption.exceeded ? <AlertTriangle size={14} className="text-red-500" /> : consumption.critical ? <AlertTriangle size={14} className="text-orange-500" /> : consumption.atThreshold ? <AlertTriangle size={14} className="text-amber-500" /> : <CheckCircle2 size={14} className="text-emerald-500" />
                                                            : null;

                                                        return (
                                                            <div key={svc.info?.service_id || Math.random()} className={`p-5 rounded-2xl border transition-all ${consumption?.exceeded ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : consumption?.critical ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' : consumption?.atThreshold ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-surface-subtle border-border'}`}>
                                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                    {/* Service Name + Status */}
                                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                        {statusIcon}
                                                                        <div className="min-w-0">
                                                                            <span className="font-bold text-text-main text-sm">{svc.info?.service_name || 'Generic Service'}</span>
                                                                            <span className="text-[9px] font-bold text-text-subtle ml-2">ID: {svc.info?.service_id || 'N/A'}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Metrics Row */}
                                                                    <div className="flex items-center gap-5 flex-wrap">
                                                                        {/* Actual Trips */}
                                                                        <div className="text-center">
                                                                            <p className="text-[8px] font-bold text-text-subtle uppercase tracking-wider">{isAr ? 'الرحلات الفعلية' : 'Actual Trips'}</p>
                                                                            <p className="text-lg font-bold text-blue-600">{svc.trips || 0}</p>
                                                                        </div>

                                                                        {/* Contracted Trips */}
                                                                        {consumption && (
                                                                            <div className="text-center">
                                                                                <p className="text-[8px] font-bold text-text-subtle uppercase tracking-wider">{isAr ? 'المتعاقد' : 'Contracted'}</p>
                                                                                <p className="text-lg font-bold text-text-main">{consumption.contracted}</p>
                                                                            </div>
                                                                        )}

                                                                        {/* Quantity */}
                                                                        <div className="text-center">
                                                                            <p className="text-[8px] font-bold text-text-subtle uppercase tracking-wider">{isAr ? 'الكمية' : 'Quantity'}</p>
                                                                            <p className="text-lg font-bold text-primary-600">{formatNumber(svc.qty)} {svc.unit}</p>
                                                                        </div>

                                                                        {/* Unit Price */}
                                                                        {consumption && consumption.unitPrice > 0 && (
                                                                            <div className="text-center">
                                                                                <p className="text-[8px] font-bold text-text-subtle uppercase tracking-wider">{isAr ? 'سعر الرحلة' : 'Trip Price'}</p>
                                                                                <p className="text-sm font-bold text-purple-600">{formatCurrency(consumption.unitPrice)}</p>
                                                                            </div>
                                                                        )}

                                                                        {/* Cost */}
                                                                        <div className="text-center">
                                                                            <p className="text-[8px] font-bold text-text-subtle uppercase tracking-wider">{isAr ? 'التكلفة' : 'Cost'}</p>
                                                                            <p className="text-lg font-bold text-purple-600">{formatCurrency(svc.cost)}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Consumption Progress Bar */}
                                                                {consumption && (
                                                                    <div className="mt-3">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-[9px] font-bold text-text-subtle">
                                                                                {isAr ? 'الاستهلاك' : 'Consumption'}: {svc.trips || 0} / {consumption.contracted} {isAr ? 'رحلة' : 'trips'}
                                                                            </span>
                                                                            <span className={`text-[9px] font-bold ${consumption.exceeded ? 'text-red-600' : consumption.critical ? 'text-orange-600' : consumption.atThreshold ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                                                {Math.round(consumption.pct)}%
                                                                            </span>
                                                                        </div>
                                                                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                                                                            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${consumption.pct}%` }} />
                                                                            {consumption.threshold > 0 && consumption.threshold < consumption.contracted && (
                                                                                <div
                                                                                    className="absolute top-0 h-full w-0.5 bg-amber-600"
                                                                                    style={{ left: `${(consumption.threshold / consumption.contracted) * 100}%` }}
                                                                                    title={isAr ? `حد التنبيه: ${consumption.threshold}` : `Warning threshold: ${consumption.threshold}`}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        {consumption.threshold > 0 && (
                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                <AlertTriangle size={10} className="text-amber-500" />
                                                                                <span className="text-[8px] font-bold text-amber-600">
                                                                                    {isAr ? `حد التنبيه: ${consumption.threshold} رحلة` : `Alert threshold: ${consumption.threshold} trips`}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            ))}

            {accountantData.length === 0 && (
                <EmptyState
                    title={isAr ? 'لم يتم العثور على بيانات' : 'No Financial Data Matches'}
                    description={isAr ? 'لم يتم العثور على بيانات تطابق هذه الفلاتر' : 'No financial data matches your current criteria.'}
                    action={{ label: isAr ? 'إعادة تعيين الكل' : 'Clear all filters', onClick: resetFilters }}
                />
            )}
        </motion.div>
    );
};

export default CompanyFinancials;
