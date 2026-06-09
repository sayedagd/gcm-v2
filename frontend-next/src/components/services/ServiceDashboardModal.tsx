import React, { useMemo, useState } from 'react';
import { Service } from '@/types';
import { useStore } from '@/context';
import { Card, Modal, Button } from '@/components';
import {
    Activity, Truck, Package, Building2, Users, FileText, CalendarDays, CalendarRange, Scale
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { format, subDays, subMonths, isSameMonth, isSameYear, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ServiceDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    service: Service | null;
    isAr: boolean;
}

export const ServiceDashboardModal: React.FC<ServiceDashboardModalProps> = ({ isOpen, onClose, service, isAr }) => {
    const { trips, vehicles, containers, tanks, assetServiceLinks, services, projects } = useStore();
    const [chartMode, setChartMode] = useState<'monthly' | 'yearly'>('monthly');

    const dashboardData = useMemo(() => {
        if (!service) return null;

        // 1. Gather all related service IDs (the service itself + any children)
        const childServiceIds = services.filter(s => s.parent_id === service.service_id).map(s => s.service_id);
        const relevantServiceIds = new Set([service.service_id, ...childServiceIds]);

        // 2. Filter Trips
        const serviceTrips = trips.filter(t => relevantServiceIds.has(t.service_id));
        const totalTrips = serviceTrips.length;

        // Date-based trip metrics
        const now = new Date();
        const tripsThisYear = serviceTrips.filter(t => t.date && isSameYear(parseISO(t.date), now)).length;
        const tripsThisMonth = serviceTrips.filter(t => t.date && isSameMonth(parseISO(t.date), now)).length;

        // 3. Unique Entities
        const uniqueProjects = new Set(serviceTrips.map(t => t.project_id).filter(Boolean));
        const uniqueDrivers = new Set(serviceTrips.map(t => t.driver_id).filter(Boolean));

        // 4. Quantities grouped by unit
        const quantitiesByUnit: Record<string, number> = {};
        serviceTrips.forEach(t => {
            if (t.quantity && t.unit) {
                const unit = t.unit.toUpperCase();
                quantitiesByUnit[unit] = (quantitiesByUnit[unit] || 0) + Number(t.quantity);
            }
        });

        // 5. Linked Assets
        const linkedAssetIds = new Set(
            assetServiceLinks
                .filter(link => relevantServiceIds.has(link.service_id))
                .map(link => link.asset_id)
        );
        const linkedVehicles = vehicles.filter(v => linkedAssetIds.has(v.vehicle_id)).length;
        const linkedInventory = containers.filter(c => linkedAssetIds.has(c.container_id)).length +
            tanks.filter(t => linkedAssetIds.has(t.tank_id)).length;

        // 6. Chart Data Preparation
        const chartData: any[] = [];
        if (chartMode === 'monthly') {
            // Last 30 days
            for (let i = 29; i >= 0; i--) {
                const targetDate = subDays(now, i);
                const dateStr = format(targetDate, 'yyyy-MM-dd');
                const count = serviceTrips.filter(t => t.date === dateStr).length;
                chartData.push({
                    name: format(targetDate, 'dd MMM', isAr ? { locale: ar } : {}),
                    trips: count
                });
            }
        } else {
            // Last 12 months
            for (let i = 11; i >= 0; i--) {
                const targetDate = subMonths(now, i);
                const count = serviceTrips.filter(t => t.date && isSameMonth(parseISO(t.date), targetDate)).length;
                chartData.push({
                    name: format(targetDate, 'MMM yyyy', isAr ? { locale: ar } : {}),
                    trips: count
                });
            }
        }

        // 7. Recent Trips
        const recentTrips = [...serviceTrips]
            .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
            .slice(0, 5);

        return {
            totalTrips,
            tripsThisYear,
            tripsThisMonth,
            uniqueProjects: uniqueProjects.size,
            uniqueDrivers: uniqueDrivers.size,
            linkedVehicles,
            linkedInventory,
            quantitiesByUnit,
            chartData,
            recentTrips
        };
    }, [service, services, trips, vehicles, containers, tanks, assetServiceLinks, chartMode, isAr]);

    if (!service || !dashboardData) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isAr ? 'لوحة معلومات الخدمة' : 'Service Analytics'} size="xl">
            <div className={`space-y-6 pt-2 pb-6 ${isAr ? 'text-right' : 'text-left'}`}>

                {/* Header Profile */}
                <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                        <Activity size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-text-main leading-tight">{service.service_name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-surface-subtle border border-border rounded text-[10px] font-bold text-text-subtle uppercase tracking-widest">
                                {service.service_id}
                            </span>
                            {!service.parent_id && (
                                <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded text-[10px] font-bold">
                                    {isAr ? 'تصنيف رئيسي' : 'Parent Category'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-surface-subtle !border-border">
                        <div className="flex items-center gap-3 mb-2 opacity-70">
                            <FileText size={18} className="text-blue-500" />
                            <span className="text-xs font-bold uppercase tracking-wide">{isAr ? 'إجمالي الرحلات' : 'Total Trips'}</span>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-text-main">{dashboardData.totalTrips}</span>
                            <div className="text-[10px] font-bold text-text-subtle pb-1">
                                <span className="text-blue-500">{dashboardData.tripsThisMonth}</span> {isAr ? 'هذا الشهر' : 'this month'} <br />
                                <span className="text-blue-500">{dashboardData.tripsThisYear}</span> {isAr ? 'هذا العام' : 'this year'}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 bg-surface-subtle !border-border">
                        <div className="flex items-center gap-3 mb-2 opacity-70">
                            <Building2 size={18} className="text-emerald-500" />
                            <span className="text-xs font-bold uppercase tracking-wide">{isAr ? 'مشاريع فعالة' : 'Active Projects'}</span>
                        </div>
                        <span className="text-3xl font-black text-text-main">{dashboardData.uniqueProjects}</span>
                        <span className="text-xs text-text-subtle block mt-1 font-medium">{isAr ? 'مشروع طلب الخدمة' : 'Projects requested this'}</span>
                    </Card>

                    <Card className="p-4 bg-surface-subtle !border-border">
                        <div className="flex items-center gap-3 mb-2 opacity-70">
                            <Users size={18} className="text-amber-500" />
                            <span className="text-xs font-bold uppercase tracking-wide">{isAr ? 'سائقين' : 'Drivers'}</span>
                        </div>
                        <span className="text-3xl font-black text-text-main">{dashboardData.uniqueDrivers}</span>
                        <span className="text-xs text-text-subtle block mt-1 font-medium">{isAr ? 'شاركوا في التنفيذ' : 'Involved in execution'}</span>
                    </Card>

                    <Card className="p-4 bg-surface-subtle !border-border">
                        <div className="flex items-center gap-3 mb-2 opacity-70">
                            <Truck size={18} className="text-rose-500" />
                            <span className="text-xs font-bold uppercase tracking-wide">{isAr ? 'معدات مخصصة' : 'Dedicated Assets'}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1 text-sm font-bold">
                                <Truck size={14} className="text-text-subtle" /> {dashboardData.linkedVehicles}
                            </div>
                            <div className="flex items-center gap-1 text-sm font-bold">
                                <Package size={14} className="text-text-subtle" /> {dashboardData.linkedInventory}
                            </div>
                        </div>
                        <span className="text-[10px] text-text-subtle block mt-2 font-bold">{isAr ? 'مركبات / حاويات وتانكات' : 'Vehicles / Inventory'}</span>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Interactive Chart */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                                <Activity size={16} className="text-primary" />
                                {isAr ? 'معدل الطلب والرحلات' : 'Demand & Trip Velocity'}
                            </h3>
                            <div className="flex bg-surface-subtle border border-border rounded-lg p-0.5">
                                <button
                                    onClick={() => setChartMode('monthly')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${chartMode === 'monthly' ? 'bg-surface shadow text-primary' : 'text-text-subtle hover:text-text-main'}`}
                                >
                                    <CalendarDays size={12} /> {isAr ? 'شهري (بالأيام)' : 'Monthly (Days)'}
                                </button>
                                <button
                                    onClick={() => setChartMode('yearly')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${chartMode === 'yearly' ? 'bg-surface shadow text-primary' : 'text-text-subtle hover:text-text-main'}`}
                                >
                                    <CalendarRange size={12} /> {isAr ? 'سنوي (بالشهور)' : 'Yearly (Months)'}
                                </button>
                            </div>
                        </div>

                        <Card className="p-4 h-64 flex flex-col justify-center border border-border">
                            {dashboardData.chartData.every(d => d.trips === 0) ? (
                                <div className="text-center text-text-subtle text-sm font-bold">
                                    {isAr ? 'لا توجد بيانات للفترة المحددة' : 'No data for selected period'}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboardData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-subtle)' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-subtle)' }} />
                                        <Tooltip
                                            cursor={{ fill: 'var(--surface-subtle)' }}
                                            contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Bar dataKey="trips" name={isAr ? 'رحلات' : 'Trips'} radius={[4, 4, 0, 0]}>
                                            {dashboardData.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.trips > 0 ? 'var(--primary-color)' : 'var(--border-color)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </div>

                    {/* Quantities & Recent */}
                    <div className="space-y-6">
                        {/* Separated Quantities */}
                        <div>
                            <h3 className="text-sm font-bold text-text-main flex items-center gap-2 mb-3">
                                <Scale size={16} className="text-emerald-500" />
                                {isAr ? 'الكميات المنقولة' : 'Transported Volumes'}
                            </h3>
                            {Object.keys(dashboardData.quantitiesByUnit).length === 0 ? (
                                <div className="p-4 bg-surface-subtle rounded-xl border border-border text-center text-xs text-text-subtle font-bold">
                                    {isAr ? 'لم يتم تسجيل كميات' : 'No quantities recorded'}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {Object.entries(dashboardData.quantitiesByUnit).map(([unit, val]) => (
                                        <div key={unit} className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl">
                                            <span className="text-sm font-black text-text-main">{val.toLocaleString()}</span>
                                            <span className="text-[10px] font-bold text-text-subtle uppercase px-2 py-1 bg-surface-subtle rounded-md border border-border">{unit}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Trips */}
                        <div>
                            <h3 className="text-sm font-bold text-text-main flex items-center gap-2 mb-3">
                                <FileText size={16} className="text-amber-500" />
                                {isAr ? 'أحدث الرحلات' : 'Recent Trips'}
                            </h3>
                            <div className="space-y-2">
                                {dashboardData.recentTrips.length === 0 ? (
                                    <div className="p-4 bg-surface-subtle rounded-xl border border-border text-center text-xs text-text-subtle font-bold">
                                        {isAr ? 'لا توجد رحلات' : 'No recent trips'}
                                    </div>
                                ) : (
                                    dashboardData.recentTrips.map(trip => {
                                        const projName = projects.find(p => p.project_id === trip.project_id)?.project_name || trip.project_id;
                                        return (
                                            <div key={trip.trip_id} className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between group hover:border-primary/30 transition-colors">
                                                <div>
                                                    <p className="text-xs font-bold text-text-main truncate max-w-[150px]">{projName}</p>
                                                    <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{trip.trip_id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-bold bg-surface-subtle px-1.5 py-0.5 rounded text-text-main">
                                                        {trip.date}
                                                    </span>
                                                    {trip.quantity && (
                                                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                                            {trip.quantity} {trip.unit}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </Modal>
    );
};
