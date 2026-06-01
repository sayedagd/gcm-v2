import React from 'react';
import { Briefcase, HardHat, Edit2, Trash2, Phone, Car, Eye, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components';
import { Driver, Vehicle } from '@/types';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useStore } from '@/context';

interface DriverCardProps {
    staff: Driver;
    vehicles: Vehicle[];
    isAr: boolean;
    tripsCount: number;
    onEdit: (driver: Driver) => void;
    onDelete: (id: string) => void;
    onView: (driver: Driver) => void;
}

const DriverCard: React.FC<DriverCardProps> = ({
    staff,
    vehicles,
    isAr,
    tripsCount,
    onEdit,
    onDelete,
    onView
}) => {
    const { services, assetServiceLinks } = useStore();
    const linkedVehicle = vehicles.find(v => v.vehicle_id === staff.vehicle_id);
    const linkedLinks = linkedVehicle ? assetServiceLinks.filter(l => l.asset_type === 'VEHICLE' && l.asset_id === linkedVehicle.vehicle_id) : [];
    const primaryService = services.find(s => s.service_id === linkedLinks[0]?.service_id);

    // Calculate document readiness
    const requiredDocs = ['iqama_no', 'license_no', 'operating_card_no', 'insurance_no'];
    const completedDocs = requiredDocs.filter(doc => !!(staff as any)[doc]).length;
    const progress = (completedDocs / 4) * 100;

    // Check for expiries (if any of the dates are in the past or within 30 days)
    const isExpiringSoon = false; // Placeholder for expiry logic, can enhance if needed.

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative transition-all hover:shadow-xl p-5 sm:p-8 bg-surface-subtle rounded-2xl border border-border"
        >
            {/* Ownership Badge */}
            <div className={`absolute top-0 ${isAr ? 'left-0 rounded-br-2xl' : 'right-0 rounded-bl-2xl'} px-4 py-1.5 text-[8px] font-bold uppercase text-white shadow-sm z-10 ${staff.ownership_type === 'SUPPLIER' ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                {staff.ownership_type === 'SUPPLIER' ? (staff.supplier_name || 'SUPPLIER') : (isAr ? 'داخلي' : 'INTERNAL')}
            </div>

            <div className={`shrink-0 w-16 h-16 bg-surface rounded-2xl shadow-sm flex items-center justify-center ${staff.category === 'MANAGEMENT' ? 'text-blue-500' : 'text-emerald-500'}`}>
                {staff.category === 'MANAGEMENT' ? <Briefcase size={28} /> : <HardHat size={28} />}
            </div>

            <div className="flex-1 mt-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest leading-none mb-1">{staff.role_title || (staff.category === 'OPERATIONS' ? (isAr ? 'سائق' : 'Driver') : (isAr ? 'إداري' : 'Admin'))}</p>
                        <Link to={`/dr?id=${staff.driver_id}`} onClick={e => e.stopPropagation()} className="block text-lg sm:text-lg font-bold tracking-tight truncate text-text-main hover:text-primary transition-colors leading-tight max-w-[160px] focus:outline-none">{staff.name}</Link>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(staff); }} className="p-2 h-auto text-text-subtle hover:text-blue-500" icon={Edit2} />
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(staff.driver_id); }} className="p-2 h-auto text-text-subtle hover:text-rose-500" icon={Trash2} />
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-2 mb-6">
                    <div className="flex items-center gap-2 text-text-subtle font-bold text-xs uppercase tracking-tight">
                        <Phone size={14} className="text-text-subtle opacity-30" /> {staff.phone}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {linkedVehicle && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-900/30">
                                <Car size={12} />
                                <span className="text-[9px] font-bold uppercase tracking-wider">
                                    {linkedVehicle.plate_no}
                                </span>
                            </div>
                        )}
                        {primaryService && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 rounded-full border border-indigo-100 dark:border-indigo-900/30">
                                <Sparkles size={10} className="text-indigo-600" />
                                <span className="text-[9px] font-bold uppercase tracking-wider" title={primaryService.service_name}>
                                    {primaryService.service_name}
                                </span>
                            </div>
                        )}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm ${tripsCount > 0 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface border border-border text-text-subtle'}`}>
                            <span className="text-[9px] font-bold uppercase tracking-widest">{tripsCount} {isAr ? 'رحلات' : 'TRIPS'}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => onView(staff)}
                    className="w-full mb-6 py-3 rounded-xl bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                >
                    <Eye size={14} className="group-hover/btn:scale-110 transition-transform" />
                    {isAr ? 'تفاصيل السائق' : 'VIEW DRIVER'}
                </button>

                <div className="mt-auto pt-4 border-t border-border flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${staff.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : staff.status === 'ON_LEAVE' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-text-subtle">{staff.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text[10px] font-bold tracking-widest uppercase">
                            <FileText size={12} className={completedDocs === 4 ? 'text-emerald-500' : 'text-amber-500'} />
                            <span className={completedDocs === 4 ? 'text-emerald-600' : 'text-amber-600'}>{completedDocs}/4</span>
                        </div>
                    </div>

                    {/* Document Readiness Bar */}
                    <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${completedDocs === 4 ? 'bg-emerald-500' : completedDocs > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default DriverCard;
