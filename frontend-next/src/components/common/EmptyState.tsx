/**
 * =====================================================
 * [AR] مكون حالة البيانات الفارغة
 * [EN] Empty State Component
 * =====================================================
 */

import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
    icon?: any;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-surface-subtle rounded-full flex items-center justify-center mb-4 border border-border">
                {icon ? (React.isValidElement(icon) ? icon : React.createElement(icon as React.ComponentType<any>, { size: 32, className: "text-text-subtle opacity-40" })) : <Inbox size={32} className="text-text-subtle opacity-40" />}
            </div>
            <h3 className="text-lg font-black text-text-main mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-text-subtle mb-6 max-w-md">
                    {description}
                </p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/30"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
