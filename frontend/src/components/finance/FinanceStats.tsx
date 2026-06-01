import React from 'react';
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface FinanceStatsProps {
    stats: {
        countAllTime: number;
        countThisMonth: number;
        trend: number;
        chartData: { month: string; count: number; label: string }[];
        maxCount: number;
        topServices: { name: string; count: number }[];
    };
    isAr: boolean;
}

const BAR_COLORS = [
    'bg-purple-500',
    'bg-purple-400',
    'bg-purple-500',
    'bg-pink-500',
    'bg-pink-400',
    'bg-purple-600',
];

const FinanceStats: React.FC<FinanceStatsProps> = ({ stats, isAr }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-slate-900 text-white p-8 md:p-10 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between group min-h-[320px]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-3xl font-bold mb-1">{isAr ? 'إجمالي الردود (كلي)' : 'Total Trips (Global)'}</h3>
                            <p className="text-sm font-bold text-slate-300/60 uppercase tracking-widest">{isAr ? 'جميع العمليات المسجلة للنظام' : 'All recorded system operations'}</p>
                        </div>
                        <div className={`px-5 py-3 rounded-2xl backdrop-blur-md font-mono font-bold text-sm flex items-center gap-2 ${stats.trend >= 0 ? 'bg-primary-600 text-white' : 'bg-rose-500/20 text-rose-400'}`}>
                            <TrendingUp size={18} className={stats.trend < 0 ? 'rotate-180' : ''} />
                            <span>{stats.trend > 0 ? '+' : ''}{stats.trend}% {isAr ? 'نمو' : 'MoM'}</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3 mb-6">
                        <span className="text-7xl md:text-8xl font-bold tracking-tight">{stats.countAllTime}</span>
                        <span className="text-xl font-bold text-slate-300/60">{isAr ? 'رحلة' : 'Trips'}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-300/60 uppercase">
                            <span>{isAr ? 'نشاط الشهر الحالي' : 'Current Month Activity'}</span>
                            <span>{stats.countThisMonth} {isAr ? 'رد' : 'Trips'}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (stats.countThisMonth / (stats.countAllTime || 1)) * 100)}%` }} transition={{ duration: 1.5 }} className="h-full bg-gradient-to-r from-purple-500 to-pink-500" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
                {/* Recent Activity — 6 month bar chart */}
                <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm h-[180px] flex flex-col justify-between">
                    <h3 className="font-bold text-xs uppercase text-text-subtle flex items-center gap-2">
                        <BarChart3 size={16} className="text-purple-500" /> {isAr ? 'النشاط الأخير' : 'Recent Activity'}
                    </h3>
                    {stats.chartData.length > 0 ? (
                        <div className="flex items-end justify-between h-20 gap-1.5 px-1">
                            {stats.chartData.map((d, i) => {
                                const heightPct = stats.maxCount > 0 ? (d.count / stats.maxCount) * 100 : 0;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1 flex-1 group cursor-default" title={`${d.label}: ${d.count}`}>
                                        <span className="text-[8px] font-bold text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.max(heightPct, 6)}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.08 }}
                                            className={`w-full rounded-md ${BAR_COLORS[i % BAR_COLORS.length]} opacity-80 group-hover:opacity-100 transition-opacity`}
                                        />
                                        <span className="text-[8px] font-bold uppercase text-text-subtle">{d.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-xs text-text-subtle font-bold">{isAr ? 'لا توجد بيانات' : 'No data yet'}</p>
                        </div>
                    )}
                </div>

                {/* Top Active Services */}
                <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm flex-1">
                    <h3 className="font-bold text-xs uppercase text-text-subtle flex items-center gap-2 mb-4">
                        <PieChart size={16} className="text-pink-500" /> {isAr ? 'الخدمات النشطة' : 'Active Services'}
                    </h3>
                    {stats.topServices.length > 0 ? (
                        <div className="space-y-3">
                            {stats.topServices.map((s, i) => {
                                const maxSvcCount = stats.topServices[0]?.count || 1;
                                const widthPct = (s.count / maxSvcCount) * 100;
                                return (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between items-center text-sm font-bold">
                                            <span className="text-text-main truncate max-w-[70%]">{s.name}</span>
                                            <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">{s.count} {isAr ? 'رحلة' : 'trips'}</span>
                                        </div>
                                        <div className="w-full h-1 bg-surface-subtle rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${widthPct}%` }}
                                                transition={{ duration: 1, delay: i * 0.1 }}
                                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 opacity-40 gap-2">
                            <Activity size={24} />
                            <p className="text-xs font-bold text-text-subtle">{isAr ? 'لا توجد خدمات نشطة بعد' : 'No active services yet'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinanceStats;
