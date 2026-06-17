"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useStore } from '@/context';
import { useSupplierRates } from '@/store/useSupplierRates';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Briefcase, FileDown, Upload, Eye, Settings, LayoutGrid, List as ListIcon, DownloadCloud, Activity, Box, Clock, AlertTriangle, Edit2, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  Card, StatCard, Table, Modal, Button, PageHeader, EmptyState
} from '@/components';
import { Project, Role, NotificationType, ProjectService } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  formatDate, calculateTimeProgress, handleImageError
} from '@/utils/helpers';
import { exportFromSchema, importFromSchema, exportTemplateFromSchema } from '@/utils/excelUtils';
import { projectSchema } from '@/utils/excelSchemas';
import ProjectCard from '@/components/projects/ProjectCard';
import ProjectWizard from '@/components/projects/ProjectWizard';
import ProjectDetails from '@/components/projects/ProjectDetails';
import ApproachingServicesModal from '@/components/projects/ApproachingServicesModal';
import ActiveServicesDashboardModal from '@/components/projects/ActiveServicesDashboardModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { useProjectsPageMetrics } from '@/features/projects/useProjectsPageMetrics';
import { SkeletonFullPage } from '@/components/common/PageSkeleton';
import { resolveLocalizedError } from '@/lib/errorMessages';

