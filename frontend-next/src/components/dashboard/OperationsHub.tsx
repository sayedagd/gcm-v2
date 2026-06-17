import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '@/components/ui/Card';
import { formatNumber } from '@/utils/helpers';
import { TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';

interface OperationsHubProps {
    isAr: boolean;
}

export const OperationsHub: React.FC<OperationsHubProps> = ({ isAr }) => {
    const { data, loading, error } = useDashboardAnalytics();
    const volumeData = useMemo(() => data?.operationsTrend.series || [], [data]);
    const totalVolume = data?.operationsTrend.totalVolume || 0;
    const projectActivityData = data?.topProjects || [];

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
            {/* Main Volume Chart -> Trips */}
            <div className="xl:col-span-2">
                <Link href="/trips" className="block h-full focus:outline-none">
                    <Card
                        className="p-8 rounded-2xl shadow-xl bg-surface h-112.5 flex flex-col group border border-border hover:shadow-lg hover:scale-[1.01] transition-all duration-300"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
                                    <Zap className="text-amber-500 fill-amber-500" />
                                    {isAr ? 'نبض العمليات (30 يوم)' : 'Operations Pulse (30d)'}
                                </h3>
                                <p className="text-sm text-text-subtle font-bold mt-1">
                                    {isAr ? 'إجمالي الحجم المعالج' : 'Total Processed Volume'}: <span className="text-emerald-500 text-lg font-bold">{formatNumber(totalVolume)} ton</span>
                                </p>
                            </div>
                        </div>

                        {error ? (
                            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                                {error}
                            </div>
                        ) : null}

                        <div className="flex-1 w-full relative" style={{ minHeight: '300px' }}>
                            {loading ? (
                                <div className="h-[300px] w-full animate-pulse rounded-2xl border border-border bg-surface-subtle" />
                            ) : volumeData.length === 0 ? (
                                <div className="flex h-[300px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-subtle text-text-subtle">
                                    <p className="text-xs font-bold uppercase tracking-widest">{isAr ? 'لا توجد بيانات تشغيلية' : 'No operations data yet'}</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="99%" height={300}>
                                    <AreaChart data={volumeData}>
                                        <defs>
                                            <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--text-subtle)', fontSize: 10, fontWeight: 700 }}
                                            interval={4}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--surface)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '16px',
                                                color: 'var(--text-main)',
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                                            }}
                                            labelStyle={{ color: 'var(--text-subtle)', marginBottom: '0.5rem' }}
                                            itemStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="var(--primary-color)"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorOps)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Project Leaderboard -> Projects */}
            <div className="xl:col-span-1">
                <Link href="/projects" className="block h-full focus:outline-none">
                    <Card
                        className="p-8 rounded-2xl shadow-xl bg-surface-subtle h-112.5 flex flex-col border-none hover:shadow-lg hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-[4rem]" />

                        <h3 className="text-lg font-bold text-text-main flex items-center gap-2 mb-6 relative z-10">
                            <TrendingUp className="text-indigo-500" />
                            {isAr ? 'المشاريع الأكثر نشاطاً' : 'Top Active Projects'}
                        </h3>

                        <div className="flex-1 overflow-y-auto w-full min-h-0 custom-scrollbar pr-2 relative z-10 space-y-4">
                            {projectActivityData.map((project, index) => {
                                const maxTrips = Math.max(...projectActivityData.map((p) => p.tripCount || 0), 1);
                                const percentage = ((project.tripCount || 0) / maxTrips) * 100;

                                return (
                                    <div key={project.projectId} className="group">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-xs font-bold text-text-main uppercase tracking-wide truncate max-w-[70%]">
                                                {project.projectName}
                                            </span>
                                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">
                                                {project.tripCount} {isAr ? 'رحلة' : 'Trips'}
                                            </span>
                                        </div>
                                        <div className="h-3 w-full bg-surface-subtle rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out group-hover:bg-indigo-400"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            {projectActivityData.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center h-full text-text-subtle opacity-50">
                                    <TrendingUp size={48} className="mb-4 opacity-20" />
                                    <p className="text-xs font-bold uppercase text-text-subtle">{isAr ? 'لا يوجد بيانات نشطة' : 'No Active Projects'}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </Link>
            </div>
        </div>
    );
};

