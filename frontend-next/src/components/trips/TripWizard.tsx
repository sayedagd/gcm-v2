import React, { useState, useEffect, useMemo, useRef } from 'react';
import NextImage from 'next/image';
import { useStore } from '@/context';
import {
    Building2, MapPin, ArrowRight, UserCheck, Truck, HardHat,
    Activity, FileText, FileCheck, Recycle, Package, Navigation, AlertCircle,
    Upload, Wand2, Copy, CheckCircle2, RefreshCw, Clock, ScanLine
} from 'lucide-react';
import { Trip, TripStatus, Role, NotificationType } from '@/types';
import { Modal, Button, Input, SearchableSelect, FileUploader, Card } from '@/components';
import { formatDate, formatTripStatus, safeParseArray, resolveImagePath } from '@/utils/helpers';
// Document generation is now deferred to on-demand (print/export) — see handleSave comments
import { useSupplierRates } from '@/store/useSupplierRates';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirmDialog } from '@/components/common/ConfirmDialog';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { validateDriverForTrip, validateVehicleForTrip, validateFacilityAcceptsService } from '@/utils/validationSchemas';
import { toast } from '@/utils/toast';

interface TripWizardProps {
    isOpen: boolean;
    onClose: (savedTrip?: Trip) => void;
    tripToEdit?: Trip | null;
    initialStep?: number;
    initialWarnings?: string[];
}

