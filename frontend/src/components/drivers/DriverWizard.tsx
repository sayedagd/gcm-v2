import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Users, Building2, Shield, Navigation, Paperclip, Plus, X, CheckCircle2, UserPlus } from 'lucide-react';
import { Button, Input, Select, SearchableSelect, QuickUserModal } from '@/components';
import { Driver, Supplier, PermitEntry, Vehicle, User, Role } from '@/types';
import { motion } from 'framer-motion';
import { toast } from '@/utils/toast';

interface DriverWizardProps {
    currentStaff: Partial<Driver> | null;
    setCurrentStaff: (staff: Partial<Driver>) => void;
    onSave: (staff: Driver, permits: PermitEntry[]) => void;
    isSubmitting?: boolean;
    suppliers: Supplier[];
    vehicles: Vehicle[];
    users: User[];
    isAr: boolean;
}

const DriverWizard: React.FC<DriverWizardProps> = ({
    currentStaff,
    setCurrentStaff,
    onSave,
    isSubmitting,
    suppliers,
    vehicles,
    users,
    isAr
}) => {
    // [FIX] Use local state to prevent stale-closure issues when user edits
    // multiple fields rapidly or when React batches parent re-renders.
    const [localStaff, setLocalStaff] = useState<Partial<Driver>>(() => currentStaff ?? {});
    const [permits, setPermits] = useState<PermitEntry[]>([]);
    const [uploadType, setUploadType] = useState<'license' | 'iqama' | 'operating_card' | 'insurance' | 'permit'>('license');
    const [activePermitIdx, setActivePermitIdx] = useState<number | null>(null);
    const [isQuickUserOpen, setIsQuickUserOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync from parent whenever the edited driver changes (i.e. user opens a different driver).
    useEffect(() => {
        const next = currentStaff ?? {};
        setLocalStaff(next);
        try {
            const stored = JSON.parse((next as any).permit_zones || '[]');
            setPermits(Array.isArray(stored) ? stored : []);
        } catch {
            setPermits([]);
        }
    }, [currentStaff?.driver_id]); // Only reset when the ID changes, not on every keystroke

    // Helper: update a single field safely using the functional form of setState
    const update = useCallback(<K extends keyof Driver>(field: K, value: Driver[K]) => {
        setLocalStaff(prev => ({ ...prev, [field]: value }));
    }, []);

    const addPermit = () => setPermits(prev => [...prev, { no: '', zone: '' }]);

    const updatePermit = (idx: number, field: keyof PermitEntry, val: string) => {
        setPermits(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: val };
            return next;
        });
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            if (uploadType === 'permit' && activePermitIdx !== null) {
                setPermits(prev => {
                    const next = [...prev];
                    next[activePermitIdx] = { ...next[activePermitIdx], fileName: file.name, fileData: base64 };
                    return next;
                });
            } else if (uploadType === 'license') {
                update('license_file', base64);
            } else if (uploadType === 'iqama') {
                update('iqama_file', base64);
            } else if (uploadType === 'operating_card') {
                update('operating_card_file', base64);
            } else if (uploadType === 'insurance') {
                update('insurance_file', base64);
            }
        };
        reader.readAsDataURL(file);
        // Reset input so the same file can be re-selected if needed
        e.target.value = '';
    };

    const handleSave = () => {
        if (!localStaff?.name) {
            toast.error(isAr ? 'يرجى إدخال الاسم' : 'Please provide a name');
            return;
        }
        // Sync to parent for UI consistency (e.g. header showing current name)
        setCurrentStaff(localStaff);
        // Pass the definitive local copy to the parent's save handler
        onSave(localStaff as Driver, permits);
    };

    return (
        <div className="space-y-6">
            {/* Profile Engineering Form */}
            <div className="p-6 bg-surface-subtle rounded-xl border border-border space-y-6">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-text-subtle tracking-widest mb-4">
                    <Users size={16} className="text-success" /> {isAr ? 'المعلومات الأساسية' : 'Basic Information'}
                </h4>

                {/* Account Linking dropdown */}
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <Select
                            label={isAr ? 'ربط بحساب موظف (من الفريق)' : 'Link to User Account (Team)'}
                            value={localStaff?.user_id || ''}
                            onChange={val => {
                                const selectedUser = users.find(u => u.id === val);
                                if (selectedUser) {
                                    setLocalStaff(prev => ({
                                        ...prev,
                                        user_id: val,
                                        name: prev.name || selectedUser.name,
                                        phone: prev.phone || '',
                                        category: 'OPERATIONS',
                                        role_title: isAr ? 'سائق' : 'Driver'
                                    }));
                                } else {
                                    update('user_id', val);
                                }
                            }}
                            options={users.filter(u => u.role === Role.DRIVER || u.role === Role.ADMIN).map(u => ({
                                label: `👤 ${u.name} (${u.email})`,
                                value: u.id
                            }))}
                            placeholder={isAr ? 'اختر موظف للربط...' : 'Select employee to link...'}
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
                <p className="text-[10px] text-text-subtle mt-2 italic">
                    {isAr
                        ? '* يربط هذا السائق بحساب مستخدم ليتمكن من الدخول للتطبيق'
                        : '* This links the driver to a user account for app access'}
                </p>

                <QuickUserModal
                    isOpen={isQuickUserOpen}
                    onClose={() => setIsQuickUserOpen(false)}
                    onSuccess={(newUser) => {
                        setLocalStaff(prev => ({
                            ...prev,
                            user_id: newUser.id,
                            name: prev.name || newUser.name,
                            category: 'OPERATIONS',
                            role_title: isAr ? 'سائق' : 'Driver'
                        }));
                    }}
                    initialRole={Role.DRIVER}
                    initialName={localStaff?.name || ''}
                    isAr={isAr}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label={isAr ? 'الاسم الثلاثي' : 'Full Name'}
                    placeholder="Salem Ahmad..."
                    value={localStaff?.name || ''}
                    onChange={val => update('name', val)}
                />
                <Input
                    label={isAr ? 'المسمى الوظيفي' : 'Job Title'}
                    placeholder="Ex: Senior Driver..."
                    value={localStaff?.role_title || ''}
                    onChange={val => update('role_title', val)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label={isAr ? 'رقم الجوال' : 'Phone Number'}
                    placeholder="05XXXXXXXX"
                    value={localStaff?.phone || ''}
                    onChange={val => update('phone', val)}
                />
                <Select
                    label={isAr ? 'تصنيف الكادر' : 'Staff Category'}
                    value={localStaff?.category || 'OPERATIONS'}
                    onChange={val => update('category', val as Driver['category'])}
                    options={[
                        { label: isAr ? '🔧 الكادر الميداني' : '🔧 FIELD OPERATIONS', value: 'OPERATIONS' },
                        { label: isAr ? '💼 الهيكل الإداري' : '💼 MANAGEMENT STRUCTURE', value: 'MANAGEMENT' }
                    ]}
                    className="!text-xs uppercase"
                />
            </div>

            {/* Ownership & Assignments */}
            <div className="p-6 bg-surface border border-border space-y-6">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-primary-600 dark:text-primary-400 tracking-widest mb-4">
                    <Building2 size={16} /> {isAr ? 'الارتباطات والتعيينات' : 'Assignments & Allocations'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label={isAr ? 'مصدر التوظيف' : 'Employment Source'}
                        value={localStaff?.ownership_type || 'INTERNAL'}
                        onChange={val => update('ownership_type', val as Driver['ownership_type'])}
                        options={[
                            { label: '🏢 GCM (CORE TEAM)', value: 'INTERNAL' },
                            { label: '🤝 EXTERNAL PARTNER', value: 'SUPPLIER' }
                        ]}
                        className="!text-xs"
                    />
                    {localStaff?.ownership_type === 'SUPPLIER' && (
                        <SearchableSelect
                            label={isAr ? 'الشريك اللوجستي' : 'Logistics Partner'}
                            value={localStaff?.supplier_id || ''}
                            onChange={val => setLocalStaff(prev => ({
                                ...prev,
                                supplier_id: val,
                                supplier_name: suppliers.find(s => s.supplier_id === val)?.name
                            }))}
                            options={suppliers.map(s => ({ label: s.name, value: s.supplier_id }))}
                            placeholder={isAr ? 'اختر الشريك' : 'SELECT PARTNER'}
                            className="!text-xs uppercase !text-amber !border-amber/30 focus:!border-amber"
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label={isAr ? 'تخصيص المركبة (Vehicle)' : 'Vehicle Assignment'}
                        value={localStaff?.vehicle_id || ''}
                        onChange={val => update('vehicle_id', val || null)}
                        options={vehicles.map(v => ({ label: `🚛 ${v.plate_no} - ${v.vehicle_type}`, value: v.vehicle_id }))}
                        placeholder={isAr ? 'بدون مركبة - ⏸️ وضع الاستعداد' : 'No Vehicle - ⏸️ STANDBY'}
                        className="!text-xs !text-blue-600"
                    />
                    <Select
                        label={isAr ? 'الحالة التشغيلية' : 'Operational Status'}
                        value={localStaff?.status || 'ACTIVE'}
                        onChange={val => update('status', val as Driver['status'])}
                        options={[
                            { label: '✅ READY / ACTIVE', value: 'ACTIVE' },
                            { label: '⏸️ TEMPORARY LEAVE', value: 'ON_LEAVE' },
                            { label: '❌ DECOMMISSIONED', value: 'INACTIVE' }
                        ]}
                        className="!text-xs"
                    />
                </div>
            </div>

            {/* Credentials Form */}
            <div className="p-6 bg-surface-subtle rounded-xl border border-border space-y-6">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-success tracking-widest mb-4">
                    <Shield size={16} /> {isAr ? 'الوثائق الرسمية (4 مستندات إلزامية)' : 'Mandatory Official Documents (4 Required)'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {([
                        { idx: 1, title: isAr ? 'الإقامة / الهوية' : 'Iqama / ID', noKey: 'iqama_no', expiryKey: 'iqama_expiry', fileKey: 'iqama_file', uploadKey: 'iqama' as const, noPlaceholder: isAr ? 'رقم الإقامة...' : 'Iqama Number...' },
                        { idx: 2, title: isAr ? 'رخصة القيادة' : 'Driver License', noKey: 'license_no', expiryKey: 'license_expiry', fileKey: 'license_file', uploadKey: 'license' as const, noPlaceholder: isAr ? 'رقم الرخصة...' : 'License Number...' },
                        { idx: 3, title: isAr ? 'كارت التشغيل' : 'Operating Card', noKey: 'operating_card_no', expiryKey: 'operating_card_expiry', fileKey: 'operating_card_file', uploadKey: 'operating_card' as const, noPlaceholder: isAr ? 'رقم الكارت...' : 'Card Number...' },
                        { idx: 4, title: isAr ? 'تأمين السائق' : 'Driver Insurance', noKey: 'insurance_no', expiryKey: 'insurance_expiry', fileKey: 'insurance_file', uploadKey: 'insurance' as const, noPlaceholder: isAr ? 'رقم الوثيقة...' : 'Policy Number...' },
                    ] as const).map((doc) => {
                        const noVal = (localStaff as any)?.[doc.noKey] || '';
                        const expiryVal = (localStaff as any)?.[doc.expiryKey] || '';
                        const fileVal = (localStaff as any)?.[doc.fileKey] || '';
                        const hasFile = !!fileVal;
                        const hasExpiry = !!expiryVal;
                        const isComplete = !!noVal && hasFile && hasExpiry;

                        let expiryStatus = '';
                        let expiryColor = '';
                        if (hasExpiry) {
                            const exp = new Date(expiryVal);
                            const now = new Date();
                            const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            if (daysLeft < 0) { expiryStatus = isAr ? 'منتهي' : 'Expired'; expiryColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'; }
                            else if (daysLeft <= 30) { expiryStatus = isAr ? 'قارب' : 'Soon'; expiryColor = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'; }
                            else { expiryStatus = isAr ? 'ساري' : 'Valid'; expiryColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'; }
                        }

                        return (
                            <div key={doc.idx} className={`space-y-2 bg-surface p-4 rounded-xl border-2 transition-all ${isComplete ? 'border-success/50 shadow-sm shadow-success/10' : 'border-border'}`}>
                                <label className="text-[10px] font-bold text-text-main uppercase tracking-widest flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-2">
                                        {isComplete && <CheckCircle2 size={12} className="text-success" />}
                                        {doc.idx}. {doc.title}
                                    </span>
                                    <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isComplete ? 'bg-success animate-pulse' : noVal ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                </label>
                                <div className="grid gap-2">
                                    <Input
                                        placeholder={doc.noPlaceholder}
                                        value={noVal}
                                        onChange={val => setLocalStaff(prev => ({ ...prev, [doc.noKey]: val }))}
                                    />
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            type="date"
                                            containerClassName="flex-1"
                                            value={expiryVal}
                                            onChange={val => setLocalStaff(prev => ({ ...prev, [doc.expiryKey]: val }))}
                                        />
                                        {hasExpiry && (
                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full whitespace-nowrap ${expiryColor}`}>
                                                {expiryStatus}
                                            </span>
                                        )}
                                    </div>
                                    {/* File Upload Row */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="secondary"
                                            onClick={() => { setUploadType(doc.uploadKey); fileInputRef.current?.click(); }}
                                            className={`px-4 transition-all ${hasFile ? 'bg-success text-surface hover:bg-success/90 border-transparent' : ''}`}
                                            icon={hasFile ? CheckCircle2 : Paperclip}
                                        />
                                        {hasFile ? (
                                            <div className="flex-1 flex items-center gap-2 bg-success/10 border border-success/20 rounded-lg px-3 py-1.5">
                                                <CheckCircle2 size={12} className="text-success shrink-0" />
                                                <span className="text-[10px] font-bold text-success truncate flex-1">
                                                    {isAr ? 'تم رفع الملف ✓' : 'File uploaded ✓'}
                                                </span>
                                                <button
                                                    onClick={() => setLocalStaff(prev => ({ ...prev, [doc.fileKey]: '' }))}
                                                    className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                                                    title={isAr ? 'إزالة الملف' : 'Remove file'}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-text-subtle italic">
                                                {isAr ? 'لم يتم رفع ملف بعد' : 'No file attached'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Advanced Access Control List */}
            <div className="p-6 bg-surface-subtle rounded-xl space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-text-subtle tracking-widest">
                        <Navigation size={16} /> {isAr ? 'تصاريح الدخول والمناطق' : 'Access Control & Permits'}
                        {permits.length > 0 && (
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px] font-black">
                                {permits.length}
                            </span>
                        )}
                    </h4>
                    <Button variant="secondary" size="sm" onClick={addPermit} icon={Plus} />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {permits.map((p, idx) => {
                        const hasPermitFile = !!(p.fileData || p.fileName);
                        return (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={idx} className={`bg-surface p-4 rounded-2xl border-2 shadow-sm flex flex-col gap-3 transition-all ${p.no && hasPermitFile ? 'border-success/40' : 'border-border'}`}>
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <Input
                                            label={isAr ? 'رقم التصريح' : 'Permit Registry'}
                                            value={p.no}
                                            onChange={val => updatePermit(idx, 'no', val)}
                                            className="!p-2 !rounded-lg !border-none !text-xs shadow-none focus:ring-1 ring-success/50"
                                            containerClassName="!space-y-1"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            label={isAr ? 'المنطقة المرخصة' : 'Assigned Zone'}
                                            value={p.zone}
                                            onChange={val => updatePermit(idx, 'zone', val)}
                                            className="!p-2 !rounded-lg !border-none !text-xs shadow-none focus:ring-1 ring-success/50"
                                            containerClassName="!space-y-1"
                                        />
                                    </div>
                                    <Button variant="secondary" size="sm" onClick={() => { setUploadType('permit'); setActivePermitIdx(idx); fileInputRef.current?.click(); }} className={`p-3 rounded-lg transition-all ${hasPermitFile ? 'bg-success text-surface border-transparent' : ''}`} icon={hasPermitFile ? CheckCircle2 : Paperclip} />
                                    <button onClick={() => setPermits(prev => prev.filter((_, i) => i !== idx))} className="p-3 rounded-xl text-danger hover:bg-danger-muted transition-all">
                                        <X size={16} />
                                    </button>
                                </div>
                                {/* Permit expiry date */}
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        label={isAr ? 'تاريخ انتهاء التصريح' : 'Permit Expiry'}
                                        containerClassName="flex-1 !space-y-1"
                                        className="!p-2 !rounded-lg !text-xs"
                                        value={p.expiry || ''}
                                        onChange={val => updatePermit(idx, 'expiry', val)}
                                    />
                                    {p.expiry && (() => {
                                        const exp = new Date(p.expiry);
                                        const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                        const label = days < 0 ? (isAr ? 'منتهي' : 'Expired') : days <= 30 ? (isAr ? 'قارب' : 'Soon') : (isAr ? 'ساري' : 'Valid');
                                        const cls = days < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : days <= 30 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
                                        return <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full whitespace-nowrap ${cls}`}>{label}</span>;
                                    })()}
                                </div>
                                {/* Permit file status */}
                                {hasPermitFile ? (
                                    <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-lg px-3 py-1.5">
                                        <CheckCircle2 size={12} className="text-success shrink-0" />
                                        <span className="text-[10px] font-bold text-success truncate">
                                            {p.fileName || (isAr ? 'تم رفع ملف التصريح ✓' : 'Permit file uploaded ✓')}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5">
                                        <Paperclip size={10} className="text-text-subtle" />
                                        <span className="text-[10px] text-text-subtle italic">
                                            {isAr ? 'ارفق ملف التصريح (اختياري)' : 'Attach permit file (optional)'}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                    {permits.length === 0 && <p className="text-center py-6 text-[10px] font-bold text-text-subtle uppercase tracking-widest opacity-50">{isAr ? 'لا يوجد تصاريح فعالة' : 'Zero Active Permits'}</p>}
                </div>
            </div>

            <Button
                variant="primary"
                onClick={handleSave}
                isLoading={isSubmitting}
                className="w-full py-5 text-sm tracking-widest shadow-xl shadow-success/20 bg-success border-none"
                icon={CheckCircle2}
            >
                {isAr ? 'تأكيد وحفظ البيانات' : 'Commit & Secure Record'}
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={onFileChange} />
        </div>
    );
};

export default DriverWizard;
