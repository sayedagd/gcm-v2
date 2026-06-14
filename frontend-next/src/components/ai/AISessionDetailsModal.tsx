/**
 * =====================================================
 * [AR] نافذة تفاصيل جلسة الذكاء الاصطناعي
 * [EN] AI Session Details Modal
 * =====================================================
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, AlertTriangle, FileText, ThumbsUp, ThumbsDown, Flag, X } from 'lucide-react';
import type { AISession } from '@/types';

interface AISessionDetailsModalProps {
    isAr: boolean;
    selectedSession: AISession;
    actionLabels: Record<string, { en: string; ar: string }>;
    StatusBadge: React.FC<{ status: string }>;
    InfoField: React.FC<{ label: string; value?: string | null }>;
    formatDate: (dt: string) => string;
    formatDuration: (seconds: number) => string;
    rateSession: (id: string, rating: number) => void;
    toggleFlag: (id: string, currentFlagged: boolean) => void;
    onClose: () => void;
}

const AISessionDetailsModal: React.FC<AISessionDetailsModalProps> = ({
    isAr,
    selectedSession,
    actionLabels,
    StatusBadge,
    InfoField,
    formatDate,
    formatDuration,
    rateSession,
    toggleFlag,
    onClose,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}
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
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-subtle transition-colors">
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
                            <button onClick={() => rateSession(selectedSession.id, 5)} className={`p-2 rounded-lg transition-colors ${selectedSession.rating === 5 ? 'bg-success/10 text-success' : 'hover:bg-success/10 text-text-subtle'}`}>
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
    );
};

export default AISessionDetailsModal;
