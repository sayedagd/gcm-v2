import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Card from '@/components/ui/Card';
import { useStore } from '@/context';
import { Layers } from 'lucide-react';

interface ServiceDistributionProps {
    isAr: boolean;
}

const COLORS = [
    'var(--success-color)',
    'var(--primary-color)',
    'var(--amber-color)',
    'var(--danger-color)',
    'color-mix(in srgb, var(--primary-color) 72%, white 18%)',
    'color-mix(in srgb, var(--danger-color) 78%, white 14%)'
];

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
        <Card className="flex h-[400px] md:h-[450px] flex-col rounded-2xl p-5 md:p-8">
            <h3 className="text-xl font-bold text-text-main flex items-center gap-2 mb-6">
                <Layers className="text-primary" />
                {isAr ? 'توزيع الخدمات' : 'Service Class Distribution'}
            </h3>

            <div className="flex-1 w-full relative" style={{ minHeight: '300px' }}>
                {data.length === 0 ? (
                    <div className="flex h-[300px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-subtle text-text-subtle">
                        <p className="text-xs font-bold uppercase tracking-widest">{isAr ? 'لا توجد بيانات توزيع' : 'No distribution data yet'}</p>
                    </div>
                ) : (
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
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || 'var(--primary-color)'} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'color-mix(in srgb, var(--surface) 96%, transparent)',
                                    border: '1px solid color-mix(in srgb, var(--border-color) 88%, transparent)',
                                    borderRadius: '16px',
                                    color: 'var(--text-main)',
                                    boxShadow: 'var(--shadow-panel)'
                                }}
                                itemStyle={{ color: 'var(--text-main)' }}
                                labelStyle={{ color: 'var(--text-subtle)' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px', color: 'var(--text-subtle)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}

                {data.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="text-3xl font-bold text-text-main">{trips.length}</span>
                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'رحلة' : 'Trips'}</p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

