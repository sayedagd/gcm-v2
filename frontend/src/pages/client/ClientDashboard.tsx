import React, { useMemo, useState } from 'react';
import { useStore } from '@/context';
import { Card, Button, Modal, Table } from '@/components';
import { AlertTriangle, Truck, MessageSquare, Zap, ArrowUp, Minus, ArrowDown, Package, CheckCircle2, Briefcase, Filter, FileText, UserCheck, FileCheck, Recycle, Clock, MapPin, Navigation, ChevronDown, ImageIcon, Eye, Calendar, RefreshCcw } from 'lucide-react';
import { TripStatus, Role, Trip } from '@/types';
import { formatTripStatusByRole, getTripStatusColor, formatDate, formatNumber, getTripPriorityColor, resolveImagePath, safeParseArray } from '@/utils/helpers';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { useClientScope } from '@/hooks/useClientScope';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { SignatureApproveModal } from '@/components/ui/SignatureApproveModal';
import TripDetailsModal from '@/components/trips/TripDetailsModal';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type DurationFilter = 'TODAY' | 'YESTERDAY' | 'DAY_BEFORE' | 'LAST_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'ALL';

const getDateGroup = (dateStr: string, isAr: boolean) => {
    if (!dateStr) return isAr ? 'غير محدد' : 'Unknown';
    const tripDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    tripDate.setHours(0,0,0,0);
    
    if (isNaN(tripDate.getTime())) return isAr ? 'غير محدد' : 'Unknown';

    const diffTime = today.getTime() - tripDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return isAr ? 'رحلات اليوم' : 'Today';
    if (diffDays === 1) return isAr ? 'رحلات الأمس' : 'Yesterday';
    if (diffDays === 2) return isAr ? 'قبل أمس' : 'Day Before Yesterday';
    if (diffDays > 2 && diffDays <= 7) return isAr ? 'الأسبوع الماضي' : 'Last Week';
    if (diffDays < 0) return isAr ? 'مجدولة (قادمة)' : 'Upcoming';
    
    return isAr ? 'أقدم من ذلك' : 'Older';
};

const DURATION_OPTIONS = [
    { value: 'TODAY', labelAr: 'اليوم', labelEn: 'Today' },
    { value: 'YESTERDAY', labelAr: 'أمس', labelEn: 'Yesterday' },
    { value: 'DAY_BEFORE', labelAr: 'أول أمس', labelEn: 'Day Before' },
    { value: 'LAST_WEEK', labelAr: 'الأسبوع الماضي', labelEn: 'Last Week' },
    { value: 'THIS_MONTH', labelAr: 'هذا الشهر', labelEn: 'This Month' },
    { value: 'THIS_YEAR', labelAr: 'هذا العام', labelEn: 'This Year' },
    { value: 'ALL', labelAr: 'كل الوقت', labelEn: 'All Time' },
];

