"use client";

import React, { useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useStore } from '@/context';
import { TripStatus, Role, NotificationType } from '@/types';
import { StatCard, Card, Button, Modal } from '@/components';
import { Send, MapPin, Box, Calendar, FileText, CheckCircle2, AlertCircle, Navigation, Clock, Camera, Zap, ArrowUp, Minus, ArrowDown, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '@/utils/helpers';
import { useTranslation } from '@/hooks/useTranslation';
import { useLookupMaps } from '@/hooks/useLookupMaps';

const PRIORITIES = [
    { key: 'LOW' as const, icon: ArrowDown, labelAr: 'منخفضة', labelEn: 'Low', color: 'border-gray-300 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400', active: 'border-gray-500 bg-gray-100 dark:bg-gray-700/60 ring-2 ring-gray-400' },
    { key: 'NORMAL' as const, icon: Minus, labelAr: 'عادية', labelEn: 'Normal', color: 'border-blue-300 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', active: 'border-blue-500 bg-blue-100 dark:bg-blue-800/50 ring-2 ring-blue-400' },
    { key: 'HIGH' as const, icon: ArrowUp, labelAr: 'عالية', labelEn: 'High', color: 'border-orange-300 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400', active: 'border-orange-500 bg-orange-100 dark:bg-orange-800/50 ring-2 ring-orange-400' },
    { key: 'URGENT' as const, icon: Zap, labelAr: 'عاجلة', labelEn: 'Urgent', color: 'border-red-300 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400', active: 'border-red-500 bg-red-100 dark:bg-red-800/60 ring-2 ring-red-400' },
] as const;

const ServiceRequest: React.FC = () => {
    const { saasConfig, projects, services, currentUser, upsertTrip, addNotification, users } = useStore();
    const { t, isAr, lang } = useTranslation();
    const { projectMap, serviceMap } = useLookupMaps();
    const router = useRouter();
    const isSuperUser = [Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [tripRef, setTripRef] = useState('');

    // Form State
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedParentService, setSelectedParentService] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState<'TON' | 'CBM' | 'KG'>('TON');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0] ?? '');
    const [preferredTime, setPreferredTime] = useState('');
    const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
    const [notes, setNotes] = useState('');
    const [gpsUrl, setGpsUrl] = useState('');
    const [gpsLoading, setGpsLoading] = useState(false);
    const [containerImage, setContainerImage] = useState('');

    // Field errors
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isShaking, setIsShaking] = useState(false);

    // Refs for scrolling to first error
    const projectRef = useRef<HTMLDivElement>(null);
    const serviceRef = useRef<HTMLDivElement>(null);
    const dateRef = useRef<HTMLDivElement>(null);
    const quantityRef = useRef<HTMLDivElement>(null);
    const priorityRef = useRef<HTMLDivElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);

    // Filter User's Projects based on role
    const myProjects = useMemo(() => {
        if (isSuperUser) return projects;
        if (currentUser.role === Role.COMPANY_USER) return projects.filter(p => p.company_id === currentUser.company_id);
        if (currentUser.role === Role.PROJECT_USER) return projects.filter(p => p.project_id === currentUser.project_id);
        return projects.filter(p => p.company_id === currentUser.company_id);
    }, [projects, currentUser, isSuperUser]);

    // [AR] فلترة الخدمات بناءً على المشروع المختار
    // [EN] Filter services based on selected project
    const availableServices = useMemo(() => {
        if (!selectedProject) return [];
        const project = projectMap[selectedProject];
        if (!project || !project.service_ids) return services; // Fallback to all if no services defined for project
        return services.filter(s => project.service_ids.includes(s.service_id));
    }, [selectedProject, projects, services]);

    // Parent services (categories) derived from available sub-services
    const parentServices = useMemo(() => {
        const parentIds = [...new Set(availableServices.map(s => s.parent_id).filter(Boolean))] as string[];
        return parentIds.map(pid => serviceMap[pid]).filter(Boolean) as typeof services;
    }, [availableServices, services]);

    // Sub-services filtered by selected parent
    const subServices = useMemo(() => {
        if (!selectedParentService) return [];
        return availableServices.filter(s => s.parent_id === selectedParentService);
    }, [selectedParentService, availableServices]);

    // Whether we have a tree structure
    const hasServiceTree = parentServices.length > 0 && availableServices.some(s => s.parent_id);

    const handleCaptureGps = () => {
        if (!navigator.geolocation) return;
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                setGpsUrl(url);
                setGpsLoading(false);
            },
            () => {
                setErrors(prev => ({ ...prev, gps: t('serviceRequest.gpsFailed') }));
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setContainerImage(compressed);
        } catch {
            setErrors(prev => ({ ...prev, image: t('serviceRequest.photoFailed') }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!selectedProject) newErrors.project = t('serviceRequest.projectRequired');
        if (!selectedService) newErrors.service = t('serviceRequest.serviceRequired');
        if (!date) newErrors.date = t('serviceRequest.dateRequired');
        if (!priority) newErrors.priority = t('serviceRequest.priorityRequired');

        if (!quantity) {
            newErrors.quantity = isAr ? 'يرجى تحديد الكمية المتوقعة' : 'Please specify expected quantity';
        } else if (parseFloat(quantity) <= 0) {
            newErrors.quantity = isAr ? 'يرجى إدخال كمية صحيحة أكبر من صفر' : 'Quantity must be greater than 0';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            // Trigger Shake animation
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);

            // Scroll to the first error
            if (newErrors.project) projectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else if (newErrors.service) serviceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else if (newErrors.quantity) quantityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else if (newErrors.date) dateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else if (newErrors.priority) priorityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);

        try {
            const project = projectMap[selectedProject];
            const newTripId = `REQ-${Date.now()}`;

            const newTrip = {
                trip_id: newTripId,
                project_id: selectedProject,
                company_id: project?.company_id || currentUser.company_id || '',
                service_id: selectedService,
                date: date || new Date().toISOString().split('T')[0] || '',
                time: preferredTime || '08:00',
                preferred_time: preferredTime || '',
                quantity: String(parseFloat(quantity) || 0),
                unit,
                status: TripStatus.REQUESTED,
                priority,
                driver_id: '',
                vehicle_id: '',
                facility_id: '',
                notes: notes || '',
                request_location_url: gpsUrl || '',
                request_container_image: containerImage || '',
                trip_location_url: gpsUrl || '',
            };

            await upsertTrip(newTrip);

            // Notify Admins & Logistics
            addNotification({
                title: isAr ? 'طلب رحلة جديد' : 'New Trip Request',
                message: isAr
                    ? `طلب جديد من مشروع ${project?.project_name || selectedProject}`
                    : `New request for ${project?.project_name || selectedProject}`,
                type: NotificationType.OPERATIONAL
            });
            setSuccess(true);
            setTimeout(() => router.push('/client/dashboard'), 3000);
        } catch (err) {
            console.error('[ServiceRequest] Submission Error:', err);
            setErrors({ submit: t('serviceRequest.submitError') });
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-6"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-500"
                >
                    <CheckCircle2 size={48} />
                </motion.div>
                <div>
                    <h2 className="text-3xl font-bold text-text-main mb-2">
                        {t('serviceRequest.successTitle')}
                    </h2>
                    <p className="text-text-subtle font-bold">
                        {t('serviceRequest.successSubtitle')}
                    </p>
                    <div className="mt-4 inline-block px-6 py-3 bg-surface-subtle rounded-2xl border border-border">
                        <span className="text-xs text-text-subtle font-bold uppercase tracking-widest">{t('serviceRequest.orderRef')}</span>
                        <p className="text-lg font-black text-primary-600 mt-1">{tripRef}</p>
                    </div>
                </div>
                <Button variant="primary" onClick={() => router.push('/client/dashboard')} className="px-10 py-4">
                    {isAr ? 'العودة للرئيسية' : 'Back to Dashboard'}
                </Button>
            </motion.div>
        );
    }

    return (
        <div className="w-full min-w-0 space-y-8">
            <div className="text-center md:text-start">
                <h1 className="text-3xl font-bold text-text-main">
                    {t('serviceRequest.title')}
                </h1>
                <p className="text-text-subtle font-bold mt-2">
                    {t('serviceRequest.subtitle')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="glass-panel premium-card rounded-[2rem] p-6 md:p-10 shadow-[0_8px_40px_rgb(0,0,0,0.04)] mb-12">

                {myProjects.length === 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center gap-3 text-sm font-bold">
                        <AlertCircle size={20} />
                        {t('serviceRequest.noProjects')}
                    </div>
                )}

                {errors.submit && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center gap-3 text-sm font-bold">
                        <AlertCircle size={20} /> {errors.submit}
                    </div>
                )}

                {/* Project Selector */}
                <div className="space-y-3" ref={projectRef}>
                    <label className="text-[10px] font-black uppercase text-text-subtle tracking-[0.2em] px-1">
                        {t('serviceRequest.projectLabel')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <MapPin className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} ${errors.project ? 'text-red-500' : 'text-text-subtle group-focus-within:text-primary-500'} transition-colors`} size={20} />
                        <select
                            className={`input-premium w-full rounded-[1.5rem] py-4 md:py-5 ${isAr ? 'pr-12' : 'pl-12'} pr-4 font-bold text-text-main appearance-none text-sm md:text-base ${errors.project ? 'border-red-400 ring-4 ring-red-500/10' : ''}`}
                            value={selectedProject}
                            onChange={e => { setSelectedProject(e.target.value); setErrors(p => ({ ...p, project: '' })); setSelectedParentService(''); setSelectedService(''); }}
                        >
                            <option value="">{t('serviceRequest.projectPlaceholder')}</option>
                            {myProjects.map(p => (
                                <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                            ))}
                        </select>
                        <ChevronDown className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-4' : 'right-4'} text-text-subtle pointer-events-none transition-transform group-focus-within:rotate-180`} size={18} />
                    </div>
                    {errors.project && (
                        <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-red-500 font-bold px-2 flex items-center gap-1">
                            <AlertCircle size={12} /> {errors.project}
                        </motion.p>
                    )}
                </div>

                {/* Service & Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3" ref={serviceRef}>
                        {hasServiceTree ? (
                            <>
                                {/* Parent Service (Category) */}
                                <label className="text-[10px] font-black uppercase text-text-subtle tracking-[0.2em] px-1">
                                    {isAr ? 'الخدمة الرئيسية' : 'Main Service'} <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <Box className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} ${errors.service ? 'text-red-500' : 'text-text-subtle group-focus-within:text-primary-500'} transition-colors`} size={20} />
                                    <select
                                        className={`input-premium w-full rounded-[1.5rem] py-4 md:py-5 ${isAr ? 'pr-12' : 'pl-12'} pr-4 font-bold text-text-main appearance-none text-sm md:text-base ${errors.service ? 'border-red-400 ring-4 ring-red-500/10' : ''}`}
                                        value={selectedParentService}
                                        onChange={e => { setSelectedParentService(e.target.value); setSelectedService(''); setErrors(p => ({ ...p, service: '' })); }}
                                        disabled={!selectedProject}
                                    >
                                        <option value="">{isAr ? '--- اختر الخدمة الرئيسية ---' : '--- Select Main Service ---'}</option>
                                        {parentServices.map(s => (
                                            <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-4' : 'right-4'} text-text-subtle pointer-events-none transition-transform group-focus-within:rotate-180`} size={18} />
                                </div>

                                {/* Sub-Service */}
                                {selectedParentService && subServices.length > 0 && (
                                    <>
                                        <label className="text-[10px] font-black uppercase text-text-subtle tracking-[0.2em] px-1 mt-3">
                                            {isAr ? 'الخدمة الفرعية' : 'Sub-Service'} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative group">
                                            <Box className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} text-text-subtle group-focus-within:text-orange-500 transition-colors`} size={20} />
                                            <select
                                                className={`input-premium w-full rounded-[1.5rem] py-4 md:py-5 ${isAr ? 'pr-12' : 'pl-12'} pr-4 font-bold text-text-main appearance-none text-sm md:text-base`}
                                                value={selectedService}
                                                onChange={e => { setSelectedService(e.target.value); setErrors(p => ({ ...p, service: '' })); }}
                                            >
                                                <option value="">{isAr ? '--- اختر الخدمة الفرعية ---' : '--- Select Sub-Service ---'}</option>
                                                {subServices.map(s => (
                                                    <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-4' : 'right-4'} text-text-subtle pointer-events-none transition-transform group-focus-within:rotate-180`} size={18} />
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <label className="text-[10px] font-black uppercase text-text-subtle tracking-[0.2em] px-1">
                                    {t('serviceRequest.serviceType')} <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <Box className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} ${errors.service ? 'text-red-500' : 'text-text-subtle group-focus-within:text-primary-500'} transition-colors`} size={20} />
                                    <select
                                        className={`input-premium w-full rounded-[1.5rem] py-4 md:py-5 ${isAr ? 'pr-12' : 'pl-12'} pr-4 font-bold text-text-main appearance-none text-sm md:text-base ${errors.service ? 'border-red-400 ring-4 ring-red-500/10' : ''}`}
                                        value={selectedService}
                                        onChange={e => { setSelectedService(e.target.value); setErrors(p => ({ ...p, service: '' })); }}
                                        disabled={!selectedProject}
                                    >
                                        <option value="">{t('serviceRequest.servicePlaceholder')}</option>
                                        {availableServices.map(s => (
                                            <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-4' : 'right-4'} text-text-subtle pointer-events-none transition-transform group-focus-within:rotate-180`} size={18} />
                                </div>
                            </>
                        )}
                        {errors.service && (
                            <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-red-500 font-bold px-2 flex items-center gap-1">
                                <AlertCircle size={12} /> {errors.service}
                            </motion.p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-text-subtle tracking-widest px-1">
                            {t('serviceRequest.estQuantity')} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2" ref={quantityRef}>
                            <input
                                type="number"
                                className={`input-premium flex-1 rounded-2xl py-4 px-6 font-bold text-text-main ${errors.quantity ? 'border-red-400 ring-4 ring-red-500/10' : ''}`}
                                placeholder="0"
                                value={quantity}
                                onChange={e => { setQuantity(e.target.value); setErrors(p => ({ ...p, quantity: '' })); }}
                            />
                            <div className="relative">
                                <select
                                    className="input-premium rounded-2xl py-4 px-4 font-bold text-text-main appearance-none min-w-[100px]"
                                    value={unit}
                                    onChange={e => setUnit(e.target.value as 'TON' | 'CBM' | 'KG')}
                                >
                                    <option value="TON">TON</option>
                                    <option value="CBM">CBM</option>
                                    <option value="KG">KG</option>
                                </select>
                                <div className={`absolute inset-y-0 ${isAr ? 'left-3' : 'right-3'} flex items-center pointer-events-none text-text-subtle`}>
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>
                        {errors.quantity && (
                            <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-red-500 font-bold px-2 mt-2 flex items-center gap-1">
                                <AlertCircle size={12} /> {errors.quantity}
                            </motion.p>
                        )}
                    </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3" ref={dateRef}>
                        <label className="text-[10px] font-black uppercase text-text-subtle tracking-[0.2em] px-1">
                            {t('serviceRequest.requestedDate')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                            <Calendar className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} ${errors.date ? 'text-red-500' : 'text-text-subtle group-focus-within:text-primary-500'} transition-colors`} size={20} />
                            <input
                                type="date"
                                className={`input-premium w-full rounded-[1.5rem] py-4 md:py-5 ${isAr ? 'pr-12' : 'pl-12'} pr-4 font-bold text-text-main text-sm md:text-base ${errors.date ? 'border-red-400 ring-4 ring-red-500/10' : ''}`}
                                value={date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => { setDate(e.target.value); setErrors(p => ({ ...p, date: '' })); }}
                            />
                        </div>
                        {errors.date && (
                            <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-red-500 font-bold px-2 flex items-center gap-1">
                                <AlertCircle size={12} /> {errors.date}
                            </motion.p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-text-subtle tracking-widest px-1">
                            {t('serviceRequest.preferredTime')}
                        </label>
                        <div className="relative group">
                            <Clock className="absolute top-1/2 -translate-y-1/2 left-4 text-text-subtle group-focus-within:text-primary-500 transition-colors" size={20} />
                            <input
                                type="time"
                                className="input-premium w-full rounded-2xl py-4 pl-12 pr-4 font-bold text-text-main"
                                value={preferredTime}
                                onChange={e => setPreferredTime(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Priority Selector */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-text-subtle tracking-[0.2em] px-1">
                        {t('serviceRequest.priority')} <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {PRIORITIES.map(p => {
                            const Icon = p.icon;
                            const isActive = priority === p.key;
                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => { setPriority(p.key); setErrors(prev => ({ ...prev, priority: '' })); }}
                                    className={`relative flex flex-col items-center gap-3 p-5 rounded-[1.5rem] border transition-all duration-300 cursor-pointer ${isActive ? p.active + ' shadow-lg scale-[1.02] ring-4 ring-primary-500/10' : p.color + ' hover:bg-surface-subtle hover:scale-[1.02] border-border/50'}`}
                                >
                                    <Icon size={24} className={isActive ? 'animate-pulse' : ''} />
                                    <span className="text-xs font-bold">{p[`label${lang === 'ar' ? 'Ar' : 'En'}`]}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="priority-check"
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center"
                                        >
                                            <CheckCircle2 size={12} className="text-white" />
                                        </motion.div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {errors.priority && <p className="text-xs text-red-500 font-bold px-1">{errors.priority}</p>}
                    <AnimatePresence>
                        {priority === 'URGENT' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center gap-2 text-xs font-bold mt-1">
                                    <Zap size={14} /> {t('serviceRequest.urgentAlert')}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* GPS Capture */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-subtle tracking-widest px-1">
                        {t('serviceRequest.gpsLocation')}
                    </label>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleCaptureGps}
                            disabled={gpsLoading}
                            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all border-2 ${gpsUrl
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300'
                                : 'bg-surface-subtle text-text-subtle border-border hover:border-primary-500 hover:text-primary-500'
                                }`}
                        >
                            {gpsLoading ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Navigation size={18} className={gpsUrl ? '' : 'animate-pulse'} />
                            )}
                            {gpsUrl
                                ? t('serviceRequest.gpsCaptured')
                                : t('serviceRequest.gpsCapture')
                            }
                        </button>
                        {gpsUrl && (
                            <a href={gpsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 underline font-bold">
                                {t('serviceRequest.viewOnMap')}
                            </a>
                        )}
                    </div>
                    {errors.gps && <p className="text-xs text-red-500 font-bold px-1">{errors.gps}</p>}
                </div>

                {/* Container Photo */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-subtle tracking-widest px-1">
                        {t('serviceRequest.containerPhoto')}
                    </label>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-surface-subtle border-2 border-border hover:border-primary-500 hover:text-primary-500 transition-all cursor-pointer text-text-subtle">
                            <Camera size={18} />
                            {containerImage ? t('serviceRequest.photoUploaded') : t('serviceRequest.uploadPhoto')}
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                        </label>
                        {containerImage && (
                            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-border">
                                <Image src={containerImage} alt="" className="w-full h-full object-cover" width={64} height={64} unoptimized />
                            </div>
                        )}
                    </div>
                    {errors.image && <p className="text-xs text-red-500 font-bold px-1">{errors.image}</p>}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-subtle tracking-widest px-1">
                        {t('serviceRequest.additionalNotes')}
                    </label>
                    <div className="relative group">
                        <FileText className="absolute top-6 left-4 text-text-subtle group-focus-within:text-primary-500 transition-colors" size={20} />
                        <textarea
                            rows={3}
                            className="input-premium w-full rounded-2xl py-4 pl-12 pr-4 font-bold text-text-main resize-none"
                            placeholder={t('serviceRequest.notesPlaceholder')}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <motion.button
                    animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    disabled={loading || myProjects.length === 0}
                    type="submit"
                    ref={submitRef}
                    className="w-full py-5 md:py-6 bg-primary-600 hover:bg-primary-500 text-white rounded-[1.5rem] font-black text-lg shadow-2xl shadow-primary-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {loading ? (
                        <><div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" /> {t('serviceRequest.sendingBtn')}</>
                    ) : (
                        <span className="flex items-center gap-3 relative z-10 uppercase tracking-widest">
                            {t('serviceRequest.submitBtn')} <Send size={22} className={isAr ? 'rotate-180' : ''} />
                        </span>
                    )}
                </motion.button>
            </form>
        </div>
    );
};

export default ServiceRequest;
