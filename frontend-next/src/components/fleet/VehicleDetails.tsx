import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Truck, Scale, Activity, Briefcase,
    Shield, DownloadCloud, Edit2, Zap, Building2, History,
    CheckCircle2, AlertCircle, FileCheck, MapPin, ExternalLink, CalendarDays, Search,
    Printer, FileImage, FileText, HardHat, Sparkles
} from 'lucide-react';
import { Card, StatCard, Button, Badge, Input } from '@/components';
import { Vehicle, Trip, Project, PermitEntry, DocumentStatus } from '@/types';
import { formatDate, resolveImagePath } from '@/utils/helpers';
import { printVehicleDossier } from '@/utils/exportHelpers';
import { useStore } from '@/context';
import VehicleProgress, { calculateVehicleProgress } from './VehicleProgress';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

interface VehicleDetailsProps {
    vehicle: Vehicle;
    trips: Trip[];
    projects: Project[];
    isAr: boolean;
    onEdit: () => void;
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({
    vehicle,
    trips,
    projects,
    isAr,
    onEdit
}) => {
    const { saasConfig, services, assetServiceLinks, drivers } = useStore();
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

    const analyticsData = (() => {
        if (!vehicle?.vehicle_id) return {
            trips: [], tonnage: 0, projectsCount: 0,
            avgLoad: 0, chartData: [], utilizationData: [], primaryServiceName: ''
        };

        const linkedLinks = assetServiceLinks.filter(l => l.asset_type === 'VEHICLE' && l.asset_id === vehicle.vehicle_id);
        const primaryService = services.find(s => s.service_id === linkedLinks[0]?.service_id);

        const tripsList = (trips || []).filter(t => t.vehicle_id === vehicle.vehicle_id);
        const tonnage = tripsList.reduce((sum, t) => sum + parseFloat(t.quantity || '0'), 0);
        const avgLoad = tripsList.length > 0 ? (tonnage / tripsList.length) : 0;
        const projIds = new Set(tripsList.map(t => t.project_id));

        // Operational Velocity (Last 7 Days)
        const dayTrend = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0] || '';
            const dayTrips = tripsList.filter(t => t.date === ds);
            const dayTonnage = dayTrips.reduce((sum, t) => sum + parseFloat(t.quantity || '0'), 0);
            return { date: formatDate(ds, 'yyyy-MM-dd', isAr), tonnage: dayTonnage, count: dayTrips.length };
        }).reverse();

