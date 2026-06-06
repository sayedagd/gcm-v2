import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import Card from '@/components/ui/Card';
import { useStore } from '@/context';
import { formatNumber } from '@/utils/helpers';
import { TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

interface OperationsHubProps {
    isAr: boolean;
}

export const OperationsHub: React.FC<OperationsHubProps> = ({ isAr }) => {
    const { trips, projects, saasConfig } = useStore();


    // 1. Trip Volume History (Last 30 days) - Purely operational count/quantity
    const volumeData = useMemo(() => {
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const d = subDays(new Date(), 29 - i);
            return format(d, 'yyyy-MM-dd');
        });

        return last30Days.map(dateStr => {
            const dayTrips = trips.filter(t => t.date === dateStr);
            // Sum quantity (e.g. tons)
            const dailyQty = dayTrips.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
            return {
                date: format(parseISO(dateStr), 'MMM dd'),
                value: dailyQty
            };
        });
    }, [trips]);

    const totalVolume = volumeData.reduce((acc, d) => acc + d.value, 0);

    // 2. Project Activity (Top 5 Active Projects by Trip Count)
    const projectActivityData = useMemo(() => {
        const counts: Record<string, number> = {};
        trips.forEach(t => {
            counts[t.project_id] = (counts[t.project_id] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([projId, count]) => {
                const p = projects.find(proj => proj.project_id === projId);
                return {
                    name: p ? p.project_name : projId,
                    trips: count
                };
            })
            .sort((a, b) => b.trips - a.trips)
            .slice(0, 5);
    }, [trips, projects]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
            {/* Main Volume Chart -> Trips */}
            <div className="xl:col-span-2">
                <Link href="/trips" className="block h-full focus:outline-none">
                    <Card
                        className="p-8 rounded-2xl shadow-xl bg-surface h-[450px] flex flex-col group border border-border hover:shadow-lg hover:scale-[1.01] transition-all duration-300"
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

                        <div className="flex-1 w-full relative" style={{ minHeight: '300px' }}>
                            <ResponsiveContainer width="99%" height={300}>
                                <AreaChart data={volumeData}>
                                    <defs>
                                        <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={saasConfig.primaryColor} stopOpacity={0.4} />
                                            <stop offset="95%" stopColor={saasConfig.primaryColor} stopOpacity={0} />
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
                                        stroke={saasConfig.primaryColor}
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorOps)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Project Leaderboard -> Projects */}
            <div className="xl:col-span-1">
                <Link href="/projects" className="block h-full focus:outline-none">
                    <Card
                        className="p-8 rounded-2xl shadow-xl bg-surface-subtle h-[450px] flex flex-col border-none hover:shadow-lg hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-[4rem]" />

                        <h3 className="text-lg font-bold text-text-main flex items-center gap-2 mb-6 relative z-10">
                            <TrendingUp className="text-indigo-500" />
                            {isAr ? 'المشاريع الأكثر نشاطاً' : 'Top Active Projects'}
                        </h3>

                        <div className="flex-1 overflow-y-auto w-full min-h-0 custom-scrollbar pr-2 relative z-10 space-y-4">
                            {projectActivityData.map((project, index) => {
                                const maxTrips = Math.max(...projectActivityData.map(p => p.trips));
                                const percentage = (project.trips / maxTrips) * 100;

                                return (
                                    <div key={project.name} className="group">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-xs font-bold text-text-main uppercase tracking-wide truncate max-w-[70%]">
                                                {project.name}
                                            </span>
                                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">
                                                {project.trips} {isAr ? 'رحلة' : 'Trips'}
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

                            {projectActivityData.length === 0 && (
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

