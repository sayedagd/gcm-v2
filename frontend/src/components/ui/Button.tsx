/**
 * =====================================================
 * [AR] مكون الزر القابل لإعادة الاستخدام
 * [EN] Reusable Button Component
 * =====================================================
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode | React.ElementType;
    iconPosition?: 'left' | 'right';
    isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    icon,
    iconPosition = 'left',
    disabled,
    isLoading = false,
    ...props
}) => {
    const baseClasses = 'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.97] disabled:active:scale-100 border cursor-pointer';

    const variantClasses = {
        primary: 'btn-main',
        secondary: 'bg-surface hover:bg-surface-subtle border-border text-text-main shadow-sm',
        danger: 'btn-danger',
        success: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 hover:border-emerald-600 text-white shadow-sm hover:shadow-md',
        ghost: 'bg-transparent border-transparent text-text-subtle hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10'
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    const isDisabled = disabled || isLoading;
    const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

    const IconElement = icon && !isLoading && (
        <span className="flex items-center justify-center">
            {React.isValidElement(icon) ? icon : React.createElement(icon as React.ElementType, { size: iconSize, strokeWidth: 2 })}
        </span>
    );

    const LoadingElement = isLoading && (
        <Loader2 size={iconSize} className="animate-spin" strokeWidth={2} />
    );

    return (
        <button
            disabled={isDisabled}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
            {...props}
        >
            {LoadingElement}
            {iconPosition === 'left' && IconElement}
            {children}
            {iconPosition === 'right' && IconElement}
        </button>
    );
};

export default Button;
