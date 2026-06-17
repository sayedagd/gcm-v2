import React from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import { Activity, MoreHorizontal, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '@/context';
import { motion } from 'framer-motion';
import { formatActionType, formatEntityType, formatLogDetails } from '@/utils/helpers';
import { listItemMotion, staggerContainer } from '@/theme/motion';

interface ActivityFeedProps {
    isAr: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ isAr }) => {
    const { logs, users } = useStore();

    // Helper to get action-specific icons and colors
    const getActionTheme = (action: string) => {
        const a = action.toUpperCase();
        if (a.includes('CREATED')) return { dot: 'tone-success-bg', text: 'tone-success', border: 'tone-success-border' };
        if (a.includes('DELETED')) return { dot: 'tone-danger-bg', text: 'tone-danger', border: 'tone-danger-border' };
        if (a.includes('UPDATED') || a.includes('UPDATE')) return { dot: 'tone-warning-bg', text: 'tone-warning', border: 'tone-warning-border' };
        return { dot: 'tone-info-bg', text: 'tone-info', border: 'tone-info-border' };
    };

    return (
        <Card className="relative flex h-[420px] md:h-[500px] flex-col overflow-hidden">
            <div className={`flex justify-between items-center mb-8 relative z-10 ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
                <h3 className={`text-xl font-bold flex items-center gap-3 ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="accent-chip p-2.5 rounded-xl shadow-sm">
                        <Activity size={20} />
                    </div>
                    <span className="text-text-main">
                        {isAr ? 'سجل النشاط الحي' : 'Live Activity Stream'}
                    </span>
                </h3>
                <button className="text-text-subtle hover:text-text-main transition-colors p-2 hover:bg-surface-subtle rounded-lg">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className={`flex-1 overflow-y-auto custom-scrollbar relative z-10 ${isAr ? 'pr-2 pl-4' : 'pl-2 pr-4'} space-y-0`}>
                {logs.slice(0, 20).map((log, idx) => {
                    const theme = getActionTheme(log.action);
                    const user = users.find(u => u.id === log.user_id);

                    return (
                        <motion.div
                            key={log.id || idx}
                            variants={listItemMotion}
                            className={`relative pb-10 last:pb-4 ${isAr ? 'pr-8 border-r-2 mr-2' : 'pl-8 border-l-2 ml-2'} border-border last:border-transparent`}
                        >
                            {/* Timeline Dot */}
                            <div className={`absolute ${isAr ? '-right-[11px]' : '-left-[11px]'} top-0 w-5 h-5 rounded-full bg-surface border-2 ${theme.border} flex items-center justify-center shadow-sm`}>
                                <div className={`w-2 h-2 rounded-full ${theme.dot} animate-pulse`} />
                            </div>

                            <div className={`flex flex-col gap-1.5 -mt-1 group cursor-default ${isAr ? 'text-right' : 'text-left'}`}>
                                <div className={`flex justify-between items-baseline ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`flex items-center gap-2 ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <h4 className={`text-[13px] font-bold ${theme.text} uppercase tracking-wide`}>
                                            {formatActionType(log.action, isAr)}
                                        </h4>
                                        <span className="text-[10px] font-bold text-text-subtle px-1.5 py-0.5 rounded bg-surface-subtle">
                                            {formatEntityType(log.entity_type, isAr)}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-text-subtle font-bold uppercase tracking-widest flex items-center gap-1">
                                        <Clock size={10} />
                                        {log.timestamp
                                            ? formatDistanceToNow(new Date(log.timestamp), {
                                                addSuffix: true,
                                                ...(isAr ? { locale: ar } : {})
                                            })
                                            : '---'}
                                    </span>
                                </div>

                                <p className="text-sm font-bold text-text-main">
                                    {log.entity_name}
                                </p>

                                <p className="text-xs text-text-subtle leading-relaxed font-medium bg-surface-subtle p-2 rounded-lg border border-border">
                                    {formatLogDetails(log.details)}
                                </p>

                                <div className={`flex items-center gap-2 mt-1 ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className="flex items-center gap-2">
                                        <Image
                                            src={user?.avatar || '/logo.png'}
                                            className="w-5 h-5 rounded-md border border-border"
                                            alt=""
                                            width={20}
                                            height={20}
                                            unoptimized
                                        />
                                        <span className="text-[10px] font-bold text-text-subtle capitalize">
                                            {user?.name || (log.user_id === 'SYSTEM' ? (isAr ? 'النظام' : 'System') : log.user_id)}
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-text-subtle opacity-50 font-mono">#{log.id?.slice(-6) || idx}</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-text-subtle opacity-50 space-y-4">
                        <Activity size={48} className="animate-pulse" />
                        <p className="text-lg font-bold italic">
                            {isAr ? 'لا يوجد نشاط مسجل' : 'No operational telemetry recorded'}
                        </p>
                    </div>
                )}
            </motion.div>
        </Card>
    );
};