const TripWizard: React.FC<TripWizardProps> = ({ isOpen, onClose, tripToEdit, initialStep, initialWarnings }) => {
    const {
        projects, services, companies, vehicles, drivers,
        containers, inventorySizes, projectServices, upsertTrip, trips, tanks,
        saasConfig, users, addNotification, suppliers, currentUser, facilities, api,
        assetServiceLinks
    } = useStore();

    const { rates: supplierRates } = useSupplierRates();
    const { t, isAr } = useTranslation();
    const { confirm, ConfirmDialogRenderer } = useConfirmDialog();
    const { projectMap, serviceMap, vehicleMap, driverMap } = useLookupMaps();

    // State
    const [wizardStep, setWizardStep] = useState(1);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [tripOwnership, setTripOwnership] = useState<'INTERNAL' | 'SUPPLIER'>('INTERNAL');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingSaveMode, setPendingSaveMode] = useState<'save' | 'clone'>('save');
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);
    const [isOcrScanning, setIsOcrScanning] = useState(false);
    const ocrScanInputRef = useRef<HTMLInputElement>(null);

    // Creates a cropped version of the top X% of the image to avoid scanning tables/irrelevant numbers
    const cropImageTop = (base64: string, heightRatio: number = 0.25): Promise<string> => {
        return new Promise((resolve) => {
            const img = new globalThis.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height * heightRatio;
                if (ctx) {
                    ctx.drawImage(img, 0, 0, img.width, img.height * heightRatio, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/png'));
                } else {
                    resolve(base64); // Fallback
                }
            };
            img.onerror = () => resolve(base64);
            img.src = base64;
        });
    };

    // Copes with Arabic-Indic digits
    const arabicToEnglishNumbers = (str: string) => {
        return str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    };

    const processOcr = async (base64: string, type: 'MANIFEST' | 'DELIVERY_NOTE' | 'RECYCLE') => {
        setIsOcrProcessing(true);
        try {
            addNotification({
                title: isAr ? 'تحليل الصورة الذكي' : 'Smart Image Analysis',
                message: isAr ? 'يتم تحديد الرقم باستخدام الذكاء الاصطناعي...' : 'Extracting using AI Vision...',
                type: NotificationType.INFO,
            });

            const response = await api.processOcrVision(base64);
            const data = response.extracted;

            let extracted = '';
            // Depending on the field requested, extract the relevant data
            if (type === 'DELIVERY_NOTE' && data.delivery_note_no) {
                extracted = data.delivery_note_no;
                if (!extracted.startsWith('DN')) extracted = `DN-${extracted}`;
                setCurrentTrip(p => ({ ...p, delivery_note_no: extracted }));
            } else if (type === 'MANIFEST' && data.waste_manifest_no) {
                extracted = data.waste_manifest_no;
                if (!extracted.startsWith('M')) extracted = `M-${extracted}`;
                setCurrentTrip(p => ({ ...p, waste_manifest_no: extracted }));
            } else if (type === 'RECYCLE' && data.delivery_note_no) { // fallback
                extracted = data.delivery_note_no;
                if (!extracted.startsWith('R')) extracted = `R-${extracted}`;
                setCurrentTrip(p => ({ ...p, recycle_receipt_no: extracted }));
            }

            if (extracted) {
                addNotification({ 
                    title: isAr ? 'نجاح' : 'Success', 
                    message: isAr ? `تم التقاط: ${extracted}` : `Extracted: ${extracted}`, 
                    type: NotificationType.SUCCESS 
                });
            } else {
                addNotification({ 
                    title: isAr ? 'لم يتم العثور على رقم' : 'No Number Found', 
                    message: isAr ? 'لم يجد الذكاء الأصطناعي رقماً واضحاً.' : 'AI could not find a clear serial number.', 
                    type: NotificationType.WARNING 
                });
            }
        } catch (err) {
            console.error('OCR Error:', err);
            addNotification({ 
                title: isAr ? 'خطأ' : 'Error', 
                message: isAr ? 'فشل الاتصال بالذكاء الاصطناعي' : 'AI connection failed.', 
                type: NotificationType.ERROR 
            });
        } finally {
            setIsOcrProcessing(false);
        }
    };

    /**
     * Full OCR scan of a Delivery Note to auto-fill all trip fields.
     * Extracts text from the image, then fuzzy-matches against store entities.
     */
    const processDeliveryNoteFullOcr = async (base64: string) => {
        setIsOcrScanning(true);
        try {
            addNotification({
                title: isAr ? 'مسح سند التسليم' : 'Scanning Delivery Note',
                message: isAr ? 'جاري تحليل الصورة بخوارزميات الذكاء الاصطناعي...' : 'AI Vision is analyzing the document...',
                type: NotificationType.INFO,
            });

            const response = await api.processOcrVision(base64);
            const data = response.extracted;

            console.log('[AI Full Scan] Extracted data:', data);

            const matched: string[] = [];
            const updates: Partial<typeof currentTrip> = {};

            // --- Extract Exact Match Data ---
            if (data.delivery_note_no) {
                const dnStr = data.delivery_note_no.toString().startsWith('DN') ? data.delivery_note_no : `DN-${data.delivery_note_no}`;
                updates.delivery_note_no = dnStr;
                matched.push(isAr ? `رقم السند: ${dnStr}` : `DN#: ${dnStr}`);
            }

            if (data.waste_manifest_no) {
                const mStr = data.waste_manifest_no.toString().startsWith('M') ? data.waste_manifest_no : `M-${data.waste_manifest_no}`;
                updates.waste_manifest_no = mStr;
                matched.push(isAr ? `رقم المانفيست: ${mStr}` : `Manifest#: ${mStr}`);
            }

            if (data.date) {
                updates.date = data.date;
                matched.push(isAr ? `التاريخ: ${data.date}` : `Date: ${data.date}`);
            }

            if (data.quantity) {
                updates.quantity = data.quantity.toString();
                matched.push(isAr ? `الكمية: ${data.quantity}` : `Qty: ${data.quantity}`);
            }
            if (data.unit) {
                updates.unit = data.unit.toUpperCase();
            }

            // --- Fuzzy match against Store ---
            if (data.company_name) {
                const cName = data.company_name.toLowerCase();
                const matchedCompany = companies.find(c => cName.includes(c.company_name.toLowerCase()) || c.company_name.toLowerCase().includes(cName));
                if (matchedCompany) {
                    setSelectedCompanyId(matchedCompany.company_id);
                    matched.push(isAr ? `الشركة: ${matchedCompany.company_name}` : `Company: ${matchedCompany.company_name}`);
                }
            }

            if (data.project_name) {
                const pName = data.project_name.toLowerCase();
                const matchedProject = projects.find(p => pName.includes(p.project_name.toLowerCase()) || p.project_name.toLowerCase().includes(pName));
                if (matchedProject) {
                    updates.project_id = matchedProject.project_id;
                    if (!updates.company_id && !selectedCompanyId) {
                        setSelectedCompanyId(matchedProject.company_id);
                    }
                    matched.push(isAr ? `المشروع: ${matchedProject.project_name}` : `Project: ${matchedProject.project_name}`);
                }
            }

            if (data.driver_name) {
                const dName = data.driver_name.toLowerCase();
                const matchedDriver = drivers.find(d => d.status === 'ACTIVE' && d.name && (dName.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(dName)));
                if (matchedDriver) {
                    updates.driver_id = matchedDriver.driver_id;
                    if (matchedDriver.ownership_type === 'SUPPLIER' && matchedDriver.supplier_id) {
                        setTripOwnership('SUPPLIER');
                        setSelectedSupplierId(matchedDriver.supplier_id);
                    }
                    matched.push(isAr ? `السائق: ${matchedDriver.name}` : `Driver: ${matchedDriver.name}`);
                }
            }

            if (data.vehicle_plate) {
                const vPlate = data.vehicle_plate.replace(/[\s-]/g, '').toLowerCase();
                const matchedVehicle = vehicles.find(v => v.status === 'ACTIVE' && v.plate_no.replace(/[\s-]/g, '').toLowerCase().includes(vPlate));
                if (matchedVehicle) {
                    updates.vehicle_id = matchedVehicle.vehicle_id;
                    matched.push(isAr ? `المركبة: ${matchedVehicle.plate_no}` : `Vehicle: ${matchedVehicle.plate_no}`);
                }
            }

            if (data.service_name) {
                const sName = data.service_name.toLowerCase();
                const matchedService = services.find(s => s.service_name && (sName.includes(s.service_name.toLowerCase()) || s.service_name.toLowerCase().includes(sName)));
                if (matchedService) {
                    updates.service_id = matchedService.service_id;
                    matched.push(isAr ? `الخدمة: ${matchedService.service_name}` : `Service: ${matchedService.service_name}`);
                }
            }

            updates.delivery_note_file = base64;

            if (Object.keys(updates).length > 1) { 
                setCurrentTrip(prev => ({ ...prev, ...updates }));
                addNotification({
                    title: isAr ? 'تم الذكاء بنجاح' : 'AI Scan Complete',
                    message: matched.length > 0
                        ? (isAr ? `تم التعرف بدقة على ${matched.length} حقول:\n${matched.join('، ')}` : `Perfectly extracted ${matched.length} fields: ${matched.join(', ')}`)
                        : (isAr ? 'تم الرفع لكن الذكاء الاصطناعي لم يطابق البيانات.' : 'AI analyzed but no store records matched.'),
                    type: matched.length > 0 ? NotificationType.SUCCESS : NotificationType.WARNING,
                });
            } else {
                setCurrentTrip(prev => ({ ...prev, delivery_note_file: base64 }));
            }
        } catch (err) {
            console.error('[OCR Full Scan] Error:', err);
            addNotification({
                title: isAr ? 'خطأ في الذكاء الاصطناعي' : 'AI Analysis Error',
                message: isAr ? 'واجه الخادم مشكلة في تحليل الصورة.' : 'The Server AI encountered an error analyzing the image.',
                type: NotificationType.ERROR,
            });
        } finally {
            setIsOcrScanning(false);
        }
    };

    const handleOcrScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            processDeliveryNoteFullOcr(base64);
        };
        reader.readAsDataURL(file);
        // Reset input so re-uploading same file triggers onChange
        if (e.target) e.target.value = '';
    };
    const [currentTrip, setCurrentTrip] = useState<Partial<Trip>>({
        unit: 'TON',
        proof_images: [],
        date: formatDate(new Date().toISOString(), 'yyyy-MM-dd'),
        time: formatDate(new Date().toISOString(), 'HH:mm'),
        recycle_receipt_no: '',
        trip_location_url: '',
        container_size: '',
        inventory_item_id: '',
        manifest_file: '',
        delivery_note_file: '',
        recycle_file: '',
        project_id: '',
        supervisor_name: '',
        gcm_supervisor_name: '',
        driver_id: '',
        vehicle_id: '',
        service_id: '',
        facility_id: '',
        is_manifest_generated: false,
        is_delivery_note_generated: false
    });

    const translations = {
        newTrip: t('wizard.newTrip'),
        editTrip: t('wizard.editTrip'),
        next: t('wizard.next'),
        back: t('wizard.back'),
        save: t('wizard.save'),
    };

    const resetForm = () => {
        setWizardStep(1);
        setSubmissionError('');
        setSelectedCompanyId('');
        setSelectedSupplierId('');
        setTripOwnership('INTERNAL');
        setCurrentTrip({
            unit: 'TON', proof_images: [], date: formatDate(new Date().toISOString(), 'yyyy-MM-dd'), time: formatDate(new Date().toISOString(), 'HH:mm'),
            recycle_receipt_no: '', trip_location_url: '', container_size: '', inventory_item_id: '',
            manifest_file: '', delivery_note_file: '', recycle_file: '',
            status: currentUser?.role === Role.DATA_ENTRY ? TripStatus.PENDING_REVIEW : TripStatus.IN_PROGRESS,
            project_id: '', supervisor_name: '', gcm_supervisor_name: '', driver_id: '', vehicle_id: '', service_id: '', facility_id: '',
            is_manifest_generated: false, is_delivery_note_generated: false
        });
    };

    // Initialize form when opening
    useEffect(() => {
        if (!isOpen) return;
        const timerId = window.setTimeout(() => {
            if (tripToEdit) {
                const project = projectMap[tripToEdit.project_id];
                if (project) setSelectedCompanyId(project.company_id);
                let loadedProofImages = safeParseArray(tripToEdit.proof_images);
                if (tripToEdit.request_container_image && !loadedProofImages.includes(tripToEdit.request_container_image)) {
                    loadedProofImages = [tripToEdit.request_container_image, ...loadedProofImages];
                }

                setCurrentTrip({
                    ...tripToEdit,
                    trip_location_url: tripToEdit.trip_location_url || tripToEdit.request_location_url || '',
                    proof_images: loadedProofImages
                });

                // Detect ownership
                if (tripToEdit.vehicle_id) {
                    const v = vehicleMap[tripToEdit.vehicle_id];
                    if (v) {
                        setTripOwnership(v.ownership_type === 'SUPPLIER' ? 'SUPPLIER' : 'INTERNAL');
                        if (v.supplier_id) setSelectedSupplierId(v.supplier_id);
                    }
                } else {
                    setTripOwnership('INTERNAL');
                }

                // Handle deep linking and warnings
                if (initialStep) setWizardStep(initialStep);
                if (initialWarnings && initialWarnings.length > 0) {
                    setSubmissionError(initialWarnings.join('. '));
                } else {
                    setSubmissionError('');
                }
            } else {
                resetForm();
            }
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [isOpen, tripToEdit, initialStep, initialWarnings, projectMap, vehicleMap]);

    const getNextNumber = (prefix: 'M-' | 'DN-') => {
        const existingTrips = trips || [];
        const numbers = existingTrips
            .map(t => prefix === 'M-' ? t.waste_manifest_no : t.delivery_note_no)
            .filter(n => n && n.startsWith(prefix))
            .map(n => parseInt(n!.replace(prefix, '')))
            .filter(n => !isNaN(n));

        const max = numbers.length > 0 ? Math.max(...numbers) : 0;
        return `${prefix}${(max + 1).toString().padStart(6, '0')}`;
    };

    // [AR] الخدمة المختارة — لتحديد إذا كانت تتطلب إيصال تدوير
    // [EN] Selected service — to determine if recycle receipt is required
    const selectedService = useMemo(() => {
        return serviceMap[currentTrip.service_id!];
    }, [serviceMap, currentTrip.service_id]);

    const reqRecycle = selectedService?.requires_recycle_receipt as unknown;
    const reqRecycleStr = String(reqRecycle).toLowerCase();
    const requiresRecycleReceipt = reqRecycle === true || reqRecycleStr === 'true' || reqRecycleStr === '1';


    const nearDuplicates = useMemo(() => {
        if (!currentTrip.vehicle_id || !currentTrip.date || !currentTrip.project_id || !currentTrip.service_id) return [];
        return (trips || []).filter(xt => 
            xt.trip_id !== currentTrip.trip_id &&
            xt.vehicle_id === currentTrip.vehicle_id &&
            xt.date === currentTrip.date && 
            xt.project_id === currentTrip.project_id &&
            xt.service_id === currentTrip.service_id
        );
    }, [trips, currentTrip.vehicle_id, currentTrip.date, currentTrip.project_id, currentTrip.service_id, currentTrip.trip_id]);

    const validateStep = async (step: number): Promise<boolean> => {
        setSubmissionError('');
        if (step === 1) {
            if (!selectedCompanyId || !currentTrip.project_id) {
                setSubmissionError(t('wizard.validation.entityRequired'));
                return false;
            }
            if (tripOwnership === 'SUPPLIER' && !selectedSupplierId) {
                setSubmissionError(t('wizard.validation.supplierRequired'));
                return false;
            }
        }
        if (step === 2) {
            const isActiveStage = [TripStatus.IN_PROGRESS, TripStatus.PENDING_DOCS, TripStatus.COMPLETED, TripStatus.PENDING_REVIEW].includes(currentTrip.status as TripStatus);
            if (isActiveStage && (!currentTrip.driver_id || !currentTrip.vehicle_id)) {
                setSubmissionError(t('wizard.validation.crewRequired'));
                return false;
            }
            // [POLICY] Driver/Vehicle warnings are non-blocking — admin can proceed.
            if (currentTrip.driver_id) {
                const d = driverMap[currentTrip.driver_id];
                if (d) {
                    const dRes = validateDriverForTrip(d);
                    if (!dRes.valid) { toast.warning(isAr ? dRes.errorAr! : dRes.errorEn!); }
                }
            }
            if (currentTrip.vehicle_id) {
                const v = vehicleMap[currentTrip.vehicle_id];
                if (v) {
                    const vRes = validateVehicleForTrip(v);
                    if (!vRes.valid) { toast.warning(isAr ? vRes.errorAr! : vRes.errorEn!); }
                }
            }
            // Date guard: no future dates beyond 1 day
            if (currentTrip.date) {
                const tripDate = new Date(currentTrip.date);
                const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                if (tripDate > tomorrow) {
                    setSubmissionError(isAr ? 'لا يمكن تسجيل رحلة بتاريخ مستقبلي أكثر من يوم' : 'Trip date cannot be more than 1 day in the future');
                    return false;
                }
            }
        }
        if (step === 3) {
            if (!currentTrip.quantity || !currentTrip.service_id || !currentTrip.facility_id) {
                setSubmissionError(t('wizard.validation.mandatoryFields'));
                return false;
            }
            const qty = parseFloat(String(currentTrip.quantity));
            if (isNaN(qty) || qty <= 0) {
                setSubmissionError(isAr ? 'الكمية يجب أن تكون أكبر من صفر' : 'Quantity must be greater than zero');
                return false;
            }
            if (currentTrip.facility_id && currentTrip.service_id) {
                const f = facilities.find(fac => fac.facility_id === currentTrip.facility_id);
                if (f) {
                    const fRes = validateFacilityAcceptsService(f, currentTrip.service_id);
                    if (!fRes.valid) { setSubmissionError(isAr ? fRes.errorAr! : fRes.errorEn!); return false; }
                }
            }
            if (qty > 50 && currentTrip.unit === 'TON') {
                const confirmed = await confirm({
                    title: isAr ? 'تنبيه' : 'Warning',
                    message: isAr ? `الكمية ${qty} طن مرتفعة جداً. هل أنت متأكد؟` : `${qty} TON is unusually high. Continue?`,
                    confirmLabel: isAr ? 'متابعة' : 'Continue',
                    variant: 'warning'
                });
                if (!confirmed) return false;
            }
        }
        return true;
    };

    // [AR] التحقق من المستندات وعرض popup التأكيد
    // [EN] Validate documents and show confirmation popup
    const handlePreSave = async (mode: 'save' | 'clone') => {
        setSubmissionError('');
        if (!currentTrip.waste_manifest_no) { setSubmissionError(t('wizard.validation.manifestRequired')); return; }
        if (!currentTrip.delivery_note_no) { setSubmissionError(t('wizard.validation.dnRequired')); return; }
        if (!currentTrip.is_manifest_generated && !currentTrip.manifest_file) { setSubmissionError(t('wizard.validation.uploadOrGenerate')); return; }
        if (!currentTrip.is_delivery_note_generated && !currentTrip.delivery_note_file) { setSubmissionError(t('wizard.validation.uploadOrGenerate')); return; }

        // Recycle receipt validation (conditional) - User requested to make it optional
        // if (requiresRecycleReceipt) {
        //     if (!currentTrip.recycle_receipt_no) { setSubmissionError(isAr ? 'رقم إيصال التدوير مطلوب لهذه الخدمة' : 'Recycle receipt number is required for this service'); return; }
        //     if (!currentTrip.recycle_file) { setSubmissionError(isAr ? 'يجب رفع ملف إيصال التدوير' : 'Recycle receipt file is required'); return; }
        // }

        // Duplicate checks
        const existingTrips = trips || [];
        const manifestDup = existingTrips.find(xt => xt.trip_id !== currentTrip.trip_id && xt.waste_manifest_no && xt.waste_manifest_no === currentTrip.waste_manifest_no);
        if (manifestDup) { setSubmissionError(isAr ? `رقم المانفيست (${currentTrip.waste_manifest_no}) موجود في الرحلة ${manifestDup.trip_id}` : `Manifest #${currentTrip.waste_manifest_no} exists in trip ${manifestDup.trip_id}`); return; }
        const dnDup = existingTrips.find(xt => xt.trip_id !== currentTrip.trip_id && xt.delivery_note_no && xt.delivery_note_no === currentTrip.delivery_note_no);
        if (dnDup) { setSubmissionError(isAr ? `رقم سند التسليم (${currentTrip.delivery_note_no}) موجود في الرحلة ${dnDup.trip_id}` : `DN #${currentTrip.delivery_note_no} exists in trip ${dnDup.trip_id}`); return; }

        // Date warning for old dates
        if (currentTrip.date) {
            const tripDate = new Date(currentTrip.date);
            const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (tripDate < thirtyDaysAgo) {
                const confirmed = await confirm({
                    title: isAr ? 'تنبيه' : 'Warning',
                    message: isAr ? `تاريخ الرحلة (${currentTrip.date}) أقدم من 30 يوم. هل تريد المتابعة؟` : `Trip date (${currentTrip.date}) is older than 30 days. Continue?`,
                    confirmLabel: isAr ? 'متابعة' : 'Continue',
                    variant: 'warning'
                });
                if (!confirmed) return;
            }
        }

        // All validations passed — show confirmation popup
        setPendingSaveMode(mode);
        setShowConfirmation(true);
    };

    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setShowConfirmation(false);
        try {
            // Calculate Cost based on Supplier Rates
            let costPrice = 0;
            if (currentTrip.vehicle_id && currentTrip.project_id && currentTrip.service_id) {
                const vehicle = vehicleMap[currentTrip.vehicle_id];
                if (vehicle?.supplier_id) {
                    const rate = supplierRates.find(r =>
                        r.project_id === currentTrip.project_id &&
                        r.supplier_id === vehicle.supplier_id &&
                        r.service_id === currentTrip.service_id
                    );
                    costPrice = rate ? rate.cost_price : 0;
                }
            }

            let finalTripId = currentTrip.trip_id;
            if (!finalTripId) {
                const now = new Date();
                const datePrefix = `T-${formatDate(now.toISOString(), 'yyyyMMdd')}`;
                const tripsToday = trips.filter(t => t.trip_id && t.trip_id.startsWith(datePrefix));
                const tripNumbers = tripsToday.map(t => parseInt(t.trip_id.replace(datePrefix, '')) || 0);
                const maxNumber = tripNumbers.length > 0 ? Math.max(...tripNumbers) : 0;
                const seqNumber = String(maxNumber + 1).padStart(3, '0');
                finalTripId = `${datePrefix}${seqNumber}`;
            }
            let newStatus = currentTrip.status || TripStatus.IN_PROGRESS;
            if (currentUser.role === Role.DATA_ENTRY && ![TripStatus.COMPLETED, TripStatus.CANCELLED].includes(newStatus as TripStatus)) {
                newStatus = TripStatus.PENDING_REVIEW;
            }
            if (newStatus === TripStatus.REQUESTED && currentTrip.driver_id) {
                newStatus = TripStatus.ASSIGNED;
            }

            // Auto-generate documents — DEFERRED to on-demand (print/export) for performance.
            // The flags (is_manifest_generated, is_delivery_note_generated) are still saved,
            // so the system knows to auto-generate when the user views/prints the document.
            // Manual uploads (manifest_file, delivery_note_file) are still passed through as-is.
            const tripDataForSave: Partial<Trip> = { ...currentTrip };

            const resolvedProject = currentTrip.project_id ? projectMap[currentTrip.project_id] : undefined;
            const resolvedCompanyId = resolvedProject?.company_id || selectedCompanyId || '';

            const finalSavedTrip = {
                ...tripDataForSave,
                trip_id: finalTripId,
                status: newStatus,
                project_id: currentTrip.project_id,
                service_id: currentTrip.service_id,
                company_id: resolvedCompanyId,
                gcm_supervisor_name: currentTrip.gcm_supervisor_name,
                notes: (currentTrip.notes || '') + (costPrice > 0 ? ` [Rate: ${costPrice}]` : ''),
                proof_images: JSON.stringify(currentTrip.proof_images || [])
            };

            await upsertTrip(finalSavedTrip as unknown as Trip);

            // Clone Mode: save and prepare a new similar trip
            if (pendingSaveMode === 'clone') {
                const nextM = getNextNumber('M-');
                const nextDN = getNextNumber('DN-');
                setCurrentTrip(prev => {
                    const { trip_id, supervisor_signature, ...rest } = prev;
                    return {
                    ...rest,
                    driver_id: '',
                    vehicle_id: '',
                    waste_manifest_no: nextM,
                    delivery_note_no: nextDN,
                    manifest_file: '',
                    delivery_note_file: '',
                    recycle_receipt_no: '',
                    recycle_file: '',
                    proof_images: [],
                    notes: ''
                    };
                });
                setWizardStep(2);
                setSubmissionError('');
                addNotification({ title: isAr ? 'استنساخ' : 'Cloned', message: isAr ? 'تم الحفظ — أدخل بيانات السائق والمركبة للرحلة التالية' : 'Saved — enter driver & vehicle for the next trip', type: NotificationType.INFO });
            } else {
                // Close wizard and pass saved trip to parent (Trips.tsx handles SignatureApproveModal)
                const savedTripForUi = { ...finalSavedTrip, proof_images: currentTrip.proof_images || [] };
                onClose(savedTripForUi as unknown as Trip);
                addNotification({ title: t('common.success'), message: isAr ? 'تم حفظ الرحلة بنجاح' : 'Trip saved successfully', type: NotificationType.SUCCESS });
            }
        } catch (err: unknown) {
            const errorData = (err as { response?: { data?: { errorAr?: string; errorEn?: string } }; message?: string }) || {};
            const msg = errorData.response?.data?.errorAr || errorData.response?.data?.errorEn || errorData.message || '';
            setSubmissionError(isAr ? `خطأ: ${msg || 'فشل الاتصال بالسيرفر'}` : `Error: ${msg || 'Server connection failed'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCaptureGps = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                    setCurrentTrip(prev => ({ ...prev, trip_location_url: url }));
                },
                () => {
                    setSubmissionError(t('wizard.validation.gpsFailed'));
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    };

    return (
        <>
        <Modal size="2xl" isOpen={isOpen} onClose={() => onClose()} title={tripToEdit ? translations.editTrip : translations.newTrip}>
            <div className={`space-y-6 max-h-[85vh] overflow-y-auto px-6 py-2 custom-scrollbar ${isAr ? 'text-right' : 'text-left'}`}>

                <div className="flex gap-2 p-1.5 bg-surface-subtle rounded-2xl border border-border">
                    {[1, 2, 3, 4].map(s => (
                        <button
                            key={s}
                            disabled={!currentTrip.trip_id && s > wizardStep}
                            onClick={() => setWizardStep(s)}
                            className="flex-1 flex flex-col items-center gap-2 py-2 group disabled:cursor-not-allowed"
                        >
                            <div className={`h-2 w-full rounded-full transition-all duration-500 ${wizardStep >= s ? 'bg-primary' : 'bg-surface'}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${wizardStep === s ? 'text-primary' : 'text-text-subtle opacity-50'}`}>
                                {s === 1 ? t('wizard.steps.entity') : s === 2 ? t('wizard.steps.logistics') : s === 3 ? t('wizard.steps.measurements') : t('wizard.steps.documents')}
                            </span>
                        </button>
                    ))}
                </div>

                {submissionError && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-danger-muted border-2 border-danger/20 rounded-2xl flex items-center gap-6 text-danger text-lg font-bold shadow-xl">
                        <AlertCircle size={32} className="shrink-0" /> {submissionError}
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {wizardStep === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">

                            {/* Ownership Toggle */}
                            <div className="bg-surface-subtle p-1 rounded-xl flex">
                                <button
                                    onClick={() => { setTripOwnership('INTERNAL'); setSelectedSupplierId(''); }}
                                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${tripOwnership === 'INTERNAL' ? 'bg-primary text-surface shadow-lg' : 'text-text-subtle hover:text-text-main'}`}
                                >
                                    {isAr ? 'أسطول الشركة' : 'Internal Fleet'}
                                </button>
                                <button
                                    onClick={() => setTripOwnership('SUPPLIER')}
                                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${tripOwnership === 'SUPPLIER' ? 'bg-primary text-surface shadow-lg' : 'text-text-subtle hover:text-text-main'}`}
                                >
                                    {isAr ? 'مورد خارجي' : 'External Supplier'}
                                </button>
                            </div>

                            {/* Specific Supplier Selection */}
                            <AnimatePresence>
                                {tripOwnership === 'SUPPLIER' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                        <SearchableSelect
                                            label={isAr ? 'المورد' : 'Supplier'}
                                            icon={Truck}
                                            value={selectedSupplierId}
                                            onChange={val => setSelectedSupplierId(val)}
                                            options={suppliers.filter(s => s.status === 'ACTIVE').map(s => ({ label: s.name, value: s.supplier_id }))}
                                            placeholder={isAr ? '--- اختر المورد ---' : '--- Select Supplier ---'}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-4">
                                <SearchableSelect
                                    label={t('analytics.filters.company')}
                                    icon={Building2}
                                    value={selectedCompanyId}
                                    onChange={val => { setSelectedCompanyId(val); setCurrentTrip(p => ({ ...p, project_id: '' })); }}
                                    options={companies.map(c => ({ label: c.company_name, value: c.company_id }))}
                                    placeholder={isAr ? '--- اختر الشركة ---' : '--- Choose Entity ---'}
                                />

                                <SearchableSelect
                                    label={t('analytics.filters.project')}
                                    icon={MapPin}
                                    value={currentTrip.project_id || ''}
                                    onChange={val => setCurrentTrip(p => ({ ...p, project_id: val }))}
                                    options={projects.filter(p => p.company_id === selectedCompanyId).map(p => ({ label: p.project_name, value: p.project_id }))}
                                    placeholder={isAr ? '--- حدد المشروع ---' : '--- Choose Site ---'}
                                    containerClassName={`transition-all duration-500 ${!selectedCompanyId ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}
                                />
                            </div>


                            <Button
                                variant="primary"
                                onClick={async () => (await validateStep(1)) && setWizardStep(2)}
                                className="w-full py-6 rounded-xl"
                                icon={ArrowRight}
                            >
                                {translations.next}
                            </Button>
                        </motion.div>
                    )}

                    {wizardStep === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        type="date"
                                        label={t('wizard.date')}
                                        value={currentTrip.date || ''}
                                        onChange={val => setCurrentTrip(p => ({ ...p, date: val }))}
                                    />
                                    <Input
                                        type="time"
                                        label={t('wizard.time')}
                                        value={currentTrip.time || ''}
                                        onChange={val => setCurrentTrip(p => ({ ...p, time: val }))}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        const now = new Date();
                                        setCurrentTrip(p => ({ ...p, date: formatDate(now.toISOString(), 'yyyy-MM-dd'), time: formatDate(now.toISOString(), 'HH:mm') }));
                                    }}
                                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                                    icon={Clock}
                                >
                                    {isAr ? 'تعيين الوقت والتاريخ للحظة الحالية' : 'Capture Current Time'}
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <SearchableSelect
                                    label={t('analytics.filters.driver')}
                                    icon={UserCheck}
                                    value={currentTrip.driver_id || ''}
                                    onChange={val => {
                                        setCurrentTrip(p => {
                                            const updates = { ...p, driver_id: val };
                                            // Auto-select associated vehicle if the driver has one
                                            if (val) {
                                                const selectedDriver = driverMap[val];
                                                if (selectedDriver && selectedDriver.vehicle_id) {
                                                    updates.vehicle_id = selectedDriver.vehicle_id;
                                                }
                                            }
                                            return updates;
                                        });
                                    }}
                                    options={drivers.filter(d =>
                                        d.status === 'ACTIVE' &&
                                        (tripOwnership === 'INTERNAL'
                                            ? (!d.ownership_type || d.ownership_type === 'INTERNAL')
                                            : ((d.ownership_type === 'SUPPLIER' && d.supplier_id === selectedSupplierId) || (!d.ownership_type && d.supplier_id === selectedSupplierId))
                                        )
                                    ).map(d => ({ label: d.name, value: d.driver_id }))}
                                    placeholder={isAr ? '--- السائق ---' : '--- Personnel ---'}
                                />

                                {/* Driver → Vehicle → Service auto-info badge */}
                                {(() => {
                                    const selectedDriver = driverMap[currentTrip.driver_id!];
                                    const linkedVehicle = selectedDriver?.vehicle_id ? vehicleMap[selectedDriver.vehicle_id] : null;
                                    if (!selectedDriver || !linkedVehicle) return null;
                                    const vehicleServiceLinks = assetServiceLinks.filter(l => l.asset_type === 'VEHICLE' && l.asset_id === linkedVehicle.vehicle_id);
                                    const linkedServices = vehicleServiceLinks.map(l => serviceMap[l.service_id]).filter(Boolean);
                                    const isTankType = linkedServices.some(s => {
                                        const parent = s?.parent_id ? serviceMap[s.parent_id] : null;
                                        return s?.category === 'WATER' || s?.service_name?.toLowerCase().includes('water') || s?.service_name?.toLowerCase().includes('sewage') || (parent && (parent.service_name.toLowerCase().includes('sewage') || parent.service_name.toLowerCase().includes('water')));
                                    });
                                    const equipLabel = isTankType
                                        ? (isAr ? 'تانك (خزان)' : 'Tank')
                                        : (isAr ? 'حاوية (Container)' : 'Container');
                                    const equipColor = isTankType ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700';
                                    const badgeColor = isTankType ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800';
                                    return (
                                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${equipColor} transition-all animate-in fade-in`}>
                                            <Truck size={16} />
                                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                <span className="text-[11px] font-bold truncate">{linkedVehicle.plate_no} ({linkedVehicle.vehicle_type})</span>
                                                {linkedServices.length > 0 && (
                                                    <span className="text-[10px] opacity-75 truncate">{linkedServices.map(s => s?.service_name).join(', ')}</span>
                                                )}
                                            </div>
                                            <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${badgeColor}`}>
                                                {equipLabel}
                                            </span>
                                        </div>
                                    );
                                })()}

                                <SearchableSelect
                                    label={t('wizard.fleetUnit')}
                                    icon={Truck}
                                    value={currentTrip.vehicle_id || ''}
                                    onChange={val => setCurrentTrip(p => ({ ...p, vehicle_id: val }))}
                                    options={vehicles.filter(v =>
                                        v.status === 'ACTIVE' &&
                                        (tripOwnership === 'INTERNAL'
                                            ? (!v.ownership_type || v.ownership_type === 'INTERNAL')
                                            : (v.ownership_type === 'SUPPLIER' && v.supplier_id === selectedSupplierId)
                                        )
                                    ).sort((a, b) => {
                                        if (!currentTrip.service_id) return 0;
                                        const aLinked = assetServiceLinks.some(l => l.asset_id === a.vehicle_id && l.service_id === currentTrip.service_id);
                                        const bLinked = assetServiceLinks.some(l => l.asset_id === b.vehicle_id && l.service_id === currentTrip.service_id);
                                        if (aLinked && !bLinked) return -1;
                                        if (!aLinked && bLinked) return 1;
                                        return 0;
                                    }).map(v => {
                                        const isLinked = currentTrip.service_id ? assetServiceLinks.some(l => l.asset_id === v.vehicle_id && l.service_id === currentTrip.service_id) : false;
                                        return { label: `${v.plate_no} (${v.vehicle_type})${isLinked ? ' (Matched)' : ''}`, value: v.vehicle_id };
                                    })}
                                    placeholder={isAr ? '--- الشاحنة ---' : '--- Transport ID ---'}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SearchableSelect
                                        label={t('wizard.siteSupervisor')}
                                        icon={HardHat}
                                        value={currentTrip.supervisor_name || ''}
                                        onChange={val => setCurrentTrip(p => ({ ...p, supervisor_name: val }))}
                                        options={[
                                            ...users.filter(u => u.role === Role.PROJECT_USER && u.project_id === currentTrip.project_id).map(u => ({ label: u.name, value: u.name })),
                                            ...(currentTrip.supervisor_name && !users.some(u => u.role === Role.PROJECT_USER && u.project_id === currentTrip.project_id && u.name === currentTrip.supervisor_name) 
                                                ? [{ label: `${currentTrip.supervisor_name} (Approved)`, value: currentTrip.supervisor_name }] 
                                                : [])
                                        ]}
                                        placeholder={isAr ? '--- مشرف الموقع ---' : '--- Site Supervisor ---'}
                                    />
                                    <SearchableSelect
                                        label={t('wizard.gcmSupervisor')}
                                        icon={UserCheck}
                                        value={currentTrip.gcm_supervisor_name || ''}
                                        onChange={val => setCurrentTrip(p => ({ ...p, gcm_supervisor_name: val }))}
                                        options={users
                                            .filter(u => u.role === Role.LOGISTICS || u.role === Role.ADMIN || u.role === Role.DATA_ENTRY)
                                            .map(u => ({ label: `${u.name} (${u.role})`, value: u.name }))}
                                        placeholder={isAr ? '--- مشرف GCM ---' : '--- GCM Supervisor ---'}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button variant="ghost" onClick={() => setWizardStep(1)} className="px-8">{translations.back}</Button>
                                <Button
                                    variant="primary"
                                    onClick={async () => (await validateStep(2)) && setWizardStep(3)}
                                    className="flex-1 py-5 rounded-2xl"
                                    icon={ArrowRight}
                                >
                                    {translations.next}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {wizardStep === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                            <div className="w-full p-6 sm:p-8 bg-surface-elevated rounded-3xl shadow-xl flex flex-col items-center gap-4 relative overflow-hidden border-b-4 border-success">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full" />
                                <label className="relative z-10 text-[10px] font-bold text-success uppercase tracking-widest">{t('wizard.weightReport')}</label>
                                <div className="relative z-10 flex flex-col items-center gap-4">
                                    <div className="flex items-center gap-6">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className="w-[120px] sm:w-[180px] bg-white/5 border-none outline-none text-4xl sm:text-6xl font-bold text-text-main text-center rounded-2xl p-4 placeholder-text-main/5 transition-all focus:bg-white/10"
                                            placeholder="0.00"
                                            value={currentTrip.quantity || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) setCurrentTrip(p => ({ ...p, quantity: val }));
                                            }}
                                        />
                                        <div className="flex flex-col gap-2">
                                            {(() => {
                                                const s = serviceMap[currentTrip.service_id!];
                                                const parent = s?.parent_id ? serviceMap[s.parent_id] : null;
                                                const checkHazard = (name: string) => name.toLowerCase().includes('hazard') && !name.toLowerCase().includes('non');
                                                const isHazardous = s?.category === 'HAZARDOUS' || checkHazard(s?.service_name || '') || (parent && checkHazard(parent.service_name)) || false;
                                                const isSewage = s?.service_name?.toLowerCase().includes('sewage') || (parent && parent.service_name.toLowerCase().includes('sewage')) || false;
                                                const isWater = s?.service_name?.toLowerCase().includes('water') || (parent && parent.service_name.toLowerCase().includes('water')) || false;
                                                const availableUnits = (isSewage || isWater) ? ['CBM'] : (isHazardous ? ['KG'] : ['TON', 'CBM', 'KG']);

                                                return availableUnits.map((u: 'TON' | 'KG' | 'CBM') => (
                                                    <Button
                                                        key={u}
                                                        variant={currentTrip.unit === u ? 'primary' : 'ghost'}
                                                        onClick={() => setCurrentTrip(p => ({ ...p, unit: u as 'TON' | 'KG' | 'CBM' }))}
                                                        className="px-4 py-2 text-sm"
                                                    >
                                                        {u}
                                                    </Button>
                                                ));
                                            })()}
                                        </div>
                                    </div>

                                    {/* Presets for Amounts */}
                                    {(() => {
                                        const s = serviceMap[currentTrip.service_id!];
                                        const parent = s?.parent_id ? serviceMap[s.parent_id] : null;
                                        const checkHazard = (name: string) => name.toLowerCase().includes('hazard') && !name.toLowerCase().includes('non');
                                        const isHazardous = s?.category === 'HAZARDOUS' || checkHazard(s?.service_name || '') || (parent && checkHazard(parent.service_name)) || false;
                                        const isSewage = s?.service_name?.toLowerCase().includes('sewage') || (parent && parent.service_name.toLowerCase().includes('sewage')) || false;
                                        const isWater = s?.service_name?.toLowerCase().includes('water') || (parent && parent.service_name.toLowerCase().includes('water')) || false;
                                        
                                        if (isSewage || isWater) {
                                            return (
                                                <div className="flex gap-2">
                                                    {[16, 18, 32].map(num => (
                                                        <button
                                                            key={num}
                                                            onClick={() => setCurrentTrip(prev => ({ ...prev, quantity: num.toString(), unit: 'CBM' }))}
                                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${currentTrip.quantity === num.toString() && currentTrip.unit === 'CBM' ? 'bg-success text-white border-success' : 'bg-surface/50 text-text-subtle border-border hover:bg-surface'}`}
                                                        >
                                                            {num} CBM
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        } else if (!isHazardous) {
                                            return (
                                                <div className="flex gap-2">
                                                    {[5, 16, 32].map(num => (
                                                        <button
                                                            key={num}
                                                            onClick={() => setCurrentTrip(prev => ({ ...prev, quantity: num.toString(), unit: 'TON' }))}
                                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${currentTrip.quantity === num.toString() && currentTrip.unit === 'TON' ? 'bg-success text-white border-success' : 'bg-surface/50 text-text-subtle border-border hover:bg-surface'}`}
                                                        >
                                                            {num} {isAr ? 'طن' : 'TON'}
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>

                            <div className="p-6 bg-surface-subtle rounded-3xl border-2 border-border space-y-6">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold uppercase text-text-subtle tracking-widest px-2 flex items-center gap-2"><AlertCircle size={14} className="text-primary" /> {t('wizard.serviceType')}</label>
                                        <select
                                            aria-label={t('wizard.serviceType')}
                                            className="w-full p-4 bg-surface rounded-2xl font-bold text-base outline-none border-2 border-transparent focus:border-primary shadow-sm text-text-main"
                                            value={currentTrip.service_id || ''}
                                            onChange={e => {
                                                const sid = e.target.value;
                                                const s = serviceMap[sid];
                                                const parent = s?.parent_id ? serviceMap[s.parent_id] : null;
                                                const checkHazard = (name: string) => name.toLowerCase().includes('hazard') && !name.toLowerCase().includes('non');
                                                const isHazardous = s?.category === 'HAZARDOUS' || checkHazard(s?.service_name || '') || (parent && checkHazard(parent.service_name)) || false;
                                                const isWater = s?.service_name?.toLowerCase().includes('water') || (parent && parent.service_name.toLowerCase().includes('water')) || false;
                                                const isSewage = s?.service_name?.toLowerCase().includes('sewage') || (parent && parent.service_name.toLowerCase().includes('sewage')) || false;

                                                setCurrentTrip(p => {
                                                    let newUnit = p.unit || '';
                                                    // Auto-correct unit if it doesn't match the new service's constraints
                                                    const validUnits = (isSewage || isWater) ? ['CBM'] : (isHazardous ? ['KG'] : ['TON', 'CBM', 'KG']);
                                                    
                                                    if (!validUnits.includes(newUnit)) {
                                                        newUnit = validUnits[0] || 'TON';
                                                    }
                                                    return {
                                                        ...p,
                                                        service_id: sid,
                                                        unit: newUnit as 'TON' | 'KG' | 'CBM'
                                                    };
                                                });
                                            }}
                                        >
                                            <option value="">{isAr ? '--- حدد الخدمة المسندة ---' : '--- Choose Assigned Service ---'}</option>
                                            {projectServices
                                                .filter(ps => ps.project_id === currentTrip.project_id)
                                                .map(ps => {
                                                    const s = serviceMap[ps.service_id];
                                                    return <option key={ps.service_id} value={ps.service_id}>{s?.service_name || ps.service_id}</option>;
                                                })}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold uppercase text-text-subtle tracking-widest px-2 flex items-center gap-2"><MapPin size={14} className="text-primary" /> {t('wizard.disposalSite')}</label>
                                        <select
                                            aria-label={t('wizard.disposalSite')}
                                            className="w-full p-4 bg-surface rounded-2xl font-bold text-base outline-none border-2 border-transparent focus:border-primary shadow-sm text-text-main"
                                            value={currentTrip.facility_id || ''}
                                            onChange={e => setCurrentTrip(p => ({ ...p, facility_id: e.target.value }))}
                                        >
                                            <option value="">{isAr ? '--- حدد الموقع النهائي ---' : '--- Choose Destination ---'}</option>
                                            {facilities
                                                .filter(f => {
                                                    if (f.status !== 'ACTIVE') return false;
                                                    // Defensive check: handle cases where accepted_services might be missing or non-array
                                                    const accepted = safeParseArray(f.accepted_services);
                                                    return accepted.includes(currentTrip.service_id!);
                                                })
                                                .map(f => (
                                                    <option key={f.facility_id} value={f.facility_id}>{f.name} ({f.type})</option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {(() => {
                                            const s = serviceMap[currentTrip.service_id!];
                                            const parent = s?.parent_id ? serviceMap[s.parent_id] : null;
                                            const isSewageOrWater = s?.category === 'WATER' || s?.service_name?.toLowerCase().includes('water') || s?.service_name?.toLowerCase().includes('sewage') || (parent && (parent.service_name.toLowerCase().includes('sewage') || parent.service_name.toLowerCase().includes('water'))) || false;
                                            const availableItems = isSewageOrWater ? tanks : containers;

                                            return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {/* MANDATORY SIZE DROPDOWN */}
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] font-bold uppercase text-text-subtle tracking-widest px-2 flex items-center gap-2">
                                                            <Package size={14} className="text-primary" /> 
                                                            {isSewageOrWater ? (isAr ? 'حجم التانك*' : 'Tank Size*') : (isAr ? 'حجم الحاوية*' : 'Container Size*')}
                                                        </label>
                                                        <select
                                                            aria-label={t('wizard.containmentLog')}
                                                            className="w-full p-4 bg-surface rounded-2xl font-bold text-base outline-none border-2 border-transparent focus:border-primary shadow-sm text-text-main"
                                                            value={currentTrip.container_size || ''}
                                                            onChange={e => {
                                                                setCurrentTrip(p => ({
                                                                    ...p,
                                                                    container_size: e.target.value,
                                                                    inventory_item_id: '' // reset specific item
                                                                }));
                                                            }}
                                                        >
                                                            <option value="">{isAr ? '--- اختر الحجم (أساسي) ---' : '--- Choose Size (Required) ---'}</option>
                                                            {inventorySizes
                                                                .filter(sz => sz.type === (isSewageOrWater ? 'TANK' : 'CONTAINER'))
                                                                .map(sz => (
                                                                    <option key={sz.size_id} value={sz.name}>{sz.name}</option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>

                                                    {/* OPTIONAL SPECIFIC BARCODE DROPDOWN */}
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] font-bold uppercase text-text-subtle tracking-widest px-2 flex items-center gap-2">
                                                            <Package size={14} className="text-text-subtle" /> 
                                                            {isSewageOrWater ? (isAr ? 'كود التانك (اختياري)' : 'Tank Code (Optional)') : (isAr ? 'كود الحاوية (اختياري)' : 'Container Code (Optional)')}
                                                        </label>
                                                        <select
                                                            disabled={!currentTrip.container_size}
                                                            aria-label="Specific Barcode"
                                                            className="w-full p-4 bg-surface rounded-2xl font-bold text-base outline-none border-2 border-transparent focus:border-primary shadow-sm text-text-main disabled:opacity-50"
                                                            value={currentTrip.inventory_item_id || ''}
                                                            onChange={e => {
                                                                setCurrentTrip(p => ({
                                                                    ...p,
                                                                    inventory_item_id: e.target.value
                                                                }));
                                                            }}
                                                        >
                                                            <option value="">{isAr ? '--- الكود / الحالة ---' : '--- Code / Status ---'}</option>
                                                            {availableItems.filter(c => {
                                                                if (!currentTrip.container_size) return false;
                                                                const size = inventorySizes.find(sz => sz.size_id === c.size_id);
                                                                return size?.name === currentTrip.container_size;
                                                            }).sort((a, b) => {
                                                                if (!currentTrip.service_id) return 0;
                                                                const aId = ('container_id' in a ? a.container_id : a.tank_id);
                                                                const bId = ('container_id' in b ? b.container_id : b.tank_id);
                                                                const aLinked = assetServiceLinks.some(l => l.asset_id === aId && l.service_id === currentTrip.service_id);
                                                                const bLinked = assetServiceLinks.some(l => l.asset_id === bId && l.service_id === currentTrip.service_id);
                                                                if (aLinked && !bLinked) return -1;
                                                                if (!aLinked && bLinked) return 1;
                                                                return 0;
                                                            }).map(c => {
                                                                const id = ('container_id' in c ? c.container_id : c.tank_id);
                                                                const isLinked = currentTrip.service_id ? assetServiceLinks.some(l => l.asset_id === id && l.service_id === currentTrip.service_id) : false;
                                                                return <option key={id} value={id}>{c.code} {isLinked ? '(Matched)' : ''}</option>
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 pt-4">
                                <Button variant="ghost" onClick={() => setWizardStep(2)} className="px-8">{translations.back}</Button>
                                <Button
                                    variant="primary"
                                    onClick={async () => (await validateStep(3)) && setWizardStep(4)}
                                    className="flex-1 py-5 rounded-2xl"
                                    icon={ArrowRight}
                                >
                                    {translations.next}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {wizardStep === 4 && (
                        <motion.div key="s4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

                            {/* Row 1: Primary Documents (Manifest & Delivery Note) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* --- Manifest Card --- */}
                                <Card className="p-3 space-y-3 !rounded-2xl flex flex-col h-full border border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-primary text-surface shadow-md shadow-primary/20"><FileText size={16} /></div>
                                            <span className="text-xs font-bold text-text-main">{t('wizard.manifest')} <span className="text-danger">*</span></span>
                                        </div>
                                        <div className="bg-surface-subtle p-0.5 rounded-lg flex shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentTrip(p => ({ ...p, is_manifest_generated: false, manifest_file: '' }))}
                                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${!currentTrip.is_manifest_generated ? 'bg-primary text-surface shadow' : 'text-text-subtle hover:text-text-main'}`}
                                            >
                                                <Upload size={10} /> {t('wizard.upload')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextNo = getNextNumber('M-');
                                                    setCurrentTrip(p => ({ ...p, is_manifest_generated: true, manifest_file: '', waste_manifest_no: p.waste_manifest_no || nextNo }));
                                                }}
                                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${currentTrip.is_manifest_generated ? 'bg-primary text-surface shadow' : 'text-text-subtle hover:text-text-main'}`}
                                            >
                                                <Wand2 size={10} /> {t('wizard.generate')}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-3">
                                        <Input
                                            label={isAr ? 'رقم المانفيست' : 'Manifest Number'}
                                            placeholder="M-XXXXXX"
                                            value={currentTrip.waste_manifest_no || ''}
                                            onChange={val => setCurrentTrip(p => ({ ...p, waste_manifest_no: val }))}
                                        />
                                        <div className="mt-auto">
                                            <FileUploader value={currentTrip.manifest_file as string} onUpload={(b) => {
                                                setCurrentTrip(p => ({ ...p, manifest_file: b }));
                                                if (b) processOcr(b, 'MANIFEST');
                                            }} isAr={isAr} />
                                            {currentTrip.is_manifest_generated && currentTrip.manifest_file && (
                                                <p className="text-[9px] font-bold text-amber-600 mt-1 text-center">{isAr ? 'ملف يدوي ← أولوية' : 'Manual override'}</p>
                                            )}
                                        </div>
                                    </div>
                                </Card>

                                {/* --- Delivery Note Card --- */}
                                <Card className="p-3 space-y-3 !rounded-2xl flex flex-col h-full border border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-success text-surface shadow-md shadow-success/20"><FileCheck size={16} /></div>
                                            <span className="text-xs font-bold text-text-main">{isAr ? 'سند التسليم' : 'Delivery Note'} <span className="text-danger">*</span></span>
                                        </div>
                                        <div className="bg-surface-subtle p-0.5 rounded-lg flex shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentTrip(p => ({ ...p, is_delivery_note_generated: false, delivery_note_file: '' }))}
                                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${!currentTrip.is_delivery_note_generated ? 'bg-success text-surface shadow' : 'text-text-subtle hover:text-text-main'}`}
                                            >
                                                <Upload size={10} /> {isAr ? 'رفع' : 'Upload'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextNo = getNextNumber('DN-');
                                                    setCurrentTrip(p => ({ ...p, is_delivery_note_generated: true, delivery_note_file: '', delivery_note_no: p.delivery_note_no || nextNo }));
                                                }}
                                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${currentTrip.is_delivery_note_generated ? 'bg-success text-surface shadow' : 'text-text-subtle hover:text-text-main'}`}
                                            >
                                                <Wand2 size={10} /> {isAr ? 'إنشاء' : 'Generate'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-3">
                                        <Input
                                            label={isAr ? 'رقم سند التسليم' : 'Delivery Note Number'}
                                            placeholder="DN-XXXXXX"
                                            value={currentTrip.delivery_note_no || ''}
                                            onChange={val => setCurrentTrip(p => ({ ...p, delivery_note_no: val }))}
                                        />
                                        <div className="mt-auto">
                                            <FileUploader value={currentTrip.delivery_note_file as string} onUpload={(b) => {
                                                setCurrentTrip(p => ({ ...p, delivery_note_file: b }));
                                                if (b) processOcr(b, 'DELIVERY_NOTE');
                                            }} isAr={isAr} />
                                            {currentTrip.is_delivery_note_generated && currentTrip.delivery_note_file && (
                                                <p className="text-[9px] font-bold text-amber-600 mt-1 text-center">{isAr ? 'ملف يدوي ← أولوية' : 'Manual override'}</p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Row 2: Secondary Document (Recycle) & Inputs (Location/Notes) */}
                            <div className={`grid grid-cols-1 ${requiresRecycleReceipt ? 'md:grid-cols-2' : ''} gap-4`}>
                                {/* --- Recycle Receipt Card (Conditional) --- */}
                                {requiresRecycleReceipt && (
                                    <Card className="p-3 space-y-3 !rounded-2xl border-2 border-amber-500/30 flex flex-col h-full">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="p-2 rounded-lg bg-amber-500 text-surface shadow-md shadow-amber-500/20"><Recycle size={16} /></div>
                                            <span className="text-xs font-bold text-text-main">{isAr ? 'إيصال التدوير' : 'Recycle Receipt'}</span>
                                            <span className="text-[9px] font-bold text-amber-600 px-2 py-0.5 bg-amber-50 rounded-full ms-auto">
                                                {isAr ? 'اختياري' : 'Optional'}
                                            </span>
                                        </div>
                                        <div className="flex-1 flex flex-col gap-3">
                                            <Input
                                                placeholder="R-XXXXXX"
                                                value={currentTrip.recycle_receipt_no || ''}
                                                onChange={val => setCurrentTrip(p => ({ ...p, recycle_receipt_no: val }))}
                                            />
                                            <div className="mt-auto">
                                                <FileUploader value={currentTrip.recycle_file as string} onUpload={(b) => {
                                                    setCurrentTrip(p => ({ ...p, recycle_file: b }));
                                                    if (b) processOcr(b, 'RECYCLE');
                                                }} isAr={isAr} />
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* --- Location & Notes --- */}
                                <div className="space-y-4 flex flex-col justify-end">
                                    <Input
                                        label={isAr ? 'موقع الرحلة (لينك أو إحداثيات)' : 'Trip Location (Link or GPS)'}
                                        icon={MapPin}
                                        placeholder={isAr ? 'الصق رابط الخريطة أو التقط الإحداثيات...' : 'Paste map link or capture...'}
                                        value={currentTrip.trip_location_url || ''}
                                        onChange={val => setCurrentTrip(p => ({ ...p, trip_location_url: val }))}
                                        suffix={
                                            <button
                                                type="button"
                                                title="Capture GPS"
                                                onClick={handleCaptureGps}
                                                className={`flex items-center justify-center p-2 rounded-lg transition-all border shrink-0 outline-none ${currentTrip.trip_location_url?.includes('google.com/maps')
                                                    ? 'bg-primary text-surface border-primary-600 shadow-sm'
                                                    : 'bg-surface text-text-subtle border-border hover:border-primary hover:text-primary'
                                                    }`}
                                            >
                                                <Navigation size={18} />
                                            </button>
                                        }
                                    />

                                    <Input
                                        label={isAr ? 'ملاحظات إضافية' : 'Additional Notes'}
                                        placeholder={isAr ? 'اختياري...' : 'Optional comment...'}
                                        value={currentTrip.notes || ''}
                                        onChange={val => setCurrentTrip(p => ({ ...p, notes: val }))}
                                    />
                                </div>
                            </div>

                            {/* Row 3: Image Upload Gallery */}
                            <div className="bg-surface-subtle p-3 rounded-2xl border border-border">
                                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest px-1 mb-2 block">
                                    {isAr ? 'صور الموقع / المرفقات' : 'Site Photos / Attachments'}
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {(currentTrip.proof_images || []).map((img, idx) => (
                                        <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group border border-border">
                                            <NextImage src={resolveImagePath(img)} alt="" className="w-full h-full object-cover" fill sizes="(max-width: 640px) 25vw, 16vw" unoptimized />
                                            <button
                                                onClick={() => setCurrentTrip(p => ({ ...p, proof_images: (p.proof_images || []).filter((_, i) => i !== idx) }))}
                                                className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Activity size={12} className="rotate-45" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="aspect-square">
                                        <FileUploader
                                            onUpload={u => setCurrentTrip(p => ({ ...p, proof_images: [...(p.proof_images || []), u] }))}
                                            isAr={isAr}
                                            multiple={true}
                                        />
                                    </div>
                                </div>

                                {/* Near Duplicates Warning */}
                                {nearDuplicates.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-500/10 border-2 border-amber-500/30 p-4 rounded-xl space-y-2 mt-4">
                                        <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                                            <AlertCircle size={18} />
                                            {isAr ? 'تنبيه: رحلات مشابهة مسجلة لنفس المركبة اليوم' : 'Warning: Similar trips logged today for this unit'}
                                        </div>
                                        <div className="space-y-1 pl-6">
                                            {nearDuplicates.map(nd => (
                                                <div key={nd.trip_id} className="text-xs font-bold text-amber-600/80 flex items-center justify-between bg-amber-500/5 p-2 rounded-lg">
                                                    <span>{nd.waste_manifest_no || nd.trip_id} — {nd.quantity} {nd.unit}</span>
                                                    <span className="flex items-center gap-2">{nd.time} <span className={`w-2 h-2 rounded-full ${nd.status === TripStatus.COMPLETED ? 'bg-success' : 'bg-primary'}`} /></span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-amber-600/60 font-bold pl-6">
                                            {isAr ? 'تأكد من أن هذه ليست رحلة مكررة قبل الحفظ.' : 'Ensure this is not a duplicate before saving.'}
                                        </p>
                                    </motion.div>
                                )}

                                {/* --- Confirmation Popup --- */}
                                <AnimatePresence>
                                    {showConfirmation && (
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-primary/5 border-2 border-primary/20 p-5 rounded-2xl space-y-4">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 size={24} className="text-primary" />
                                                <p className="font-bold text-text-main">{isAr ? 'تأكيد بيانات الرحلة' : 'Confirm Trip Data'}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="bg-surface p-3 rounded-xl"><span className="text-[10px] text-text-subtle font-bold uppercase block">{isAr ? 'المشروع' : 'Project'}</span><span className="font-bold text-text-main">{projectMap[currentTrip.project_id!]?.project_name}</span></div>
                                                <div className="bg-surface p-3 rounded-xl"><span className="text-[10px] text-text-subtle font-bold uppercase block">{isAr ? 'الخدمة' : 'Service'}</span><span className="font-bold text-text-main">{selectedService?.service_name}</span></div>
                                                <div className="bg-surface p-3 rounded-xl"><span className="text-[10px] text-text-subtle font-bold uppercase block">{isAr ? 'الكمية' : 'Qty'}</span><span className="font-bold text-text-main">{currentTrip.quantity} {currentTrip.unit}</span></div>
                                                <div className="bg-surface p-3 rounded-xl"><span className="text-[10px] text-text-subtle font-bold uppercase block">{isAr ? 'التاريخ' : 'Date'}</span><span className="font-bold text-text-main">{currentTrip.date}</span></div>
                                                <div className="bg-surface p-3 rounded-xl"><span className="text-[10px] text-text-subtle font-bold uppercase block">{isAr ? 'السائق' : 'Driver'}</span><span className="font-bold text-text-main">{driverMap[currentTrip.driver_id!]?.name || '—'}</span></div>
                                                <div className="bg-surface p-3 rounded-xl"><span className="text-[10px] text-text-subtle font-bold uppercase block">{isAr ? 'المركبة' : 'Vehicle'}</span><span className="font-bold text-text-main">{vehicleMap[currentTrip.vehicle_id!]?.plate_no || '—'}</span></div>
                                            </div>
                                            <div className="flex gap-3">
                                                <Button variant="ghost" onClick={() => setShowConfirmation(false)} className="flex-1">{isAr ? 'تعديل' : 'Edit'}</Button>
                                                <Button variant="primary" onClick={handleSave} isLoading={isSubmitting} className="flex-1 py-4" icon={CheckCircle2}>
                                                    {isAr ? 'تأكيد الحفظ' : 'Confirm Save'}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex gap-3 pt-4">
                                    <Button variant="ghost" onClick={() => setWizardStep(3)} className="px-6">{translations.back}</Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handlePreSave('clone')}
                                        disabled={isSubmitting || showConfirmation}
                                        className="py-5 rounded-xl flex items-center gap-2"
                                        icon={Copy}
                                    >
                                        {isAr ? 'حفظ + رحلة مشابهة' : 'Save & Clone'}
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => handlePreSave('save')}
                                        disabled={isSubmitting || showConfirmation}
                                        className="flex-1 py-5 rounded-xl"
                                    >
                                        {translations.save}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div >
        </Modal >
        <ConfirmDialogRenderer />
        </>
    );
};

export default TripWizard;
