import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignatureApproveModal } from '@/components/ui/SignatureApproveModal';
import ExportSelectionModal, { ExportOptions } from '@/components/reports/ExportSelectionModal';
import { useStore } from '@/context';
import {
    Truck, MapPin, FileText, UserCheck,
    Building2, Briefcase, HardHat, FileCheck,
    Recycle, Eye, Box, Package, ImageIcon, CheckCircle2, AlertCircle, Ticket
} from 'lucide-react';
import { Trip, TripStatus, Role, NotificationType } from '@/types';
import { Modal, Button, Select } from '@/components';
import { formatDate, formatTripStatus, safeParseArray, resolveImagePath, getTripPriorityColor, handleImageError, getMimeAndExtension } from '@/utils/helpers';
import { generateBulkPdf } from '@/utils/exportHelpers';
import { toast } from '@/utils/toast';
import { useLookupMaps } from '@/hooks/useLookupMaps';

interface TripDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTrip: Trip | null;
}

const TripDetailsModal: React.FC<TripDetailsModalProps> = ({ isOpen, onClose, selectedTrip }) => {
    const {
        projects, services, companies, vehicles, drivers,
        containers, saasConfig, suppliers, facilities, upsertTrip, addNotification, currentUser, trips
    } = useStore();
    const router = useRouter();

    const isAr = saasConfig.language === 'ar';

    // ── State (all hooks must be before any early return) ──
    const [signatureModalTrip, setSignatureModalTrip] = useState<{ trip: Trip, signer?: 'CLIENT' | 'GCM' } | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const { projectMap, companyMap, vehicleMap, driverMap, supplierMap } = useLookupMaps();

    const translations = {
        detailsTitle: isAr ? 'تقرير بيانات الرحلة الميدانية' : 'Field Trip Data Report',
    };

    if (!selectedTrip) return null;
    const activeTrip = trips?.find(t => t.trip_id === selectedTrip.trip_id) || selectedTrip;

    const isClientRole = [Role.CLIENT, Role.COMPANY_USER, Role.PROJECT_USER].includes(currentUser.role);
    const canApprove = [Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role) ||
        (isClientRole && activeTrip.status === TripStatus.PENDING_APPROVAL);

    const canEdit = [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS, Role.REPORTS_MANAGER].includes(currentUser.role);

    const handlePrintTicket = async () => {
        try {
            await generateBulkPdf(
                [activeTrip],
                projects,
                drivers,
                vehicles,
                services,
                companies,
                suppliers,
                facilities,
                isAr,
                {
                    includeSummary: true,
                    includeManifest: false,
                    includeDeliveryNote: false,
                    includeRecycleReceipt: false,
                    includeProofImages: false
                },
                saasConfig?.templateConfig
            );
        } catch (err) {
            console.error("Print Ticket Error:", err);
            addNotification({
                title: 'Error',
                message: isAr ? 'حدث خطأ أثناء الطباعة' : 'Error generating ticket',
                type: NotificationType.ERROR
            });
        }
    };

    const handleApprove = async () => {
        // All approvals (Client or GCM) must go through signature flow to capture signature and stamp
        const intendedSigner = activeTrip.status === TripStatus.PENDING_APPROVAL ? 'CLIENT' : 'GCM';
        setSignatureModalTrip({ trip: activeTrip, signer: intendedSigner });
    };

    const handleViewImage = async (src: string) => {
        if (!src) return;
        const resolvedSrc = resolveImagePath(src);

        // [AR] فتح نافذة جديدة فوراً لتجنب حظر النوافذ المنبثقة
        // [EN] Open a new window immediately to avoid popup blockers
        const newWindow = window.open('about:blank', '_blank');
        if (!newWindow) {
            toast.warning(isAr ? 'يرجى السماح بالنوافذ المنبثقة لمعاينة الملف' : 'Please allow popups to preview the file');
            return;
        }

        // [AR] عرض رسالة تحميل مؤقتة
        // [EN] Show temporary loading message
        newWindow.document.write(`
            <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; background:#f8fafc; color:#64748b;">
                <div style="width:40px; height:40px; border:4px solid #e2e8f0; border-top:4px solid #3b82f6; border-radius:50%; animation:spin 1s linear infinite;"></div>
                <p style="margin-top:20px; font-weight:600;">${isAr ? 'جاري تجهيز المعاينة...' : 'Preparing preview...'}</p>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </div>
        `);

        // [AR] إذا كان الملف عبارة عن رابط من السيرفر
        // [EN] If file is a server URL
        if (resolvedSrc.startsWith('http') || resolvedSrc.startsWith('/uploads')) {
            try {
                const response = await fetch(resolvedSrc);
                const blob = await response.blob();

                // [AR] محاولة تحديد النوع إذا كان السيرفر أرجعه بشكل غير دقيق
                // [EN] Try to determine type if server returned it inaccuracy
                let mimeType = blob.type;
                if (mimeType === 'application/octet-stream' || !mimeType) {
                    const { mime } = getMimeAndExtension(resolvedSrc);
                    mimeType = mime;
                }

                const finalBlob = new Blob([blob], { type: mimeType });
                const url = URL.createObjectURL(finalBlob);
                newWindow.location.href = url;
                return;
            } catch (err) {
                console.error('Error fetching preview:', err);
                newWindow.location.href = resolvedSrc;
                return;
            }
        }

        // [AR] إذا كان الملف Base64
        try {
            const { mime } = getMimeAndExtension(src);
            const base64Data = src.includes(',') ? (src.split(',')[1] || '') : src;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mime });
            const url = URL.createObjectURL(blob);
            newWindow.location.href = url;
        } catch (e) {
            console.error('Error viewing Base64 file', e);
            newWindow.location.href = src;
        }
    };

    const handleDownload = async (src: string, label: string) => {
        if (!src) return;
        const resolvedSrc = resolveImagePath(src);
        let blob: Blob;
        let extension = '.png';

        try {
            if (src.startsWith('data:')) {
                const { mime, ext } = getMimeAndExtension(src);
                extension = ext;
                const base64Data = src.includes(',') ? (src.split(',')[1] || '') : src;
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
            } else {
                const response = await fetch(resolvedSrc);
                blob = await response.blob();

                // [AR] تحديد الامتداد بناءً على نوع الـ Blob الحقيقي من الرد
                // [EN] Determine extension based on real Blob type from response
                if (blob.type.includes('pdf')) extension = '.pdf';
                else if (blob.type.includes('jpeg')) extension = '.jpg';
                else if (blob.type.includes('png')) extension = '.png';
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Clean filename and combine with trip ID
            const safeLabel = label.replace(/\s+/g, '_');
            a.download = `${safeLabel}_${selectedTrip?.trip_id || 'file'}${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download error:', err);
            window.open(resolvedSrc, '_blank');
        }
    };


    return (
        <>
            <Modal
                size="4xl"
                isOpen={isOpen}
                onClose={onClose}
                title={translations.detailsTitle}
            >


                <div className={`space-y-5 max-h-[85vh] overflow-y-auto px-4 py-4 custom-scrollbar ${isAr ? 'text-right' : 'text-left'}`}>

                    {/* Header Section: Status & ID */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-subtle p-5 rounded-3xl border border-border">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl ${activeTrip.status === TripStatus.COMPLETED ? 'bg-emerald-500 shadow-emerald-500/20' :
                                activeTrip.status === TripStatus.CANCELLED ? 'bg-rose-500 shadow-rose-500/20' :
                                    activeTrip.status === TripStatus.PENDING_DOCS ? 'bg-amber-500 shadow-amber-500/20' :
                                        activeTrip.status === TripStatus.PENDING_REVIEW ? 'bg-purple-500 shadow-purple-500/20' :
                                            'bg-blue-500 shadow-blue-500/20'
                                }`}>
                                <HardHat size={32} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'رقم الرحلة' : 'TRIP REFERENCE'}</p>
                                <h2 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight">{activeTrip.trip_id}</h2>
                                {activeTrip.priority && activeTrip.priority !== 'NORMAL' && (
                                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${getTripPriorityColor(activeTrip.priority).bg} ${getTripPriorityColor(activeTrip.priority).text}`}>
                                        {activeTrip.priority}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <div className="flex items-center gap-3">
                                {canApprove && (activeTrip.status === TripStatus.PENDING_REVIEW || activeTrip.status === TripStatus.PENDING_APPROVAL) && (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleApprove}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                    >
                                        {isAr ? 'اعتماد الرحلة' : 'Approve Trip'}
                                    </Button>
                                )}
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handlePrintTicket}
                                    className="flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 shadow-sm"
                                >
                                    <Ticket size={16} />
                                    {isAr ? 'تذكرة' : 'Ticket'}
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setShowExportModal(true)}
                                    className="flex items-center gap-2 bg-slate-900 group-hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10"
                                >
                                    <FileText size={16} />
                                    {isAr ? 'طباعة مستندات الرحلة' : 'Print Trip Dossier'}
                                </Button>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedTrip.status === TripStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                    selectedTrip.status === TripStatus.CANCELLED ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                                        selectedTrip.status === TripStatus.PENDING_REVIEW ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                    }`}>
                                    {formatTripStatus(selectedTrip.status, isAr)}
                                </div>
                            </div>
                            <p className="text-sm font-bold text-text-subtle">
                                {formatDate(selectedTrip.date)} <span className="mx-2">•</span> {selectedTrip.time}
                            </p>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* Left Column: Operational & Logistics (Span 2) */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* 1. Operational Info */}
                            <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm">
                                <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-surface-subtle">
                                    <Building2 size={18} className="text-blue-500" />
                                    <h3 className="text-xs font-bold text-text-main uppercase tracking-widest">{isAr ? 'بيانات العميل والمشروع' : 'Client & Project Info'}</h3>
                                </div>
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'العميل (الجهة الطالبة)' : 'Client Entity'}</p>
                                        <p className="text-base font-bold text-text-main">
                                            {(() => {
                                                const project = projectMap[selectedTrip.project_id];
                                                const companyId = project?.company_id;
                                                return companyId ? (companyMap[companyId]?.company_name || '---') : '---';
                                            })()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'المشروع / الموقع' : 'Project Site'}</p>
                                        <p className="text-base font-bold text-text-main">
                                            {projectMap[selectedTrip.project_id]?.project_name || selectedTrip.project_id || '---'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'مشرف الموقع' : 'Site Supervisor'}</p>
                                        <div className="flex items-center gap-2">
                                            <UserCheck size={16} className="text-text-subtle" />
                                            <p className="text-sm font-bold text-text-main">{selectedTrip.supervisor_name || (isAr ? 'غير محدد' : 'Not Assigned')}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'مشرف GCM' : 'GCM Supervisor'}</p>
                                        <div className="flex items-center gap-2">
                                            <UserCheck size={16} className="text-text-subtle" />
                                            <p className="text-sm font-bold text-text-main">{selectedTrip.gcm_supervisor_name || (isAr ? 'غير محدد' : 'Not Assigned')}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'رابط الموقع الجغرافي' : 'GPS Location'}</p>
                                        {selectedTrip.trip_location_url ? (
                                            <a href={selectedTrip.trip_location_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                                                <MapPin size={14} /> {isAr ? 'عرض الخريطة' : 'View Map'}
                                            </a>
                                        ) : (
                                            <span className="text-xs text-text-subtle italic">{isAr ? 'لا يوجد رابط' : 'No GPS Link'}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Logistics & Fleet (Deep Dive) */}
                            <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm">
                                <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-surface-subtle">
                                    <Truck size={18} className="text-orange-500" />
                                    <h3 className="text-xs font-bold text-text-main uppercase tracking-widest">{isAr ? 'تفاصيل الأسطول واللوجستيات' : 'Fleet & Logistics Details'}</h3>
                                </div>
                                <div className="p-5">
                                    {(() => {
                                        const vehicle = vehicleMap[selectedTrip.vehicle_id];
                                        const driver = driverMap[selectedTrip.driver_id];
                                        const isExternal = vehicle?.ownership_type === 'SUPPLIER';
                                        const supplier = isExternal && vehicle?.supplier_id ? supplierMap[vehicle.supplier_id] : null;

                                        return (
                                            <div className="space-y-5">
                                                {/* Main Fleet Info */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-surface-subtle border border-border">
                                                        <div className="p-3 bg-surface rounded-xl shadow-sm"><Truck size={20} className="text-text-main" /></div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'المركبة' : 'Vehicle Unit'}</p>
                                                            <p
                                                                className={`text-lg font-bold text-text-main ${currentUser.role === Role.ADMIN ? 'cursor-pointer hover:text-emerald-500 underline decoration-emerald-500/30 transition-colors' : ''}`}
                                                                onClick={() => currentUser.role === Role.ADMIN && router.push(`/f?id=${selectedTrip.vehicle_id}`)}
                                                            >
                                                                {vehicle?.plate_no || '---'}
                                                            </p>
                                                            <p className="text-xs font-medium text-text-subtle">{vehicle?.vehicle_type}</p>
                                                            {isExternal && <span className="inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 uppercase">{isAr ? 'تاجير خارجي' : 'Outsourced'}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-surface-subtle border border-border">
                                                        <div className="p-3 bg-surface rounded-xl shadow-sm"><UserCheck size={20} className="text-text-main" /></div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'السائق' : 'Driver'}</p>
                                                            <p
                                                                className={`text-lg font-bold text-text-main ${currentUser.role === Role.ADMIN ? 'cursor-pointer hover:text-emerald-500 underline decoration-emerald-500/30 transition-colors' : ''}`}
                                                                onClick={() => currentUser.role === Role.ADMIN && router.push(`/dr?id=${selectedTrip.driver_id}`)}
                                                            >
                                                                {driver?.name || '---'}
                                                            </p>
                                                            <p className="text-xs font-medium text-text-subtle">{driver?.phone}</p>
                                                            {driver?.license_no && <p className="text-[10px] text-text-subtle mt-1">Lic: {driver.license_no}</p>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Subcontractor / Supplier Block */}
                                                {isExternal && supplier && (
                                                    <div className="mt-4 p-4 rounded-2xl border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/10">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Briefcase size={16} className="text-purple-600" />
                                                            <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-widest">{isAr ? 'مورد الخدمة (Subcontractor)' : 'Service Provider (Subcontractor)'}</p>
                                                        </div>
                                                        <div className="flex flex-col md:flex-row gap-8">
                                                            <div>
                                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isAr ? 'اسم الشركة' : 'Company Name'}</p>
                                                                <p className="font-bold text-text-main mb-2">{supplier.name}</p>

                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isAr ? 'السجل التجاري' : 'CR Number'}</p>
                                                                <p className="font-bold text-text-main">{supplier.cr_no}</p>
                                                            </div>
                                                            {/* We are hiding financial info, so no rates here */}
                                                        </div>
                                                        <div className="mt-3 pt-3 border-t border-border">
                                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'بيانات الاتصال' : 'Contact Info'}</p>
                                                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                                                {supplier.contact_persons ? (typeof supplier.contact_persons === 'string' ? supplier.contact_persons : '---') : '---'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* 3. Documentation & Proofs */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { label: isAr ? 'بيان النفايات' : 'Manifest', val: selectedTrip.waste_manifest_no, file: selectedTrip.manifest_file, icon: FileText, color: 'blue', required: true, restricted: true, manifestOnly: true },
                                    { label: isAr ? 'سند التسليم' : 'Delivery Note', val: selectedTrip.delivery_note_no, file: selectedTrip.delivery_note_file, icon: FileCheck, color: 'emerald', required: true, restricted: false, manifestOnly: false },
                                    { label: isAr ? 'إيصال التدوير' : 'Recycle Receipt', val: selectedTrip.recycle_receipt_no, file: selectedTrip.recycle_file, icon: Recycle, color: 'purple', required: false, restricted: true, manifestOnly: false }
                                ].filter(d => {
                                    // Hide from subcontractor
                                    if (d.restricted && currentUser.role === Role.SUBCONTRACTOR) return false;
                                    // Hide Manifest from client roles unless trip is COMPLETED (approved by GCM)
                                    if (d.manifestOnly && isClientRole && activeTrip.status !== TripStatus.COMPLETED) return false;
                                    return true;
                                }).map((doc, idx) => {
                                    const isUploaded = !!doc.file;
                                    const isMissing = !doc.file && doc.required;

                                    return (
                                        <div key={idx} className={`bg-surface p-4 rounded-2xl border shadow-sm transition-all relative overflow-hidden ${isMissing ? 'border-amber-200 bg-amber-50/50' : 'border-border'}`}>
                                            {/* Status Badge */}
                                            <div className="absolute top-3 right-3">
                                                {isUploaded ? (
                                                    <div className="bg-emerald-100 text-emerald-600 rounded-full p-1"><CheckCircle2 size={12} /></div>
                                                ) : isMissing ? (
                                                    <div className="bg-amber-100 text-amber-600 rounded-full p-1 animate-pulse"><AlertCircle size={12} /></div>
                                                ) : null}
                                            </div>

                                            <div className={`w-8 h-8 rounded-lg ${isUploaded ? `bg-${doc.color}-100 text-${doc.color}-600` : 'bg-slate-100 text-slate-400'} flex items-center justify-center mb-3`}>
                                                <doc.icon size={16} />
                                            </div>
                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{doc.label}</p>
                                            <p className={`font-mono font-bold text-sm truncate mb-3 ${isUploaded ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic'}`}>
                                                {doc.val || (isAr ? '---' : '---')}
                                            </p>

                                            {doc.file ? (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => handleViewImage(doc.file!)}
                                                        className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-surface-subtle text-text-subtle hover:bg-surface rounded-lg transition-colors shadow-sm hover:shadow"
                                                    >
                                                        <Eye size={12} /> {isAr ? 'معاينة' : 'View'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(doc.file!, doc.label)}
                                                        className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg transition-colors shadow-sm hover:shadow"
                                                    >
                                                        <Ticket size={12} /> {isAr ? 'تحميل' : 'Get'}
                                                    </button>
                                                </div>
                                            ) : doc.val && (doc.manifestOnly !== undefined) ? (
                                                <button
                                                    onClick={async () => {
                                                        const opts = {
                                                            includeSummary: false,
                                                            includeManifest: !!doc.manifestOnly,
                                                            includeDeliveryNote: !doc.manifestOnly,
                                                            includeRecycleReceipt: false,
                                                            includeProofImages: false,
                                                            accentColor: '#10b981'
                                                        };
                                                        try {
                                                            await generateBulkPdf(
                                                                [activeTrip],
                                                                projects, drivers, vehicles, services, companies, suppliers, facilities,
                                                                isAr, opts, saasConfig?.templateConfig
                                                            );
                                                        } catch (err) {
                                                            console.error(err);
                                                        }
                                                    }}
                                                    className={`w-full py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-${doc.color}-50 text-${doc.color}-600 hover:bg-${doc.color}-100 dark:bg-${doc.color}-900/20 dark:text-${doc.color}-400 rounded-lg transition-colors shadow-sm hover:shadow cursor-pointer`}
                                                >
                                                    <FileText size={12} /> {isAr ? 'إنشاء (PDF)' : 'Generate PDF'}
                                                </button>
                                            ) : (
                                                <div className="w-full py-2 text-center text-[10px] font-bold uppercase tracking-wider bg-black/5 text-black/30 rounded-lg">
                                                    {isAr ? 'غير متوفر' : 'Missing'}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Client Issue Notes */}
                            {selectedTrip.issue_notes && (
                                <div className="p-5 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-200 dark:border-red-900/30">
                                    <h3 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <AlertCircle size={16} /> {isAr ? 'ملاحظات العميل / مشكلة مبلغ عنها' : 'Client Issue Report'}
                                    </h3>
                                    <p className="text-sm font-medium text-red-800 dark:text-red-200 leading-relaxed">{selectedTrip.issue_notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Cargo & Gallery (Span 1) */}
                        <div className="space-y-5">

                            {/* Weight & Material Card */}
                            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full" />
                                <div className="relative z-10">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">{isAr ? 'الوزن الصافي المعتمد' : 'Certified Net Weight'}</p>
                                    <div className="flex items-baseline gap-2 mb-6">
                                        <span className="text-6xl font-black tracking-tighter text-white">{selectedTrip.quantity}</span>
                                        <span className="text-xl font-bold text-slate-400">{selectedTrip.unit}</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Package size={14} className="text-blue-400" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAr ? 'نوع الخدمة' : 'Service Type'}</span>
                                            </div>
                                            <p className="font-bold text-base text-white">{services.find(s => s.service_id === selectedTrip.service_id)?.service_name || 'General Waste'}</p>
                                        </div>

                                        <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Box size={14} className="text-purple-400" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAr ? 'تفاصيل الحاوية' : 'Container Info'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold text-sm text-white">{selectedTrip.container_size || 'Standard'}</p>
                                                {selectedTrip.inventory_item_id && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-mono">{containers.find(c => c.container_id === selectedTrip.inventory_item_id)?.code || selectedTrip.inventory_item_id}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Photo Gallery */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <ImageIcon size={16} className="text-slate-400" /> {isAr ? 'الألبوم الميداني' : 'Field Gallery'}
                                </h3>
                                {(() => {
                                    const baseImages = (safeParseArray(selectedTrip.proof_images) || []).filter(
                                        (value: unknown): value is string => typeof value === 'string' && value.length > 0
                                    );
                                    const containerImages = [
                                        selectedTrip.request_container_image,
                                        selectedTrip.container_image_before,
                                        selectedTrip.container_image_after
                                    ].filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);

                                    const images: string[] = Array.from(new Set([...baseImages, ...containerImages]));

                                    return images.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {images.map((img, idx) => (
                                                <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-surface-subtle relative group cursor-pointer flex items-center justify-center border border-border hover:border-primary/50 transition-colors" onClick={() => handleViewImage(img)}>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase absolute z-0">Failed</span>
                                                    <img
                                                        src={resolveImagePath(img)}
                                                        alt={`Field Gallery Image ${idx}`}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 relative z-10"
                                                        onError={handleImageError}
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-20">
                                                        <Eye className="text-white drop-shadow-md" size={20} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="aspect-video rounded-xl bg-surface-subtle border-2 border-dashed border-border flex flex-col items-center justify-center text-text-subtle gap-2">
                                            <ImageIcon size={24} className="opacity-50" />
                                            <span className="text-[10px] font-bold uppercase">{isAr ? 'لاتوجد صور' : 'No Images'}</span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Notes */}
                            {selectedTrip.notes && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-6 border border-amber-100 dark:border-amber-900/30">
                                    <h3 className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <FileText size={16} /> {isAr ? 'ملاحظات' : 'Notes'}
                                    </h3>
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 leading-relaxed">
                                        {selectedTrip.notes}
                                    </p>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </Modal>

            <SignatureApproveModal
                isOpen={!!signatureModalTrip}
                trip={signatureModalTrip?.trip || null}
                {...(signatureModalTrip?.signer ? { intendedSigner: signatureModalTrip.signer } : {})}
                onClose={() => setSignatureModalTrip(null)}
                onApproveSuccess={() => { setSignatureModalTrip(null); onClose(); }}
            />

            <ExportSelectionModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                isAr={isAr}
                isLoading={isExporting}
                disabledKeys={activeTrip.status !== TripStatus.COMPLETED ? ['includeManifest', 'includeRecycleReceipt'] : []}
                onExport={async (opts: ExportOptions) => {
                    if (activeTrip.status !== TripStatus.COMPLETED) { opts.includeManifest = false; opts.includeRecycleReceipt = false; }
                    setIsExporting(true);
                    try {
                        await generateBulkPdf(
                            [activeTrip],
                            projects,
                            drivers,
                            vehicles,
                            services,
                            companies,
                            suppliers,
                            facilities,
                            isAr,
                            opts,
                            saasConfig?.templateConfig
                        );
                        setShowExportModal(false);
                    } catch (err) {
                        console.error('Print Dossier Error:', err);
                        addNotification({
                            title: 'Error',
                            message: isAr ? 'حدث خطأ أثناء طباعة الملف' : 'Error generating dossier',
                            type: NotificationType.ERROR
                        });
                    } finally {
                        setIsExporting(false);
                    }
                }}
            />
        </>
    );
};

export default TripDetailsModal;
