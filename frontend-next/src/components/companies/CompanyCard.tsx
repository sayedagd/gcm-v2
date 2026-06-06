import React from 'react';
import { motion } from 'framer-motion';
import { Card, Button } from '@/components';
import { Company, Project } from '@/types';
import { Eye, Edit2, Trash2, Phone, UserCheck } from 'lucide-react';
import { handleImageError } from '@/utils/helpers';

interface CompanyCardProps {
    company: Company;
    projects: Project[];
    isAr: boolean;
    canManage: boolean;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({
    company,
    projects,
    isAr,
    canManage,
    onView,
    onEdit,
    onDelete
}) => {
    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <Card className="rounded-2xl overflow-hidden group border-2 border-transparent hover:border-primary-500/10 transition-all duration-500 shadow-sm hover:shadow-lg bg-surface p-5 sm:p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-primary-600 border-2 border-primary-500/20 shadow-xl shadow-primary-500/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500">
                            {company.logo_url ? (
                                <img src={company.logo_url} className="w-full h-full object-contain bg-white" onError={handleImageError} />
                            ) : (
                                <img src="/logo-light.png" className="w-full h-full object-contain bg-white" alt="GCM" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-text-main leading-tight uppercase group-hover:text-primary-500 transition-colors line-clamp-1">{company.company_name}</h3>
                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mt-1">S.A No. {company.commercial_reg}</p>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" onClick={onView} icon={Eye} className="p-2 text-text-subtle hover:text-primary transition-colors" />
                        {canManage && <Button variant="ghost" onClick={onEdit} icon={Edit2} className="p-2 text-text-subtle hover:text-primary transition-colors" />}
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-surface-subtle rounded-2xl border border-border shadow-inner text-center sm:text-left rtl:sm:text-right">
                            <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'الضريبة' : 'Tax ID'}</p>
                            <p className="font-bold text-xs text-text-main truncate">{company.vat_no || '---'}</p>
                        </div>
                        <div className="p-4 bg-primary-600 rounded-2xl shadow-xl shadow-primary-500/20 border border-primary-400/20">
                            <p className="text-[9px] font-bold text-primary-100 uppercase tracking-widest mb-1">{isAr ? 'المواقع' : 'Active Sites'}</p>
                            <p className="font-bold text-base text-white">{projects.filter(p => p.company_id === company.company_id).length}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-surface-subtle rounded-2xl border border-border flex items-center justify-between group/contact">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-success flex items-center justify-center text-white shadow-lg shadow-success/20 transition-all group-hover/contact:scale-110">
                                <UserCheck size={18} />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest leading-none mb-1">{isAr ? 'المسؤول' : 'Point of Contact'}</p>
                                <p className="font-bold text-xs text-text-main leading-tight">{company.contact_name}</p>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={() => window.location.href = `tel:${company.contact_phone}`} icon={Phone} className="p-2 text-text-subtle hover:text-success" />
                    </div>
                </div>

                <div className="mt-6 pt-5 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${company.contract_no ? 'bg-success animate-pulse' : 'bg-text-subtle/30'}`} />
                        <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'ترخيص نشط' : 'Active License'}</span>
                    </div>
                    {canManage && <Button variant="ghost" onClick={onDelete} icon={Trash2} className="text-text-subtle hover:text-danger p-2" />}
                </div>
            </Card>
        </motion.div>
    );
};

export default CompanyCard;
