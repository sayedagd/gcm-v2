import React from 'react';
import { motion } from 'framer-motion';
import {
    Container as SkipIcon, Droplet, Scale, Edit2, Trash2,
    MapPin, Eye, Calendar, ShieldCheck, History, Sparkles
} from 'lucide-react';
import { Button } from '@/components';
import { InventorySize, Project } from '@/types';
import { Link } from 'react-router-dom';
import { useStore } from '@/context';

interface InventoryCardProps {
    item: any;
    activeTab: 'containers' | 'tanks' | 'scales' | 'sizes';
    viewType: 'grid' | 'list';
    isAr: boolean;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
    onView: (item: any) => void;
    projects: Project[];
    inventorySizes: InventorySize[];
}

const InventoryCard: React.FC<InventoryCardProps> = ({
    item,
    activeTab,
    viewType,
    isAr,
    onEdit,
    onDelete,
    onView,
    projects,
    inventorySizes
}) => {
    const size = inventorySizes.find(s => s.size_id === item.size_id);
    const proj = projects.find(p => p.project_id === item.project_id);
    const id = item.container_id || item.tank_id || item.scale_id || item.size_id;

    // Determine Icon based on tab/type
    const Icon = activeTab === 'containers' ? SkipIcon : activeTab === 'tanks' ? Droplet : Scale;

    const maintenanceCount = item.maintenance_logs?.length || 0;
    const lastMaintenance = item.maintenance_logs?.[maintenanceCount - 1]?.date || 'N/A';

    const { services, assetServiceLinks } = useStore();
    const assetType = activeTab === 'containers' ? 'CONTAINER' : activeTab === 'tanks' ? 'TANK' : 'SCALE';
    const linkedLinks = assetServiceLinks.filter(l => l.asset_type === assetType && l.asset_id === id);
    const primaryService = services.find(s => s.service_id === linkedLinks[0]?.service_id);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4 }}
            className={`group relative overflow-hidden transition-all duration-500 ${viewType === 'grid'
                ? 'p-0 bg-surface-subtle/40 backdrop-blur-xl rounded-[2.5rem] border border-border/50 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10'
                : 'flex items-center gap-6 p-4 bg-surface rounded-3xl border border-border shadow-sm'
                }`}
        >
            {/* Ownership Tag - Floating Premium Style */}
            {activeTab !== 'sizes' && (
                <div className={`absolute top-6 ${isAr ? 'left-6' : 'right-6'} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter backdrop-blur-md z-20 transition-all group-hover:scale-105 ${item.ownership === 'SUPPLIER'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'bg-blue-600/10 text-blue-600 border border-blue-600/20'
                    }`}>
                    {item.ownership === 'SUPPLIER' ? (item.supplier_name || 'PARTNER ASSET') : (isAr ? 'أسطول داخلي' : 'GCM FLEET')}
                </div>
            )}

            {viewType === 'grid' && (
                <div className="relative h-32 bg-gradient-to-br from-blue-600 to-blue-800 overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.8),transparent)]" />
                    <div className="absolute inset-0 flex items-center justify-center text-white/20">
                        <Icon size={120} strokeWidth={1} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl group-hover:scale-110 transition-transform duration-700">
                            <Icon size={40} className="text-white drop-shadow-lg" />
                        </div>
                    </div>
                </div>
            )}

            <div className={`p-8 ${viewType === 'list' ? 'flex-1 p-0' : ''}`}>
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-surface rounded text-[8px] font-bold text-text-subtle tracking-widest border border-border">{item.code || 'SYS-ID'}</span>
                            <span className={`w-2 h-2 rounded-full animate-pulse ${item.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                        </div>
                        <Link to={`/iv?id=${id}`} onClick={e => e.stopPropagation()} className="block text-2xl font-black text-text-main hover:text-blue-500 transition-colors tracking-tight leading-tight focus:outline-none">
                            {activeTab === 'sizes' ? item.name : (size?.name || 'GENERIC UNIT')}
                        </Link>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        <Button variant="secondary" size="sm" onClick={() => onEdit(item)} className="p-2.5 h-auto rounded-xl bg-surface hover:bg-blue-600 hover:text-white transition-all shadow-sm" icon={Edit2} />
                        <Button variant="secondary" size="sm" onClick={() => onDelete(id)} className="p-2.5 h-auto rounded-xl bg-surface hover:bg-rose-600 hover:text-white transition-all shadow-sm" icon={Trash2} />
                    </div>
                </div>

                {activeTab !== 'sizes' && (
                    <div className="space-y-6">
                        {/* Technical Meta Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-surface rounded-2xl border border-border/50 group-hover:border-blue-500/10 transition-colors">
                                <div className="flex items-center gap-2 mb-1 text-[8px] font-bold text-text-subtle uppercase tracking-widest">
                                    <Calendar size={10} className="text-blue-600" /> {isAr ? 'تاريخ الشراء' : 'Purchased'}
                                </div>
                                <p className="text-xs font-bold text-text-main">{item.purchase_date || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-surface rounded-2xl border border-border/50 group-hover:border-blue-500/10 transition-colors">
                                <div className="flex items-center gap-2 mb-1 text-[8px] font-bold text-text-subtle uppercase tracking-widest">
                                    <History size={10} className="text-emerald-500" /> {isAr ? 'آخر صيانة' : 'Last Service'}
                                </div>
                                <p className="text-xs font-bold text-text-main">{lastMaintenance}</p>
                            </div>
                        </div>

                        {/* Status & Project Section */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm flex items-center gap-2 ${item.status === 'AVAILABLE'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                }`}>
                                <ShieldCheck size={12} /> {item.status}
                            </div>
                            {item.project_id && (
                                <div className="px-4 py-1.5 rounded-xl text-[10px] font-bold bg-surface text-text-subtle border border-border flex items-center gap-2 shadow-sm">
                                    <MapPin size={12} className="text-rose-500" /> {proj?.project_name.substring(0, 15)}...
                                </div>
                            )}
                            {primaryService && (
                                <div className="px-4 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 flex items-center gap-2 shadow-sm">
                                    <Sparkles size={12} className="text-indigo-600" /> {primaryService.service_name}
                                </div>
                            )}
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => onView(item)}
                            className="w-full bg-blue-600 text-white border-none text-[11px] tracking-[0.2em] font-black uppercase rounded-2xl shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:scale-[1.02] active:scale-95 transition-all py-6"
                            icon={Eye}
                        >
                            {isAr ? 'مركز الاستخبارات للأصل' : 'Asset Intelligence Hub'}
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default InventoryCard;
