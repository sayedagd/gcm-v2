import React from 'react';
import { Edit2, Trash2, Truck, Package, Users, Activity } from 'lucide-react';
import { Card, Button } from '@/components';
import { Supplier } from '@/types';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface SupplierCardProps {
    supplier: Supplier;
    stats: {
        vehicles: any[];
        containers: any[];
        tanks: any[];
        staffCount: number;
    };
    viewType: 'grid' | 'list';
    isAr: boolean;
    onView: (supplier: Supplier) => void;
    onEdit: (supplier: Supplier) => void;
    onDelete: (supplierId: string) => void;
}

const SupplierCard: React.FC<SupplierCardProps> = ({
    supplier,
    stats,
    viewType,
    isAr,
    onView,
    onEdit,
    onDelete
}) => {
    return (
        <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <Card className={`group relative h-full transition-all hover:shadow-lg hover:border-amber-500/20 ${viewType === 'grid' ? 'p-5 sm:p-10 flex flex-col' : 'flex items-center gap-6 p-5 sm:p-6'}`}>
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all flex gap-2 z-20">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(supplier)} className="bg-surface shadow-lg" icon={Edit2} />
                    <Button variant="ghost" size="sm" onClick={() => onDelete(supplier.supplier_id)} className="bg-surface shadow-lg text-rose-500 hover:bg-rose-50" icon={Trash2} />
                </div>

                <div className="shrink-0 relative" onClick={() => onView(supplier)}>
                    <div
                        className={`w-20 h-20 sm:w-24 sm:h-24 bg-amber-600 rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center border-4 border-surface transition-transform group-hover:scale-110 cursor-pointer overflow-hidden`}
                    >
                        <div className="absolute inset-0 bg-white/10" />
                        <span className="text-4xl font-bold text-white tracking-tight">{supplier.name.charAt(0)}</span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white dark:border-slate-800 shadow-sm ${supplier.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>

                <div className={`flex-1 ${viewType === 'grid' ? 'mt-8' : ''}`} onClick={() => onView(supplier)}>
                    <div className="flex flex-col gap-1 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase text-white bg-amber-600 px-3 py-1 rounded-full shadow-lg shadow-amber-500/20">{supplier.category}</span>
                        </div>
                        <Link to={`/su?id=${supplier.supplier_id}`} onClick={e => e.stopPropagation()} className="block text-xl sm:text-2xl font-bold tracking-tight text-text-main hover:text-amber-600 transition-colors uppercase truncate focus:outline-none">
                            {isAr ? (supplier.trading_name || supplier.name) : supplier.name}
                        </Link>
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{supplier.supplier_id}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-6 py-6 border-y border-slate-50 dark:border-slate-800/50">
                        <div className="text-center space-y-1">
                            <Truck size={14} className="mx-auto text-blue-500 opacity-60" />
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stats.vehicles.length}</p>
                            <span className="text-[8px] font-bold uppercase text-slate-400">{isAr ? 'أسطول' : 'FLEET'}</span>
                        </div>
                        <div className="text-center space-y-1">
                            <Package size={14} className="mx-auto text-emerald-500 opacity-60" />
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stats.containers.length + stats.tanks.length}</p>
                            <span className="text-[8px] font-bold uppercase text-slate-400">{isAr ? 'معدات' : 'ASSETS'}</span>
                        </div>
                        <div className="text-center space-y-1">
                            <Users size={14} className="mx-auto text-purple-500 opacity-60" />
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stats.staffCount}</p>
                            <span className="text-[8px] font-bold uppercase text-slate-400">{isAr ? 'عمالة' : 'STAFF'}</span>
                        </div>
                    </div>

                    <button className="w-full mt-8 py-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-amber-500/10">
                        <Activity size={16} /> {isAr ? 'دخول لوحة الذكاء' : 'View Dashboard'}
                    </button>
                </div>
            </Card>
        </motion.div>
    );
};

export default SupplierCard;
