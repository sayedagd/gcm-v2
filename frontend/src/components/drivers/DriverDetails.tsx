import React, { useMemo, useState } from 'react';
import { Truck, Navigation, Camera, CheckCircle2, MapPin, Package, Clock, AlertCircle, ArrowRight, Shield, HardHat, Scale, X, Activity, Briefcase, TrendingUp, FileText, DownloadCloud, Edit2, Calendar, FileOutput, Phone, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Card, StatCard, Button } from '@/components';
import { Driver, Trip, TripStatus, PermitEntry, Project, Company } from '@/types';
import { formatDate, resolveImagePath } from '@/utils/helpers';
import { subDays, parseISO } from 'date-fns';
import { useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer
} from 'recharts';
import AssetMap from '@/components/inventory/AssetMap';
import { printDriverDossier } from '@/utils/exportHelpers';
import { useStore } from '@/context';

interface DriverDetailsProps {
    driver: Driver;
    trips: Trip[];
    projects: Project[];
    companies: Company[];
    isAr: boolean;
    onEdit: () => void;
}

const DriverDetails: React.FC<DriverDetailsProps> = ({
    driver,
    trips,
    projects,
    companies,
    isAr,
    onEdit
}) => {
    const { saasConfig } = useStore();
    const staffStats = useMemo(() => {
        if (!driver?.driver_id) return { trips: [], tonnage: 0, projectsCount: 0 };
        const tripsList = (trips || []).filter(t => t.driver_id === driver.driver_id);
        const ton = tripsList.reduce((s, t) => s + parseFloat(t.quantity || '0'), 0);
        const projectsUnique = Array.from(new Set(tripsList.map(t => t.project_id)));
        return { trips: tripsList, tonnage: ton, projectsCount: projectsUnique.length };
    }, [trips, driver?.driver_id]);

    const chartData = useMemo(() => {
        const days = [...Array(7)].map((_, i) => formatDate(subDays(new Date(), i).toISOString(), 'yyyy-MM-dd', isAr)).reverse();
        return days.map(d => {
            const dayTrips = staffStats.trips.filter(t => t.date === d);
            return {
                date: formatDate(parseISO(d).toISOString(), 'MMM dd', isAr),
                trips: dayTrips.length,
                tonnage: dayTrips.reduce((s, t) => s + parseFloat(t.quantity || '0'), 0)
            };
        });
    }, [staffStats.trips, isAr]);

    const permits: PermitEntry[] = useMemo(() => {
        try {
            return JSON.parse(driver.permit_zones || '[]');
        } catch {
            return [];
        }
    }, [driver.permit_zones]);

    const downloadAttachment = (data?: string, name?: string) => {
        if (!data) return;
        const link = document.createElement('a');
        link.href = resolveImagePath(data);
        link.download = name || 'attachment';
        link.target = '_blank';
        link.click();
    };

    const handlePrint = () => {
        printDriverDossier(driver, { tripsCount: staffStats.trips.length, tonnage: staffStats.tonnage, history: staffStats.trips }, isAr, projects, companies, saasConfig?.templateConfig);
    };

    const completedTrips = useMemo(() =>
        staffStats.trips.filter(t => [TripStatus.PENDING_DOCS, TripStatus.COMPLETED, TripStatus.PENDING_APPROVAL].includes(t.status)),
        [staffStats.trips]);

    const issuesTrips = useMemo(() =>
        staffStats.trips.filter(t => !!t.issue_notes || t.status === TripStatus.PENDING_REVIEW),
        [staffStats.trips]);

    const cancelledTrips = useMemo(() =>
        staffStats.trips.filter(t => t.status === TripStatus.CANCELLED),
        [staffStats.trips]);

    const [historyTab, setHistoryTab] = useState<'COMPLETED' | 'ISSUES' | 'CANCELLED'>('COMPLETED');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        staffStats.trips.forEach(t => {
            if (t.date) months.add(t.date.substring(0, 7));
        });
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [staffStats.trips]);

    const filteredTrips = useMemo(() => {
        let base = historyTab === 'COMPLETED' ? completedTrips : historyTab === 'ISSUES' ? issuesTrips : cancelledTrips;
        if (selectedMonth !== 'ALL') {
            base = base.filter(t => t.date && t.date.startsWith(selectedMonth));
        }
        return base.sort((a, b) => b.date.localeCompare(a.date));
    }, [historyTab, completedTrips, issuesTrips, cancelledTrips, selectedMonth]);

    const ITEMS_PER_PAGE = 4;
    const totalPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE);
    const paginatedTrips = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTrips.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTrips, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [historyTab, selectedMonth]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Profile Hero Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 bg-surface-subtle rounded-[2rem] border border-border relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-10 transition-colors ${driver.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-primary'}`} />

                <div className="flex items-center gap-6 relative z-10">
                    <div className="relative">
                        <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-[2rem] border-4 border-surface shadow-2xl flex items-center justify-center ${driver.category === 'MANAGEMENT' ? 'bg-primary-600 text-white' : 'bg-primary-600 text-white'}`}>
                            {driver.category === 'MANAGEMENT' ? <Briefcase size={48} /> : <HardHat size={48} />}
                        </div>
                        <div className={`absolute -bottom-3 -right-3 p-3 rounded-2xl shadow-xl border-4 border-surface ${driver.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            <Shield size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.3em] font-mono">{driver.driver_id || 'N/A'}</span>
                            <div className="h-1 w-1 rounded-full bg-text-subtle/30" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] flex items-center gap-1">
                                {driver.role_title}
                            </span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight uppercase leading-tight mb-4">{driver.name}</h2>

                        <div className="flex flex-wrap gap-2 mt-4">
                            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${driver.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                <div className={`h-2 w-2 rounded-full ${driver.status === 'ACTIVE' ? 'animate-pulse bg-emerald-500' : 'bg-rose-500'}`} />
                                {driver.status}
                            </div>
                            <div className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface border border-border text-text-subtle flex items-center gap-2">
                                <Truck size={12} /> {driver.ownership_type === 'INTERNAL' ? (isAr ? 'أسطول داخلي' : 'Internal Fleet') : (driver.supplier_name || 'Supplier Fleet')}
                            </div>
                            {(() => {
                                const { vehicles, services, assetServiceLinks } = useStore();
                                const linkedVehicle = vehicles.find(v => v.vehicle_id === driver.vehicle_id);
                                const linkedLinks = linkedVehicle ? assetServiceLinks.filter(l => l.asset_type === 'VEHICLE' && l.asset_id === linkedVehicle.vehicle_id) : [];
                                const primaryService = services.find(s => s.service_id === linkedLinks[0]?.service_id);
                                return (
                                    <>
                                        {linkedVehicle && (
                                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50/80 text-blue-600 border border-blue-200">
                                                <Truck size={12} /> {linkedVehicle.plate_no}
                                            </div>
                                        )}
                                        {primaryService && (
                                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50/80 text-indigo-600 border border-indigo-200">
                                                <Sparkles size={12} /> {primaryService.service_name}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 relative z-10 flex-col sm:flex-row w-full sm:w-auto mt-4 sm:mt-0">
                    <Button
                        variant="secondary"
                        icon={FileOutput}
                        onClick={handlePrint}
                        className="h-14 px-8 rounded-2xl font-bold tracking-widest text-xs uppercase"
                    >
                        {isAr ? 'تصدير التقرير الفني' : 'Export Dossier'}
                    </Button>
                    <Button
                        variant="primary"
                        icon={Edit2}
                        onClick={onEdit}
                        className="h-14 px-8 rounded-2xl font-bold tracking-widest text-xs uppercase"
                    >
                        {isAr ? 'تحديث الملف' : 'Update Profile'}
                    </Button>
                </div>
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard title={isAr ? 'إجمالي الرحلات' : 'Trips'} value={staffStats.trips.length} icon={Activity} variant="primary" />
                <StatCard title={isAr ? 'الأوزان (طن)' : 'Tonnage'} value={staffStats.tonnage.toFixed(1)} icon={Scale} variant="blue" />
                <StatCard title={isAr ? 'المشاريع' : 'Projects'} value={staffStats.projectsCount} icon={Briefcase} variant="purple" />
            </div>

            {/* Operations Map & Identity Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Deployment Geography */}
                <div className="lg:col-span-2 space-y-4">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-text-subtle">
                        <MapPin size={16} /> {isAr ? 'الانتشار الميداني' : 'Deployment Geography'}
                    </h4>
                    <Card className="p-2 overflow-hidden bg-surface-subtle shadow-inner h-[380px] border border-border rounded-3xl">
                        <AssetMap
                            history={staffStats.trips}
                            isAr={isAr}
                        />
                    </Card>
                </div>

                {/* Performance Readiness */}
                <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-text-subtle">
                        <TrendingUp size={16} /> {isAr ? 'جاهزية الأداء (آخر 7 أيام)' : 'Velocity (L7D)'}
                    </h4>
                    <Card className="p-6 bg-surface-subtle h-[380px] flex flex-col justify-between rounded-3xl border border-border">
                        <div className="text-center mb-4">
                            <p className="text-3xl font-black text-primary">{staffStats.trips.filter(t => new Date(t.date) >= subDays(new Date(), 7)).length}</p>
                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'رحلات مكتملة حديثاً' : 'Recent Dispatches'}</p>
                        </div>
                        <div className="h-48 w-full mt-auto">
                            <ResponsiveContainer width="99%" height={300}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <ReTooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', padding: '12px' }}
                                        itemStyle={{ fontWeight: '900', fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="trips" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTrips)" strokeWidth={4} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Documents & Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Iqama */}
                <Card className="p-6 flex items-center justify-between group h-full hover:border-primary/50 transition-colors">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-primary-600 rounded-2xl text-white shadow-lg shadow-primary-600/30"><Shield size={24} /></div>
                            <div>
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'رقم الإقامة' : 'Iqama Registry'}</p>
                                <p className="font-bold text-text-main text-lg tracking-wider font-mono mt-1">{driver.iqama_no || '---'}</p>
                            </div>
                        </div>
                        {driver.iqama_expiry && (
                            <div className="flex items-center gap-1.5 mt-2 ml-[4.5rem]">
                                <Calendar size={12} className="text-text-subtle" />
                                <span className="text-[10px] font-bold uppercase text-text-subtle tracking-widest">{driver.iqama_expiry}</span>
                            </div>
                        )}
                    </div>
                    {driver.iqama_file && (
                        <button onClick={() => downloadAttachment(driver.iqama_file, `Iqama_${driver.name}`)} className="p-3 rounded-xl text-white bg-primary-600 hover:bg-primary-700 transition-all shadow-md mt-auto">
                            <DownloadCloud size={20} />
                        </button>
                    )}
                </Card>

                {/* 2. License */}
                <Card className="p-6 flex items-center justify-between group h-full hover:border-success/50 transition-colors">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/30"><HardHat size={24} /></div>
                            <div>
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'رخصة القيادة' : 'Driver License'}</p>
                                <p className="font-bold text-text-main text-lg tracking-wider font-mono mt-1">{driver.license_no || '---'}</p>
                            </div>
                        </div>
                        {driver.license_expiry && (
                            <div className="flex items-center gap-1.5 mt-2 ml-[4.5rem]">
                                <Calendar size={12} className="text-text-subtle" />
                                <span className="text-[10px] font-bold uppercase text-text-subtle tracking-widest">{driver.license_expiry}</span>
                            </div>
                        )}
                    </div>
                    {driver.license_file && (
                        <button onClick={() => downloadAttachment(driver.license_file, `License_${driver.name}`)} className="p-3 rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-md mt-auto">
                            <DownloadCloud size={20} />
                        </button>
                    )}
                </Card>

                {/* 3. Operating Card */}
                <Card className="p-6 flex items-center justify-between group h-full hover:border-blue-500/50 transition-colors">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/30"><FileText size={24} /></div>
                            <div>
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'كارت التشغيل' : 'Operating Card'}</p>
                                <p className="font-bold text-text-main text-lg tracking-wider font-mono mt-1">{driver.operating_card_no || '---'}</p>
                            </div>
                        </div>
                        {driver.operating_card_expiry && (
                            <div className="flex items-center gap-1.5 mt-2 ml-[4.5rem]">
                                <Calendar size={12} className="text-text-subtle" />
                                <span className="text-[10px] font-bold uppercase text-text-subtle tracking-widest">{driver.operating_card_expiry}</span>
                            </div>
                        )}
                    </div>
                    {driver.operating_card_file && (
                        <button onClick={() => downloadAttachment(driver.operating_card_file, `OperatingCard_${driver.name}`)} className="p-3 rounded-xl text-white bg-blue-500 hover:bg-blue-600 transition-all shadow-md mt-auto">
                            <DownloadCloud size={20} />
                        </button>
                    )}
                </Card>

                {/* 4. Insurance */}
                <Card className="p-6 flex items-center justify-between group h-full hover:border-purple-500/50 transition-colors">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-purple-500 rounded-2xl text-white shadow-lg shadow-purple-500/30"><Shield size={24} /></div>
                            <div>
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'وثيقة التأمين' : 'Insurance Policy'}</p>
                                <p className="font-bold text-text-main text-lg tracking-wider font-mono mt-1">{driver.insurance_no || '---'}</p>
                            </div>
                        </div>
                        {driver.insurance_expiry && (
                            <div className="flex items-center gap-1.5 mt-2 ml-[4.5rem]">
                                <Calendar size={12} className="text-text-subtle" />
                                <span className="text-[10px] font-bold uppercase text-text-subtle tracking-widest">{driver.insurance_expiry}</span>
                            </div>
                        )}
                    </div>
                    {driver.insurance_file && (
                        <button onClick={() => downloadAttachment(driver.insurance_file, `Insurance_${driver.name}`)} className="p-3 rounded-xl text-white bg-purple-500 hover:bg-purple-600 transition-all shadow-md mt-auto">
                            <DownloadCloud size={20} />
                        </button>
                    )}
                </Card>
            </div>

            {/* Permits Section */}
            {permits.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase text-text-subtle tracking-widest">{isAr ? 'التصاريح والمناطق اللوجستية' : 'Logistics Access & Permits'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {permits.map((p, idx) => (
                            <div key={idx} className="p-4 bg-surface-subtle rounded-2xl border border-border flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-emerald-500 shadow-sm"><Navigation size={14} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-text-main uppercase">{p.no}</p>
                                        <p className="text-[9px] font-bold text-text-subtle uppercase">{p.zone}</p>
                                    </div>
                                </div>
                                {p.fileData && (
                                    <button onClick={() => downloadAttachment(p.fileData, p.fileName)} className="p-2 rounded-xl text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all opacity-0 group-hover:opacity-100">
                                        <DownloadCloud size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Activity Trail (Trip History) */}
            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-text-subtle">
                            <Clock size={16} /> {isAr ? 'السجل التشغيلي الكامل' : 'Full Operational History'}
                        </h4>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start sm:self-auto">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-surface border border-border text-xs font-bold rounded-xl px-4 py-2 text-text-subtle outline-none focus:border-primary transition-colors cursor-pointer"
                            >
                                <option value="ALL">{isAr ? 'كل الأشهر' : 'All Months'}</option>
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>

                            <div className="flex bg-surface p-1 rounded-2xl border border-border">
                                {(['COMPLETED', 'ISSUES', 'CANCELLED'] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setHistoryTab(t)}
                                        className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${historyTab === t ? 'bg-primary text-white shadow-sm' : 'text-text-subtle hover:text-primary'}`}
                                    >
                                        {t === 'COMPLETED' ? (isAr ? 'مكتملة' : 'Records') :
                                            t === 'ISSUES' ? (isAr ? 'مشكلات' : 'Disputed') :
                                                (isAr ? 'ملغاة' : 'Aborted')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
                            {isAr ? 'إجمالي السجلات للفترة المحددة:' : 'Total records for selected period:'}
                        </span>
                        <span className="text-xs font-black text-primary px-2 py-0.5 rounded-md bg-primary/10">
                            {filteredTrips.length}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {filteredTrips.length === 0 ? (
                        <div className="p-12 text-center bg-surface rounded-[2rem] border border-dashed border-border">
                            <Activity size={32} className="mx-auto text-text-subtle/20 mb-4" />
                            <p className="text-xs font-bold text-text-subtle/40 uppercase tracking-widest">{isAr ? 'لا توجد سجلات في هذا القسم' : 'No operational history found'}</p>
                        </div>
                    ) : (
                        paginatedTrips.map((trip, idx) => {
                            const proj = projects.find(p => p.project_id === trip.project_id);
                            const hasIssue = !!trip.issue_notes || trip.status === 'CANCELLED' || trip.status === 'PENDING_REVIEW';

                            return (
                                <div key={trip.trip_id || idx} className={`flex gap-4 p-5 rounded-3xl items-center border transition-all group ${hasIssue ? 'bg-rose-50/10 border-rose-200/30' : 'bg-surface border-border hover:border-primary/50'}`}>
                                    <div className={`p-4 rounded-2xl flex-shrink-0 border transition-transform group-hover:scale-110 ${hasIssue ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-surface-subtle text-primary border-border/50'}`}>
                                        <Truck size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{trip.trip_id || 'TRIP'}</p>
                                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${trip.status === 'COMPLETED' ? 'bg-emerald-500 text-white' :
                                                        trip.status === 'CANCELLED' ? 'bg-rose-500 text-white' :
                                                            'bg-amber-500 text-white'
                                                    }`}>
                                                    {trip.status}
                                                </span>
                                            </div>
                                            {(trip.trip_location_url || trip.request_location_url) && (
                                                <a
                                                    href={trip.trip_location_url || trip.request_location_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:scale-125 transition-transform"
                                                >
                                                    <MapPin size={18} />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-lg font-black text-text-main truncate w-full">{proj?.project_name || 'Project Operation'}</p>

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest flex items-center gap-1"><Clock size={10} /> {formatDate(trip.date)} {trip.time}</p>
                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest flex items-center gap-1"><Scale size={10} /> {trip.quantity} {trip.unit}</p>
                                        </div>

                                        {trip.issue_notes && (
                                            <div className="mt-3 p-3 bg-white dark:bg-surface-subtle border border-amber-200/30 rounded-2xl text-[11px] text-amber-700 font-bold leading-relaxed">
                                                ⚠️ {trip.issue_notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6" dir="ltr">
                        <Button
                            variant="secondary" size="sm" disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)} icon={ChevronLeft}
                        />
                        <div className="flex gap-1">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-subtle hover:text-primary'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <Button
                            variant="secondary" size="sm" disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)} icon={ChevronRight}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverDetails;
