/**
 * =====================================================
 * [AR] مكون القائمة المنسدلة
 * [EN] Select Dropdown Component
 * =====================================================
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    helperText?: string;
    icon?: React.ReactNode | React.ComponentType<any>;
    className?: string;
    containerClassName?: string;
    placeholder?: string;
    options: { label: string; value: string }[];
}

const Select: React.FC<SelectProps> = ({
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
    ...props
}) => {
    const selectId = props.id || React.useId();

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
                    <div className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-primary-500 transition-colors duration-150 flex items-center justify-center pointer-events-none">
                        {React.isValidElement(icon)
                            ? React.cloneElement(icon as React.ReactElement<any>, { size: 16, strokeWidth: 2 })
                            : React.createElement(icon as any, { size: 16, strokeWidth: 2 })}
                    </div>
                )}

                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    disabled={disabled}
                    data-invalid={error ? 'true' : undefined}
                    className={`
                        field-base w-full appearance-none px-3.5 py-3 font-medium text-sm ${className}
                        ${icon ? 'ps-10' : ''}
                        pe-10
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        text-text-main
                        focus:outline-none cursor-pointer
                    `}
                    id={selectId}
                    {...props}
                >
                    {placeholder && <option value="" disabled>{placeholder}</option>}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                <div className="absolute end-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-subtle group-focus-within:text-primary-500 transition-colors duration-150">
                    <ChevronDown size={16} strokeWidth={2} />
                </div>
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

export default Select;
