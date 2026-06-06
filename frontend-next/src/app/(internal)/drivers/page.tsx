"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '@/context';
import { useSearchParams } from 'next/navigation';
import {
  Users, Upload, Briefcase, CheckCircle2, ChevronRight, LayoutGrid, List, ChevronLeft,
  DownloadCloud, HardHat, FileDown
} from 'lucide-react';
import {
  Card, StatCard, Button, Modal,
  EmptyState, PageHeader, DeleteConfirmModal
} from '@/components';
import { Driver, PermitEntry, Role, NotificationType } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { formatDate } from '@/utils/helpers';
import { exportFromSchema, exportTemplateFromSchema, importFromSchema } from '@/utils/excelUtils';
import { driverSchema } from '@/utils/excelSchemas';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/utils/toast';
import { SkeletonFullPage } from '@/components/common/PageSkeleton';

import DriverCard from '@/components/drivers/DriverCard';
import DriverWizard from '@/components/drivers/DriverWizard';
import DriverDetails from '@/components/drivers/DriverDetails';

const ITEMS_PER_PAGE = 9;

const Drivers: React.FC = () => {
  const {
    drivers, upsertDriver, deleteDriver, saasConfig, suppliers,
    currentUser, addNotification, requestAddition,
    trips, vehicles, companies, projects, exportEnabled, users, booting
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Partial<Driver> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MANAGEMENT' | 'OPERATIONS'>('ALL');



  const searchParams = useSearchParams();

  // Deep Linking Handler
  useEffect(() => {
    const driverId = searchParams.get('id');
    if (driverId && drivers.length > 0) {
      const driver = drivers.find(d => d.driver_id === driverId);
      if (driver) {
        setCurrentStaff(driver);
        setIsViewMode(true);
        setIsModalOpen(true);
      }
    }
  }, [searchParams, drivers]);

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [staffIdToDelete, setStaffIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const csvInputRef = useRef<HTMLInputElement>(null);

  const isAr = saasConfig.language === 'ar';
  const canManage = currentUser.role === Role.ADMIN && saasConfig.managementControlsEnabled !== false;
  const debouncedSearch = useDebounce(searchTerm, 250);

  // --- Filtering & Pagination ---
  const filtered = useMemo(() => {
    let base = drivers || [];
    if (activeTab !== 'ALL') base = base.filter(d => d.category === activeTab);
    const q = debouncedSearch.toLowerCase();
    if (!q) return base;
    return base.filter(d =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.phone || '').includes(q) ||
      (d.role_title || '').toLowerCase().includes(q)
    );
  }, [drivers, debouncedSearch, activeTab]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab]);

  // Global Multi-Driver Stats
  const globalStats = useMemo(() => {
    return {
      total: drivers.length,
      active: drivers.filter(d => d.status === 'ACTIVE').length,
      operations: drivers.filter(d => d.category === 'OPERATIONS').length,
      management: drivers.filter(d => d.category === 'MANAGEMENT').length
    };
  }, [drivers]);

  if (booting) return <SkeletonFullPage variant="cards" />;

  // --- CRUD Operations ---
  const handleSave = async (staff: Driver, permits: PermitEntry[]) => {
    setIsSubmitting(true);
    try {
      // [FIX] Normalize status: guard against legacy DB values like 'AVAILABLE'
      const validStatuses = ['ACTIVE', 'ON_LEAVE', 'INACTIVE'] as const;
      const normalizedStatus = validStatuses.includes(staff.status as any) ? staff.status : 'ACTIVE';

      // [FIX] Robust normalization helper to convert any inputs to string or null
      const toStringOrNull = (val: any) => {
        if (val === undefined || val === null) return '';
        return String(val).trim();
      };

      // [FIX] Normalize dates: PostgreSQL returns ISO format ("2026-01-15T00:00:00.000Z")
      // Strip to YYYY-MM-DD safely, supporting both string, date, and falsy values
      const toDate = (d?: any) => {
        if (!d) return undefined;
        if (typeof d === 'string') return d.substring(0, 10);
        if (d instanceof Date) return d.toISOString().substring(0, 10);
        return undefined;
      };

      const {
        license_expiry: _licenseExpiry,
        iqama_expiry: _iqamaExpiry,
        operating_card_expiry: _operatingCardExpiry,
        insurance_expiry: _insuranceExpiry,
        vehicle_id: _vehicleId,
        supplier_id: _supplierId,
        ...staffBase
      } = staff;

      const licenseExpiry = toDate(staff.license_expiry);
      const iqamaExpiry = toDate(staff.iqama_expiry);
      const operatingCardExpiry = toDate(staff.operating_card_expiry);
      const insuranceExpiry = toDate(staff.insurance_expiry);
      const resolvedSupplierId = currentUser.role === Role.SUBCONTRACTOR ? currentUser.supplier_id : staff.supplier_id;

      const driverToSave: Driver = {
        ...staffBase,
        driver_id: staff.driver_id || `D-${Date.now()}`,
        status: normalizedStatus,
        permit_count: permits.length,
        permit_zones: JSON.stringify(permits),
        category: staff.category || 'OPERATIONS',
        ownership_type: staff.ownership_type || 'INTERNAL',
        ...(staff.vehicle_id ? { vehicle_id: staff.vehicle_id } : {}),
        ...(resolvedSupplierId ? { supplier_id: resolvedSupplierId } : {}),
        // Ensure values are clean strings to pass Joi schema
        phone: toStringOrNull(staff.phone),
        iqama_no: toStringOrNull(staff.iqama_no),
        license_no: toStringOrNull(staff.license_no),
        operating_card_no: toStringOrNull(staff.operating_card_no),
        insurance_no: toStringOrNull(staff.insurance_no),
        // Normalize all date fields safely
        ...(licenseExpiry ? { license_expiry: licenseExpiry } : {}),
        ...(iqamaExpiry ? { iqama_expiry: iqamaExpiry } : {}),
        ...(operatingCardExpiry ? { operating_card_expiry: operatingCardExpiry } : {}),
        ...(insuranceExpiry ? { insurance_expiry: insuranceExpiry } : {}),
      };

      if (currentUser.role === Role.SUBCONTRACTOR) {
        await requestAddition('DRIVER', driverToSave);
        toast.success(isAr ? 'تم إرسال طلب إضافة السائق بنجاح' : 'Driver addition request sent successfully');
      } else {
        await upsertDriver(driverToSave);
        toast.success(isAr ? 'تم حفظ بيانات الموظف بنجاح' : 'Staff saved successfully');
        addNotification({ title: 'Success', message: isAr ? 'تم حفظ بيانات الموظف' : 'Staff synchronized', type: NotificationType.SUCCESS });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || (isAr ? 'فشل حفظ الموظف' : 'Failed to save staff'));
      addNotification({ title: 'Error', message: error.message || 'Failed to save staff', type: NotificationType.ERROR });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleConfirmDelete = async () => {
    if (!staffIdToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriver(staffIdToDelete);
      setDeleteConfirmOpen(false);
      setStaffIdToDelete(null);
    } catch (err: any) {
      addNotification({ title: 'Error', message: err.message, type: NotificationType.ERROR });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { added, updated, unchanged, failed } = await importFromSchema(
        file,
        driverSchema,
        drivers,
        upsertDriver
      );
      addNotification({
        title: isAr ? 'تم الاستيراد' : 'Import Complete',
        message: isAr
          ? `✅ تم الاستيراد!\n• جديد: ${added}\n• محدث: ${updated}\n• متطابق: ${unchanged}${failed > 0 ? `\n• فشل: ${failed}` : ''}`
          : `✅ Import Complete!\n• Added: ${added}\n• Updated: ${updated}\n• Unchanged: ${unchanged}${failed > 0 ? `\n• Failed: ${failed}` : ''}`,
        type: NotificationType.SUCCESS
      });
      if (e.target) e.target.value = '';
    } catch {
      addNotification({
        title: 'Error',
        message: isAr ? '❌ خطأ في قراءة الملف' : '❌ Error reading file',
        type: NotificationType.ERROR
      });
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-40 px-4">
      {/* Header Section */}
      <PageHeader
        title={isAr ? 'شؤون الموظفين' : 'Staff Resources'}
        subtitle={isAr ? 'إدارة الكادر الإداري والميداني، التراخيص، والتصاريح' : 'Manage administrative and field staff, licenses, and permits.'}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isAr={isAr}
        actionLabel={isAr ? 'تسجيل موظف جديد' : 'New Staff'}
        onActionClick={() => { setCurrentStaff({ status: 'ACTIVE', category: 'OPERATIONS', ownership_type: 'INTERNAL' }); setIsViewMode(false); setIsModalOpen(true); }}
      >
        <div className="flex bg-surface p-1.5 rounded-2xl border border-border shadow-sm overflow-x-auto custom-scrollbar">
          {(['ALL', 'MANAGEMENT', 'OPERATIONS'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle hover:text-primary'}`}
            >
              {t === 'ALL' ? (isAr ? 'الكل' : 'All') : t === 'MANAGEMENT' ? (isAr ? 'إدارة' : 'MGMT') : (isAr ? 'عمليات' : 'OPS')}
            </button>
          ))}
        </div>

        <div className="flex bg-surface p-1.5 rounded-2xl border border-border shadow-sm">
          <button onClick={() => setViewType('grid')} className={`p-2.5 rounded-xl transition-all ${viewType === 'grid' ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle hover:bg-surface-subtle'}`}><LayoutGrid size={18} /></button>
          <button onClick={() => setViewType('list')} className={`p-2.5 rounded-xl transition-all ${viewType === 'list' ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle hover:bg-surface-subtle'}`}><List size={18} /></button>
        </div>

        <div className="flex items-center gap-2">
          {exportEnabled && (
            <>
              <Button
                variant="secondary"
                onClick={() => exportFromSchema(
                  filtered,
                  driverSchema,
                  `GCM_Staff_${formatDate(new Date().toISOString(), 'yyyy-MM-dd')}`,
                  'Staff'
                )}
                icon={DownloadCloud}
                className="!py-4"
              >
                {isAr ? 'تصدير' : 'Export'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => exportTemplateFromSchema(
                  driverSchema,
                  'GCM_Drivers_Template',
                  'Staff'
                )}
                icon={FileDown}
                className="!py-4"
              >
                {isAr ? 'قالب' : 'Template'}
              </Button>
              <Button variant="secondary" onClick={() => csvInputRef.current?.click()} icon={Upload} className="!py-4">
                {isAr ? 'استيراد' : 'Import'}
              </Button>
              <input type="file" ref={csvInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
            </>
          )}
        </div>
      </PageHeader >

      {/* Global Quick Stats */}
      < div className="grid grid-cols-1 md:grid-cols-4 gap-6" >
        <StatCard
          title={isAr ? 'إجمالي الموظفين' : 'Total Headcount'}
          value={globalStats.total}
          icon={Users}
          variant="blue"
        />
        <StatCard
          title={isAr ? 'نشط حالياً' : 'Currently Active'}
          value={globalStats.active}
          icon={CheckCircle2}
          variant="primary"
        />
        <StatCard
          title={isAr ? 'الكادر الميداني' : 'Field Operations'}
          value={globalStats.operations}
          icon={HardHat}
          variant="primary"
        />
        <StatCard
          title={isAr ? 'الهيكل الإداري' : 'Management'}
          value={globalStats.management}
          icon={Briefcase}
          variant="purple"
        />
      </div >

      {/* Main Container */}
      < Card className="p-8 space-y-8" >
        {
          filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={isAr ? 'لا يوجد نتائج' : 'No staff members found'}
              description={isAr ? 'جرب البحث بمعايير مختلفة أو إضافة موظف جديد' : 'Try adjusting your search or add a new member to the team.'}
            />
          ) : (
            <div className={viewType === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              <AnimatePresence mode="popLayout">
                {paginated.map(staff => (
                  <DriverCard
                    key={staff.driver_id}
                    staff={staff}
                    vehicles={vehicles}
                    isAr={isAr}
                    tripsCount={trips ? trips.filter((t: any) => t.driver_id === staff.driver_id).length : 0}
                    onEdit={(s) => { setCurrentStaff(s); setIsViewMode(false); setIsModalOpen(true); }}
                    onDelete={(id) => { setStaffIdToDelete(id); setDeleteConfirmOpen(true); }}
                    onView={(s) => { setCurrentStaff(s); setIsViewMode(true); setIsModalOpen(true); }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )
        }

        {/* Pagination */}
        {
          totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-surface sticky bottom-0 z-10 border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] mt-4">
              <p className="text-xs font-bold text-text-subtle uppercase tracking-widest">{isAr ? `عرض ${paginated.length} من أصل ${filtered.length}` : `Displaying ${paginated.length} of ${filtered.length}`}</p>
              <div className="flex gap-2" dir="ltr">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  icon={ChevronLeft}
                />
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)} className={`btn-pagination ${currentPage === i + 1 ? 'active' : ''}`}>{i + 1}</button>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  icon={ChevronRight}
                />
              </div>
            </div>
          )
        }
      </Card >

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size={isViewMode ? "2xl" : "lg"}
        title={isViewMode ? (isAr ? 'الملف الشخصي المتكامل' : 'Personnel Global Insight') : (isAr ? 'إعداد الملف الوظيفي' : 'Personnel Data Engineering')}
      >
        <div className={`space-y-6 pt-2 ${isAr ? 'text-right' : 'text-left'}`}>
          {isViewMode && currentStaff ? (
            <DriverDetails
              driver={currentStaff as Driver}
              trips={trips}
              projects={projects}
              companies={companies}
              isAr={isAr}
              onEdit={() => setIsViewMode(false)}
            />
          ) : (
            <DriverWizard
              currentStaff={currentStaff}
              setCurrentStaff={setCurrentStaff}
              onSave={handleSave}
              isSubmitting={isSubmitting}
              suppliers={suppliers}
              vehicles={vehicles}
              users={users}
              isAr={isAr}
            />
          )}
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={isAr ? 'حذف موظف' : 'Delete Staff Member'}
        message={isAr ? 'هل أنت متأكد من رغبتك في حذف هذا الموظف؟ سيؤدي ذلك لإزالة كافة بياناته من النظام.' : 'Are you sure you want to delete this staff member? This will remove all their records from the system.'}
        itemName={drivers.find(d => d.driver_id === staffIdToDelete)?.name}
        isAr={isAr}
        isLoading={isDeleting}
      />
    </div >
  );
};

export default Drivers;


