import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pipette, Check, X, Palette } from 'lucide-react';

interface ColorPickerProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    presets?: { name: string; value: string; label?: string }[];
    className?: string;
}

const defaultPresets = [
    { name: 'Slate 950', value: 'bg-slate-950' },
    { name: 'Slate 900', value: 'bg-slate-900' },
    { name: 'Slate 800', value: 'bg-slate-800' },
    { name: 'Emerald 500', value: 'bg-emerald-500' },
    { name: 'Emerald 600', value: 'bg-emerald-600' },
    { name: 'Blue 500', value: 'bg-blue-500' },
    { name: 'Blue 600', value: 'bg-blue-600' },
    { name: 'Violet 500', value: 'bg-violet-500' },
    { name: 'Rose 500', value: 'bg-rose-500' },
    { name: 'Amber 500', value: 'bg-amber-500' },
    { name: 'White', value: 'bg-white' },
    { name: 'Text White', value: 'text-white' },
    { name: 'Text Slate 400', value: 'text-slate-400' },
];

const ColorPicker: React.FC<ColorPickerProps> = ({
    label,
    value,
    onChange,
    presets = defaultPresets,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [customHex, setCustomHex] = useState(value.startsWith('#') ? value : '');
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getColorStyle = (val: string) => {
        if (val.startsWith('#')) return { backgroundColor: val };
        // For text classes, we need a mapping or just show gray
        if (val.startsWith('text-')) return { backgroundColor: '#cbd5e1' }; // slalt-300 fallback for text
        return {}; // Tailwind will handle via class injection if we were using it, but for preview we need hex mappings
    };

    // Mapping for common tailwind classes to hex for preview
    const classToHex: Record<string, string> = {
        'bg-slate-950': '#020617',
        'bg-slate-900': '#0f172a',
        'bg-slate-800': '#1e293b',
        'bg-emerald-500': '#10b981',
        'bg-emerald-600': '#059669',
        'bg-blue-500': '#3b82f6',
        'bg-blue-600': '#2563eb',
        'bg-violet-500': '#8b5cf6',
        'bg-rose-500': '#f43f5e',
        'bg-amber-500': '#f59e0b',
        'bg-white': '#ffffff',
        'text-white': '#ffffff',
        'text-slate-400': '#94a3b8'
    };

    const previewColor = value.startsWith('#') ? value : classToHex[value] || '#000000';

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    {label}
                </label>
            )}

            <div className="relative" ref={popoverRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl group hover:border-primary-500/50 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-xl border border-white/10 shadow-inner"
                            style={{ backgroundColor: previewColor }}
                        />
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                            {value}
                        </span>
                    </div>
                    <Pipette size={16} className="text-slate-400 group-hover:text-primary-500 transition-colors" />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute z-50 mt-2 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl w-72 space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <Palette size={12} /> Color Swatch
                                </h4>
                                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-5 gap-3">
                                {presets.map((preset) => (
                                    <button
                                        key={preset.value}
                                        onClick={() => {
                                            onChange(preset.value);
                                            setCustomHex('');
                                        }}
                                        className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center ${value === preset.value ? 'ring-2 ring-primary border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                        style={{ backgroundColor: classToHex[preset.value] || '#000' }}
                                        title={preset.name}
                                    >
                                        {value === preset.value && <Check size={14} className={preset.value === 'bg-white' ? 'text-slate-900' : 'text-white'} />}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                <label className="text-[9px] font-bold uppercase text-slate-400">Custom Hex Code</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">#</div>
                                        <input
                                            type="text"
                                            value={customHex.replace('#', '')}
                                            onChange={(e) => {
                                                const val = '#' + e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                                                setCustomHex(val);
                                                if (val.length === 7 || val.length === 4) {
                                                    onChange(val);
                                                }
                                            }}
                                            placeholder="FFFFFF"
                                            className="w-full pl-6 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div
                                        className="w-9 h-9 rounded-xl border shadow-sm"
                                        style={{ backgroundColor: customHex.length >= 4 ? customHex : '#fff' }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ColorPicker;
