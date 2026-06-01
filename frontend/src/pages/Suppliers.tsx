import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/context';
import {
  Building2, DownloadCloud, FileDown,
  Sparkles, TrendingUp, LayoutGrid, List, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  Card, Button, EmptyState, PageHeader,
  SupplierStats, SupplierCard, SupplierWizard, SupplierDetails, DeleteConfirmModal
} from '@/components';
import { Supplier, Role, NotificationType, RequestStatus } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '@/utils/helpers';
import { exportFromSchema, exportTemplateFromSchema } from '@/utils/excelUtils';
import { supplierSchema } from '@/utils/excelSchemas';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer
} from 'recharts';

const ITEMS_PER_PAGE = 9;

const Suppliers: React.FC = () => {
  const {
    suppliers, upsertSupplier, deleteSupplier, saasConfig, currentUser,
    vehicles, containers, tanks, drivers, exportEnabled, addNotification, users,
    assetRequests, processAssetRequest
  } = useStore();

  const isSubcontractor = currentUser.role === Role.SUBCONTRACTOR;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Deep Linking Handler
  useEffect(() => {
    const search = searchParams.get('search');
    const id = searchParams.get('id');
    if (id && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.supplier_id === id);
      if (supplier) {
        setCurrentSupplier(supplier);
        setIsViewMode(true);
        setIsModalOpen(true);
      }
    } else if (search) {
      setSearchTerm(search);
    }
  }, [searchParams, suppliers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'ALL' | 'VEHICLES' | 'CONTAINERS' | 'STAFF' | 'GENERAL' | 'REQUESTS'>('ALL');

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplierIdToDelete, setSupplierIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const globalStats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'ACTIVE').length,
    categories: new Set(suppliers.map(s => s.category)).size,
    assets: vehicles.length + containers.length + tanks.length
  }), [suppliers, vehicles, containers, tanks]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // uploadType state is moved to Wizard but fileInputRef was used in PageHeader for import? 
  // No, imports are not implemented in PageHeader here, only logic for upload docs inside modal. 
  // Wait, I see handleFileUpload in previous Suppliers.tsx used for documents inside modal.
  // I moved that to SupplierWizard. So I don't need it here unless I missed an import button.
  // The original had an import button? Checked original code: No, only export buttons in PageHeader. 
  // The file input was for document uploads inside the modal.

  const isAr = saasConfig.language === 'ar';

  // --- Filtering & Pagination ---
  const filtered = useMemo(() => {
    let base = suppliers || [];

    // Subcontractor Filter
    if (isSubcontractor && currentUser.supplier_id) {
      base = base.filter(s => s.supplier_id === currentUser.supplier_id);
    }

    return base.filter(s => {
      const name = (s.name || '').toLowerCase();
      const trading = (s.trading_name || '').toLowerCase();
      const cr = (s.cr_no || '');
      const search = searchTerm.toLowerCase();

      const matchesSearch = name.includes(search) || trading.includes(search) || cr.includes(search);
      const matchesTab = activeTab === 'ALL' || s.category === activeTab;

      return matchesSearch && matchesTab;
    });
  }, [suppliers, searchTerm, activeTab, isSubcontractor, currentUser]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab]);

  // --- Supplier specific stats logic ---
  const getSupplierAssets = (sId: string) => {
    const sVehicles = (vehicles || []).filter(v => v.supplier_id === sId || (v.ownership_type === 'SUPPLIER' && v.supplier_name === suppliers.find(sx => sx.supplier_id === sId)?.name));
    const sContainers = (containers || []).filter(c => c.supplier_id === sId);
    const sTanks = (tanks || []).filter(t => t.supplier_id === sId);
    const sStaff = (drivers || []).filter(d => d.supplier_id === sId);
    return {
      vehicles: sVehicles,
      containers: sContainers,
      tanks: sTanks,
      staff: sStaff,
      totalAssets: sVehicles.length + sContainers.length + sTanks.length,
      staffCount: sStaff.length
    };
  };

  const dashboardStats = useMemo(() => {
    if (!currentSupplier?.supplier_id) return { vehicles: [], containers: [], tanks: [], staff: [], totalAssets: 0, staffCount: 0 };
    return getSupplierAssets(currentSupplier.supplier_id);
  }, [currentSupplier, vehicles, containers, tanks, drivers, suppliers]);

  const globalIntelligence = useMemo(() => {
    const categories = (suppliers || []).reduce((acc: any, s) => {
      const cat = s.category || 'GENERAL';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categories).map(([cat, count]) => ({
      key: cat, // unique identifier — never translated
      name: cat === 'VEHICLES' ? (isAr ? 'نقليات' : 'Fleet')
        : cat === 'CONTAINERS' ? (isAr ? 'حاويات' : 'Bins')
          : cat === 'STAFF' ? (isAr ? 'عمالة' : 'Staff')
            : cat === 'GENERAL' ? (isAr ? 'عام' : 'General')
              : cat,
      count: count as number,
      color: cat === 'VEHICLES' ? '#3b82f6'
        : cat === 'CONTAINERS' ? '#10b981'
          : cat === 'STAFF' ? '#8b5cf6'
            : '#f59e0b'
    }));
  }, [suppliers, isAr]);

  const handleSave = async () => {
    if (!currentSupplier?.name || !currentSupplier?.category) {
      setFormError(isAr ? 'يرجى إكمال البيانات الأساسية (الاسم والفئة)' : 'Please complete basic info (Name & Category)');
      return;
    }

    setFormError('');
    setIsSubmitting(true);
    try {
      // [AR] تحويل جهات الاتصال لنص JSON لمنع خطأ 500 في السيرفر
      // [EN] Stringify contact persons to prevent 500 Internal Server Error
      const contactsToSave = Array.isArray(currentSupplier.contact_persons)
        ? JSON.stringify(currentSupplier.contact_persons)
        : (currentSupplier.contact_persons || "[]");

      await upsertSupplier({
        ...currentSupplier,
        supplier_id: currentSupplier.supplier_id || `SUP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
        contact_persons: contactsToSave,
        status: currentSupplier.status || 'ACTIVE'
      } as Supplier);

      setFormError('');
      setIsModalOpen(false);
      addNotification({
        title: 'Success',
        message: isAr ? 'تم حفظ بيانات المورد بنجاح' : 'Partner profiles updated successfully',
        type: NotificationType.SUCCESS
      });
    } catch (error: any) {
      setFormError(error.messageAr || error.messageEn || error.message || (isAr ? 'فشل حفظ المورد' : 'Failed to save supplier'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!supplierIdToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSupplier(supplierIdToDelete);
      setDeleteConfirmOpen(false);
      setSupplierIdToDelete(null);
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
        title={isAr ? 'منصة الموردين' : 'Suppliers Hub'}
        subtitle={isAr ? 'نظام التحكم المركزي في الشركاء واللوجستيات' : 'Centralized Partner & Logistics Command'}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isAr={isAr}
        actionLabel={isAr ? 'هيئـة مورد جديـد' : 'New Supplier'}
        onActionClick={() => {
          setCurrentSupplier({ status: 'ACTIVE', category: 'GENERAL' });
          setIsViewMode(false);
          setFormError('');
          setIsModalOpen(true);
        }}
      >
        <div className="flex bg-surface p-1.5 rounded-2xl border border-border shadow-sm overflow-x-auto custom-scrollbar">
          {(['ALL', 'VEHICLES', 'CONTAINERS', 'STAFF', 'REQUESTS'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle hover:text-primary'}`}
            >
              {t === 'ALL' ? (isAr ? 'الكل' : 'All') : t === 'VEHICLES' ? (isAr ? 'أسطول' : 'Fleet') : t === 'CONTAINERS' ? (isAr ? 'معدات' : 'Assets') : t === 'STAFF' ? (isAr ? 'عمالة' : 'Staff') : (isAr ? 'الطلبات' : 'Requests')}
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
                onClick={() => exportFromSchema(filtered, supplierSchema, `GCM_Suppliers_${formatDate(new Date(), 'yyyy-MM-dd')}`)}
                icon={DownloadCloud}
                className="!py-4"
              >
                {isAr ? 'تصدير' : 'Export'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => exportTemplateFromSchema(supplierSchema, 'GCM_Suppliers_Template')}
                icon={FileDown}
                className="!py-4"
              >
                {isAr ? 'قالب' : 'Template'}
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {/* Global Logistics Intelligence - Hidden for Subcontractors */}
      {!isSubcontractor && (
        <SupplierStats stats={globalStats} isAr={isAr} />
      )}

      {/* Intelligence Hub & Category Mix - Hidden for Subcontractors */}
      {!isSubcontractor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 p-10 bg-surface border border-border relative overflow-hidden group shadow-lg dark:shadow-3xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -mr-20 -mt-20 group-hover:bg-primary/10 transition-all duration-700" />
            <div className="relative z-10 space-y-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-text-main tracking-widest uppercase flex items-center gap-4">
                    <Sparkles className="text-primary animate-pulse" />
                    {isAr ? 'تحليل القوة التشغيلية' : 'Operational Yield Analytics'}
                  </h2>
                  <p className="text-text-subtle text-[10px] font-bold uppercase tracking-[0.4em]">{isAr ? 'رؤية شاملة لقدرات سلاسل التوريد' : 'Deep-core supply chain capability mapping'}</p>
                </div>
                <div className="w-16 h-16 bg-surface-subtle dark:bg-white/5 rounded-3xl flex items-center justify-center border border-border group-hover:scale-110 transition-transform shadow-sm">
                  <TrendingUp className="text-emerald-500 dark:text-emerald-400" size={32} />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {globalIntelligence.map((g: any) => (
                  <div key={g.key} className="p-6 bg-surface-subtle rounded-xl border border-border hover:border-primary/40 transition-all hover:bg-surface group/stat">
                    <div className="text-[9px] font-bold text-text-subtle mb-3 uppercase tracking-widest">{g.name}</div>
                    <div className="text-3xl font-bold text-text-main flex items-center gap-3">
                      {g.count}
                      <div className="w-2 h-2 rounded-full shadow-lg shadow-current" style={{ backgroundColor: g.color }} />
                    </div>
                    <div className="mt-4 h-1 w-full bg-border/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(g.count / globalStats.total) * 100}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: g.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-10 flex flex-col justify-between gap-8 h-full">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-text-subtle tracking-[0.3em] mb-4">{isAr ? 'توزيـع الفئـات' : 'Category Distribution'}</p>
              <div className="h-48 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="99%" height={300}>
                  <PieChart>
                    <Pie data={globalIntelligence} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="count">
                      {globalIntelligence.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <ReTooltip contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#0f172a', color: 'white', fontWeight: '900', fontSize: '10px' }} itemStyle={{ color: 'white' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-text-main leading-none">{globalStats.total}</span>
                  <span className="text-[8px] font-bold text-text-subtle uppercase tracking-widest mt-1">Units</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {globalIntelligence.map((g: any) => (
                <div key={g.key} className="flex items-center justify-between p-3 rounded-2xl bg-surface-subtle border border-border hover:bg-surface transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                    <span className="text-[10px] font-bold text-text-subtle uppercase">{g.name}</span>
                  </div>
                  <span className="text-xs font-bold text-text-main">{((g.count / globalStats.total) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Main Browser Section */}
      <div className="space-y-8 pb-12">
        {/* Supplier Cards */}
        <div className={viewType === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
          <AnimatePresence mode="popLayout">
            {activeTab === 'REQUESTS' ? (
              <div className="col-span-full space-y-6">
                {assetRequests.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title={isAr ? 'لا توجد طلبات معلقة' : 'No Pending Requests'}
                    description={isAr ? 'لم يتم تقديم أي طلبات إضافة من قبل المقاولين حالياً.' : 'No asset addition requests have been submitted by subcontractors yet.'}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {assetRequests.map(req => {
                      const supplier = suppliers.find(s => s.supplier_id === req.supplier_id);
                      return (
                        <Card key={req.id} className="p-6 bg-surface border border-border group hover:border-primary/40 transition-all">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600' : req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                  {req.status}
                                </span>
                                <span className="text-xs font-bold text-text-main uppercase tracking-widest">
                                  {req.type}
                                </span>
                                <span className="text-[10px] text-text-subtle">
                                  {formatDate(req.created_at, 'yyyy-MM-dd HH:mm')}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-text-main">{supplier?.name || req.supplier_id}</h3>
                                <p className="text-xs text-text-subtle font-medium">
                                  {req.type === 'VEHICLE' ? `${req.data.plate_no} - ${req.data.vehicle_type}` :
                                   req.type === 'DRIVER' ? `${req.data.name} (${req.data.phone})` :
                                   req.type === 'CONTAINER' || req.type === 'TANK' ? `${req.data.code}` : ''}
                                </p>
                              </div>
                            </div>

                            {req.status === 'PENDING' && (
                              <div className="flex gap-3">
                                <Button
                                  variant="secondary"
                                  onClick={() => processAssetRequest(req.id, RequestStatus.REJECTED)}
                                  className="!bg-rose-500/5 hover:!bg-rose-500/10 !text-rose-600 border-none"
                                >
                                  {isAr ? 'رفض' : 'Reject'}
                                </Button>
                                <Button
                                  onClick={() => processAssetRequest(req.id, RequestStatus.APPROVED)}
                                  className="!bg-emerald-500 hover:!bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                >
                                  {isAr ? 'اعتماد' : 'Approve'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full py-10">
                <EmptyState
                  icon={Building2}
                  title={isAr ? 'لم يتم العثور على شركاء' : 'Dossier Not Found'}
                  description={searchTerm ? (isAr ? 'لم نجد أي مورد يطابق معايير البحث الحالية' : 'No partner in our registry matches your specific search parameters.') : (isAr ? 'ابدأ بإضافة موردين لشبكتك اللوجستية' : 'Your partner ecosystem is empty. Initiate onboarding to begin.')}
                />
              </div>
            ) : (
              paginated.map(supplier => {
                const stats = getSupplierAssets(supplier.supplier_id);
                return (
                  <SupplierCard
                    key={supplier.supplier_id}
                    supplier={supplier}
                    stats={stats}
                    viewType={viewType}
                    isAr={isAr}
                    onView={(s) => {
                      setFormError('');
                      setCurrentSupplier(s);
                      setIsViewMode(true);
                      setIsModalOpen(true);
                    }}
                    onEdit={(s) => {
                      setFormError('');
                      setCurrentSupplier(s);
                      setIsViewMode(false);
                      setIsModalOpen(true);
                    }}
                    onDelete={(id) => { setSupplierIdToDelete(id); setDeleteConfirmOpen(true); }}
                  />
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Pagination - Sticky */}
        {activeTab !== 'REQUESTS' && totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-4 bg-surface sticky bottom-0 z-10 border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] mt-8">
            <div className="px-6 py-3 bg-surface-subtle rounded-2xl border border-border">
              <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">
                {isAr ? `نطاق العرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1} إلى ${Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} من إجمالي ${filtered.length} مورد` : `SCAN RANGE ${(currentPage - 1) * ITEMS_PER_PAGE + 1} — ${Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} OF ${filtered.length} PARTNERS`}
              </p>
            </div>
            <div className="flex gap-2" dir="ltr">
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                variant="secondary"
                icon={ChevronLeft}
              />
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`btn-pagination ${currentPage === i + 1 ? 'active' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
              <Button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                variant="secondary"
                icon={ChevronRight}
              />
            </div>
          </div>
        )}
      </div>

      <SupplierWizard
        isOpen={isModalOpen && !isViewMode}
        onClose={() => { setIsModalOpen(false); setFormError(''); }}
        onSave={handleSave}
        isSubmitting={isSubmitting}
        supplier={currentSupplier}
        setSupplier={setCurrentSupplier}
        users={users}
        isAr={isAr}
        formError={formError}
      />

      <SupplierDetails
        isOpen={isModalOpen && isViewMode}
        onClose={() => setIsModalOpen(false)}
        supplier={currentSupplier as Supplier}
        stats={dashboardStats}
        isAr={isAr}
        onEdit={() => { setIsViewMode(false); }}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={isAr ? 'حذف مورد' : 'Delete Supplier'}
        message={isAr ? 'هل أنت متأكد من رغبتك في حذف هذا المورد؟ سيؤدي ذلك لإزالة كافة الارتباطات والبيانات المتعلقة به.' : 'Are you sure you want to delete this supplier? This will remove all associations and related data.'}
        itemName={suppliers.find(s => s.supplier_id === supplierIdToDelete)?.name}
        isAr={isAr}
        isLoading={isDeleting}
      />

    </div>
  );
};

export default Suppliers;