const ClientDashboard: React.FC = () => {
    const { projects, services, currentUser, upsertTrip, drivers, vehicles, users, facilities, loadAllData } = useStore();
    const { t, isAr } = useTranslation();
    
    // Utilize the new scope hook for perfect Company/Project data isolation
    const { scopedTrips, scopedServices } = useClientScope();

    const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

    // Duration Filter
    const [durationFilter, setDurationFilter] = useState<DurationFilter>('ALL');

    const dateFilteredTrips = useMemo(() => {
        if (durationFilter === 'ALL') return scopedTrips;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return scopedTrips.filter(trip => {
            if (!trip.date) return false;
            const tripDate = new Date(trip.date);
            tripDate.setHours(0, 0, 0, 0);
            
            const diffTime = today.getTime() - tripDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            switch (durationFilter) {
                case 'TODAY':
                    return diffDays === 0;
                case 'YESTERDAY':
                    return diffDays === 1;
                case 'DAY_BEFORE':
                    return diffDays === 2;
                case 'LAST_WEEK':
                    return diffDays >= 0 && diffDays <= 7;
                case 'THIS_MONTH':
                    return tripDate.getMonth() === today.getMonth() && tripDate.getFullYear() === today.getFullYear();
                case 'THIS_YEAR':
                    return tripDate.getFullYear() === today.getFullYear();
                default:
                    return true;
            }
        });
    }, [scopedTrips, durationFilter]);

    // Table State & Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | 'PENDING_APPROVAL' | 'COMPLETED'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    // Modals state
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [approveTrip, setApproveTrip] = useState<Trip | null>(null);
    
    // Raise Issue State
    const [issueTrip, setIssueTrip] = useState<Trip | null>(null);
    const [issueNotes, setIssueNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Lookup maps for O(1) access
    const { projectMap, vehicleMap, driverMap, serviceMap } = useLookupMaps();

    // Helpers
    const getProjectName = (id: string) => projectMap[id]?.project_name || id;

    // Service Trip Counts for the new Metric Cards
    const serviceStats = useMemo(() => {
        return scopedServices.map(svc => {
            const count = dateFilteredTrips.filter(t => t.service_id === svc.service_id).length;
            return { ...svc, count };
        }).sort((a, b) => b.count - a.count);
    }, [scopedServices, dateFilteredTrips]);

    // Charts Data
    const chartColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];
    const statusData = useMemo(() => {
        const counts = dateFilteredTrips.reduce((acc, trip) => {
            const key = trip.status === TripStatus.CANCELLED ? TripStatus.CANCELLED : trip.status;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.keys(counts).map((status, index) => ({
            name: formatTripStatusByRole(status as TripStatus, currentUser.role, isAr),
            value: counts[status],
            color: chartColors[index % chartColors.length]
        }));
    }, [dateFilteredTrips, currentUser.role, isAr]);

    const serviceChartData = useMemo(() => {
        return serviceStats.slice(0, 5).map(s => ({
            name: s.service_name,
            Trips: s.count
        }));
    }, [serviceStats]);

    // Filtering Logic
    const scopedProjectsInFilter = useMemo(() => {
        const uniqueProjIds = Array.from(new Set(dateFilteredTrips.map(t => t.project_id)));
        return projects.filter(p => uniqueProjIds.includes(p.project_id));
    }, [dateFilteredTrips, projects]);

    const filteredTrips = useMemo(() => {
       let list = dateFilteredTrips.filter(t => {
          const proj = projectMap[t.project_id];

          const searchStr = searchTerm.toLowerCase();
          const matchSearch =
             t.trip_id.toLowerCase().includes(searchStr) ||
             (proj?.project_name || '').toLowerCase().includes(searchStr);

          const matchProject = selectedProjectId === 'all' || t.project_id === selectedProjectId;

          let matchStatus = true;
          if (selectedStatusTab === 'PENDING_APPROVAL') matchStatus = t.status === TripStatus.PENDING_APPROVAL;
          else if (selectedStatusTab === 'COMPLETED') matchStatus = [TripStatus.COMPLETED, TripStatus.PENDING_DOCS, TripStatus.PENDING_REVIEW].includes(t.status as TripStatus);

          return matchSearch && matchProject && matchStatus;
       });
       return list.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());
    }, [dateFilteredTrips, projects, searchTerm, selectedProjectId, selectedStatusTab]);

    const totalPages = Math.ceil(filteredTrips.length / PAGE_SIZE);
    const paginatedTrips = useMemo(() => {
       const start = (currentPage - 1) * PAGE_SIZE;
       return filteredTrips.slice(start, start + PAGE_SIZE);
    }, [filteredTrips, currentPage]);

    const groupedTrips = useMemo(() => {
        const sorted = [...dateFilteredTrips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const groups: Record<string, Trip[]> = {};
        
        const orderedKeys = isAr 
            ? ['رحلات اليوم', 'رحلات الأمس', 'قبل أمس', 'الأسبوع الماضي', 'أقدم من ذلك', 'مجدولة (قادمة)', 'غير محدد']
            : ['Today', 'Yesterday', 'Day Before Yesterday', 'Last Week', 'Older', 'Upcoming', 'Unknown'];

        sorted.forEach(trip => {
            const groupName = getDateGroup(trip.date, isAr);
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(trip);
        });

        return orderedKeys.filter(k => groups[k]?.length > 0).map(key => ({
            label: key,
            trips: groups[key]
        }));
    }, [dateFilteredTrips, isAr]);

    // Handlers
    const handleRaiseIssue = async () => {
        if (!issueTrip || !issueNotes.trim()) return;
        setIsSubmitting(true);
        try {
            await upsertTrip({
                ...issueTrip,
                status: TripStatus.PENDING_REVIEW,
                issue_notes: issueNotes.trim(),
            });
            setIssueTrip(null);
            setIssueNotes('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 pb-32">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
                        {isAr ? 'لمحة عامة' : 'Dashboard Overview'}
                        <button 
                            onClick={async () => {
                                const btn = document.getElementById('refresh-btn');
                                if (btn) btn.classList.add('animate-spin');
                                await loadAllData();
                                if (btn) btn.classList.remove('animate-spin');
                            }}
                            className="p-2 bg-surface hover:bg-surface-subtle rounded-full border border-border transition-colors text-primary"
                            title={isAr ? 'تحديث البيانات' : 'Refresh Data'}
                        >
                            <RefreshCcw id="refresh-btn" size={20} />
                        </button>
                    </h1>
                    <p className="text-text-subtle font-bold mt-1">
                        {isAr 
                            ? (currentUser.role === Role.COMPANY_USER ? 'إحصائيات مجمعة لجميع مشاريع الشركة المنفذة.' : 'إحصائيات العمليات الخاصة بمشروعك.') 
                            : 'Operational statistics for your specific scope.'}
                    </p>
                </div>
            </div>

            {/* Unified Filters Bar */}
            <Card className="p-3 sm:p-4 premium-card !rounded-3xl border border-border/50 shadow-sm flex flex-col gap-3 sm:gap-4 bg-surface z-10 sticky top-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
                    {/* Status Tabs */}
                    <div className="flex overflow-x-auto bg-surface p-1 sm:p-1.5 rounded-2xl items-center shadow-sm border border-border gap-1 no-scrollbar w-full lg:w-auto">
                        {['ALL', 'PENDING_APPROVAL', 'COMPLETED'].map((tab) => {
                            const count = tab === 'ALL' ? scopedTrips.length : scopedTrips.filter(t => {
                                if (tab === 'PENDING_APPROVAL') return t.status === TripStatus.PENDING_APPROVAL;
                                if (tab === 'COMPLETED') return [TripStatus.COMPLETED, TripStatus.PENDING_DOCS, TripStatus.PENDING_REVIEW].includes(t.status as TripStatus);
                                return false;
                            }).length;

                            return (
                                <button
                                    key={tab}
                                    onClick={() => { setSelectedStatusTab(tab as any); setCurrentPage(1); }}
                                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${selectedStatusTab === tab ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'text-text-subtle hover:text-primary-500'}`}
                                >
                                    {tab === 'ALL' ? (isAr ? 'الكل' : 'All') :
                                    tab === 'PENDING_APPROVAL' ? (isAr ? 'بانتظار الاعتماد' : 'Pending Approval') :
                                        (isAr ? 'مكتملة ومؤرشفة' : 'Completed')}
                                    {count > 0 && (
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${selectedStatusTab === tab ? 'bg-white/20 text-white' : (tab === 'PENDING_APPROVAL' ? 'bg-rose-500 text-white animate-pulse' : 'bg-surface-subtle text-text-subtle')}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Duration Filters */}
                    <div className="flex overflow-x-auto bg-surface p-1 sm:p-1.5 rounded-2xl items-center shadow-sm border border-border gap-1 no-scrollbar w-full lg:w-auto">
                        {DURATION_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { setDurationFilter(opt.value as DurationFilter); setCurrentPage(1); }}
                                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${durationFilter === opt.value ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'text-text-subtle hover:text-primary-500'}`}
                            >
                                {isAr ? opt.labelAr : opt.labelEn}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                    <div className="bg-surface px-4 py-2 rounded-2xl border border-border shadow-sm flex items-center gap-4 transition-all hover:border-primary-500 w-full sm:w-auto flex-1">
                        <div className="p-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-primary-500">
                            <Filter size={18} />
                        </div>
                        <div className="flex flex-col text-right w-full">
                            <span className="text-[9px] font-bold uppercase text-text-subtle tracking-widest leading-none mb-1">{isAr ? 'تصفية حسب المشروع' : 'Project Filter'}</span>
                            <select className="bg-transparent border-none outline-none font-bold text-sm w-full p-0 cursor-pointer text-text-main" value={selectedProjectId} onChange={e => { setSelectedProjectId(e.target.value); setCurrentPage(1); }}>
                                <option value="all">{isAr ? 'كل المشاريع' : 'All Projects'}</option>
                                {scopedProjectsInFilter.map(p => (
                                    <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <input
                        type="text"
                        placeholder={isAr ? 'بحث برقم الرحلة، المشروع...' : 'Search Trip ID, Project...'}
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="bg-surface border border-border rounded-2xl px-4 py-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none w-full sm:w-64"
                    />
                </div>
            </Card>

            {/* Service Trip Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <Card className="p-4 sm:p-6 premium-card !rounded-3xl flex flex-col justify-center relative overflow-hidden group border border-emerald-500/20 bg-gradient-to-br from-surface to-emerald-50/30 dark:to-emerald-900/10">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <p className="text-xs sm:text-sm font-bold text-text-subtle">{isAr ? 'إجمالي الرحلات' : 'Total Trips'}</p>
                        <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg">
                            <Truck size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-text-main">{dateFilteredTrips.length}</h3>
                </Card>
                {serviceStats.slice(0, 3).map((svc, i) => {
                    const colors = ['border-blue-500/20 from-surface to-blue-50/30 dark:to-blue-900/10 text-blue-600 bg-blue-50 dark:bg-blue-900/20 blur-blue', 'border-amber-500/20 from-surface to-amber-50/30 dark:to-amber-900/10 text-amber-600 bg-amber-50 dark:bg-amber-900/20 blur-amber', 'border-purple-500/20 from-surface to-purple-50/30 dark:to-purple-900/10 text-purple-600 bg-purple-50 dark:bg-purple-900/20 blur-purple'];
                    const color = colors[i % colors.length];
                    const [border, fromSurface, toColor, darkToColor, textColor, bgBox, darkBgBox, blurColor] = color.split(' ');
                    
                    return (
                        <Card key={svc.service_id} className={`p-4 sm:p-6 premium-card !rounded-3xl flex flex-col justify-center relative overflow-hidden group border ${border} bg-gradient-to-br ${fromSurface} ${toColor} ${darkToColor}`}>
                            <div className={`absolute -right-4 -top-4 w-24 h-24 ${bgBox} rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-all duration-500`}></div>
                            <div className="flex items-center justify-between mb-2 relative z-10">
                                <p className="text-xs sm:text-sm font-bold text-text-subtle line-clamp-1">{svc.service_name}</p>
                                <div className={`p-1.5 sm:p-2 rounded-lg ${bgBox} ${textColor}`}>
                                    <Package size={16} className="sm:w-[18px] sm:h-[18px]" />
                                </div>
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black text-text-main">{svc.count}</h3>
                        </Card>
                    );
                })}
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <Card className="p-4 sm:p-6 premium-card glass-panel !rounded-3xl flex flex-col h-64 sm:h-80 border border-border/50 shadow-sm">
                    <h2 className="text-lg font-bold text-text-main mb-4">{isAr ? 'توزيع حالات الرحلات' : 'Trip Status Distribution'}</h2>
                    {statusData.length > 0 ? (
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="transparent"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-text-subtle text-sm font-bold">{t('dashboard.noTrips')}</div>
                    )}
                </Card>

                <Card className="p-4 sm:p-6 premium-card glass-panel !rounded-3xl flex flex-col h-64 sm:h-80 border border-border/50 shadow-sm">
                    <h2 className="text-lg font-bold text-text-main mb-4">{isAr ? 'أداء الخدمات' : 'Service Performance'}</h2>
                    {serviceChartData.length > 0 ? (
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={serviceChartData} maxBarSize={40} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="Trips" fill="#10b981" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-text-subtle text-sm font-bold">{t('dashboard.noTrips')}</div>
                    )}
                </Card>
            </div>

            {/* Unified Trips Table Section - Live Tracking removed */}
            {false && <div className="pt-2">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-3">
                            <Calendar className="text-primary-500" /> {t('tracking.title') || (isAr ? 'تتبع الرحلات' : 'Track Trips')}
                        </h2>
                        <p className="text-sm text-text-subtle font-bold mt-1">
                            {isAr ? 'عرض الرحلات النشطة والمجدولة للعمليات الميدانية' : 'View active and upcoming field operations'}
                        </p>
                    </div>
                </div>

                {groupedTrips.length === 0 ? (
                    <div className="bg-surface-subtle shadow-sm rounded-2xl h-48 flex flex-col items-center justify-center text-text-subtle border border-border">
                        <Calendar size={48} className="mb-4 opacity-20" />
                        <h3 className="text-lg font-bold">{isAr ? 'لا توجد رحلات' : 'No Trips Found'}</h3>
                    </div>
                ) : (
                    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                        {groupedTrips.map(group => (
                            <div key={group.label} className="space-y-3 sm:space-y-4">
                                <div className="flex items-center gap-3 sticky top-0 bg-background z-10 py-2">
                                    <h3 className="text-xs sm:text-sm font-black text-text-main bg-surface px-3 sm:px-4 py-1.5 rounded-xl border border-border shadow-sm inline-block whitespace-nowrap">
                                        {group.label}
                                    </h3>
                                    <div className="h-px bg-border flex-1"></div>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-text-subtle bg-surface px-2 py-1 rounded-md border border-border whitespace-nowrap">
                                        {group.trips.length} {isAr ? 'رحلة' : 'Trips'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                                    {group.trips.map(trip => {
                                        const project = projectMap[trip.project_id];
                                        const vehicle = vehicleMap[trip.vehicle_id];
                                        const driver = driverMap[trip.driver_id];
                                        const service = serviceMap[trip.service_id];
                                        
                                        const displayVehicle = vehicle?.plate_no || trip.vehicle_id || (isAr ? 'غير محدد' : 'Not Assigned');
                                        const displayDriver = driver?.name || trip.driver_id || (isAr ? 'غير محدد' : 'Not Assigned');
                                        const locationUrl = trip.request_location_url || (trip as any).trip_location_url || (project?.location?.startsWith('http') ? project.location : null);
                                        const isExpanded = expandedTripId === trip.trip_id;

                                        return (
                                            <motion.div
                                                key={`track-${trip.trip_id}`}
                                                layout
                                                onClick={() => setExpandedTripId(isExpanded ? null : trip.trip_id)}
                                                className={`bg-surface rounded-2xl border-2 transition-all p-1 overflow-hidden group shadow-sm cursor-pointer ${
                                                    isExpanded ? 'border-primary-500 shadow-xl shadow-primary-500/10' :
                                                    trip.status === TripStatus.PENDING_APPROVAL ? 'border-purple-300 dark:border-purple-700 bg-purple-50/30 dark:bg-purple-950/10 hover:border-purple-400' :
                                                    trip.status === TripStatus.COMPLETED ? 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400' :
                                                    trip.status === TripStatus.CANCELLED ? 'border-rose-200 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/10 hover:border-rose-400' :
                                                    'border-border hover:border-primary-500/50'
                                                }`}
                                            >
                                                <div className="p-3 sm:p-4">
                                                    <div className="flex justify-between items-start mb-3 gap-2">
                                                        <div className="flex gap-2 sm:gap-3 min-w-0">
                                                            {(() => {
                                                                const sc = getTripStatusColor(trip.status);
                                                                const StatusIcon = trip.status === TripStatus.REQUESTED ? Clock :
                                                                    trip.status === TripStatus.ASSIGNED ? UserCheck :
                                                                        trip.status === TripStatus.EN_ROUTE ? Navigation :
                                                                            trip.status === TripStatus.LOADING ? Package :
                                                                                trip.status === TripStatus.PENDING_APPROVAL ? CheckCircle2 :
                                                                                    trip.status === TripStatus.COMPLETED ? CheckCircle2 :
                                                                                    trip.status === TripStatus.PENDING_DOCS ? FileCheck : Truck;
                                                                return (
                                                                    <div onClick={(e) => { e.stopPropagation(); setSelectedTrip(trip); setIsDetailModalOpen(true); }} className={`w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-sm ${sc.bg} ${sc.text}`}>
                                                                        <StatusIcon size={18} className="sm:w-5 sm:h-5" />
                                                                    </div>
                                                                );
                                                            })()}
                                                            <div>
                                                                <h4 className="font-black text-text-main text-sm line-clamp-1">{project?.project_name || trip.project_id}</h4>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] text-text-subtle font-bold uppercase tracking-widest leading-none mt-1">{trip.trip_id} • {trip.time}</p>
                                                                    {trip.priority && trip.priority !== 'NORMAL' && (() => {
                                                                        const pc = getTripPriorityColor(trip.priority);
                                                                        return <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${pc.bg} ${pc.text} mt-1`}>{trip.priority}</span>;
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${getTripStatusColor(trip.status).bg} ${getTripStatusColor(trip.status).text} border border-black/5 shadow-sm`}>
                                                                {formatTripStatusByRole(trip.status, currentUser.role, isAr)}
                                                            </span>
                                                            <ChevronDown size={16} className={`text-text-subtle transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "circOut" }} className="border-t border-border bg-surface-subtle">
                                                            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="bg-surface p-2.5 rounded-xl border border-border">
                                                                        <div className="flex items-center gap-1.5 text-text-subtle mb-1"><Truck size={12} /><p className="text-[9px] font-black tracking-widest">{isAr ? 'المركبة' : 'Fleet'}</p></div>
                                                                        <h4 className="font-bold text-text-main text-xs line-clamp-1">{displayVehicle}</h4>
                                                                    </div>
                                                                    <div className="bg-surface p-2.5 rounded-xl border border-border">
                                                                        <div className="flex items-center gap-1.5 text-text-subtle mb-1"><UserCheck size={12} /><p className="text-[9px] font-black tracking-widest">{isAr ? 'السائق' : 'Driver'}</p></div>
                                                                        <h4 className="font-bold text-text-main text-xs line-clamp-1">{displayDriver}</h4>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div className="flex items-start gap-2 text-xs font-bold text-text-main">
                                                                        <MapPin size={14} className="text-primary-500 mt-0.5" /> 
                                                                        {locationUrl ? (
                                                                            <a href={locationUrl} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">{isAr ? 'عرض الموقع على الخريطة' : 'View Location on Map'}</a>
                                                                        ) : (isAr ? 'لم يتم تحديد موقع' : 'No Location Set')}
                                                                    </div>
                                                                    <div className="flex items-start gap-2 text-xs font-bold text-text-main">
                                                                        <Package size={14} className="text-orange-500 mt-0.5" /> 
                                                                        {service?.service_name || 'General Disposal'} • {trip.quantity} {trip.unit}
                                                                    </div>
                                                                </div>
                                                                {(() => {
                                                                    const proofs = safeParseArray(trip.proof_images);
                                                                    const hasPhotos = proofs.length > 0 || trip.container_image_before || trip.container_image_after;
                                                                    if (!hasPhotos) return null;
                                                                    return (
                                                                        <div className="space-y-2 mt-4 pt-4 border-t border-border">
                                                                            <div className="flex items-center gap-2 text-text-subtle"><ImageIcon size={14} /><p className="text-[9px] font-black tracking-widest">{isAr ? 'الصور الميدانية' : 'Field Photos'}</p></div>
                                                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide py-1">
                                                                                {[{ src: trip.container_image_before, label: 'BEFORE' }, { src: trip.container_image_after, label: 'AFTER' }, ...proofs.map(p => ({ src: p, label: 'PROOF' }))].filter(p => p.src).map((img, i) => (
                                                                                    <div key={i} className="w-16 h-16 rounded-lg bg-surface border border-border overflow-hidden relative group shrink-0" onClick={(e) => { e.stopPropagation(); window.open(resolveImagePath(img.src!), '_blank') }}>
                                                                                        <img src={resolveImagePath(img.src!)} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                                                                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Eye size={16} className="text-white drop-shadow-md" /></div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedTrip(trip); setIsDetailModalOpen(true); }} className="flex-1 py-2.5 bg-surface border border-border text-text-main rounded-xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-colors">
                                                                        <FileText size={14} /> {isAr ? 'عـرض التفــاصيل' : 'Details'}
                                                                    </button>
                                                                    {trip.status === TripStatus.PENDING_APPROVAL && (
                                                                        <button onClick={(e) => { e.stopPropagation(); setApproveTrip(trip); }} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-purple-500 shadow-lg shadow-purple-500/20 transition-colors">
                                                                            <CheckCircle2 size={14} /> {isAr ? 'اعتمـاد الرحلة' : 'Approve'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>}

            {/* Unified Trips Table Section */}
            <div className="pt-2">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 mb-4">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-text-main">{isAr ? 'سجل الرحلات والاعتمادات' : 'Trips & Approvals Log'}</h2>
                        <p className="text-xs sm:text-sm text-text-subtle">{isAr ? 'تتبع ومراجعة واعتماد رحلات مشاريعك الميدانية' : 'Track, review, and approve field trips within your scope'}</p>
                    </div>
                </div>

                <Card className="rounded-[2rem] overflow-hidden border border-border/50 premium-card glass-panel p-1">
                    <Table
                        isAr={isAr}
                        columns={[
                            {
                                key: 'trip_id',
                                label: isAr ? 'الهوية والجدولة' : 'ID & SCHEDULE',
                                render: (_, trip: Trip) => (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 w-fit">
                                            <span className={`w-1.5 h-1.5 rounded-full ${trip.status === TripStatus.PENDING_APPROVAL ? 'animate-pulse bg-purple-500' : 'bg-success'}`} />
                                            <p className="font-mono text-[10px] font-bold text-primary tracking-tight">{trip.trip_id}</p>
                                        </div>
                                        <p className="text-lg font-bold text-text-main leading-none">{formatDate(trip.date)}</p>
                                        <p className="text-[10px] font-bold text-text-subtle tracking-widest uppercase">{trip.time}</p>
                                    </div>
                                )
                            },
                            {
                                key: 'project_id',
                                label: isAr ? 'العميل والموقع' : 'ENTITY & LOCATION',
                                render: (val) => {
                                    const project = projectMap[val];
                                    return (
                                        <div className="space-y-1">
                                            <div className="font-bold text-text-main flex items-center gap-2">
                                                <Briefcase size={14} className="text-primary" />
                                                {project?.project_name || val || '---'}
                                            </div>
                                            <div className="text-[10px] font-bold text-text-subtle tracking-widest uppercase block">
                                                {isAr ? 'مشروع الشركة' : 'Company Project'}
                                            </div>
                                        </div>
                                    );
                                }
                            },
                            {
                                key: 'service_id',
                                label: isAr ? 'نوع الخدمة' : 'SERVICE TYPE',
                                render: (val) => {
                                    const srv = serviceMap[val];
                                    return (
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500"><Package size={14} /></div>
                                            <span className="font-bold text-[11px] text-text-main">{srv?.service_name || val || '---'}</span>
                                        </div>
                                    );
                                }
                            },
                            {
                                key: 'logistics',
                                label: isAr ? 'الفريق والأسطول' : 'CREW & FLEET',
                                render: (_, trip: Trip) => (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500"><UserCheck size={14} /></div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-bold text-text-subtle tracking-widest uppercase">Operator</span>
                                                <span className="font-bold text-text-main text-[11px]">
                                                    {driverMap[trip.driver_id]?.name || trip.driver_id || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Truck size={14} /></div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-bold text-text-subtle tracking-widest uppercase">Plate ID</span>
                                                <span className="font-bold text-text-main text-[11px]">
                                                    {vehicleMap[trip.vehicle_id]?.plate_no || trip.vehicle_id || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: 'quantity',
                                label: isAr ? 'الأوزان المعتمدة' : 'VERIFIED WEIGHT',
                                className: 'text-center',
                                render: (val, trip: Trip) => (
                                    <div className="flex flex-col items-center">
                                        <span className="text-2xl font-bold text-text-main tracking-tight">{formatNumber(val)}</span>
                                        <span className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1 bg-primary/10 px-2 py-0.5 rounded-full">{trip.unit}</span>
                                    </div>
                                )
                            },
                            {
                                key: 'status',
                                label: isAr ? 'حالة التشغيل' : 'LIVE STATUS',
                                render: (_, trip: Trip) => {
                                    const sc = getTripStatusColor(trip.status);
                                    return (
                                        <span className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${sc.bg} ${sc.text} border border-black/5`}>
                                            {formatTripStatusByRole(trip.status, currentUser.role, isAr)}
                                        </span>
                                    );
                                }
                            },
                            {
                                key: 'docs',
                                label: isAr ? 'المستندات' : 'DOCS',
                                render: (_, trip: Trip) => {
                                    const isGcmApproved = trip.is_manifest_generated || trip.status === TripStatus.COMPLETED;
                                    return (
                                        <div className="flex -space-x-1.5" title={!isGcmApproved ? (isAr ? 'في انتظار موافقة GCM' : 'Pending GCM Approval') : ''}>
                                            {trip.manifest_file && <div className={`p-1.5 rounded-lg shadow-lg border-2 border-surface ${isGcmApproved ? 'bg-primary text-surface' : 'bg-surface-subtle text-text-subtle/50 cursor-not-allowed'}`} title="Manifest"><FileText size={12} /></div>}
                                            {trip.delivery_note_file && <div className={`p-1.5 rounded-lg shadow-lg border-2 border-surface ${isGcmApproved ? 'bg-primary text-surface' : 'bg-surface-subtle text-text-subtle/50 cursor-not-allowed'}`} title="DN"><FileCheck size={12} /></div>}
                                            {trip.recycle_file && <div className={`p-1.5 rounded-lg shadow-lg border-2 border-surface ${isGcmApproved ? 'bg-primary text-surface' : 'bg-surface-subtle text-text-subtle/50 cursor-not-allowed'}`} title="Recycle"><Recycle size={12} /></div>}
                                        </div>
                                    );
                                }
                            },
                            {
                                key: 'actions',
                                label: '',
                                className: 'text-left min-w-[140px]',
                                render: (_, trip: Trip) => (
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); setSelectedTrip(trip); setIsDetailModalOpen(true); }}
                                            icon={FileText}
                                            className="text-text-subtle hover:text-primary-500 bg-surface-subtle"
                                        >
                                            {isAr ? 'تفاصيل' : 'Details'}
                                        </Button>

                                        {trip.status === TripStatus.PENDING_APPROVAL && (
                                            <>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); setApproveTrip(trip); }}
                                                    icon={CheckCircle2}
                                                    className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                                                >
                                                    {isAr ? 'اعتماد' : 'Approve'}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); setIssueTrip(trip); }}
                                                    icon={AlertTriangle}
                                                    className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 px-2"
                                                    title={isAr ? 'إبلاغ عن مشكلة' : 'Raise Issue'}
                                                />
                                            </>
                                        )}
                                    </div>
                                )
                            }
                        ]}
                        data={paginatedTrips}
                        onRowClick={(trip) => { setSelectedTrip(trip); setIsDetailModalOpen(true); }}
                        emptyMessage={isAr ? 'لا يوجد رحلات مطابقة' : 'No trips found'}
                    />
                    
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-border flex items-center justify-between bg-surface-subtle/50">
                            <span className="text-xs font-bold text-text-subtle">
                                {isAr
                                    ? `عرض ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filteredTrips.length)} من ${filteredTrips.length}`
                                    : `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filteredTrips.length)} of ${filteredTrips.length}`}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border bg-surface hover:border-primary-500 hover:text-primary-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    {isAr ? 'السابق' : 'Prev'}
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .reduce<(number | string)[]>((acc, p, i, arr) => {
                                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((p, i) =>
                                        p === '...' ? (
                                            <span key={`dot-${i}`} className="px-1 text-text-subtle text-xs">...</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p as number)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${currentPage === p ? 'bg-primary-500 text-white shadow-md' : 'border border-border bg-surface hover:border-primary-500 hover:text-primary-500'}`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    )}
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border bg-surface hover:border-primary-500 hover:text-primary-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                >
                                    {isAr ? 'التالي' : 'Next'}
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Modals */}
            <TripDetailsModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                selectedTrip={selectedTrip}
            />

            <SignatureApproveModal 
                isOpen={!!approveTrip} 
                trip={approveTrip} 
                onClose={() => setApproveTrip(null)} 
                onApproveSuccess={() => setApproveTrip(null)}
            />

            <Modal isOpen={!!issueTrip} onClose={() => { setIssueTrip(null); setIssueNotes(''); }} title={isAr ? 'إبلاغ عن مشكلة' : 'Raise Issue'} size="md">
                <div className="space-y-4 p-4">
                    <p className="text-sm text-text-subtle font-bold">
                        {isAr ? `الرحلة: ${issueTrip?.trip_id}` : `Trip: ${issueTrip?.trip_id}`}
                    </p>
                    <textarea
                        rows={4}
                        className="w-full bg-surface-subtle border-2 border-border rounded-xl p-4 font-bold text-text-main focus:outline-none focus:border-primary-500 transition-all resize-none"
                        placeholder={isAr ? 'صف المشكلة بالتفصيل...' : 'Describe the issue in detail...'}
                        value={issueNotes}
                        onChange={e => setIssueNotes(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => { setIssueTrip(null); setIssueNotes(''); }}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                        <Button
                            variant="primary"
                            disabled={!issueNotes.trim() || isSubmitting}
                            onClick={handleRaiseIssue}
                            icon={MessageSquare}
                            className="flex-1"
                        >
                            {isAr ? 'إرسال البلاغ' : 'Submit Issue'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ClientDashboard;
