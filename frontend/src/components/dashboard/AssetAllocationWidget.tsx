import React, { useMemo } from 'react';
import { Card } from '@/components';
import { useStore } from '@/context';
import { Truck, Package, Activity, Wrench, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const AssetAllocationWidget: React.FC<{ isAr: boolean }> = ({ isAr }) => {
    const { services, vehicles, containers, tanks, assetServiceLinks } = useStore();

    // Calculate allocation grouped by Parent Services
    const allocationData = useMemo(() => {
        const parentServices = services.filter(s => !s.parent_id);

        return parentServices.map(parent => {
            // Find this service and all its children to group assets properly
            const familyServiceIds = [
                parent.service_id,
                ...services.filter(s => s.parent_id === parent.service_id).map(s => s.service_id)
            ];

            // Get all asset IDs linked to any of these services
            const linkedAssetIds = new Set(
                assetServiceLinks
                    .filter(link => familyServiceIds.includes(link.service_id))
                    .map(link => link.asset_id)
            );

            // Filter actual assets based on linked IDs
            const linkedVehicles = vehicles.filter(v => linkedAssetIds.has(v.vehicle_id));
            const linkedContainers = containers.filter(c => linkedAssetIds.has(c.container_id));
            const linkedTanks = tanks.filter(t => linkedAssetIds.has(t.tank_id));

            // Compute statuses
            const vehiclesActive = linkedVehicles.filter(v => v.status === 'ACTIVE').length;
            const vehiclesMaintenance = linkedVehicles.filter(v => v.status === 'MAINTENANCE').length;
            
            const inventoryAvailable = [...linkedContainers, ...linkedTanks].filter(i => i.status === 'AVAILABLE').length;
            const inventoryDeployed = [...linkedContainers, ...linkedTanks].filter(i => i.status === 'IN_USE').length;
            const inventoryMaintenance = [...linkedContainers, ...linkedTanks].filter(i => ['MAINTENANCE', 'DAMAGED'].includes(i.status || '')).length;

            const totalAssets = linkedVehicles.length + linkedContainers.length + linkedTanks.length;
            
            // Health percentage (active/deployed/available vs broken)
            const totalHealthy = vehiclesActive + inventoryAvailable + inventoryDeployed;
            const healthPercentage = totalAssets > 0 ? Math.round((totalHealthy / totalAssets) * 100) : 0;

            return {
                service: parent,
                total: totalAssets,
                health: healthPercentage,
                breakdown: {
                    vehicles: {
                        total: linkedVehicles.length,
                        active: vehiclesActive,
                        maintenance: vehiclesMaintenance
                    },
                    inventory: {
                        total: linkedContainers.length + linkedTanks.length,
                        available: inventoryAvailable,
                        deployed: inventoryDeployed,
                        maintenance: inventoryMaintenance
                    }
                }
            };
        }).filter(data => data.total > 0).sort((a, b) => b.total - a.total); // Only show services with assets, sort by most assets
    }, [services, vehicles, containers, tanks, assetServiceLinks]);

    return (
        <Card className="p-6 rounded-2xl shadow-sm border border-border h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                        <Activity className="text-primary" size={20} />
                        {isAr ? 'سعة وإشغال الموارد' : 'Asset Allocation & Capacity'}
                    </h3>
                    <p className="text-xs text-text-subtle mt-1 font-medium">
                        {isAr ? 'توزيع الشاحنات والحاويات حسب نوع الخدمة' : 'Distribution of fleet & inventory by service'}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {allocationData.map((data, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={data.service.service_id} 
                        className="p-4 rounded-xl border border-border bg-surface-subtle"
                    >
                        {/* Header & Health Bar */}
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <h4 className="font-bold text-text-main">{data.service.service_name}</h4>
                                <span className="text-[10px] uppercase font-bold text-text-subtle tracking-widest mt-1 block">
                                    {data.total} {isAr ? 'أصل مخصص' : 'Total Dedicated Assets'}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className={`text-xl font-black ${data.health >= 80 ? 'text-emerald-500' : data.health >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                    {data.health}%
                                </span>
                                <span className="text-[9px] block text-text-subtle font-bold">{isAr ? 'معدل الجاهزية' : 'Readiness'}</span>
                            </div>
                        </div>

                        {/* Health Progress Bar */}
                        <div className="w-full h-1.5 bg-border/50 rounded-full mb-4 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${data.health >= 80 ? 'bg-emerald-500' : data.health >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                style={{ width: `${data.health}%` }} 
                            />
                        </div>

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Vehicles */}
                            {data.breakdown.vehicles.total > 0 && (
                                <div className="p-3 bg-surface rounded-lg border border-border/50">
                                    <div className="flex items-center justify-between mb-2 opacity-70">
                                        <Truck size={14} className="text-primary" />
                                        <span className="text-[10px] font-bold">{data.breakdown.vehicles.total} {isAr ? 'مركبة' : 'Fleet'}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={12} /> {data.breakdown.vehicles.active}
                                        </div>
                                        <div className="flex items-center gap-1 text-rose-500">
                                            <Wrench size={12} /> {data.breakdown.vehicles.maintenance}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inventory */}
                            {data.breakdown.inventory.total > 0 && (
                                <div className="p-3 bg-surface rounded-lg border border-border/50">
                                    <div className="flex items-center justify-between mb-2 opacity-70">
                                        <Package size={14} className="text-emerald-500" />
                                        <span className="text-[10px] font-bold">{data.breakdown.inventory.total} {isAr ? 'حاوية/تانك' : 'Inventory'}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title={isAr ? 'متاح وميداني' : 'Available & Deployed'}>
                                            <CheckCircle2 size={12} /> {data.breakdown.inventory.available + data.breakdown.inventory.deployed}
                                        </div>
                                        <div className="flex items-center gap-1 text-rose-500" title={isAr ? 'صيانة/تالف' : 'Maintenance/Damaged'}>
                                            <Wrench size={12} /> {data.breakdown.inventory.maintenance}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
                {allocationData.length === 0 && (
                    <div className="flex items-center justify-center h-32 opacity-50">
                        <p className="text-sm font-bold">{isAr ? 'لا توجد معدات مرتبطة بخدمات حتى الآن' : 'No assets linked to services yet'}</p>
                    </div>
                )}
            </div>
        </Card>
    );
};
