import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Truck, Download, Upload,
  CheckCircle2, Building2, LayoutGrid, List, Navigation,
  Package, FileDown, Activity, ChevronRight, ChevronLeft
} from 'lucide-react';
import {
  Card, StatCard, Button, Modal,
  EmptyState, PageHeader, DeleteConfirmModal
} from '@/components';
import { useStore } from '@/context';
import { Vehicle, Role, PermitEntry, NotificationType } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { formatDate } from '@/utils/helpers';
import { toast } from '@/utils/toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exportFromSchema, exportTemplateFromSchema, importFromSchema } from '@/utils/excelUtils';
import { vehicleSchema } from '@/utils/excelSchemas';
import VehicleCard from '@/components/fleet/VehicleCard';
import VehicleWizard from '@/components/fleet/VehicleWizard';
import VehicleDetails from '@/components/fleet/VehicleDetails';
import FleetMap from '@/components/fleet/FleetMap';
import { useDebounce } from '@/hooks/useDebounce';
import { SkeletonFullPage } from '@/components/common/PageSkeleton';

const ITEMS_PER_PAGE = 9;

const Fleet: React.FC = () => {
  const { vehicles, upsertVehicle, deleteVehicle, saasConfig, currentUser, exportEnabled, trips, projects, suppliers, addNotification, requestAddition, services, assetServiceLinks, syncAssetServiceLinks, booting } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Partial<Vehicle> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleServiceIds, setVehicleServiceIds] = useState<string[]>([]);

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vehicleIdToDelete, setVehicleIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [viewType, setViewType] = useState<'grid' | 'list' | 'map'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  const csvInputRef = useRef<HTMLInputElement>(null);

  const isAr = saasConfig.language === 'ar';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Deep Linking Handler
  useEffect(() => {
    const vehicleId = searchParams.get('id');
    if (vehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
      if (vehicle) {
        setCurrentVehicle(vehicle);
        setIsViewMode(true);
        setIsModalOpen(true);
      }
    }
  }, [searchParams, vehicles]);

  // Sync linked service IDs when a vehicle is opened for editing
  useEffect(() => {
    if (currentVehicle?.vehicle_id) {
      const linked = assetServiceLinks
        .filter(l => l.asset_type === 'VEHICLE' && l.asset_id === currentVehicle.vehicle_id)
        .map(l => l.service_id);
      setVehicleServiceIds(linked);
    } else {
      setVehicleServiceIds([]);
    }
  }, [currentVehicle?.vehicle_id, assetServiceLinks]);

  const canAdd = [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS].includes(currentUser.role);
  const canManage = currentUser.role === Role.ADMIN && saasConfig.managementControlsEnabled !== false;
  const canDelete = canManage;
  const debouncedSearch = useDebounce(searchTerm, 250);

  // Global Quick Stats
  const globalStats = useMemo(() => ({
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'ACTIVE').length,
    maintenance: vehicles.filter(v => v.status === 'MAINTENANCE').length,
    external: vehicles.filter(v => v.ownership_type === 'SUPPLIER').length
  }), [vehicles]);

  // Memoized Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return vehicles || [];
    return (vehicles || []).filter(v =>
      (v.plate_no || '').toLowerCase().includes(q) ||
      (v.vehicle_type || '').toLowerCase().includes(q) ||
      (v.supplier_name || '').toLowerCase().includes(q)
    );
  }, [vehicles, debouncedSearch]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE);
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVehicles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVehicles, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (booting) return <SkeletonFullPage variant="cards" />;

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { added, updated, unchanged, failed } = await importFromSchema(
        file,
        vehicleSchema,
        vehicles,
        upsertVehicle
      );
      toast.success(isAr
        ? `تم الاستيراد: ${added} جديد، ${updated} محدث، ${unchanged} متطابق${failed > 0 ? `، ${failed} فشل` : ''}`
        : `Import Complete: ${added} added, ${updated} updated, ${unchanged} unchanged${failed > 0 ? `, ${failed} failed` : ''}`);
      e.target.value = '';
    } catch {
      toast.error(isAr ? 'خطأ في قراءة الملف' : 'Error reading file');
    }
  };

  const handleSaveVehicle = async (vehicleData: Vehicle, permits: PermitEntry[]) => {
    setIsSubmitting(true);
    try {
      const vehicleToSave: Vehicle = {
        ...vehicleData,
        vehicle_id: vehicleData.vehicle_id || `V-${Date.now()}`,
        permit_count: permits.length,
        permit_zones: JSON.stringify(permits),
        supplier_id: currentUser.role === Role.SUBCONTRACTOR ? currentUser.supplier_id : vehicleData.supplier_id
      };

      if (currentUser.role === Role.SUBCONTRACTOR) {
        await requestAddition('VEHICLE', vehicleToSave);
      } else {
        await upsertVehicle(vehicleToSave);
        addNotification({
          type: NotificationType.SUCCESS,
          title: 'Success',
          message: isAr ? 'تم حفظ بيانات المركبة' : 'Vehicle data saved successfully'
        });
        // Sync service links after vehicle is saved
        try {
          await syncAssetServiceLinks('VEHICLE', vehicleToSave.vehicle_id, vehicleServiceIds);
        } catch (linkErr) {
          console.warn('[Fleet] Service link sync failed:', linkErr);
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      addNotification({
        type: NotificationType.ERROR,
        title: 'Error',
        message: err.message || 'Failed to save vehicle'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!vehicleIdToDelete) return;
    setIsDeleting(true);
    try {
      await deleteVehicle(vehicleIdToDelete);
      setDeleteConfirmOpen(false);
      setVehicleIdToDelete(null);
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'فشل الحذف' : 'Delete failed'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-40 px-4">
      {/* Header Section */}
      <PageHeader
        title={isAr ? 'الأسطول الميداني' : 'Operational Fleet'}
        subtitle={isAr ? 'إدارة الشاحنات والمعدات الثقيلة والتصاريح' : 'Strategic management of trucks, heavy machinery, and field permits.'}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isAr={isAr}
        actionLabel={isAr ? 'إضافة مركبة جديدة' : 'Deploy New Unit'}
        onActionClick={() => { setCurrentVehicle({ ownership_type: 'INTERNAL', is_small_vehicle: false, status: 'ACTIVE' }); setIsViewMode(false); setIsModalOpen(true); }}
      >
        <div className="flex bg-surface p-1.5 rounded-2xl border border-border shadow-sm">
          <Button variant="ghost" onClick={() => navigate('/iv')} icon={Package} className="!py-4 text-[10px] font-bold uppercase text-text-subtle hover:text-primary border-none">
            {isAr ? 'المخزون الفني' : 'Technical Inventory'}
          </Button>
        </div>

        <div className="flex bg-surface p-1 rounded-2xl border border-border shadow-sm">
          <button onClick={() => setViewType('grid')} className={`p-2.5 rounded-xl transition-all ${viewType === 'grid' ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle'}`}><LayoutGrid size={18} /></button>
          <button onClick={() => setViewType('list')} className={`p-2.5 rounded-xl transition-all ${viewType === 'list' ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle'}`}><List size={18} /></button>
          <button onClick={() => setViewType('map')} className={`p-2.5 rounded-xl transition-all ${viewType === 'map' ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle'}`}><Navigation size={18} /></button>
        </div>

        <div className="flex items-center gap-2">
          {exportEnabled && (
            <>
              <Button
                variant="secondary"
                onClick={() => exportFromSchema(
                  vehicles,
                  vehicleSchema,
                  `GCM_Fleet_${formatDate(new Date(), 'yyyy-MM-dd')}`,
                  'Fleet'
                )}
                icon={Download}
                className="!py-4"
              >
                {isAr ? 'تصدير Excel' : 'Export Excel'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => exportTemplateFromSchema(
                  vehicleSchema,
                  'GCM_Fleet_Template',
                  'Fleet'
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
      </PageHeader>

      {/* Global Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title={isAr ? 'إجمالي الأسطول' : 'Fleet Capacity'}
          value={globalStats.total}
          icon={Truck}
          variant="blue"
        />
        <StatCard
          title={isAr ? 'مركبات نشطة' : 'Active Units'}
          value={globalStats.active}
          icon={CheckCircle2}
          variant="green"
        />
        <StatCard
          title={isAr ? 'تحت الصيانة' : 'Under Maintenance'}
          value={globalStats.maintenance}
          icon={Activity}
          variant="rose"
        />
        <StatCard
          title={isAr ? 'معدات خارجية' : 'External Assets'}
          value={globalStats.external}
          icon={Building2}
          variant="amber"
        />
      </div>

      {viewType === 'map' ? (
        <FleetMap vehicles={filteredVehicles} isAr={isAr} />
      ) : (
        <Card className="p-8 space-y-8">
          {/* Units Display */}
          {filteredVehicles.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={isAr ? 'لا يوجد معدات' : 'No vehicles in fleet'}
              description={isAr ? 'جرب البحث بمعايير مختلفة أو إضافة وحدة جديدة للأسطول' : 'Adjust your search parameters or deploy a new unit to the operational fleet.'}
            />
          ) : (
            <div className={viewType === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              <AnimatePresence mode="popLayout">
                {paginatedVehicles.map(vehicle => (
                  <VehicleCard
                    key={vehicle.vehicle_id}
                    vehicle={vehicle}
                    trips={trips}
                    isAr={isAr}
                    canAdd={canAdd}
                    canDelete={canDelete}
                    onEdit={(v) => { setCurrentVehicle(v); setIsViewMode(false); setIsModalOpen(true); }}
                    onDelete={(id) => { setVehicleIdToDelete(id); setDeleteConfirmOpen(true); }}
                    onView={(v) => { setCurrentVehicle(v); setIsViewMode(true); setIsModalOpen(true); }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination - Sticky */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-surface sticky bottom-0 z-10 border-t-2 border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] mt-4">
              <p className="text-xs font-bold text-text-subtle uppercase tracking-widest">{isAr ? `عرض ${paginatedVehicles.length} معدة` : `Displaying ${paginatedVehicles.length} of ${filteredVehicles.length}`}</p>
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
          )}
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size={isViewMode ? "2xl" : "lg"}
        title={isViewMode ? (isAr ? 'المركز الاستخباراتي للمعدة' : 'Unit Intelligence Hub') : (isAr ? 'هندسة بيانات المعدة' : 'Unit Data Engineering')}
      >
        <div className={`pt-4 pb-6 ${isAr ? 'text-right' : 'text-left'}`}>
          {isViewMode && currentVehicle ? (
            <VehicleDetails
              vehicle={currentVehicle as Vehicle}
              trips={trips}
              projects={projects}
              isAr={isAr}
              onEdit={() => setIsViewMode(false)}
            />
          ) : (
            <VehicleWizard
              currentVehicle={currentVehicle}
              setCurrentVehicle={setCurrentVehicle}
              onSave={handleSaveVehicle}
              isSubmitting={isSubmitting}
              suppliers={suppliers}
              isAr={isAr}
              services={services}
              linkedServiceIds={vehicleServiceIds}
              onServiceLinksChange={setVehicleServiceIds}
            />
          )}
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={isAr ? 'حذف مركبة' : 'Delete Vehicle'}
        message={isAr ? 'هل أنت متأكد من رغبتك في حذف هذه المركبة من الأسطول؟' : 'Are you sure you want to remove this vehicle from the fleet?'}
        itemName={vehicles.find(v => v.vehicle_id === vehicleIdToDelete)?.plate_no}
        isAr={isAr}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Fleet;

