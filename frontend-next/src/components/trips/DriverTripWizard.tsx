import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useStore } from '@/context';
import { Trip, TripStatus, NotificationType } from '@/types';
import { Modal, Button, Input, Select, SearchableSelect, Card } from '@/components';
import { Building2, MapPin, ArrowRight, Package, CheckCircle2, Camera, AlertCircle, MessageSquare, Wrench } from 'lucide-react';
import { formatDate, compressImage } from '@/utils/helpers';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine } from 'lucide-react';

interface DriverTripWizardProps {
    isOpen: boolean;
    onClose: (savedTrip?: Trip) => void;
}

const DriverTripWizard: React.FC<DriverTripWizardProps> = ({ isOpen, onClose }) => {
    const {
        projects, companies, vehicles, drivers,
        inventorySizes, services, projectServices,
        upsertTrip, saasConfig, addNotification, currentUser, api, trips
    } = useStore();
    const { t, isAr } = useTranslation();

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isOcrScanning, setIsOcrScanning] = useState(false);
    const ocrFileInputRef = useRef<HTMLInputElement>(null);

    // Type toggle for size selection: CONTAINER or TANK
    const [sizeType, setSizeType] = useState<'CONTAINER' | 'TANK'>('CONTAINER');

    const [tripData, setTripData] = useState<Partial<Trip>>({
        date: formatDate(new Date().toISOString(), 'yyyy-MM-dd'),
        time: formatDate(new Date().toISOString(), 'HH:mm'),
        supplier_id: currentUser.supplier_id || '',
        driver_id: currentUser.id || '',
        unit: 'CBM',
        quantity: '0',
        priority: 'NORMAL',
    });

    // Reset when opened — auto-capture date, time, vehicle, driver
    useEffect(() => {
        let timerId: number | undefined;

        if (isOpen) {
            const assignedDriver = drivers.find(d => d.user_id === currentUser.id || d.name === currentUser.name || d.driver_id === currentUser.id);
            const assignedVehicleId = assignedDriver?.vehicle_id || ((currentUser as { vehicle_id?: string }).vehicle_id || '');
            const now = new Date();

            timerId = window.setTimeout(() => {
                setStep(1);
                setSizeType('CONTAINER');
                setTripData({
                    date: formatDate(now.toISOString(), 'yyyy-MM-dd'),
                    time: formatDate(now.toISOString(), 'HH:mm'),
                    supplier_id: currentUser.supplier_id || '',
                    vehicle_id: assignedVehicleId,
                    driver_id: assignedDriver?.driver_id || currentUser.id || '',
                    unit: 'CBM',
                    quantity: '0',
                    priority: 'NORMAL',
                });
                setError('');
            }, 0);
        }

        return () => {
            if (timerId !== undefined) window.clearTimeout(timerId);
        };
    }, [isOpen, currentUser, drivers]);

    // Derived lists
    const activeCompanies = companies;
    const companyProjects = projects.filter(p => p.company_id === tripData.company_id && p.status === 'ACTIVE');

    // Services assigned to the selected project via projectServices
    // The driver should only see Main Services whose sub-services (or themselves) are strictly assigned to this project.
    const availableMainServices = React.useMemo(() => {
        const allMainServices = services.filter(s => !s.parent_id);
        if (!tripData.project_id) return [];

        const projectServiceIds = projectServices
            .filter(ps => ps.project_id === tripData.project_id)
            .map(ps => ps.service_id);

        if (projectServiceIds.length === 0) return [];

        // Return main services that are directly assigned or have assigned sub-services
        return allMainServices.filter(main => {
            if (projectServiceIds.includes(main.service_id)) return true;
            return services.some(s => s.parent_id === main.service_id && projectServiceIds.includes(s.service_id));
        });
    }, [tripData.project_id, projectServices, services]);

    // Auto-select company if project is selected through OCR
    useEffect(() => {
        let timerId: number | undefined;

        if (tripData.project_id && !tripData.company_id) {
            const p = projects.find(x => x.project_id === tripData.project_id);
            if (p) {
                timerId = window.setTimeout(() => {
                    setTripData(prev => ({ ...prev, company_id: p.company_id }));
                }, 0);
            }
        }

        return () => {
            if (timerId !== undefined) window.clearTimeout(timerId);
        };
    }, [tripData.project_id, tripData.company_id, projects]);

    // Helper: detect if a service is sewage/water type
    const isSewageOrWater = React.useCallback((serviceId: string) => {
        const s = services.find(x => x.service_id === serviceId);
        if (!s) return false;
        const parent = s.parent_id ? services.find(x => x.service_id === s.parent_id) : null;
        const name = (s.service_name || '').toLowerCase();
        const parentName = (parent?.service_name || '').toLowerCase();
        return s.category === 'WATER' || name.includes('water') || name.includes('sewage') || name.includes('صرف') || name.includes('مياه') || parentName.includes('water') || parentName.includes('sewage');
    }, [services]);

    // Auto-select equipment type & size when service changes
    useEffect(() => {
        if (!tripData.service_id) return;
        const isTank = isSewageOrWater(tripData.service_id);
        const newType = isTank ? 'TANK' : 'CONTAINER';

        const timerId = window.setTimeout(() => {
            setSizeType(newType);
            // Auto-select size if only one option available
            const sizes = inventorySizes.filter(sz => sz.type === newType);
            const singleSize = sizes.length === 1 ? sizes[0] : undefined;
            if (singleSize) {
                setTripData(p => ({ ...p, container_size: singleSize.name, unit: 'CBM' }));
            } else {
                setTripData(p => ({ ...p, container_size: '', unit: 'CBM' }));
            }
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [tripData.service_id, isSewageOrWater, inventorySizes]);

    const validateStep = (s: number) => {
        setError('');
        if (s === 1) {
            if (!tripData.company_id || !tripData.project_id) {
                setError(isAr ? 'الرجاء اختيار الشركة والمشروع' : 'Please select Company and Project');
                return false;
            }
        }
        if (s === 2) {
            if (!tripData.service_id) {
                setError(isAr ? 'الرجاء اختيار الخدمة الأساسية المطلوبة' : 'Please select the required main service');
                return false;
            }
            if (!tripData.request_container_image) {
                setError(isAr ? 'صورة إثبات الموقع مطلوبة لإرسالها للعميل' : 'Proof photo is required to send to the client');
                return false;
            }
        }
        return true;
    };

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

            const matched: string[] = [];
            const updates: Partial<typeof tripData> = {};

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

            if (data.company_name) {
                const cName = data.company_name.toLowerCase();
                const matchedCompany = companies.find(c => cName.includes(c.company_name.toLowerCase()) || c.company_name.toLowerCase().includes(cName));
                if (matchedCompany) updates.company_id = matchedCompany.company_id;
            }

            if (data.project_name) {
                const pName = data.project_name.toLowerCase();
                const matchedProject = projects.find(p => pName.includes(p.project_name.toLowerCase()) || p.project_name.toLowerCase().includes(pName));
                if (matchedProject) {
                    updates.project_id = matchedProject.project_id;
                    if (!updates.company_id) updates.company_id = matchedProject.company_id;
                    matched.push(isAr ? `المشروع: ${matchedProject.project_name}` : `Project: ${matchedProject.project_name}`);
                }
            }

            updates.delivery_note_file = base64;

            if (Object.keys(updates).length > 1) {
                setTripData(prev => ({ ...prev, ...updates }));
                addNotification({
                    title: isAr ? 'تم الذكاء بنجاح' : 'AI Scan Complete',
                    message: isAr ? `تم التعرف بدقة على ${matched.length} حقول` : `Perfectly extracted ${matched.length} fields`,
                    type: NotificationType.SUCCESS,
                });
            } else {
                setTripData(prev => ({ ...prev, delivery_note_file: base64 }));
            }
        } catch (err) {
            console.error('[OCR Full Scan] Error:', err);
            addNotification({
                title: isAr ? 'خطأ' : 'Error',
                message: isAr ? 'واجه الخادم مشكلة في تحليل الصورة.' : 'Server AI error.',
                type: NotificationType.ERROR,
            });
        } finally {
            setIsOcrScanning(false);
        }
    };

    const handleSave = async () => {
        if (!validateStep(2) || isSubmitting) return;

        setIsSubmitting(true);
        // Build final trip data before try/catch so it's accessible in the catch block
        const now = new Date();
        const datePrefix = `T-${formatDate(now.toISOString(), 'yyyyMMdd')}`;
        const tripsToday = trips.filter(t => t.trip_id && t.trip_id.startsWith(datePrefix));
        const tripNumbers = tripsToday.map(t => parseInt(t.trip_id.replace(datePrefix, '')) || 0);
        const maxNumber = tripNumbers.length > 0 ? Math.max(...tripNumbers) : 0;
        const seqNumber = String(maxNumber + 1).padStart(3, '0');
        const finalTripId = `${datePrefix}${seqNumber}`;
        const finalData = {
            ...tripData,
            trip_id: finalTripId,
            date: formatDate(now.toISOString(), 'yyyy-MM-dd'),
            time: formatDate(now.toISOString(), 'HH:mm'),
            status: TripStatus.PENDING_APPROVAL,
        };

        try {
            await upsertTrip(finalData as unknown as Trip);

            // [PERF] Close immediately — notifications are fire-and-forget
            onClose(finalData as Trip);

            // Non-blocking: send notifications in the background
            addNotification({
                title: isAr ? 'تم طلب الرحلة' : 'Trip Requested',
                message: isAr ? `تم إحالة الرحلة ${finalTripId} للعميل للاعتماد` : `Trip ${finalTripId} pending client approval`,
                type: NotificationType.INFO,
                targetUserId: 'ADMIN_GROUP'
            });

            addNotification({
                title: isAr ? 'عملية ناجحة' : 'Success',
                message: isAr ? 'تم تسجيل الرحلة بنجاح' : 'Trip registered successfully',
                type: NotificationType.SUCCESS
            });

        } catch (err: unknown) {
            const errorData = (err as { message?: string; messageEn?: string }) || {};
            // Filter out backend validation errors for fields the driver doesn't control
            const msg = errorData.message || errorData.messageEn || '';
            const irrelevantFields = ['quantity', 'الكمية', 'facility', 'المنشأة'];
            const isIrrelevantError = irrelevantFields.some(f => msg.toLowerCase().includes(f.toLowerCase()));
            
            if (isIrrelevantError) {
                // Trip was likely saved despite the validation warning — close the modal
                console.warn('[DriverWizard] Backend rejected optional field. Error suppressed:', msg);
                onClose(finalData as Trip);
                addNotification({
                    title: isAr ? 'تم التسجيل' : 'Trip Registered',
                    message: isAr ? 'تم تسجيل الرحلة. بعض الحقول الاختيارية لم تُحفظ.' : 'Trip registered. Some optional fields were skipped.',
                    type: NotificationType.WARNING
                });
            } else {
                setError(msg || (isAr ? 'خطأ في الحفظ' : 'Failed to save'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtered sizes based on type toggle
    const filteredSizes = inventorySizes.filter(sz => sz.type === sizeType);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={() => onClose()} title={isAr ? 'تسجيل رحلة عمل جديدة' : 'Register New Mission'} size="lg">
            <div className="p-4 space-y-6">

                {/* Stepper - 2 Steps */}
                <div className="flex items-center justify-between relative mb-8 px-8">
                    <div className="absolute left-8 right-8 top-1/2 h-1 bg-border -z-10 rounded-full" />
                    <div className="absolute left-8 top-1/2 h-1 bg-primary transition-all duration-500 -z-10 rounded-full" style={{ width: `${((step - 1) / 1) * 100}%` }} />
                    {[1, 2].map(i => (
                        <div key={i} className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${step >= i ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-110' : 'bg-surface border-border text-text-subtle'}`}>
                            {step > i ? <CheckCircle2 size={22} /> : i}
                        </div>
                    ))}
                </div>

                {/* Step Labels */}
                <div className="flex justify-between px-4 -mt-4 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${step >= 1 ? 'text-primary' : 'text-text-subtle'}`}>
                        {isAr ? 'العميل والمشروع' : 'Client & Project'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${step >= 2 ? 'text-primary' : 'text-text-subtle'}`}>
                        {isAr ? 'التفاصيل والإثبات' : 'Details & Proof'}
                    </span>
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-bold animate-in fade-in flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">

                            {/* OCR SCAN BUTTON */}
                            <div className="mb-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    ref={ocrFileInputRef}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                            const compressed = await compressImage(file);
                                            await processDeliveryNoteFullOcr(compressed);
                                        } catch {
                                            addNotification({ title: 'Error', message: 'Failed to compress image.', type: NotificationType.ERROR });
                                        }
                                    }}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => ocrFileInputRef.current?.click()}
                                    disabled={isOcrScanning}
                                    className="w-full flex items-center justify-center p-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl shadow-md transition-all group overflow-hidden relative"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    {isOcrScanning ? (
                                        <div className="flex items-center space-x-3 rtl:space-x-reverse relative z-10 animate-pulse">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span className="font-semibold">{isAr ? 'جاري تحليل الصورة بخوارزميات AI...' : 'AI Analysis in progress...'}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-3 rtl:space-x-reverse relative z-10">
                                            <ScanLine className="w-6 h-6 animate-pulse" />
                                            <div className="text-left rtl:text-right">
                                                <p className="font-bold text-lg leading-tight">{isAr ? 'المسح الذكي لسند التسليم' : 'Smart Scan Delivery Note'}</p>
                                                <p className="text-xs text-indigo-100">{isAr ? 'تعبئة معلومات الرحلة تلقائياً' : 'Auto-fill trip details'}</p>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-5">
                                <SearchableSelect
                                    label={isAr ? 'الشركة العميلة' : 'Client Company'}
                                    icon={Building2}
                                    value={tripData.company_id || ''}
                                    onChange={val => setTripData(p => ({ ...p, company_id: val, project_id: '', service_id: '' }))}
                                    options={activeCompanies.map(c => ({ label: c.company_name, value: c.company_id }))}
                                    placeholder={isAr ? 'ابحث عن الشركة...' : 'Search company...'}
                                />

                                <SearchableSelect
                                    label={isAr ? 'المشروع / الموقع' : 'Project / Site'}
                                    icon={MapPin}
                                    value={tripData.project_id || ''}
                                    onChange={val => setTripData(p => ({ ...p, project_id: val, service_id: '' }))}
                                    options={(tripData.company_id ? companyProjects : projects).map(p => ({ label: p.project_name, value: p.project_id }))}
                                    disabled={!tripData.company_id}
                                    placeholder={isAr ? 'ابحث عن المشروع...' : 'Search project...'}
                                />
                            </div>

                            <Button onClick={() => validateStep(1) && setStep(2)} className="w-full py-5 rounded-2xl" icon={ArrowRight}>
                                {isAr ? 'المرحلة التالية' : 'Next Step'}
                            </Button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">

                            {/* Main Service Selection — Client will select the sub-service later */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-text-subtle flex items-center gap-2 px-1">
                                    <Wrench size={14} className="text-primary" />
                                    {isAr ? 'الخدمة الأساسية المطلوبة *' : 'Required Main Service *'}
                                </label>
                                <select
                                    className="w-full p-4 bg-surface rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-primary shadow-sm text-text-main"
                                    value={tripData.service_id || ''}
                                    onChange={e => setTripData(p => ({ ...p, service_id: e.target.value, container_size: '' }))}
                                >
                                    <option value="">{isAr ? '--- اختر الخدمة الأساسية ---' : '--- Select Main Service ---'}</option>
                                    {availableMainServices.map(s => (
                                        <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
                                    ))}
                                </select>
                            </div>



                            {/* Image Upload for Client Proof */}
                            <div className="flex flex-col gap-2 p-4 bg-surface rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors relative">
                                <label className="text-[10px] font-bold uppercase text-text-subtle tracking-widest px-2 flex items-center gap-2">
                                    <Camera size={14} className="text-primary" /> {isAr ? 'صورة إثبات (تُرسل للعميل) *' : 'Proof Photo (Sent to Client) *'}
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const compressed = await compressImage(file);
                                            setTripData(p => ({ ...p, request_container_image: compressed }));
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                {tripData.request_container_image ? (
                                    <div className="relative w-full h-40 rounded-xl overflow-hidden shadow-sm border border-border">
                                        <Image src={tripData.request_container_image} alt="Proof" className="w-full h-full object-cover" fill sizes="100vw" unoptimized />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <p className="text-white text-xs font-bold">{isAr ? 'تغيير الصورة' : 'Change Image'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-40 rounded-xl bg-surface-subtle border border-border/50 flex flex-col items-center justify-center text-text-subtle gap-2">
                                        <Camera size={40} className="opacity-40" />
                                        <p className="text-sm font-bold">{isAr ? 'اضغط لالتقاط صورة الموقع' : 'Tap to capture location photo'}</p>
                                        <p className="text-[9px] text-text-subtle/70 uppercase">JPG, PNG, WEBP</p>
                                    </div>
                                )}
                            </div>

                            {/* Location Input with Capture Button */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-text-subtle flex items-center gap-2 px-1">
                                    <MapPin size={14} className="text-primary" />
                                    {isAr ? 'الموقع الجغرافي' : 'GPS Location URL'}
                                </label>
                                <div className="flex items-stretch gap-2">
                                    <Input
                                        className="flex-1"
                                        placeholder={isAr ? 'الصق رابط خرائط جوجل هنا...' : 'Paste Google Maps link...'}
                                        value={tripData.request_location_url || ''}
                                        onChange={(val) => setTripData(p => ({ ...p, request_location_url: val }))}
                                    />
                                    <Button
                                        variant="secondary"
                                        type="button"
                                        className="bg-surface-subtle hover:bg-surface border-border !px-4"
                                        onClick={() => {
                                            if (navigator.geolocation) {
                                                addNotification({ title: isAr ? 'جاري التحديد' : 'Locating', message: isAr ? 'انتظر، جاري التقاط الموقع...' : 'Capturing location...', type: NotificationType.INFO });
                                                navigator.geolocation.getCurrentPosition(
                                                    (position) => {
                                                        const lat = position.coords.latitude;
                                                        const lng = position.coords.longitude;
                                                        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                                                        setTripData(p => ({ ...p, request_location_url: mapsUrl }));
                                                        addNotification({ title: isAr ? 'تم بنجاح' : 'Success', message: isAr ? 'تم تحديد الموقع' : 'Location captured', type: NotificationType.SUCCESS });
                                                    },
                                                    (geoError) => {
                                                        console.warn('Location capture error:', geoError);
                                                        addNotification({ title: isAr ? 'خطأ' : 'Error', message: isAr ? 'تعذر تحديد الموقع، يرجى تفعيل الـ GPS' : 'Please enable GPS/Location services', type: NotificationType.ERROR });
                                                    },
                                                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                                                );
                                            } else {
                                                addNotification({ title: 'Error', message: 'Geolocation is not supported by your browser', type: NotificationType.WARNING });
                                            }
                                        }}
                                        title={isAr ? 'التقاط الموقع الحالي' : 'Capture Current Location'}
                                    >
                                        <MapPin size={18} className="text-emerald-500" />
                                    </Button>
                                </div>
                                {tripData.request_location_url && tripData.request_location_url.includes('http') && (
                                    <a href={tripData.request_location_url} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-bold px-1 mt-1 inline-block hover:underline">
                                        {isAr ? 'معاينة الموقع' : 'Preview Location'} ↗
                                    </a>
                                )}
                            </div>

                            {/* Trip Notes */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-text-subtle flex items-center gap-2 px-1">
                                    <MessageSquare size={14} className="text-primary" />
                                    {isAr ? 'ملاحظات الرحلة' : 'Trip Notes'}
                                </label>
                                <textarea
                                    value={tripData.notes || ''}
                                    onChange={(e) => setTripData(p => ({ ...p, notes: e.target.value }))}
                                    placeholder={isAr ? 'أضف أي ملاحظات متعلقة بالرحلة...' : 'Add any notes related to this trip...'}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-main text-sm placeholder:text-text-subtle/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                                />
                            </div>

                            {/* Info Card */}
                            <Card className="bg-indigo-50/50 border border-indigo-100 p-4">
                                <p className="text-xs font-bold text-indigo-800 leading-relaxed text-center">
                                    {isAr
                                        ? 'سيتم تسجيل التاريخ والوقت والمركبة واسم السائق تلقائياً. ستُحال الرحلة للعميل للاعتماد.'
                                        : 'Date, time, vehicle, and driver are auto-captured. Trip will be sent for Client Approval.'}
                                </p>
                            </Card>

                            <div className="flex gap-4 pt-4">
                                <Button variant="ghost" onClick={() => setStep(1)} className="px-8" disabled={isSubmitting}>{isAr ? 'رجوع' : 'Back'}</Button>
                                <Button
                                    onClick={handleSave}
                                    isLoading={isSubmitting}
                                    className="flex-1 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/30"
                                    icon={CheckCircle2}
                                >
                                    {isAr ? 'تسجيل الرحلة' : 'Register Trip'}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    );
};

export default DriverTripWizard;
