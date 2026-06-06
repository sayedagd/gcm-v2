import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card } from '@/components';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatNumber } from '@/utils/helpers';

interface MonthlyTonnageChartProps {
    data: { month: string; tonnage: number }[];
    isAr: boolean;
}

const MonthlyTonnageChart: React.FC<MonthlyTonnageChartProps> = ({ data, isAr }) => {
    return (
        <Card className="h-full p-6 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-violet-600 shadow-xl shadow-violet-500/20 text-white rounded-2xl"><TrendingUp size={20} /></div>
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">{isAr ? 'النمو الشهري' : 'Monthly Growth'}</h4>
                    <p className="text-xs font-bold text-text-main uppercase">{isAr ? 'إجمالي الأطنان شهرياً' : 'Monthly Total Tonnage'}</p>
                </div>
            </div>
            <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 400, fill: '#94a3b8' }}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                            formatter={(value: number) => [formatNumber(value), isAr ? 'طن' : 'Tons']}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="tonnage" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default MonthlyTonnageChart;
