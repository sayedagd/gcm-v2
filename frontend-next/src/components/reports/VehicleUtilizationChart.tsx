import React from 'react';
import { Truck } from 'lucide-react';
import { Card } from '@/components';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface VehicleUtilizationChartProps {
    data: { name: string; value: number }[];
    isAr: boolean;
}

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b'];

const VehicleUtilizationChart: React.FC<VehicleUtilizationChartProps> = ({ data, isAr }) => {
    return (
        <Card className="h-full p-6 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-600 shadow-xl shadow-indigo-500/20 text-white rounded-2xl"><Truck size={20} /></div>
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">{isAr ? 'استغلال الأسطول' : 'Fleet Utilization'}</h4>
                    <p className="text-xs font-bold text-text-main uppercase">{isAr ? 'الرحلات حسب نوع المركبة' : 'Trips by Vehicle Type'}</p>
                </div>
            </div>
            <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={25}>
                            {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || '#10b981'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default VehicleUtilizationChart;
