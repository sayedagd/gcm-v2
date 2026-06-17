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
    isLoading?: boolean | undefined;
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
    const baseClasses = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border font-semibold tracking-[-0.01em] transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:active:scale-100 focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

    const variantClasses = {
        primary: 'btn-main',
        secondary: 'btn-secondary',
        danger: 'btn-danger',
        success: 'btn-success',
        ghost: 'btn-ghost'
    };

    const sizeClasses = {
        sm: 'px-3.5 py-2 text-xs',
        md: 'px-4.5 py-2.5 text-sm',
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
