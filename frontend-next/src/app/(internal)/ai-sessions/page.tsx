/**
 * =====================================================
 * [AR] صفحة إدارة جلسات الذكاء الاصطناعي - لوحة تحكم المشرف
 * [EN] AI Sessions Management - Super Admin Dashboard
 * =====================================================
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    Zap, Clock,
    AlertTriangle, CheckCircle2, XCircle, FileText, TrendingUp, Users, Activity, RefreshCw, DownloadCloud
} from 'lucide-react';
import { useStore } from '@/context';
import { createApiClient } from '@/api/client';
import type { AISession, AIAnalytics } from '@/types';
import { exportToExcel } from '@/utils/excelUtils';
import AISessionFilters from '@/components/ai/AISessionFilters';
import AISessionsTable from '@/components/ai/AISessionsTable';
import AISessionDetailsModal from '@/components/ai/AISessionDetailsModal';

export default function AISessionsPage() {
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

    const defaultStatusConfig = { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 size={14} />, label: 'Completed', labelAr: 'مكتمل' };

    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string; labelAr: string }> = {
        completed: defaultStatusConfig,
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
        const cfg = statusConfig[status] ?? defaultStatusConfig;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                {cfg.icon}
                {isAr ? cfg.labelAr : cfg.label}
            </span>
        );
    };

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
            <AISessionFilters
                isAr={isAr}
                searchUser={searchUser}
                setSearchUser={setSearchUser}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterAction={filterAction}
                setFilterAction={setFilterAction}
                filterLanguage={filterLanguage}
                setFilterLanguage={setFilterLanguage}
                filterFrom={filterFrom}
                setFilterFrom={setFilterFrom}
                filterTo={filterTo}
                setFilterTo={setFilterTo}
                setPage={setPage}
                resetFilters={resetFilters}
            />

            {/* Sessions Table */}
            <AISessionsTable
                isAr={isAr}
                loading={loading}
                filteredSessions={filteredSessions}
                actionLabels={actionLabels}
                StatusBadge={StatusBadge}
                formatDuration={formatDuration}
                formatDate={formatDate}
                rateSession={rateSession}
                viewDetails={viewDetails}
                toggleFlag={toggleFlag}
                total={total}
                page={page}
                totalPages={totalPages}
                setPage={setPage}
            />

            {/* Details Modal */}
            <AnimatePresence>
                {selectedSession && (
                    <AISessionDetailsModal
                        isAr={isAr}
                        selectedSession={selectedSession}
                        actionLabels={actionLabels}
                        StatusBadge={StatusBadge}
                        InfoField={InfoField}
                        formatDate={formatDate}
                        formatDuration={formatDuration}
                        rateSession={rateSession}
                        toggleFlag={toggleFlag}
                        onClose={() => setSelectedSession(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

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
