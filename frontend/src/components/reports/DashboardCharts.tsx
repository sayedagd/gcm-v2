import React from 'react';
import { Activity } from 'lucide-react';
import { Card } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
    PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardChartsProps {
    chartData: { date: string; completed: number; pending: number }[];
    statusDistData: { name: string; value: number; color: string }[];
    totalTrips: number;
    isAr: boolean;
}

const DashboardCharts: React.FC<DashboardChartsProps> = React.memo(({ chartData, statusDistData, totalTrips }) => {
    const { t } = useTranslation();
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Trend Chart */}
            <Card className="lg:col-span-2 p-6 !rounded-3xl shadow-lg border-border">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="font-bold text-lg text-text-main flex items-center gap-2">
                            <Activity size={20} className="text-primary" />
                            {t('analytics.stats.operationalTrends')}
                        </h3>
                    </div>
                </div>
                <div className="h-[300px] w-full min-w-0">
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <ResponsiveContainer width="99%" height={300}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--success-color)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--success-color)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="completed" stroke="var(--success-color)" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={3} />
                                <Area type="monotone" dataKey="pending" stroke="var(--primary-color)" fillOpacity={1} fill="url(#colorPending)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Card>

            {/* Status Distribution */}
            <Card className="p-6 !rounded-3xl shadow-lg border-border">
                <h3 className="font-bold text-lg text-text-main mb-6">
                    {t('analytics.stats.statusDistribution')}
                </h3>
                <div className="h-[250px] relative min-w-0">
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <ResponsiveContainer width="99%" height={250}>
                            <PieChart>
                                <Pie
                                    data={statusDistData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusDistData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-3xl font-black text-text-main">{totalTrips}</p>
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{t('analytics.stats.totalTrips')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}, (prev, next) => {
    return prev.totalTrips === next.totalTrips &&
        JSON.stringify(prev.chartData) === JSON.stringify(next.chartData) &&
        JSON.stringify(prev.statusDistData) === JSON.stringify(next.statusDistData);
});

export default DashboardCharts;
