/**
 * =====================================================
 * [AR] جدول جلسات الذكاء الاصطناعي مع ترقيم الصفحات
 * [EN] AI Sessions Table with Pagination
 * =====================================================
 */

import React from 'react';
import {
    Zap, ChevronLeft, ChevronRight, Eye, ThumbsUp, ThumbsDown, Flag
} from 'lucide-react';
import type { AISession } from '@/types';

interface AISessionsTableProps {
    isAr: boolean;
    loading: boolean;
    filteredSessions: AISession[];
    actionLabels: Record<string, { en: string; ar: string }>;
    StatusBadge: React.FC<{ status: string }>;
    formatDuration: (seconds: number) => string;
    formatDate: (dt: string) => string;
    rateSession: (id: string, rating: number) => void;
    viewDetails: (session: AISession) => void;
    toggleFlag: (id: string, currentFlagged: boolean) => void;
    total: number;
    page: number;
    totalPages: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
}

const AISessionsTable: React.FC<AISessionsTableProps> = ({
    isAr,
    loading,
    filteredSessions,
    actionLabels,
    StatusBadge,
    formatDuration,
    formatDate,
    rateSession,
    viewDetails,
    toggleFlag,
    total,
    page,
    totalPages,
    setPage,
}) => {
    return (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
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
                                        <button onClick={() => rateSession(session.id, 5)} className={`p-1 rounded hover:bg-success/10 transition-colors ${session.rating === 5 ? 'text-success' : 'text-text-subtle/40 hover:text-success'}`}>
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
    );
};

export default AISessionsTable;
