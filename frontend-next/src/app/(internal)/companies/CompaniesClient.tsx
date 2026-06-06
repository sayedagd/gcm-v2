"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useStore } from '@/context';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileDown, Upload, Settings,
  ShieldCheck, LayoutGrid, List as ListIcon, DownloadCloud, Building2, ChevronLeft, ChevronRight, Eye, Edit2, Trash2, AlertCircle
} from 'lucide-react';
import {
  Card, StatCard, Table, Modal, Button, PageHeader, EmptyState
} from '@/components';
import { Company, Role, NotificationType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  formatDate, handleImageError
} from '@/utils/helpers';
import { exportFromSchema, importFromSchema, exportTemplateFromSchema } from '@/utils/excelUtils';
import { companySchema } from '@/utils/excelSchemas';
import CompanyCard from '@/components/companies/CompanyCard';
import { useDebounce } from '@/hooks/useDebounce';
import { resolveLocalizedError } from '@/lib/errorMessages';
import { toast } from '@/utils/toast';
import { SkeletonFullPage } from '@/components/common/PageSkeleton';

const CompanyWizard = dynamic(() => import('@/components/companies/CompanyWizard'));
const CompanyDetails = dynamic(() => import('@/components/companies/CompanyDetails'));

const Companies: React.FC = () => {
  const searchParams = useSearchParams();

  const {
    companies, projects, upsertCompany, deleteCompany,
    saasConfig, currentUser, exportEnabled, addNotification,
    services, projectServices, trips, users, booting
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Partial<Company> | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(['company_name', 'commercial_reg', 'vat_no', 'projects_count', 'contact', 'actions']);
  const [wizardStep, setWizardStep] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [isImporting, setIsImporting] = useState(false);

  const PAGE_SIZE = 6;
  const csvInputRef = useRef<HTMLInputElement>(null);
  const isAr = saasConfig.language === 'ar';
  const canManage = currentUser?.role === Role.ADMIN && saasConfig.managementControlsEnabled !== false;
  const debouncedSearch = useDebounce(searchTerm, 300);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Deep Linking Handler
  useEffect(() => {
    let timerId: number | undefined;
    const companyId = searchParams.get('id');
    if (companyId && companies.length > 0) {
      const company = companies.find(c => c.company_id === companyId);
      if (company) {
        timerId = window.setTimeout(() => {
          setSelectedCompany(company);
          setIsDetailModalOpen(true);
        }, 0);
      }
    }

    return () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [searchParams, companies]);

  const filteredCompanies = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return companies;
    return companies.filter(c =>
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.commercial_reg || '').includes(q)
    );
  }, [companies, debouncedSearch]);

  const totalPages = Math.ceil(filteredCompanies.length / PAGE_SIZE);
  const indexOfLastItem = currentPage * PAGE_SIZE;
  const indexOfFirstItem = indexOfLastItem - PAGE_SIZE;
  const paginatedCompanies = useMemo(() => {
    return filteredCompanies.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredCompanies, indexOfFirstItem, indexOfLastItem]);

  const companyStats = useMemo(() => {
    let active = 0;
    let allStopped = 0;

    companies.forEach(company => {
      const companyProjects = projects.filter(p => p.company_id === company.company_id);
      if (companyProjects.length === 0) return;

      const hasActive = companyProjects.some(p => p.status === 'ACTIVE');
      if (hasActive) {
        active++;
      } else {
        allStopped++;
      }
    });

    return { active, allStopped };
  }, [companies, projects]);

  if (booting) return <SkeletonFullPage variant="cards" />;

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const { added, updated, failed } = await importFromSchema(file, companySchema, companies, upsertCompany);
      toast.success(isAr
        ? `تم الاستيراد: ${added} جديد، ${updated} محدث، ${failed} فشل`
        : `Import Complete: ${added} added, ${updated} updated, ${failed} failed`);
    } catch {
      toast.error(isAr ? 'خطأ في قراءة الملف' : 'Error reading file');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const validateForm = () => {
    if (!currentCompany?.company_name) return isAr ? 'اسم الشركة مطلوب' : 'Company name is required';
    if (!currentCompany?.commercial_reg) return isAr ? 'رقم السجل التجاري مطلوب' : 'CR Number is required';
    if (!currentCompany?.vat_no) return isAr ? 'الرقم الضريبي مطلوب' : 'VAT Number is required';
    if (!currentCompany?.contact_name) return isAr ? 'اسم المسؤول مطلوب' : 'Contact person is required';
    if (!currentCompany?.contact_phone) return isAr ? 'رقم الجوال مطلوب' : 'Mobile number is required';
    return '';
  };

  const handleSave = async () => {
    if (!currentCompany) {
      setFormError(isAr ? 'بيانات الشركة غير متاحة' : 'Company data is unavailable');
      return;
    }

    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      await upsertCompany({
        ...currentCompany,
        company_id: currentCompany.company_id || `C-${Date.now().toString().slice(-6)}`,
        client_since: currentCompany.client_since || formatDate(new Date().toISOString(), 'yyyy-MM-dd')
      } as Company);
      setIsModalOpen(false);
      setCurrentCompany(null);
      addNotification({ title: 'Success', message: isAr ? 'تم حفظ بيانات الشركة' : 'Company updated successfully', type: NotificationType.SUCCESS });
    } catch (error: unknown) {
      setFormError(resolveLocalizedError(error, isAr, 'خطأ أثناء الحفظ', 'Error saving company'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaptureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        setCurrentCompany(p => ({ ...(p || {}), main_location_url: url }));
      }, () => {
        setFormError(isAr ? 'فشل التقاط الموقع. تأكد من تفعيل الـ GPS' : 'Failed to capture location. Ensure GPS is enabled.');
      });
    }
  };

  return (
    <div className="space-y-10 max-w-[1700px] mx-auto pb-40 px-4 md:px-10">
      <PageHeader
        title={isAr ? 'قاعدة بيانات الشركاء' : 'Partners Hub'}
        subtitle={isAr ? 'إدارة العقود والبيانات التجارية للعملاء' : 'Main contracts and commercial records control.'}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        isAr={isAr}
        actionLabel={canManage ? (isAr ? 'إضافة شريك' : 'New Company') : undefined}
        onActionClick={() => {
          setCurrentCompany({ client_since: formatDate(new Date().toISOString(), 'yyyy-MM-dd') });
          setWizardStep(1);
          setFormError('');
          setIsModalOpen(true);
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-subtle p-1 rounded-xl border border-border shadow-sm transition-all hover:bg-surface">
            <Button
              variant="ghost"
              data-testid="grid-view-btn"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-surface text-primary shadow-sm scale-105' : 'text-text-subtle opacity-60'}`}
              icon={LayoutGrid}
            />
            <Button
              variant="ghost"
              data-testid="list-view-btn"
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-surface text-primary shadow-sm scale-105' : 'text-text-subtle opacity-60'}`}
              icon={ListIcon}
            />
          </div>

          {exportEnabled && (
            <>
              <Button
                variant="secondary"
                onClick={() => exportFromSchema(companies, companySchema, `GCM_Companies_${formatDate(new Date().toISOString(), 'yyyy-MM-dd')}`)}
                icon={DownloadCloud}
                className="!py-4"
              >
                {isAr ? 'تصدير' : 'Export'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => exportTemplateFromSchema(companySchema, 'GCM_Companies_Template')}
                icon={FileDown}
                className="!py-4"
              >
                {isAr ? 'قالب' : 'Template'}
              </Button>
              <input type="file" ref={csvInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
              <Button
                variant="secondary"
                onClick={() => csvInputRef.current?.click()}
                icon={Upload}
                isLoading={isImporting}
                className="!py-4"
              >
                {isAr ? 'استيراد' : 'Import'}
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
        <StatCard title={isAr ? 'إجمالي الشركات' : 'Total Companies'} value={companies.length} icon={Building2} variant="blue" />
        <StatCard title={isAr ? 'شركات بمشاريع نشطة' : 'Active Contracts'} value={companyStats.active} icon={ShieldCheck} variant="emerald" />
        <StatCard title={isAr ? 'شركات بمشاريع متوقفة' : 'Stopped Projects'} value={companyStats.allStopped} icon={AlertCircle} variant="rose" />
      </div>

      <div className="px-6 flex flex-col gap-6">
        {viewMode === 'list' && (
          <div className="flex items-center gap-2 bg-surface-subtle p-2 rounded-2xl border border-border w-fit">
            <Settings size={18} className="text-text-subtle mx-2" />
            <div className="flex gap-1">
              {['company_name', 'commercial_reg', 'vat_no', 'projects_count', 'contact'].map(col => (
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
                      key: 'company_name',
                      label: isAr ? 'الكيان التجاري' : 'COMMERCIAL ENTITY',
                      render: (val: unknown, row: Company) => (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-subtle border border-border flex items-center justify-center overflow-hidden shrink-0">
                            {row.logo_url ? <Image src={row.logo_url} onError={handleImageError} className="w-full h-full object-contain" alt={row.company_name} width={40} height={40} unoptimized /> : <span className="text-sm font-bold text-primary">{String(val || 'C').charAt(0)}</span>}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <Link href={`/c?id=${row.company_id}`} onClick={e => e.stopPropagation()} className="font-bold text-text-main text-sm truncate uppercase tracking-tight hover:text-primary hover:underline focus:outline-none">{String(val || '---')}</Link>
                            <span className="text-[8px] font-bold text-text-subtle uppercase tracking-widest">{row.commercial_reg}</span>
                          </div>
                        </div>
                      )
                    },
                    { key: 'commercial_reg', label: isAr ? 'السجل' : 'CR NO', render: (v: unknown) => <span className="font-mono text-xs font-bold text-text-subtle">{String(v || '')}</span> },
                    { key: 'vat_no', label: isAr ? 'الضريبة' : 'VAT', render: (v: unknown) => <span className="font-mono text-xs font-bold text-success">{String(v || '')}</span> },
                    { key: 'projects_count', label: isAr ? 'المواقع' : 'SITES', render: (_: unknown, row: Company) => <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg font-bold text-xs">{projects.filter(p => p.company_id === row.company_id).length}</span> },
                    { key: 'contact', label: isAr ? 'المسؤول' : 'CONTACT', render: (_: unknown, row: Company) => <div className="space-y-0.5"><p className="font-bold text-text-main text-xs">{row.contact_name}</p><p className="text-[10px] text-text-subtle font-bold">{row.contact_phone}</p></div> },
                    {
                      key: 'actions',
                      label: '',
                      render: (_: unknown, row: Company) => (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); setSelectedCompany(row); setIsDetailModalOpen(true); }} className="text-primary hover:bg-primary/10" />
                          {canManage && (
                            <>
                              <Button variant="ghost" icon={Edit2} onClick={(e) => { e.stopPropagation(); setCurrentCompany(row); setWizardStep(1); setIsModalOpen(true); }} className="text-text-subtle hover:text-primary" />
                              <Button variant="ghost" icon={Trash2} onClick={(e) => { e.stopPropagation(); setCompanyToDelete(row); setIsDeleteModalOpen(true); }} className="text-text-subtle hover:text-danger" />
                            </>
                          )}
                        </div>
                      )
                    }
                  ].filter(c => c.key === 'actions' || c.key === 'company_name' || visibleColumns.includes(c.key))}
                  data={paginatedCompanies}
                  onRowClick={(row) => { setSelectedCompany(row); setIsDetailModalOpen(true); }}
                  emptyMessage={<EmptyState icon={Building2} title={isAr ? 'لا توجد منشآت' : 'No Partners Found'} />}
                />
              </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ">
              {paginatedCompanies.map((company) => (
                <CompanyCard
                  key={company.company_id}
                  company={company}
                  projects={projects}
                  isAr={isAr}
                  canManage={canManage}
                  onView={() => { setSelectedCompany(company); setIsDetailModalOpen(true); }}
                  onEdit={() => { setCurrentCompany(company); setIsModalOpen(true); setWizardStep(1); }}
                  onDelete={() => { setCompanyToDelete(company); setIsDeleteModalOpen(true); }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Pagination - Sticky */}
        {filteredCompanies.length > PAGE_SIZE && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-4 bg-surface sticky bottom-0 z-10 border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className={`flex flex-col ${isAr ? 'items-end' : 'items-start'} gap-1`}>
              <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest leading-none">Scanning Database</p>
              <p className="text-xs font-bold text-text-subtle">
                {isAr ? 'عرض' : 'Showing'} <span className="text-primary font-bold">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredCompanies.length)}</span> {isAr ? 'من أصل' : 'of'} <span className="text-text-main font-bold">{filteredCompanies.length}</span> {isAr ? 'شريك' : 'Partners'}
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
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`btn-pagination ${currentPage === i + 1 ? 'active' : ''}`}>{i + 1}</button>
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

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={isAr ? 'تحذير أمني - حذف بيانات شريك' : 'Security Clearance - Partner Removal'}>
        <div className="p-6 space-y-6 text-center">
          <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto text-danger shadow-inner"><AlertCircle size={40} /></div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-text-main uppercase">{isAr ? 'هل أنت متأكد تماماً؟' : 'Are you absolutely sure?'}</h3>
            <p className="text-sm text-text-subtle font-bold leading-relaxed">{isAr ? `سيتم إلغاء تفعيل حساب (${companyToDelete?.company_name}). هذا الإجراء إداري نهائي.` : `Partner account (${companyToDelete?.company_name}) will be decommissioned. This action is terminal and cannot be reversed.`}</p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 uppercase font-bold text-xs tracking-widest">{isAr ? 'إابطال' : 'Abort'}</Button>
            <Button variant="primary" onClick={() => { if (companyToDelete) deleteCompany(companyToDelete.company_id); setIsDeleteModalOpen(false); }} className="flex-1 py-4 bg-danger border-none text-surface shadow-xl shadow-danger/20 uppercase font-bold text-xs tracking-widest">{isAr ? 'تأكيد الحذف' : 'Authorize Wipe'}</Button>
          </div>
        </div>
      </Modal>

      <CompanyWizard
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentCompany={currentCompany}
        setCurrentCompany={setCurrentCompany}
        wizardStep={wizardStep}
        setWizardStep={setWizardStep}
        isAr={isAr}
        handleSave={handleSave}
        isSubmitting={isSubmitting}
        formError={formError}
        handleCaptureLocation={handleCaptureLocation}
        users={users}
      />

      <CompanyDetails
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        company={selectedCompany}
        projects={projects}
        trips={trips}
        projectServices={projectServices}
        services={services}
        isAr={isAr}
        onEdit={() => {
          setIsDetailModalOpen(false);
          if (!selectedCompany) return;
          setCurrentCompany(selectedCompany);
          setIsModalOpen(true);
          setWizardStep(1);
        }}
      />
    </div>
  );
};

export default Companies;
