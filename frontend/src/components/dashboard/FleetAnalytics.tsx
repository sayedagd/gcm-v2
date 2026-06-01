import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '@/components/ui/Card';
import { useStore } from '@/context';
import { Truck, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface FleetAnalyticsProps {
    isAr: boolean;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export const FleetAnalytics: React.FC<FleetAnalyticsProps> = ({ isAr }) => {
    const { vehicles } = useStore();


    const statusData = useMemo(() => {
        const counts = { ACTIVE: 0, MAINTENANCE: 0, INACTIVE: 0 };
        vehicles.forEach(v => {
            const status = v.status as keyof typeof counts;
            if (counts[status] !== undefined) counts[status]++;
        });
        return [
            { name: isAr ? 'نشط' : 'Active', value: counts.ACTIVE, color: '#10b981' },
            { name: isAr ? 'صيانة' : 'Maintenance', value: counts.MAINTENANCE, color: '#f59e0b' },
            { name: isAr ? 'متوقف' : 'Inactive', value: counts.INACTIVE, color: '#ef4444' },
        ];
    }, [vehicles, isAr]);

    const typeData = useMemo(() => {
        const counts: Record<string, number> = {};
        vehicles.forEach(v => {
            counts[v.vehicle_type] = (counts[v.vehicle_type] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [vehicles]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Status Card - Donut */}
            <Link to="/f" className="block focus:outline-none h-full">
                <Card
                    className="p-8 rounded-2xl bg-surface shadow-xl border border-border flex flex-col relative overflow-hidden group hover:shadow-lg hover:scale-[1.01] transition-all duration-300 h-full"
                >
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2 text-text-main">
                                <Activity className="text-emerald-500" size={20} />
                                {isAr ? 'حالة الأسطول' : 'Fleet Health'}
                            </h3>
                        </div>
                    </div>

                    <div className="flex-1 relative" style={{ minHeight: '200px', width: '100%' }}>
                        <ResponsiveContainer width="99%" height={250}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '12px', color: 'var(--text-main)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Stat */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-bold text-text-main">{vehicles.length}</span>
                            <span className="text-[10px] font-bold uppercase text-text-subtle tracking-widest">{isAr ? 'وحدة' : 'UNITS'}</span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-4 mt-2">
                        {statusData.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                <span className="text-[10px] font-bold text-text-subtle uppercase">{s.name} ({s.value})</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </Link>

            {/* Composition Card - Grid */}
            <Link to="/f" className="block focus:outline-none h-full">
                <Card
                    className="p-8 rounded-2xl bg-surface shadow-xl border border-border flex flex-col relative overflow-hidden group hover:shadow-lg hover:scale-[1.01] transition-all duration-300 h-full"
                >
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2 text-text-main">
                                <Truck className="text-blue-500" size={20} />
                                {isAr ? 'تصنيف المركبات' : 'Fleet Composition'}
                            </h3>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 grid grid-cols-2 gap-3 content-start">
                        {typeData.map((type, idx) => (
                            <div key={idx} className="bg-surface-subtle p-4 rounded-3xl flex flex-col gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group/item">
                                <div className="flex justify-between items-start">
                                    <span className="p-2 bg-surface border border-border rounded-xl text-blue-500 shadow-sm">
                                        <Truck size={16} />
                                    </span>
                                    <span className="text-xl font-bold text-text-main">{type.value}</span>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-text-subtle uppercase tracking-wide truncate" title={type.name}>
                                        {type.name}
                                    </h4>
                                    <div className="h-1.5 w-full bg-surface-subtle rounded-full mt-2 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(type.value / vehicles.length) * 100}%` }}
                                            className="h-full bg-blue-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {typeData.length === 0 && (
                            <div className="col-span-2 text-center py-10 text-text-subtle text-xs font-bold uppercase opacity-50">
                                {isAr ? 'لا يوجد بيانات' : 'No Data Available'}
                            </div>
                        )}
                    </div>
                </Card>
            </Link>
        </div>
    );
};