const Projects: React.FC = () => {
  const searchParams = useSearchParams();
  const {
    projects, companies, upsertProject, deleteProject,
    saasConfig, currentUser, exportEnabled, addNotification,
    services, projectServices, upsertProjectService, deleteProjectService,
    suppliers, trips, users, booting
  } = useStore();

  const { rates: supplierRates, addRate: addSupplierRate, deleteRate: deleteSupplierRate } = useSupplierRates();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentProject, setCurrentProject] = useState<Partial<Project> | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(['project_name', 'company', 'status', 'progress', 'actions']);
  const [wizardStep, setWizardStep] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [tempProjectServices, setTempProjectServices] = useState<Partial<ProjectService>[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [isApproachingModalOpen, setIsApproachingModalOpen] = useState(false);
  const [isActiveServicesModalOpen, setIsActiveServicesModalOpen] = useState(false);

  const PAGE_SIZE = 6;
  const isAr = saasConfig.language === 'ar';
  const canManage = currentUser.role === Role.ADMIN && saasConfig.managementControlsEnabled !== false;
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { companyMap } = useLookupMaps();

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Deep Linking Handler
  useEffect(() => {
    let timerId: number | undefined;
    const projectId = searchParams.get('id');
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.project_id === projectId);
      if (project) {
        timerId = window.setTimeout(() => {
          setSelectedProject(project);
          setIsDetailModalOpen(true);
        }, 0);
      }
    }

    return () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [searchParams, projects]);

  const {
    filteredProjects,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    paginatedProjects,
    calculateBudgetProgress,
    calculateQuantityProgress,
    projectStats,
  } = useProjectsPageMetrics({
    projects,
    projectServices,
    trips,
    companyMap,
    debouncedSearch,
    currentPage,
    pageSize: PAGE_SIZE,
  });

  if (booting) return <SkeletonFullPage variant="cards" />;

  const validateStep = (step: number) => {
    setFormError('');
    if (step === 1) {
      if (!currentProject?.project_name) { setFormError(isAr ? 'اسم المشروع مطلوب' : 'Project Name is required'); return false; }
      if (!currentProject?.company_id) { setFormError(isAr ? 'يجب اختيار العميل' : 'Client selection is required'); return false; }
      if (!currentProject?.start_date || !currentProject?.end_date) { setFormError(isAr ? 'تواريخ المشروع مطلوبة' : 'Project duration dates are required'); return false; }
    }
    return true;
  };

  const handleSaveProject = async () => {
    if (!validateStep(1)) return;
    setIsSubmitting(true);
    try {
      const finalQty = tempProjectServices.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
      const finalBudget = tempProjectServices.reduce((acc, s) => acc + ((Number(s.quantity) || 0) * (Number(s.unit_price) || 0)), 0);

      const projectId = currentProject?.project_id || `P-${Date.now()}`;
      await upsertProject({
        ...currentProject,
        project_id: projectId,
        company_id: currentProject?.company_id || '',
        project_name: currentProject?.project_name || '',
        status: currentProject?.status || 'active',
        total_quantities: String(finalQty),
        budget: finalBudget
      } as unknown as Project);

      // Save Project Services — Delete removed, then upsert current
      const currentServiceIds = new Set(tempProjectServices.map(s => s.service_id));
      const existingServices = projectServices.filter(ps => ps.project_id === projectId);

      for (const ex of existingServices) {
        if (!currentServiceIds.has(ex.service_id)) {
          await deleteProjectService(ex.id!);
        }
      }

      for (const svc of tempProjectServices) {
        // Find if this service already exists in DB (by project_id + service_id match)
        const existingMatch = existingServices.find(ex => ex.service_id === svc.service_id);

        const payload: Partial<ProjectService> & {
          quantity: number;
          unit_price: number;
          total_cost: number;
          warning_threshold: number;
          id?: string;
        } = {
          ...svc,
          project_id: projectId,
          quantity: Number(svc.quantity) || 0,
          unit_price: Number(svc.unit_price) || 0,
          total_cost: (Number(svc.quantity) || 0) * (Number(svc.unit_price) || 0),
          warning_threshold: Number(svc.warning_threshold) || 0
        };

        // If an existing DB record found for this service_id — use its real id for UPDATE
        if (existingMatch?.id) {
          payload.id = String(existingMatch.id); // Always send as string (DB column is now VARCHAR)
        } else if (typeof payload.id === 'string' && payload.id.startsWith('TEMP-')) {
          delete payload.id; // Remove temp IDs — backend generates a proper string ID
        }

        await upsertProjectService(payload as ProjectService);
      }

      setIsModalOpen(false);
      setCurrentProject(null);
      setTempProjectServices([]);
      addNotification({ type: NotificationType.SUCCESS, title: 'Success', message: isAr ? 'تم حفظ المشروع بنجاح' : 'Project deployed successfully' });
    } catch (err: unknown) {
      console.error('[Project Save Error]', err);
      setFormError(resolveLocalizedError(err, isAr, 'خطأ أثناء حفظ المشروع', 'Failed to save project'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaptureGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        setCurrentProject(p => ({ ...p, location: url }));
      }, () => {
        addNotification({ type: NotificationType.ERROR, title: 'GPS Error', message: isAr ? 'فشل تحديد الموقع' : 'GPS location failed' });
      });
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const { added, failed } = await importFromSchema(file, projectSchema, projects, upsertProject);
      addNotification({
        type: NotificationType.SUCCESS,
        title: isAr ? 'تم الاستيراد' : 'Import Complete',
        message: isAr ? `تم استيراد ${added} مشروع بنجاح` : `Successfully imported ${added} projects`
      });
    } catch (err) {
      addNotification({
        type: NotificationType.ERROR,
        title: isAr ? 'فشل الاستيراد' : 'Import Failed',
        message: isAr ? 'حدث خطأ أثناء قراءة ملف الاكسل' : 'Error reading Excel file'
      });
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="w-full min-w-0 space-y-10 pb-40 px-4 md:px-10">
      <PageHeader
        title={isAr ? 'إدارة المشاريع والمواقع' : 'Project Command Center'}
        subtitle={isAr ? 'التحكم المركزي في مشاريع العملاء والعمليات الميدانية' : 'Centralized control for client deployments and field operations.'}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        isAr={isAr}
        actionLabel={canManage ? (isAr ? 'مشروع جديد' : 'New Deployment') : undefined}
        onActionClick={() => {
          setCurrentProject({ start_date: formatDate(new Date().toISOString(), 'yyyy-MM-dd'), status: 'ACTIVE' });
          setTempProjectServices([]);
          setWizardStep(1);
          setFormError('');
          setIsModalOpen(true);
        }}
      >
        <div className="flex items-center gap-2">
          {exportEnabled && (
            <>
              <Button
                variant="secondary"
                onClick={() => exportFromSchema(filteredProjects, projectSchema, `GCM_Projects_${formatDate(new Date().toISOString(), 'yyyy-MM-dd')}`)}
                icon={DownloadCloud}
                className="!py-4"
              >
                {isAr ? 'تصدير' : 'Export'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => exportTemplateFromSchema(projectSchema, 'GCM_Projects_Template')}
                icon={FileDown}
                className="!py-4"
              >
                {isAr ? 'قالب' : 'Template'}
              </Button>
              <input type="file" className="hidden" id="project-excel-import" accept=".xlsx,.xls" onChange={handleImportExcel} />
              <Button
                variant="secondary"
                onClick={() => document.getElementById('project-excel-import')?.click()}
                icon={Upload}
                isLoading={isImporting}
                className="!py-4"
              >
                {isAr ? 'استيراد' : 'Import'}
              </Button>
            </>
          )}

          <div className="flex bg-surface-subtle p-1 rounded-xl border border-border shadow-sm transition-all hover:bg-surface">
            <Button
              variant="ghost"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-surface text-primary shadow-sm scale-105' : 'text-text-subtle opacity-60'}`}
              icon={LayoutGrid}
            />
            <Button
              variant="ghost"
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-surface text-primary shadow-sm scale-105' : 'text-text-subtle opacity-60'}`}
              icon={ListIcon}
            />
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-6">
        <StatCard title={isAr ? 'إجمالي المشاريع' : 'Total Projects'} value={projectStats.total} icon={Briefcase} variant="blue" />
        <StatCard title={isAr ? 'المشاريع النشطة' : 'Active Projects'} value={projectStats.active} icon={Activity} variant="emerald" />
        <StatCard title={isAr ? 'منتهية بسبب المدة' : 'Ended (Duration)'} value={projectStats.endedDueToDuration} icon={Clock} variant="rose" />
        <StatCard title={isAr ? 'منتهية بسبب الكمية' : 'Ended (Quantity)'} value={projectStats.endedDueToQuantity} icon={Box} variant="rose" />
        <div onClick={() => setIsApproachingModalOpen(true)} className="cursor-pointer transition-transform hover:scale-105 active:scale-95">
          <StatCard title={isAr ? 'مشاريع مقتربة' : 'Approaching Limit'} value={projectStats.approachingLimit} icon={AlertTriangle} variant="amber" />
        </div>
        <div onClick={() => setIsActiveServicesModalOpen(true)} className="cursor-pointer transition-transform hover:scale-105 active:scale-95">
          <StatCard title={isAr ? 'إجمالي الخدمات' : 'Active Services'} value={projectStats.totalActiveServices} icon={LayoutGrid} variant="purple" />
        </div>
      </div>

      <div className="px-6 flex flex-col gap-6">
        {viewMode === 'list' && (
          <div className="flex items-center gap-2 bg-surface-subtle p-2 rounded-2xl border border-border w-fit">
            <Settings size={18} className="text-text-subtle mx-2" />
            <div className="flex gap-1">
              {['project_name', 'company', 'status', 'progress'].map(col => (
                <Button
                  key={col}
                  variant={visibleColumns.includes(col) ? 'primary' : 'ghost'}
                  onClick={() => setVisibleColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-tight transition-all ${visibleColumns.includes(col) ? '' : 'text-text-subtle hover:text-text-main'}`}
                >
                  {col.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="rounded-2xl overflow-hidden border border-border shadow-lg">
                <Table
                  isAr={isAr}
                  columns={[
                    {
                      key: 'project_name',
                      label: isAr ? 'المشروع' : 'PROJECT',
                      render: (val: unknown, row: Project) => (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-subtle border border-border flex items-center justify-center overflow-hidden shrink-0">
                            {row.logo_url ? <Image src={row.logo_url} onError={handleImageError} className="w-full h-full object-contain" alt={row.project_name} width={40} height={40} unoptimized /> : <Briefcase size={20} className="text-text-subtle opacity-30" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <Link href={`/p?id=${row.project_id}`} onClick={e => e.stopPropagation()} className="font-bold text-text-main text-sm truncate uppercase tracking-tight hover:text-primary hover:underline focus:outline-none">{String(val ?? '')}</Link>
                            <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">#{row.project_id}</span>
                          </div>
                        </div>
                      )
                    },
                    {
                      key: 'company',
                      label: isAr ? 'العميل' : 'CLIENT',
                      render: (_: unknown, row: Project) => <span className="font-bold text-xs text-text-subtle uppercase tracking-tight">{companyMap[row.company_id]?.company_name}</span>
                    },
                    {
                      key: 'status',
                      label: isAr ? 'الحالة' : 'STATUS',
                      render: (_: unknown, row: Project) => (
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${row.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-surface-subtle text-text-subtle'}`}>
                          {row.status}
                        </span>
                      )
                    },
                    {
                      key: 'progress',
                      label: isAr ? 'الإنجاز' : 'PROGRESS',
                      render: (_: unknown, row: Project) => (
                        <div className="w-24 h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${calculateQuantityProgress(row.project_id)}%` }} />
                        </div>
                      )
                    },
                    {
                      key: 'actions',
                      label: '',
                      render: (_: unknown, row: Project) => (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); setSelectedProject(row); setIsDetailModalOpen(true); }} className="text-primary hover:bg-primary/10" />
                          {canManage && (
                            <>
                              <Button variant="ghost" icon={Edit2} onClick={(e) => {
                                e.stopPropagation();
                                setCurrentProject(row);
                                setTempProjectServices(projectServices.filter(ps => ps.project_id === row.project_id));
                                setWizardStep(1);
                                setIsModalOpen(true);
                              }} className="text-text-subtle hover:text-primary" />
                              <Button variant="ghost" icon={Trash2} onClick={(e) => { e.stopPropagation(); setProjectToDelete(row); setIsDeleteModalOpen(true); }} className="text-text-subtle hover:text-danger" />
                            </>
                          )}
                        </div>
                      )
                    }
                  ].filter(c => c.key === 'actions' || visibleColumns.includes(c.key))}
                  data={paginatedProjects}
                  onRowClick={(row) => { setSelectedProject(row); setIsDetailModalOpen(true); }}
                  emptyMessage={<EmptyState icon={Briefcase} title={isAr ? 'لا توجد مشاريع' : 'No Projects Found'} />}
                />
              </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProjects.map((project) => (
                <ProjectCard
                  key={project.project_id}
                  project={project}
                  company={companyMap[project.company_id]}
                  budgetProgress={calculateBudgetProgress(project.project_id)}
                  qtyProgress={calculateQuantityProgress(project.project_id)}
                  timeProgress={calculateTimeProgress(project.start_date, project.end_date)}
                  isAr={isAr}
                  canManage={canManage}
                  onView={() => { setSelectedProject(project); setIsDetailModalOpen(true); }}
                  onEdit={() => {
                    setCurrentProject(project);
                    setTempProjectServices(projectServices.filter(ps => ps.project_id === project.project_id));
                    setWizardStep(1);
                    setIsModalOpen(true);
                  }}
                  onDelete={() => { setProjectToDelete(project); setIsDeleteModalOpen(true); }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Pagination - Sticky */}
        {filteredProjects.length > PAGE_SIZE && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-4 bg-surface sticky bottom-0 z-10 border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className={`flex flex-col ${isAr ? 'items-end' : 'items-start'} gap-1`}>
              <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest leading-none">Scanning Projects Database</p>
              <p className="text-xs font-bold text-text-subtle">
                {isAr ? 'عرض' : 'Showing'} <span className="text-primary font-bold">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProjects.length)}</span> {isAr ? 'من أصل' : 'of'} <span className="text-text-main font-bold">{filteredProjects.length}</span> {isAr ? 'موقع عمل' : 'Sites'}
              </p>
            </div>
            <div className="flex items-center gap-2" dir="ltr">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                icon={ChevronLeft}
              />
              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`btn-pagination ${currentPage === i + 1 ? 'active' : ''}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                icon={ChevronRight}
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={isAr ? 'تحذير أمنـي - حذف مشروع' : 'Security Clearance - Project Deletion'}>
        <div className="p-6 space-y-6 text-center">
          <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto text-danger shadow-inner">
            <AlertTriangle size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-text-main uppercase">{isAr ? 'هل أنت متأكد تماماً؟' : 'Are you absolutely sure?'}</h3>
            <p className="text-sm text-text-subtle font-bold leading-relaxed">{isAr ? `سيتم نقل مشروع (${projectToDelete?.project_name}) إلى الأرشيف. لا يمكن التراجع عن هذا الإجراء.` : `Project (${projectToDelete?.project_name}) will be decommissioned. This action is terminal and cannot be reversed.`}</p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 uppercase font-bold text-xs tracking-widest">{isAr ? 'إلغاء' : 'Abort'}</Button>
            <Button variant="primary" onClick={() => { if (projectToDelete) deleteProject(projectToDelete.project_id); setIsDeleteModalOpen(false); }} className="flex-1 py-4 bg-danger border-none text-surface shadow-xl shadow-danger/20 uppercase font-bold text-xs tracking-widest">
              {isAr ? 'تأكيد الحذف' : 'Authorize Wipe'}
            </Button>
          </div>
        </div>
      </Modal>

      <ProjectWizard
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentProject={currentProject}
        setCurrentProject={setCurrentProject}
        wizardStep={wizardStep}
        setWizardStep={setWizardStep}
        isAr={isAr}
        companies={companies}
        services={services}
        suppliers={suppliers}
        tempProjectServices={tempProjectServices}
        setTempProjectServices={setTempProjectServices}
        expandedCategories={expandedCategories}
        setExpandedCategories={setExpandedCategories}
        handleCaptureGps={handleCaptureGps}
        handleSaveProject={handleSaveProject}
        validateStep={validateStep}
        isSubmitting={isSubmitting}
        formError={formError}
        users={users}
      />

      <ProjectDetails
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        project={selectedProject}
        companies={companies}
        isAr={isAr}
        projectServices={projectServices}
        services={services}
        suppliers={suppliers}
        addSupplierRate={addSupplierRate}
        deleteSupplierRate={deleteSupplierRate}
        supplierRates={supplierRates}
        trips={trips}
        onEdit={() => {
          setIsDetailModalOpen(false);
          if (!selectedProject) return;
          setCurrentProject(selectedProject);
          setTempProjectServices(projectServices.filter(ps => ps.project_id === selectedProject.project_id));
          setWizardStep(1);
          setIsModalOpen(true);
        }}
        budgetProgress={selectedProject ? calculateBudgetProgress(selectedProject.project_id) : 0}
        qtyProgress={selectedProject ? calculateQuantityProgress(selectedProject.project_id) : 0}
        timeProgress={selectedProject ? calculateTimeProgress(selectedProject.start_date, selectedProject.end_date) : 0}
      />

      <ApproachingServicesModal isOpen={isApproachingModalOpen} onClose={() => setIsApproachingModalOpen(false)} />
      <ActiveServicesDashboardModal isOpen={isActiveServicesModalOpen} onClose={() => setIsActiveServicesModalOpen(false)} />
    </div>
  );
};

export default Projects;
