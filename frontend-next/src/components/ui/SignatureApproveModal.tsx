import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '@/context';
import { Role, Trip, TripStatus, NotificationType } from '@/types';
import { Modal, Button } from '@/components';
import { Pencil, Eraser, CheckCircle, ImagePlus, Stamp, Package } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
// Document generation deferred to on-demand (print/export) for performance

interface SignatureApproveModalProps {
    isOpen: boolean;
    trip: Trip | null;
    onClose: () => void;
    onApproveSuccess?: () => void;
    intendedSigner?: 'CLIENT' | 'GCM';
}

export const SignatureApproveModal: React.FC<SignatureApproveModalProps> = ({ isOpen, trip, onClose, onApproveSuccess, intendedSigner }) => {
    const { 
        upsertTrip, upsertUser, currentUser, projectServices, services, addNotification,
        allProjects, drivers, vehicles, companies, facilities, saasConfig
    } = useStore();
    const { isAr } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isClientRole = [Role.CLIENT, Role.COMPANY_USER, Role.PROJECT_USER].includes(currentUser?.role as Role);
    const isGcmRole = [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS, Role.REPORTS_MANAGER].includes(currentUser?.role as Role);

    const isClientSignature = intendedSigner ? intendedSigner === 'CLIENT' : isClientRole;
    const isGcmSignature = intendedSigner ? intendedSigner === 'GCM' : isGcmRole;

    // Only pre-fill signature/stamp if the logged-in user's role group matches the signature being captured
    const shouldPreFill = (isClientSignature && isClientRole) || (isGcmSignature && isGcmRole);

    // UI State
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data State
    const [stampData, setStampData] = useState<string | undefined>(undefined);
    const [signatureData, setSignatureData] = useState<string | undefined>(undefined);
    const [selectedParentServiceId, setSelectedParentServiceId] = useState<string>('');
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');

    // Scoped services — only those contracted for this trip's project
    const scopedServices = (projectServices || [])
        .filter(ps => ps.project_id === trip?.project_id)
        .map(ps => {
            const svc = services.find(s => s.service_id === ps.service_id);
            return { value: ps.service_id, label: svc?.service_name || ps.service_id, parent_id: svc?.parent_id };
        });

    // Parent (root) services from scoped services
    const parentServiceIds = [...new Set(scopedServices.map(s => s.parent_id).filter(Boolean))] as string[];
    const parentServicesForDropdown = parentServiceIds.map(pid => {
        const svc = services.find(s => s.service_id === pid);
        return svc ? { value: svc.service_id, label: svc.service_name } : null;
    }).filter(Boolean) as { value: string; label: string }[];

    // Sub-services for the selected parent
    const subServicesForDropdown = selectedParentServiceId
        ? scopedServices.filter(s => s.parent_id === selectedParentServiceId)
        : [];

    // Check if we have a tree structure (parent → child)
    const hasServiceTree = parentServicesForDropdown.length > 0 && scopedServices.some(s => s.parent_id);

    useEffect(() => {
        if (!isOpen) return;

        setStampData(shouldPreFill ? currentUser?.stamp : undefined);
        setSignatureData(shouldPreFill ? currentUser?.signature : undefined);
        setHasDrawn(shouldPreFill ? !!currentUser?.signature : false);
        setSelectedServiceId(trip?.service_id || '');

        // Auto-detect parent service from trip's current service
        if (trip?.service_id) {
            const svc = services.find(s => s.service_id === trip.service_id);
            if (svc?.parent_id) {
                setSelectedParentServiceId(svc.parent_id);
            } else {
                setSelectedParentServiceId(trip.service_id);
            }
        } else {
            setSelectedParentServiceId('');
        }

    }, [isOpen, currentUser, trip, services]);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e && e.touches.length > 0) {
            const touch = e.touches[0] || e.changedTouches?.[0];
            if (touch) {
                return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
            }
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        setIsDrawing(true);
        const { x, y } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCoordinates(e, canvas);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        setHasDrawn(true);
    };

    const stopDrawing = () => setIsDrawing(false);

    const clearSignature = () => {
        setHasDrawn(false);
        setSignatureData(undefined);
        if (canvasRef.current) {
            canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setStampData(reader.result as string);
        reader.readAsDataURL(file);
    };

    const clearStamp = () => {
        setStampData(undefined);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleApprove = async () => {
        if (!trip || !hasDrawn) return;
        if (isGcmSignature && !stampData) {
            addNotification({
                title: 'Error',
                message: isAr ? 'يرجى إرفاق الختم لاعتماد الرحلة' : 'Stamp is required for approval',
                type: NotificationType.ERROR
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const finalSignatureData = signatureData || canvasRef.current?.toDataURL('image/png');
            if (!finalSignatureData) return;

            // [PERF] Fire-and-forget: Persist signature & stamp to user profile in background
            if (shouldPreFill && (finalSignatureData !== currentUser.signature || stampData !== currentUser.stamp)) {
                upsertUser({
                    ...currentUser,
                    signature: finalSignatureData,
                    ...(stampData ? { stamp: stampData } : {})
                }).catch(err => console.warn('[SignatureApprove] User profile save (non-blocking):', err));
            }

            const updatePayload: Partial<Trip> = {};

            if (isClientSignature) {
                updatePayload.status = TripStatus.PENDING_DOCS;
                updatePayload.client_approved = true;
                updatePayload.client_approved_at = new Date().toISOString();
                updatePayload.client_signature = finalSignatureData;
                if (stampData) updatePayload.client_stamp = stampData;
                // If it's the client signing, use their name. If it's an admin capturing, use trip's current or admin's name.
                const supervisorName = isClientRole ? currentUser?.name : trip.supervisor_name;
                if (supervisorName) updatePayload.supervisor_name = supervisorName;
            } else if (isGcmSignature) {
                updatePayload.status = TripStatus.COMPLETED;
                updatePayload.gcm_signature = finalSignatureData;
                if (stampData) updatePayload.gcm_stamp = stampData;
                const gcmSupervisorName = currentUser?.name || trip.gcm_supervisor_name;
                if (gcmSupervisorName) updatePayload.gcm_supervisor_name = gcmSupervisorName;
            }

            const updatedTripForPdf = {
                ...trip,
                ...(selectedServiceId ? { service_id: selectedServiceId } : {}),
                ...updatePayload
            };

            // Save trip — upsertTrip already does optimistic update internally
            await upsertTrip({
                ...updatedTripForPdf
            });

            if (onApproveSuccess) onApproveSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to approve trip', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!trip) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isGcmSignature ? (isAr ? 'الاعتماد النهائي للرحلة' : 'Final Trip Approval') : (isAr ? 'اعتماد العميل بالتوقيع' : 'Client Signature Approval')} size="md" zIndex={200}>
            <div className="p-4 space-y-5">

                {/* Trip Info Banner */}
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-800/30">
                    <p className="text-sm font-bold text-primary-800 dark:text-primary-300">
                        {isGcmSignature ? (isAr ? `الاعتماد النهائي لرحلة رقم ${trip.trip_id}` : `Final Approval for Trip ${trip.trip_id}`) : (isAr ? `تأكيد واعتماد تحميل الرحلة ${trip.trip_id}` : `Confirm & Approve loading for Trip ${trip.trip_id}`)}
                    </p>
                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                        {isAr ? 'الرجاء رسم التوقيع أدناه لاعتماد الرحلة ونقلها للمرحلة القادمة.' : 'Please draw your signature below to approve this trip.'}
                    </p>
                    {!shouldPreFill && (
                        <p className="mt-2 text-xs font-bold text-amber-600 bg-amber-500/10 p-2 rounded inline-block">
                            {isAr ? '⚠️ أنت تقوم بجمع توقيع لجهة أخرى (لن يتم حفظ التوقيع في ملفك الشخصي).' : '⚠️ Capturing signature on behalf of another party.'}
                        </p>
                    )}
                </div>

                <div className="space-y-4">

                    {/* ─── Material / Service Selector ─── */}
                    {scopedServices.length > 0 && (
                        <div className="space-y-3">
                            {hasServiceTree ? (
                                <>
                                    {/* Parent Service Dropdown - Hidden for Clients */}
                                    {!isClientSignature && (
                                        <div>
                                            <label className="text-sm font-bold text-text-main flex items-center gap-2 mb-2">
                                                <Package size={16} className="text-amber-500" />
                                                {isAr ? 'الخدمة الرئيسية' : 'Main Service'}
                                            </label>
                                            <select
                                                value={selectedParentServiceId}
                                                onChange={e => {
                                                    setSelectedParentServiceId(e.target.value);
                                                    setSelectedServiceId(''); // reset sub-service
                                                }}
                                                className="w-full p-3 bg-surface rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-amber-400 shadow-sm text-text-main"
                                            >
                                                <option value="">{isAr ? '--- اختر الخدمة الرئيسية ---' : '--- Select Main Service ---'}</option>
                                                {parentServicesForDropdown.map(s => (
                                                    <option key={s.value} value={s.value}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {/* Sub-Service Dropdown */}
                                    {selectedParentServiceId && subServicesForDropdown.length > 0 && (
                                        <div>
                                            <label className="text-sm font-bold text-text-main flex items-center gap-2 mb-2">
                                                <Package size={16} className="text-orange-500" />
                                                {isAr ? 'الخدمة الفرعية *' : 'Sub-Service *'}
                                            </label>
                                            <select
                                                value={selectedServiceId}
                                                onChange={e => setSelectedServiceId(e.target.value)}
                                                className="w-full p-3 bg-surface rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-orange-400 shadow-sm text-text-main"
                                            >
                                                <option value="">{isAr ? '--- اختر الخدمة الفرعية ---' : '--- Select Sub-Service ---'}</option>
                                                {subServicesForDropdown.map(s => (
                                                    <option key={s.value} value={s.value}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Flat service list (no parent-child structure) */
                                <div>
                                    <label className="text-sm font-bold text-text-main flex items-center gap-2 mb-2">
                                        <Package size={16} className="text-amber-500" />
                                        {isAr ? 'المادة / نوع الخدمة (اختياري)' : 'Material / Service Type (Optional)'}
                                    </label>
                                    <select
                                        value={selectedServiceId}
                                        onChange={e => setSelectedServiceId(e.target.value)}
                                        className="w-full p-3 bg-surface rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-amber-400 shadow-sm text-text-main"
                                    >
                                        <option value="">{isAr ? '--- اختر المادة ---' : '--- Select Material ---'}</option>
                                        {scopedServices.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Stamp Section ─── */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-sm font-bold text-text-main flex items-center gap-2">
                                <Stamp size={16} className="text-emerald-500" />
                                {isAr ? `ختم الشركة ${isGcmSignature ? '(إجباري)' : '(اختياري)'}` : `Company Stamp ${isGcmSignature ? '(Required)' : '(Optional)'}`}
                            </label>
                            {stampData && (
                                <button onClick={clearStamp} className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded">
                                    <Eraser size={14} /> {isAr ? 'مسح الختم' : 'Clear Stamp'}
                                </button>
                            )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleStampUpload} />

                        {stampData ? (
                            <div
                                className="border border-border rounded-xl p-4 flex items-center justify-center bg-surface cursor-pointer hover:bg-surface-subtle transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <img src={stampData} alt="Stamp" className="h-20 object-contain" />
                            </div>
                        ) : (
                            <div
                                className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-surface-subtle cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ImagePlus size={24} className="text-emerald-500 mb-2 opacity-50" />
                                <span className="text-xs font-bold text-text-subtle text-center">
                                    {isAr ? 'انقر لرفع صورة الختم المعتمد' : 'Click to upload official stamp'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ─── Signature Section ─── */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-sm font-bold text-text-main flex items-center gap-2">
                                <Pencil size={16} className="text-primary-500" />
                                {isAr ? 'التوقيع المعتمد' : 'Authorized Signature'}
                            </label>
                            <button onClick={clearSignature} className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded">
                                <Eraser size={14} /> {isAr ? 'مسح التوقيع' : 'Clear'}
                            </button>
                        </div>

                        <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-white cursor-crosshair relative touch-none">
                            {signatureData ? (
                                <img src={signatureData} alt="Signature" className="w-full h-[200px] object-contain mix-blend-multiply" />
                            ) : (
                                <>
                                    <canvas
                                        ref={canvasRef}
                                        width={400}
                                        height={200}
                                        className="w-full h-[200px]"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    {!hasDrawn && (
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-text-subtle opacity-50 font-bold select-none text-sm">
                                            {isAr ? 'ارسم توقيعك هنا...' : 'Draw signature here...'}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        {isAr ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleApprove}
                        disabled={!hasDrawn || (isGcmSignature && !stampData) || isSubmitting}
                        icon={CheckCircle}
                        className="flex-1"
                    >
                        {isSubmitting
                            ? (isAr ? 'جاري الاعتماد...' : 'Approving...')
                            : (isAr ? 'اعتماد الرحلة' : 'Approve Trip')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
