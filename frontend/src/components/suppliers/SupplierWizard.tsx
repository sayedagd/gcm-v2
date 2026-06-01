import React, { useState, useRef, useEffect } from 'react';
import {
    CheckCircle2, Paperclip, FileText, Shield, CreditCard,
    Calendar, Target, UserPlus
} from 'lucide-react';
import { Modal, Button, Input, Select, MultiSelect, QuickUserModal } from '@/components';
import { Supplier, User, Role } from '@/types';
import { useStore } from '@/context';
import ContactRepeater from './ContactRepeater';

interface SupplierWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    isSubmitting?: boolean;
    supplier: Partial<Supplier> | null;
    users: User[];
    isAr: boolean;
    formError?: string;
    setSupplier: (s: Partial<Supplier>) => void;
}

const SupplierWizard: React.FC<SupplierWizardProps> = ({
    isOpen,
    onClose,
    onSave,
    isSubmitting,
    supplier,
    users,
    isAr,
    formError,
    setSupplier
}) => {
    const { projects, services } = useStore();
    // [FIX] Local state prevents stale-closure bugs (especially inside FileReader.onload)
    const [localSupplier, setLocalSupplier] = useState<Partial<Supplier>>(() => supplier ?? {});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadType, setUploadType] = useState<'cr' | 'tax' | 'Contract'>('cr');
    const [isQuickUserOpen, setIsQuickUserOpen] = useState(false);

    // Sync when editing a different supplier
    useEffect(() => { setLocalSupplier(supplier ?? {}); }, [supplier?.supplier_id]);


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            if (uploadType === 'cr') setLocalSupplier(prev => ({ ...prev, cr_file: base64 }));
            else if (uploadType === 'tax') setLocalSupplier(prev => ({ ...prev, tax_file: base64 }));
            else if (uploadType === 'Contract') setLocalSupplier(prev => ({ ...prev, contract_file: base64 }));
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleSave = () => {
        // Sync local state to parent before save
        setSupplier(localSupplier);
        onSave();
    };

    const projectOptions = projects.map(p => ({
        label: p.project_name,
        value: p.project_id
    }));

    const serviceOptions = services.map(s => ({
        label: s.service_name,
        value: s.service_id
    }));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            title={isAr ? 'بروتوكول تسجيل المورد' : 'Supplier Governance Registry'}
        >
            <div className="space-y-8 py-4">
                {formError && (
                    <div className="p-4 bg-danger-muted border border-danger/20 text-danger rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2">
                        {formError}
                    </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

                <div className="space-y-8">
                    {/* Basic Identity */}
                    <div className="grid grid-cols-2 gap-6">
                        <Input
                            label={isAr ? 'اسم المنشأة' : 'Institutional Name'}
                            value={localSupplier?.name || ''}
                            onChange={val => setLocalSupplier(prev => ({ ...prev, name: val }))}
                            placeholder="e.g. AL-MAJD GLOBAL CORP"
                        />
                        <Input
                            label={isAr ? 'الاسم التجاري' : 'Trading Identity'}
                            value={localSupplier?.trading_name || ''}
                            onChange={val => setLocalSupplier(prev => ({ ...prev, trading_name: val }))}
                            placeholder="e.g. MAJD LOGISTICS"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <Input
                            label={isAr ? 'السجل التجاري' : 'CR Number'}
                            value={localSupplier?.cr_no || ''}
                            onChange={val => setLocalSupplier(prev => ({ ...prev, cr_no: val }))}
                            placeholder="1010XXXXXX"
                        />
                        <Select
                            label={isAr ? 'تصنيف الخدمة التشغيلية' : 'Operational Category'}
                            value={localSupplier?.category || 'GENERAL'}
                            onChange={val => setLocalSupplier(prev => ({ ...prev, category: val as any }))}
                            options={[
                                { label: 'Logistics (Fleet)', value: 'VEHICLES' },
                                { label: 'Equipment (Bins)', value: 'CONTAINERS' },
                                { label: 'Manpower (Staff)', value: 'STAFF' },
                                { label: 'General Services', value: 'GENERAL' }
                            ]}
                            className="!text-xs uppercase"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <div className="flex items-end gap-2 text-right">
                            <div className="flex-1">
                                <Select
                                    label={isAr ? 'ربط بحساب نظام (اختياري)' : 'Link to System Account (Optional)'}
                                    value={localSupplier?.user_id || ''}
                                    onChange={val => setLocalSupplier(prev => ({ ...prev, user_id: val }))}
                                    options={users.filter(u => u.role === Role.SUBCONTRACTOR || u.role === Role.CLIENT || u.role === Role.ADMIN).map(u => ({
                                        label: `${u.name} (${u.email})`,
                                        value: u.id
                                    }))}
                                    placeholder={isAr ? 'اختر حساب المورد...' : 'Select supplier account...'}
                                    className="!text-xs"
                                />
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="mb-1"
                                icon={UserPlus}
                                onClick={() => setIsQuickUserOpen(true)}
                                title={isAr ? 'إنشاء حساب سريع' : 'Quick Create Account'}
                            />
                        </div>
                    </div>

                    {/* Contract Intelligence */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-3 text-[10px] font-bold uppercase text-text-subtle tracking-[0.2em] px-2">
                            <Calendar size={14} className="text-primary" /> {isAr ? 'ذكاء العقد والجدولة' : 'Contract Intelligence & Timeline'}
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            <Input
                                type="date"
                                label={isAr ? 'بداية العقد' : 'Contract Activation'}
                                value={localSupplier?.contract_start || ''}
                                onChange={val => setLocalSupplier(prev => ({ ...prev, contract_start: val }))}
                            />
                            <Input
                                type="date"
                                label={isAr ? 'نهاية العقد' : 'Contract Termination'}
                                value={localSupplier?.contract_end || ''}
                                onChange={val => setLocalSupplier(prev => ({ ...prev, contract_end: val }))}
                            />
                            <Input
                                type="date"
                                label={isAr ? 'بدء الأعمال' : 'Work Commencement'}
                                value={localSupplier?.work_start_date || ''}
                                onChange={val => setLocalSupplier(prev => ({ ...prev, work_start_date: val }))}
                            />
                        </div>
                    </div>

                    {/* Strategic Assignments */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-3 text-[10px] font-bold uppercase text-text-subtle tracking-[0.2em] px-2">
                            <Target size={14} className="text-emerald-500" /> {isAr ? 'تخصيص المشاريع والخدمات' : 'Strategic Assignments'}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MultiSelect
                                label={isAr ? 'المشاريع المخصصة' : 'Targeted Projects'}
                                placeholder={isAr ? 'اختر المشاريع...' : 'Select Projects...'}
                                options={projectOptions}
                                value={localSupplier?.assigned_projects || []}
                                onChange={val => setLocalSupplier(prev => ({ ...prev, assigned_projects: val }))}
                            />
                            <MultiSelect
                                label={isAr ? 'الخدمات المعتمدة' : 'Certified Services'}
                                placeholder={isAr ? 'اختر الخدمات...' : 'Select Services...'}
                                options={serviceOptions}
                                value={localSupplier?.assigned_services || []}
                                onChange={val => setLocalSupplier(prev => ({ ...prev, assigned_services: val }))}
                            />
                        </div>
                    </div>

                    <ContactRepeater
                        isAr={isAr}
                        contacts={typeof localSupplier?.contact_persons === 'string' ? JSON.parse(localSupplier.contact_persons || '[]') : (localSupplier?.contact_persons || [])}
                        onChange={c => setLocalSupplier(prev => ({ ...prev, contact_persons: c }))}
                    />

                    <div className="space-y-6">
                        <h4 className="flex items-center gap-3 text-[10px] font-bold uppercase text-text-subtle tracking-[0.2em] px-2">
                            <Paperclip size={14} className="text-amber" /> {isAr ? 'المستندات الثبوتية الموقعة' : 'Signed Credentials'}
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            <Button variant={localSupplier?.cr_file ? "primary" : "secondary"} onClick={() => { setUploadType('cr'); fileInputRef.current?.click(); }} className={`py-6 text-[9px] ${localSupplier?.cr_file ? 'bg-amber text-surface' : ''}`} icon={FileText}>{isAr ? 'السجل' : 'CR Doc'}</Button>
                            <Button variant={localSupplier?.tax_file ? "primary" : "secondary"} onClick={() => { setUploadType('tax'); fileInputRef.current?.click(); }} className={`py-6 text-[9px] ${localSupplier?.tax_file ? 'bg-primary text-surface' : ''}`} icon={Shield}>{isAr ? 'الضريبة' : 'Tax Cert'}</Button>
                            <Button variant={localSupplier?.contract_file ? "primary" : "secondary"} onClick={() => { setUploadType('Contract'); fileInputRef.current?.click(); }} className={`py-6 text-[9px] ${localSupplier?.contract_file ? 'bg-emerald-500 text-surface' : ''}`} icon={CreditCard}>{isAr ? 'العقد' : 'Contract'}</Button>
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        isLoading={isSubmitting}
                        className="w-full py-6 bg-slate-900 border-none text-white rounded-[1.5rem] font-black uppercase tracking-[0.4em] shadow-2xl text-xs hover:bg-slate-800 transition-all border-b-4 border-slate-700 active:border-b-0"
                        icon={CheckCircle2}
                    >
                        {isAr ? 'إتمـام عملية الحوكمة' : 'AUTHORIZE REGISTRATION'}
                    </Button>
                </div>
            </div>

            <QuickUserModal
                isOpen={isQuickUserOpen}
                onClose={() => setIsQuickUserOpen(false)}
                onSuccess={(newUser) => {
                    setLocalSupplier(prev => ({
                        ...prev,
                        user_id: newUser.id,
                        name: prev.name || newUser.name
                    }));
                }}
                initialRole={Role.SUBCONTRACTOR}
                initialName={localSupplier?.name || ''}
                isAr={isAr}
            />
        </Modal >
    );
};

export default SupplierWizard;
