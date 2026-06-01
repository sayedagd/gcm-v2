import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, ChevronDown, Wrench, Plus, Edit2, Trash2, BarChart2
} from 'lucide-react';
import { Button, EmptyState } from '@/components';
import { Service } from '@/types';

interface ServiceTreeProps {
    services: any[]; // Tree structure
    searchTerm: string;
    isAr: boolean;
    onEdit: (service: Service) => void;
    onDelete: (serviceId: string) => void;
    onAddChild: (parentId: string) => void;
    onView: (service: Service) => void;
}

const ServiceTree: React.FC<ServiceTreeProps> = ({
    services,
    searchTerm,
    isAr,
    onEdit,
    onDelete,
    onAddChild,
    onView
}) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderServiceRow = (service: any, depth = 0) => {
        const isExpanded = expanded[service.service_id] ?? (depth === 0);
        const hasChildren = service.children && service.children.length > 0;
        const isRoot = !service.parent_id;

        // Filter check: if search term exists, expand all relevant nodes?
        // Actually, the parent component filters the tree. 
        // If we are filtering, we might want to default expand?
        // For now, respect local state.

        return (
            <React.Fragment key={service.service_id}>
                <div
                    className={`group flex items-center justify-between p-5 transition-all duration-300 ${isRoot ? 'bg-surface border-b-2 border-border shadow-sm my-2 rounded-2xl' : 'bg-surface-subtle border-b border-border hover:bg-surface'}`}
                    style={{ paddingLeft: `${depth * 2 + 1.25}rem`, paddingRight: isAr ? `${depth * 2 + 1.25}rem` : '1.25rem' }}
                >
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => toggleExpand(service.service_id)}
                            className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'hover:bg-surface-subtle text-text-subtle'} ${!hasChildren && 'invisible opacity-0'}`}
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} className={isAr ? 'rotate-180' : ''} />}
                        </button>
                        <div
                            className={`p-2.5 rounded-xl ${isRoot ? 'text-white shadow-lg' : 'bg-surface-subtle text-text-subtle'}`}
                            style={isRoot ? { backgroundColor: 'var(--primary-color)', boxShadow: '0 4px 6px -1px var(--primary-color-20)' } : undefined}
                        >
                            <Wrench size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold tracking-tight ${isRoot ? 'text-base' : 'text-sm text-text-main'}`}>{service.service_name}</span>
                                {isRoot && <span className="px-2 py-0.5 bg-surface-subtle text-text-subtle text-[8px] font-bold rounded uppercase tracking-widest border border-border">{isAr ? 'تصنيف أساسي' : 'Category'}</span>}
                            </div>
                            <p className="text-[10px] text-text-subtle font-bold uppercase tracking-widest mt-0.5">{service.service_id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isRoot && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onAddChild(service.service_id)}
                                icon={Plus}
                                className="text-[10px] px-3 py-1.5"
                            >
                                {isAr ? 'إضافة مادة' : 'Add Material'}
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onView(service)} className="p-2 h-auto text-primary hover:text-primary-700 hover:bg-primary-50"><BarChart2 size={16} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onEdit(service)} className="p-2 h-auto"><Edit2 size={16} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(service.service_id)} className="p-2 h-auto text-rose-500 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></Button>
                    </div>
                </div>
                <AnimatePresence>
                    {hasChildren && isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="relative overflow-hidden"
                        >
                            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
                            {service.children.map((child: any) => renderServiceRow(child, depth + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </React.Fragment>
        );
    };

    if (services.length === 0) {
        return (
            <EmptyState
                icon={Wrench}
                title={isAr ? 'السجل فارغ حالياً' : 'Database is pristine.'}
                description={isAr ? 'ابدأ بإضافة أول تصنيف للمواد أو الخدمات' : 'Start by adding your first material or service category.'}
            />
        );
    }

    return (
        <div className="divide-y divide-border">
            {services.map(s => renderServiceRow(s))}
        </div>
    );
};

export default ServiceTree;
