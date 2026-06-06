import React from 'react';
import { Award, TrendingUp } from 'lucide-react';
import { Card, Button, EmptyState } from '@/components'; // Assuming EmptyState is exported from components
import { formatNumber } from '@/utils/helpers';
import { motion } from 'framer-motion';

interface TopDriversListProps {
    topDrivers: { id: string; name: string; trips: number; volume: number }[];
    isAr: boolean;
}

const TopDriversList: React.FC<TopDriversListProps> = ({ topDrivers, isAr }) => {
    return (
        <Card className="h-full p-8 flex flex-col">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-orange-600 shadow-xl shadow-orange-500/20 text-white rounded-2xl"><Award size={20} /></div>
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">{isAr ? 'نخبة القوى العاملة' : 'Top Drivers'}</h4>
                    <p className="text-xs font-bold text-text-main uppercase">{isAr ? 'المتصدرون تشغيلياً' : 'Performance Leaders'}</p>
                </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {topDrivers.map((d, i) => (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={i} className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border hover:border-orange-500/30 transition-all group">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shadow-lg ${i === 0 ? 'bg-amber-100 text-amber-600 shadow-amber-200/50' : i === 1 ? 'bg-surface-subtle text-text-main shadow-surface-subtle/50' : 'bg-orange-50 text-orange-600'}`}>
                                {i + 1}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-text-main uppercase tracking-tight truncate max-w-[90px]">{d.name}</p>
                                <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{d.trips} {isAr ? 'رحلات' : 'Trips'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-bold text-text-main">{formatNumber(d.volume)}</span>
                            <p className="text-[8px] font-bold text-text-subtle uppercase">TONS</p>
                        </div>
                    </motion.div>
                ))}
                {topDrivers.length === 0 && (
                    <EmptyState icon={TrendingUp} title={isAr ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient Data for Analysis'} />
                )}
            </div>
            <Button variant="secondary" className="mt-8 py-5 rounded-2xl bg-surface border-border text-[10px] font-bold uppercase tracking-[0.2em]">{isAr ? 'عرض لوحة الرواد الكاملة' : 'View Full Roster'}</Button>
        </Card>
    );
};

export default TopDriversList;
