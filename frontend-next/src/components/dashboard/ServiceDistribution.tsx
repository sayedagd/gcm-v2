import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Card from '@/components/ui/Card';
import { useStore } from '@/context';
import { Layers } from 'lucide-react';

interface ServiceDistributionProps {
    isAr: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const ServiceDistribution: React.FC<ServiceDistributionProps> = ({ isAr }) => {
    const { trips, services } = useStore();

    const data = useMemo(() => {
        const serviceCounts: Record<string, number> = {};
        trips.forEach(t => {
            const sName = services.find(s => s.service_id === t.service_id)?.service_name || 'Unknown';
            serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
        });

        return Object.entries(serviceCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6 only
    }, [trips, services]);

    return (
        <Card className="p-8 rounded-2xl shadow-xl bg-white dark:bg-slate-900 h-[450px] flex flex-col">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                <Layers className="text-blue-500" />
                {isAr ? 'توزيع الخدمات' : 'Service Class Distribution'}
            </h3>

            <div className="flex-1 w-full relative" style={{ minHeight: '300px' }}>
                <ResponsiveContainer width="99%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || '#10b981'} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: 'none',
                                borderRadius: '16px',
                                color: '#fff'
                            }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <span className="text-3xl font-bold text-slate-800 dark:text-white">{trips.length}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAr ? 'رحلة' : 'Trips'}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

