"use client";

import React, { useMemo, useState } from 'react';
import { useStore } from '@/context';
import {
    PieChart as PieChartIcon,
    Bot, FileText, Download, Calendar,
    Building2, Briefcase, Box, Truck, HardHat
} from 'lucide-react';
import {
    DashboardStats, DashboardCharts, DashboardActionItems, Button, SmartDropdown, ServiceTripStats, DrilldownSelection, Card
} from '@/components';
import TripWizard from '@/components/trips/TripWizard';
import ExportSelectionModal, { ExportOptions } from '@/components/reports/ExportSelectionModal';
import { useTranslation } from '@/hooks/useTranslation';
import { subDays, format, startOfDay, endOfDay, startOfWeek, startOfMonth, parseISO, isWithinInterval, subMonths, isSameMonth } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { Trip, TripStatus, Role } from '@/types';
import { generateAIContext, generateBulkPdf, generateExcelReport, copyAIPrompt } from '@/utils/exportHelpers';
import { useLookupMaps } from '@/hooks/useLookupMaps';

const ReportsDashboard: React.FC = () => {
    const { trips, projects, saasConfig, drivers, vehicles, services, companies, suppliers, facilities, projectServices, currentUser, addNotification } = useStore();
    const { t, isAr } = useTranslation();
    const { projectMap, vehicleMap, serviceMap } = useLookupMaps();

    // Timeframe State
    const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM'>('MONTH');
    const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Entity Filter State
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [selectedVehicleType, setSelectedVehicleType] = useState<string | null>(null);
    const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
    const [selectedSubcontractor, setSelectedSubcontractor] = useState<string | null>(null);
    const [selectedFacility, setSelectedFacility] = useState<string | null>(null);

    // Export Selection State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // Wizard State
    const [wizardOpen, setWizardOpen] = useState(false);
    const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
    const [initialStep, setInitialStep] = useState(1);
    const [initialWarnings, setInitialWarnings] = useState<string[]>([]);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const isRestricted = [Role.COMPANY_USER, Role.PROJECT_USER, Role.CLIENT].includes(currentUser.role);

    // --- RBAC Filtering ---
    const { visibleTrips, visibleProjects, visibleCompanies } = useMemo(() => {
        let vTrips = trips;
        let vProjects = projects;
        let vCompanies = companies;

        if (currentUser.role === Role.COMPANY_USER) {
            vCompanies = companies.filter(comp => comp.company_id === currentUser.company_id);
            vProjects = projects.filter(p => p.company_id === currentUser.company_id);
            const pIds = new Set(vProjects.map(p => p.project_id));
            vTrips = trips.filter(t => pIds.has(t.project_id));
        } else if (currentUser.role === Role.PROJECT_USER) {
            vProjects = projects.filter(proj => proj.project_id === currentUser.project_id);
            vCompanies = companies.filter(c => c.company_id === vProjects[0]?.company_id);
            vTrips = trips.filter(t => t.project_id === currentUser.project_id);
        }

        return { visibleTrips: vTrips || [], visibleProjects: vProjects || [], visibleCompanies: vCompanies || [] };
    }, [currentUser, trips, projects, companies]);

    // Set initial filters for restricted users
    React.useEffect(() => {
        if (currentUser.role === Role.COMPANY_USER && currentUser.company_id) {
            setSelectedCompany(currentUser.company_id);
        } else if (currentUser.role === Role.PROJECT_USER && currentUser.project_id) {
            const proj = projectMap[currentUser.project_id!];
            if (proj) {
                setSelectedCompany(proj.company_id);
                setSelectedProject(proj.project_id);
            }
        }
    }, [currentUser, projects]);

    // --- Derived Data ---
    const availableProjects = useMemo(() =>
        selectedCompany ? visibleProjects.filter(p => p.company_id === selectedCompany) : visibleProjects
        , [visibleProjects, selectedCompany]);
    const availableServices = useMemo(() => {
        let relevantTrips = visibleTrips;
        if (selectedCompany) {
            relevantTrips = relevantTrips.filter(t => {
                const p = projectMap[t.project_id];
                return p?.company_id === selectedCompany;
            });
        }
        if (selectedProject) {
            relevantTrips = relevantTrips.filter(t => t.project_id === selectedProject);
        }
        const tripServiceIds = new Set(relevantTrips.map(t => t.service_id));
        return services.filter(s => tripServiceIds.has(s.service_id));
    }, [services, selectedProject, selectedCompany, visibleTrips, projects]);

    // --- Filtering Logic ---
    const filteredTrips = useMemo(() => {
        const now = new Date();
        let startDate = new Date(0); let endDate = now;

        if (timeRange === 'TODAY') { startDate = startOfDay(now); endDate = endOfDay(now); }
        if (timeRange === 'WEEK') { startDate = startOfWeek(now); endDate = endOfDay(now); }
        if (timeRange === 'MONTH') { startDate = startOfMonth(now); endDate = endOfDay(now); }
        if (timeRange === 'QUARTER') {
            const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            startDate = qStart;
            endDate = endOfDay(now);
        }
        if (timeRange === 'YEAR') { startDate = new Date(now.getFullYear(), 0, 1); endDate = endOfDay(now); }
        if (timeRange === 'CUSTOM') { startDate = parseISO(customStart); endDate = endOfDay(parseISO(customEnd)); }

        return visibleTrips.filter(t => {
            const matchesTime = isWithinInterval(parseISO(t.date), { start: startOfDay(startDate), end: endOfDay(endDate) });
            const project = projectMap[t.project_id];
            const vehicle = vehicleMap[t.vehicle_id];

            const matchesCompany = !selectedCompany || project?.company_id === selectedCompany;
            const matchesProject = !selectedProject || t.project_id === selectedProject;
            const matchesService = !selectedService || t.service_id === selectedService;
            const matchesVehicle = !selectedVehicleType || t.vehicle_id === selectedVehicleType;
            const matchesDriver = !selectedDriver || t.driver_id === selectedDriver;
            const matchesSubcontractor = !selectedSubcontractor || t.subcontractor_id === selectedSubcontractor || t.supplier_id === selectedSubcontractor;
            const matchesFacility = !selectedFacility || t.facility_id === selectedFacility;

            return matchesTime && matchesCompany && matchesProject && matchesService && matchesVehicle && matchesDriver && matchesSubcontractor && matchesFacility;
        });
    }, [visibleTrips, timeRange, customStart, customEnd, selectedCompany, selectedProject, selectedService, selectedVehicleType, selectedDriver, selectedSubcontractor, selectedFacility, projectMap, vehicleMap]);

    const handleAction = (trip: Trip, step: number, warnings: string[]) => {
        setTripToEdit(trip);
        setInitialStep(step);
        setInitialWarnings(warnings);
        setWizardOpen(true);
    };

    const handleCopyPrompt = async () => {
        await copyAIPrompt(filteredTrips, isAr);
    };

    const handlePdfExportRequest = () => {
        setIsExportModalOpen(true);
    };

    const handleFinalPdfExport = async (options: ExportOptions) => {
        setIsGeneratingPdf(true);
        try {
            await generateBulkPdf(filteredTrips, projects, drivers, vehicles, services, companies, suppliers, facilities, isAr, options, saasConfig?.templateConfig);
            setIsExportModalOpen(false);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const actionableTrips = useMemo(() => {
        return visibleTrips.filter(t => {
            const project = projectMap[t.project_id];
            const vehicle = vehicleMap[t.vehicle_id];

            const matchesCompany = !selectedCompany || project?.company_id === selectedCompany;
            const matchesProject = !selectedProject || t.project_id === selectedProject;
            const matchesService = !selectedService || t.service_id === selectedService;
            const matchesVehicleType = !selectedVehicleType || vehicle?.vehicle_type === selectedVehicleType;
            const matchesDriver = !selectedDriver || t.driver_id === selectedDriver;

            const isPendingAction = t.status === TripStatus.PENDING_REVIEW || t.status === TripStatus.PENDING_DOCS;

            return isPendingAction && matchesCompany && matchesProject && matchesService && matchesVehicleType && matchesDriver;
        });
    }, [trips, selectedCompany, selectedProject, selectedService, selectedVehicleType, selectedDriver, projectMap, vehicleMap]);

    const stats = useMemo(() => {
        const pending = filteredTrips.filter(t => t.status === TripStatus.PENDING_REVIEW || t.status === TripStatus.PENDING_DOCS);
        const inProgress = filteredTrips.filter(t => t.status === TripStatus.IN_PROGRESS);
        const completed = filteredTrips.filter(t => t.status === TripStatus.COMPLETED);

        const getNormalizedVal = (t: Trip) => {
            const val = Number(t.quantity || 0);
            return t.unit === 'KG' ? val / 1000 : val;
        };

        const pendingReviewVolume = pending.reduce((acc, t) => acc + getNormalizedVal(t), 0);
        const totalVolume = filteredTrips.reduce((acc, t) => acc + getNormalizedVal(t), 0);
        const completedVolume = completed.reduce((acc, t) => acc + getNormalizedVal(t), 0);

        return {
            pendingCount: pending.length,
            inProgressCount: inProgress.length,
            completedCount: completed.length,
            totalTonnage: totalVolume,
            completedTonnage: completedVolume,
            pendingTonnage: pendingReviewVolume
        };
    }, [filteredTrips]);

    const chartData = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), 6 - i);
            const dateStr = format(d, 'yyyy-MM-dd');
            const dayTrips = filteredTrips.filter(t => t.date && t.date.startsWith(dateStr));
            return {
                date: format(d, 'dd MMM'),
                completed: dayTrips.filter(t => t.status === TripStatus.COMPLETED).length,
                pending: dayTrips.filter(t => t.status === TripStatus.PENDING_REVIEW).length
            };
        });
    }, [filteredTrips]);

    const statusDistData = useMemo(() => [
        { name: isAr ? 'مكتملة' : 'Completed', value: stats.completedCount, color: '#10b981' }, // Emerald-500
        { name: isAr ? 'قيد التنفيذ' : 'In Progress', value: stats.inProgressCount, color: '#3b82f6' }, // Blue-500
        { name: isAr ? 'معلقة' : 'Pending', value: stats.pendingCount, color: '#8b5cf6' }, // Violet-500
        { name: isAr ? 'ملغاة' : 'Cancelled', value: filteredTrips.filter(t => t.status === TripStatus.CANCELLED).length, color: '#ef4444' }, // Red-500
    ].filter(d => d.value > 0), [stats, filteredTrips, isAr]);

    const onReset = () => {
        setTimeRange('MONTH');
        setSelectedCompany(null);
        setSelectedProject(null);
        setSelectedService(null);
        setSelectedVehicleType(null);
        setSelectedDriver(null);
        setSelectedSubcontractor(null);
        setSelectedFacility(null);
    };

    // --- Simple Analytics Data Computation ---
    // 1. Service Breakdown
    const serviceMixData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredTrips.forEach(t => {
            const s = serviceMap[t.service_id];
            const name = isAr ? ((s as any)?.category_ar || (s as any)?.category || 'عام') : ((s as any)?.category || 'General');
            map[name] = (map[name] || 0) + 1;
        });
        return Object.entries(map).map(([name, trips]) => ({ name, trips })).sort((a, b) => b.trips - a.trips).slice(0, 5);
    }, [filteredTrips, services, isAr]);

    // 2. Monthly Trend (Using all visibleTrips for true historical trend)
    const monthlyTrendData = useMemo(() => {
        const lastSixMonths = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), i)).reverse();
        return lastSixMonths.map(m => {
            const monthLabel = format(m, 'MMM');
            const val = visibleTrips.filter(t => isSameMonth(parseISO(t.date), m)).length;
            return { month: monthLabel, trips: val };
        });
    }, [visibleTrips]);

    // 3. Weekly Trend (from filteredTrips)
    const weeklyTrendData = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), 6 - i);
            return {
                date: format(d, 'dd MMM'),
                trips: filteredTrips.filter(t => t.date && t.date.startsWith(format(d, 'yyyy-MM-dd'))).length,
            };
        });
    }, [filteredTrips]);

    return (
        <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto pb-40 px-4 md:px-8">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6 pt-4">
                <div className="flex flex-col gap-1 w-full xl:w-auto">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold flex items-center gap-3 tracking-tight text-text-main">
                        <PieChartIcon className="text-primary" size={36} /> {t('analytics.title')}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                        <div className="flex overflow-x-auto no-scrollbar p-1 bg-surface-subtle rounded-xl border border-border max-w-[calc(100vw-2rem)]">
                            {['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR', 'CUSTOM'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setTimeRange(r as any)}
                                    className={`shrink-0 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${timeRange === r ? 'bg-surface shadow-sm text-primary' : 'text-text-subtle hover:text-text-main'}`}
                                >
                                    {isAr ? (
                                        r === 'TODAY' ? t('analytics.timeRange.today') :
                                            r === 'WEEK' ? t('analytics.timeRange.week') :
                                                r === 'MONTH' ? t('analytics.timeRange.month') :
                                                    r === 'QUARTER' ? t('analytics.timeRange.quarter') :
                                                        r === 'YEAR' ? t('analytics.timeRange.year') : t('analytics.timeRange.custom')
                                    ) : r === 'QUARTER' ? 'QUARTER' : r}
                                </button>
                            ))}
                        </div>
                        {timeRange === 'CUSTOM' && (
                            <div className="flex items-center gap-2 bg-surface-subtle p-2 rounded-xl border border-border">
                                <Calendar size={14} className="text-text-subtle shrink-0" />
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none w-[100px]" />
                                <span className="text-border">/</span>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none w-[100px]" />
                            </div>
                        )}
                    </div>
                </div>
                {!isRestricted && (
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <Button
                            onClick={() => generateExcelReport(filteredTrips, projects, drivers, vehicles, services, companies)}
                            variant="primary"
                            size="md"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg shadow-emerald-500/20"
                            icon={Download}
                        >
                            {isAr ? 'ملخص إكسيل' : 'Excel Summary'}
                        </Button>
                        <Button
                            onClick={handleCopyPrompt}
                            variant="secondary"
                            size="md"
                            className="bg-indigo-100 text-indigo-600 border-none p-3 shadow-lg"
                            icon={Bot}
                        >
                            {t('analytics.export.prompt')}
                        </Button>
                        <Button
                            onClick={handlePdfExportRequest}
                            variant="primary"
                            size="md"
                            className="bg-danger hover:bg-danger-strong text-surface border-transparent shadow-lg shadow-danger/20"
                            icon={FileText}
                            isLoading={isGeneratingPdf}
                        >
                            {t('analytics.export.pdf')}
                        </Button>
                    </div>
                )}
                {isRestricted && (
                    <Button
                        onClick={handlePdfExportRequest}
                        variant="primary"
                        size="md"
                        className="bg-danger hover:bg-danger-strong text-surface border-transparent shadow-lg shadow-danger/20"
                        icon={FileText}
                        isLoading={isGeneratingPdf}
                    >
                        {t('analytics.export.pdf')}
                    </Button>
                )}
            </div>

            {/* QUICK FILTERS BAR */}
            <div className="bg-surface border border-border p-4 rounded-3xl shadow-sm flex flex-wrap items-center gap-4">
                <SmartDropdown
                    title={t('analytics.filters.company')}
                    icon={Building2}
                    data={visibleCompanies.map(c => ({ id: c.company_id, name: c.company_name }))}
                    selected={selectedCompany}
                    onSelect={setSelectedCompany}
                    isAr={isAr}
                    colorClass="purple"
                    disabled={isRestricted}
                />
                <SmartDropdown
                    title={t('analytics.filters.project')}
                    icon={Briefcase}
                    data={availableProjects.map(p => ({ id: p.project_id, name: p.project_name }))}
                    selected={selectedProject}
                    onSelect={setSelectedProject}
                    isAr={isAr}
                    colorClass="purple"
                    disabled={isRestricted || (!selectedCompany && visibleCompanies.length > 1)}
                />
                <SmartDropdown
                    title={t('analytics.filters.service')}
                    icon={Box}
                    data={availableServices.map(s => ({ id: s.service_id, name: s.service_name }))}
                    selected={selectedService}
                    onSelect={setSelectedService}
                    isAr={isAr}
                    colorClass="purple"
                />
                <div className="h-8 w-px bg-border mx-2 invisible md:visible" />
                <SmartDropdown
                    title={isAr ? 'مركبة الأسطول' : 'Vehicle Plate'}
                    icon={Truck}
                    data={vehicles.map(v => ({ id: v.vehicle_id, name: `${v.plate_no} (${v.vehicle_type})` }))}
                    selected={selectedVehicleType}
                    onSelect={setSelectedVehicleType}
                    isAr={isAr}
                    colorClass="emerald"
                    disabled={isRestricted}
                />
                <SmartDropdown
                    title={isAr ? 'الفريق' : 'Driver'}
                    icon={HardHat}
                    data={drivers.map(d => ({ id: d.driver_id, name: d.name }))}
                    selected={selectedDriver}
                    onSelect={setSelectedDriver}
                    isAr={isAr}
                    colorClass="emerald"
                    disabled={isRestricted}
                />
                <SmartDropdown
                    title={isAr ? 'المقاول' : 'Subcontractor'}
                    icon={Building2}
                    data={suppliers.map(s => ({ id: s.supplier_id, name: s.name }))}
                    selected={selectedSubcontractor}
                    onSelect={setSelectedSubcontractor}
                    isAr={isAr}
                    colorClass="blue"
                    disabled={isRestricted}
                />
                <SmartDropdown
                    title={isAr ? 'المرافق' : 'Facility'}
                    icon={Building2}
                    data={facilities.map(f => ({ id: f.facility_id, name: f.name }))}
                    selected={selectedFacility}
                    onSelect={setSelectedFacility}
                    isAr={isAr}
                    colorClass="blue"
                    disabled={isRestricted}
                />

                <Button onClick={onReset} variant="secondary" size="md" className="ml-auto text-text-subtle border-none p-2" disabled={isRestricted}>{t('analytics.filters.reset')}</Button>
            </div>

            {/* Simple Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6">
                <Card className="p-6 h-[260px] flex flex-col bg-surface/50 border border-border">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-text-subtle mb-4">{isAr ? 'مقارنة الرحلات حسب الخدمة' : 'Trips by Service'}</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={serviceMixData} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.05} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                <Bar dataKey="trips" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-6 h-[260px] flex flex-col bg-surface/50 border border-border">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-text-subtle mb-4">{isAr ? 'النمو الشهري للأعداد' : 'Monthly Trip Volume'}</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                <RechartsTooltip cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                <Bar dataKey="trips" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-6 h-[260px] flex flex-col bg-surface/50 border border-border">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-text-subtle mb-4">{isAr ? 'النشاط خلال 7 أيام' : '7-Day Activity Trend'}</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyTrendData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                <Area type="monotone" dataKey="trips" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorTrips)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <ServiceTripStats
                trips={filteredTrips}
                projects={projects}
                services={services}
                isAr={isAr}
            />

            {!isRestricted && (
                <DashboardActionItems
                    trips={actionableTrips}
                    projects={projects}
                    isAr={isAr}
                    onAction={handleAction}
                />
            )}

            <ExportSelectionModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleFinalPdfExport}
                isAr={isAr}
                isLoading={isGeneratingPdf}
            />

            {!isRestricted && (
                <TripWizard
                    isOpen={wizardOpen}
                    onClose={() => {
                        setWizardOpen(false);
                        setTripToEdit(null);
                        setInitialWarnings([]);
                    }}
                    tripToEdit={tripToEdit}
                    initialStep={initialStep}
                    initialWarnings={initialWarnings}
                />
            )}
        </div >
    );
};

export default ReportsDashboard;
