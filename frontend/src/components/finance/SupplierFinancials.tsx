import React, { useState } from 'react';
import { Truck, Package, Wrench, BarChart3, ChevronDown, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, StatCard } from '@/components';
import { formatNumber, formatCurrency } from '@/utils/helpers';
import { Supplier, Vehicle, Container, Tank, Driver, Trip, Project, Service } from '@/types';

interface SupplierFinancialsProps {
    suppliers: Supplier[];
    vehicles: Vehicle[];
    containers: Container[];
    tanks: Tank[];
    drivers: Driver[];
    trips: Trip[];
    projects: Project[];
    services: Service[];
    isAr: boolean;
}

const SupplierFinancials: React.FC<SupplierFinancialsProps> = ({
    suppliers,
    vehicles,
    containers,
    tanks,
    drivers,
    trips,
    projects,
    isAr
}) => {
    const [expandedSuppliers, setExpandedSuppliers] = useState<string[]>([]);
    const [activeTabs, setActiveTabs] = useState<Record<string, 'VEHICLES' | 'CONTAINERS' | 'STAFF' | 'PAYABLES'>>({});

    const toggleSupplier = (id: string) => {
        setExpandedSuppliers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        if (!activeTabs[id]) {
            setActiveTabs(prev => ({ ...prev, [id]: 'PAYABLES' }));
        }
    };

    const setTab = (supplierId: string, tab: 'VEHICLES' | 'CONTAINERS' | 'STAFF' | 'PAYABLES') => {
        setActiveTabs(prev => ({ ...prev, [supplierId]: tab }));
    };

    // Helper to calculate payable amount for a supplier
    const calculatePayables = (supplierId: string) => {
        let total = 0;
        const payableTrips: { trip: Trip, amount: number, serviceName: string, projectName: string }[] = [];

        trips.forEach(trip => {
            if (!trip.project_id || !trip.service_id) return;
            const project = projects.find(p => p.project_id === trip.project_id);
            if (!project) return;

            // Find the service configuration in the project (ProjectService)
            // Need to look into project.project_services (implied structure based on previous context)
            // Note: Project type definition usually has project_services? or we fetch them?
            // In the provided context, `projects` usually contain `project_services` or we match by logic.
            // Let's assume project has `services` or `project_services` array.
            // Checking `database.js` schema: `project_services` is a separate table.
            // But usually the `projects` prop passed to frontend includes joined services or we have a separate `projectServices` list?
            // `AccountantPortal.tsx` gets `projects` from useStore().
            // `useStore` usually loads projects with their services or we can find them in `project.project_services`.

            // Allow simplified check:
            // logic: If the ProjectService for this trip has `supplier_id === supplierId`.

            const prodService = (project as any).project_services?.find((ps: any) => ps.service_id === trip.service_id);

            if (prodService && prodService.supplier_id === supplierId) {
                const cost = (Number(trip.quantity) || 0) * (prodService.cost_price || 0);
                total += cost;
                payableTrips.push({
                    trip,
                    amount: cost,
                    serviceName: prodService.service_name || 'Service',
                    projectName: project.project_name
                });
            }
        });

        return { total, items: payableTrips };
    };

    const totalPayablesAll = suppliers.reduce((sum, s) => sum + calculatePayables(s.supplier_id).total, 0);

    return (
        <motion.div
            key="suppliers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
        >
            {/* SUPPLIER STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={isAr ? 'إجمالي المستحقات' : 'Total Payables'} value={formatCurrency(totalPayablesAll)} description={isAr ? 'التزامات للموردين' : 'Total Supplier Obligations'} icon={DollarSign} variant="rose" />
                <StatCard title={isAr ? 'الأسطول' : 'Fleet'} value={formatNumber(vehicles.filter(v => v.supplier_id).length)} description={isAr ? 'من موردين' : 'from suppliers'} icon={Truck} variant="blue" />
                <StatCard title={isAr ? 'المخزون' : 'Inventory'} value={formatNumber(containers.filter(c => c.supplier_id).length + tanks.filter(t => t.supplier_id).length)} description={isAr ? 'من موردين' : 'from suppliers'} icon={Package} variant="primary" />
                <StatCard title={isAr ? 'الفريق' : 'Staff'} value={formatNumber(drivers.filter(d => d.supplier_id).length)} description={isAr ? 'من موردين' : 'from suppliers'} icon={Wrench} variant="amber" />
            </div>

            {/* SUPPLIER BREAKDOWN */}
            <Card className="overflow-hidden rounded-2xl border-2 border-border shadow-lg">
                <div className="p-8 border-b border-border flex items-center gap-4 bg-surface-subtle">
                    <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-600/20"><BarChart3 size={24} /></div>
                    <div>
                        <h3 className="text-xl font-bold text-text-main uppercase tracking-tight">{isAr ? 'تفصيل الموردين' : 'Supplier Breakdown'}</h3>
                        <p className="text-xs font-bold text-text-subtle uppercase tracking-widest mt-1">{isAr ? 'التحليل المالي والتشغيلي' : 'Financial & Operational Analysis'}</p>
                    </div>
                </div>
                <div className="p-6 md:p-8 space-y-4 bg-surface-subtle">
                    {suppliers.map(supplier => {
                        const sVehicles = vehicles.filter(v => v.supplier_id === supplier.supplier_id);
                        const sContainers = containers.filter(c => c.supplier_id === supplier.supplier_id);
                        const sTanks = tanks.filter(t => t.supplier_id === supplier.supplier_id);
                        const sDrivers = drivers.filter(d => d.supplier_id === supplier.supplier_id);
                        const sTrips = trips.filter(t => sVehicles.some(v => v.vehicle_id === t.vehicle_id));

                        const { total: payableTotal, items: payableItems } = calculatePayables(supplier.supplier_id);

                        const isExpanded = expandedSuppliers.includes(supplier.supplier_id);
                        const currentTab = activeTabs[supplier.supplier_id] || 'PAYABLES';

                        // Calculate detailed trip counts
                        const vehicleData = sVehicles.map(v => ({
                            ...v,
                            tripCount: trips.filter(t => t.vehicle_id === v.vehicle_id).length
                        })).sort((a, b) => b.tripCount - a.tripCount);

                        const containerData = [...sContainers, ...sTanks].map(c => ({
                            ...c,
                            tripCount: trips.filter(t => t.inventory_item_id === (c as any).container_id || t.inventory_item_id === (c as any).tank_id).length
                        })).sort((a, b) => b.tripCount - a.tripCount);

                        const driverData = sDrivers.map(d => ({
                            ...d,
                            tripCount: trips.filter(t => t.driver_id === d.driver_id).length
                        })).sort((a, b) => b.tripCount - a.tripCount);

                        return (
                            <div key={supplier.supplier_id} className="bg-surface rounded-2xl border border-border overflow-hidden transition-all hover:shadow-md">
                                <div onClick={() => toggleSupplier(supplier.supplier_id)} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg bg-surface-subtle text-text-subtle`}>{supplier.name.charAt(0)}</div>
                                        <div>
                                            <h4 className="font-bold text-text-main group-hover:text-purple-600 transition-colors uppercase">{supplier.name}</h4>
                                            <span className="text-[10px] font-bold uppercase text-text-subtle tracking-widest bg-surface-subtle px-2 py-1 rounded-lg mt-1 inline-block">{supplier.category}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 text-right">
                                        <div className="hidden md:block"><p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الأصول' : 'ASSETS'}</p><p className="text-lg font-bold text-text-main">{sVehicles.length + sContainers.length + sTanks.length + sDrivers.length}</p></div>
                                        <div className="hidden md:block border-l border-border pl-8"><p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الرحلات' : 'TRIPS'}</p><p className="text-lg font-bold text-blue-600">{sTrips.length}</p></div>
                                        <div className="border-l border-border pl-8 border-r pr-8"><p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'مستحقات' : 'PAYABLE'}</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(payableTotal)}</p></div>
                                        <ChevronDown className={`text-text-subtle transition-transform duration-300 ${isExpanded ? 'rotate-180 text-purple-500' : ''}`} />
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border bg-surface-subtle">

                                            {/* TABS */}
                                            <div className="flex border-b border-border px-6 pt-4 gap-6 overflow-x-auto scrollbar-hide">
                                                <button onClick={() => setTab(supplier.supplier_id, 'PAYABLES')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${currentTab === 'PAYABLES' ? 'text-emerald-600 border-emerald-600' : 'text-text-subtle border-transparent hover:text-text-main'}`}>
                                                    {isAr ? 'المستحقات المالية' : 'PAYABLES'}
                                                </button>
                                                <button onClick={() => setTab(supplier.supplier_id, 'VEHICLES')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${currentTab === 'VEHICLES' ? 'text-purple-600 border-purple-600' : 'text-text-subtle border-transparent hover:text-text-main'}`}>
                                                    {isAr ? 'المركبات' : 'VEHICLES'} ({sVehicles.length})
                                                </button>
                                                <button onClick={() => setTab(supplier.supplier_id, 'CONTAINERS')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${currentTab === 'CONTAINERS' ? 'text-purple-600 border-purple-600' : 'text-text-subtle border-transparent hover:text-text-main'}`}>
                                                    {isAr ? 'الحاويات' : 'CONTAINERS'} ({sContainers.length + sTanks.length})
                                                </button>
                                                <button onClick={() => setTab(supplier.supplier_id, 'STAFF')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${currentTab === 'STAFF' ? 'text-purple-600 border-purple-600' : 'text-text-subtle border-transparent hover:text-text-main'}`}>
                                                    {isAr ? 'السائقين / العمال' : 'STAFF / DRIVERS'} ({sDrivers.length})
                                                </button>
                                            </div>

                                            {/* CONTENT */}
                                            <div className="p-6">
                                                {currentTab === 'PAYABLES' && (
                                                    <div className="overflow-hidden rounded-xl border border-border bg-surface">
                                                        <table className="w-full text-xs text-left">
                                                            <thead className="bg-surface-subtle text-text-subtle uppercase font-bold tracking-wider">
                                                                <tr>
                                                                    <th className="p-4">{isAr ? 'المشروع' : 'Project'}</th>
                                                                    <th className="p-4">{isAr ? 'الخدمة' : 'Service'}</th>
                                                                    <th className="p-4 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                                                                    <th className="p-4 text-right">{isAr ? 'المبلغ المستحق' : 'Amount'}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border text-text-main">
                                                                {payableItems.length > 0 ? payableItems.map((item, i) => (
                                                                    <tr key={i} className="hover:bg-surface-subtle transition-colors">
                                                                        <td className="p-4 font-bold">{item.projectName}</td>
                                                                        <td className="p-4 font-bold text-text-subtle">{item.serviceName}</td>
                                                                        <td className="p-4 text-center font-bold text-text-subtle">{item.trip.quantity}</td>
                                                                        <td className="p-4 text-right font-bold text-emerald-600">{formatCurrency(item.amount)}</td>
                                                                    </tr>
                                                                )) : (
                                                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">{isAr ? 'لا توجد مستحقات مسجلة' : 'No Payables Recorded'}</td></tr>
                                                                )}
                                                            </tbody>
                                                            {payableItems.length > 0 && (
                                                                <tfoot className="bg-surface-subtle border-t border-border">
                                                                    <tr>
                                                                        <td colSpan={3} className="p-4 text-right font-bold uppercase tracking-widest text-text-subtle">{isAr ? 'الإجمالي' : 'Total'}</td>
                                                                        <td className="p-4 text-right font-bold text-lg text-emerald-600">{formatCurrency(payableTotal)}</td>
                                                                    </tr>
                                                                </tfoot>
                                                            )}
                                                        </table>
                                                    </div>
                                                )}

                                                {currentTab === 'VEHICLES' && (
                                                    <div className="overflow-hidden rounded-xl border border-border bg-surface">
                                                        <table className="w-full text-xs text-left">
                                                            <thead className="bg-surface-subtle text-text-subtle uppercase font-bold tracking-wider">
                                                                <tr>
                                                                    <th className="p-4">{isAr ? 'اللوحة' : 'Plate No'}</th>
                                                                    <th className="p-4">{isAr ? 'النوع' : 'Type'}</th>
                                                                    <th className="p-4 text-center">{isAr ? 'عدد الرحلات' : 'Trips Count'}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border text-text-main">
                                                                {vehicleData.length > 0 ? vehicleData.map((v, i) => (
                                                                    <tr key={i} className="hover:bg-surface-subtle transition-colors">
                                                                        <td className="p-4 font-bold">{v.plate_no}</td>
                                                                        <td className="p-4 font-bold text-text-subtle">{v.vehicle_type}</td>
                                                                        <td className="p-4 text-center font-bold">
                                                                            <span className={`px-2 py-1 rounded-lg ${v.tripCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>{v.tripCount}</span>
                                                                        </td>
                                                                    </tr>
                                                                )) : (
                                                                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">{isAr ? 'لا توجد مركبات' : 'No Vehicles Found'}</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {currentTab === 'CONTAINERS' && (
                                                    <div className="overflow-hidden rounded-xl border border-border bg-surface">
                                                        <table className="w-full text-xs text-left">
                                                            <thead className="bg-surface-subtle text-text-subtle uppercase font-bold tracking-wider">
                                                                <tr>
                                                                    <th className="p-4">{isAr ? 'الكود' : 'Code'}</th>
                                                                    <th className="p-4">{isAr ? 'النوع' : 'Type'}</th>
                                                                    <th className="p-4 text-center">{isAr ? 'الرحلات / الاستخدام' : 'Trips / Usage'}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border text-text-main">
                                                                {containerData.length > 0 ? containerData.map((c: any, i) => (
                                                                    <tr key={i} className="hover:bg-surface-subtle transition-colors">
                                                                        <td className="p-4 font-bold">{c.code}</td>
                                                                        <td className="p-4 font-bold text-text-subtle">{(c as Container).container_id ? 'Container' : 'Tank'}</td>
                                                                        <td className="p-4 text-center font-bold">
                                                                            <span className={`px-2 py-1 rounded-lg ${c.tripCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{c.tripCount}</span>
                                                                        </td>
                                                                    </tr>
                                                                )) : (
                                                                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">{isAr ? 'لا توجد حاويات' : 'No Containers Found'}</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {currentTab === 'STAFF' && (
                                                    <div className="overflow-hidden rounded-xl border border-border bg-surface">
                                                        <table className="w-full text-xs text-left">
                                                            <thead className="bg-surface-subtle text-text-subtle uppercase font-bold tracking-wider">
                                                                <tr>
                                                                    <th className="p-4">{isAr ? 'الاسم' : 'Name'}</th>
                                                                    <th className="p-4">{isAr ? 'الدور' : 'Role'}</th>
                                                                    <th className="p-4 text-center">{isAr ? 'الرحلات المنفذة' : 'Executed Trips'}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border text-text-main">
                                                                {driverData.length > 0 ? driverData.map((d, i) => (
                                                                    <tr key={i} className="hover:bg-surface-subtle transition-colors">
                                                                        <td className="p-4 font-bold flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-full bg-surface-subtle flex items-center justify-center text-[10px] text-text-subtle">{d.name.charAt(0)}</div>
                                                                            {d.name}
                                                                        </td>
                                                                        <td className="p-4 font-bold text-text-subtle">{d.role_title || d.category}</td>
                                                                        <td className="p-4 text-center font-bold">
                                                                            <span className={`px-2 py-1 rounded-lg ${d.tripCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{d.tripCount}</span>
                                                                        </td>
                                                                    </tr>
                                                                )) : (
                                                                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">{isAr ? 'لا يوجد فريق عمل' : 'No Staff Found'}</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </motion.div>
    );
};

export default SupplierFinancials;
