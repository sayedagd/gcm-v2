/**
 * =====================================================
 * [AR] مكون حقل الإدخال
 * [EN] Input Field Component
 * =====================================================
 */

import React from 'react';
import { motion } from 'framer-motion';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    helperText?: string;
    icon?: React.ReactNode | React.ComponentType<any>;
    suffix?: React.ReactNode;
    className?: string;
    containerClassName?: string;
}

const Input: React.FC<InputProps> = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    required = false,
    disabled = false,
    error,
    helperText,
    icon,
    suffix,
    className = '',
    containerClassName = '',
    ...props
}) => {
    const inputId = props.id || React.useId();

    return (
        <div className={`space-y-1.5 ${containerClassName}`}>
            {label && (
                <label htmlFor={inputId} className="block text-xs font-semibold text-text-subtle ms-0.5">
                    {label}
                    {required && <span className="text-danger ms-1">*</span>}
                </label>
            )}

            <div className="relative group">
                {icon && (
                    <div className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-primary-500 transition-colors duration-150 flex items-center justify-center pointer-events-none">
                        {React.isValidElement(icon)
                            ? React.cloneElement(icon as React.ReactElement<any>, { size: 16, strokeWidth: 2 })
                            : React.createElement(icon as any, { size: 16, strokeWidth: 2 })}
                    </div>
                )}

                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className={`
                        w-full px-3.5 py-2.5 rounded-xl border transition-all duration-200 font-medium text-sm ${className}
                        ${icon ? 'ps-10' : ''}
                        ${suffix ? 'pe-10' : ''}
                        ${error
                            ? 'border-danger/60 bg-danger/5 dark:bg-danger/10 focus:border-danger focus:ring-2 focus:ring-danger/15'
                            : 'border-border bg-surface focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed bg-surface-subtle' : 'hover:border-border'}
                        text-text-main
                        placeholder:text-text-subtle placeholder:font-normal
                        focus:outline-none
                    `}
                    id={inputId}
                    {...props}
                />

                {suffix && (
                    <div className="absolute right-3.5 rtl:right-auto rtl:left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-text-subtle transition-colors">
                        {suffix}
                    </div>
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
                <p className="text-xs text-text-subtle opacity-70 ms-0.5">
                    {helperText}
                </p>
            )}
        </div>
    );
};

export default Input;
