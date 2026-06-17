/**
 * =====================================================
 * [AR] مكون الكارد القابل لإعادة الاستخدام
 * [EN] Reusable Card Component
 * =====================================================
 */

import React from 'react';

interface CardProps {
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode | React.ElementType;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    variant?: 'default' | 'gradient' | 'bordered' | 'glass';
    compact?: boolean;
}

const Card: React.FC<CardProps> = ({
    title,
    subtitle,
    icon,
    children,
    className = '',
    onClick,
    variant = 'default',
    compact = false
}) => {
    const baseClasses = `premium-card relative min-w-0 rounded-[var(--radius-lg)] ${compact ? 'p-4' : 'p-6'} transition-all duration-200`;

    const variantClasses = {
        default: 'surface-panel-strong border border-border/80',
        gradient: 'border border-primary/15 bg-gradient-to-br from-primary/10 via-surface to-primary/5 shadow-[0_22px_48px_-32px_color-mix(in_srgb,var(--primary-color)_45%,transparent)]',
        bordered: 'surface-panel border border-border/90',
        glass: 'glass border border-white/20 dark:border-white/10 shadow-sm'
    };

    const clickableClasses = onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5' : '';

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${clickableClasses} ${className}`}
            onClick={onClick}
        >
            {(title || icon) && (
                <div className="flex items-center gap-3 mb-4">
                    {icon && (
                        <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                            {React.isValidElement(icon) ? icon : React.createElement(icon as React.ElementType, { size: 20 })}
                        </div>
                    )}
                    <div className="min-w-0">
                        {title && <h3 className="text-base font-bold text-text-main truncate">{title}</h3>}
                        {subtitle && <p className="text-sm text-text-subtle truncate">{subtitle}</p>}
                    </div>
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
