import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Plus, Trash2, Calendar, Wrench } from 'lucide-react';
import { Card, Input, Button } from '@/components';
import { InventorySize, Project, Supplier, Service } from '@/types';
import { getInventoryAssetTypeOptions, getInventoryOwnershipOptions } from '@/features/lookups/wizardOptions';

interface InventoryWizardProps {
    item: any;
    activeTab: 'containers' | 'tanks' | 'scales' | 'sizes';
    isAr: boolean;
    inventorySizes: InventorySize[];
    projects: Project[];
    suppliers: Supplier[];
    onChange: (item: any) => void;
    onSave: () => void;
    isSubmitting?: boolean;
    onCancel: () => void;
    services?: Service[];
    linkedServiceIds?: string[];
    onServiceLinksChange?: (serviceIds: string[]) => void;
}

const InventoryWizard: React.FC<InventoryWizardProps> = ({
    item,
    activeTab,
    isAr,
    inventorySizes,
    projects,
    suppliers,
    onChange,
    onSave,
    isSubmitting,
    onCancel,
    services = [],
    linkedServiceIds = [],
    onServiceLinksChange
}) => {
    if (!item) return null;

    return (
        <div className="space-y-6">
            {activeTab === 'sizes' ? (
                <Card className="p-8 space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest block ml-1">{isAr ? 'اسم الحجم / السعة' : 'Size Name'}</label>
                        <Input
                            className="py-4 font-bold"
                            value={item.name || ''}
                            onChange={val => onChange({ ...item, name: val })}
                            placeholder="e.g. 20 Yard Skip, 5000L Tank"
                        />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest block ml-1">{isAr ? 'تصنيف الأصل' : 'Asset Type'}</label>
                        <div className="grid grid-cols-2 gap-4">
                            {getInventoryAssetTypeOptions().map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => onChange({ ...item, type: t.value })}
                                    className={`py-5 rounded-2xl text-[10px] font-bold tracking-widest uppercase transition-all border-2 ${item.type === t.value ? 'bg-primary text-surface border-primary-600 shadow-xl shadow-primary/20' : 'bg-surface-subtle text-text-subtle border-transparent hover:bg-surface'}`}
                                >
                                    {t.value}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>
            ) : (
                <div className="space-y-6">
                    <Card className="p-8 space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest block ml-1">{isAr ? 'الكود المرجعي للنظام' : 'Serial Number'}</label>
                            <Input
                                className="py-4 font-bold text-lg"
                                value={item.code || ''}
                                onChange={val => onChange({ ...item, code: val })}
                                placeholder="SERIAL-000X"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest block ml-1">{isAr ? 'سعة الحجم' : 'Capacity'}</label>
                                <select
                                    className="w-full p-4 bg-surface-subtle rounded-2xl font-bold text-sm border-2 border-border outline-none focus:border-primary/20 transition-all"
                                    value={item.size_id || ''}
                                    onChange={e => onChange({ ...item, size_id: e.target.value })}
                                >
                                    <option value="">--- {isAr ? 'اختر السعة' : 'Select'} ---</option>
                                    {inventorySizes.filter(s => s.type === (activeTab === 'containers' ? 'CONTAINER' : activeTab === 'tanks' ? 'TANK' : 'SCALE')).map(sz => (
                                        <option key={sz.size_id} value={sz.size_id}>{sz.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest block ml-1">{isAr ? 'بروتوكول الملكية' : 'Ownership'}</label>
                                <select
                                    className="w-full p-4 bg-surface-subtle rounded-2xl font-bold text-sm border-2 border-border outline-none focus:border-primary/20 transition-all"
                                    value={item.ownership || 'OWN'}
                                    onChange={e => onChange({ ...item, ownership: e.target.value })}
                                >
                                    {getInventoryOwnershipOptions().map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            {item.ownership === 'SUPPLIER' && (
                                <div className="space-y-4 col-span-2">
                                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest block ml-1">{isAr ? 'المورد المالك' : 'Supplier/Owner'}</label>
                                    <select
                                        className="w-full p-4 bg-surface-subtle rounded-2xl font-bold text-sm border-2 border-border outline-none focus:border-primary/20 transition-all"
                                        value={item.supplier_id || ''}
                                        onChange={e => onChange({ ...item, supplier_id: e.target.value })}
                                    >
                                        <option value="">--- {isAr ? 'اختر المورد' : 'Select Supplier'} ---</option>
                                        {suppliers.map(sup => (
                                            <option key={sup.supplier_id} value={sup.supplier_id}>{sup.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest block ml-1">{isAr ? 'تاريخ الشراء' : 'Purchase Date'}</label>
                                <Input
                                    type="date"
                                    className="py-4"
                                    value={item.purchase_date || ''}
                                    onChange={val => onChange({ ...item, purchase_date: val })}
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest block ml-1">{isAr ? 'المشروع الحالي' : 'Assigned Project'}</label>
                                <select
                                    className="w-full p-4 bg-surface-subtle rounded-2xl font-bold text-sm border-2 border-border outline-none focus:border-primary/20 transition-all"
                                    value={item.project_id || ''}
                                    onChange={e => onChange({ ...item, project_id: e.target.value })}
                                >
                                    <option value="">--- {isAr ? 'غير مخصص' : 'Standby/None'} ---</option>
                                    {projects.map(p => (
                                        <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Maintenance Log Repeater */}
                    <Card className="p-8 space-y-6">
                        <div className="flex justify-between items-center bg-surface-subtle p-6 rounded-3xl border border-border">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600/10 text-blue-600 rounded-xl">
                                    <Wrench size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-text-main uppercase tracking-widest">{isAr ? 'سجل الصيانة' : 'Maintenance History'}</h4>
                                    <p className="text-[10px] font-bold text-text-subtle opacity-60 uppercase">{isAr ? 'إضافة وتتبع سجلات الصيانة الدورية' : 'Track and manage regular servicing'}</p>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    let logs: any[] = [];
                                    try {
                                        logs = typeof item.maintenance_logs === 'string' ? JSON.parse(item.maintenance_logs) : (item.maintenance_logs || []);
                                    } catch (e) { logs = []; }
                                    if (!Array.isArray(logs)) logs = [];

                                    const newLogs = [...logs, { id: `LOG-${Date.now()}`, date: new Date().toISOString().split('T')[0], notes: '' }];
                                    onChange({ ...item, maintenance_logs: newLogs });
                                }}
                                icon={Plus}
                                className="bg-blue-600 text-white border-none px-6 rounded-2xl shadow-lg shadow-blue-500/20"
                            >
                                {isAr ? 'سجل جديد' : 'Add Log'}
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {(() => {
                                try {
                                    let logs: any[] = [];
                                    const rawLogs = item.maintenance_logs;

                                    if (typeof rawLogs === 'string') {
                                        try { logs = JSON.parse(rawLogs); } catch (e) { logs = []; }
                                    } else if (Array.isArray(rawLogs)) {
                                        logs = rawLogs;
                                    } else if (rawLogs) {
                                        logs = [];
                                    } else {
                                        logs = [];
                                    }

                                    if (!Array.isArray(logs)) logs = [];

                                    if (logs.length === 0) {
                                        return (
                                            <div className="p-12 border-2 border-dashed border-border rounded-3xl text-center flex flex-col items-center justify-center space-y-4 opacity-50 grayscale">
                                                <div className="p-4 bg-surface rounded-full shadow-sm text-text-subtle">
                                                    <Calendar size={32} />
                                                </div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">{isAr ? 'لم يتم العثور على سجلات سابقة' : 'Blank Service History'}</p>
                                            </div>
                                        );
                                    }

                                    return logs.map((log: any, idx: number) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={log.id || idx}
                                            className="p-6 bg-surface-subtle/50 rounded-3xl border border-border/50 space-y-4"
                                        >
                                            <div className="flex gap-4">
                                                <div className="w-1/3">
                                                    <label className="text-[8px] font-bold text-text-subtle uppercase tracking-widest block mb-2 ml-1">{isAr ? 'تاريخ الصيانة' : 'Service Date'}</label>
                                                    <Input
                                                        type="date"
                                                        className="py-3 text-xs"
                                                        value={log.date || ''}
                                                        onChange={val => {
                                                            const currentLogs = [...logs];
                                                            currentLogs[idx] = { ...currentLogs[idx], date: val };
                                                            onChange({ ...item, maintenance_logs: currentLogs });
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[8px] font-bold text-text-subtle uppercase tracking-widest block mb-2 ml-1">{isAr ? 'وصف الصيانة' : 'Service Notes'}</label>
                                                    <div className="flex gap-3">
                                                        <Input
                                                            className="py-3 text-xs"
                                                            value={log.notes || ''}
                                                            onChange={val => {
                                                                const currentLogs = [...logs];
                                                                currentLogs[idx] = { ...currentLogs[idx], notes: val };
                                                                onChange({ ...item, maintenance_logs: currentLogs });
                                                            }}
                                                            placeholder={isAr ? 'مثال: تغيير الزيت، فحص تسريبات...' : 'e.g. Oil change, leakage check...'}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const currentLogs = logs.filter((_: any, i: number) => i !== idx);
                                                                onChange({ ...item, maintenance_logs: currentLogs });
                                                            }}
                                                            className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ));
                                } catch (err) {
                                    return <div className="p-4 text-rose-500 text-xs font-bold bg-rose-500/10 rounded-xl">Error rendering logs</div>;
                                }
                            })()}
                        </div>
                    </Card>
                </div>
            )}

            {/* Service Links Section (for containers & tanks only) */}
            {activeTab !== 'sizes' && services.length > 0 && (
                <Card className="p-6 space-y-4">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-text-subtle tracking-widest">
                        <CheckCircle2 size={16} />
                        {isAr ? 'الخدمات المرتبطة' : 'Linked Service Types'}
                    </h4>
                    <p className="text-[10px] text-text-subtle">
                        {isAr ? 'اختر الخدمات التي يستخدم فيها هذا الأصل — سيتم فلترة الأصول تلقائياً في الرحلات' : 'Select services this asset operates on — assets will auto-filter in trips'}
                    </p>
                    <div className="space-y-4">
                        {services.filter(s => !s.parent_id).map(parentService => {
                            const isParentLinked = linkedServiceIds.includes(parentService.service_id);
                            const subServices = services.filter(s => s.parent_id === parentService.service_id);
                            
                            return (
                                <div key={parentService.service_id} className="p-4 bg-surface/30 border border-border/50 rounded-2xl space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!onServiceLinksChange) return;
                                            const next = isParentLinked
                                                ? linkedServiceIds.filter(id => id !== parentService.service_id)
                                                : [...linkedServiceIds, parentService.service_id];
                                            onServiceLinksChange(next);
                                        }}
                                        className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all ${
                                            isParentLinked
                                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                                                : 'bg-surface text-text-main border-border hover:border-emerald-400 hover:text-emerald-600'
                                        }`}
                                    >
                                        {isParentLinked && <CheckCircle2 size={14} className="inline mr-1 -mt-0.5" />}
                                        {parentService.service_name}
                                    </button>
                                    
                                    {subServices.length > 0 && (
                                        <div className={`flex flex-wrap gap-2 ${isAr ? 'pr-4 border-r-2 border-border/50 mr-2' : 'pl-4 border-l-2 border-border/50 ml-2'}`}>
                                            {subServices.map(sub => {
                                                const isSubLinked = linkedServiceIds.includes(sub.service_id);
                                                return (
                                                    <button
                                                        key={sub.service_id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!onServiceLinksChange) return;
                                                            const next = isSubLinked
                                                                ? linkedServiceIds.filter(id => id !== sub.service_id)
                                                                : [...linkedServiceIds, sub.service_id];
                                                            onServiceLinksChange(next);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                            isSubLinked
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                                                : 'bg-surface-subtle text-text-subtle border-border hover:border-emerald-300 hover:text-emerald-600'
                                                        }`}
                                                    >
                                                        {isSubLinked && <CheckCircle2 size={10} className="inline mr-1 -mt-0.5" />}
                                                        {sub.service_name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
            <div className="flex gap-4 pt-4">
                <Button
                    variant="secondary"
                    onClick={onCancel}
                    className="flex-1 py-5 uppercase tracking-widest"
                >
                    {isAr ? 'إلغاء' : 'Abort'}
                </Button>
                <Button
                    variant="primary"
                    onClick={onSave}
                    isLoading={isSubmitting}
                    className={`flex-2 py-5 uppercase tracking-widest bg-primary border-none shadow-xl shadow-primary/20`}
                    icon={CheckCircle2}
                >
                    {isAr ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
};

export default InventoryWizard;
