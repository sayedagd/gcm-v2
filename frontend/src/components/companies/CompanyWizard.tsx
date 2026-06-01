import React, { useRef } from 'react';
import { Modal, Input, Button, FileUploader, Select, QuickUserModal } from '@/components';
import { Company, User, Role } from '@/types';
import { Building2, Briefcase, ArrowRight, ArrowLeft, Hash, CheckCircle2, Scale, UserCheck, Phone, Mail, Navigation, AlertCircle, MapPin, UserPlus, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CompanyWizardProps {
    isOpen: boolean;
    onClose: () => void;
    currentCompany: Partial<Company> | null;
    setCurrentCompany: React.Dispatch<React.SetStateAction<Partial<Company> | null>>;
    wizardStep: number;
    setWizardStep: (step: number) => void;
    isAr: boolean;
    handleSave: () => void;
    isSubmitting?: boolean;
    formError?: string;
    handleCaptureLocation: () => void;
    users: User[];
}

const CompanyWizard: React.FC<CompanyWizardProps> = ({
    isOpen,
    onClose,
    currentCompany,
    setCurrentCompany,
    wizardStep,
    setWizardStep,
    isAr,
    handleSave,
    isSubmitting,
    formError,
    handleCaptureLocation,
    users
}) => {
    const [isQuickUserOpen, setIsQuickUserOpen] = React.useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    return (
        <Modal size="xl" isOpen={isOpen} onClose={onClose} title={isAr ? 'إدارة بيانات الشريك' : 'Partner Intelligence Wizard'}>
            <div className="flex gap-2 p-1.5 bg-surface-elevated rounded-2xl mb-6 border border-border-subtle mx-6">
                {[1, 2, 3].map(step => (
                    <div key={step} className={`flex-1 h-1.5 rounded-full transition-all duration-700 ${wizardStep >= step ? 'bg-primary-500 shadow-lg shadow-primary-500/20' : 'bg-surface-subtle'}`} />
                ))}
            </div>

            <div className={`px-6 pb-6 space-y-6 ${isAr ? 'text-right' : 'text-left'}`}>
                {formError && <div className="p-3 bg-danger-muted border border-danger/20 rounded-xl flex items-center gap-2 text-danger text-xs font-bold"><AlertCircle size={16} /> {formError}</div>}

                <AnimatePresence mode="wait">
                    {wizardStep === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            
                            <div className="flex items-start gap-6 p-4 bg-surface-subtle border border-border-subtle rounded-2xl">
                                <div className="w-24 h-24 bg-surface rounded-2xl shadow-sm flex items-center justify-center border border-border shrink-0 overflow-hidden relative group">
                                    {currentCompany?.logo_url ? <img src={currentCompany.logo_url} className="w-full h-full object-contain p-2" /> : <Building2 size={32} className="text-text-placeholder" />}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                        <UploadCloud size={20} className="text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2 pt-2">
                                    <h4 className="font-bold text-sm text-text-main">{isAr ? 'شعار الشريك التجاري' : 'Partner Logo'}</h4>
                                    <p className="text-xs text-text-subtle mb-3">{isAr ? 'ارفع شعار الشركة بصيغة شفافة لظهور أفضل في التقارير.' : 'Upload a transparent logo for better report visibility.'}</p>
                                    <Button variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()}>{isAr ? 'رفع ملف' : 'Browse File'}</Button>
                                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = () => setCurrentCompany(p => ({ ...p, logo_url: reader.result as string }));
                                            reader.readAsDataURL(file);
                                        }
                                    }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input label={isAr ? 'اسم الشريك' : 'Company Name'} icon={Building2} value={currentCompany?.company_name || ''} onChange={v => setCurrentCompany(p => ({ ...p, company_name: v }))} />
                                <Input label={isAr ? 'نشاط العمل' : 'Business Industry'} icon={Briefcase} value={currentCompany?.details || ''} onChange={v => setCurrentCompany(p => ({ ...p, details: v }))} />
                            </div>

                            <Button
                                variant="primary"
                                onClick={() => setWizardStep(2)}
                                icon={ArrowRight}
                                iconPosition="right"
                                className="w-full py-4 rounded-xl uppercase tracking-widest font-bold text-xs"
                            >
                                {isAr ? 'الخطوة التالية' : 'PROCEED'}
                            </Button>
                        </motion.div>
                    )}

                    {wizardStep === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            
                            <div className="bg-surface-subtle border border-border-subtle p-5 rounded-2xl space-y-5">
                                <h4 className="font-bold text-sm text-text-main flex items-center gap-2 mb-2"><Hash size={16} className="text-primary"/> {isAr ? 'السجل التجاري' : 'Commercial Registration'}</h4>
                                <Input label={isAr ? 'رقم السجل التجاري' : 'CR NUMBER'} value={currentCompany?.commercial_reg || ''} onChange={v => setCurrentCompany(p => ({ ...p, commercial_reg: v }))} />
                                {currentCompany?.cr_file ? <div className="p-3 bg-success-muted text-success rounded-xl text-[9px] font-bold uppercase flex items-center gap-2 border border-success/20"><CheckCircle2 size={14} /> {isAr ? 'ملف السجل التجاري مرفوع' : 'CR Indexed'}</div> : <FileUploader onUpload={b => setCurrentCompany(p => ({ ...p, cr_file: b }))} isAr={isAr} />}
                            </div>

                            <div className="bg-surface-subtle border border-border-subtle p-5 rounded-2xl space-y-5">
                                <h4 className="font-bold text-sm text-text-main flex items-center gap-2 mb-2"><Scale size={16} className="text-primary"/> {isAr ? 'البيانات الضريبية' : 'VAT Details'}</h4>
                                <Input label={isAr ? 'الرقم الضريبي' : 'VAT NUMBER'} value={currentCompany?.vat_no || ''} onChange={v => setCurrentCompany(p => ({ ...p, vat_no: v }))} />
                                {currentCompany?.vat_file ? <div className="p-3 bg-success-muted text-success rounded-xl text-[9px] font-bold uppercase flex items-center gap-2 border border-success/20"><CheckCircle2 size={14} /> {isAr ? 'الشهادة الضريبية مرفوعة' : 'VAT Indexed'}</div> : <FileUploader onUpload={b => setCurrentCompany(p => ({ ...p, vat_file: b }))} isAr={isAr} />}
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    variant="secondary"
                                    onClick={() => setWizardStep(1)}
                                    className="flex-1 py-4 rounded-xl gap-2 text-xs"
                                    icon={ArrowLeft}
                                >
                                    {isAr ? 'رجوع' : 'BACK'}
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => setWizardStep(3)}
                                    className="flex-[2] py-4 rounded-xl uppercase tracking-widest font-bold text-xs gap-2"
                                    icon={ArrowRight}
                                    iconPosition="right"
                                >
                                    {isAr ? 'الخطوة الأخيرة' : 'NEXT STEP'}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {wizardStep === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            
                            <div className="bg-surface-subtle border border-border-subtle p-5 rounded-2xl space-y-5">
                                <h4 className="font-bold text-sm text-text-main mb-2">{isAr ? 'بيانات التواصل الأساسية' : 'Primary Contact Info'}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label={isAr ? 'المسؤول المباشر' : 'CONTACT PERSON'} icon={UserCheck} value={currentCompany?.contact_name || ''} onChange={v => setCurrentCompany(p => ({ ...p, contact_name: v }))} />
                                    <Input label={isAr ? 'رقم الجوال' : 'MOBILE PHONE'} icon={Phone} value={currentCompany?.contact_phone || ''} onChange={v => setCurrentCompany(p => ({ ...p, contact_phone: v }))} />
                                    <div className="md:col-span-2">
                                        <Input label={isAr ? 'البريد الإلكتروني' : 'OFFICIAL EMAIL'} icon={Mail} value={currentCompany?.contact_email || ''} onChange={v => setCurrentCompany(p => ({ ...p, contact_email: v }))} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface-subtle border border-border-subtle p-5 rounded-2xl space-y-5">
                                <h4 className="font-bold text-sm text-text-main mb-2">{isAr ? 'تكامل النظام والموقع' : 'System Integration'}</h4>
                                
                                <div className="flex items-end gap-2 text-right">
                                    <div className="flex-1">
                                        <Select
                                            label={isAr ? 'ربط بحساب نظام' : 'Link to System Account'}
                                            value={currentCompany?.user_id || ''}
                                            onChange={val => {
                                                const selectedUser = users.find(u => u.id === val);
                                                if (selectedUser) {
                                                    setCurrentCompany(p => ({
                                                        ...p,
                                                        user_id: val,
                                                        contact_name: p?.contact_name || selectedUser.name,
                                                        contact_email: p?.contact_email || selectedUser.email
                                                    }));
                                                } else {
                                                    setCurrentCompany(p => ({ ...p, user_id: val }));
                                                }
                                            }}
                                            options={users.filter(u => u.role === Role.COMPANY_USER || u.role === Role.CLIENT || u.role === Role.ADMIN).map(u => ({
                                                label: `${u.name} (${u.email})`,
                                                value: u.id
                                            }))}
                                            placeholder={isAr ? 'اختر حساب موظف...' : 'Select company user...'}
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

                                <Input
                                    label={isAr ? 'موقع GPS' : 'LOCATION URL'}
                                    icon={Navigation}
                                    value={currentCompany?.main_location_url || ''}
                                    onChange={v => setCurrentCompany(p => ({ ...p, main_location_url: v }))}
                                    suffix={
                                        <button
                                            onClick={handleCaptureLocation}
                                            className="p-2.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                                        >
                                            <MapPin size={16} />
                                        </button>
                                    }
                                />
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    variant="secondary"
                                    onClick={() => setWizardStep(2)}
                                    className="flex-1 py-4 rounded-xl gap-2 text-xs"
                                    icon={ArrowLeft}
                                >
                                    {isAr ? 'رجوع' : 'BACK'}
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                    isLoading={isSubmitting}
                                    className="flex-[2] py-4 rounded-xl uppercase tracking-widest font-bold text-xs gap-2"
                                    icon={CheckCircle2}
                                >
                                    {isAr ? 'إتمام التسجيل' : 'AUTHENTICATE & SAVE'}
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
                    setCurrentCompany(p => ({
                        ...p,
                        user_id: newUser.id,
                        contact_name: p?.contact_name || newUser.name,
                        contact_email: p?.contact_email || newUser.email
                    }));
                }}
                initialRole={Role.COMPANY_USER}
                initialName={currentCompany?.company_name || ''}
                isAr={isAr}
            />
        </Modal>
    );
};

export default CompanyWizard;
