/**
 * =====================================================
 * [AR] مكون حقل النص الطويل
 * [EN] Textarea Component
 * =====================================================
 */

import React from 'react';
import { motion } from 'framer-motion';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    helperText?: string;
    icon?: React.ReactNode | React.ComponentType<any>;
    className?: string;
    containerClassName?: string;
    showCharCount?: boolean;
}

const Textarea: React.FC<TextareaProps> = ({
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
    rows = 4,
    maxLength,
    showCharCount = false,
    ...props
}) => {
    const textareaId = props.id || React.useId();

    return (
        <div className={`space-y-1.5 ${containerClassName}`}>
            {label && (
                <label htmlFor={textareaId} className="block text-xs font-semibold text-text-subtle ms-0.5">
                    {label}
                    {required && <span className="text-danger ms-1">*</span>}
                </label>
            )}

            <div className="relative group">
                {icon && (
                    <div className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3 text-text-subtle group-focus-within:text-primary-500 transition-colors duration-150 flex items-center justify-center">
                        {React.isValidElement(icon) ? icon : React.createElement(icon as any, { size: 16, strokeWidth: 2 })}
                    </div>
                )}

                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    rows={rows}
                    maxLength={maxLength}
                    className={`
                        w-full px-3.5 py-2.5 rounded-xl border transition-all duration-200 font-medium text-sm leading-relaxed ${className}
                        ${icon ? 'ps-10' : ''}
                        ${error
                            ? 'border-rose-400/60 bg-rose-50/50 dark:bg-rose-900/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                            : 'border-border bg-surface focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed bg-surface-subtle' : 'hover:border-border'}
                        text-text-main
                        placeholder:text-text-subtle placeholder:font-normal
                        focus:outline-none resize-none
                    `}
                    id={textareaId}
                    {...props}
                />
            </div>

            <div className="flex items-center justify-between">
                <div>
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
                {showCharCount && maxLength && (
                    <span className={`text-xs ms-auto ${value.length >= maxLength ? 'text-rose-500' : 'text-text-subtle'}`}>
                        {value.length}/{maxLength}
                    </span>
                )}
            </div>
        </div>
    );
};

export default Textarea;
