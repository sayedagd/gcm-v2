import React from 'react';
import { Activity } from 'lucide-react';
import { Card } from '@/components';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface VolumeTrendChartProps {
    trendData: { date: string; val: number }[];
    isAr: boolean;
}

const VolumeTrendChart: React.FC<VolumeTrendChartProps> = ({ trendData, isAr }) => {
    return (
        <Card className="h-full p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 shadow-xl shadow-emerald-500/20 text-white rounded-2xl"><Activity size={20} /></div>
                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">{isAr ? 'اتجاهات التوليد' : 'Volume Trend'}</h4>
                        <p className="text-xs font-bold text-text-main uppercase">{isAr ? 'التدفق المادي الزمني' : 'Volume over Time'}</p>
                    </div>
                </div>
            </div>
            <div className="flex-1 w-full min-h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                        <defs>
                            <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                            dy={10}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 400, fill: '#94a3b8' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', fontWeight: 'bold' }}
                            formatter={(val: number) => [val.toFixed(2), isAr ? 'طن' : 'Tons']}
                        />
                        <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={4} fill="url(#gT)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default VolumeTrendChart;
