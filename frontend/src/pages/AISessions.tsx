/**
 * =====================================================
 * [AR] صفحة إدارة جلسات الذكاء الاصطناعي - لوحة تحكم المشرف
 * [EN] AI Sessions Management - Super Admin Dashboard
 * =====================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Search, Filter, Clock,
    ChevronLeft, ChevronRight, Eye, ThumbsUp, ThumbsDown,
    Flag, AlertTriangle, CheckCircle2, XCircle, FileText, TrendingUp, Users, Activity, RefreshCw, X, DownloadCloud
} from 'lucide-react';
import { useStore } from '@/context';
import { createApiClient } from '@/api/client';
import type { AISession, AIAnalytics } from '@/types';
import { exportToExcel } from '@/utils/excelUtils';

const AISessions: React.FC = () => {
    const { saasConfig } = useStore();
    const isAr = saasConfig.language === 'ar';

    const api = useMemo(() => createApiClient(saasConfig?.apiConfig?.baseUrl || ''), [saasConfig?.apiConfig?.baseUrl]);

    // --- State ---
    const [sessions, setSessions] = useState<AISession[]>([]);
    const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedSession, setSelectedSession] = useState<AISession | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterLanguage, setFilterLanguage] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [searchUser, setSearchUser] = useState('');

    // --- Data Fetching ---
    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), limit: '20' };
            if (filterStatus) params.status = filterStatus;
            if (filterAction) params.action_type = filterAction;
            if (filterLanguage) params.language = filterLanguage;
            if (filterFrom) params.from = filterFrom;
            if (filterTo) params.to = filterTo;

            const res = await api.getAISessions(params);
            setSessions(res.data || []);
            setTotal(res.total || 0);
            setTotalPages(res.pages || 1);
        } catch (e) {
            console.error('[AI Sessions] Fetch error:', e);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    }, [api, page, filterStatus, filterAction, filterLanguage, filterFrom, filterTo]);

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await api.getAIAnalytics();
            setAnalytics(res);
        } catch (e) {
            console.error('[AI Analytics] Fetch error:', e);
        }
    }, [api]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);
    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const resetFilters = () => {
        setFilterStatus('');
        setFilterAction('');
        setFilterLanguage('');
        setFilterFrom('');
        setFilterTo('');
        setSearchUser('');
        setPage(1);
    };

    // --- View Details ---
    const viewDetails = async (session: AISession) => {
        setDetailsLoading(true);
        try {
            const details = await api.getAISessionById(session.id);
            setSelectedSession(details);
        } catch {
            setSelectedSession(session);
        } finally {
            setDetailsLoading(false);
        }
    };

    // --- Rate Session ---
    const rateSession = async (id: string, rating: number) => {
        try {
            await api.rateAISession(id, { rating });
            setSessions(prev => prev.map(s => s.id === id ? { ...s, rating } : s));
            if (selectedSession?.id === id) setSelectedSession(prev => prev ? { ...prev, rating } : prev);
        } catch (e) {
            console.error('[AI Rate] Error:', e);
        }
    };

    const toggleFlag = async (id: string, currentFlagged: boolean) => {
        try {
            await api.rateAISession(id, { flagged: !currentFlagged });
            setSessions(prev => prev.map(s => s.id === id ? { ...s, flagged: !currentFlagged } : s));
            if (selectedSession?.id === id) setSelectedSession(prev => prev ? { ...prev, flagged: !currentFlagged } : prev);
        } catch (e) {
            console.error('[AI Flag] Error:', e);
        }
    };

    // --- Filtered sessions by search ---
    const filteredSessions = useMemo(() => {
        if (!searchUser) return sessions;
        const q = searchUser.toLowerCase();
        return sessions.filter(s => s.user_name?.toLowerCase().includes(q));
    }, [sessions, searchUser]);

    // --- Helpers ---
    const formatDuration = (seconds: number) => {
        if (!seconds || seconds <= 0) return '—';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const formatDate = (dt: string) => {
        if (!dt) return '—';
        try { return new Date(dt).toLocaleString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return dt; }
    };

    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string; labelAr: string }> = {
        completed: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 size={14} />, label: 'Completed', labelAr: 'مكتمل' },
        cancelled: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: <XCircle size={14} />, label: 'Cancelled', labelAr: 'ملغي' },
        failed: { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: <AlertTriangle size={14} />, label: 'Failed', labelAr: 'فشل' },
        report_only: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: <FileText size={14} />, label: 'Report Only', labelAr: 'تقرير فقط' },
    };

    const actionLabels: Record<string, { en: string; ar: string }> = {
        register_trip: { en: 'Register Trip', ar: 'تسجيل رحلة' },
        report: { en: 'Report', ar: 'تقرير' },
        edit: { en: 'Edit', ar: 'تعديل' },
        general: { en: 'General', ar: 'عام' },
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const cfg = statusConfig[status] || statusConfig.completed;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                {cfg.icon}
                {isAr ? cfg.labelAr : cfg.label}
            </span>
        );
    };

    // ===== RENDER =====
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Zap size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-main">
                            {isAr ? 'جلسات الذكاء الاصطناعي' : 'AI Sessions'}
                        </h1>
                        <p className="text-sm text-text-subtle">
                            {isAr ? 'مراقبة وتحليل تفاعلات المساعد الذكي' : 'Monitor & analyze AI assistant interactions'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => exportToExcel(
                            filteredSessions.map(s => ({
                                'Session ID': s.id,
                                'User': s.user_name,
                                'Role': s.user_role,
                                'Action': s.action_type,
                                'Language': s.language,
                                'Status': s.status,
                                'Started': s.started_at,
                                'Ended': s.ended_at,
                                'Duration (sec)': s.duration_seconds,
                                'Trip Ref': s.trip_reference || '',
                                'Rating': s.rating || '',
                                'Flagged': s.flagged ? 'Yes' : 'No',
                                'Error': s.error_message || ''
                            })),
                            `AI_Sessions_${new Date().toISOString().split('T')[0]}`,
                            'Sessions'
                        )}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-subtle hover:bg-surface border border-border text-text-subtle hover:text-text-main transition-colors text-sm font-medium"
                    >
                        <DownloadCloud size={16} />
                        {isAr ? 'تصدير' : 'Export'}
                    </button>
                    <button
                        onClick={() => { fetchSessions(); fetchAnalytics(); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-subtle hover:bg-surface border border-border text-text-subtle hover:text-text-main transition-colors text-sm font-medium"
                    >
                        <RefreshCw size={16} />
                        {isAr ? 'تحديث' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Analytics Cards */}
            {analytics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Activity size={20} />}
                        label={isAr ? 'إجمالي الجلسات' : 'Total Sessions'}
                        value={String(analytics.total_sessions)}
                        color="from-violet-500 to-purple-600"
                    />
                    <StatCard
                        icon={<TrendingUp size={20} />}
                        label={isAr ? 'معدل النجاح' : 'Success Rate'}
                        value={`${analytics.success_rate}%`}
                        color="from-emerald-500 to-green-600"
                    />
                    <StatCard
                        icon={<Clock size={20} />}
                        label={isAr ? 'متوسط المدة' : 'Avg Duration'}
                        value={formatDuration(analytics.avg_duration_seconds)}
                        color="from-blue-500 to-cyan-600"
                    />
                    <StatCard
                        icon={<Users size={20} />}
                        label={isAr ? 'أنشط المستخدمين' : 'Top Users'}
                        value={String(analytics.top_users?.length || 0)}
                        color="from-amber-500 to-orange-600"
                    />
                </div>
            )}

            {/* Filters */}
            <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={16} className="text-text-subtle" />
                    <span className="text-sm font-semibold text-text-main">{isAr ? 'الفلاتر' : 'Filters'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Search User */}
                    <div className="relative">
                        <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-text-subtle" />
                        <input
                            type="text"
                            placeholder={isAr ? 'بحث بالاسم...' : 'Search user...'}
                            value={searchUser}
                            onChange={e => setSearchUser(e.target.value)}
                            className="w-full ps-9 pe-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>

                    {/* Status */}
                    <select
                        value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        <option value="">{isAr ? 'كل الحالات' : 'All Status'}</option>
                        <option value="completed">{isAr ? 'مكتمل' : 'Completed'}</option>
                        <option value="cancelled">{isAr ? 'ملغي' : 'Cancelled'}</option>
                        <option value="failed">{isAr ? 'فشل' : 'Failed'}</option>
                        <option value="report_only">{isAr ? 'تقرير فقط' : 'Report Only'}</option>
                    </select>

                    {/* Action Type */}
                    <select
                        value={filterAction}
                        onChange={e => { setFilterAction(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        <option value="">{isAr ? 'كل الإجراءات' : 'All Actions'}</option>
                        <option value="register_trip">{isAr ? 'تسجيل رحلة' : 'Register Trip'}</option>
                        <option value="report">{isAr ? 'تقرير' : 'Report'}</option>
                        <option value="edit">{isAr ? 'تعديل' : 'Edit'}</option>
                        <option value="general">{isAr ? 'عام' : 'General'}</option>
                    </select>

                    {/* Language */}
                    <select
                        value={filterLanguage}
                        onChange={e => { setFilterLanguage(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        <option value="">{isAr ? 'كل اللغات' : 'All Languages'}</option>
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                    </select>

                    {/* Date From */}
                    <input
                        type="date"
                        value={filterFrom}
                        onChange={e => { setFilterFrom(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                        title={isAr ? 'من تاريخ' : 'From date'}
                    />

                    {/* Date To */}
                    <input
                        type="date"
                        value={filterTo}
                        onChange={e => { setFilterTo(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                        title={isAr ? 'إلى تاريخ' : 'To date'}
                    />
                </div>

                {(filterStatus || filterAction || filterLanguage || filterFrom || filterTo || searchUser) && (
                    <button onClick={resetFilters} className="mt-3 text-xs text-primary hover:underline font-medium">
                        {isAr ? '🔄 إعادة تعيين الفلاتر' : '🔄 Reset Filters'}
                    </button>
                )}
            </div>

            {/* Sessions Table */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-surface-subtle/50">
                                <th className="px-4 py-3 text-start font-semibold text-text-subtle">{isAr ? 'المستخدم' : 'User'}</th>
                                <th className="px-4 py-3 text-start font-semibold text-text-subtle">{isAr ? 'الدور' : 'Role'}</th>
                                <th className="px-4 py-3 text-start font-semibold text-text-subtle">{isAr ? 'الإجراء' : 'Action'}</th>
                                <th className="px-4 py-3 text-center font-semibold text-text-subtle">{isAr ? 'اللغة' : 'Lang'}</th>
                                <th className="px-4 py-3 text-center font-semibold text-text-subtle">{isAr ? 'الحالة' : 'Status'}</th>
                                <th className="px-4 py-3 text-center font-semibold text-text-subtle">{isAr ? 'المدة' : 'Duration'}</th>
                                <th className="px-4 py-3 text-start font-semibold text-text-subtle">{isAr ? 'مرجع الرحلة' : 'Trip Ref'}</th>
                                <th className="px-4 py-3 text-start font-semibold text-text-subtle">{isAr ? 'التاريخ' : 'Date'}</th>
                                <th className="px-4 py-3 text-center font-semibold text-text-subtle">{isAr ? 'تقييم' : 'Rating'}</th>
                                <th className="px-4 py-3 text-center font-semibold text-text-subtle">{isAr ? 'إجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} className="text-center py-12 text-text-subtle">{isAr ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                            ) : filteredSessions.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-2xl bg-surface-subtle flex items-center justify-center">
                                                <Zap size={28} className="text-text-subtle" />
                                            </div>
                                            <p className="text-text-subtle font-medium">{isAr ? 'لا توجد جلسات بعد' : 'No sessions found'}</p>
                                            <p className="text-xs text-text-subtle">{isAr ? 'ستظهر الجلسات هنا عند بدء استخدام المساعد الذكي' : 'Sessions will appear here when the AI assistant is used'}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredSessions.map(session => (
                                <tr key={session.id} className={`border-b border-border/50 hover:bg-surface-subtle/50 transition-colors ${session.flagged ? 'bg-red-500/5' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {session.flagged && <Flag size={12} className="text-red-400" />}
                                            <span className="font-medium text-text-main">{session.user_name || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-text-subtle text-xs font-mono">{session.user_role || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded bg-surface-subtle text-text-main text-xs font-medium">
                                            {isAr ? (actionLabels[session.action_type]?.ar || session.action_type) : (actionLabels[session.action_type]?.en || session.action_type)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-xs font-mono text-text-subtle uppercase">{session.language || '—'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center"><StatusBadge status={session.status} /></td>
                                    <td className="px-4 py-3 text-center text-text-subtle font-mono text-xs">{formatDuration(session.duration_seconds)}</td>
                                    <td className="px-4 py-3 text-text-subtle text-xs">{session.trip_reference || '—'}</td>
                                    <td className="px-4 py-3 text-text-subtle text-xs">{formatDate(session.started_at)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => rateSession(session.id, 5)} className={`p-1 rounded hover:bg-emerald-500/10 transition-colors ${session.rating === 5 ? 'text-emerald-400' : 'text-text-subtle/40 hover:text-emerald-400'}`}>
                                                <ThumbsUp size={14} />
                                            </button>
                                            <button onClick={() => rateSession(session.id, 1)} className={`p-1 rounded hover:bg-red-500/10 transition-colors ${session.rating === 1 ? 'text-red-400' : 'text-text-subtle/40 hover:text-red-400'}`}>
                                                <ThumbsDown size={14} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => viewDetails(session)} className="p-1.5 rounded-lg hover:bg-primary/10 text-text-subtle hover:text-primary transition-colors" title={isAr ? 'عرض التفاصيل' : 'View Details'}>
                                                <Eye size={16} />
                                            </button>
                                            <button onClick={() => toggleFlag(session.id, session.flagged)} className={`p-1.5 rounded-lg transition-colors ${session.flagged ? 'text-red-400 hover:bg-red-500/10' : 'text-text-subtle/40 hover:text-amber-400 hover:bg-amber-500/10'}`} title={isAr ? 'تمييز' : 'Flag'}>
                                                <Flag size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <span className="text-xs text-text-subtle">
                            {isAr ? `إجمالي ${total} جلسة` : `${total} sessions total`}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-1.5 rounded-lg hover:bg-surface-subtle disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={16} className="text-text-subtle" />
                            </button>
                            <span className="text-xs font-medium text-text-main px-3">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-1.5 rounded-lg hover:bg-surface-subtle disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight size={16} className="text-text-subtle" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            <AnimatePresence>
                {selectedSession && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setSelectedSession(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                        <Zap size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-main">{isAr ? 'تفاصيل الجلسة' : 'Session Details'}</h3>
                                        <p className="text-xs text-text-subtle font-mono">{selectedSession.id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedSession(null)} className="p-2 rounded-lg hover:bg-surface-subtle transition-colors">
                                    <X size={18} className="text-text-subtle" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 space-y-5">
                                {/* User Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoField label={isAr ? 'المستخدم' : 'User'} value={selectedSession.user_name} />
                                    <InfoField label={isAr ? 'الدور' : 'Role'} value={selectedSession.user_role} />
                                    <InfoField label={isAr ? 'الإجراء' : 'Action'} value={isAr ? (actionLabels[selectedSession.action_type]?.ar || selectedSession.action_type) : (actionLabels[selectedSession.action_type]?.en || selectedSession.action_type)} />
                                    <InfoField label={isAr ? 'اللغة' : 'Language'} value={selectedSession.language === 'ar' ? 'العربية' : 'English'} />
                                </div>

                                {/* Status & Timeline */}
                                <div className="bg-surface-subtle rounded-xl p-4 space-y-3">
                                    <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
                                        <Clock size={14} />
                                        {isAr ? 'الجدول الزمني' : 'Timeline'}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InfoField label={isAr ? 'بداية' : 'Started'} value={formatDate(selectedSession.started_at)} />
                                        <InfoField label={isAr ? 'نهاية' : 'Ended'} value={formatDate(selectedSession.ended_at)} />
                                        <InfoField label={isAr ? 'المدة' : 'Duration'} value={formatDuration(selectedSession.duration_seconds)} />
                                        <div>
                                            <span className="text-xs text-text-subtle block mb-1">{isAr ? 'الحالة' : 'Status'}</span>
                                            <StatusBadge status={selectedSession.status} />
                                        </div>
                                    </div>
                                </div>

                                {/* Trip Reference */}
                                {selectedSession.trip_reference && (
                                    <div className="bg-surface-subtle rounded-xl p-4">
                                        <InfoField label={isAr ? 'مرجع الرحلة' : 'Trip Reference'} value={selectedSession.trip_reference} />
                                        {selectedSession.trip_data_summary && (
                                            <pre className="mt-2 text-xs text-text-subtle bg-surface rounded-lg p-3 overflow-x-auto font-mono">
                                                {JSON.stringify(selectedSession.trip_data_summary, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                )}

                                {/* Error */}
                                {selectedSession.error_message && (
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle size={14} className="text-red-400" />
                                            <span className="text-sm font-bold text-red-400">{isAr ? 'خطأ' : 'Error'}</span>
                                        </div>
                                        <p className="text-sm text-red-300">{selectedSession.error_message}</p>
                                    </div>
                                )}

                                {/* Chat Log */}
                                {selectedSession.messages && selectedSession.messages.length > 0 && (
                                    <div className="bg-surface-subtle rounded-xl p-4">
                                        <h4 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2">
                                            <FileText size={14} />
                                            {isAr ? 'سجل المحادثة' : 'Chat Log'}
                                        </h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {selectedSession.messages.map(msg => (
                                                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${msg.sender === 'user'
                                                        ? 'bg-primary/20 text-primary'
                                                        : msg.sender === 'system'
                                                            ? 'bg-amber-500/10 text-amber-400'
                                                            : 'bg-surface text-text-main'
                                                        }`}>
                                                        <span className="font-bold block text-[10px] opacity-70 mb-0.5">{msg.sender.toUpperCase()}</span>
                                                        {msg.message}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Rating & Flags */}
                                <div className="flex items-center justify-between pt-2 border-t border-border">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-text-subtle font-medium">{isAr ? 'تقييم:' : 'Rating:'}</span>
                                        <button onClick={() => rateSession(selectedSession.id, 5)} className={`p-2 rounded-lg transition-colors ${selectedSession.rating === 5 ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-emerald-500/10 text-text-subtle'}`}>
                                            <ThumbsUp size={18} />
                                        </button>
                                        <button onClick={() => rateSession(selectedSession.id, 1)} className={`p-2 rounded-lg transition-colors ${selectedSession.rating === 1 ? 'bg-red-500/10 text-red-400' : 'hover:bg-red-500/10 text-text-subtle'}`}>
                                            <ThumbsDown size={18} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => toggleFlag(selectedSession.id, selectedSession.flagged)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedSession.flagged
                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            : 'bg-surface-subtle text-text-subtle hover:text-amber-400 border border-border'
                                            }`}
                                    >
                                        <Flag size={14} />
                                        {selectedSession.flagged ? (isAr ? 'مُعَلَّم' : 'Flagged') : (isAr ? 'تعليم' : 'Flag')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Reusable Components ---

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
    <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/20 transition-colors">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg text-white flex-shrink-0`}>
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-text-main">{value}</p>
            <p className="text-xs text-text-subtle font-medium">{label}</p>
        </div>
    </div>
);

const InfoField = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
        <span className="text-xs text-text-subtle block mb-0.5">{label}</span>
        <span className="text-sm font-medium text-text-main">{value || '—'}</span>
    </div>
);

export default AISessions;
