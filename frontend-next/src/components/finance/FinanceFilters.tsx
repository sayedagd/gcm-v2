import React from 'react';
import { Search, Calendar } from 'lucide-react';
import { Input } from '@/components';
import { Service } from '@/types';

interface FinanceFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    dateRange: { start: string; end: string };
    setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
    selectedStatus: string;
    setSelectedStatus: (status: string) => void;
    selectedService: string;
    setSelectedService: (service: string) => void;
    services: Service[];
    isAr: boolean;
}

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    selectedStatus,
    setSelectedStatus,
    selectedService,
    setSelectedService,
    services,
    isAr
}) => {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            <div className="xl:col-span-2">
                <Input
                    icon={Search}
                    placeholder={isAr ? 'بحث بالاسم او السجل...' : "Search company, project, CR..."}
                    value={searchTerm}
                    onChange={val => setSearchTerm(val)}
                    className="rounded-xl py-4 text-lg shadow-xl shadow-border/50 dark:shadow-none"
                />
            </div>
            <div className="bg-surface p-2 px-6 rounded-xl border border-border shadow-sm flex items-center gap-3">
                <Calendar className="text-text-subtle" size={20} />
                <div className="flex items-center gap-2 flex-1">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="bg-transparent border-none outline-none font-bold text-xs w-full focus:text-purple-600 dark:text-text-main" />
                    <span className="text-text-subtle opacity-50">→</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="bg-transparent border-none outline-none font-bold text-xs w-full focus:text-purple-600 dark:text-text-main" />
                </div>
            </div>
            <div className="flex gap-2">
                <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="bg-surface border border-border text-text-main font-bold rounded-xl px-4 py-2 flex-1 outline-none text-xs appearance-none cursor-pointer hover:border-purple-500">
                    <option value="ALL">{isAr ? 'كافة الحالات' : 'All Status'}</option>
                    <option value="COMPLETED">{isAr ? 'مكتمل' : 'Completed'}</option>
                    <option value="IN_PROGRESS">{isAr ? 'جار تنفيذها' : 'In Progress'}</option>
                    <option value="PENDING">{isAr ? 'معلق' : 'Pending'}</option>
                </select>
                <select value={selectedService} onChange={e => setSelectedService(e.target.value)} className="bg-surface border border-border text-text-main font-bold rounded-xl px-4 py-2 flex-1 outline-none text-xs appearance-none cursor-pointer hover:border-purple-500">
                    <option value="ALL">{isAr ? 'كل الخدمات' : 'All Services'}</option>
                    {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
                </select>
            </div>
        </div>
    );
};

export default FinanceFilters;
