import React from 'react';
import { Layers, Wrench, FileText, CheckCircle2 } from 'lucide-react';
import { Button, Input, Select } from '@/components';
import { Service } from '@/types';

interface ServiceWizardProps {
    service: Partial<Service> | null;
    parentServiceName?: string;
    isAr: boolean;
    isSubmitting: boolean;
    onChange: (service: Partial<Service>) => void;
    onSave: () => void;
    onCancel: () => void;
}

const ServiceWizard: React.FC<ServiceWizardProps> = ({
    service,
    parentServiceName,
    isAr,
    isSubmitting,
    onChange,
    onSave,
    onCancel
}) => {
    if (!service) return null;

    return (
        <div className={`space-y-6 pt-2 ${isAr ? 'text-right' : 'text-left'}`}>
            {service.parent_id && (
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-100 dark:border-primary-900/40 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-lg"><Layers size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">{isAr ? 'الفئة الرئيسية' : 'Parent Category'}</p>
                        <p className="font-bold text-text-main">{parentServiceName || service.parent_id}</p>
                    </div>
                </div>
            )}

            <Input
                label={isAr ? 'اسم الخدمة/المادة' : 'Label / Identity'}
                icon={Wrench}
                placeholder={isAr ? 'مثال: حاوية 20 ياردة...' : 'Ex: 20 Yard Container...'}
                value={service.service_name || ''}
                onChange={val => onChange({ ...service, service_name: val })}
            />

            {!service.parent_id && (
                <div className="space-y-4 p-4 bg-surface-subtle rounded-2xl border border-border">
                    <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest px-2">
                        {isAr ? 'المجموعة الكبيرة (Major Group)' : 'Major Classification'}
                    </p>
                    <Input
                        label={isAr ? 'تصنيف المجموعة' : 'Category Group'}
                        placeholder={isAr ? 'مثال: Hazardous Waste, Water Supply...' : 'Ex: Hazardous Waste, Water Supply...'}
                        value={service.major_category || ''}
                        onChange={val => onChange({ ...service, major_category: val })}
                    />
                </div>
            )}

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest flex items-center gap-2 px-2"><FileText size={14} className="text-primary-500" /> {isAr ? 'الوصف التقني' : 'Technical Specifications'}</label>
                <textarea
                    className="w-full p-4 bg-surface-subtle rounded-2xl font-bold text-base outline-none border-2 border-transparent focus:border-primary-500 transition-all shadow-inner min-h-[120px] dark:text-text-main"
                    placeholder={isAr ? 'أدخل التفاصيل التقنية...' : 'Enter technical specifications...'}
                    value={service.service_description || ''}
                    onChange={e => onChange({ ...service, service_description: e.target.value })}
                />
            </div>

            {/* Recycle Receipt Toggle — sub-services only */}
            {service.parent_id && (
                <div
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${service.requires_recycle_receipt
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border bg-surface-subtle hover:border-primary/30'
                        }`}
                    onClick={() => onChange({ ...service, requires_recycle_receipt: !service.requires_recycle_receipt })}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${service.requires_recycle_receipt ? 'bg-amber-500 text-white' : 'bg-surface text-text-subtle'}`}>
                            <Layers size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-text-main text-sm">{isAr ? 'تتطلب إيصال تدوير' : 'Requires Recycle Receipt'}</p>
                            <p className="text-[10px] font-bold text-text-subtle">{isAr ? 'عند التفعيل: يجب رفع إيصال تدوير عند تسجيل رحلة بهذه الخدمة' : 'When enabled: recycle receipt upload is mandatory for trips using this service'}</p>
                        </div>
                    </div>
                    <div className={`w-12 h-7 rounded-full p-1 transition-all ${service.requires_recycle_receipt ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${service.requires_recycle_receipt ? (isAr ? '-translate-x-5' : 'translate-x-5') : ''}`} />
                    </div>
                </div>
            )}

            <div className="flex gap-4 pt-4">
                <Button variant="ghost" onClick={onCancel} className="flex-1 py-4" disabled={isSubmitting}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                <Button variant="primary" onClick={onSave} className="flex-1 py-4" isLoading={isSubmitting} icon={CheckCircle2}>
                    {isAr ? 'حفظ البيانات' : 'Commit Changes'}
                </Button>
            </div>
        </div>
    );
};

export default ServiceWizard;
