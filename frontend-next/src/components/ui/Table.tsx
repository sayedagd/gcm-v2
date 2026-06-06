/**
 * =====================================================
 * [AR] مكون الجدول القابل لإعادة الاستخدام
 * [EN] Reusable Table Component
 * =====================================================
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

interface Column<T> {
    key: keyof T | string;
    label: string;
    render?: (value: any, row: T) => React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    onRowClick?: (row: T) => void;
    isLoading?: boolean;
    emptyMessage?: React.ReactNode;
    pagination?: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void;
    };
    isAr?: boolean;
}

function Table<T extends Record<string, any>>({
    columns,
    data,
    onRowClick,
    isLoading = false,
    emptyMessage = 'No data available',
    pagination,
    isAr = false
}: TableProps<T>) {
    if (isLoading) {
        return (
            <div className="p-8 space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-surface-subtle rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-text-subtle opacity-60">
                <Inbox size={48} strokeWidth={1} className="mb-3 opacity-50" />
                <div className="text-sm font-medium">{emptyMessage}</div>
            </div>
        );
    }

    const getPageNumbers = () => {
        if (!pagination) return [];
        const { currentPage, totalPages } = pagination;
        const pages: (number | '...')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-border">
                        {columns.map((column, idx) => (
                            <th
                                key={idx}
                                className={`px-4 py-3 ${column.align ? `text-${column.align}` : (isAr ? 'text-right' : 'text-left')} text-xs font-semibold uppercase text-text-subtle tracking-wider whitespace-nowrap ${column.className || ''}`}
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIdx) => (
                        <tr
                            key={rowIdx}
                            onClick={() => onRowClick?.(row)}
                            className={`
                                border-b border-border/40 last:border-b-0
                                ${onRowClick ? 'cursor-pointer hover:bg-primary-50/40 dark:hover:bg-primary-900/10' : ''}
                                ${rowIdx % 2 === 1 ? 'bg-surface-subtle/50' : ''}
                                transition-colors duration-150
                            `}
                        >
                            {columns.map((column, colIdx) => {
                                const value = column.key.toString().includes('.')
                                    ? column.key.toString().split('.').reduce((obj, key) => obj?.[key], row)
                                    : row[column.key as keyof T];

                                return (
                                    <td key={colIdx} className={`px-4 py-3.5 text-sm ${column.align ? `text-${column.align}` : (isAr ? 'text-right' : 'text-left')} ${column.className || ''}`}>
                                        {column.render ? column.render(value, row) : value}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {pagination && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-xs text-text-subtle">
                        {isAr ? `صفحة ${pagination.currentPage} من ${pagination.totalPages}` : `Page ${pagination.currentPage} of ${pagination.totalPages}`}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 1}
                            className="btn-pagination"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {getPageNumbers().map((page, idx) => (
                            page === '...'
                                ? <span key={`dots-${idx}`} className="px-1 text-xs text-text-subtle opacity-50">…</span>
                                : (
                                    <button
                                        key={page}
                                        onClick={() => pagination.onPageChange(page as number)}
                                        className={`btn-pagination ${page === pagination.currentPage ? 'active' : ''}`}
                                    >
                                        {page}
                                    </button>
                                )
                        ))}

                        <button
                            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                            disabled={pagination.currentPage === pagination.totalPages}
                            className="btn-pagination"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Table;
