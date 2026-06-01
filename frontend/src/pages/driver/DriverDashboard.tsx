import React, { useMemo, useState, useCallback } from 'react';
import { useStore } from '@/context';
import { TripStatus, Role } from '@/types';
import { Card, Modal, Button } from '@/components';
import { Truck, Camera, CheckCircle2, MapPin, Package, Clock, AlertCircle, Shield, Scale, X, Activity, Users, RefreshCcw } from 'lucide-react';
import { formatTripStatusByRole } from '@/utils/helpers';
import { addDays, isBefore, isToday, isSameMonth, parseISO, isYesterday, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { DriverTripWizard } from '@/components';

import { FileText, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { generateBulkPdf } from '@/utils/exportHelpers';
import { useLookupMaps } from '@/hooks/useLookupMaps';
const STATUS_FLOW: TripStatus[] = [
    TripStatus.ASSIGNED,
    TripStatus.EN_ROUTE,
    TripStatus.LOADING,
    TripStatus.PENDING_APPROVAL,
    TripStatus.IN_PROGRESS,
    TripStatus.PENDING_DOCS
];

const DriverDashboard: React.FC = () => {
    const { saasConfig, trips, projects, drivers, currentUser, users, vehicles, services, companies, suppliers, facilities, loadAllData } = useStore();
    const isAr = saasConfig.language === 'ar';
    const isSuperUser = [Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try { await loadAllData(); } finally { setIsRefreshing(false); }
    }, [loadAllData]);

    const getSupervisorPhone = (name?: string) => {
        if (!name) return null;
        return users.find(u => u.name === name)?.phone || null;
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [isVehicleDocsOpen, setIsVehicleDocsOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<{ url: string, title: string } | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const myDriverProfile = useMemo(() => {
        const matches = drivers.filter(d => {
            if (d.user_id === currentUser.id) return true;
            if (currentUser.name && d.name && d.name.toLowerCase() === currentUser.name.toLowerCase()) return true;
            if (currentUser.phone && d.phone && d.phone === currentUser.phone) return true;
            if (d.driver_id === currentUser.id) return true;
            return false;
        });
        if (matches.length === 0) return undefined;
        if (matches.length === 1) return matches[0];
        // Multiple matches — pick the most complete record (has permits/files/dates)
        return matches.reduce((best, d) => {
            const score = (d2: typeof d) => {
                let s = 0;
                if (d2.permit_zones && d2.permit_zones !== '[]') s += 10;
                if (d2.license_file) s += 3;
                if (d2.iqama_file) s += 3;
                if (d2.operating_card_file) s += 3;
                if (d2.insurance_file) s += 3;
                if (d2.license_expiry) s += 1;
                if (d2.iqama_expiry) s += 1;
                if (d2.operating_card_expiry) s += 1;
                if (d2.insurance_expiry) s += 1;
                if (d2.user_id === currentUser.id) s += 5; // Prefer user_id match
                return s;
            };
            return score(d) > score(best) ? d : best;
        });
    }, [drivers, currentUser]);

    const myVehicle = useMemo(() => {
        if (!myDriverProfile?.vehicle_id) return undefined;
        return vehicles.find(v => v.vehicle_id === myDriverProfile?.vehicle_id);
    }, [myDriverProfile, vehicles]);

    const permits = useMemo(() => {
        if (!myDriverProfile?.permit_zones) return [];
        if (Array.isArray(myDriverProfile.permit_zones)) return myDriverProfile.permit_zones;
        try {
            const parsed = JSON.parse(myDriverProfile.permit_zones);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, [myDriverProfile]);

    const handleViewDoc = (fileUrl?: string, title?: string) => {
        if (!fileUrl) return;
        setPreviewFile({ url: fileUrl, title: title || 'Document' });
    };

    const handleDownloadDoc = () => {
        if (!previewFile) return;
        const a = document.createElement('a');
        a.href = previewFile.url;
        a.download = `${previewFile.title}.png`; // Most uploads are images
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setPreviewFile(null);
    };

    const checkDocumentStatus = (expiryDate?: string) => {
        if (!expiryDate) return { status: 'MISSING', text: isAr ? 'غير مسجل' : 'Missing', color: 'bg-slate-100 text-slate-500' };
        const expiry = new Date(expiryDate);
        const now = new Date();
        if (isBefore(expiry, now)) return { status: 'EXPIRED', text: isAr ? 'منتهي' : 'Expired', color: 'bg-rose-100 text-rose-600' };
        if (isBefore(expiry, addDays(now, 30))) return { status: 'WARNING', text: isAr ? 'ينتهي قريباً' : 'Expiring Soon', color: 'bg-amber-100 text-amber-600' };
        return { status: 'VALID', text: isAr ? 'ساري' : 'Valid', color: 'bg-emerald-100 text-emerald-600' };
    };

    // Export handler
    const handleActionExport = async (trip: any) => {
        setIsGeneratingPdf(true);
        try {
            await generateBulkPdf(
                [trip],
                projects, drivers, vehicles, services, companies, suppliers, facilities,
                isAr, {
                includeSummary: false,
                includeManifest: false,
                includeDeliveryNote: true,
                includeRecycleReceipt: false,
                includeProofImages: true,
                accentColor: '#10b981'
            }, saasConfig?.templateConfig
            );
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Role guard
    if (![Role.DRIVER, Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role)) {
        return <div className="text-center py-16 text-text-subtle font-bold">{isAr ? 'غير مصرح' : 'Unauthorized'}</div>;
    }

    // Store's filteredTrips is already secured and role-aware.
    // Trust it directly to avoid double-filtering with missing User/Driver entities.
    const myTrips = trips;

    const allActive = useMemo(() =>
        myTrips.filter(t => STATUS_FLOW.includes(t.status)).sort((a, b) => {
            const ia = STATUS_FLOW.indexOf(a.status);
            const ib = STATUS_FLOW.indexOf(b.status);
            if (ia !== ib) return ia - ib;

            const pMap: Record<string, number> = { 'URGENT': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 };
            const pa = pMap[a.priority || 'NORMAL'];
            const pb = pMap[b.priority || 'NORMAL'];
            if (pa !== pb) return pa - pb;

            return (a.date || '').localeCompare(b.date || '');
        }), [myTrips]);

    const activeMission = useMemo(() =>
        allActive.find(t => [TripStatus.EN_ROUTE, TripStatus.LOADING, TripStatus.PENDING_APPROVAL, TripStatus.IN_PROGRESS, TripStatus.PENDING_DOCS].includes(t.status)),
        [allActive]);

    const pendingApprovalTrips = useMemo(() =>
        allActive.filter(t => t.status === TripStatus.PENDING_APPROVAL),
        [allActive]);

    const transitionTrips = useMemo(() =>
        allActive.filter(t => [TripStatus.IN_PROGRESS, TripStatus.PENDING_DOCS].includes(t.status)),
        [allActive]);

    const completedTrips = useMemo(() =>
        myTrips.filter(t => [TripStatus.PENDING_DOCS, TripStatus.COMPLETED].includes(t.status)),
        [myTrips]);

    const issuesTrips = useMemo(() =>
        myTrips.filter(t => !!t.issue_notes || t.status === TripStatus.PENDING_REVIEW),
        [myTrips]);

    const cancelledTrips = useMemo(() =>
        myTrips.filter(t => t.status === TripStatus.CANCELLED),
        [myTrips]);

    const stats = useMemo(() => {
        const now = new Date();
        const todayTrips = completedTrips.filter(t => {
            try { return isToday(parseISO(t.date || '')); } catch { return false; }
        }).length;
        const monthTrips = completedTrips.filter(t => {
            try { return isSameMonth(parseISO(t.date || ''), now); } catch { return false; }
        }).length;

        let expiringCount = 0;
        if (myDriverProfile) {
            [myDriverProfile.iqama_expiry, myDriverProfile.license_expiry, myDriverProfile.operating_card_expiry, myDriverProfile.insurance_expiry].forEach(exp => {
                if (exp && (checkDocumentStatus(exp).status === 'WARNING' || checkDocumentStatus(exp).status === 'EXPIRED')) expiringCount++;
            });
        }
        if (permits && Array.isArray(permits)) {
            permits.forEach((p: any) => {
                if (p.expiry && (checkDocumentStatus(p.expiry).status === 'WARNING' || checkDocumentStatus(p.expiry).status === 'EXPIRED')) expiringCount++;
            });
        }

        return {
            today: todayTrips,
            month: monthTrips,
            expiring: expiringCount,
            issues: issuesTrips.length
        };
    }, [completedTrips, issuesTrips, myDriverProfile, permits]);

    const [historyTab, setHistoryTab] = useState<'COMPLETED' | 'ISSUES' | 'CANCELLED'>('COMPLETED');
    const [periodTab, setPeriodTab] = useState<'TODAY' | 'YESTERDAY' | 'LAST_WEEK' | 'CUSTOM_RANGE'>('TODAY');
    const [customDateStart, setCustomDateStart] = useState('');
    const [customDateEnd, setCustomDateEnd] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const TRIPS_PER_PAGE = 10;

    const { projectMap } = useLookupMaps();
    const getProjectName = (id: string) => projectMap[id]?.project_name || id;

    return (
        <div className="max-w-lg mx-auto space-y-6 pb-8">
            {/* Header */}
            <div className="text-center py-4">
                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 mx-auto mb-3">
                    <Truck size={28} />
                </div>
                <h1 className="text-2xl font-bold text-text-main">{isAr ? 'لوحة السائق' : 'Driver Dashboard'}</h1>
                <p className="text-sm text-text-subtle font-bold mt-1">
                    {activeMission ? (isAr ? 'في مهمة حالية' : 'On Active Mission') : (isAr ? 'مستعد لمهمة جديدة' : 'Ready for next assignment')}
                </p>
                <button onClick={handleRefresh} disabled={isRefreshing}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 hover:bg-primary-200 transition-all disabled:opacity-50"
                >
                    <RefreshCcw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                    {isAr ? 'تحديث' : 'Refresh'}
                </button>

                {/* Performance Dashboard */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/50">
                    <div className="p-4 bg-surface rounded-3xl border border-border/50 shadow-sm transition-transform hover:scale-[1.02]">
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'اكتملت هذا الشهر' : 'Month Trips'}</p>
                        <p className="text-2xl font-black text-primary">{stats.month}</p>
                    </div>
                    <div className="p-4 bg-surface rounded-3xl border border-border/50 shadow-sm transition-transform hover:scale-[1.02]">
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'اكتملت اليوم' : 'Today Trips'}</p>
                        <p className="text-2xl font-black text-emerald-500">{stats.today}</p>
                    </div>
                    <div className="p-4 bg-surface rounded-3xl border border-border/50 shadow-sm transition-transform hover:scale-[1.02]">
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'وثائق لزم التجديد' : 'Expiring Docs'}</p>
                        <p className={`text-2xl font-black ${stats.expiring > 0 ? 'text-amber-500' : 'text-text-subtle'}`}>{stats.expiring}</p>
                    </div>
                    <div className="p-4 bg-surface rounded-3xl border border-border/50 shadow-sm transition-transform hover:scale-[1.02]">
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'الشكاوي النشطة' : 'Issues'}</p>
                        <p className={`text-2xl font-black ${stats.issues > 0 ? 'text-rose-500' : 'text-text-subtle'}`}>{stats.issues}</p>
                    </div>
                </div>

                {/* Simple Analytics Visual */}
                <div className="mt-4 p-4 bg-surface rounded-3xl border border-border/50 text-start overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent blur-xl group-hover:bg-emerald-500/10 transition-colors" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-xs font-bold text-text-main">{isAr ? 'إنجاز مهام اليوم' : 'Today\'s Progress'}</p>
                            <p className="text-xs font-black text-emerald-600">{stats.today} / 4 <span className="text-[9px] text-text-subtle">{isAr ? 'رحلات (الهدف)' : 'Trips (Goal)'}</span></p>
                        </div>
                        <div className="w-full h-3 bg-surface-subtle border border-border/50 rounded-full overflow-hidden shadow-inner flex">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 ease-out flex items-center justify-end px-1"
                                style={{ width: `${Math.min((stats.today / 4) * 100, 100)}%` }}
                            >
                                {stats.today > 0 && <span className="w-1.5 h-1.5 bg-white rounded-full opacity-50 shadow-sm" />}
                            </div>
                        </div>
                        {stats.today >= 4 && (
                            <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                                <CheckCircle2 size={12} /> {isAr ? 'أحسنت! حققت التارجت اليومي.' : 'Great job! Daily target achieved.'}
                            </p>
                        )}
                        {stats.today === 3 && (
                            <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                                <Activity size={12} /> {isAr ? 'عاش بطل! باقي رحلة واحدة وتخلص تارجت اليوم.' : 'Almost there! Just 1 trip left.'}
                            </p>
                        )}
                        {stats.today < 3 && stats.today > 0 && (
                            <p className="text-[10px] font-bold text-text-subtle mt-2 flex items-center gap-1.5">
                                <Activity size={12} className="text-primary opacity-70" /> {isAr ? `متبقي ${4 - stats.today} رحلات لإكمال الهدف.` : `${4 - stats.today} trips left for daily goal.`}
                            </p>
                        )}
                    </div>
                </div>

                {isSuperUser && (
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-100 dark:bg-amber-900/20 px-2 py-0.5 rounded-full mt-2 inline-block">
                        {isAr ? 'وضع المشاهدة — مدير' : 'View Mode — SuperUser'}
                    </span>
                )}

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-base flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-xl shadow-indigo-500/30"
                    >
                        <div className="flex bg-white/20 p-2 rounded-full mb-1">
                            <Package size={20} />
                        </div>
                        {isAr ? 'مهمة جديدة' : 'New Mission'}
                    </button>

                    <button
                        onClick={() => setIsDocsOpen(true)}
                        className="w-full py-4 bg-surface hover:bg-surface-subtle border-2 border-border text-text-main rounded-[2rem] font-black text-base flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                    >
                        <div className="flex bg-text-subtle/10 text-primary p-2 rounded-full mb-1 relative">
                            <FileText size={20} />
                            {stats.expiring > 0 && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 ring-2 ring-surface rounded-full animate-pulse" />
                            )}
                        </div>
                        {isAr ? 'الوثائق والتصاريح' : 'My Documents'}
                    </button>

                    {myVehicle && (
                        <button
                            onClick={() => setIsVehicleDocsOpen(true)}
                            className="w-full py-4 bg-surface hover:bg-surface-subtle border-2 border-border text-text-main rounded-[2rem] font-black text-base flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                        >
                            <div className="flex bg-emerald-500/10 text-emerald-600 p-2 rounded-full mb-1">
                                <Truck size={20} />
                            </div>
                            {isAr ? 'مركبتي المخصصة' : 'My Vehicle'}
                        </button>
                    )}
                </div>
            </div>



            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center gap-2 text-sm font-bold">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Removed Active Mission section as requested */}

            {/* Pending Approvals Section */}
            {pendingApprovalTrips.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-amber-500 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Clock size={14} /> {isAr ? 'في انتظار الموافقة' : 'Waiting for Approval'}
                    </h2>
                    <div className="grid grid-cols-1 gap-3">
                        {pendingApprovalTrips.map(trip => (
                            <Card
                                key={trip.trip_id}
                                className="p-4 bg-amber-50/30 border-amber-200/50 !rounded-2xl cursor-pointer hover:bg-amber-50/50 transition-colors"
                                onClick={() => handleActionExport(trip)}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-bold text-text-main">{getProjectName(trip.project_id)}</p>
                                        <p className="text-[10px] text-text-subtle font-bold uppercase tracking-wider">{trip.trip_id} • {trip.date}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-100 px-3 py-1.5 rounded-full uppercase">
                                        <Clock size={12} /> {isAr ? 'قيد المراجعة' : 'Under Review'}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Driver no longer receives trip assignments from logistics. Driver only creates trips using DriverTripWizard. */}

            {/* Completed/History Section */}
            <div className="space-y-6 pt-10 border-t border-border/50">
                <div className="flex flex-col gap-4 px-2">
                    <h2 className="text-xs font-black text-text-subtle uppercase tracking-[0.2em] flex items-center gap-2">
                        <Calendar size={14} className="text-primary" />
                        {isAr ? 'سجل الرحلات حسب الفترة' : 'Trip History by Period'}
                    </h2>

                    {/* Period Tabs */}
                    <div className="flex overflow-x-auto gap-2 pb-1 -mx-1 px-1 scrollbar-hide">
                        {([
                            { key: 'TODAY' as const, labelAr: 'اليوم', labelEn: 'Today' },
                            { key: 'YESTERDAY' as const, labelAr: 'أمس', labelEn: 'Yesterday' },
                            { key: 'LAST_WEEK' as const, labelAr: 'الأسبوع الماضي', labelEn: 'Last Week' },
                            { key: 'CUSTOM_RANGE' as const, labelAr: 'تاريخ مخصص', labelEn: 'Custom Range' },
                        ]).map(tab => {
                            const isActive = periodTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => { setPeriodTab(tab.key); setCurrentPage(1); }}
                                    className={`px-4 py-2 rounded-2xl text-[11px] font-bold whitespace-nowrap transition-all border ${
                                        isActive
                                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105'
                                            : 'bg-surface border-border text-text-subtle hover:text-primary hover:border-primary/40'
                                    }`}
                                >
                                    {isAr ? tab.labelAr : tab.labelEn}
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom Date Range Inputs */}
                    {periodTab === 'CUSTOM_RANGE' && (
                        <div className="flex flex-col sm:flex-row gap-3 bg-surface p-3 rounded-2xl border border-border shadow-sm animate-in fade-in slide-in-from-top-2">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'من تاريخ' : 'From Date'}</label>
                                <input
                                    type="date"
                                    value={customDateStart}
                                    onChange={(e) => { setCustomDateStart(e.target.value); setCurrentPage(1); }}
                                    className="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'إلى تاريخ' : 'To Date'}</label>
                                <input
                                    type="date"
                                    value={customDateEnd}
                                    onChange={(e) => { setCustomDateEnd(e.target.value); setCurrentPage(1); }}
                                    className="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* Status Sub-tabs */}
                    <div className="flex bg-surface-subtle p-1 rounded-2xl border border-border self-start">
                        {(['COMPLETED', 'ISSUES', 'CANCELLED'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => { setHistoryTab(t); setCurrentPage(1); }}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${historyTab === t ? 'bg-surface text-primary shadow-sm' : 'text-text-subtle hover:text-primary'}`}
                            >
                                {t === 'COMPLETED' ? (isAr ? 'مكتملة' : 'Records') :
                                    t === 'ISSUES' ? (isAr ? 'مشكلات' : 'Disputed') :
                                        (isAr ? 'ملغاة' : 'Aborted')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filtered + Paginated Trips */}
                {(() => {
                    const now = new Date();
                    const baseTrips = historyTab === 'COMPLETED' ? completedTrips : historyTab === 'ISSUES' ? issuesTrips : cancelledTrips;

                    const filterByPeriod = (trips: typeof baseTrips) => {
                        return trips.filter(t => {
                            try {
                                const tripDate = parseISO(t.date || '');
                                switch (periodTab) {
                                    case 'TODAY':
                                        return isToday(tripDate);
                                    case 'YESTERDAY':
                                        return isYesterday(tripDate);
                                    case 'CUSTOM_RANGE': {
                                        if (!customDateStart && !customDateEnd) return true;
                                        if (customDateStart && tripDate < startOfDay(parseISO(customDateStart))) return false;
                                        if (customDateEnd && tripDate > endOfDay(parseISO(customDateEnd))) return false;
                                        return true;
                                    }
                                    case 'LAST_WEEK': {
                                        const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 0 });
                                        const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 0 });
                                        return isWithinInterval(tripDate, { start: lastWeekStart, end: lastWeekEnd });
                                    }
                                    default:
                                        return false;
                                }
                            } catch {
                                return false;
                            }
                        }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                    };

                    const periodTrips = filterByPeriod(baseTrips);
                    const totalPages = Math.max(1, Math.ceil(periodTrips.length / TRIPS_PER_PAGE));
                    const safePage = Math.min(currentPage, totalPages);
                    const paginatedTrips = periodTrips.slice((safePage - 1) * TRIPS_PER_PAGE, safePage * TRIPS_PER_PAGE);

                    return (
                        <>
                            {/* Results count */}
                            <div className="px-2 flex items-center justify-between">
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">
                                    {periodTrips.length > 0
                                        ? (isAr ? `${periodTrips.length} رحلة — صفحة ${safePage} من ${totalPages}` : `${periodTrips.length} trips — Page ${safePage} of ${totalPages}`)
                                        : (isAr ? 'لا توجد رحلات في هذه الفترة' : 'No trips in this period')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {paginatedTrips.length === 0 ? (
                                    <div className="p-12 text-center bg-surface-subtle/50 rounded-[2rem] border border-dashed border-border">
                                        <Activity size={32} className="mx-auto text-text-subtle/20 mb-4" />
                                        <p className="text-xs font-bold text-text-subtle/40 uppercase tracking-widest">{isAr ? 'لا توجد سجلات في هذه الفترة' : 'No records for this period'}</p>
                                    </div>
                                ) : (
                                    paginatedTrips.map(trip => (
                                        <Card
                                            key={trip.trip_id}
                                            className={`p-5 !rounded-[2rem] border-border group transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:ring-1 hover:ring-primary/30 hover:bg-surface ${historyTab === 'ISSUES' ? 'bg-amber-50/10' : historyTab === 'CANCELLED' ? 'bg-rose-50/10' : 'bg-surface-subtle/50'}`}
                                            onClick={() => handleActionExport(trip)}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${historyTab === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                        historyTab === 'ISSUES' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                            'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                    }`}>
                                                    {historyTab === 'COMPLETED' ? <CheckCircle2 size={24} /> :
                                                        historyTab === 'ISSUES' ? <AlertCircle size={24} /> :
                                                            <X size={24} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{trip.trip_id}</p>
                                                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${trip.status === 'COMPLETED' ? 'bg-emerald-500 text-white' :
                                                                trip.status === 'CANCELLED' ? 'bg-rose-500 text-white' :
                                                                    'bg-amber-500 text-white'
                                                            }`}>
                                                            {formatTripStatusByRole(trip.status, currentUser.role, isAr)}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-black text-text-main truncate group-hover:text-primary transition-colors">{getProjectName(trip.project_id)}</h3>

                                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                                        <span className="text-[10px] text-text-subtle font-bold uppercase flex items-center gap-1.5"><Clock size={12} /> {trip.date} • {trip.time}</span>
                                                        <span className="text-[10px] text-text-subtle font-bold uppercase flex items-center gap-1.5"><Scale size={12} /> {trip.quantity} {trip.unit}</span>
                                                    </div>

                                                    {trip.issue_notes && (
                                                        <div className="mt-4 p-3 bg-white dark:bg-surface border border-amber-200/50 rounded-2xl text-xs text-amber-700 dark:text-amber-400 font-bold leading-relaxed shadow-sm">
                                                            <p className="text-[9px] uppercase tracking-widest text-amber-600/60 mb-1">{isAr ? 'ملاحظات متعلقة بالشكوى' : 'Issue Artifact Notes'}:</p>
                                                            ⚠️ {trip.issue_notes}
                                                        </div>
                                                    )}

                                                    {(trip.trip_location_url || trip.request_location_url) && (
                                                        <a
                                                            href={trip.trip_location_url || trip.request_location_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="mt-4 inline-flex items-center gap-2 text-[10px] font-black text-primary hover:scale-105 transition-transform uppercase tracking-widest"
                                                        >
                                                            <MapPin size={12} /> {isAr ? 'مشاهدة موقع الرحلة' : 'GPS Proof Registry'}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-4">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={safePage <= 1}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface text-text-subtle hover:text-primary hover:border-primary/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                        .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                            if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('...');
                                            acc.push(p);
                                            return acc;
                                        }, [])
                                        .map((p, idx) =>
                                            p === '...' ? (
                                                <span key={`dots-${idx}`} className="text-xs text-text-subtle px-1">…</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    onClick={() => setCurrentPage(p)}
                                                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all border ${
                                                        safePage === p
                                                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                                            : 'bg-surface border-border text-text-subtle hover:text-primary hover:border-primary/40'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        )}

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={safePage >= totalPages}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface text-text-subtle hover:text-primary hover:border-primary/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                                    </button>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            <DriverTripWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
            />

            {/* Loading Overlay for PDF */}
            {isGeneratingPdf && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-surface p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-bold text-text-main">{isAr ? 'جاري تجهيز المستند...' : 'Generating Document...'}</p>
                    </div>
                </div>
            )}            {/* Documents & Permits Modal */}
            <Modal
                isOpen={isDocsOpen}
                onClose={() => setIsDocsOpen(false)}
                title={isAr ? 'وثائقي والتصاريح' : 'My Documents & Permits'}
                size="lg"
            >
                <div className="p-4 space-y-6">
                    {/* My Documents Section */}
                    <div className="space-y-4">
                        <h2 className="text-xs font-black text-text-subtle uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                            <Shield size={14} className="text-primary" /> {isAr ? 'وثائقي الرسمية' : 'My Documents'}
                        </h2>

                        {myDriverProfile ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { title: isAr ? 'الإقامة/الهوية' : 'Iqama/ID', no: myDriverProfile.iqama_no, expiry: myDriverProfile.iqama_expiry, icon: Users, file: myDriverProfile.iqama_file },
                                    { title: isAr ? 'رخصة القيادة' : 'License', no: myDriverProfile.license_no, expiry: myDriverProfile.license_expiry, icon: Camera, file: myDriverProfile.license_file },
                                    { title: isAr ? 'كارت التشغيل' : 'Operating Card', no: myDriverProfile.operating_card_no, expiry: myDriverProfile.operating_card_expiry, icon: Package, file: myDriverProfile.operating_card_file },
                                    { title: isAr ? 'التأمين' : 'Insurance', no: myDriverProfile.insurance_no, expiry: myDriverProfile.insurance_expiry, icon: Shield, file: myDriverProfile.insurance_file },
                                ].map((doc, idx) => {
                                    const { text, color } = checkDocumentStatus(doc.expiry);
                                    const hasFile = !!doc.file;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleViewDoc(doc.file, doc.title)}
                                            disabled={!hasFile}
                                            title={hasFile ? (isAr ? 'اضغط للتحميل / العرض' : 'Click to download') : (isAr ? 'لا يوجد ملف' : 'No file')}
                                            className={`p-4 bg-surface rounded-3xl border border-border/50 shadow-sm flex items-start gap-3 transition-transform text-start w-full ${hasFile ? 'hover:scale-[1.02] hover:border-primary/50 cursor-pointer active:scale-95' : 'opacity-80 cursor-not-allowed'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${hasFile ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-subtle'}`}>
                                                <doc.icon size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{doc.title}</p>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${color}`}>
                                                        {text}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-text-main truncate" dir="ltr">{doc.no || '---'}</p>
                                                <p className="text-[10px] text-text-subtle mt-1 font-mono">{doc.expiry || (isAr ? 'غير محدد' : 'N/A')}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-4">
                                <AlertCircle className="text-amber-500 shrink-0" size={24} />
                                <div>
                                    <h3 className="text-sm font-bold text-amber-800 dark:text-amber-500 mb-1">
                                        {isAr ? 'لا يوجد ملف موظف مرتبط' : 'No Driver Profile Linked'}
                                    </h3>
                                    <p className="text-xs text-amber-700 dark:text-amber-600/80">
                                        {isAr
                                            ? 'حساب المستخدِم الخاص بك غير مرتبط بملف سائق في النظام. يرجى التواصل مع مسؤول النظام لربط حسابك.'
                                            : 'Your user account is not linked to a driver record. Please contact your system administrator to link your profile.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Permits Section */}
                    {myDriverProfile && permits && permits.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-border">
                            <h2 className="text-xs font-black text-text-subtle uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                <Shield size={14} className="text-primary" /> {isAr ? 'التصاريح' : 'Permits'}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {permits.map((permit: any, idx: number) => {
                                    const hasFile = !!permit.fileData || !!permit.fileName;
                                    const { text: permitStatusText, color: permitStatusColor } = checkDocumentStatus(permit.expiry);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleViewDoc(permit.fileData || permit.fileName, permit.no || 'Permit')}
                                            disabled={!hasFile}
                                            title={hasFile ? (isAr ? 'اضغط للتحميل / العرض' : 'Click to download') : (isAr ? 'لا يوجد ملف' : 'No file')}
                                            className={`p-4 bg-surface rounded-3xl border border-border/50 shadow-sm flex items-center gap-3 transition-transform text-start w-full ${hasFile ? 'hover:scale-[1.02] hover:border-primary/50 cursor-pointer active:scale-95' : 'opacity-80 cursor-not-allowed'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${hasFile ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-subtle'}`}>
                                                <MapPin size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest leading-none">
                                                        {isAr ? 'رقم التصريح' : 'Permit No'}
                                                    </p>
                                                    {permit.expiry && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${permitStatusColor}`}>
                                                            {permitStatusText}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-bold text-text-main truncate" dir="ltr">{permit.no || '---'}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                        {permit.zone || (isAr ? 'منطقة عامة' : 'General Zone')}
                                                    </span>
                                                    {permit.expiry && (
                                                        <span className="text-[10px] text-text-subtle font-mono">{permit.expiry}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Vehicle Details Modal */}
            <Modal
                isOpen={isVehicleDocsOpen}
                onClose={() => setIsVehicleDocsOpen(false)}
                title={isAr ? 'مركبتي المخصصة' : 'My Assigned Vehicle'}
                size="lg"
            >
                <div className="p-4 space-y-6">
                    {myVehicle ? (
                        <>
                            {/* Vehicle Info */}
                            <div className="bg-surface rounded-3xl border border-border overflow-hidden">
                                <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-center gap-4 justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                                            <Truck size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-text-main">{myVehicle.vehicle_type}</h3>
                                            <p className="text-xs text-text-subtle">{myVehicle.plate_no}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                        myVehicle.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                        myVehicle.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' :
                                        'bg-rose-100 text-rose-700'
                                    }`}>
                                        {myVehicle.status === 'ACTIVE' ? (isAr ? 'نشط' : 'Active') :
                                         myVehicle.status === 'MAINTENANCE' ? (isAr ? 'صيانة' : 'Maintenance') :
                                         (isAr ? 'غير نشط' : 'Inactive')}
                                    </span>
                                </div>
                                <div className="p-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'الملكية' : 'Ownership'}</p>
                                        <p className="text-sm font-bold text-text-main">
                                            {myVehicle.ownership_type === 'INTERNAL' ? (isAr ? 'داخلي' : 'Internal') : (isAr ? 'مورد' : 'Supplier')}
                                        </p>
                                    </div>
                                    {myVehicle.ownership_type === 'SUPPLIER' && (
                                        <div>
                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'المورد' : 'Supplier'}</p>
                                            <p className="text-sm font-bold text-text-main truncate" title={myVehicle.supplier_name}>{myVehicle.supplier_name || '---'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vehicle Documents */}
                            {myVehicle.documents && myVehicle.documents.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-border">
                                    <h2 className="text-xs font-black text-text-subtle uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                        <FileText size={14} className="text-primary" /> {isAr ? 'ملف مستندات المركبة' : 'Vehicle Documents'}
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {myVehicle.documents.map((doc, idx) => {
                                            const hasFile = !!doc.file_url || !!doc.fileData;
                                            const { text: statusText, color: statusColor } = checkDocumentStatus(doc.expiry_date);
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleViewDoc(doc.file_url || doc.fileData, doc.type)}
                                                    disabled={!hasFile}
                                                    title={hasFile ? (isAr ? 'اضغط للتحميل / العرض' : 'Click to download') : (isAr ? 'لا يوجد ملف' : 'No file')}
                                                    className={`p-4 bg-surface rounded-3xl border border-border/50 shadow-sm flex items-start gap-3 transition-transform text-start w-full ${hasFile ? 'hover:scale-[1.02] hover:border-primary/50 cursor-pointer active:scale-95' : 'opacity-80 cursor-not-allowed'}`}
                                                >
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${hasFile ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-subtle'}`}>
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest truncate max-w-[100px]">{doc.type}</p>
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor}`}>
                                                                {statusText}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-bold text-text-main truncate" dir="ltr">{doc.number || '---'}</p>
                                                        <p className="text-[10px] text-text-subtle mt-1 font-mono">{doc.expiry_date || (isAr ? 'غير محدد' : 'N/A')}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Vehicle Photos */}
                            {(myVehicle.photo_front || myVehicle.photo_back) && (
                                <div className="space-y-4 pt-4 border-t border-border">
                                    <h2 className="text-xs font-black text-text-subtle uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                        <Camera size={14} className="text-primary" /> {isAr ? 'صور المركبة' : 'Vehicle Photos'}
                                    </h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        {myVehicle.photo_front && (
                                            <button
                                                onClick={() => handleViewDoc(myVehicle.photo_front, 'Front Photo')}
                                                className="relative group aspect-video rounded-2xl overflow-hidden border border-border hover:border-primary transition-all cursor-pointer"
                                            >
                                                <img src={myVehicle.photo_front} alt="Front" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                    <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-lg">Front</span>
                                                </div>
                                            </button>
                                        )}
                                        {myVehicle.photo_back && (
                                            <button
                                                onClick={() => handleViewDoc(myVehicle.photo_back, 'Back Photo')}
                                                className="relative group aspect-video rounded-2xl overflow-hidden border border-border hover:border-primary transition-all cursor-pointer"
                                            >
                                                <img src={myVehicle.photo_back} alt="Back" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                    <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-lg">Back</span>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-4">
                            <AlertCircle className="text-amber-500 shrink-0" size={24} />
                            <div>
                                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-500 mb-1">
                                    {isAr ? 'لا يوجد مركبة مرتبطة' : 'No Vehicle Linked'}
                                </h3>
                                <p className="text-xs text-amber-700 dark:text-amber-600/80">
                                    {isAr
                                        ? 'حسابك غير مرتبط بمركبة حالياً. يرجى التواصل مع مسؤول النظام أو قسم اللوجستيات.'
                                        : 'Your account is not linked to any vehicle. Please contact your system administrator or logistics department.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Document Preview Modal (At the very bottom to ensure highest z-index) */}
            <Modal
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
                title={previewFile?.title || (isAr ? 'معاينة المستند' : 'Document Preview')}
                size="lg"
                zIndex={200}
            >
                <div className="p-4 space-y-4">
                    {previewFile?.url && (
                        <div className="w-full bg-surface-subtle rounded-xl overflow-hidden flex items-center justify-center min-h-[300px] border border-border">
                            {previewFile.url.startsWith('data:application/pdf') ? (
                                <iframe src={previewFile.url} className="w-full h-[60vh] border-0" />
                            ) : (
                                <img src={previewFile.url} alt={previewFile.title} className="max-w-full max-h-[70vh] object-contain" />
                            )}
                        </div>
                    )}
                    <div className="flex gap-4 pt-2">
                        <Button variant="ghost" onClick={() => setPreviewFile(null)} className="flex-1 border border-border">
                            {isAr ? 'إغلاق' : 'Close'}
                        </Button>
                        <Button onClick={handleDownloadDoc} className="flex-1 bg-primary text-white border border-primary-600">
                            {isAr ? 'تحميل' : 'Download'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DriverDashboard;
