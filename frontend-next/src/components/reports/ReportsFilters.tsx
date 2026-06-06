import React, { useState } from 'react';
import { useStore } from '@/context';
import {
    Layout, RefreshCw, Download, FileWarning, Globe2,
    Building2, Briefcase, Box, Truck, HardHat, FileText, Bot
} from 'lucide-react';
import { Button, SmartDropdown } from '@/components';
import { Project, Service, Company, Vehicle, Driver, Trip } from '@/types';
import { generateBulkPdf, generateAIContext, copyAIPrompt } from '@/utils/exportHelpers';
import ExportSelectionModal, { ExportOptions } from './ExportSelectionModal';
import { toast } from '@/utils/toast';

interface ReportsFiltersProps {
    filteredCount: number;
    timeRange: 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';
    setTimeRange: (range: 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM') => void;
    customStart: string;
    setCustomStart: (date: string) => void;
    customEnd: string;
    setCustomEnd: (date: string) => void;

    visibleCompanies: Company[];
    availableProjects: Project[];
    availableServices: Service[];
    vehicles: Vehicle[];
    drivers: Driver[];
    trips: Trip[];

    selectedCompany: string | null;
    setSelectedCompany: (id: string | null) => void;
    selectedProject: string | null;
    setSelectedProject: (id: string | null) => void;
    selectedService: string | null;
    setSelectedService: (id: string | null) => void;
    selectedVehicleType: string | null;
    setSelectedVehicleType: (type: string | null) => void;
    selectedDriver: string | null;
    setSelectedDriver: (id: string | null) => void;

    missingDocsOnly: boolean;
    setMissingDocsOnly: (val: boolean) => void;

    onExport: () => void;
    onReset: () => void;
    isAr: boolean;
    isRestricted?: boolean;
}

const ReportsFilters: React.FC<ReportsFiltersProps> = ({
    filteredCount,
    timeRange, setTimeRange, customStart, setCustomStart, customEnd, setCustomEnd,
    visibleCompanies, availableProjects, availableServices, vehicles, drivers, trips,
    selectedCompany, setSelectedCompany, selectedProject, setSelectedProject, selectedService, setSelectedService,
    selectedVehicleType, setSelectedVehicleType, selectedDriver, setSelectedDriver,
    missingDocsOnly, setMissingDocsOnly,
    onExport, onReset, isAr, isRestricted
}) => {
    const { companies, suppliers, facilities, saasConfig } = useStore();
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handlePdfExportRequest = () => {
        setIsExportModalOpen(true);
    };

    const handleFinalPdfExport = async (options: ExportOptions) => {
        setIsGeneratingPdf(true);
        try {
            await generateBulkPdf(trips, availableProjects, drivers, vehicles, availableServices, companies, suppliers, facilities, isAr, options, saasConfig?.templateConfig);
            setIsExportModalOpen(false);
        } catch (error) {
            console.error("PDF Export Failed", error);
            toast.error(isAr ? 'فشل التصدير' : 'Export Failed');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleAIExport = () => {
        generateAIContext(trips, availableProjects, drivers, vehicles, availableServices, visibleCompanies);
    };

    const handleCopyPrompt = async () => {
        await copyAIPrompt(trips, isAr);
    };

    return (
        <div className="space-y-6">
            <div className="sticky top-4 z-50 bg-surface/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-black/5 border border-border flex flex-col xl:flex-row gap-8 justify-between items-center transition-all duration-300">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/40 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <Layout size={32} className="relative z-10" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                            {isAr ? 'مركز التقارير الشامل' : 'Reports Hub'}
                            <span className="text-[10px] bg-emerald-500 text-white px-3 py-1 rounded-full font-bold uppercase tracking-widest animate-pulse">{isAr ? 'مباشر' : 'LIVE'}</span>
                        </h1>
                        <p className="text-[10px] text-text-subtle font-bold uppercase tracking-[0.2em] mt-1">
                            {filteredCount} {isAr ? 'رحلة نشطة في النطاق المحدد' : 'Active trips in current view'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-surface-subtle p-1.5 rounded-2xl self-end border border-border">
                        {['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR', 'CUSTOM'].map(r => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r as any)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${timeRange === r ? 'bg-surface shadow-xl text-emerald-600 dark:text-emerald-400' : 'text-text-subtle hover:text-text-main'}`}
                            >
                                {isAr ? (
                                    r === 'TODAY' ? 'يومي' :
                                        r === 'WEEK' ? 'اسبوعي' :
                                            r === 'MONTH' ? 'شهري' :
                                                r === 'QUARTER' ? 'ربع سنوي' :
                                                    r === 'YEAR' ? 'سنوي' : 'مدة محدده'
                                ) : r === 'QUARTER' ? 'QUARTER' : r}
                            </button>
                        ))}
                        {timeRange === 'CUSTOM' && (
                            <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl ml-2 shadow-inner border border-border animate-in slide-in-from-right-2 duration-300">
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-[10px] font-bold text-text-main outline-none px-2" />
                                <span className="text-text-subtle">/</span>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-[10px] font-bold text-text-main outline-none px-2" />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 justify-end">
                        {visibleCompanies.length > 1 && (
                            <Button variant="secondary" onClick={onReset} className="bg-text-main text-surface border-none rounded-xl" icon={Globe2}>
                                {isAr ? 'كافة البيانات' : 'Global View'}
                            </Button>
                        )}

                        <SmartDropdown title={isAr ? '1. الشركة' : '1. Company'} icon={Building2} data={visibleCompanies.map(c => ({ id: c.company_id, name: c.company_name }))} selected={selectedCompany} onSelect={setSelectedCompany} isAr={isAr} colorClass="emerald" disabled={isRestricted || visibleCompanies.length <= 1} />
                        <SmartDropdown title={isAr ? '2. المشروع' : '2. Project'} icon={Briefcase} data={availableProjects.map(p => ({ id: p.project_id, name: p.project_name }))} selected={selectedProject} onSelect={setSelectedProject} isAr={isAr} colorClass="emerald" disabled={isRestricted || (!selectedCompany && visibleCompanies.length > 1)} />
                        <SmartDropdown title={isAr ? '3. الخدمة' : '3. Service'} icon={Box} data={availableServices.map(s => ({ id: s.service_id, name: s.service_name }))} selected={selectedService} onSelect={setSelectedService} isAr={isAr} colorClass="emerald" disabled={(!selectedCompany && visibleCompanies.length > 1)} />

                        <div className="w-px h-8 bg-border mx-1 shrink-0" />

                        <Button
                            onClick={handleCopyPrompt}
                            variant="secondary"
                            size="sm"
                            className="bg-indigo-100 text-indigo-600 border-none p-3 shadow-lg"
                            icon={Bot}
                        >
                            {isAr ? 'نسخ للأمر' : 'Prompt'}
                        </Button>

                        <Button
                            onClick={handleAIExport}
                            variant="primary"
                            size="sm"
                            className="bg-indigo-500 hover:bg-indigo-600 text-white border-none p-3 shadow-lg shadow-indigo-500/20"
                            icon={Bot}
                        >
                            AI
                        </Button>

                        <Button
                            onClick={handlePdfExportRequest}
                            variant="primary"
                            size="sm"
                            className="bg-rose-500 hover:bg-rose-600 text-white border-transparent p-3 shadow-lg shadow-rose-500/20"
                            icon={FileText}
                            isLoading={isGeneratingPdf}
                        >
                            {isAr ? 'PDF شامل' : 'Bulk PDF'}
                        </Button>

                        <Button onClick={onExport} variant="secondary" size="sm" className="bg-surface border-border p-3" icon={Download} />
                        <Button onClick={() => setMissingDocsOnly(!missingDocsOnly)} variant="secondary" size="sm" className={`p-3 border-border ${missingDocsOnly ? 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-950/30' : 'bg-surface text-text-subtle'}`} icon={FileWarning} />
                        <Button onClick={onReset} variant="secondary" size="sm" className="bg-surface border-border p-3 text-text-subtle" icon={RefreshCw} disabled={isRestricted} />
                    </div>
                </div>
            </div>

            {/* ASSET FILTERS */}
            <div className="flex items-center gap-4 px-6 overflow-x-auto pb-2 scrollbar-hide">
                <span className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.3em] shrink-0 border-r border-border pr-4">{isAr ? 'تصفية الأصول' : 'Asset Filters'}</span>
                <SmartDropdown title={isAr ? 'نوع المركبة' : 'Vehicle Type'} icon={Truck} data={Array.from(new Set(vehicles.map(v => v.vehicle_type))).map(v => ({ id: v, name: v }))} selected={selectedVehicleType} onSelect={setSelectedVehicleType} isAr={isAr} colorClass="emerald" disabled={isRestricted} />
                <SmartDropdown title={isAr ? 'السائق' : 'Driver'} icon={HardHat} data={drivers.map(d => ({ id: d.driver_id, name: d.name }))} selected={selectedDriver} onSelect={setSelectedDriver} isAr={isAr} colorClass="emerald" alignRight disabled={isRestricted} />
            </div>

            <ExportSelectionModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleFinalPdfExport}
                isAr={isAr}
                isLoading={isGeneratingPdf}
            />
        </div>
    );
};

export default ReportsFilters;
