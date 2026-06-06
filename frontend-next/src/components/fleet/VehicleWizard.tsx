import React, { useState, useRef, useEffect } from 'react';
import NextImage from 'next/image';
import { Shield, Paperclip, X, Plus, CheckCircle2, Sparkles, AlertCircle, Camera, Image as ImageIcon, RotateCw } from 'lucide-react';
import { Button, Input, Select } from '@/components';
import { Vehicle, Supplier, PermitEntry, VehicleDocument, DocumentStatus, Service } from '@/types';
import { motion } from 'framer-motion';
import { toast } from '@/utils/toast';
import VehicleProgress from './VehicleProgress';

interface VehicleWizardProps {
    currentVehicle: Partial<Vehicle> | null;
    setCurrentVehicle: (vehicle: Partial<Vehicle>) => void;
    onSave: (vehicle: Vehicle, permits: PermitEntry[]) => void;
    isSubmitting?: boolean;
    suppliers: Supplier[];
    isAr: boolean;
    services?: Service[];
    linkedServiceIds?: string[];
    onServiceLinksChange?: (serviceIds: string[]) => void;
}

const VehicleWizard: React.FC<VehicleWizardProps> = ({
    currentVehicle,
    setCurrentVehicle,
    onSave,
    isSubmitting,
    suppliers,
    isAr,
    services = [],
    linkedServiceIds = [],
    onServiceLinksChange
}) => {
    // [FIX] Local state prevents stale-closure issues when React batches parent re-renders
    const [localVehicle, setLocalVehicle] = useState<Partial<Vehicle>>(() => currentVehicle ?? {});
    const [plateDigits, setPlateDigits] = useState('');
    const [plateLetters, setPlateLetters] = useState('');
    const [plateError, setPlateError] = useState('');
    const [permits, setPermits] = useState<PermitEntry[]>([]);
    const [documents, setDocuments] = useState<VehicleDocument[]>([]);
    const [activePermitIndex, setActivePermitIndex] = useState<number | null>(null);
    const [activeDocIndex, setActiveDocIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docFileInputRef = useRef<HTMLInputElement>(null);
    const frontPhotoRef = useRef<HTMLInputElement>(null);
    const backPhotoRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            setLocalVehicle(currentVehicle ?? {});
            if (currentVehicle) {
                // Plate Sync
                const parts = (currentVehicle.plate_no || '').split(' ');
                if (parts.length === 2) {
                    setPlateDigits(parts[0] || '');
                    setPlateLetters(parts[1] || '');
                } else {
                    setPlateDigits('');
                    setPlateLetters('');
                }

                // Permits Sync
                try {
                    const storedPermits = JSON.parse(currentVehicle.permit_zones || '[]');
                    setPermits(Array.isArray(storedPermits) ? storedPermits : []);
                } catch (_error) {
                    setPermits([]);
                }

                // Documents Sync & Default Init if Empty
                if (currentVehicle.documents && currentVehicle.documents.length > 0) {
                    setDocuments(currentVehicle.documents);
                } else {
                    // Define required documents
                    setDocuments([
                        { id: `DOC-RC-${Date.now()}`, type: 'Registration Card', number: '', expiry_date: '', status: DocumentStatus.EXPIRED, progress_weight: 30 },
                        { id: `DOC-INS-${Date.now()}`, type: 'Insurance', number: '', expiry_date: '', status: DocumentStatus.EXPIRED, progress_weight: 30 },
                        { id: `DOC-FIT-${Date.now()}`, type: 'Fitness', number: '', expiry_date: '', status: DocumentStatus.EXPIRED, progress_weight: 20 },
                        { id: `DOC-IC-${Date.now()}`, type: 'Inspection Certificate', number: '', expiry_date: '', status: DocumentStatus.EXPIRED, progress_weight: 20 }
                    ]);
                }
            }
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [currentVehicle?.vehicle_id]); // Only re-run when ID changes, preventing loops

    const handlePlateChange = (digits: string, letters: string) => {
        setPlateDigits(digits);
        setPlateLetters(letters);
        const combined = `${digits} ${letters}`.trim();
        setLocalVehicle(prev => ({ ...prev, plate_no: combined }));
        if (plateError) setPlateError('');
    };

    const updateDocument = (idx: number, key: keyof VehicleDocument, value: VehicleDocument[keyof VehicleDocument]) => {
        const newDocs = [...documents];
        const currentDoc = newDocs[idx];
        if (!currentDoc) return;
        newDocs[idx] = { ...currentDoc, [key]: value };

        // Auto-calculate status if date changes
        if (key === 'expiry_date' && typeof value === 'string') {
            const expiry = new Date(value);
            const now = new Date();
            const diffTime = expiry.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (value === '' || diffDays < 0) {
                newDocs[idx] = { ...newDocs[idx], status: DocumentStatus.EXPIRED };
            } else if (diffDays <= 30) {
                newDocs[idx] = { ...newDocs[idx], status: DocumentStatus.NEAR_EXPIRY };
            } else {
                newDocs[idx] = { ...newDocs[idx], status: DocumentStatus.ACTIVE };
            }
        }

        setDocuments(newDocs);
        setLocalVehicle(prev => ({ ...prev, documents: newDocs }));
    };

    const addPermit = () => setPermits([...permits, { no: '', zone: '' }]);

    const updatePermit = (index: number, key: keyof PermitEntry, value: string) => {
        const newPermits = [...permits];
        const currentPermit = newPermits[index] || { no: '', zone: '' };
        newPermits[index] = { ...currentPermit, [key]: value };
        setPermits(newPermits);
    };

    const removePermit = (index: number) => setPermits(permits.filter((_, i) => i !== index));

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || activePermitIndex === null) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.warning(isAr ? 'حجم الملف كبير جداً (الأقصى 2 ميجا)' : 'File too large (Max 2MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            const newPermits = [...permits];
            const currentPermit = newPermits[activePermitIndex] || { no: '', zone: '' };
            newPermits[activePermitIndex] = {
                ...currentPermit,
                fileName: file.name,
                fileData: base64
            };
            setPermits(newPermits);
        };
        reader.readAsDataURL(file);
    };

    const onDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || activeDocIndex === null) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.warning(isAr ? 'حجم الملف كبير جداً (الأقصى 2 ميجا)' : 'File too large (Max 2MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            const newDocs = [...documents];
            const currentDoc = newDocs[activeDocIndex];
            if (!currentDoc) return;
            newDocs[activeDocIndex] = {
                ...currentDoc,
                fileName: file.name,
                fileData: base64
            };
            setDocuments(newDocs);
            setLocalVehicle(prev => ({ ...prev, documents: newDocs }));
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo_front' | 'photo_back') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            toast.warning(isAr ? 'حجم الصورة كبير جداً (الأقصى 3 ميجا)' : 'Image too large (Max 3MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            setLocalVehicle(prev => ({ ...prev, [field]: base64 }));
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const validateAndSave = () => {
        const plateNo = localVehicle?.plate_no || '';
        const regex = /^(\d{1,4})\s([A-Za-z\u0600-\u06FF\s]{1,3})$/;

        if (!localVehicle?.vehicle_type) {
            toast.error(isAr ? 'يجب اختيار نوع المعدة' : 'Vehicle type is required');
            return;
        }

        if (plateNo && !regex.test(plateNo.trim())) {
            setPlateError(isAr ? 'مثال: 1234 أ ب ج' : 'Example: 1234 ABC');
            return;
        }

        // Local Document Validation Checks
        const typesSet = new Set<string>();
        for (const doc of documents) {
            if (typesSet.has(doc.type)) {
                toast.error(isAr ? `خطأ: تم العثور على تكرار للمستند [${doc.type}]` : `Error: Duplicate doc type [${doc.type}]`);
                return;
            }
            typesSet.add(doc.type);

            if (doc.number && !doc.expiry_date) {
                toast.error(isAr ? `تاريخ الانتهاء مطلوب للمستند: ${doc.type}` : `Expiry date required for doc: ${doc.type}`);
                return;
            }
        }

        // Sync back to parent for UI consistency then save
        setCurrentVehicle(localVehicle);
        onSave(localVehicle as Vehicle, permits);
    };

    return (
        <div className="space-y-8">
            {/* Data Engineering Form */}
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest px-2">{isAr ? 'سجل اللوحة' : 'Plate Registry'}</label>
                    <div className="flex gap-4" dir="ltr">
                        <Input
                            className="text-center font-bold tracking-widest text-lg uppercase"
                            value={plateLetters}
                            onChange={val => handlePlateChange(plateDigits, val)}
                            placeholder="ABC"
                            maxLength={3}
                        />
                        <div className="flex items-center font-bold text-text-subtle opacity-30">-</div>
                        <Input
                            className="text-center font-bold tracking-widest text-lg"
                            value={plateDigits}
                            onChange={val => handlePlateChange(val, plateLetters)}
                            placeholder="1234"
                            maxLength={4}
                        />
                    </div>
                    {plateError && <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 px-2 mt-1"><AlertCircle size={12} /> {plateError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label={isAr ? 'نوع المعدة الميدانية' : 'Field Unit Type'}
                        value={localVehicle?.vehicle_type || ''}
                        onChange={val => setLocalVehicle(prev => ({ ...prev, vehicle_type: val }))}
                        options={[
                            { label: 'HOOK LIFT SYSTEM', value: 'Hook Lift' },
                            { label: 'COMPACTOR UNIT', value: 'Compactor' },
                            { label: 'WATER TANKER', value: 'Water Tanker' },
                            { label: 'SMALL PICKUP', value: 'Small Pickup' },
                            { label: 'FLATBED TRUCK', value: 'Flatbed' }
                        ]}
                        className="!text-xs uppercase"
                        placeholder={isAr ? 'اختر النوع' : 'SELECT TYPE'}
                    />
                    <Select
                        label={isAr ? 'الحالة التشغيلية' : 'Operational Status'}
                        value={localVehicle?.status || ''}
                        onChange={val => setLocalVehicle(prev => ({ ...prev, status: val as Vehicle['status'] }))}
                        options={[
                            { label: 'READY / ACTIVE', value: 'ACTIVE' },
                            { label: 'IN MAINTENANCE', value: 'MAINTENANCE' },
                            { label: 'DECOMMISSIONED', value: 'INACTIVE' }
                        ]}
                        className="!text-xs uppercase"
                    />
                </div>
            </div>

            {/* Ownership & Attributes */}
            <div className="p-6 bg-surface-subtle rounded-xl border border-border space-y-6">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'تبعية الأصول' : 'Asset Sourcing'}</label>
                    <div className="flex bg-surface p-1 rounded-xl border border-border">
                        <button onClick={() => setLocalVehicle(prev => ({ ...prev, ownership_type: 'INTERNAL' }))} className={`px-5 py-2 rounded-lg text-[9px] font-bold transition-all ${localVehicle?.ownership_type === 'INTERNAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-text-subtle'}`}>{isAr ? 'داخلية' : 'INTERNAL'}</button>
                        <button onClick={() => setLocalVehicle(prev => ({ ...prev, ownership_type: 'SUPPLIER' }))} className={`px-5 py-2 rounded-lg text-[9px] font-bold transition-all ${localVehicle?.ownership_type === 'SUPPLIER' ? 'bg-amber-500 text-white shadow-lg' : 'text-text-subtle'}`}>{isAr ? 'خارجية (مورد)' : 'SUPPLIER'}</button>
                    </div>
                </div>

                {localVehicle?.ownership_type === 'SUPPLIER' && (
                    <Select
                        label={isAr ? 'شريك الأسطول' : 'Fleet Logistics Partner'}
                        value={localVehicle?.supplier_id || ''}
                        onChange={val => setLocalVehicle(prev => ({ ...prev, supplier_id: val, supplier_name: suppliers.find(s => s.supplier_id === val)?.name || '' }))}
                        options={suppliers.map(s => ({ label: s.name, value: s.supplier_id }))}
                        placeholder={isAr ? 'اختر الشريك' : 'SELECT PARTNER'}
                        className="!text-xs uppercase !text-amber-600"
                    />
                )}

                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-500"><Sparkles size={16} /></div>
                        <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'تصنيف المركبات الصغيرة' : 'Light Weight Logistics'}</span>
                    </div>
                    <button
                        onClick={() => setLocalVehicle(prev => ({ ...prev, is_small_vehicle: !prev.is_small_vehicle }))}
                        className={`w-14 h-7 rounded-full transition-all relative ${localVehicle?.is_small_vehicle ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-surface'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${localVehicle?.is_small_vehicle ? (isAr ? 'left-1' : 'right-1') : (isAr ? 'right-1' : 'left-1')}`} />
                    </button>
                </div>
            </div>

            {/* Visual Identity Section */}
            <div className="p-6 bg-surface-subtle rounded-xl border border-border space-y-6">
                <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-text-subtle tracking-widest"><Camera size={16} /> {isAr ? 'الهوية البصرية للمعدة' : 'Unit Visual Identity'}</h4>

                <div className="grid grid-cols-2 gap-6">
                    {/* Front Photo */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-bold text-text-subtle uppercase px-1">{isAr ? 'صورة أمامية' : 'Front View'}</label>
                        <div
                            className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all ${currentVehicle?.photo_front ? 'border-emerald-500/50 bg-emerald-50/10' : 'border-border hover:border-text-subtle/30 bg-surface'}`}
                        >
                            {localVehicle?.photo_front ? (
                                <>
                                    <NextImage src={localVehicle.photo_front} className="w-full h-full object-cover" alt={isAr ? 'صورة أمامية للمعدة' : 'Vehicle front photo'} fill sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center gap-2 transition-all">
                                        <button onClick={() => frontPhotoRef.current?.click()} className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white backdrop-blur-md"><RotateCw size={18} /></button>
                                        <button onClick={() => setLocalVehicle(prev => {
                                            const { photo_front, ...rest } = prev;
                                            return rest;
                                        })} className="p-2 bg-rose-500/80 hover:bg-rose-600 rounded-lg text-white"><X size={18} /></button>
                                    </div>
                                </>
                            ) : (
                                <button onClick={() => frontPhotoRef.current?.click()} className="flex flex-col items-center gap-2 text-text-subtle hover:text-primary-500 transition-colors">
                                    <ImageIcon size={32} strokeWidth={1.5} />
                                    <span className="text-[9px] font-bold uppercase">{isAr ? 'ارفع صورة' : 'Upload Front'}</span>
                                </button>
                            )}
                        </div>
                        <input type="file" ref={frontPhotoRef} className="hidden" accept="image/*" onChange={(e) => onPhotoChange(e, 'photo_front')} />
                    </div>

                    {/* Back Photo */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-bold text-text-subtle uppercase px-1">{isAr ? 'صورة خلفية' : 'Back View'}</label>
                        <div
                            className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all ${currentVehicle?.photo_back ? 'border-emerald-500/50 bg-emerald-50/10' : 'border-border hover:border-text-subtle/30 bg-surface'}`}
                        >
                            {localVehicle?.photo_back ? (
                                <>
                                    <NextImage src={localVehicle.photo_back} className="w-full h-full object-cover" alt={isAr ? 'صورة خلفية للمعدة' : 'Vehicle back photo'} fill sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center gap-2 transition-all">
                                        <button onClick={() => backPhotoRef.current?.click()} className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white backdrop-blur-md"><RotateCw size={18} /></button>
                                        <button onClick={() => setLocalVehicle(prev => {
                                            const { photo_back, ...rest } = prev;
                                            return rest;
                                        })} className="p-2 bg-rose-500/80 hover:bg-rose-600 rounded-lg text-white"><X size={18} /></button>
                                    </div>
                                </>
                            ) : (
                                <button onClick={() => backPhotoRef.current?.click()} className="flex flex-col items-center gap-2 text-text-subtle hover:text-primary-500 transition-colors">
                                    <ImageIcon size={32} strokeWidth={1.5} />
                                    <span className="text-[9px] font-bold uppercase">{isAr ? 'ارفع صورة' : 'Upload Back'}</span>
                                </button>
                            )}
                        </div>
                        <input type="file" ref={backPhotoRef} className="hidden" accept="image/*" onChange={(e) => onPhotoChange(e, 'photo_back')} />
                    </div>
                </div>
            </div>

            {/* Document Registry Section */}
            <div className="p-6 bg-surface-subtle rounded-xl space-y-6">
                <div className="flex items-center gap-2 px-2">
                    <h4 className="flex space-x-2 text-[10px] font-bold uppercase text-text-subtle tracking-widest"><Paperclip size={16} className="mx-2" /> {isAr ? 'مستندات الجاهزية (Readiness Documents)' : 'Readiness Documents'}</h4>
                </div>

                {/* Live Progress Indicator */}
                <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
                    <VehicleProgress vehicle={{ documents }} isAr={isAr} showDetails={false} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {documents.map((doc, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${doc.status === DocumentStatus.EXPIRED ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800/30' : doc.status === DocumentStatus.NEAR_EXPIRY ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/30' : 'bg-surface border-border shadow-sm'}`}>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
                                    {doc.type} ({doc.progress_weight}%)
                                </span>
                                <div className={`w-2 h-2 rounded-full ${doc.status === DocumentStatus.ACTIVE ? 'bg-emerald-500' : doc.status === DocumentStatus.NEAR_EXPIRY ? 'bg-amber-500' : 'bg-rose-500'}`} />
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder={isAr ? 'رقم المستند' : 'Doc Number'}
                                    value={doc.number}
                                    onChange={v => updateDocument(idx, 'number', v)}
                                    containerClassName="flex-1"
                                    className="!text-xs"
                                />
                                <Input
                                    type="date"
                                    value={doc.expiry_date}
                                    onChange={v => updateDocument(idx, 'expiry_date', v)}
                                    containerClassName="w-32"
                                    className="!text-xs"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveDocIndex(idx);
                                        if (docFileInputRef.current) {
                                            docFileInputRef.current.value = '';
                                            docFileInputRef.current.click();
                                        }
                                    }}
                                    className={`w-10 h-10 shrink-0 rounded-lg border flex items-center justify-center transition-all duration-300 ${doc.fileData ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-surface hover:bg-surface-subtle text-text-subtle border-border hover:border-text-subtle/30'}`}
                                    title={doc.fileName || (isAr ? 'إرفاق المستند' : 'Attach Document')}
                                >
                                    {doc.fileData ? <CheckCircle2 size={18} className="animate-in zoom-in" /> : <Paperclip size={18} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Advanced Access Permits Section */}
            <div className="p-6 bg-surface-subtle rounded-xl space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-text-subtle tracking-widest"><Shield size={16} /> {isAr ? 'بروتوكولات التصاريح' : 'Permit Protocols'}</h4>
                    <Button variant="primary" size="sm" onClick={addPermit} icon={Plus} className="rounded-xl shadow-lg" />
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {permits.map((permit, idx) => (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={idx} className="flex gap-3 items-end bg-surface p-4 rounded-2xl border border-border shadow-sm relative group">
                            <div className="flex-1">
                                <Input
                                    label={isAr ? 'رقم السجل' : 'Registry ID'}
                                    value={permit.no}
                                    onChange={val => updatePermit(idx, 'no', val)}
                                    placeholder="000XXX"
                                    className="!p-2 !rounded-lg !border-none !text-xs shadow-none focus:ring-1 ring-emerald-500/50"
                                    containerClassName="!space-y-1"
                                />
                            </div>
                            <div className="flex-1">
                                <Input
                                    label={isAr ? 'المنطقة' : 'Geo Zone'}
                                    value={permit.zone}
                                    onChange={val => updatePermit(idx, 'zone', val)}
                                    placeholder="Zone 1"
                                    className="!p-2 !rounded-lg !border-none !text-xs shadow-none focus:ring-1 ring-emerald-500/50"
                                    containerClassName="!space-y-1"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActivePermitIndex(idx);
                                    if (fileInputRef.current) {
                                        fileInputRef.current.value = '';
                                        fileInputRef.current.click();
                                    }
                                }}
                                className={`w-10 h-10 shrink-0 rounded-lg border flex items-center justify-center transition-all ${permit.fileData ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-surface text-text-subtle border-border hover:bg-surface-subtle'}`}
                                title={permit.fileName || (isAr ? 'إرفاق ملف التصريح' : 'Attach Permit')}
                            >
                                {permit.fileData ? <CheckCircle2 size={18} /> : <Paperclip size={18} />}
                            </button>
                            <Button variant="ghost" size="sm" onClick={() => removePermit(idx)} icon={X} className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" />
                        </motion.div>
                    ))}
                    {permits.length === 0 && <p className="text-center py-6 text-[10px] font-bold text-text-subtle uppercase tracking-widest opacity-50">{isAr ? 'لا يوجد تصاريح نشطة' : 'Zero Active Permits'}</p>}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChange} accept=".pdf,image/*" />
                <input type="file" ref={docFileInputRef} className="hidden" onChange={onDocFileChange} accept=".pdf,image/*" />
            </div>

            {/* Service Links Section */}
            {services.length > 0 && (
                <div className="p-6 bg-surface-subtle rounded-xl border border-border space-y-4">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-text-subtle tracking-widest">
                        <Sparkles size={16} />
                        {isAr ? 'الخدمات المرتبطة بالمعدة' : 'Linked Service Types'}
                    </h4>
                    <p className="text-[10px] text-text-subtle">
                        {isAr ? 'اختر الخدمات التي تعمل عليها هذه المعدة — سيتم فلترة المعدات تلقائياً عند إنشاء الرحلات' : 'Select services this unit operates on — assets will auto-filter in trip creation'}
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
                    {/* Show child services if parent is selected */}
                    {services.filter(s => s.parent_id && linkedServiceIds.includes(s.parent_id)).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 pl-4 border-l-2 border-emerald-500/30">
                            {services.filter(s => s.parent_id && linkedServiceIds.includes(s.parent_id)).map(child => {
                                const isLinked = linkedServiceIds.includes(child.service_id);
                                return (
                                    <button
                                        key={child.service_id}
                                        type="button"
                                        onClick={() => {
                                            if (!onServiceLinksChange) return;
                                            const next = isLinked
                                                ? linkedServiceIds.filter(id => id !== child.service_id)
                                                : [...linkedServiceIds, child.service_id];
                                            onServiceLinksChange(next);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all ${
                                            isLinked
                                                ? 'bg-emerald-400 text-white border-emerald-500'
                                                : 'bg-surface text-text-subtle border-border hover:border-emerald-300'
                                        }`}
                                    >
                                        {isLinked && <CheckCircle2 size={10} className="inline mr-1 -mt-0.5" />}
                                        {child.service_name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <Button
                variant="primary"
                onClick={validateAndSave}
                isLoading={isSubmitting}
                className="w-full py-5 text-sm tracking-widest shadow-xl"
                icon={CheckCircle2}
            >
                {isAr ? 'تحديث مصفوفة الأسطول' : 'Commit Fleet Record'}
            </Button>
        </div>
    );
};

export default VehicleWizard;
