import React from 'react';
import { Layers } from 'lucide-react';
import { Card } from '@/components';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatNumber } from '@/utils/helpers';

interface ServiceMixChartProps {
    serviceMix: { name: string; value: number }[];
    isAr: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const ServiceMixChart: React.FC<ServiceMixChartProps> = ({ serviceMix, isAr }) => {
    return (
        <Card className="h-full p-6 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-600 shadow-xl shadow-purple-500/20 text-white rounded-2xl"><Layers size={20} /></div>
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">{isAr ? 'تنوع المسارات' : 'Waste Streams'}</h4>
                    <p className="text-xs font-bold text-text-main uppercase">{isAr ? 'مزيج الخدمات' : 'Category Mix'} ({serviceMix.length})</p>
                </div>
            </div>
            <div className="flex-1 w-full min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={serviceMix} innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none">
                            {serviceMix.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '11px' }} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-3xl font-black text-text-main tracking-tight">{serviceMix.length}</span>
                    <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'فئات' : 'Types'}</span>
                </div>
            </div>
            <div className="mt-4 space-y-3">
                {serviceMix.slice(0, 3).map((d, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-surface-subtle border border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-[9px] font-bold text-text-subtle uppercase truncate max-w-[80px]">{d.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-text-main">{formatNumber(d.value)}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default ServiceMixChart;
