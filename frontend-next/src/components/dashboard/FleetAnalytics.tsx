import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '@/components/ui/Card';
import { useStore } from '@/context';
import { Truck, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface FleetAnalyticsProps {
    isAr: boolean;
}

const COLORS = ['var(--success-color)', 'var(--amber-color)', 'var(--danger-color)', 'var(--primary-color)'];

export const FleetAnalytics: React.FC<FleetAnalyticsProps> = ({ isAr }) => {
    const { vehicles } = useStore();

    const getStatusTone = (name: string) => {
        if (name === (isAr ? 'نشط' : 'Active')) {
            return { dot: 'var(--success-color)', text: 'tone-success' };
        }
        if (name === (isAr ? 'صيانة' : 'Maintenance')) {
            return { dot: 'var(--amber-color)', text: 'tone-warning' };
        }
        return { dot: 'var(--danger-color)', text: 'tone-danger' };
    };


    const statusData = useMemo(() => {
        const counts = { ACTIVE: 0, MAINTENANCE: 0, INACTIVE: 0 };
        vehicles.forEach(v => {
            const status = v.status as keyof typeof counts;
            if (counts[status] !== undefined) counts[status]++;
        });
        return [
            { name: isAr ? 'نشط' : 'Active', value: counts.ACTIVE, color: 'var(--success-color)' },
            { name: isAr ? 'صيانة' : 'Maintenance', value: counts.MAINTENANCE, color: 'var(--amber-color)' },
            { name: isAr ? 'متوقف' : 'Inactive', value: counts.INACTIVE, color: 'var(--danger-color)' },
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
        <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* Status Card - Donut */}
            <Link href="/fleet" className="block focus:outline-none h-full">
                <Card
                    className="relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-xl transition-all duration-300 group hover:scale-[1.01] hover:shadow-lg md:p-8"
                >
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2 text-text-main">
                                <Activity className="tone-success" size={20} />
                                {isAr ? 'حالة الأسطول' : 'Fleet Health'}
                            </h3>
                        </div>
                    </div>

                    <div className="flex-1 relative" style={{ minHeight: '200px', width: '100%' }}>
                        {vehicles.length === 0 ? (
                            <div className="flex h-[250px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-subtle text-text-subtle">
                                <p className="text-xs font-bold uppercase tracking-widest">{isAr ? 'لا توجد مركبات بعد' : 'No fleet units yet'}</p>
                            </div>
                        ) : (
                            <>
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
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-4xl font-bold text-text-main">{vehicles.length}</span>
                                    <span className="text-[10px] font-bold uppercase text-text-subtle tracking-widest">{isAr ? 'وحدة' : 'UNITS'}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
                        {statusData.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                <span className={`text-[10px] font-bold uppercase ${getStatusTone(s.name).text}`}>{s.name} ({s.value})</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </Link>

            {/* Composition Card - Grid */}
            <Link href="/fleet" className="block focus:outline-none h-full">
                <Card
                    className="relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-xl transition-all duration-300 group hover:scale-[1.01] hover:shadow-lg md:p-8"
                >
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2 text-text-main">
                                <Truck className="text-primary" size={20} />
                                {isAr ? 'تصنيف المركبات' : 'Fleet Composition'}
                            </h3>
                        </div>
                    </div>

                    <div className="grid flex-1 grid-cols-1 content-start gap-3 overflow-y-auto pr-1 custom-scrollbar sm:grid-cols-2">
                        {typeData.map((type, idx) => (
                            <div key={idx} className="bg-surface-subtle p-4 rounded-3xl flex flex-col gap-3 hover:bg-primary/5 transition-colors group/item">
                                <div className="flex justify-between items-start">
                                    <span className="p-2 bg-surface border border-border rounded-xl text-primary shadow-sm">
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
                                            className="h-full bg-primary rounded-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {typeData.length === 0 && (
                            <div className="col-span-2 flex h-[250px] items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-subtle text-text-subtle">
                                <p className="text-xs font-bold uppercase tracking-widest">{isAr ? 'لا يوجد تصنيف متاح' : 'No composition data yet'}</p>
                            </div>
                        )}
                    </div>
                </Card>
            </Link>
        </div>
    );
};

