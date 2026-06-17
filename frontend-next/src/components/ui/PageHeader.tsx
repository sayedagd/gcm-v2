/**
 * =====================================================
 * [AR] مكون رأس الصفحة الموحد
 * [EN] Unified Page Header Component
 * =====================================================
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Plus } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import { fadeInUp } from '@/theme/motion';

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
        <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="page-section page-section--subtle mb-2 space-y-5"
        >
            {/* Title Section */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-main tracking-tight md:text-3xl">
                        {title}
                        {resultCount !== undefined && (
                            <span className="ms-2 text-sm font-medium text-text-subtle">
                                ({resultCount})
                            </span>
                        )}
                    </h1>
                    {subtitle && (
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-text-subtle md:text-[0.95rem]">
                            {subtitle}
                        </p>
                    )}
                </div>

                {actionLabel && onActionClick && (
                    <Button
                        onClick={onActionClick}
                        icon={Plus}
                        size="md"
                        className="w-full md:w-auto"
                    >
                        {actionLabel}
                    </Button>
                )}
            </div>

            {/* Filters & Search Section */}
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                <div className="flex-1 xl:max-w-xl">
                    <Input
                        value={searchTerm}
                        onChange={onSearchChange}
                        placeholder={searchPlaceholder || (isAr ? 'البحث...' : 'Search...')}
                        icon={Search}
                    />
                </div>

                {children && (
                    <div className="flex flex-wrap items-end gap-2 xl:justify-end">
                        {children}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default PageHeader;
