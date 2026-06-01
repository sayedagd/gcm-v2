import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card } from '@/components';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface StatusDistributionChartProps {
    data: { name: string; value: number; color: string }[];
    isAr: boolean;
}

const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ data, isAr }) => {
    return (
        <Card className="h-full p-6 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-600 shadow-xl shadow-blue-500/20 text-white rounded-2xl"><ShieldCheck size={20} /></div>
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">{isAr ? 'حالات التشغيل' : 'Operation Status'}</h4>
                    <p className="text-xs font-bold text-text-main uppercase">{isAr ? 'توزيع الحالات' : 'Status Distribution'}</p>
                </div>
            </div>
            <div className="flex-1 w-full min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                borderRadius: '16px',
                                border: 'none',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                backdropFilter: 'blur(10px)'
                            }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            formatter={(value) => <span className="text-[10px] font-bold text-text-subtle uppercase px-2">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default StatusDistributionChart;
