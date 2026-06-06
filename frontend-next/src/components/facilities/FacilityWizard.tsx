import React, { useState, useEffect } from 'react';
import { Facility, FacilityType, Service } from '@/types';
import { Modal, Input, Button, MultiSelect, FileUploader } from '@/components';
import { Building2, Shield, Calendar, MapPin, FileText, CheckCircle2 } from 'lucide-react';

interface FacilityWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Facility>) => void;
    facility: Partial<Facility> | null;
    isAr: boolean;
    services: Service[];
    isSubmitting?: boolean;
}

const FacilityWizard: React.FC<FacilityWizardProps> = ({
    isOpen, onClose, onSave, facility, isAr, services, isSubmitting = false
}) => {
    const [formData, setFormData] = useState<Partial<Facility>>({
        name: '',
        type: FacilityType.DISPOSAL,
        status: 'ACTIVE',
        accepted_services: [],
    });

    const [step, setStep] = useState(1);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (facility?.facility_id) {
                setFormData({
                    ...facility,
                    accepted_services: Array.isArray(facility.accepted_services) ? facility.accepted_services : []
                });
            } else {
                setFormData({
                    name: '',
                    type: FacilityType.DISPOSAL,
                    status: 'ACTIVE',
                    accepted_services: []
                });
            }
            setStep(1);
        }
    }, [facility, isOpen]);

    const handleNext = () => {
        if (step < 3) {
            setIsAnimating(true);
            setTimeout(() => {
                setStep(s => s + 1);
                setIsAnimating(false);
            }, 200);
        } else {
            onSave(formData);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setIsAnimating(true);
            setTimeout(() => {
                setStep(s => s - 1);
                setIsAnimating(false);
            }, 200);
        } else {
            onClose();
        }
    };

    const serviceOptions = services.map(s => ({
        value: s.service_id,
        label: s.service_name
    }));

    const steps = [
        { id: 1, label: isAr ? 'الهوية' : 'Identity', icon: Building2 },
        { id: 2, label: isAr ? 'الامتثال' : 'Compliance', icon: Shield },
        { id: 3, label: isAr ? 'التشغيل' : 'Operations', icon: CheckCircle2 }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={facility?.facility_id ? (isAr ? 'تعديل بيانات المرفق' : 'Edit Facility Profile') : (isAr ? 'تهيئة مرفق جديد' : 'Onboard New Facility')}
            size="xl"
        >
            <div className="space-y-8 p-6" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}>
                {/* Stepper UI */}
                <div className="flex items-center justify-between mb-10 px-4 relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />
                    {steps.map((s, idx) => (
                        <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${step >= s.id ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110' : 'bg-surface border-border text-text-subtle'}`}>
                                <s.icon size={18} />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${step >= s.id ? 'text-primary' : 'text-text-subtle'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                    {step === 1 && (
                        <div className="space-y-6">
                            <Input
                                label={isAr ? 'اسم المرفق' : 'Facility Name'}
                                placeholder={isAr ? 'مثال: محطة معالجة النفايات الصناعية' : 'e.g., Industrial Waste Treatment Plant'}
                                value={formData.name || ''}
                                onChange={(v) => setFormData({ ...formData, name: v })}
                                icon={Building2}
                                required
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'نوع المرفق' : 'Facility Type'}</label>
                                    <select
                                        className="w-full bg-surface-subtle border border-border rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as FacilityType })}
                                    >
                                        {Object.values(FacilityType).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الحالة' : 'Status'}</label>
                                    <select
                                        className="w-full bg-surface-subtle border border-border rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                                    >
                                        <option value="ACTIVE">{isAr ? 'نشط' : 'Active'}</option>
                                        <option value="INACTIVE">{isAr ? 'غير نشط' : 'Inactive'}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Input
                                        label={isAr ? 'رابط الموقع (GPS)' : 'Location URL (GPS)'}
                                        placeholder="https://maps.google.com/..."
                                        value={formData.location_url || ''}
                                        onChange={(v) => setFormData({ ...formData, location_url: v })}
                                        icon={MapPin}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="!py-3.5"
                                    onClick={() => {
                                        if (navigator.geolocation) {
                                            navigator.geolocation.getCurrentPosition((pos) => {
                                                const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                                                setFormData({ ...formData, location_url: url });
                                            });
                                        }
                                    }}
                                >
                                    {isAr ? 'جلب الموقع' : 'Pick'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Input
                                    label={isAr ? 'رقم العقد' : 'Contract No'}
                                    value={formData.contract_no || ''}
                                    onChange={(v) => setFormData({ ...formData, contract_no: v })}
                                    icon={FileText}
                                />
                                <Input
                                    label={isAr ? 'تاريخ البداية' : 'Start Date'}
                                    type="date"
                                    value={formData.contract_start || ''}
                                    onChange={(v) => setFormData({ ...formData, contract_start: v })}
                                    icon={Calendar}
                                />
                                <Input
                                    label={isAr ? 'تاريخ النهاية' : 'Expiry Date'}
                                    type="date"
                                    value={formData.contract_end || ''}
                                    onChange={(v) => setFormData({ ...formData, contract_end: v })}
                                    icon={Calendar}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'ملف العقد' : 'Contract File'}</label>
                                <FileUploader
                                    value={formData.contract_file}
                                    onUpload={(val) => setFormData({ ...formData, contract_file: val })}
                                    isAr={isAr}
                                    label={isAr ? 'ارفع العقد (PDF/Image)' : 'Upload Contract (PDF/Image)'}
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الخدمات المقبولة' : 'Accepted Waste Services'}</label>
                                <MultiSelect
                                    options={serviceOptions}
                                    value={formData.accepted_services || []}
                                    onChange={(vals) => setFormData({ ...formData, accepted_services: vals })}
                                    placeholder={isAr ? 'اختر الخطوط الإنتاجية المقبولة...' : 'Select accepted waste lines...'}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'تفاصيل إضافية' : 'Operational Details'}</label>
                                <textarea
                                    className="w-full bg-surface-subtle border border-border rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all h-32 resize-none"
                                    value={formData.details || ''}
                                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                    placeholder={isAr ? 'تعليمات التفريغ، ساعات العمل، إلخ...' : 'Discharge instructions, hours of operation, etc...'}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                            e.preventDefault();
                            handleBack();
                        }}
                    >
                        {step === 1 ? (isAr ? 'إلغاء' : 'Cancel') : (isAr ? 'السابق' : 'Previous')}
                    </Button>

                    <Button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNext();
                        }}
                        isLoading={step === 3 && isSubmitting}
                        disabled={step === 3 && isSubmitting}
                    >
                        {step < 3 ? (isAr ? 'المتابعة' : 'Continue') : (isAr ? 'حفظ البيانات' : 'Save Facility')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default FacilityWizard;
