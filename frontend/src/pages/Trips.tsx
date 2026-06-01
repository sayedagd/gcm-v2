import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '@/context';
import { Truck, FileText, UserCheck, Briefcase, FileCheck, Package,
   Upload, Recycle, Filter, FileDown, Eye, DownloadCloud, Edit2, Trash2
} from 'lucide-react';
import { Trip, TripStatus, Role, NotificationType } from '@/types';
import {
   Card, Table, Button, PageHeader, Select, useConfirmDialog
} from '@/components';
import {
   formatDate, formatNumber
} from '@/utils/helpers';
import { subDays, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useSupplierRates } from '@/store/useSupplierRates';
import { exportFromSchema, importFromSchema, exportTemplateFromSchema } from '@/utils/excelUtils';
import { tripSchema } from '@/utils/excelSchemas';
import TripDetailsModal from '@/components/trips/TripDetailsModal';
import TripWizard from '@/components/trips/TripWizard';
import { SignatureApproveModal } from '@/components/ui/SignatureApproveModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { toast } from '@/utils/toast';
import { SkeletonFullPage } from '@/components/common/PageSkeleton';

const Trips: React.FC = () => {
   const {
      trips, projects, services, companies, vehicles, drivers,
      containers, inventorySizes, projectServices, upsertTrip,
      deleteTrip, saasConfig, currentUser, exportEnabled, users, addNotification, suppliers, booting
   } = useStore();

   const { rates: supplierRates, fetchRates: fetchSupplierRates } = useSupplierRates();
   const [searchParams] = useSearchParams();

   useEffect(() => {
      fetchSupplierRates();
   }, []);

   // State & Filters
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedServiceId, setSelectedServiceId] = useState('all');
   const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | 'REQUESTED' | 'IN_PROGRESS' | 'PENDING_DOCS' | 'PENDING_REVIEW' | 'COMPLETED'>('ALL');
   const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'TWO_DAYS_AGO' | 'LAST_WEEK' | 'CUSTOM'>('ALL');
   const [customDate, setCustomDate] = useState(formatDate(new Date().toISOString(), 'yyyy-MM-dd'));
   const [isModalOpen, setIsModalOpen] = useState(false);

   const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
   const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
   const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
   const [wizardInitialStep, setWizardInitialStep] = useState<number>(1);
   const [signatureModalTrip, setSignatureModalTrip] = useState<Trip | null>(null);
   const [currentPage, setCurrentPage] = useState(1);
   const [rowsPerPage, setRowsPerPage] = useState(25);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isImporting, setIsImporting] = useState(false);

   const isAr = saasConfig.language === 'ar';
   const canAdd = [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS].includes(currentUser.role);
   const canEdit = [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS, Role.REPORTS_MANAGER].includes(currentUser.role);
   const canApprove = [Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role);

   // Performance: debounce search input to prevent re-filtering on every keystroke
   const debouncedSearch = useDebounce(searchTerm, 300);
   // Performance: O(1) lookup maps instead of .find() in render loops
   const { projectMap, companyMap, driverMap, vehicleMap, serviceMap } = useLookupMaps();
   // UX: proper confirm dialog instead of window.confirm
   const { confirm, ConfirmDialogRenderer } = useConfirmDialog();

   useEffect(() => {
      const tripIdFromUrl = searchParams.get('id');
      if (tripIdFromUrl && trips.length > 0) {
         const trip = trips.find(t => t.trip_id === tripIdFromUrl);
         if (trip) {
            setSelectedTrip(trip);
            setIsDetailModalOpen(true);
         }
      }
   }, [searchParams, trips]);


   const translations = {
      title: isAr ? 'سجل العمليات الميدانية' : 'Field Operations Log',
      subtitle: isAr ? 'إدارة التوثيق، الأوزان، والترقيم الذكي للمستندات' : 'Smart lifecycle for trips, weights, and high-res documents.',
      newTrip: isAr ? 'تسجيل رحلة جديدة' : 'New Trip Entry',
      search: isAr ? 'البحث الذكي (المشروع، العميل، السائق، رقم المانفيست...)' : 'Global Search (Project, Client, Driver, Manifest ID...)',
      materialFilter: isAr ? 'تصفية حسب نوع الخدمة' : 'Service Filter',
      detailsTitle: isAr ? 'تقرير بيانات الرحلة الميدانية' : 'Field Trip Data Report',
      noData: isAr ? 'لم يتم العثور على أي رحلات' : 'No field data found matching query'
   };

   // Filtering Logic — uses debounced search + O(1) lookup maps for performance
   const filteredTrips = useMemo(() => {
      let list = trips.filter(t => {
         const proj = projectMap[t.project_id];
         const comp = proj ? companyMap[proj.company_id] : undefined;
         const driver = driverMap[t.driver_id];
         const vehicle = vehicleMap[t.vehicle_id];

         const searchStr = debouncedSearch.toLowerCase();
         const matchSearch = !searchStr ||
            t.trip_id.toLowerCase().includes(searchStr) ||
            (proj?.project_name || '').toLowerCase().includes(searchStr) ||
            (comp?.company_name || '').toLowerCase().includes(searchStr) ||
            (driver?.name || '').toLowerCase().includes(searchStr) ||
            (vehicle?.plate_no || '').toLowerCase().includes(searchStr) ||
            (t.waste_manifest_no || '').toLowerCase().includes(searchStr) ||
            (t.delivery_note_no || '').toLowerCase().includes(searchStr) ||
            (t.recycle_receipt_no || '').toLowerCase().includes(searchStr);

         const matchService = selectedServiceId === 'all' || t.service_id === selectedServiceId;

         let matchStatus = true;
         if (selectedStatusTab === 'REQUESTED') matchStatus = t.status === TripStatus.REQUESTED;
         else if (selectedStatusTab === 'IN_PROGRESS') matchStatus = t.status === TripStatus.IN_PROGRESS;
         else if (selectedStatusTab === 'PENDING_DOCS') matchStatus = t.status === TripStatus.PENDING_DOCS;
         else if (selectedStatusTab === 'PENDING_REVIEW') matchStatus = t.status === TripStatus.PENDING_REVIEW;
         else if (selectedStatusTab === 'COMPLETED') matchStatus = t.status === TripStatus.COMPLETED || t.status === TripStatus.CANCELLED;

         let matchDate = true;
         if (dateFilter !== 'ALL') {
             const tripDate = t.date;
             const todayStr = formatDate(new Date().toISOString(), 'yyyy-MM-dd');
             const yesterdayStr = formatDate(subDays(new Date(), 1).toISOString(), 'yyyy-MM-dd');
             const twoDaysAgoStr = formatDate(subDays(new Date(), 2).toISOString(), 'yyyy-MM-dd');
             
             if (dateFilter === 'TODAY') matchDate = tripDate === todayStr;
             else if (dateFilter === 'YESTERDAY') matchDate = tripDate === yesterdayStr;
             else if (dateFilter === 'TWO_DAYS_AGO') matchDate = tripDate === twoDaysAgoStr;
             else if (dateFilter === 'LAST_WEEK') {
                 try {
                     const pDate = parseISO(tripDate);
                     matchDate = isWithinInterval(pDate, { start: startOfDay(subDays(new Date(), 7)), end: endOfDay(new Date()) });
                 } catch(err) { matchDate = false; }
             }
             else if (dateFilter === 'CUSTOM') matchDate = tripDate === customDate;
         }

         return matchSearch && matchService && matchStatus && matchDate;
      });
      return list.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());
   }, [trips, projectMap, companyMap, driverMap, vehicleMap, debouncedSearch, selectedServiceId, selectedStatusTab, dateFilter, customDate]);

   const totalPages = Math.ceil(filteredTrips.length / rowsPerPage);
   const paginatedTrips = useMemo(() => {
      const start = (currentPage - 1) * rowsPerPage;
      return filteredTrips.slice(start, start + rowsPerPage);
   }, [filteredTrips, currentPage, rowsPerPage]);

   useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedServiceId, rowsPerPage, selectedStatusTab, dateFilter, customDate]);

   if (booting) return <SkeletonFullPage variant="table" />;

   const handleDelete = async (tripId: string) => {
      const ok = await confirm({
         title: isAr ? 'حذف الرحلة' : 'Delete Trip',
         message: isAr ? 'هل أنت متأكد من حذف هذه الرحلة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this trip? This action cannot be undone.',
         confirmLabel: isAr ? 'حذف' : 'Delete',
         variant: 'danger',
      });
      if (!ok) return;
      setIsSubmitting(true);
      try {
         await deleteTrip(tripId);
         toast.success(isAr ? 'تم حذف الرحلة' : 'Trip deleted successfully');
      } catch (err) {
         toast.error(isAr ? 'فشل الحذف' : 'Delete failed');
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
         const { added, failed } = await importFromSchema(file, tripSchema, trips, upsertTrip);
         toast.success(isAr ? `تم استيراد ${added} رحلة` : `Imported ${added} trips`);
      } catch (err) {
         toast.error(isAr ? 'خطأ في قراءة الملف' : 'Import failed');
      } finally {
         setIsImporting(false);
         if (e.target) e.target.value = '';
      }
   };

   const totalResults = filteredTrips.length;
   const startResult = (currentPage - 1) * rowsPerPage + 1;
   const endResult = Math.min(currentPage * rowsPerPage, totalResults);

   return (
      <div className="space-y-12 max-w-[1700px] mx-auto pb-40 px-4 md:px-10">
         <PageHeader
            title={translations.title}
            subtitle={translations.subtitle}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={translations.search}
            actionLabel={canAdd ? translations.newTrip : undefined}
            onActionClick={() => { setEditingTrip(null); setIsModalOpen(true); }}
            isAr={isAr}
         />

         {/* Advanced Filters & Actions Toolbar */}
         <div className="bg-surface/60 backdrop-blur-xl p-2 rounded-3xl border-2 border-border/50 shadow-sm flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between relative z-10">
               <div className="flex flex-col xl:flex-row gap-2 max-w-full overflow-hidden">
                  <div className="flex overflow-x-auto bg-surface p-1.5 rounded-2xl items-center shadow-sm border border-border gap-1 no-scrollbar shrink-0">
                     {['ALL', 'REQUESTED', 'IN_PROGRESS', 'PENDING_DOCS', 'PENDING_REVIEW', 'COMPLETED'].map((tab) => {
                        const count = tab === 'ALL' ? trips.length : trips.filter(t => {
                           if (tab === 'REQUESTED') return t.status === TripStatus.REQUESTED;
                           if (tab === 'IN_PROGRESS') return t.status === TripStatus.IN_PROGRESS;
                           if (tab === 'PENDING_DOCS') return t.status === TripStatus.PENDING_DOCS;
                           if (tab === 'PENDING_REVIEW') return t.status === TripStatus.PENDING_REVIEW;
                           if (tab === 'COMPLETED') return [TripStatus.COMPLETED, TripStatus.CANCELLED].includes(t.status as TripStatus);
                           return false;
                        }).length;

                        return (
                           <button
                              key={tab}
                              onClick={() => setSelectedStatusTab(tab as any)}
                              className={`shrink-0 px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all flex items-center gap-2 ${selectedStatusTab === tab ? 'bg-primary text-surface shadow-lg shadow-primary/30' : 'text-text-subtle hover:text-primary'}`}
                           >
                              {tab === 'ALL' ? (isAr ? 'الكل' : 'All') :
                                 tab === 'REQUESTED' ? (isAr ? 'طلبات' : 'Reqs') :
                                    tab === 'IN_PROGRESS' ? (isAr ? 'تنفيذ' : 'Active') :
                                       tab === 'PENDING_DOCS' ? (isAr ? 'وثائق' : 'Docs') :
                                          tab === 'PENDING_REVIEW' ? (isAr ? 'مراجعة' : 'Review') :
                                             (isAr ? 'مكتمل' : 'Done')}
                              {count > 0 && (
                                 <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${selectedStatusTab === tab ? 'bg-white/20 text-white' : (tab === 'REQUESTED' ? 'bg-rose-500 text-white animate-pulse' : 'bg-surface-subtle text-text-subtle')}`}>
                                    {count}
                                 </span>
                              )}
                           </button>
                        );
                     })}
                  </div>

                  <div className="flex overflow-x-auto bg-surface p-1.5 rounded-2xl items-center shadow-sm border border-border gap-1 no-scrollbar shrink-0">
                     {(['ALL', 'TODAY', 'YESTERDAY', 'TWO_DAYS_AGO', 'LAST_WEEK', 'CUSTOM'] as const).map(filter => (
                        <button
                           key={filter}
                           onClick={() => {
                              if (filter === 'CUSTOM') {
                                 const input = document.createElement('input');
                                 input.type = 'date';
                                 input.value = customDate;
                                 input.onchange = (e: any) => {
                                     if (e.target.value) {
                                        setCustomDate(e.target.value);
                                        setDateFilter('CUSTOM');
                                     }
                                 };
                                 input.showPicker ? input.showPicker() : input.click();
                              } else {
                                 setDateFilter(filter);
                              }
                           }}
                           className={`shrink-0 px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all flex items-center gap-2 ${dateFilter === filter ? 'bg-primary text-surface shadow-lg shadow-primary/30' : 'text-text-subtle hover:text-primary'}`}
                        >
                           {filter === 'ALL' ? (isAr ? 'كل التواريخ' : 'All Time') :
                            filter === 'TODAY' ? (isAr ? 'اليوم' : 'Today') :
                            filter === 'YESTERDAY' ? (isAr ? 'أمس' : 'Yesterday') :
                            filter === 'TWO_DAYS_AGO' ? (isAr ? 'أول أمس' : '2 Days Ago') :
                            filter === 'LAST_WEEK' ? (isAr ? 'الأسبوع الماضي' : 'Last Week') :
                            (isAr ? 'تاريخ محدد' : 'Custom')}
                           {filter === 'CUSTOM' && dateFilter === 'CUSTOM' && (
                               <span className="px-1.5 py-0.5 rounded-md text-[8px] bg-white/20 text-white">{customDate}</span>
                           )}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="flex flex-wrap items-center gap-2 shrink-0 xl:ml-auto w-full xl:w-auto px-1 pb-1 xl:p-0">
                  <div className="bg-surface px-4 py-1.5 rounded-2xl border border-border shadow-sm flex items-center gap-3 transition-all hover:border-primary shrink-0">
                     <div className="p-1.5 bg-primary/10 rounded-xl text-primary"><Filter size={18} /></div>
                     <div className="flex flex-col text-right">
                        <span className="text-[9px] font-bold uppercase text-text-subtle tracking-widest leading-none mb-1">{translations.materialFilter}</span>
                        <select aria-label={translations.materialFilter} className="bg-transparent border-none outline-none font-bold text-xs min-w-[140px] p-0 cursor-pointer text-text-main" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)}>
                           <option value="all">{isAr ? 'كل الخدمات' : 'All Services'}</option>
                           {services.filter(s => !s.parent_id).map(s => (
                              <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
                           ))}
                        </select>
                     </div>
                  </div>

                  {exportEnabled && (
                     <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                           variant="secondary"
                           size="sm"
                           onClick={() => exportFromSchema(filteredTrips, tripSchema, `GCM_Trips_${formatDate(new Date().toISOString(), 'yyyy-MM-dd')}`)}
                           icon={DownloadCloud}
                           className="!py-3"
                        >
                           {isAr ? 'تصدير' : 'Export'}
                        </Button>
                        <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => exportTemplateFromSchema(tripSchema, 'GCM_Trips_Template')}
                           icon={FileDown}
                           className="!py-3 hidden md:flex"
                        >
                           {isAr ? 'قالب' : 'Template'}
                        </Button>
                        <input type="file" className="hidden" id="excel-import" accept=".xlsx,.xls" onChange={handleImportExcel} />
                        <Button
                           variant="secondary"
                           size="sm"
                           onClick={() => document.getElementById('excel-import')?.click()}
                           icon={Upload}
                           className="!py-3"
                        >
                           {isAr ? 'استيراد' : 'Import'}
                        </Button>
                     </div>
                  )}
               </div>
            </div>

         <Card className="rounded-2xl overflow-hidden border-2 border-border shadow-lg">
            <Table
               isAr={isAr}
               columns={[
                  {
                     key: 'trip_id',
                     label: isAr ? 'الهوية والجدولة' : 'ID & SCHEDULE',
                     render: (_, trip: Trip) => (
                        <div className="flex flex-col gap-1">
                           <Link to={`/t?id=${trip.trip_id}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none w-fit">
                              <span className={`w-1.5 h-1.5 rounded-full animate-pulse bg-success`} />
                              <p className="font-mono text-[10px] font-bold text-primary tracking-tight hover:underline">{trip.trip_id}</p>
                           </Link>
                           <p className="text-lg font-bold text-text-main leading-none">{formatDate(trip.date)}</p>
                           <p className="text-[10px] font-bold text-text-subtle tracking-widest uppercase">{trip.time}</p>
                        </div>
                     )
                  },
                  {
                     key: 'project_id',
                     label: isAr ? 'العميل والموقع' : 'ENTITY & LOCATION',
                     render: (val) => {
                        const project = projectMap[val];
                        const company = companyMap[project?.company_id];
                        return (
                           <div className="space-y-1">
                              <Link to={`/projects?id=${project?.project_id}`} className="font-bold text-text-main flex items-center gap-2 hover:text-primary transition-colors hover:underline">
                                 <Briefcase size={14} className="text-primary" />
                                 {project?.project_name || val || '---'}
                              </Link>
                              <Link to={`/companies?id=${company?.company_id}`} className="text-[10px] font-bold text-text-subtle tracking-widest uppercase hover:text-primary transition-colors block">
                                 {company?.company_name || '---'}
                              </Link>
                           </div>
                        );
                     }
                  },
                  {
                     key: 'service_id',
                     label: isAr ? 'نوع الخدمة' : 'SERVICE TYPE',
                     render: (val) => {
                        const srv = serviceMap[val];
                        return (
                           <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500"><Package size={14} /></div>
                              <span className="font-bold text-[11px] text-text-main">{srv?.service_name || val || '---'}</span>
                           </div>
                        );
                     }
                  },
                  {
                     key: 'logistics',
                     label: isAr ? 'الفريق والأسطول' : 'CREW & FLEET',
                     render: (_, trip: Trip) => (
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center text-amber"><UserCheck size={14} /></div>
                              <div className="flex flex-col">
                                 <span className="text-[8px] font-bold text-text-subtle tracking-widest uppercase">Operator</span>
                                 <Link to={`/drivers?id=${trip.driver_id}`} className="font-bold text-text-main text-[11px] hover:text-primary hover:underline transition-colors">
                                    {driverMap[trip.driver_id]?.name || 'N/A'}
                                 </Link>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-surface"><Truck size={14} /></div>
                              <div className="flex flex-col">
                                 <span className="text-[8px] font-bold text-text-subtle tracking-widest uppercase">Plate ID</span>
                                 <Link to={`/fleet?id=${trip.vehicle_id}`} className="font-bold text-text-main text-[11px] hover:text-primary hover:underline transition-colors">
                                    {vehicleMap[trip.vehicle_id]?.plate_no || 'N/A'}
                                 </Link>
                              </div>
                           </div>
                        </div>
                     )
                  },
                  {
                     key: 'quantity',
                     label: isAr ? 'الأوزان المعتمدة' : 'VERIFIED WEIGHT',
                     className: 'text-center',
                     render: (val, trip: Trip) => (
                        <div className="flex flex-col items-center">
                           <span className="text-2xl font-bold text-text-main tracking-tight">{formatNumber(val)}</span>
                           <span className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1 bg-primary/10 px-2 py-0.5 rounded-full">{trip.unit}</span>
                        </div>
                     )
                  },
                  {
                     key: 'status',
                     label: isAr ? 'حالة التشغيل' : 'LIVE STATUS',
                     render: (_, trip: Trip) => (
                        <div onClick={e => e.stopPropagation()}>
                           <Select
                              value={trip.status}
                              onChange={async (newStatus) => {
                                 try {
                                    await upsertTrip({ ...trip, status: newStatus as TripStatus });
                                    addNotification({
                                       title: isAr ? 'تم التحديث' : 'Status Updated',
                                       message: isAr ? `تمت مزامنة حالة الرحلة إلى ${newStatus}` : `Trip synchronized to ${newStatus}`,
                                       type: NotificationType.SUCCESS
                                    });
                                 } catch (err) {
                                    addNotification({
                                       title: 'Error',
                                       message: isAr ? 'فشل تحديث الحالة' : 'Status update failed',
                                       type: NotificationType.ERROR
                                    });
                                 }
                              }}
                              options={[
                                 { label: isAr ? 'طلب جديد' : 'Requested', value: TripStatus.REQUESTED },
                                 { label: isAr ? 'قيد التنفيذ' : 'In Progress', value: TripStatus.IN_PROGRESS },
                                 { label: isAr ? 'انتظار المستندات' : 'Pending Docs', value: TripStatus.PENDING_DOCS },
                                 { label: isAr ? 'مراجعة' : 'Pending Review', value: TripStatus.PENDING_REVIEW },
                                 { label: isAr ? 'مكتمل' : 'Completed', value: TripStatus.COMPLETED },
                                 { label: isAr ? 'ملغي' : 'Cancelled', value: TripStatus.CANCELLED }
                              ]}
                              className={`!p-2 !rounded-xl !text-[10px] font-bold border-none shadow-none focus:ring-0 ${trip.status === TripStatus.COMPLETED ? 'text-success bg-success-muted' :
                                 trip.status === TripStatus.CANCELLED ? 'text-danger bg-danger-muted' :
                                    trip.status === TripStatus.PENDING_DOCS ? 'text-amber bg-amber-muted' :
                                       trip.status === TripStatus.PENDING_REVIEW ? 'text-primary bg-primary/10' :
                                          'text-primary bg-primary/10'
                                 }`}
                              containerClassName="!space-y-0 min-w-[130px]"
                           />
                        </div>
                     )
                  },
                  {
                     key: 'docs',
                     label: isAr ? 'المستندات' : 'DOCS',
                     render: (_, trip: Trip) => (
                        <div className="flex -space-x-1.5">
                           {trip.manifest_file && currentUser.role !== Role.SUBCONTRACTOR && <div className="p-1.5 bg-primary text-surface rounded-lg shadow-lg border-2 border-surface" title="Manifest"><FileText size={12} /></div>}
                           {trip.delivery_note_file && <div className="p-1.5 bg-primary text-surface rounded-lg shadow-lg border-2 border-surface" title="DN"><FileCheck size={12} /></div>}
                           {trip.recycle_file && currentUser.role !== Role.SUBCONTRACTOR && <div className="p-1.5 bg-primary text-surface rounded-lg shadow-lg border-2 border-surface" title="Recycle"><Recycle size={12} /></div>}
                        </div>
                     )
                  },
                  {
                     key: 'actions',
                     label: '',
                     className: 'text-right',
                     render: (_, trip: Trip) => (
                        <div className="flex items-center justify-end gap-2">
                           {canApprove && trip.status === TripStatus.PENDING_REVIEW && currentUser.role !== Role.SUBCONTRACTOR && (
                              <Button
                                 variant="primary"
                                 size="sm"
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    setSignatureModalTrip(trip);
                                 }}
                                 isLoading={isSubmitting}
                                 className="bg-success hover:bg-success-strong text-surface"
                              >
                                 {isAr ? 'اعتماد' : 'Approve'}
                              </Button>
                           )}
                           {canEdit && trip.status === TripStatus.PENDING_DOCS && currentUser.role !== Role.SUBCONTRACTOR && (
                              <Button
                                 variant="primary"
                                 size="sm"
                                 onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setWizardInitialStep(4);
                                    setEditingTrip(trip); 
                                    setIsModalOpen(true); 
                                 }}
                                 className="bg-amber-500 hover:bg-amber-600 text-white mr-2"
                                 icon={Upload}
                              >
                                 {isAr ? 'إكمال المستندات' : 'Complete Docs'}
                              </Button>
                           )}
                           {canEdit && (
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={(e) => { e.stopPropagation(); setWizardInitialStep(1); setEditingTrip(trip); setIsModalOpen(true); }}
                                 icon={Edit2}
                                 className="text-text-subtle hover:text-primary"
                              />
                           )}
                           <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setSelectedTrip(trip); setIsDetailModalOpen(true); }}
                              icon={Eye}
                              className="text-text-subtle hover:text-primary"
                           />
                           {canEdit && (
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={(e) => { e.stopPropagation(); handleDelete(trip.trip_id); }}
                                 icon={Trash2}
                                 className="text-text-subtle hover:text-danger"
                              />
                           )}
                        </div>
                     )
                  }
               ]}
               data={paginatedTrips}
               onRowClick={(trip) => { setSelectedTrip(trip); setIsDetailModalOpen(true); }}
               pagination={{
                  currentPage,
                  totalPages,
                  onPageChange: (page) => setCurrentPage(page)
               }}
               emptyMessage={translations.noData}
            />
         </Card>

         <TripWizard
            isOpen={isModalOpen}
            initialStep={wizardInitialStep}
            onClose={(savedTrip?: Trip) => {
               setIsModalOpen(false);
               // Automatically prompt for GCM signature/stamp after any successful save
               if (
                  savedTrip &&
                  savedTrip.status !== TripStatus.COMPLETED &&
                  savedTrip.status !== TripStatus.CANCELLED &&
                  currentUser?.role !== Role.SUBCONTRACTOR
               ) {
                  setTimeout(() => {
                     setSignatureModalTrip(savedTrip);
                  }, 150);
               }
               // Reset wizard initial step back to 1 for normal edits
               setTimeout(() => setWizardInitialStep(1), 500);
            }}
            tripToEdit={editingTrip}
         />
         <TripDetailsModal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            selectedTrip={selectedTrip}
         />
         <SignatureApproveModal
            isOpen={!!signatureModalTrip}
            trip={signatureModalTrip}
            onClose={() => setSignatureModalTrip(null)}
            onApproveSuccess={() => { setSignatureModalTrip(null); }}
         />
         <ConfirmDialogRenderer />
      </div>
   );
};

export default Trips;
