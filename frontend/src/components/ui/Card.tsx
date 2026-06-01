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
    const baseClasses = `relative rounded-2xl ${compact ? 'p-4' : 'p-6'} transition-all duration-200 min-w-0`;

    const variantClasses = {
        default: 'bg-surface shadow-sm border border-border',
        gradient: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 shadow-md',
        bordered: 'bg-surface border-2 border-border',
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
