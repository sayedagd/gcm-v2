import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/context';
import {
    Building2, LayoutGrid, List, ChevronLeft, ChevronRight, DownloadCloud, Sparkles, TrendingUp
} from 'lucide-react';
import {
    Card, Button, EmptyState, PageHeader, DeleteConfirmModal,
    FacilityCard, FacilityWizard, FacilityDetails
} from '@/components';
import { Facility, FacilityType, NotificationType } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { formatDate } from '@/utils/helpers';
import { exportFromSchema, exportTemplateFromSchema } from '@/utils/excelUtils';
import { facilitySchema } from '@/utils/excelSchemas';
import {
    PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer
} from 'recharts';

const ITEMS_PER_PAGE = 9;

const Facilities: React.FC = () => {
    const {
        facilities, upsertFacility, deleteFacility, saasConfig, currentUser,
        services, exportEnabled, addNotification
    } = useStore();

    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [currentFacility, setCurrentFacility] = useState<Partial<Facility> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeType, setActiveType] = useState<'ALL' | FacilityType>('ALL');

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [facilityIdToDelete, setFacilityIdToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isAr = saasConfig.language === 'ar';

    // Deep Linking Handler
    useEffect(() => {
        const id = searchParams.get('id');
        if (id && facilities.length > 0) {
            const facility = facilities.find(f => f.facility_id === id);
            if (facility) {
                setCurrentFacility(facility);
                setIsViewMode(true);
                setIsModalOpen(true);
            }
        }
    }, [searchParams, facilities]);

    const globalStats = useMemo(() => ({
        total: facilities.length,
        active: facilities.filter(f => f.status === 'ACTIVE').length,
        types: new Set(facilities.map(f => f.type)).size
    }), [facilities]);

    // --- Filtering & Pagination ---
    const filtered = useMemo(() => {
        let base = facilities || [];

        return base.filter(f => {
            const name = (f.name || '').toLowerCase();
            const search = searchTerm.toLowerCase();

            const matchesSearch = name.includes(search);
            const matchesType = activeType === 'ALL' || f.type === activeType;

            return matchesSearch && matchesType;
        });
    }, [facilities, searchTerm, activeType]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
    }, [filtered, currentPage]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, activeType]);

    const typeDistribution = useMemo(() => {
        const counts = (facilities || []).reduce((acc: any, f) => {
            acc[f.type] = (acc[f.type] || 0) + 1;
            return acc;
        }, {});

        const colors: Record<string, string> = {
            [FacilityType.DISPOSAL]: '#ef4444',
            [FacilityType.RECYCLE]: '#10b981',
            [FacilityType.SEWAGE_TREATMENT]: '#3b82f6'
        };

        return Object.entries(counts).map(([type, count]) => ({
            name: type,
            count: count as number,
            color: colors[type] || '#64748b'
        }));
    }, [facilities]);

    const handleSave = async (facilityData: Partial<Facility>) => {
        setIsSubmitting(true);
        try {
            await upsertFacility({
                ...facilityData,
                facility_id: facilityData.facility_id || `FAC-${Date.now()}`,
                status: facilityData.status || 'ACTIVE'
            } as Facility);
            setIsModalOpen(false);
            addNotification({ title: isAr ? 'نجاح' : 'Success', message: isAr ? 'تم حفظ بيانات المرفق' : 'Facility data synchronized', type: NotificationType.SUCCESS });
        } catch (err: any) {
            addNotification({ title: 'Error', message: err.message, type: NotificationType.ERROR });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!facilityIdToDelete) return;
        setIsDeleting(true);
        try {
            await deleteFacility(facilityIdToDelete);
            setDeleteConfirmOpen(false);
            setFacilityIdToDelete(null);
        } catch (err: any) {
            addNotification({ title: 'Error', message: err.message, type: NotificationType.ERROR });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-40 px-4">
            {/* Header Section */}
            <PageHeader
                title={isAr ? 'مركز إدارة المرافق' : 'Facilities Hub'}
                subtitle={isAr ? 'إدارة مواقع التفريغ، التخلص، ومعالجة النفايات' : 'Manage discharge sites, disposal, and waste treatment facilities'}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                isAr={isAr}
                actionLabel={isAr ? 'إضافة مرفق جديد' : 'New Facility'}
                onActionClick={() => { setCurrentFacility({ status: 'ACTIVE' }); setIsViewMode(false); setIsModalOpen(true); }}
            >
                <div className="flex bg-surface p-1.5 rounded-2xl border border-border shadow-sm overflow-x-auto custom-scrollbar">
                    {(['ALL', ...Object.values(FacilityType)] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveType(t)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeType === t ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle hover:text-primary'}`}
                        >
                            {t === 'ALL' ? (isAr ? 'الكل' : 'All') : t}
                        </button>
                    ))}
                </div>

                <div className="flex bg-surface p-1 rounded-2xl border border-border shadow-sm">
                    <button onClick={() => setViewType('grid')} className={`p-2.5 rounded-xl transition-all ${viewType === 'grid' ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle hover:bg-surface-subtle'}`}><LayoutGrid size={18} /></button>
                    <button onClick={() => setViewType('list')} className={`p-2.5 rounded-xl transition-all ${viewType === 'list' ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle hover:bg-surface-subtle'}`}><List size={18} /></button>
                </div>

                <div className="flex items-center gap-2">
                    {exportEnabled && (
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => exportFromSchema(filtered, facilitySchema, `GCM_Facilities_${formatDate(new Date(), 'yyyy-MM-dd')}`)}
                                icon={DownloadCloud}
                                className="!py-4"
                            >
                                {isAr ? 'تصدير' : 'Export'}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => exportTemplateFromSchema(facilitySchema, 'GCM_Facilities_Template')}
                                icon={DownloadCloud}
                                className="!py-4"
                            >
                                {isAr ? 'قالب' : 'Template'}
                            </Button>
                        </>
                    )}
                </div>
            </PageHeader>

            {/* Analytics Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 p-10 bg-surface border border-border relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -mr-20 -mt-20 group-hover:bg-primary/10 transition-all duration-700" />
                    <div className="relative z-10 space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-text-main tracking-widest uppercase flex items-center gap-4">
                                    <Sparkles className="text-primary animate-pulse" />
                                    {isAr ? 'تحليل القدرة الاستيعابية' : 'Capacity Intelligence'}
                                </h2>
                                <p className="text-text-subtle text-[10px] font-bold uppercase tracking-[0.4em]">{isAr ? 'توزيع المرافق حسب النوع والنشاط' : 'Facility distribution by type & activity'}</p>
                            </div>
                            <div className="w-16 h-16 bg-surface-subtle dark:bg-white/5 rounded-3xl flex items-center justify-center border border-border">
                                <TrendingUp className="text-emerald-500" size={32} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {typeDistribution.map((td: any) => (
                                <div key={td.name} className="p-6 bg-surface-subtle rounded-xl border border-border">
                                    <div className="text-[9px] font-bold text-text-subtle mb-3 uppercase tracking-widest">{td.name}</div>
                                    <div className="text-3xl font-bold text-text-main flex items-center gap-3">
                                        {td.count}
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: td.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card className="p-10 flex flex-col justify-center items-center gap-4 bg-surface border border-border shadow-lg">
                    <p className="text-[10px] font-bold uppercase text-text-subtle tracking-[0.3em] mb-4">{isAr ? 'توزيـع الأنواع' : 'Type Distribution'}</p>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="count">
                                    {typeDistribution.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                </Pie>
                                <ReTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-text-main">{globalStats.total}</span>
                            <span className="text-[8px] font-bold text-text-subtle uppercase">Sites</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Browser */}
            <div className="space-y-8">
                <div className={viewType === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
                    <AnimatePresence mode="popLayout">
                        {filtered.length === 0 ? (
                            <div className="col-span-full py-10">
                                <EmptyState
                                    icon={Building2}
                                    title={isAr ? 'لا توجد مرافق' : 'No Facilities Found'}
                                    description={isAr ? 'ابدأ بإضافة مرافق لمعالجة النفايات' : 'Start by adding waste treatment facilities.'}
                                />
                            </div>
                        ) : (
                            paginated.map(facility => (
                                <FacilityCard
                                    key={facility.facility_id}
                                    facility={facility}
                                    viewType={viewType}
                                    isAr={isAr}
                                    onView={(f) => { setCurrentFacility(f); setIsViewMode(true); setIsModalOpen(true); }}
                                    onEdit={(f) => { setCurrentFacility(f); setIsViewMode(false); setIsModalOpen(true); }}
                                    onDelete={(id) => { setFacilityIdToDelete(id); setDeleteConfirmOpen(true); }}
                                />
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-surface border border-border rounded-2xl shadow-sm">
                        <p className="text-[10px] font-bold text-text-subtle uppercase">
                            {isAr ? `عرض ${filtered.length} مرفق` : `SHOWING ${filtered.length} SITES`}
                        </p>
                        <div className="flex gap-2">
                            <Button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} variant="secondary" icon={ChevronLeft} />
                            <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} variant="secondary" icon={ChevronRight} />
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <FacilityWizard
                isOpen={isModalOpen && !isViewMode}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                facility={currentFacility}
                isAr={isAr}
                services={services}
                isSubmitting={isSubmitting}
            />

            <FacilityDetails
                isOpen={isModalOpen && isViewMode}
                onClose={() => setIsModalOpen(false)}
                facility={currentFacility as Facility}
                isAr={isAr}
                onEdit={() => setIsViewMode(false)}
            />

            <DeleteConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title={isAr ? 'حذف مرفق' : 'Delete Facility'}
                message={isAr ? 'هل أنت متأكد من حذف هذا المرفق؟' : 'Are you sure you want to delete this facility?'}
                isAr={isAr}
                isLoading={isDeleting}
            />
        </div>
    );
};

export default Facilities;
