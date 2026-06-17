import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '@/components/ui/Card';
import { useStore } from '@/context';
import { Package, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { createApiClient } from '@/api/client';
import { EmptyState, SkeletonChart } from '@/components';

type InventoryAnalyticsPoint = {
    day: string;
    dayKey: string;
    value: number;
    inventoryItems: number;
};

type InventoryAnalyticsPayload = {
    status: string;
    generatedAt: string;
    hasHistory: boolean;
    totalTrips: number;
    activeDays: number;
    series: InventoryAnalyticsPoint[];
};

const inventoryClient = createApiClient();

interface InventoryAnalyticsProps {
    isAr: boolean;
}

export const InventoryAnalytics: React.FC<InventoryAnalyticsProps> = ({ isAr }) => {
    const { containers } = useStore();
    const [analytics, setAnalytics] = useState<InventoryAnalyticsPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const payload = await inventoryClient.getInventoryAnalytics();
                if (!active) {
                    return;
                }

                const typed = payload as Partial<InventoryAnalyticsPayload>;
                setAnalytics({
                    status: typeof typed.status === 'string' ? typed.status : 'ok',
                    generatedAt: typeof typed.generatedAt === 'string' ? typed.generatedAt : new Date().toISOString(),
                    hasHistory: Boolean(typed.hasHistory),
                    totalTrips: Number(typed.totalTrips || 0),
                    activeDays: Number(typed.activeDays || 0),
                    series: Array.isArray(typed.series) ? typed.series.map((point) => ({
                        day: String(point?.day || ''),
                        dayKey: String(point?.dayKey || ''),
                        value: Number(point?.value || 0),
                        inventoryItems: Number(point?.inventoryItems || 0),
                    })) : [],
                });
                setError(null);
            } catch (caughtError) {
                if (!active) {
                    return;
                }

                setAnalytics(null);
                setError(caughtError instanceof Error ? caughtError.message : 'Failed to load inventory analytics');
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            active = false;
        };
    }, []);


    const availabilityData = useMemo(() => {
        const total = containers.length;
        const available = containers.filter(c => c.status === 'AVAILABLE').length;
        const deployed = total - available;

        return [
            { name: isAr ? 'متاح' : 'Available', value: available, fill: '#10b981' },
            { name: isAr ? 'ميداني' : 'Deployed', value: deployed, fill: '#6366f1' },
        ];
    }, [containers, isAr]);

    const inYard = availabilityData[0]?.value ?? 0;
    const deployed = availabilityData[1]?.value ?? 0;

    const trendData = analytics?.series || [];
    const hasHistory = analytics?.hasHistory && trendData.some((point) => point.value > 0);

    return (
        <Link href="/inventory" className="block h-full focus:outline-none">
            <Card
                className="p-8 rounded-2xl bg-surface shadow-lg relative overflow-hidden h-100 group hover:scale-[1.01] transition-all duration-300"
            >
                {/* Decorative Background */}
                <div className="absolute -top-12.5 -right-12.5 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] group-hover:bg-purple-500/30 transition-colors" />
                <div className="absolute -bottom-12.5 -left-12.5 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />

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
                            <div className="h-37.5 flex items-center justify-center gap-4">
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-emerald-500/10 mb-2 mx-auto">
                                        <span className="text-lg font-bold text-emerald-400">{inYard}</span>
                                    </div>
                                    <span className="text-[10px] text-text-subtle font-bold">{isAr ? 'في المخزن' : 'In Yard'}</span>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500 flex items-center justify-center bg-indigo-500/10 mb-2 mx-auto">
                                        <span className="text-lg font-bold text-indigo-400">{deployed}</span>
                                    </div>
                                    <span className="text-[10px] text-text-subtle font-bold">{isAr ? 'في الموقع' : 'Deployed'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-full bg-surface-subtle rounded-2xl p-4 border border-border relative overflow-hidden hover:bg-surface transition-colors">
                            <p className="text-xs font-bold text-text-subtle mb-2 uppercase">{isAr ? 'مؤشر الاستهلاك (7 أيام)' : 'Utilization Trend (7d)'}</p>
                            {loading ? (
                                <div className="h-40 w-full absolute bottom-0 left-0 right-0">
                                    <SkeletonChart height="h-40" />
                                </div>
                            ) : hasHistory ? (
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
                                            <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorStock)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-40 flex items-center justify-center">
                                    <EmptyState
                                        icon={AlertCircle}
                                        title={isAr ? 'لا توجد حركة مخزون بعد' : 'No inventory activity yet'}
                                        description={error || (isAr ? 'سجل الحاويات المرتبط بالرحلات سيظهر هنا عند توفر بيانات فعلية.' : 'Inventory-linked trips will appear here once real movement data exists.')}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
};

