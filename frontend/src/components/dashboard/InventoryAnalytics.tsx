import React, { useMemo } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '@/components/ui/Card';
import { useStore } from '@/context';
import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';

interface InventoryAnalyticsProps {
    isAr: boolean;
}

export const InventoryAnalytics: React.FC<InventoryAnalyticsProps> = ({ isAr }) => {
    const { containers } = useStore();


    const availabilityData = useMemo(() => {
        const total = containers.length;
        const available = containers.filter(c => c.status === 'AVAILABLE').length;
        const deployed = total - available;

        return [
            { name: isAr ? 'متاح' : 'Available', value: available, fill: '#10b981' },
            { name: isAr ? 'ميداني' : 'Deployed', value: deployed, fill: '#6366f1' },
        ];
    }, [containers, isAr]);

    const trendData = useMemo(() => {
        const available = containers.filter(c => c.status === 'AVAILABLE').length;
        const deployed = containers.filter(c => c.status && c.status !== 'AVAILABLE').length;

        return [
            { day: isAr ? 'متاح' : 'Available', stock: available },
            { day: isAr ? 'ميداني' : 'Deployed', stock: deployed },
            { day: isAr ? 'الإجمالي' : 'Total', stock: containers.length },
        ];
    }, [containers, isAr]);

    return (
        <Link to="/iv" className="block h-full focus:outline-none">
            <Card
                className="p-8 rounded-2xl bg-surface shadow-lg relative overflow-hidden h-[400px] group hover:scale-[1.01] transition-all duration-300"
            >
                {/* Decorative Background */}
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] group-hover:bg-purple-500/30 transition-colors" />
                <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />

                <div className="relative z-10 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-3 text-text-main">
                                <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400 group-hover:rotate-12 transition-transform">
                                    <Package size={24} />
                                </div>
                                {isAr ? 'ذكاء المخزون' : 'Inventory Intelligence'}
                            </h3>
                            <p className="text-sm text-text-subtle font-bold mt-2 ml-1">
                                {isAr ? 'مراقبة حركة الحاويات' : 'Container Movement Tracking'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-text-main">{containers.length}</p>
                            <p className="text-[9px] text-purple-400 uppercase tracking-widest font-bold">Total Assets</p>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="h-full bg-surface-subtle rounded-2xl p-4 border border-border hover:bg-surface transition-colors">
                            <p className="text-xs font-bold text-text-subtle mb-4 uppercase">{isAr ? 'حالة التوفر' : 'Availability Ratio'}</p>
                            <div className="h-[150px] flex items-center justify-center gap-4">
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-emerald-500/10 mb-2 mx-auto">
                                        <span className="text-lg font-bold text-emerald-400">{availabilityData[0].value}</span>
                                    </div>
                                    <span className="text-[10px] text-text-subtle font-bold">{isAr ? 'في المخزن' : 'In Yard'}</span>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500 flex items-center justify-center bg-indigo-500/10 mb-2 mx-auto">
                                        <span className="text-lg font-bold text-indigo-400">{availabilityData[1].value}</span>
                                    </div>
                                    <span className="text-[10px] text-text-subtle font-bold">{isAr ? 'في الموقع' : 'Deployed'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-full bg-surface-subtle rounded-2xl p-4 border border-border relative overflow-hidden hover:bg-surface transition-colors">
                            <p className="text-xs font-bold text-text-subtle mb-2 uppercase">{isAr ? 'ملف الاستفادة الحالي' : 'Current Utilization Profile'}</p>
                            <div className="h-40 w-full absolute bottom-0 left-0 right-0">
                                <ResponsiveContainer width="99%" height={250}>
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '10px', color: 'var(--text-main)' }} />
                                        <Area type="monotone" dataKey="stock" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorStock)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
};

