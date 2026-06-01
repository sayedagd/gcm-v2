import React from 'react';
import { Clock } from 'lucide-react';
import { Card } from '@/components';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, Tooltip, Bar } from 'recharts';

interface PeakHoursChartProps {
    peakHours: { hour: string; count: number }[];
    isAr: boolean;
}

const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ peakHours, isAr }) => {
    return (
        <Card className="h-full p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-600 shadow-lg shadow-amber-500/20 text-white rounded-2xl"><Clock size={20} /></div>
                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">{isAr ? 'كثافة التشغيل الساعية' : 'Hourly Intensity'}</h4>
                        <p className="text-xs font-bold text-text-main uppercase">{isAr ? 'توزيع الرحلات' : 'Trip Distribution'}</p>
                    </div>
                </div>
            </div>
            <div className="flex-1 w-full min-h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHours}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis
                            dataKey="hour"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                            interval={2}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '11px' }}
                        />
                        <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default PeakHoursChart;