        // Utilization Data (Workload Distribution)
        const last30Days = [...Array(30)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0] || '';
        });

        const activeDays = last30Days.filter(date => tripsList.some(t => t.date === date)).length;
        const utilizationRate = (activeDays / 30) * 100;

        return {
            trips: tripsList, tonnage, projectsCount: projIds.size,
            avgLoad, chartData: dayTrend, utilizationRate,
            primaryServiceName: primaryService?.service_name || ''
        };
    })();

    const permits: PermitEntry[] = useMemo(() => {
        try {
            return JSON.parse(vehicle.permit_zones || '[]');
        } catch {
            return [];
        }
    }, [vehicle.permit_zones]);

    const handleDownload = (permit: PermitEntry) => {
        if (!permit.fileData) return;
        const link = document.createElement('a');
        link.href = resolveImagePath(permit.fileData);
        link.download = permit.fileName || 'permit_doc';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const documents = useMemo(() => {
        if (Array.isArray(vehicle.documents)) return vehicle.documents;
        const documentsValue = (vehicle as { documents?: unknown }).documents;
        if (typeof documentsValue === 'string') {
            try {
                const parsed = JSON.parse(documentsValue);
                return Array.isArray(parsed) ? parsed : [];
            } catch { return []; }
        }
        return [];
    }, [vehicle.documents]);
    const [docSearch, setDocSearch] = useState('');

    const filteredDocs = useMemo(() => {
        return documents.filter(doc =>
            doc.type.toLowerCase().includes(docSearch.toLowerCase()) ||
            doc.number.toLowerCase().includes(docSearch.toLowerCase())
        );
    }, [documents, docSearch]);

    const activeDocsCount = documents.filter(d => d.status === DocumentStatus.ACTIVE).length;
    const expiringDocsCount = documents.filter(d => d.status === DocumentStatus.NEAR_EXPIRY).length;
    const expiredDocsCount = documents.filter(d => d.status === DocumentStatus.EXPIRED).length;

    const exportToPrint = () => {
        const progress = calculateVehicleProgress(documents);
        printVehicleDossier(vehicle, analyticsData, isAr, saasConfig?.templateConfig, progress);
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-6">
            {/* Unit Identity Header - Tech UI */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-primary-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                <div className="relative flex flex-col md:flex-row items-center gap-8 p-10 bg-surface rounded-[2.5rem] border-2 border-border shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                    <div className="w-28 h-28 bg-text-main text-primary-400 rounded-[2rem] flex items-center justify-center shadow-2xl border-2 border-border">
                        <Truck size={56} strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 text-center md:text-left rtl:md:text-right">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                            <h3 className="text-5xl font-black text-text-main tracking-widest uppercase">
                                {vehicle.plate_no}
                            </h3>
                            <div className="flex justify-center gap-3">
                                <Badge variant={vehicle.ownership_type === 'INTERNAL' ? 'emerald' : 'amber'} className="font-black px-4 py-1.5 border-2 border-surface shadow-sm">
                                    {vehicle.ownership_type === 'INTERNAL' ? (isAr ? 'أسطول GCM الداخلي' : 'GCM INTERNAL FLEET') : (isAr ? 'أسطول مورد خارجي' : 'SUB-CONTRACTOR UNIT')}
                                </Badge>
                                <Badge variant={vehicle.status === 'ACTIVE' ? 'primary' : 'rose'} className="font-black px-4 py-1.5 border-2 border-surface shadow-sm">
                                    {vehicle.status}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-5 mt-4">
                            <div className="flex items-center gap-2 text-xs font-black text-text-subtle uppercase tracking-widest bg-surface-subtle px-4 py-1.5 rounded-full border border-border">
                                <Zap size={14} className="text-amber-500" />
                                {vehicle.vehicle_type}
                            </div>
                            {vehicle.ownership_type === 'SUPPLIER' && (
                                <>
                                    <span className="hidden md:block w-1 h-1 rounded-full bg-border" />
                                    <Link
                                        href={`/sup?search=${encodeURIComponent(vehicle.supplier_name || '')}`}
                                        className="flex items-center gap-2 text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest hover:text-primary-500 transition-colors group/link"
                                    >
                                        <Building2 size={14} />
                                        <span>{vehicle.supplier_name || 'Partner'}</span>
                                        <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                    </Link>
                                </>
                            )}
                            {(() => {
                                const linkedDriver = drivers.find(d => d.vehicle_id === vehicle.vehicle_id && d.status === 'ACTIVE');
                                const linkedLinks = assetServiceLinks.filter(l => l.asset_type === 'VEHICLE' && l.asset_id === vehicle.vehicle_id);
                                const primaryService = services.find(s => s.service_id === linkedLinks[0]?.service_id);

                                return (
                                    <>
                                        {linkedDriver && (
                                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50/80 text-emerald-600 border border-emerald-200">
                                                <HardHat size={14} /> {linkedDriver.name}
                                            </div>
                                        )}
                                        {primaryService && (
                                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50/80 text-indigo-600 border border-indigo-200">
                                                <Sparkles size={14} /> {primaryService.service_name}
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    </div>

                    {/* Embedded Progress Chart Widget */}
                    <div className="md:w-64 shrink-0 bg-surface-subtle border-2 border-border p-5 rounded-[1.5rem] shadow-sm">
                        <VehicleProgress vehicle={vehicle} isAr={isAr} showDetails={false} />
                    </div>
                </div>
            </div>

            {/* Visual Identity Preview */}
            {(vehicle.photo_front || vehicle.photo_back) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-700">
                    {vehicle.photo_front && (
                        <div className="relative group rounded-[2.5rem] overflow-hidden border-2 border-border shadow-md aspect-video bg-surface">
                            <Image src={vehicle.photo_front} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={isAr ? 'مشهد أمامي للمعدة' : 'Vehicle front view'} fill sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                            <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                <p className="text-[10px] font-black text-white uppercase tracking-widest">{isAr ? 'مشهد أمامي' : 'Front Viewport'}</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                    {vehicle.photo_back && (
                        <div className="relative group rounded-[2.5rem] overflow-hidden border-2 border-border shadow-md aspect-video bg-surface">
                            <Image src={vehicle.photo_back} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={isAr ? 'مشهد خلفي للمعدة' : 'Vehicle rear view'} fill sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                            <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                <p className="text-[10px] font-black text-white uppercase tracking-widest">{isAr ? 'مشهد خلفي' : 'Rear Viewport'}</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </div>
            )}

            {/* Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Operational Tonnage Trend */}
                <Card className="p-8 bg-surface border-2 border-border rounded-[2.5rem] overflow-hidden relative shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl rounded-full" />
                    <h4 className="text-[11px] font-black uppercase text-text-subtle flex items-center gap-3 mb-8 tracking-[0.2em]">
                        <Activity size={18} className="text-primary-600" />
                        {isAr ? 'منحنى الحمولة الأسبوعي' : 'Weekly Operational Velocity'}
                    </h4>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData.chartData}>
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <ReTooltip
                                    contentStyle={{
                                        borderRadius: '20px',
                                        border: 'none',
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                        padding: '16px',
                                        color: '#fff'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="tonnage" stroke="var(--primary-color)" fillOpacity={0.1} fill="var(--primary-color)" strokeWidth={4} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'إجمالي حمولة الأسبوع' : 'Weekly Tonnage Sum'}</p>
                        <p className="text-sm font-black text-primary-500">{analyticsData.tonnage.toFixed(1)} TON</p>
                    </div>
                </Card>

                {/* Logistics Frequency & Efficiency */}
                <div className="space-y-6">
                    <Card className="p-8 bg-surface border-2 border-border shadow-sm rounded-[2.5rem] overflow-hidden">
                        <h4 className="text-[11px] font-black uppercase text-text-subtle flex items-center gap-3 mb-8 tracking-[0.2em]">
                            <History size={18} className="text-blue-500" />
                            {isAr ? 'تواتر الرحلات اليومي' : 'Trip Frequency Hub'}
                        </h4>
                        <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.chartData}>
                                    <ReTooltip
                                        cursor={{ fill: 'var(--primary-color)', opacity: 0.1 }}
                                        contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }}
                                    />
                                    <Bar dataKey="count" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="p-8 bg-text-main border-2 border-border text-surface rounded-[2.5rem] overflow-hidden relative group shadow-2xl">
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary-500/10 blur-[80px] rounded-full group-hover:scale-150 transition-transform duration-1000" />
                        <h4 className="text-[11px] font-black uppercase text-surface opacity-50 flex items-center gap-3 mb-8 tracking-[0.2em]">
                            <Scale size={18} className="text-primary-400" />
                            {isAr ? 'كفاءة التشغيل (30 يوم)' : 'Operational Efficiency (L30D)'}
                        </h4>

                        <div className="space-y-8">
                            <div>
                                <div className="flex items-end justify-between mb-3 text-xs font-black uppercase tracking-widest">
                                    <span className="text-surface opacity-70">{isAr ? 'معدل الاستخدام النشط' : 'Active Utilization'}</span>
                                    <span className="text-primary-400 text-lg">{(analyticsData.utilizationRate ?? 0).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                                    <div
                                        className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${analyticsData.utilizationRate ?? 0}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                                    <p className="text-[9px] font-black text-surface opacity-50 uppercase tracking-widest mb-1">{isAr ? 'متوسط الحمولة/رحلة' : 'Avg. Load / Trip'}</p>
                                    <p className="text-xl font-black text-surface">{analyticsData.avgLoad.toFixed(1)} <span className="text-[10px] text-surface opacity-50">TON</span></p>
                                </div>
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                                    <p className="text-[9px] font-black text-surface opacity-50 uppercase tracking-widest mb-1">{isAr ? 'التصنيف التشغيلي' : 'Ops Rating'}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <span className="text-[10px] px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full font-black tracking-widest border border-primary-500/30">
                                            HIGH VELOCITY
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Performance KPIs - Rich Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard
                    title={isAr ? 'إجمالي الرحلات' : 'Total Logistics Output'}
                    value={analyticsData.trips.length}
                    icon={Activity}
                    variant="slate"
                    description={isAr ? 'سجل الرحلات المكتملة' : 'Verified trip manifests'}
                    className="border-2 border-border shadow-xl"
                />
                <StatCard
                    title={isAr ? 'إجمالي الحمولة' : 'Cumulative Tonnage'}
                    value={analyticsData.tonnage.toFixed(1)}
                    icon={Scale}
                    variant="blue"
                    unit="TON"
                    description={isAr ? 'إجمالي المواد المنقولة' : 'Total handled weight'}
                    className="border-2 border-border shadow-xl"
                />
                <StatCard
                    title={isAr ? 'المشاريع المغطاة' : 'Project Ecosystem'}
                    value={analyticsData.projectsCount}
                    icon={Briefcase}
                    variant="purple"
                    description={isAr ? 'مواقع العمل النشطة' : 'Across different sites'}
                    className="border-2 border-border shadow-xl"
                />
            </div>

            {/* Document Intelligence Section */}
            <div className="bg-surface p-10 rounded-[2.5rem] border-2 border-border shadow-sm space-y-8">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h4 className="text-lg font-black uppercase text-text-main flex items-center gap-3 tracking-[0.2em]">
                            <Shield size={24} className="text-primary-600" />
                            {isAr ? 'مركز المستندات والجاهزية' : 'Document Intelligence & Readiness Hub'}
                        </h4>
                        <p className="text-xs font-bold text-text-subtle uppercase tracking-widest">
                            {isAr ? 'إدارة الهوية والامتثال للتشغيل' : 'Identity Management & Operational Compliance'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 bg-surface-subtle p-2 rounded-2xl border border-border">
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs">
                            <CheckCircle2 size={16} /> <span>{activeDocsCount} {isAr ? 'فعال' : 'Active'}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-black text-xs">
                            <AlertCircle size={16} /> <span>{expiringDocsCount} {isAr ? 'قريبا' : 'Expiring'}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-xs">
                            <AlertCircle size={16} /> <span>{expiredDocsCount} {isAr ? 'منتهي' : 'Expired'}</span>
                        </div>
                    </div>
                </div>

                {/* Document List View */}
                <div className="space-y-4">
                    <div className="flex justify-end mb-4">
                        <div className="w-full md:w-64">
                            <Input
                                placeholder={isAr ? 'ابحث عن مستند...' : 'Search documents...'}
                                icon={Search}
                                value={docSearch}
                                onChange={setDocSearch}
                                className="!rounded-2xl shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="bg-surface-subtle border border-border rounded-3xl overflow-hidden">
                        <table className="w-full text-left rtl:text-right">
                            <thead className="bg-surface border-b border-border text-[9px] uppercase tracking-widest font-black text-text-subtle">
                                <tr>
                                    <th className="p-5">{isAr ? 'نوع المستند' : 'Document Type'}</th>
                                    <th className="p-5">{isAr ? 'رقم المستند' : 'ID Number'}</th>
                                    <th className="p-5">{isAr ? 'الانتهاء' : 'Expiry Date'}</th>
                                    <th className="p-5">{isAr ? 'الحالة' : 'Status'}</th>
                                    <th className="p-5 text-center">{isAr ? 'الوزن' : 'Weight'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredDocs.map((doc, idx) => (
                                    <tr key={idx} className="hover:bg-surface transition-colors">
                                        <td className="p-5 font-bold text-sm text-text-main flex items-center gap-3">
                                            <FileCheck size={18} className="text-primary-500" />
                                            {doc.type}
                                        </td>
                                        <td className="p-5 font-mono text-xs">{doc.number || '-'}</td>
                                        <td className="p-5 text-xs font-bold text-text-subtle">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays size={14} />
                                                {doc.expiry_date ? formatDate(doc.expiry_date, 'yyyy-MM-dd', isAr) : '-'}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <Badge
                                                variant={doc.status === DocumentStatus.ACTIVE ? 'emerald' : doc.status === DocumentStatus.NEAR_EXPIRY ? 'amber' : 'rose'}
                                                className="!text-[10px] uppercase font-black tracking-widest"
                                            >
                                                {doc.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="p-5 text-center font-black text-primary-500 text-xs text-opacity-70">
                                            {doc.progress_weight}%
                                        </td>
                                    </tr>
                                ))}
                                {filteredDocs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-text-subtle text-xs font-bold uppercase tracking-widest opacity-60">
                                            {isAr ? 'لا توجد بيانات مطابقة' : 'No documents found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Technical Documents & Permits (Legacy) */}
            <div className="bg-surface p-10 rounded-[2.5rem] border-2 border-border shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h4 className="text-sm font-black uppercase text-text-main flex items-center gap-3 tracking-[0.2em]">
                        <Shield size={20} className="text-primary-600" />
                        {isAr ? 'التصاريح والمصفوفة اللوجستية' : 'Security Permits & Ops Matrix'}
                    </h4>
                    <span className="bg-surface-subtle border border-border px-4 py-2 rounded-xl text-[10px] font-black text-text-subtle">
                        {permits.length} ACTIVE CERTIFICATES
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {permits.map((p, i) => (
                        <div key={i} className="group flex items-center justify-between p-6 bg-surface-subtle rounded-[2rem] border-2 border-border hover:border-primary-500/50 transition-all hover:shadow-2xl hover:shadow-primary-500/5">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center text-primary-600 shadow-md group-hover:bg-primary-600 group-hover:text-white transition-all border border-border">
                                    <FileCheck size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-text-main uppercase mb-1 tracking-widest">{p.no}</p>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={12} className="text-text-subtle" />
                                        <p className="text-[11px] font-bold text-text-subtle uppercase tracking-tight">{p.zone}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex items-center justify-between p-5 bg-primary-500/20 rounded-2xl border-2 border-primary-500/40 shadow-lg shadow-primary-500/10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary-500 text-white rounded-xl shadow-lg">
                                        <Zap size={20} fill="currentColor" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Ops Rating</p>
                                        <p className="text-sm font-black text-white">{isAr ? 'عالية الكفاءة' : 'HIGH PERFORMANCE'}</p>
                                    </div>
                                </div>
                                <div className="text-3xl font-black text-primary-400 italic">
                                    94%
                                </div>
                            </div>
                            {p.fileData && (
                                <button
                                    onClick={() => handleDownload(p)}
                                    className="p-3 bg-surface rounded-xl text-primary-600 hover:bg-primary-500 hover:text-white transition-all shadow-sm border border-border"
                                >
                                    <DownloadCloud size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                    {permits.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center bg-surface-subtle rounded-3xl border-2 border-dashed border-border text-center">
                            <AlertCircle size={32} className="text-text-subtle opacity-30 mb-2" />
                            <p className="text-[10px] font-black text-text-subtle uppercase tracking-widest">
                                {isAr ? 'لا توجد تصاريح نشطة مسجلة' : 'No active permits found for this unit'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Target rendering appendix items */}
            {documents.some(d => d.fileData) && (
                <div className="bg-surface p-10 rounded-[2.5rem] border-2 border-border shadow-sm mt-8 break-before-page">
                    <h4 className="text-sm font-black uppercase text-text-main flex items-center gap-3 tracking-[0.2em] mb-8">
                        <FileImage size={20} className="text-primary-600" />
                        {isAr ? 'مرفقات المستندات الرسمية (للطباعة)' : 'Official PDF / Image Appendices'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {documents.filter(d => d.fileData).map((doc, idx) => {
                            const isPdf = doc.fileData?.startsWith('data:application/pdf') || doc.fileName?.toLowerCase().endsWith('.pdf');
                            return (
                                <div key={idx} className="space-y-4">
                                    <h5 className="text-xs font-black uppercase tracking-widest text-text-subtle">{doc.type} {doc.number ? `- ${doc.number}` : ''}</h5>
                                    <div className="border border-border rounded-3xl overflow-hidden shadow-sm bg-surface-subtle p-2">
                                        {!isPdf ? (
                                            <Image src={doc.fileData || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='} alt={doc.type} className="w-full h-auto rounded-2xl" width={1200} height={900} unoptimized />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-8 bg-surface rounded-2xl border-2 border-dashed border-border min-h-[200px]">
                                                <FileText size={48} className="text-primary-400 mb-4" />
                                                <p className="text-sm font-bold text-text-main text-center">{doc.fileName || 'Document.pdf'}</p>
                                                <p className="text-xs text-text-subtle mt-2 mb-4 text-center">{isAr ? 'مستند PDF مرفق' : 'Attached PDF Document'}</p>
                                                <a
                                                    href={doc.fileData}
                                                    download={doc.fileName || 'document.pdf'}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-black tracking-widest hover:bg-primary-600 transition-colors"
                                                >
                                                    <DownloadCloud size={14} /> {isAr ? 'تحميل وعرض المستند' : 'Download Document'}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div data-html2canvas-ignore="true" className="pt-4 flex flex-col md:flex-row gap-4 print:hidden">
                <Button
                    variant="primary"
                    onClick={onEdit}
                    className="flex-1 py-6 rounded-3xl shadow-xl shadow-primary-500/20 text-xs font-black uppercase tracking-widest gap-3"
                    icon={Edit2}
                >
                    {isAr ? 'تعديل البيانات ودخول هندسة البيانات' : 'Access Data Engineering & Edit Unit'}
                </Button>
                <Button
                    variant="primary"
                    className="md:w-auto w-full shadow-lg shadow-primary-500/20"
                    icon={Printer}
                    onClick={exportToPrint}
                >
                    {isAr ? 'طباعة تقرير الوحدة الشامل' : 'Print Comprehensive Dossier'}
                </Button>
            </div>
        </div>
    );
};

export default VehicleDetails;
