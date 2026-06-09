/**
 * =====================================================
 * [AR] نظام التنبيهات العائمة
 * [EN] Floating Toast Notification System
 * =====================================================
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Shield, Bell, ExternalLink } from 'lucide-react';
import { useStore } from '../../context';
import { NotificationType, AppNotification } from '../../types';
import { useRouter } from 'next/navigation';

const translateNotif = (n: AppNotification, isAr: boolean) => {
    const dictionary: Record<string, { ar: string, en: string }> = {
        'New Access Request': { ar: 'طلب وصول جديد', en: 'New Access Request' },
        'CREATED': { ar: 'إضافة جديد', en: 'Created' },
        'UPDATED': { ar: 'تحديث بيانات', en: 'Updated' },
        'DELETED': { ar: 'حذف', en: 'Deleted' },
        'LOGIN': { ar: 'تسجيل دخول', en: 'Login' },
        'SYSTEM': { ar: 'النظام', en: 'System' },
        'SECURITY': { ar: 'الأمن', en: 'Security' },
        'OPERATIONAL': { ar: 'العمليات', en: 'Operations' }
    };

    // Handle "ACTION: NAME" format
    let title = n.title;
    const message = n.message;

    if (title.includes(':')) {
        const [action, name] = title.split(':').map(s => s.trim());
        const safeAction = action || '';
        const safeName = name || '';
        const transAction = dictionary[safeAction] ? dictionary[safeAction][isAr ? 'ar' : 'en'] : safeAction;
        title = isAr ? `${transAction}: ${safeName}` : `${transAction}: ${safeName}`;
    } else {
        const translated = dictionary[title];
        if (translated) {
            title = translated[isAr ? 'ar' : 'en'];
        }
    }

    return { title, message };
};

const TOAST_DURATION = 4000;

const ToastContainer: React.FC = () => {
    const { notifications, saasConfig, toggleNotificationRead } = useStore();
    const isAr = saasConfig.language === 'ar';
    const router = useRouter();

    // [AR] تحميل الإخفاءات المحفوظة من localStorage
    // [EN] Load dismissed IDs from localStorage with cleanup
    const loadDismissedIds = (): Set<string> => {
        try {
            const stored = localStorage.getItem('gcm_dismissed_notifications');
            if (!stored) return new Set();

            const data = JSON.parse(stored);
            const now = Date.now();
            const dayAgo = now - (24 * 60 * 60 * 1000); // 24 hours

            // [AR] تنظيف الإخفاءات القديمة (أكثر من 24 ساعة)
            // [EN] Cleanup old dismissals (older than 24 hours)
            const cleaned = Object.entries(data)
                .filter(([_, timestamp]) => (timestamp as number) > dayAgo)
                .reduce((acc, [id]) => acc.add(id), new Set<string>() as Set<string>);

            return cleaned;
        } catch {
            return new Set();
        }
    };

    const [dismissedIds, setDismissedIds] = useState<Set<string>>(loadDismissedIds());

    // [AR] حفظ الإخفاءات في localStorage
    // [EN] Save dismissals to localStorage
    const saveDismissedIds = (ids: Set<string>) => {
        try {
            const data: Record<string, number> = {};
            const now = Date.now();
            ids.forEach(id => {
                data[id] = now;
            });
            localStorage.setItem('gcm_dismissed_notifications', JSON.stringify(data));
        } catch (err) {
            console.error('[ToastContainer] Failed to save dismissed IDs:', err);
        }
    };

    const dismissNotification = (id: string) => {
        setDismissedIds(prev => {
            const updated = new Set<string>(prev);
            updated.add(id);
            saveDismissedIds(updated);
            return updated;
        });
    };

    // [AR] قائمة الإشعارات النشطة (غير مقروءة وغير مخفية يدوياً)
    // [EN] Active unread and non-dismissed toasts
    const activeToasts = notifications.filter(n => !n.isRead && !dismissedIds.has(n.id)).slice(0, 5);

    // [AR] مؤقت لإخفاء التنبيه تلقائياً
    // [EN] Auto-dismiss effect
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];
        activeToasts.forEach(n => {
            const timer = setTimeout(() => {
                dismissNotification(n.id);
            }, TOAST_DURATION);
            timers.push(timer);
        });
        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [activeToasts.length > 0 ? activeToasts.map(t => t.id).join(',') : '']);

    const getStyle = (type: NotificationType) => {
        switch (type) {
            case NotificationType.ERROR: return { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400', border: 'border-l-rose-500', icon: AlertCircle, bar: 'bg-rose-500' };
            case NotificationType.WARNING: return { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500', icon: AlertCircle, bar: 'bg-amber-500' };
            case NotificationType.SUCCESS: return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500', icon: CheckCircle2, bar: 'bg-emerald-500' };
            case NotificationType.ACCESS_REQUEST: return { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', border: 'border-l-blue-500', icon: Shield, bar: 'bg-blue-500' };
            default: return { bg: 'bg-surface-subtle', text: 'text-text-subtle', border: 'border-l-primary', icon: Bell, bar: 'bg-primary' };
        }
    };

    const getNotifLink = (n: AppNotification): string | undefined =>
        (n as any).link || (n as any).actionUrl || undefined;

    const handleToastClick = (n: AppNotification) => {
        if (!n.isRead) toggleNotificationRead(n.id);
        const target = getNotifLink(n);
        if (target) {
            router.push(target);
            dismissNotification(n.id);
        }
    };

    return (
        <div className={`fixed top-4 sm:top-6 z-[200] flex flex-col gap-3 w-[calc(100vw-2rem)] sm:w-80 md:w-96 pointer-events-none transition-all duration-500 ${isAr ? 'left-4 sm:left-6' : 'right-4 sm:right-6'}`}>
            <AnimatePresence>
                {activeToasts.map((n) => {
                    const content = translateNotif(n, isAr);
                    const style = getStyle(n.type);
                    const Icon = style.icon;
                    const hasLink = !!getNotifLink(n);
                    return (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: isAr ? -100 : 100, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                            onClick={() => hasLink && handleToastClick(n)}
                            className={`bg-surface border border-border shadow-[0_15px_50px_rgba(0,0,0,0.12)] rounded-2xl p-4 flex items-start gap-4 relative overflow-hidden pointer-events-auto group border-l-4 ${style.border} ${hasLink ? 'cursor-pointer hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] hover:scale-[1.01]' : ''} transition-all`}
                        >
                            <div className={`shrink-0 p-2.5 rounded-xl ${style.bg} ${style.text} shadow-sm`}>
                                <Icon size={18} />
                            </div>
                            <div className={`flex-1 min-w-0 ${isAr ? 'text-right' : 'text-left'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs font-black text-text-main leading-tight truncate">{content.title}</p>
                                    {hasLink && <ExternalLink size={10} className="text-primary shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />}
                                </div>
                                <p className="text-[10px] font-bold text-text-subtle line-clamp-2 leading-relaxed">{content.message}</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); dismissNotification(n.id); }}
                                className="p-1.5 text-text-subtle opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                            >
                                <X size={14} />
                            </button>
                            {/* Auto-dismiss progress bar */}
                            <motion.div
                                initial={{ scaleX: 1 }}
                                animate={{ scaleX: 0 }}
                                transition={{ duration: TOAST_DURATION / 1000, ease: 'linear' }}
                                className={`absolute bottom-0 left-0 right-0 h-[3px] origin-left ${style.bar} opacity-40`}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
export default ToastContainer;
