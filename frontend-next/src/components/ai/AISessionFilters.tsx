/**
 * =====================================================
 * [AR] فلاتر جلسات الذكاء الاصطناعي
 * [EN] AI Sessions Filters
 * =====================================================
 */

import React from 'react';
import { Search, Filter } from 'lucide-react';

interface AISessionFiltersProps {
    isAr: boolean;
    searchUser: string;
    setSearchUser: (v: string) => void;
    filterStatus: string;
    setFilterStatus: (v: string) => void;
    filterAction: string;
    setFilterAction: (v: string) => void;
    filterLanguage: string;
    setFilterLanguage: (v: string) => void;
    filterFrom: string;
    setFilterFrom: (v: string) => void;
    filterTo: string;
    setFilterTo: (v: string) => void;
    setPage: (v: number) => void;
    resetFilters: () => void;
}

const AISessionFilters: React.FC<AISessionFiltersProps> = ({
    isAr,
    searchUser,
    setSearchUser,
    filterStatus,
    setFilterStatus,
    filterAction,
    setFilterAction,
    filterLanguage,
    setFilterLanguage,
    filterFrom,
    setFilterFrom,
    filterTo,
    setFilterTo,
    setPage,
    resetFilters,
}) => {
    return (
        <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <Filter size={16} className="text-text-subtle" />
                <span className="text-sm font-semibold text-text-main">{isAr ? 'الفلاتر' : 'Filters'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Search User */}
                <div className="relative">
                    <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-text-subtle" />
                    <input
                        type="text"
                        placeholder={isAr ? 'بحث بالاسم...' : 'Search user...'}
                        value={searchUser}
                        onChange={e => setSearchUser(e.target.value)}
                        className="w-full ps-9 pe-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>

                {/* Status */}
                <select
                    value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                    className="px-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                    <option value="">{isAr ? 'كل الحالات' : 'All Status'}</option>
                    <option value="completed">{isAr ? 'مكتمل' : 'Completed'}</option>
                    <option value="cancelled">{isAr ? 'ملغي' : 'Cancelled'}</option>
                    <option value="failed">{isAr ? 'فشل' : 'Failed'}</option>
                    <option value="report_only">{isAr ? 'تقرير فقط' : 'Report Only'}</option>
                </select>

                {/* Action Type */}
                <select
                    value={filterAction}
                    onChange={e => { setFilterAction(e.target.value); setPage(1); }}
                    className="px-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                    <option value="">{isAr ? 'كل الإجراءات' : 'All Actions'}</option>
                    <option value="register_trip">{isAr ? 'تسجيل رحلة' : 'Register Trip'}</option>
                    <option value="report">{isAr ? 'تقرير' : 'Report'}</option>
                    <option value="edit">{isAr ? 'تعديل' : 'Edit'}</option>
                    <option value="general">{isAr ? 'عام' : 'General'}</option>
                </select>

                {/* Language */}
                <select
                    value={filterLanguage}
                    onChange={e => { setFilterLanguage(e.target.value); setPage(1); }}
                    className="px-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                    <option value="">{isAr ? 'كل اللغات' : 'All Languages'}</option>
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                </select>

                {/* Date From */}
                <input
                    type="date"
                    value={filterFrom}
                    onChange={e => { setFilterFrom(e.target.value); setPage(1); }}
                    className="px-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                    title={isAr ? 'من تاريخ' : 'From date'}
                />

                {/* Date To */}
                <input
                    type="date"
                    value={filterTo}
                    onChange={e => { setFilterTo(e.target.value); setPage(1); }}
                    className="px-3 py-2 rounded-lg bg-surface-subtle border border-border text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                    title={isAr ? 'إلى تاريخ' : 'To date'}
                />
            </div>

            {(filterStatus || filterAction || filterLanguage || filterFrom || filterTo || searchUser) && (
                <button onClick={resetFilters} className="mt-3 text-xs text-primary hover:underline font-medium">
                    {isAr ? '🔄 إعادة تعيين الفلاتر' : '🔄 Reset Filters'}
                </button>
            )}
        </div>
    );
};

export default AISessionFilters;
