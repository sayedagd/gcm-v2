import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    label: string;
    value: string;
}

interface SearchableSelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    helperText?: string;
    icon?: React.ReactNode | React.ComponentType<any>;
    className?: string;
    containerClassName?: string;
    placeholder?: string;
    options: Option[];
    required?: boolean;
    disabled?: boolean;
    id?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    label,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
    helperText,
    icon,
    className = '',
    containerClassName = '',
    options,
    id
}) => {
    const selectId = id || useId();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState<{ top: string | number; bottom: string | number; left: number; width: number }>({ top: 'auto', bottom: 'auto', left: 0, width: 0 });

    const selectedOption = options.find(opt => opt.value === value);

    const updateCoords = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const menuHeight = 220; // Expected max height for ~5 items + search bar

            if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                // Open upwards
                setCoords({
                    top: 'auto',
                    bottom: window.innerHeight - rect.top + 4,
                    left: rect.left,
                    width: rect.width
                });
            } else {
                // Open downwards
                setCoords({
                    top: rect.bottom + 4,
                    bottom: 'auto',
                    left: rect.left,
                    width: rect.width
                });
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                // If the click is inside the portal menu, ignore it
                if ((event.target as Element).closest('.searchable-select-menu')) return;
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`space-y-1.5 ${containerClassName}`}>
            {label && (
                <label htmlFor={selectId} className="block text-xs font-semibold text-text-subtle ms-0.5">
                    {label}
                    {required && <span className="text-danger ms-1">*</span>}
                </label>
            )}

            <div className="relative group">
                {icon && (
                    <div className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-primary-500 transition-colors duration-150 flex items-center justify-center pointer-events-none z-10">
                        {React.isValidElement(icon)
                            ? React.cloneElement(icon as React.ReactElement<any>, { size: 16, strokeWidth: 2 })
                            : React.createElement(icon as any, { size: 16, strokeWidth: 2 })}
                    </div>
                )}

                <button
                    ref={buttonRef}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        if (!disabled) {
                            setIsOpen(!isOpen);
                            if (!isOpen) setSearchTerm('');
                        }
                    }}
                    className={`
                        w-full px-3.5 py-2.5 rounded-xl border transition-all duration-200 font-medium text-sm text-start flex items-center justify-between ${className}
                        ${icon ? 'ps-10 rtl:ps-3.5 rtl:pe-10' : ''}
                        pe-10 rtl:pe-3.5 rtl:ps-10
                        ${error
                            ? 'border-danger/60 bg-danger/5 dark:bg-danger/10 focus:border-danger focus:ring-2 focus:ring-danger/15'
                            : isOpen ? 'border-primary-500 ring-2 ring-primary-500/15 bg-surface' : 'border-border bg-surface hover:border-primary-300'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed bg-surface-subtle' : ''}
                        text-text-main
                        focus:outline-none cursor-pointer
                    `}
                    id={selectId}
                >
                    <span className={`truncate ${!selectedOption ? 'text-text-subtle' : ''}`}>
                        {selectedOption ? selectedOption.label : (placeholder || 'Select...')}
                    </span>
                    <div className={`absolute end-3.5 rtl:end-auto rtl:start-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-subtle transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary-500' : 'group-hover:text-primary-500'}`}>
                        <ChevronDown size={16} strokeWidth={2} />
                    </div>
                </button>

                {isOpen && createPortal(
                    <div 
                        className="searchable-select-menu fixed z-[9999] bg-surface border border-border rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
                        style={{
                            top: coords.top !== 'auto' ? coords.top : 'auto',
                            bottom: coords.bottom !== 'auto' ? coords.bottom : 'auto',
                            left: coords.left,
                            width: coords.width,
                            maxHeight: '220px'
                        }}
                    >
                        <div className="p-2 border-b border-border bg-surface-subtle shrink-0">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-text-subtle" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-sm bg-surface border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text-main"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-1 flex-1">
                            {filteredOptions.length === 0 ? (
                                <div className="p-3 text-center text-sm text-text-subtle">
                                    No results found
                                </div>
                            ) : (
                                filteredOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-start px-3 py-2 text-sm rounded-lg transition-colors break-words ${
                                            value === opt.value 
                                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-bold' 
                                                : 'hover:bg-surface-subtle text-text-main'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-rose-500 font-medium ms-0.5"
                >
                    {error}
                </motion.p>
            )}

            {helperText && !error && (
                <p className="text-xs text-text-subtle ms-0.5">
                    {helperText}
                </p>
            )}
        </div>
    );
};

export default SearchableSelect;
