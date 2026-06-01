import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
   Package, FileDown, Upload, LayoutGrid, List,
   ChevronLeft, ChevronRight,
   Map, DownloadCloud
} from 'lucide-react';
import { Card, Modal, Button, EmptyState, PageHeader, InventoryStats, InventoryCard, InventoryDetails, InventoryWizard } from '@/components';
import { useStore } from '@/context';
import { Role, NotificationType } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { formatDate } from '@/utils/helpers';
import { exportToExcel, exportFromSchema, exportTemplateFromSchema, importFromSchema, importFromExcel, exportTemplate } from '@/utils/excelUtils';
import { containerSchema, tankSchema } from '@/utils/excelSchemas';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/utils/toast';
import { useConfirmDialog } from '@/components/common/ConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { SkeletonFullPage } from '@/components/common/PageSkeleton';

const ITEMS_PER_PAGE = 9;

const Inventory: React.FC = () => {
   const {
      containers, tanks, inventorySizes, projects, companies, trips,
      upsertInventorySize, deleteInventorySize,
      upsertContainer, deleteContainer,
      upsertTank, deleteTank,
      saasConfig, exportEnabled, suppliers, currentUser, addNotification,
      services, assetServiceLinks, syncAssetServiceLinks, booting
   } = useStore();

   const [activeTab, setActiveTab] = useState<'containers' | 'tanks' | 'sizes'>('containers');
   const [searchTerm, setSearchTerm] = useState('');
   const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
   const [currentPage, setCurrentPage] = useState(1);

   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isViewMode, setIsViewMode] = useState(false);
   const [currentItem, setCurrentItem] = useState<any>(null);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [assetServiceIds, setAssetServiceIds] = useState<string[]>([]);

   const csvInputRef = useRef<HTMLInputElement>(null);
   const isAr = saasConfig.language === 'ar';
   const canManage = currentUser.role === Role.ADMIN && saasConfig.managementControlsEnabled !== false;
   const { confirm, ConfirmDialogRenderer } = useConfirmDialog();
   const debouncedSearch = useDebounce(searchTerm, 250);

   // Global Inventory Stats
   const globalStats = useMemo(() => ({
      totalBins: containers.length,
      activeBins: containers.filter(c => c.status === 'IN_USE').length,
      totalTanks: tanks.length,
      activeTanks: tanks.filter(t => t.status === 'IN_USE').length
   }), [containers, tanks]);

   // Reset pagination on tab or search change
   useEffect(() => {
      setCurrentPage(1);
   }, [activeTab, searchTerm]);

   const [searchParams] = useSearchParams();

   // Deep Linking Handler
   useEffect(() => {
      const id = searchParams.get('id');
      if (id) {
         let item: any = containers.find((c: any) => c.container_id === id);
         if (item) {
            setActiveTab('containers');
         } else {
            item = tanks.find((t: any) => t.tank_id === id);
            if (item) setActiveTab('tanks');
            else {
               item = inventorySizes.find((s: any) => s.size_id === id);
               if (item) setActiveTab('sizes');
            }
         }

         if (item) {
            setCurrentItem(item);
            setIsViewMode(true);
            setIsModalOpen(true);
         }
      }
   }, [searchParams, containers, tanks, inventorySizes]);

   // Filtered Items Logic
   const filteredItems = useMemo(() => {
      let rawItems = [];
      if (activeTab === 'containers') rawItems = containers;
      else if (activeTab === 'tanks') rawItems = tanks;
      else rawItems = inventorySizes;

      const term = debouncedSearch.toLowerCase();
      if (!term) return rawItems;
      return rawItems.filter(item => {
         const code = (item.code || '').toLowerCase();
         const supplier = (item.supplier_name || '').toLowerCase();
         const name = (item.name || '').toLowerCase();
         return code.includes(term) || supplier.includes(term) || name.includes(term);
      });
   }, [activeTab, debouncedSearch, containers, tanks, inventorySizes]);

   // Pagination Logic
   const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
   const paginatedItems = useMemo(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredItems.slice(start, start + ITEMS_PER_PAGE);
   }, [filteredItems, currentPage]);

   // Asset Stats (Similar to Fleet Analytics but simpler)
   const assetStats = useMemo(() => {
      if (!currentItem || activeTab === 'sizes') return { tripsCount: 0, lastTrip: null, history: [] };
      const id = currentItem.container_id || currentItem.tank_id;
      const tripsList = (trips || [])
         .filter(t => t.inventory_item_id === id)
         .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
         tripsCount: tripsList.length,
         lastTrip: tripsList[0] || null,
         history: tripsList
      };
   }, [trips, currentItem, activeTab]);

   if (booting) return <SkeletonFullPage variant="cards" />;

   const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
         let stats = { added: 0, updated: 0, unchanged: 0, failed: 0 };

         if (activeTab === 'containers') {
            stats = await importFromSchema(file, containerSchema, containers, upsertContainer);
         } else if (activeTab === 'tanks') {
            stats = await importFromSchema(file, tankSchema, tanks, upsertTank);
         } else {
            // Sizes — kept as simple manual import (no complex documents)
            const data = await importFromExcel<Record<string, any>>(file);
            for (const row of data) {
               try {
                  const id = row['Size ID'] || row['size_id'];
                  const name = row['Name'] || row['name'];
                  const type = row['Type'] || row['type'] || 'CONTAINER';
                  if (!name) { stats.failed++; continue; }
                  const found = inventorySizes.find(s => s.size_id === id);
                  if (found && found.name === name && found.type === type) { stats.unchanged++; continue; }
                  found ? stats.updated++ : stats.added++;
                  upsertInventorySize({ size_id: id || `SZ-${Date.now()}`, name, type: type as any });
               } catch { stats.failed++; }
            }
         }

         toast.success(isAr
            ? `تم الاستيراد: ${stats.added} جديد، ${stats.updated} محدث، ${stats.unchanged} متطابق${stats.failed > 0 ? `، ${stats.failed} فشل` : ''}`
            : `Import Complete: ${stats.added} added, ${stats.updated} updated, ${stats.unchanged} unchanged${stats.failed > 0 ? `, ${stats.failed} failed` : ''}`);
         e.target.value = '';
      } catch (err: any) {
         toast.error(isAr ? 'فشل الاستيراد: ' + err.message : 'Import failed: ' + err.message);
      }
   };

   const handleSave = async () => {
      if (!currentItem) return;
      setIsSubmitting(true);
      try {
         if (activeTab === 'containers') {
            await upsertContainer({
               container_id: currentItem.container_id || `CON-${Date.now()}`,
               ...currentItem,
               status: currentItem.status || 'AVAILABLE',
               ownership: currentItem.ownership || 'OWN'
            });
         } else if (activeTab === 'tanks') {
            await upsertTank({
               tank_id: currentItem.tank_id || `TNK-${Date.now()}`,
               ...currentItem,
               status: currentItem.status || 'AVAILABLE',
               ownership: currentItem.ownership || 'OWN'
            });
         } else {
            await upsertInventorySize({
               size_id: currentItem.size_id || `SZ-${Date.now()}`,
               ...currentItem
            });
         }

         // Sync service links if not a size
         if (activeTab !== 'sizes') {
            const assetId = activeTab === 'containers' ? (currentItem.container_id || `CON-${Date.now()}`) : (currentItem.tank_id || `TNK-${Date.now()}`);
            const assetType = activeTab === 'containers' ? 'CONTAINER' : 'TANK';
            try {
               await syncAssetServiceLinks(assetType, assetId, assetServiceIds);
            } catch (linkErr) {
               console.warn('[Inventory] Service link sync failed:', linkErr);
            }
         }

         setIsModalOpen(false);
         addNotification({
            title: 'Success',
            message: isAr ? 'تم حفظ البيانات' : 'Asset data synchronized',
            type: NotificationType.SUCCESS
         });
      } catch (error: any) {
         addNotification({
            title: 'Error',
            message: error.message || 'Failed to save asset',
            type: NotificationType.ERROR
         });
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleEdit = (item: any) => {
      setCurrentItem({ ...item });
      setIsViewMode(false);
      
      const assetId = item.container_id || item.tank_id;
      const assetType = activeTab === 'containers' ? 'CONTAINER' : activeTab === 'tanks' ? 'TANK' : null;
      if (assetId && assetType) {
         const linked = assetServiceLinks
            .filter(l => l.asset_type === assetType && l.asset_id === assetId)
            .map(l => l.service_id);
         setAssetServiceIds(linked);
      } else {
         setAssetServiceIds([]);
      }
      
      setIsModalOpen(true);
   };

   const handleDelete = async (id: string) => {
      const ok = await confirm({
         title: isAr ? 'تأكيد الحذف' : 'Confirm Delete',
         message: isAr ? 'هل أنت متأكد من الحذف؟' : 'Decommission asset?',
         confirmLabel: isAr ? 'حذف' : 'Delete',
         variant: 'danger'
      });
      if (ok) {
         if (activeTab === 'containers') deleteContainer(id);
         else if (activeTab === 'tanks') deleteTank(id);
         else deleteInventorySize(id);
      }
   };

   return (
      <div className="space-y-10 max-w-7xl mx-auto pb-40 px-4">
         {/* Header Section */}
         <PageHeader
            title={isAr ? 'إدارة الأصول والمخزون' : 'Asset & Supply Hub'}
            subtitle={isAr ? 'تتبع الحاويات، الصهاريج، والمعدات الميدانية' : 'Centralized tracking for skip systems, fluid tanks, and field supplies.'}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            isAr={isAr}
            actionLabel={isAr ? 'إضافة أصل جديد' : 'New Asset'}
            onActionClick={() => { setCurrentItem(activeTab === 'sizes' ? { type: 'CONTAINER' } : { ownership: 'OWN', status: 'AVAILABLE', purchase_date: new Date().toISOString().split('T')[0], maintenance_logs: [] }); setIsViewMode(false); setIsModalOpen(true); }}
         >
            <div className="flex bg-surface p-1.5 rounded-2xl border border-border shadow-sm overflow-x-auto custom-scrollbar">
               {(['containers', 'tanks', 'sizes'] as const).map(t => (
                  <button
                     key={t}
                     onClick={() => setActiveTab(t)}
                     className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-surface-subtle text-primary shadow-sm' : 'text-text-subtle hover:text-primary'}`}
                  >
                     {t === 'containers' ? (isAr ? 'الحاويات' : 'Skips') : t === 'tanks' ? (isAr ? 'الصهاريج' : 'Fluid Tanks') : (isAr ? 'الأحجام' : 'Dimensions')}
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
                        onClick={() => {
                           if (activeTab === 'containers') {
                              exportFromSchema(filteredItems, containerSchema, `GCM_Inventory_containers_${formatDate(new Date(), 'yyyy-MM-dd')}`, 'Containers');
                           } else if (activeTab === 'tanks') {
                              exportFromSchema(filteredItems, tankSchema, `GCM_Inventory_tanks_${formatDate(new Date(), 'yyyy-MM-dd')}`, 'Tanks');
                           } else {
                              exportToExcel(
                                 filteredItems.map(i => ({ 'Size ID': i.size_id, 'Name': i.name, 'Type': i.type })),
                                 `GCM_Inventory_sizes_${formatDate(new Date(), 'yyyy-MM-dd')}`,
                                 'Sizes'
                              );
                           }
                        }}
                        icon={DownloadCloud}
                        className="!py-4"
                     >
                        {isAr ? 'تصدير' : 'Export'}
                     </Button>
                     <Button
                        variant="ghost"
                        onClick={() => {
                           if (activeTab === 'containers') {
                              exportTemplateFromSchema(containerSchema, 'GCM_containers_Template', 'Containers');
                           } else if (activeTab === 'tanks') {
                              exportTemplateFromSchema(tankSchema, 'GCM_tanks_Template', 'Tanks');
                           } else {
                              exportTemplate(['size_id', 'name', 'type'], 'GCM_sizes_Template');
                           }
                        }}
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

         {/* Global Stats */}
         <InventoryStats globalStats={globalStats} isAr={isAr} />

         {/* Main Browser Section */}
         <Card className="p-8 space-y-8">
            {/* Asset Cards */}
            {filteredItems.length === 0 ? (
               <EmptyState
                  icon={Package}
                  title={isAr ? 'لا يوجد أصول' : 'No assets found'}
                  description={isAr ? 'جرب البحث بمعايير مختلفة أو تبديل التصنيف' : 'Refine your query or deploy a new unit to the infrastructure.'}
               />
            ) : (
               <div className={viewType === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                  <AnimatePresence mode="popLayout">
                     {paginatedItems.map(item => {
                        const id = item.container_id || item.tank_id || item.scale_id || item.size_id; // Added scale_id
                        return (
                           <InventoryCard
                              key={id}
                              item={item}
                              activeTab={activeTab}
                              viewType={viewType}
                              isAr={isAr}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onView={(itm) => { setCurrentItem(itm); setIsViewMode(true); setIsModalOpen(true); }}
                              projects={projects}
                              inventorySizes={inventorySizes}
                           />
                        );
                     })}
                  </AnimatePresence>
               </div>
            )}

            {/* Pagination Controls - Sticky */}
            {totalPages > 1 && (
               <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-surface sticky bottom-0 z-10 border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] mt-4">
                  <p className="text-xs font-bold text-text-subtle uppercase tracking-widest">{isAr ? `عرض ${paginatedItems.length} أصول` : `Visualizing ${paginatedItems.length} of ${filteredItems.length} items`}</p>
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

         {/* Refined Modal (View & Edit) */}
         <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            size={isViewMode ? "2xl" : "lg"}
            title={isViewMode ? (isAr ? 'مركز الاستخبارات للأصل' : 'Asset Intelligence Hub') : (isAr ? 'هندسة بيانات الأصول' : 'Asset Data Engineering')}
         >
            <div className={`space-y-6 pt-2 ${isAr ? 'text-right' : 'text-left'}`}>
               {isViewMode ? (
                  <InventoryDetails
                     item={currentItem}
                     activeTab={activeTab}
                     isAr={isAr}
                     inventorySizes={inventorySizes}
                     projects={projects}
                     stats={assetStats}
                     onEdit={() => {
                        setIsViewMode(false);
                        setIsModalOpen(true);
                     }}
                     companies={companies}
                  />
               ) : (
                  <InventoryWizard
                     item={currentItem}
                     activeTab={activeTab}
                     isAr={isAr}
                     inventorySizes={inventorySizes}
                     projects={projects}
                     suppliers={suppliers}
                     onChange={setCurrentItem}
                     onSave={handleSave}
                     isSubmitting={isSubmitting}
                     onCancel={() => setIsModalOpen(false)}
                     services={services}
                     linkedServiceIds={assetServiceIds}
                     onServiceLinksChange={setAssetServiceIds}
                  />
               )}
            </div>
         </Modal>
         <ConfirmDialogRenderer />
      </div>
   );
};

export default Inventory;
