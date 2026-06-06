import React from 'react';
import { Truck, Sparkles, Edit2, Trash2, Activity, Shield, Building2, Zap, FileText } from 'lucide-react';
import { Button, Badge, Card } from '@/components';
import { Vehicle, Trip } from '@/types';
import Link from 'next/link';
import VehicleProgress from './VehicleProgress';
import { useStore } from '@/context';

interface VehicleCardProps {
    vehicle: Vehicle;
    trips: Trip[];
    isAr: boolean;
    canAdd: boolean;
    canDelete: boolean;
    onEdit: (vehicle: Vehicle) => void;
    onDelete: (id: string) => void;
    onView: (vehicle: Vehicle) => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({
    vehicle,
    trips,
    isAr,
    canAdd,
    canDelete,
    onEdit,
    onDelete,
    onView
}) => {
    let pList: any[] = [];
    try {
        pList = JSON.parse(vehicle.permit_zones || '[]');
    } catch (e) {
        pList = [];
    }

    const { services, assetServiceLinks, drivers } = useStore();
    const linkedLinks = assetServiceLinks.filter(l => l.asset_type === 'VEHICLE' && l.asset_id === vehicle.vehicle_id);
    const primaryService = services.find(s => s.service_id === linkedLinks[0]?.service_id);
    const linkedDriver = drivers.find(d => d.vehicle_id === vehicle.vehicle_id && d.status === 'ACTIVE');

    const vehicleTrips = (trips || []).filter(t => t.vehicle_id === vehicle.vehicle_id);
    const totalTonnage = vehicleTrips.reduce((sum, t) => sum + parseFloat(t.quantity || '0'), 0);

    return (
        <Card
            className="group relative bg-surface rounded-[2rem] border border-border hover:border-primary-500/50 flex flex-col h-full transition-shadow duration-300 hover:shadow-2xl"
        >
            {/* Actions & Ownership Row - Consistently opposite the main icon segment to avoid collisions */}
            <div className={`absolute top-4 ${isAr ? 'left-6 flex-row' : 'right-6 flex-row-reverse'} z-20 flex items-center gap-2`}>
                <Badge
                    variant={vehicle.ownership_type === 'INTERNAL' ? 'primary' : 'amber'}
                    className="shadow-sm py-1.5 px-4 font-bold border border-surface/20 text-[9px] tracking-wider uppercase whitespace-nowrap"
                >
                    {vehicle.ownership_type === 'INTERNAL' ? (isAr ? 'GCM داخلي' : 'GCM INTERNAL') : (vehicle.supplier_name || (isAr ? 'شريك خارجي' : 'CONTRACTOR'))}
                </Badge>

                {(canAdd || canDelete) && (
                    <div className="flex gap-1.5">
                        {canAdd && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onEdit(vehicle); }}
                                className="p-2 h-auto text-text-subtle hover:text-blue-600 bg-surface/80 backdrop-blur-sm shadow-sm border border-border/50 rounded-lg transition-all"
                            >
                                <Edit2 size={14} />
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onDelete(vehicle.vehicle_id); }}
                                className="p-2 h-auto text-text-subtle hover:text-rose-600 bg-surface/80 backdrop-blur-sm shadow-sm border border-border/50 rounded-lg transition-all"
                            >
                                <Trash2 size={14} />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="shrink-0">
                        <div className="p-3.5 bg-text-main text-surface rounded-2xl shadow-lg relative border border-border group-hover:border-primary-400 transition-colors duration-300">
                            <Truck className="w-6 h-6" strokeWidth={2} />
                            {vehicle.is_small_vehicle && (
                                <div className="absolute -top-1.5 -left-1.5 bg-amber-500 text-white rounded-lg p-1 shadow-md border border-surface">
                                    <Sparkles size={10} fill="currentColor" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="mb-1">
                            <span className="text-[9px] font-bold text-text-subtle uppercase tracking-[0.2em]">
                                {vehicle.vehicle_id}
                            </span>
                        </div>
                        <Link href={`/fleet?id=${vehicle.vehicle_id}`} onClick={e => e.stopPropagation()} className="block text-xl sm:text-2xl font-black tracking-widest text-text-main hover:text-primary transition-colors uppercase leading-tight truncate focus:outline-none">
                            {vehicle.plate_no}
                        </Link>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {primaryService && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-md">
                                    <Sparkles size={10} className="text-indigo-600" />
                                    <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider truncate max-w-[120px]" title={primaryService.service_name}>{primaryService.service_name}</span>
                                </div>
                            )}
                            {linkedDriver && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-md">
                                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-tighter truncate max-w-[100px]" title={linkedDriver.name}>👷‍♂️ {linkedDriver.name}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-surface-subtle border border-border rounded-md">
                                <Zap size={10} className="text-amber-500" />
                                <span className="text-[9px] font-bold text-text-main uppercase tracking-wider">{vehicle.vehicle_type}</span>
                            </div>
                            {vehicle.ownership_type === 'SUPPLIER' && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-md">
                                    <Building2 size={10} className="text-primary-600" />
                                    <span className="text-[9px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-tighter truncate max-w-[80px]">{vehicle.supplier_name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className={`flex flex-col items-center justify-center py-2.5 rounded-xl border shadow-sm transition-colors duration-300 ${vehicle.status === 'ACTIVE' ? 'bg-success-muted border-success/20 text-success' : 'bg-danger-muted border-danger/20 text-danger'}`}>
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 mb-0.5">{isAr ? 'الحالة' : 'Status'}</span>
                        <span className="text-[10px] font-black">{vehicle.status}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-surface-subtle border border-border shadow-sm text-text-main transition-colors duration-300">
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 mb-0.5">{isAr ? 'التصاريح' : 'Permits'}</span>
                        <span className="text-[10px] font-black flex items-center gap-1"><Shield size={10} /> {pList.length}</span>
                    </div>
                </div>

                <div className="pt-4 border-t border-border mt-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="space-y-0.5 text-center sm:text-left rtl:sm:text-right">
                            <div className="flex items-center gap-1.5 text-text-subtle font-bold text-[9px] uppercase tracking-wider">
                                <Activity size={12} className="text-primary-600" />
                                <span>{vehicleTrips.length} Logistics Units</span>
                            </div>
                            <p className="text-[9px] font-bold text-primary-600 dark:text-primary-400">
                                {totalTonnage.toFixed(1)} TON TOTAL
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-subtle border border-border shadow-sm text-text-subtle text-[9px] font-bold uppercase tracking-wider">
                                <FileText size={12} className="text-primary-500" />
                                <span>{(() => {
                                    if (Array.isArray(vehicle.documents)) return vehicle.documents.length;
                                    if (typeof vehicle.documents === 'string') {
                                        try {
                                            const parsed = JSON.parse(vehicle.documents);
                                            return Array.isArray(parsed) ? parsed.length : 0;
                                        } catch { return 0; }
                                    }
                                    return 0;
                                })()} DOCS</span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <VehicleProgress vehicle={vehicle} isAr={isAr} className="p-3 bg-surface-subtle rounded-xl border border-border" showDetails={false} />
                    </div>

                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onView(vehicle)}
                        className="w-full py-3.5 bg-text-main text-surface hover:bg-primary-600 transition-colors duration-300 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg border-none"
                    >
                        {isAr ? 'دخول المركز الاستخباراتي' : 'Enter Intelligence Hub'}
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default VehicleCard;
