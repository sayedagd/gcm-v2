import React from 'react';
import { Building2 } from 'lucide-react';
import { Card } from '@/components';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { formatNumber } from '@/utils/helpers';

interface TopProjectsChartProps {
    data: { name: string; value: number }[];
    isAr: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

const TopProjectsChart: React.FC<TopProjectsChartProps> = ({ data, isAr }) => {
    return (
        <Card className="h-full p-6 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-emerald-600 shadow-xl shadow-emerald-500/20 text-white rounded-2xl"><Building2 size={20} /></div>
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">{isAr ? 'إنتاجية المشاريع' : 'Project Productivity'}</h4>
                    <p className="text-xs font-bold text-text-main uppercase">{isAr ? 'الأعلى إنتاجاً (طن)' : 'Top Projects (Tons)'}</p>
                </div>
            </div>
            <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.05} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            width={100}
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                            orientation={isAr ? 'right' : 'left'}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            formatter={(value: number) => [formatNumber(value), isAr ? 'طن' : 'Tons']}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default TopProjectsChart;
