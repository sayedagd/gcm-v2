import React from 'react';
import { motion } from 'framer-motion';
import { Card, Button } from '@/components';
import { Briefcase, Eye, Edit2, Trash2, ArrowRight } from 'lucide-react';
import { Project, Company } from '@/types';
import { handleImageError } from '@/utils/helpers';

interface ProjectCardProps {
    project: Project;
    company?: Company;
    budgetProgress: number;
    qtyProgress: number;
    timeProgress: number;
    isAr: boolean;
    canManage: boolean;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
    project,
    company,
    budgetProgress,
    qtyProgress,
    timeProgress,
    isAr,
    canManage,
    onView,
    onEdit,
    onDelete
}) => {
    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <Card className="rounded-2xl overflow-hidden group border-2 border-transparent hover:border-emerald-500/10 transition-all duration-500 shadow-sm hover:shadow-lg bg-surface h-full flex flex-col">
                <div className="p-6 flex-1">
                    <div className="flex flex-col sm:flex-row gap-6 h-full">
                        <div className="w-20 sm:w-28 shrink-0 mx-auto sm:mx-0">
                            <div className="aspect-square bg-primary-600 rounded-xl flex items-center justify-center text-white border-2 border-primary-500/20 shadow-xl shadow-primary-500/20 relative overflow-hidden group/logo cursor-pointer" onClick={onView}>
                                {project.logo_url ? (
                                    <img src={project.logo_url} className="w-full h-full object-cover group-hover/logo:scale-110 transition-transform duration-700 bg-white" onError={handleImageError} alt={project.project_name} />
                                ) : (
                                    <img src="/logo-light.png" onError={handleImageError} className="w-full h-full object-contain bg-white group-hover/logo:scale-110 transition-transform duration-700" alt="GCM" />
                                )}
                                <div className="absolute inset-0 bg-white/20 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                    <Eye size={20} className="text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 flex flex-col">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <span className="px-2 py-0.5 bg-surface-subtle text-text-subtle text-[7px] font-bold rounded-md uppercase tracking-[0.2em]">{company?.company_name}</span>
                                    <h3 className="text-lg font-bold text-text-main leading-tight uppercase group-hover:text-primary-500 transition-colors line-clamp-1">{project.project_name}</h3>
                                </div>
                                {canManage && (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" onClick={onEdit} icon={Edit2} className="p-2 text-text-subtle hover:text-blue-500" />
                                        <Button variant="ghost" onClick={onDelete} icon={Trash2} className="p-2 text-text-subtle hover:text-rose-500" />
                                    </div>
                                )}
                            </div>

                            {/* Updated Progress Section - Vertical Stack */}
                            <div className="flex flex-col gap-4 pt-4 border-t border-border mt-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                        <span>{isAr ? 'استهلاك الميزانية' : 'BUDGET'}</span>
                                        <span className="text-[11px]">{budgetProgress}%</span>
                                    </div>
                                    <div className="h-2.5 bg-surface-subtle rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${budgetProgress}%` }} className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.2)]" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                        <span>{isAr ? 'تنفيذ الكميات' : 'QUANTITY'}</span>
                                        <span className="text-[11px]">{qtyProgress}%</span>
                                    </div>
                                    <div className="h-2.5 bg-surface-subtle rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${qtyProgress}%` }} className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.2)]" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                                        <span>{isAr ? 'المسار الزمني' : 'TIME ELAPSED'}</span>
                                        <span className="text-[11px]">{timeProgress}%</span>
                                    </div>
                                    <div className="h-2.5 bg-surface-subtle rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${timeProgress}%` }} className="h-full bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.2)]" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-border">
                                <div className="flex gap-2">
                                    <div className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-[8px] font-bold uppercase">
                                        {isAr ? 'نشط' : 'ACTIVE'}
                                    </div>
                                    <div className="px-2 py-1 rounded-lg bg-surface-subtle text-text-subtle text-[8px] font-bold uppercase">
                                        GCM-HUB
                                    </div>
                                </div>
                                <Button onClick={onView} className="p-2.5 bg-text-main text-surface rounded-xl hover:bg-primary-500 transition-all shadow-md active:scale-95 border-none" icon={ArrowRight} />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

export default ProjectCard;
