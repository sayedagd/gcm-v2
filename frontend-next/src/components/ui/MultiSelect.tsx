import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    label?: string;
    error?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
    options, value, onChange, placeholder, label, error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (val: string) => {
        const newValue = value.includes(val)
            ? value.filter(v => v !== val)
            : [...value, val];
        onChange(newValue);
    };

    return (
        <div className="space-y-1.5" ref={containerRef}>
            {label && (
                <label className="block text-xs font-semibold text-text-subtle ms-0.5 uppercase tracking-widest">
                    {label}
                </label>
            )}

            <div className="relative">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        min-h-[46px] w-full px-3 py-2 rounded-xl border transition-all duration-200 flex flex-wrap gap-2 cursor-pointer
                        ${error ? 'border-danger/60 bg-danger/5' : 'border-border bg-surface hover:border-border-hover focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10'}
                    `}
                >
                    {value.length === 0 && (
                        <span className="text-text-subtle text-sm self-center ps-1">{placeholder}</span>
                    )}
                    {value.map(val => {
                        const opt = options.find(o => o.value === val);
                        return (
                            <div key={val} className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                                <span className="text-[10px] font-bold uppercase tracking-wider">{opt?.label || val}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleOption(val); }}
                                    className="hover:text-primary-dark transition-colors"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            </div>
                        );
                    })}
                    <div className="flex-1" />
                    <div className="self-center pe-1 text-text-subtle transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                        <ChevronDown size={14} />
                    </div>
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            className="absolute z-50 top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl shadow-primary/5 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                        >
                            <div className="p-1.5 gap-1 flex flex-col">
                                {options.map(opt => {
                                    const isSelected = value.includes(opt.value);
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={(e) => { e.stopPropagation(); toggleOption(opt.value); }}
                                            className={`
                                                flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                                                ${isSelected ? 'bg-primary/10 text-primary' : 'text-text-main hover:bg-surface-subtle'}
                                            `}
                                        >
                                            {opt.label}
                                            {isSelected && <Check size={14} strokeWidth={3} />}
                                        </button>
                                    );
                                })}
                                {options.length === 0 && (
                                    <div className="p-4 text-center text-xs text-text-subtle italic">No available options</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {error && <p className="text-xs text-danger font-medium ms-0.5">{error}</p>}
        </div>
    );
};

export default MultiSelect;
