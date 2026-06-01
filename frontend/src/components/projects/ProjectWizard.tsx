import React, { useMemo } from 'react';
import { Modal, Input, Button, Select, FileUploader, Card, QuickUserModal } from '@/components';
import { Project, Company, ProjectService, Service, User, Role } from '@/types';
import { Briefcase, Building2, Navigation, FileText, ArrowRight, ArrowLeft, CheckCircle2, Wrench, Box, Trash2, Plus, ChevronRight, UserCircle, UserPlus, AlertTriangle, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProjectWizardProps {
    isOpen: boolean;
    onClose: () => void;
    currentProject: Partial<Project> | null;
    setCurrentProject: React.Dispatch<React.SetStateAction<Partial<Project> | null>>;
    wizardStep: number;
    setWizardStep: (step: number) => void;
    isAr: boolean;
    companies: Company[];
    services: Service[];
    suppliers: import('@/types').Supplier[];
    tempProjectServices: Partial<ProjectService>[];
    setTempProjectServices: React.Dispatch<React.SetStateAction<Partial<ProjectService>[]>>;
    expandedCategories: Set<string>;
    setExpandedCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
    handleCaptureGps: () => void;
    handleSaveProject: () => void;
    validateStep: (step: number) => boolean;
    isSubmitting?: boolean;
    formError?: string;
    users: User[];
}

const ProjectWizard: React.FC<ProjectWizardProps> = ({
    isOpen,
    onClose,
    currentProject,
    setCurrentProject,
    wizardStep,
    setWizardStep,
    isAr,
    companies,
    services,
    suppliers,
    tempProjectServices,
    setTempProjectServices,
    expandedCategories,
    setExpandedCategories,
    handleCaptureGps,
    handleSaveProject,
    validateStep,
    isSubmitting,
    formError,
    users
}) => {
    const [isQuickUserOpen, setIsQuickUserOpen] = React.useState(false);
    return (
        <Modal size="3xl" isOpen={isOpen} onClose={onClose} title={isAr ? (currentProject?.project_id ? 'إدارة بيانات المشروع' : 'تأسيس مشروع جديد') : 'Corporate Project Wizard'}>
            <div className="flex gap-2 p-1.5 bg-surface-elevated rounded-2xl mb-6 border border-border-subtle mx-6">
                {[1, 2].map(step => (
                    <div key={step} className={`flex-1 h-1.5 rounded-full transition-all duration-700 ${wizardStep >= step ? 'bg-primary-500 shadow-lg shadow-primary-500/20' : 'bg-surface-subtle'}`} />
                ))}
            </div>

            <div className={`px-6 pb-6 ${isAr ? 'text-right' : 'text-left'}`}>
                {formError && (
                    <div className="mb-4 p-3 bg-danger-muted border border-danger/20 text-danger rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertTriangle size={16} /> {formError}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {wizardStep === 1 ? (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            
                            <div className="grid grid-cols-1 gap-5">
                                {/* Section 1: Main Details */}
                                <div className="bg-surface-subtle border border-border-subtle p-5 rounded-2xl space-y-4">
                                    <h4 className="font-bold text-sm text-text-main flex items-center gap-2"><Briefcase size={16} className="text-primary"/> {isAr ? 'البيانات الأساسية' : 'Primary Details'}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label={isAr ? 'اسم المشروع' : 'PROJECT NAME'}
                                            value={currentProject?.project_name || ''}
                                            onChange={val => setCurrentProject(prev => ({ ...prev, project_name: val }))}
                                        />

                                        <Select
                                            label={isAr ? 'العميل المستفيد' : 'PARENT CLIENT'}
                                            value={currentProject?.company_id || ''}
                                            onChange={val => setCurrentProject(prev => ({ ...prev, company_id: val }))}
                                            options={companies.map(c => ({ label: c.company_name, value: c.company_id }))}
                                            placeholder={isAr ? 'اختر الشركة' : 'Select Client Account'}
                                        />
                                    </div>
                                </div>

                                {/* Section 2: Timeline & Location */}
                                <div className="bg-surface-subtle border border-border-subtle p-5 rounded-2xl space-y-4">
                                    <h4 className="font-bold text-sm text-text-main flex items-center gap-2"><Navigation size={16} className="text-primary"/> {isAr ? 'الجدول الزمني والموقع' : 'Timeline & Location'}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label={isAr ? 'تاريخ البدء' : 'START DATE'}
                                            type="date"
                                            value={currentProject?.start_date || ''}
                                            onChange={val => setCurrentProject(prev => ({ ...prev, start_date: val }))}
                                        />
                                        <Input
                                            label={isAr ? 'تاريخ الانتهاء' : 'EXPIRY DATE'}
                                            type="date"
                                            value={currentProject?.end_date || ''}
                                            onChange={val => setCurrentProject(prev => ({ ...prev, end_date: val }))}
                                        />
                                        <div className="md:col-span-2">
                                            <Input
                                                label={isAr ? 'موقع المشروع (GPS)' : 'LOCATION URL'}
                                                value={currentProject?.location || ''}
                                                onChange={val => setCurrentProject(prev => ({ ...prev, location: val }))}
                                                placeholder="Google Maps Link"
                                                suffix={
                                                    <button
                                                        onClick={handleCaptureGps}
                                                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                                                    >
                                                        <MapPin size={16} />
                                                    </button>
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: System & Attachments */}
                                <div className="bg-surface-subtle border border-border-subtle p-5 rounded-2xl space-y-4">
                                    <h4 className="font-bold text-sm text-text-main flex items-center gap-2"><FileText size={16} className="text-primary"/> {isAr ? 'النظام والمرفقات' : 'System & Attachments'}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-end gap-2 text-right">
                                            <div className="flex-1">
                                                <Select
                                                    label={isAr ? 'المشرف المسؤول (نظام)' : 'SITE SUPERVISOR (SYSTEM)'}
                                                    value={currentProject?.user_id || ''}
                                                    onChange={val => setCurrentProject(prev => ({ ...prev, user_id: val }))}
                                                    options={users.filter(u => u.role === Role.PROJECT_USER || u.role === Role.CLIENT || u.role === Role.ADMIN).map(u => ({
                                                        label: `${u.name} (${u.email})`,
                                                        value: u.id
                                                    }))}
                                                    placeholder={isAr ? 'اختر المشرف...' : 'Select site supervisor...'}
                                                />
                                            </div>
                                            <Button
                                                variant="secondary"
                                                className="h-[46px] w-[46px] p-0 mb-1 flex items-center justify-center shrink-0"
                                                icon={UserPlus}
                                                onClick={() => setIsQuickUserOpen(true)}
                                                title={isAr ? 'إنشاء حساب سريع' : 'Quick Create Account'}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'شعار المشروع' : 'Project Logo'}</label>
                                                <div className="flex items-center gap-3">
                                                    {currentProject?.logo_url ? <div className="p-3 bg-success-muted text-success rounded-xl text-[9px] font-bold uppercase flex items-center gap-2 border border-success/20"><CheckCircle2 size={14} /> Uploaded</div> : <FileUploader onUpload={(b) => setCurrentProject(prev => ({ ...prev, logo_url: b }))} isAr={isAr} />}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'عقد الـ PO' : 'PO File'}</label>
                                                <div className="flex items-center gap-3">
                                                    {currentProject?.po_file ? <div className="p-3 bg-success-muted text-success rounded-xl text-[9px] font-bold uppercase flex items-center gap-2 border border-success/20"><CheckCircle2 size={14} /> Uploaded</div> : <FileUploader onUpload={(b) => setCurrentProject(prev => ({ ...prev, po_file: b }))} isAr={isAr} accept=".pdf,image/*" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex pt-2">
                                <Button
                                    variant="primary"
                                    onClick={() => validateStep(1) && setWizardStep(2)}
                                    className="w-full py-4 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                    icon={ArrowRight}
                                    iconPosition="right"
                                >
                                    {isAr ? 'الخدمات المسندة' : 'SERVICE ALLOCATION'}
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="bg-surface-subtle border border-border-subtle p-4 rounded-2xl flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-text-main uppercase">{isAr ? 'إسناد الخدمات والأسعار' : 'Service Pricing'}</h4>
                                    <p className="text-[10px] text-text-subtle font-bold mt-1">{isAr ? 'إدارة رسوم الخدمات للمشروع' : 'Configure rate cards for this project'}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setWizardStep(1)} className="text-text-subtle hover:text-text-main gap-2" icon={ArrowLeft}>
                                    {isAr ? 'رجوع' : 'Back'}
                                </Button>
                            </div>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar p-1">
                                {services.filter(s => !s.parent_id).length === 0 ? (
                                    <div className="text-center p-10 bg-surface-subtle rounded-2xl border border-dashed border-border-subtle">
                                        <Wrench size={32} className="mx-auto text-text-subtle opacity-30 mb-3" />
                                        <h5 className="text-text-subtle font-bold text-sm">{isAr ? 'لا توجد خدمات معرفة' : 'No Service Categories Found'}</h5>
                                        <p className="text-[10px] text-text-subtle mt-1">{isAr ? 'يرجى إضافة خدمات أولاً' : 'Please configure services first'}</p>
                                    </div>
                                ) : (
                                    Object.entries(
                                        services.filter(s => !s.parent_id).reduce((acc, s) => {
                                            const cat = s.major_category || 'GENERAL';
                                            if (!acc[cat]) acc[cat] = [];
                                            acc[cat].push(s);
                                            return acc;
                                        }, {} as Record<string, Service[]>)
                                    ).map(([majorCat, categories]) => (
                                        <div key={majorCat} className="space-y-3">
                                            <div className="flex items-center px-3 border-s-2 border-primary">
                                                <h5 className="text-[10px] font-black uppercase text-text-subtle">
                                                    {majorCat === 'GENERAL' ? (isAr ? 'نفايات غير خطرة (General)' : 'Non-Hazardous waste') :
                                                        majorCat === 'HAZARDOUS' ? (isAr ? 'نفايات خطرة (Hazardous)' : 'Hazardous waste') :
                                                            majorCat === 'WATER' ? (isAr ? 'توريد مياه (Water)' : 'Supplying water') :
                                                                majorCat}
                                                </h5>
                                            </div>

                                            <div className="space-y-2">
                                                {categories.map(category => {
                                                    const categoryServices = services.filter(s => s.parent_id === category.service_id);
                                                    const isExpanded = expandedCategories.has(category.service_id);
                                                    const selectedChildrenCount = tempProjectServices.filter(ps =>
                                                        categoryServices.some(cs => cs.service_id === ps.service_id)
                                                    ).length;

                                                    return (
                                                        <div key={category.service_id} className={`border border-border-subtle rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-surface shadow-sm' : 'bg-surface-subtle hover:border-primary/30'}`}>
                                                            <div
                                                                className="p-3 flex items-center justify-between gap-3 cursor-pointer"
                                                                onClick={() => {
                                                                    const newExpanded = new Set(expandedCategories);
                                                                    if (isExpanded) newExpanded.delete(category.service_id);
                                                                    else newExpanded.add(category.service_id);
                                                                    setExpandedCategories(newExpanded);
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <div className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-primary text-white shadow-sm' : 'bg-surface text-text-subtle'}`}>
                                                                        <Box size={16} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="font-bold text-xs text-text-main">{category.service_name}</h4>
                                                                            {selectedChildrenCount > 0 && (
                                                                                <span className="px-1.5 py-0.5 rounded bg-success/10 text-[8px] font-black text-success uppercase">
                                                                                    {isAr ? `${selectedChildrenCount} مفعلة` : `${selectedChildrenCount} SELECTED`}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {categoryServices.length > 0 && (
                                                                        <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isExpanded ? 'bg-primary/10 text-primary' : 'text-text-subtle'}`}>
                                                                            <ChevronRight size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : (isAr ? 'rotate-180' : '')}`} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <AnimatePresence>
                                                                {isExpanded && categoryServices.length > 0 && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="overflow-hidden bg-surface-subtle border-t border-border-subtle"
                                                                    >
                                                                        <div className="p-3 space-y-2">
                                                                            {categoryServices.map(svc => {
                                                                                const existingIdx = tempProjectServices.findIndex(ps => ps.service_id === svc.service_id);
                                                                                const isSelected = existingIdx !== -1;
                                                                                const currentPS = isSelected ? tempProjectServices[existingIdx] : null;

                                                                                return (
                                                                                    <div key={svc.service_id} className={`p-3 rounded-xl border transition-all duration-300 ${isSelected ? 'border-primary/50 bg-surface shadow-sm' : 'border-transparent bg-surface hover:border-border'}`}>
                                                                                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                                                                                            <div className="min-w-[140px]">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    {isSelected && <CheckCircle2 size={14} className="text-primary" />}
                                                                                                    <h5 className={`font-bold text-xs ${isSelected ? 'text-primary' : 'text-text-main'}`}>{svc.service_name}</h5>
                                                                                                </div>
                                                                                            </div>

                                                                                            {isSelected ? (
                                                                                                <div className="flex flex-wrap items-center gap-2 bg-surface-subtle p-2 rounded-lg border border-border-subtle">
                                                                                                    <div className="w-16">
                                                                                                        <Input
                                                                                                            label={isAr ? 'الكمية' : 'Qty'}
                                                                                                            type="number"
                                                                                                            value={String(currentPS?.quantity || '')}
                                                                                                            onChange={v => {
                                                                                                                const n = [...tempProjectServices];
                                                                                                                n[existingIdx] = { ...n[existingIdx], quantity: Number(v) };
                                                                                                                setTempProjectServices(n);
                                                                                                            }}
                                                                                                            className="!h-8 !text-xs text-center font-bold"
                                                                                                            containerClassName="!space-y-0"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div className="w-32">
                                                                                                        <Select
                                                                                                            label={isAr ? 'المورد' : 'Supplier'}
                                                                                                            value={currentPS?.supplier_id || ''}
                                                                                                            onChange={v => {
                                                                                                                const n = [...tempProjectServices];
                                                                                                                n[existingIdx] = { ...n[existingIdx], supplier_id: v };
                                                                                                                setTempProjectServices(n);
                                                                                                            }}
                                                                                                            options={[{ label: isAr ? 'داخلي (GCM)' : 'Internal', value: '' }, ...suppliers.map(s => ({ label: s.name, value: s.supplier_id }))]}
                                                                                                            className="!h-8 !text-xs"
                                                                                                            containerClassName="!space-y-0"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div className="w-24">
                                                                                                        <Input
                                                                                                            label={isAr ? 'سعر الوحدة' : 'Unit Price'}
                                                                                                            type="number"
                                                                                                            value={String(currentPS?.unit_price || '')}
                                                                                                            onChange={v => {
                                                                                                                const n = [...tempProjectServices];
                                                                                                                n[existingIdx] = { ...n[existingIdx], unit_price: Number(v) };
                                                                                                                setTempProjectServices(n);
                                                                                                            }}
                                                                                                            className="!h-8 !text-xs text-center font-bold text-success"
                                                                                                            containerClassName="!space-y-0"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div className="w-20">
                                                                                                        <Input
                                                                                                            label={isAr ? 'تنبيه' : 'Alert At'}
                                                                                                            type="number"
                                                                                                            value={String(currentPS?.warning_threshold || '')}
                                                                                                            onChange={v => {
                                                                                                                const n = [...tempProjectServices];
                                                                                                                n[existingIdx] = { ...n[existingIdx], warning_threshold: Number(v) };
                                                                                                                setTempProjectServices(n);
                                                                                                            }}
                                                                                                            placeholder={isAr ? 'رحلة' : 'trips'}
                                                                                                            className="!h-8 !text-xs text-center font-bold text-amber-600"
                                                                                                            containerClassName="!space-y-0"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div className="px-2 border-s border-border-subtle h-8 flex flex-col justify-center min-w-[60px]">
                                                                                                        <p className="text-[7px] font-black text-text-subtle uppercase">{isAr ? 'الإجمالي' : 'TOTAL'}</p>
                                                                                                        <p className="text-[10px] font-mono font-bold text-primary">
                                                                                                            {((currentPS?.quantity || 0) * (currentPS?.unit_price || 0)).toLocaleString()}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <button
                                                                                                        onClick={() => setTempProjectServices(tempProjectServices.filter((_, i) => i !== existingIdx))}
                                                                                                        className="p-1.5 text-danger hover:bg-danger/10 rounded-md transition-colors ms-auto"
                                                                                                    >
                                                                                                        <Trash2 size={14} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <Button
                                                                                                    variant="secondary"
                                                                                                    size="sm"
                                                                                                    onClick={() => setTempProjectServices([...tempProjectServices, {
                                                                                                        service_id: svc.service_id,
                                                                                                        quantity: 1,
                                                                                                        unit_price: 0,
                                                                                                        supplier_id: '',
                                                                                                        id: `TEMP-${Date.now()}`
                                                                                                    }])}
                                                                                                    icon={Plus}
                                                                                                    className="h-8 text-xs py-0"
                                                                                                >
                                                                                                    {isAr ? 'إسناد الخدمة' : 'Allocate'}
                                                                                                </Button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl justify-between items-center shadow-sm">
                                <div className="flex gap-6">
                                    <div>
                                        <p className="text-[9px] text-text-subtle font-bold uppercase">{isAr ? 'الميزانية' : 'Budget'}</p>
                                        <p className="font-mono font-bold text-sm text-text-main">
                                            {tempProjectServices.reduce((acc, s) => acc + ((Number(s.quantity) || 0) * (Number(s.unit_price) || 0)), 0).toLocaleString()} <span className="text-[10px] text-text-subtle">SAR</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-text-subtle font-bold uppercase">{isAr ? 'الكمية' : 'Qty'}</p>
                                        <p className="font-mono font-bold text-sm text-text-main">
                                            {tempProjectServices.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-5 px-5 border-s border-border-subtle">
                                    <div>
                                        <p className="text-[9px] text-text-subtle font-bold uppercase">{isAr ? 'الخدمات' : 'Services'}</p>
                                        <p className="font-mono font-bold text-sm text-primary">{tempProjectServices.length}</p>
                                    </div>
                                    {tempProjectServices.some(s => s.warning_threshold) && (
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={14} className="text-amber-500" />
                                            <div>
                                                <p className="text-[9px] text-text-subtle font-bold uppercase">{isAr ? 'تنبيهات' : 'Alerts'}</p>
                                                <p className="font-mono font-bold text-sm text-amber-600">{tempProjectServices.filter(s => s.warning_threshold).length}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setWizardStep(1)}
                                    className="flex-1 py-4 uppercase tracking-widest gap-2 text-xs rounded-xl"
                                    icon={ArrowLeft}
                                >
                                    {isAr ? 'السابق' : 'Previous'}
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSaveProject}
                                    isLoading={isSubmitting}
                                    className="flex-[2] py-4 rounded-xl uppercase tracking-widest font-bold text-xs shadow-sm gap-2"
                                    icon={CheckCircle2}
                                >
                                    {isAr ? 'المصادقة والحفظ' : 'AUTHENTICATE & SAVE'}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <QuickUserModal
                isOpen={isQuickUserOpen}
                onClose={() => setIsQuickUserOpen(false)}
                onSuccess={(newUser) => {
                    setCurrentProject(prev => ({
                        ...prev,
                        user_id: newUser.id,
                        project_name: prev?.project_name || newUser.name
                    }));
                }}
                initialRole={Role.PROJECT_USER}
                initialName={currentProject?.project_name || ''}
                isAr={isAr}
            />
        </Modal>
    );
};

export default ProjectWizard;
