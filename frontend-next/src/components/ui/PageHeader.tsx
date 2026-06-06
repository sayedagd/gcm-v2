/**
 * =====================================================
 * [AR] مكون رأس الصفحة الموحد
 * [EN] Unified Page Header Component
 * =====================================================
 */

import React from 'react';
import { Search, Plus } from 'lucide-react';
import Button from './Button';
import Input from './Input';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    actionLabel?: string | undefined;
    onActionClick?: () => void;
    isAr?: boolean;
    children?: React.ReactNode;
    resultCount?: number;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    searchTerm,
    onSearchChange,
    searchPlaceholder,
    actionLabel,
    onActionClick,
    isAr = false,
    children,
    resultCount
}) => {
    return (
        <div className="mb-6 space-y-4">
            {/* Title Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main tracking-tight">
                        {title}
                        {resultCount !== undefined && (
                            <span className="text-sm font-medium text-text-subtle ms-2">
                                ({resultCount})
                            </span>
                        )}
                    </h1>
                    {subtitle && (
                        <p className="text-sm text-text-subtle mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>

                {actionLabel && onActionClick && (
                    <Button
                        onClick={onActionClick}
                        icon={Plus}
                        size="md"
                        className="btn-main"
                    >
                        {actionLabel}
                    </Button>
                )}
            </div>

            {/* Filters & Search Section */}
            <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1">
                    <Input
                        value={searchTerm}
                        onChange={onSearchChange}
                        placeholder={searchPlaceholder || (isAr ? 'البحث...' : 'Search...')}
                        icon={Search}
                    />
                </div>

                {children && (
                    <div className="flex flex-wrap gap-2 items-end">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PageHeader;
