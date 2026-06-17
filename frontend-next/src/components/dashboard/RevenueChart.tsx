import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '@/components/ui/Card';
import { formatNumber } from '@/utils/helpers';
import { TrendingUp, Calendar } from 'lucide-react';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { SkeletonFullPage } from '@/components/common/PageSkeleton';

interface RevenueChartProps {
    isAr: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ isAr }) => {
    const { data: analytics, loading, error } = useDashboardAnalytics();
    const series = analytics?.revenueTrend.series || [];

    const chartData = useMemo(() => {
        return series.map((point) => ({
            date: point.date,
            value: point.value,
        }));
    }, [series]);

    const totalRevenue = analytics?.revenueTrend.totalRevenue || 0;

    if (loading) {
        return <SkeletonFullPage variant="cards" />;
    }

    return (
        <Card className="p-8 rounded-2xl shadow-xl bg-surface h-[450px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <TrendingUp className="text-emerald-500" />
                        {isAr ? 'إيرادات تقديرية (30 يوم)' : 'Estimated Revenue Trend (30d)'}
                    </h3>
                    <p className="text-sm text-text-subtle font-bold mt-1">
                        {isAr ? 'إجمالي الإيرادات التقديرية' : 'Total estimated revenue'}: <span className="text-emerald-500">{formatNumber(totalRevenue)}</span>
                    </p>
                </div>
                <div className="p-3 bg-surface-subtle rounded-2xl">
                    <Calendar className="text-text-subtle" size={20} />
                </div>
            </div>

            {error ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    {error}
                </div>
            ) : null}

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="99%" height={300}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            interval={4}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                color: 'var(--text-main)',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                            }}
                            labelStyle={{ color: 'var(--text-subtle)', marginBottom: '0.5rem' }}
                            itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

