import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '@/context';
import {
  Plus, Search, Wrench, Download, Upload, AlertCircle, Activity, FileDown, Trash2
} from 'lucide-react';
import {
  Card, Modal, Button, Input, ServiceStats, ServiceTree, ServiceWizard, ServiceDashboardModal
} from '@/components';
import { Service, NotificationType } from '@/types';
import { formatDate } from '@/utils/helpers';
import { ServiceAnalytics } from '@/components/dashboard/ServiceAnalytics';
import { exportFromSchema, importFromSchema, exportTemplateFromSchema } from '@/utils/excelUtils';
import { serviceSchema } from '@/utils/excelSchemas';
import { toast } from '@/utils/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { SkeletonFullPage } from '@/components/common/PageSkeleton';

const Services: React.FC = () => {
  const { services, upsertService, deleteService, saasConfig, addNotification, trips, projectServices, exportEnabled, booting } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service> | null>(null);
  const [viewingService, setViewingService] = useState<Service | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAr = saasConfig.language === 'ar';
  const debouncedSearch = useDebounce(searchTerm, 250);

  // Calculated Stats
  const stats = useMemo(() => {
    const parentServices = services.filter(s => !s.parent_id);
    const subServices = services.filter(s => s.parent_id);
    return {
      total: services.length,
      categories: parentServices.length,
      materials: subServices.length
    };
  }, [services]);

  const serviceTree = useMemo(() => {
    const buildTree = (parentId: string | null = null) => {
      return services
        .filter(s => {
          if (parentId === null) return !s.parent_id || s.parent_id === '';
          return s.parent_id === parentId;
        })
        .map(s => ({ ...s, children: buildTree(s.service_id) }));
    };
    return buildTree(null);
  }, [services]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    try {
      const { added, updated, failed } = await importFromSchema(file, serviceSchema, services, upsertService);
      toast.success(`Import Complete: ${added} added, ${updated} updated${failed > 0 ? `, ${failed} failed` : ''}`);
      e.target.value = '';
    } catch (err: any) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!currentService?.service_name || currentService.service_name.trim() === '') {
      setError(isAr ? 'يجب إدخال اسم الخدمة' : 'Service name is required');
      addNotification({
        title: isAr ? 'خطأ في التحقق' : 'Validation Error',
        message: isAr ? 'يجب إدخال اسم الخدمة' : 'Service name is required',
        type: NotificationType.WARNING
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const id = currentService.service_id || `S${Date.now()} -${Math.random().toString(36).substr(2, 9)} `;
      await upsertService({
        service_id: id,
        service_name: currentService.service_name.trim(),
        service_description: currentService.service_description?.trim() || '',
        major_category: currentService.major_category || undefined,
        parent_id: currentService.parent_id || undefined,
        requires_recycle_receipt: currentService.requires_recycle_receipt || false,
      });

      addNotification({
        title: isAr ? 'تم الحفظ' : 'Saved Successfully',
        message: isAr
          ? `تم ${currentService.service_id ? 'تحديث' : 'إضافة'} الخدمة بنجاح`
          : `Service ${currentService.service_id ? 'updated' : 'created'} successfully`,
        type: NotificationType.SUCCESS
      });

      setIsModalOpen(false);
      setCurrentService(null);
    } catch (err: any) {
      setError(err.message);
      addNotification({
        title: isAr ? 'خطأ' : 'Error',
        message: err.message || (isAr ? 'فشل حفظ الخدمة' : 'Failed to save service'),
        type: NotificationType.ERROR
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;

    // Check if service has children — delete children first
    const hasChildren = services.some(s => s.parent_id === serviceToDelete);
    if (hasChildren) {
      addNotification({
        title: isAr ? 'لا يمكن الحذف' : 'Cannot Delete',
        message: isAr
          ? 'هذه الخدمة لديها خدمات فرعية. يجب حذف الخدمات الفرعية أولاً.'
          : 'This service has child services. Delete child services first.',
        type: NotificationType.WARNING
      });
      setIsDeleteConfirmOpen(false);
      setServiceToDelete(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteService(serviceToDelete);

      addNotification({
        title: isAr ? 'تم الحذف' : 'Deleted Successfully',
        message: isAr ? 'تم حذف الخدمة بنجاح' : 'Service deleted successfully',
        type: NotificationType.SUCCESS
      });

      setIsDeleteConfirmOpen(false);
      setServiceToDelete(null);
    } catch (err: any) {
      setError(err.message);
      addNotification({
        title: isAr ? 'خطأ' : 'Error',
        message: err.message || (isAr ? 'فشل حذف الخدمة' : 'Failed to delete service'),
        type: NotificationType.ERROR
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsSubmitting(true);
    try {
      // Delete children first, then parents
      const children = services.filter(s => s.parent_id);
      const parents = services.filter(s => !s.parent_id);
      for (const s of children) {
        await deleteService(s.service_id);
      }
      for (const s of parents) {
        await deleteService(s.service_id);
      }
      addNotification({
        title: isAr ? 'تم الحذف' : 'All Deleted',
        message: isAr ? 'تم حذف جميع الخدمات بنجاح' : 'All services deleted successfully',
        type: NotificationType.SUCCESS
      });
    } catch (err: any) {
      addNotification({
        title: isAr ? 'خطأ' : 'Error',
        message: err.message || (isAr ? 'فشل حذف بعض الخدمات' : 'Failed to delete some services'),
        type: NotificationType.ERROR
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteAllConfirmOpen(false);
    }
  };

  const filteredTree = useMemo(() => {
    if (!debouncedSearch) return serviceTree;
    const lowerTerm = debouncedSearch.toLowerCase();

    // Function to filter recursively
    const filterNodes = (nodes: any[]): any[] => {
      return nodes.reduce((acc, node) => {
        const matches = node.service_name.toLowerCase().includes(lowerTerm);
        const children = filterNodes(node.children || []);

        if (matches || children.length > 0) {
          acc.push({ ...node, children });
        }

        return acc;
      }, []);
    };

    return filterNodes(serviceTree);
  }, [serviceTree, debouncedSearch]);

  if (booting) return <SkeletonFullPage variant="cards" />;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 pt-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-4 tracking-tight text-text-main">
            <div
              className="p-3 rounded-2xl text-white shadow-xl"
              style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px var(--primary-color-30)' }}
            >
              <Wrench size={32} />
            </div>
            {isAr ? 'دليل المواد والخدمات' : 'Material & Service Hub'}
          </h1>
          <p className="text-text-subtle text-base font-bold mt-1 opacity-70 tracking-tight">{isAr ? 'تصنيف أنواع النفايات والخدمات الميدانية الموحدة' : 'Centralized repository for all field operation materials and waste categories.'}</p>
        </div>
        <div className="flex items-center gap-3">
          {exportEnabled && (
            <>
              <Button
                variant="secondary"
                onClick={() => exportFromSchema(services, serviceSchema, `GCM_Services_${formatDate(new Date(), 'yyyy-MM-dd')}`)}
                icon={Download}
                className="px-6 py-4 rounded-3xl"
              >
                {isAr ? 'تصدير Excel' : 'Export Excel'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => exportTemplateFromSchema(serviceSchema, 'GCM_Services_Template')}
                icon={FileDown}
                className="px-6 py-4 rounded-3xl"
              >
                {isAr ? 'قالب' : 'Template'}
              </Button>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} icon={Upload} className="px-6 py-4 rounded-3xl">
                {isAr ? 'استيراد' : 'Import'}
              </Button>
            </>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
          {services.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setIsDeleteAllConfirmOpen(true)}
              icon={Trash2}
              className="px-6 py-4 text-red-600 hover:bg-red-50 border border-red-200"
            >
              {isAr ? 'حذف الكل' : 'Delete All'}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => { setCurrentService({}); setIsModalOpen(true); }}
            icon={Plus}
            className="px-8 py-4"
          >
            {isAr ? 'إضافة تصنيف أساسي' : 'Create Category'}
          </Button>
        </div>
      </div>

      <ServiceStats stats={stats} isAr={isAr} />

      {/* Analytics Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-text-main flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Activity size={20} />
          </div>
          {isAr ? 'التحليلات والإحصائيات' : 'Analytics & Insights'}
        </h2>
        <ServiceAnalytics isAr={isAr} />
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 bg-surface-subtle border-b border-border flex items-center gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle" />
            <Input
              placeholder={isAr ? 'البحث عن مادة أو خدمة...' : 'Search catalog...'}
              className="pl-12 bg-surface"
              value={searchTerm}
              onChange={val => setSearchTerm(val)}
            />
          </div>
        </div>

        <ServiceTree
          services={filteredTree}
          searchTerm={searchTerm}
          isAr={isAr}
          onEdit={(s) => { setCurrentService(s); setIsModalOpen(true); }}
          onDelete={(id) => { setServiceToDelete(id); setIsDeleteConfirmOpen(true); }}
          onAddChild={(parentId) => { setCurrentService({ parent_id: parentId }); setIsModalOpen(true); }}
          onView={(s) => setViewingService(s)}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentService?.service_id ? (isAr ? 'تعديل البيانات' : 'Edit Service Record') : (isAr ? 'إضافة مادة جديدة' : 'New Service Record')}
        size="lg"
      >
        <ServiceWizard
          service={currentService}
          parentServiceName={services.find(s => s.service_id === currentService?.parent_id)?.service_name}
          isAr={isAr}
          isSubmitting={isSubmitting}
          onChange={setCurrentService}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title={isAr ? 'تأكيد حذف المورد' : 'Confirm Permanent Deletion'} size="md">
        <div className="space-y-6 pt-2 text-center">
          <div className="w-20 h-20 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto text-rose-500 shadow-inner">
            <AlertCircle size={40} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-main uppercase tracking-tight">{isAr ? 'هل أنت متأكد تماماً؟' : 'Are you absolutely sure?'}</h3>
            <p className="text-sm font-bold text-text-subtle mt-2 leading-relaxed px-4">{isAr ? 'سيؤدي حذف هذا التصنيف إلى حذف كافة المواد والخدمات المندرجة تحته بشكل نهائي.' : 'This action cannot be undone. All child materials and associated service records will be purged.'}</p>
          </div>
          <div className="flex gap-4 p-2 bg-surface-subtle rounded-3xl">
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1">{isAr ? 'تراجع' : 'Abort'}</Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              className="flex-1 bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
              disabled={isSubmitting}
            >
              {isAr ? (isSubmitting ? 'جاري الحذف...' : 'تأكيد الحذف') : (isSubmitting ? 'Deleting...' : 'Destroy Record')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteAllConfirmOpen} onClose={() => setIsDeleteAllConfirmOpen(false)} title={isAr ? 'حذف جميع الخدمات' : 'Delete All Services'} size="md">
        <div className="space-y-6 pt-2 text-center">
          <div className="w-20 h-20 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto text-rose-500 shadow-inner">
            <Trash2 size={40} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-main uppercase tracking-tight">{isAr ? 'حذف جميع الخدمات؟' : 'Delete ALL services?'}</h3>
            <p className="text-sm font-bold text-text-subtle mt-2 leading-relaxed px-4">
              {isAr
                ? `سيتم حذف ${services.length} خدمة نهائياً. يمكنك إعادة إدخالها يدوياً بعد ذلك.`
                : `This will permanently delete all ${services.length} services. You can re-enter them manually afterwards.`}
            </p>
          </div>
          <div className="flex gap-4 p-2 bg-surface-subtle rounded-3xl">
            <Button variant="ghost" onClick={() => setIsDeleteAllConfirmOpen(false)} className="flex-1">{isAr ? 'تراجع' : 'Cancel'}</Button>
            <Button
              variant="primary"
              onClick={handleDeleteAll}
              className="flex-1 bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
              disabled={isSubmitting}
            >
              {isAr ? (isSubmitting ? 'جاري الحذف...' : 'حذف الكل نهائياً') : (isSubmitting ? 'Deleting...' : 'Delete All')}
            </Button>
          </div>
        </div>
      </Modal>

      <ServiceDashboardModal
        isOpen={!!viewingService}
        onClose={() => setViewingService(null)}
        service={viewingService}
        isAr={isAr}
      />
    </div>
  );
};

export default Services;
