import React from 'react';
import { Facility, FacilityType } from '@/types';
import { Card, Button } from '@/components';
import { Building2, MapPin, Eye, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface FacilityCardProps {
    facility: Facility;
    viewType: 'grid' | 'list';
    isAr: boolean;
    onView: (f: Facility) => void;
    onEdit: (f: Facility) => void;
    onDelete: (id: string) => void;
}

const FacilityCard: React.FC<FacilityCardProps> = ({
    facility, viewType, isAr, onView, onEdit, onDelete
}) => {
    const typeIcons = {
        [FacilityType.DISPOSAL]: Building2,
        [FacilityType.RECYCLE]: CheckCircle2,
        [FacilityType.SEWAGE_TREATMENT]: MapPin
    };

    const Icon = typeIcons[facility.type] || Building2;

    const statusColors = {
        ACTIVE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        INACTIVE: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    };

    if (viewType === 'list') {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-surface hover:bg-surface-subtle border border-border rounded-2xl p-4 transition-all flex items-center justify-between gap-6"
            >
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Icon size={24} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-text-main truncate text-lg">{facility.name}</h3>
                        <div className="flex items-center gap-3 text-xs text-text-subtle mt-1 font-medium">
                            <span className="uppercase tracking-widest text-primary/80">{facility.type}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><MapPin size={12} /> {facility.location_url ? (isAr ? 'عرض الموقع' : 'View Location') : (isAr ? 'لا يوجد موقع' : 'No Location')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`px-4 py-1.5 rounded-full border text-[10px] font-bold tracking-widest uppercase ${statusColors[facility.status]}`}>
                        {facility.status}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => onView(facility)} icon={Eye} />
                        <Button variant="ghost" size="sm" onClick={() => onEdit(facility)} icon={Edit2} />
                        <Button variant="ghost" size="sm" onClick={() => onDelete(facility.facility_id)} icon={Trash2} className="text-rose-500 hover:bg-rose-500/10" />
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group h-full"
        >
            <Card className="p-0 border border-border overflow-hidden h-full flex flex-col group-hover:border-primary/50 transition-all shadow-lg hover:shadow-primary/5">
                <div className="p-8 space-y-6 flex-1">
                    <div className="flex items-start justify-between">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition-transform`}>
                            <Icon size={28} />
                        </div>
                        <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black tracking-[0.2em] uppercase ${statusColors[facility.status]}`}>
                            {facility.status}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold text-text-main group-hover:text-primary transition-colors leading-tight mb-2">{facility.name}</h3>
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {facility.type}
                        </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-text-subtle font-medium">{isAr ? 'رقم العقد' : 'Contract No'}</span>
                            <span className="text-text-main font-bold font-mono">{facility.contract_no || '---'}</span>
                        </div>
                        {facility.contract_end && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-text-subtle font-medium">{isAr ? 'نهاية العقد' : 'Expires'}</span>
                                <span className={`font-bold ${new Date(facility.contract_end) < new Date() ? 'text-rose-500' : 'text-text-main'}`}>
                                    {facility.contract_end}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-surface-subtle/50 border-t border-border flex items-center justify-between gap-2">
                    <Button variant="ghost" className="flex-1 !py-5" onClick={() => onView(facility)} icon={Eye}>
                        {isAr ? 'عرض' : 'View'}
                    </Button>
                    <Button variant="ghost" className="flex-1 !py-5" onClick={() => onEdit(facility)} icon={Edit2}>
                        {isAr ? 'تعديل' : 'Edit'}
                    </Button>
                    <button
                        onClick={() => onDelete(facility.facility_id)}
                        className="p-3.5 rounded-xl hover:bg-rose-500/10 text-text-subtle hover:text-rose-500 transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </Card>
        </motion.div>
    );
};

export default FacilityCard;
