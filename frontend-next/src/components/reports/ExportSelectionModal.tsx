import React, { useState } from 'react';
import { FileText, Check, X, Printer, Info, Image } from 'lucide-react';
import { Button } from '@/components';

interface ExportSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (options: ExportOptions) => void;
    isAr: boolean;
    isLoading?: boolean;
    disabledKeys?: string[];
}

export interface ExportOptions {
    includeSummary: boolean;
    includeManifest: boolean;
    includeDeliveryNote: boolean;
    includeRecycleReceipt: boolean;
    includeProofImages: boolean;
    accentColor?: string;
}

const COLOR_PRESETS = [
    { name: 'Emerald', color: '#10b981' },
    { name: 'Slate', color: '#475569' },
    { name: 'Navy', color: '#1e3a8a' },
    { name: 'Crimson', color: '#be123c' },
    { name: 'Indigo', color: '#6366f1' },
];

const ExportSelectionModal: React.FC<ExportSelectionModalProps> = ({
    isOpen,
    onClose,
    onExport,
    isAr,
    isLoading = false,
    disabledKeys = []
}) => {
    const [options, setOptions] = useState<ExportOptions>({
        includeSummary: true,
        includeManifest: true,
        includeDeliveryNote: true,
        includeRecycleReceipt: true,
        includeProofImages: false,
        accentColor: '#10b981'
    });

    if (!isOpen) return null;

    const toggleOption = (key: keyof ExportOptions) => {
        if (key === 'accentColor') return;
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const setColor = (color: string) => {
        setOptions(prev => ({ ...prev, accentColor: color }));
    };

    const toggleAll = () => {
        const { accentColor: _, ...rest } = options;
        const allSelected = Object.values(rest).every(v => v);
        setOptions(prev => ({
            ...prev,
            includeSummary: !allSelected,
            includeManifest: !allSelected,
            includeDeliveryNote: !allSelected,
            includeRecycleReceipt: !allSelected,
            includeProofImages: !allSelected
        }));
    };

    const optionItems = [
        { key: 'includeSummary', label: isAr ? 'ملخص الرحلة (بيانات)' : 'Trip Summary (Data)', icon: Info },
        { key: 'includeManifest', label: isAr ? 'مانفيست النفايات (صورة)' : 'Waste Manifest (Image)', icon: FileText },
        { key: 'includeDeliveryNote', label: isAr ? 'الدليفري نوت (صورة)' : 'Delivery Note (Image)', icon: Printer },
        { key: 'includeRecycleReceipt', label: isAr ? 'إيصال التدوير (صورة)' : 'Recycle Receipt (Image)', icon: Check },
        { key: 'includeProofImages', label: isAr ? 'صور إثبات الرحلة (صور)' : 'Proof Images (Pictures)', icon: Image },
    ];

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {isAr ? 'تخصيص التصدير' : 'Export Selection'}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                {isAr ? 'اختر المستندات المطلوبة والمظهر' : 'Select documents and styling'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]">
                    <div className="space-y-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                            {isAr ? 'المحتوى' : 'Content Selection'}
                        </div>
                        <button
                            onClick={toggleAll}
                            className="w-full py-2 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                            {Object.values(options).filter(v => typeof v === 'boolean').every(v => v)
                                ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All')
                                : (isAr ? 'تحديد الكل' : 'Select All')}
                        </button>

                        <div className="space-y-2">
                            {optionItems.map(({ key, label, icon: Icon }) => {
                                const isDisabled = disabledKeys.includes(key);
                                const isActive = !isDisabled && options[key as keyof ExportOptions];
                                return (
                                <button
                                    key={key}
                                    onClick={() => !isDisabled && toggleOption(key as keyof ExportOptions)}
                                    disabled={isDisabled}
                                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${isDisabled
                                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                        : isActive
                                        ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/50'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-2 text-left">
                                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            <Icon size={14} />
                                        </div>
                                        <span className={`text-xs font-bold leading-tight ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {label}
                                            {isDisabled && <span className="block text-[9px] text-rose-400 font-bold mt-0.5">{isAr ? 'يتطلب اعتماد الرحلة' : 'Requires trip approval'}</span>}
                                        </span>
                                    </div>
                                    <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 dark:border-slate-800'}`}>
                                        {isActive && <Check size={12} />}
                                    </div>
                                </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                            {isAr ? 'مظهر التقرير (وورد)' : 'Report Appearance (Word Style)'}
                        </div>
                        
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3">
                                {isAr ? 'لون السمة' : 'Accent Color'}
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {COLOR_PRESETS.map((p) => (
                                    <button
                                        key={p.color}
                                        onClick={() => setColor(p.color)}
                                        className={`w-full aspect-square rounded-full border-4 transition-all ${options.accentColor === p.color ? 'border-white dark:border-slate-900 ring-2 ring-rose-500' : 'border-transparent hover:scale-110'}`}
                                        style={{ backgroundColor: p.color }}
                                        title={p.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                                {isAr ? 'معاينة التخطيط' : 'Layout Preview'}
                            </h4>
                            <div className="space-y-1.5 opacity-60">
                                <div className="h-2 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" style={{ backgroundColor: options.accentColor + '40' }} />
                                <div className="h-6 w-full border-t border-slate-200 dark:border-slate-700 pt-1" style={{ borderTopColor: options.accentColor }} />
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded border-t-2" style={{ borderTopColor: options.accentColor }} />
                                    <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded border-t-2" style={{ borderTopColor: options.accentColor }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1 rounded-2xl py-6"
                    >
                        {isAr ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => onExport(options)}
                        isLoading={isLoading}
                        className="flex-1 bg-rose-500 hover:bg-rose-600 text-white border-transparent rounded-2xl py-6 shadow-lg shadow-rose-500/20"
                        icon={FileText}
                    >
                        {isAr ? 'تصدير PDF' : 'Export PDF'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExportSelectionModal;
