import React, { useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStore } from '@/context';
import Card from '@/components/ui/Card';
import { TrendingUp, Layers, Activity, Award } from 'lucide-react';

interface ServiceAnalyticsProps {
    isAr: boolean;
}

const COLORS = [
    'var(--success-color)',
    'var(--primary-color)',
    'var(--amber-color)',
    'var(--danger-color)',
    'color-mix(in srgb, var(--primary-color) 72%, white 18%)',
    'color-mix(in srgb, var(--danger-color) 78%, white 14%)',
    'color-mix(in srgb, var(--success-color) 74%, white 18%)',
    'color-mix(in srgb, var(--amber-color) 70%, white 18%)'
];

export const ServiceAnalytics: React.FC<ServiceAnalyticsProps> = ({ isAr }) => {
    const { services, trips } = useStore();

    const getRankTone = (index: number) => {
        if (index === 0) {
            return {
                badge: 'tone-warning tone-warning-bg tone-warning-border',
                icon: 'tone-warning-bg text-white',
            };
        }

        if (index === 1) {
            return {
                badge: 'accent-chip',
                icon: 'accent-chip',
            };
        }

        return {
            badge: 'tone-danger tone-danger-bg tone-danger-border',
            icon: 'tone-danger-bg text-white',
        };
    };

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
        <div className="space-y-6 md:space-y-8">
            {/* Top Services Quick Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
                {topServices.map((service, index) => (
                    <Card key={service.name} className="p-6 bg-surface border-2 border-border hover:border-primary/30 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${getRankTone(index).icon}`}>
                                <Award size={24} />
                            </div>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${getRankTone(index).badge}`}>
                                #{index + 1}
                            </span>
                        </div>
                        <h4 className="text-lg font-bold text-text-main mb-2 line-clamp-2">
                            {service.name}
                        </h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold tone-success">
                                {service.count}
                            </span>
                            <span className="text-sm font-bold text-text-subtle">
                                {isAr ? 'رحلة' : 'trips'}
                            </span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trips per Service Bar Chart */}
                <Card className="p-5 md:p-8 bg-surface">
                    <h3 className="text-xl font-bold text-text-main flex items-center gap-3 mb-6">
                        <div className="tone-success tone-success-bg tone-success-border p-2.5 rounded-xl border">
                            <Activity size={20} />
                        </div>
                        {isAr ? 'عدد الرحلات لكل خدمة' : 'Trips per Service'}
                    </h3>
                    <div className="h-72 md:h-80">
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
                                <Bar dataKey="count" fill="var(--success-color)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Hierarchy Distribution Pie Chart */}
                <Card className="p-5 md:p-8 bg-surface">
                    <h3 className="text-xl font-bold text-text-main flex items-center gap-3 mb-6">
                        <div className="accent-chip p-2.5 rounded-xl border">
                            <Layers size={20} />
                        </div>
                        {isAr ? 'توزيع الخدمات الهرمي' : 'Service Hierarchy'}
                    </h3>
                    <div className="relative h-72 md:h-80">
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
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || 'var(--primary-color)'} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'color-mix(in srgb, var(--surface) 96%, transparent)',
                                        border: '1px solid color-mix(in srgb, var(--border-color) 88%, transparent)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: 'var(--text-main)',
                                        boxShadow: 'var(--shadow-panel)'
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-subtle)' }}
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
                <Card className="p-5 md:p-8 bg-surface lg:col-span-2">
                    <h3 className="text-xl font-bold text-text-main flex items-center gap-3 mb-6">
                        <div className="tone-info tone-info-bg tone-info-border p-2.5 rounded-xl border">
                            <TrendingUp size={20} />
                        </div>
                        {isAr ? 'اتجاه الاستخدام (آخر 6 أشهر)' : 'Usage Trend (Last 6 Months)'}
                    </h3>
                    <div className="h-72 md:h-80">
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
                                        backgroundColor: 'color-mix(in srgb, var(--surface) 96%, transparent)',
                                        border: '1px solid color-mix(in srgb, var(--border-color) 88%, transparent)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: 'var(--text-main)',
                                        boxShadow: 'var(--shadow-panel)'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="trips"
                                    stroke="var(--primary-color)"
                                    strokeWidth={3}
                                    dot={{ fill: 'var(--primary-color)', r: 5 }}
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

