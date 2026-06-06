import React, { useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStore } from '@/context';
import { Card } from '@/components';
import { TrendingUp, Layers, Activity, Award } from 'lucide-react';

interface ServiceAnalyticsProps {
    isAr: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const ServiceAnalytics: React.FC<ServiceAnalyticsProps> = ({ isAr }) => {
    const { services, trips } = useStore();

    // Calculate trips per service
    const tripsPerService = useMemo(() => {
        const counts: Record<string, { name: string; count: number; isParent: boolean }> = {};

        services.forEach(service => {
            const tripCount = trips.filter(t => t.service_id === service.service_id).length;
            counts[service.service_id] = {
                name: service.service_name,
                count: tripCount,
                isParent: !service.parent_id
            };
        });

        return Object.values(counts)
            .filter(s => s.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [services, trips]);

    // Calculate parent vs child distribution
    const hierarchyDistribution = useMemo(() => {
        const parentServices = services.filter(s => !s.parent_id);
        const childServices = services.filter(s => s.parent_id);

        return [
            {
                name: isAr ? 'خدمات رئيسية' : 'Parent Services',
                value: parentServices.length,
                trips: trips.filter(t => parentServices.some(p => p.service_id === t.service_id)).length
            },
            {
                name: isAr ? 'خدمات فرعية' : 'Child Services',
                value: childServices.length,
                trips: trips.filter(t => childServices.some(c => c.service_id === t.service_id)).length
            }
        ];
    }, [services, trips, isAr]);

    // Calculate usage trend (last 6 months)
    const usageTrend = useMemo(() => {
        const monthsData: Record<string, number> = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthsData[key] = 0;
        }

        // Count trips per month
        trips.forEach(trip => {
            if (trip.date) {
                const [year, month] = trip.date.split('-');
                const key = `${year}-${month}`;
                if (monthsData[key] !== undefined) {
                    monthsData[key]++;
                }
            }
        });

        return Object.entries(monthsData).map(([key, count]) => ({
            month: key,
            trips: count
        }));
    }, [trips]);

    // Top performing services
    const topServices = useMemo(() => {
        return tripsPerService.slice(0, 3);
    }, [tripsPerService]);

    return (
        <div className="space-y-8">
            {/* Top Services Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topServices.map((service, index) => (
                    <Card key={service.name} className="p-6 bg-surface border-2 border-border hover:border-primary-500/30 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${index === 0 ? 'bg-amber-500 text-white' :
                                index === 1 ? 'bg-slate-400 text-white' :
                                    'bg-orange-600 text-white'
                                }`}>
                                <Award size={24} />
                            </div>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                index === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                #{index + 1}
                            </span>
                        </div>
                        <h4 className="text-lg font-bold text-text-main mb-2 line-clamp-2">
                            {service.name}
                        </h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                                {service.count}
                            </span>
                            <span className="text-sm font-bold text-slate-500">
                                {isAr ? 'رحلة' : 'trips'}
                            </span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trips per Service Bar Chart */}
                <Card className="p-8 bg-surface">
                    <h3 className="text-xl font-bold text-text-main flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                            <Activity className="text-emerald-600 dark:text-emerald-400" size={20} />
                        </div>
                        {isAr ? 'عدد الرحلات لكل خدمة' : 'Trips per Service'}
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="99%" height={300}>
                            <BarChart data={tripsPerService}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={100}
                                    tick={{ fill: 'var(--text-subtle)', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <YAxis tick={{ fill: 'var(--text-subtle)', fontSize: 12, fontWeight: 'bold' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: 'var(--text-main)'
                                    }}
                                />
                                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Hierarchy Distribution Pie Chart */}
                <Card className="p-8 bg-surface">
                    <h3 className="text-xl font-bold text-text-main flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Layers className="text-blue-600 dark:text-blue-400" size={20} />
                        </div>
                        {isAr ? 'توزيع الخدمات الهرمي' : 'Service Hierarchy'}
                    </h3>
                    <div className="h-80 relative">
                        <ResponsiveContainer width="99%" height={250}>
                            <PieChart>
                                <Pie
                                    data={hierarchyDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {hierarchyDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || '#10b981'} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-3xl font-bold text-text-main">
                                    {services.length}
                                </span>
                                <p className="text-xs font-bold text-text-subtle uppercase">
                                    {isAr ? 'خدمة' : 'Services'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Usage Trend Line Chart */}
                <Card className="p-8 bg-surface lg:col-span-2">
                    <h3 className="text-xl font-bold text-text-main flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                            <TrendingUp className="text-purple-600 dark:text-purple-400" size={20} />
                        </div>
                        {isAr ? 'اتجاه الاستخدام (آخر 6 أشهر)' : 'Usage Trend (Last 6 Months)'}
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="99%" height={300}>
                            <LineChart data={usageTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={100}
                                    tick={{ fill: 'var(--text-subtle)', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <YAxis tick={{ fill: 'var(--text-subtle)', fontSize: 12, fontWeight: 'bold' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="trips"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    dot={{ fill: '#8b5cf6', r: 5 }}
                                    activeDot={{ r: 7 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ServiceAnalytics;

