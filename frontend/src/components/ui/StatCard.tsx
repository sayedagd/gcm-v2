/**
 * =====================================================
 * [AR] مكون كارد الإحصائيات (تفاعلي + أنيميشن)
 * [EN] Statistics Card Component (Interactive + Animated)
 * =====================================================
 */

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
    title: string;
    description?: string;
    value: string | number;
    icon: any;
    trend?: number;
    variant?: 'primary' | 'blue' | 'green' | 'indigo' | 'purple' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'slate';
    className?: string;
    onClick?: () => void;
    unit?: string;
    isAr?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    description,
    value,
    icon: Icon,
    trend,
    variant = 'primary',
    className = '',
    onClick,
    unit,
    isAr
}) => {
    const styles: Record<string, { iconBg: string; text: string }> = {
        primary: {
            iconBg: 'bg-primary/10 text-primary',
            text: 'text-primary',
        },
        blue: {
            iconBg: 'bg-primary/10 text-primary',
            text: 'text-primary',
        },
        green: {
            iconBg: 'bg-success-muted text-success',
            text: 'text-success',
        },
        indigo: {
            iconBg: 'bg-primary/10 text-primary',
            text: 'text-primary',
        },
        purple: {
            iconBg: 'bg-primary/10 text-primary',
            text: 'text-primary',
        },
        emerald: {
            iconBg: 'bg-success-muted text-success',
            text: 'text-success',
        },
        amber: {
            iconBg: 'bg-amber-muted text-amber',
            text: 'text-amber',
        },
        cyan: {
            iconBg: 'bg-primary/10 text-primary',
            text: 'text-primary',
        },
        rose: {
            iconBg: 'bg-danger-muted text-danger',
            text: 'text-danger',
        },
        slate: {
            iconBg: 'bg-surface-subtle text-text-subtle opacity-70',
            text: 'text-text-subtle',
        }
    };

    const currentStyle = styles[variant] || styles.primary;

    return (
        <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            className={`relative p-5 rounded-2xl border border-border bg-surface shadow-sm hover:shadow-md transition-shadow duration-200 group overflow-hidden ${className} ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`p-3 rounded-xl ${currentStyle.iconBg} flex items-center justify-center`}>
                    {React.isValidElement(Icon) ? Icon : <Icon size={20} strokeWidth={2} />}
                </div>

                {trend !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${trend >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                        {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <p className="text-2xl font-bold text-text-main tracking-tight mb-1">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                    {unit && <span className="text-sm font-medium text-text-subtle ms-1">{unit}</span>}
                </p>
                <h4 className="text-sm font-semibold text-text-main/80">
                    {title}
                </h4>
                {description && (
                    <p className="text-xs text-text-subtle mt-0.5 leading-relaxed">
                        {description}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

export default StatCard;
