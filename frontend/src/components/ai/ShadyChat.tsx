/**
 * =====================================================
 * [AR] شادي - المساعد الذكي لنظام GCM (نسخة محسّنة)
 * [EN] Shady - GCM AI Assistant Chatbot (Enhanced)
 * =====================================================
 * Features:
 * - Interactive dropdowns for selections
 * - Date/Time pickers
 * - Smart suggestions for missing data
 * - Trip registration flow with real-time context
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Send, Bot, User, Loader2, Sparkles, Trash2,
    ChevronDown, Calendar, Clock,
    MessageCircle, Zap, Minus
} from 'lucide-react';
import { useStore } from '@/context';
import { createApiClient } from '@/api/client';
import { TripStatus } from '@/types';
import { useNavigate } from 'react-router-dom';
import { generateBulkPdf, filterTripsForAI } from '@/utils/exportHelpers';
import { useConfirmDialog } from '@/components/common/ConfirmDialog';
import { useLookupMaps } from '@/hooks/useLookupMaps';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    /** Interactive widget to display after this message */
    widget?: ChatWidget;
}

type ChatWidget =
    | { type: 'select'; key: string; options: { id: string; label: string }[]; placeholder: string }
    | { type: 'date'; key: string; placeholder: string }
    | { type: 'time'; key: string; placeholder: string }
    | { type: 'number'; key: string; placeholder: string; suffix?: string }
    | { type: 'unit'; key: string }
    | { type: 'confirm'; data: Record<string, any> }
    | { type: 'quick_actions'; actions: { label: string; value: string; icon?: string }[] };

/** Step in the trip registration flow */
type FlowStep = 'idle' | 'ownership' | 'supplier' | 'company' | 'project' | 'service' | 'date' | 'time' | 'quantity' | 'unit' | 'vehicle' | 'driver' | 'facility' | 'manifest' | 'delivery_note' | 'recycle_receipt' | 'notes' | 'confirm' | 'done' | 'fac_name' | 'fac_type' | 'fac_location' | 'fac_confirm';

const STORAGE_KEY = 'gcm_shady_chat';

const loadPersistedState = () => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return {
            messages: (data.messages || []).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
            flowStep: data.flowStep || 'idle',
            tripDraft: data.tripDraft || {},
            isOpen: data.isOpen || false,
        };
    } catch { return null; }
};

const ShadyChat: React.FC = () => {
    const store = useStore();
    const navigate = useNavigate();
    const { confirm: confirmClose, ConfirmDialogRenderer } = useConfirmDialog();
    const { companyMap, projectMap, serviceMap, vehicleMap, driverMap, supplierMap, facilityMap } = useLookupMaps();

    // Guard to ensure Shady only runs for authenticated, active users
    // Guard: Shady is now restricted to ADMIN role only as per latest requirement
    if (!store.isAuthenticated || !store.currentUser || store.currentUser.role !== 'ADMIN') {
        return null;
    }

    const { saasConfig, currentUser, companies, projects, projectServices, vehicles, drivers, services, upsertTrip, suppliers, trips, facilities } = store;
    const isAr = saasConfig.language === 'ar';
    const aiConfig = saasConfig.aiAssistant;
    const api = useMemo(() => createApiClient(saasConfig?.apiConfig?.baseUrl || ''), [saasConfig?.apiConfig?.baseUrl]);

    // Determine icon component based on config
    const iconStyleMap = { sparkles: Sparkles, bot: Bot, message: MessageCircle, zap: Zap };
    const FloatingIcon = iconStyleMap[aiConfig?.iconStyle || 'sparkles'] || Sparkles;
    const assistantName = isAr ? (aiConfig?.nameAr || 'شادي') : (aiConfig?.name || 'Shady');
    const positionClass = aiConfig?.position === 'bottom-left' ? 'start-6' : 'end-6';

    // Restore persisted state
    const persisted = useMemo(() => loadPersistedState(), []);

    const [isOpen, setIsOpen] = useState(persisted?.isOpen || false);
    const [messages, setMessages] = useState<ChatMessage[]>(persisted?.messages || []);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionStart] = useState<Date>(new Date());
    const [flowStep, setFlowStep] = useState<FlowStep>(persisted?.flowStep || 'idle');
    const [tripDraft, setTripDraft] = useState<Record<string, any>>(persisted?.tripDraft || {});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Persist state to sessionStorage
    useEffect(() => {
        const data = {
            messages: messages.map(m => ({ ...m, widget: undefined })), // Strip widgets (contextual UI)
            flowStep,
            tripDraft,
            isOpen,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [messages, flowStep, tripDraft, isOpen]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Focus input
    useEffect(() => {
        if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 300);
    }, [isOpen]);

    // Greeting - role-aware quick actions
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Admin-only quick actions
            const actions: { label: string; value: string }[] = [
                { label: isAr ? '🚛 تسجيل رحلة' : '🚛 Register Trip', value: isAr ? 'سجل رحلة جديدة' : 'Register a new trip' },
                { label: isAr ? '🚚 إدارة الأسطول' : '🚚 Fleet Management', value: '/f' },
                { label: isAr ? '📦 المخزون' : '📦 Inventory', value: '/iv' },
                { label: isAr ? '📊 إحصائيات' : '📊 Statistics', value: isAr ? 'اعرض لي إحصائيات اليوم' : 'Show me today statistics' },
                { label: isAr ? '❓ مساعدة' : '❓ Help', value: isAr ? 'كيف استخدم النظام؟' : 'How to use the system?' }
            ];

            const welcomeMsg = isAr
                ? `مرحباً ${currentUser.name}! أنا شادي مساعدك الذكي. يمكنني مساعدتك في تسجيل الرحلات، متابعة الأسطول، أو تحليل البيانات الإحصائية. كيف يمكنني خدمتك اليوم؟`
                : `Hello ${currentUser.name}! I'm Shady, your AI assistant. I can help you register trips, manage fleet, or analyze statistics. How can I help you today?`;

            const greeting: ChatMessage = {
                id: 'greeting-' + Date.now(),
                role: 'assistant',
                content: welcomeMsg,
                timestamp: new Date(),
                widget: { type: 'quick_actions', actions }
            };
            setMessages([greeting]);
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Helpers ---
    const getNextNumber = (prefix: 'M-' | 'DN-') => {
        const existingTrips = store.trips || [];
        const numbers = existingTrips
            .map(t => prefix === 'M-' ? t.waste_manifest_no : t.delivery_note_no)
            .filter(n => n && n.startsWith(prefix))
            .map(n => parseInt(n!.replace(prefix, '')))
            .filter(n => !isNaN(n));

        const max = numbers.length > 0 ? Math.max(...numbers) : 0;
        return `${prefix}${(max + 1).toString().padStart(6, '0')}`;
    };

    const addAssistantMessage = (content: string, widget?: ChatWidget) => {
        setMessages(prev => [...prev, {
            id: `a-${Date.now()}-${Math.random()}`,
            role: 'assistant',
            content,
            timestamp: new Date(),
            widget
        }]);
    };

    const addUserMessage = (content: string) => {
        setMessages(prev => [...prev, {
            id: `u-${Date.now()}`,
            role: 'user',
            content,
            timestamp: new Date()
        }]);
    };

    // --- Build context for AI (role-scoped) ---
    const buildContext = useCallback(() => {
        const role = currentUser.role;

        // Admin context: Full visibility into all logic for global management
        const contextData = {
            companies: companies.map(c => ({ id: c.company_id, name: c.company_name })),
            projects: projects.map(p => ({ id: p.project_id, name: p.project_name, company_id: p.company_id })),
            services: services.map(s => ({ id: s.service_id, name: s.service_name })),
            project_services: projectServices.map(ps => ({ project_id: ps.project_id, service_id: ps.service_id })),
            vehicles: vehicles.filter(v => v.status === 'ACTIVE').map(v => ({ id: v.vehicle_id, plate: v.plate_no, type: v.vehicle_type })),
            drivers: drivers.filter(d => d.status === 'ACTIVE').map(d => ({ id: d.driver_id, name: d.name })),
            facilities: store.facilities.filter(f => f.status === 'ACTIVE').map(f => ({ id: f.facility_id, name: f.name, type: f.type, services: f.accepted_services })),
            current_user: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
            // Global stats for AI analysis
            trip_stats: {
                total: trips.length,
                completed: trips.filter(t => t.status === 'COMPLETED').length,
                pending: trips.filter(t => ['REQUESTED', 'PENDING_APPROVAL'].includes(t.status || '')).length
            }
        };

        return contextData;
    }, [companies, projects, services, projectServices, vehicles, drivers, store.facilities, currentUser, trips]);

    // --- Step-based Trip Flow ---
    const startTripFlow = () => {
        setFlowStep('ownership');
        setTripDraft({});

        addAssistantMessage(
            isAr ? '🤔 هل الرحلة تابعة للشركة أم لمورد خارجي؟' : '🤔 Is this an Internal trip or Supplier trip?',
            {
                type: 'quick_actions',
                actions: [
                    { label: isAr ? '🏢 أسطول الشركة' : '🏢 Internal Fleet', value: 'INTERNAL' },
                    { label: isAr ? '🤝 مورد خارجي' : '🤝 Supplier', value: 'SUPPLIER' }
                ]
            }
        );
    };

    const startFacilityFlow = () => {
        setFlowStep('fac_name');
        setTripDraft({}); // Reusing tripDraft as a general state draft
        addAssistantMessage(
            isAr ? '🏗️ رائع! ما هو اسم المرفق الجديد الذي تود إضافته؟' : '🏗️ Great! What is the name of the new facility you want to add?'
        );
    };

    const handleStepSelection = (key: string, value: string, label: string) => {
        addUserMessage(label);
        const draft = { ...tripDraft, [key]: value };
        setTripDraft(draft);

        // Advance to next step
        switch (flowStep) {
            case 'ownership': {
                if (value === 'SUPPLIER') {
                    setFlowStep('supplier');
                    const activeSuppliers = suppliers.filter(s => s.status === 'ACTIVE');

                    if (activeSuppliers.length === 0) {
                        addAssistantMessage(
                            isAr ? '⚠️ لا يوجد موردين نشطين. يرجى إضافة مورد أولاً.' : '⚠️ No active suppliers found. Please add a supplier first.',
                            { type: 'quick_actions', actions: [{ label: isAr ? '🔙 رجوع' : '🔙 Back', value: '__restart__' }] }
                        );
                        return;
                    }

                    addAssistantMessage(
                        isAr ? '🤝 **اختر المورد:**' : '🤝 **Select Supplier:**',
                        {
                            type: 'select',
                            key: 'supplier_id',
                            options: activeSuppliers.map(s => ({ id: s.supplier_id, label: s.name })),
                            placeholder: isAr ? 'اختر المورد...' : 'Select Supplier...'
                        }
                    );
                    return;
                }

                // If INTERNAL, go straight to company
                setFlowStep('company');
                const companyOptions = companies.map(c => ({ id: c.company_id, label: c.company_name }));
                if (companyOptions.length === 0) {
                    addAssistantMessage(
                        isAr ? '⚠️ لا توجد شركات مسجلة. هل تريد إضافة شركة؟' : '⚠️ No companies. Add one?',
                        { type: 'quick_actions', actions: [{ label: isAr ? '➕ إضافة شركة' : '➕ Add Company', value: '/companies' }] }
                    );
                    return;
                }
                addAssistantMessage(
                    isAr ? '🏢 **الخطوة 2/10** — اختر الشركة:' : '🏢 **Step 2/10** — Select company:',
                    { type: 'select', key: 'company_id', options: companyOptions, placeholder: isAr ? 'اختر شركة...' : 'Select company...' }
                );
                break;
            }
            case 'supplier': {
                setFlowStep('company');
                const companyOptions = companies.map(c => ({ id: c.company_id, label: c.company_name }));
                addAssistantMessage(
                    isAr ? '🏢 **الخطوة 3/10** — اختر الشركة:' : '🏢 **Step 3/10** — Select company:',
                    { type: 'select', key: 'company_id', options: companyOptions, placeholder: isAr ? 'اختر شركة...' : 'Select company...' }
                );
                break;
            }
            case 'company': {
                setFlowStep('project');
                const companyProjects = projects.filter(p => p.company_id === value);
                if (companyProjects.length === 0) {
                    addAssistantMessage(
                        isAr ? '⚠️ لا توجد مشاريع لهذه الشركة. هل تريد إضافة مشروع؟' : '⚠️ No projects for this company. Add one?',
                        {
                            type: 'quick_actions', actions: [
                                { label: isAr ? '➕ إضافة مشروع' : '➕ Add Project', value: '/projects' },
                                { label: isAr ? '🔙 رجوع' : '🔙 Back', value: '__restart__' }
                            ]
                        }
                    );
                    return;
                }
                addAssistantMessage(
                    isAr ? '📍 **الخطوة 3/10** — اختر المشروع:' : '📍 **Step 3/10** — Select project:',
                    { type: 'select', key: 'project_id', options: companyProjects.map(p => ({ id: p.project_id, label: p.project_name })), placeholder: isAr ? 'اختر مشروع...' : 'Select project...' }
                );
                break;
            }
            case 'project': {
                setFlowStep('service');
                // Get services available for this project
                const projSvcIds = projectServices.filter(ps => ps.project_id === value).map(ps => ps.service_id);
                const availableServices = projSvcIds.length > 0
                    ? services.filter(s => projSvcIds.includes(s.service_id))
                    : services;
                if (availableServices.length === 0) {
                    addAssistantMessage(
                        isAr ? '⚠️ لا توجد خدمات متاحة. أضف خدمات للمشروع أولاً.' : '⚠️ No services available. Add services to the project first.',
                        { type: 'quick_actions', actions: [{ label: isAr ? '🔙 رجوع' : '🔙 Back', value: '__restart__' }] }
                    );
                    return;
                }
                addAssistantMessage(
                    isAr ? '🧹 **الخطوة 4/10** — اختر الخدمة:' : '🧹 **Step 4/10** — Select service:',
                    { type: 'select', key: 'service_id', options: availableServices.map(s => ({ id: s.service_id, label: s.service_name })), placeholder: isAr ? 'اختر خدمة...' : 'Select service...' }
                );
                break;
            }
            case 'service': {
                setFlowStep('date');
                addAssistantMessage(
                    isAr ? '📅 **الخطوة 5/10** — اختر التاريخ:' : '📅 **Step 5/10** — Select date:',
                    { type: 'date', key: 'date', placeholder: isAr ? 'اختر التاريخ' : 'Select date' }
                );
                break;
            }
            case 'date': {
                setFlowStep('time');
                addAssistantMessage(
                    isAr ? '🕐 **الخطوة 6/10** — اختر الوقت:' : '🕐 **Step 6/10** — Select time:',
                    { type: 'time', key: 'time', placeholder: isAr ? 'اختر الوقت' : 'Select time' }
                );
                break;
            }
            case 'time': {
                setFlowStep('quantity');
                addAssistantMessage(
                    isAr ? '⚖️ **الخطوة 7/10** — أدخل الكمية:' : '⚖️ **Step 7/10** — Enter quantity:',
                    { type: 'number', key: 'quantity', placeholder: isAr ? 'أدخل الكمية' : 'Enter quantity' }
                );
                break;
            }
            case 'quantity': {
                setFlowStep('unit');
                addAssistantMessage(
                    isAr ? '📏 **الخطوة 8/10** — اختر الوحدة:' : '📏 **Step 8/10** — Select unit:',
                    { type: 'unit', key: 'unit' }
                );
                break;
            }
            case 'unit': {
                setFlowStep('vehicle');
                // Filter vehicles by ownership type (Internal or Supplier)
                const ownership = tripDraft.ownership || 'INTERNAL';
                const supplierDetails = tripDraft.supplier_id ? supplierMap[tripDraft.supplier_id] : null;

                const activeVehicles = vehicles.filter(v =>
                    v.status === 'ACTIVE' &&
                    (ownership === 'INTERNAL'
                        ? (!v.ownership_type || v.ownership_type === 'INTERNAL')
                        : (v.ownership_type === 'SUPPLIER' && v.supplier_id === tripDraft.supplier_id)
                    )
                );

                if (activeVehicles.length === 0) {
                    addAssistantMessage(
                        isAr
                            ? `⚠️ لا توجد مركبات (${ownership === 'INTERNAL' ? 'تابعة للشركة' : 'مورد خارجي'}) متاحة. هل تريد تسجيل مركبة؟`
                            : `⚠️ No ${ownership} vehicles available. Want to add one?`,
                        {
                            type: 'quick_actions', actions: [
                                { label: isAr ? '➕ إضافة مركبة' : '➕ Add Vehicle', value: '/fleet' },
                                { label: isAr ? '🔙 رجوع' : '🔙 Back', value: '__restart__' }
                            ]
                        }
                    );
                    return;
                }
                addAssistantMessage(
                    isAr ? '🚛 **الخطوة 9/10** — اختر المركبة:' : '🚛 **Step 9/10** — Select vehicle:',
                    { type: 'select', key: 'vehicle_id', options: activeVehicles.map(v => ({ id: v.vehicle_id, label: `${v.plate_no} (${v.vehicle_type})` })), placeholder: isAr ? 'اختر مركبة...' : 'Select vehicle...' }
                );
                break;
            }
            case 'vehicle': {
                setFlowStep('driver');
                // Filter drivers by ownership type
                const ownership = tripDraft.ownership || 'INTERNAL';
                const activeDrivers = drivers.filter(d =>
                    d.status === 'ACTIVE' &&
                    (ownership === 'INTERNAL'
                        ? (!d.ownership_type || d.ownership_type === 'INTERNAL')
                        : (d.ownership_type === 'SUPPLIER' && d.supplier_id === tripDraft.supplier_id)
                    )
                );

                if (activeDrivers.length === 0) {
                    addAssistantMessage(
                        isAr
                            ? `⚠️ لا يوجد سائقين (${ownership === 'INTERNAL' ? 'موظفين' : 'موردين'}) متاحين. هل تريد إضافة سائق؟`
                            : `⚠️ No ${ownership} drivers available. Want to add one?`,
                        {
                            type: 'quick_actions', actions: [
                                { label: isAr ? '➕ إضافة سائق' : '➕ Add Driver', value: '/fleet' },
                                { label: isAr ? '🔙 رجوع' : '🔙 Back', value: '__restart__' }
                            ]
                        }
                    );
                    return;
                }
                addAssistantMessage(
                    isAr ? '👷 **الخطوة 10/10** — اختر السائق:' : '👷 **Step 10/10** — Select driver:',
                    { type: 'select', key: 'driver_id', options: activeDrivers.map(d => ({ id: d.driver_id, label: d.name })), placeholder: isAr ? 'اختر سائق...' : 'Select driver...' }
                );
                break;
            }
            case 'driver': {
                setFlowStep('facility');
                if (!tripDraft.service_id) {
                    setFlowStep('service');
                    addAssistantMessage(
                        isAr ? '⚠️ يجب تحديد نوع الخدمة أولاً لعرض المرافق المناسبة.' : '⚠️ Service type is required to show relevant facilities.',
                        { type: 'select', key: 'service_id', options: services.map(s => ({ id: s.service_id, label: s.service_name })), placeholder: isAr ? 'اختر خدمة...' : 'Select service...' }
                    );
                    return;
                }

                const availableFacilities = store.facilities.filter(f =>
                    f.status === 'ACTIVE' && (f.accepted_services || []).includes(tripDraft.service_id)
                );

                if (availableFacilities.length === 0) {
                    addAssistantMessage(
                        isAr ? `⚠️ لا توجد مرافق معتمدة تقبل خدمة "${serviceMap[tripDraft.service_id]?.service_name}" في النظام.` : '⚠️ No approved facilities found for this service type.',
                        {
                            type: 'quick_actions',
                            actions: [
                                { label: isAr ? '🔄 تغيير الخدمة' : '🔄 Change Service', value: '__restart__' },
                                { label: isAr ? 'إلغاء' : 'Cancel', value: '__cancel__' }
                            ]
                        }
                    );
                    return;
                }

                addAssistantMessage(
                    isAr ? '🏢 **الخطوة 11/14** — اختر مرفق التفريغ:' : '🏢 **Step 11/14** — Select Disposal Facility:',
                    {
                        type: 'select',
                        key: 'facility_id',
                        options: availableFacilities.map(f => ({ id: f.facility_id, label: `${f.name} (${f.type})` })),
                        placeholder: isAr ? 'اختر المرفق...' : 'Select Facility...'
                    }
                );
                break;
            }
            case 'facility': {
                setFlowStep('manifest');
                addAssistantMessage(
                    isAr ? '📄 **الخطوة 12/14** — أدخل رقم المانفيست أو اختر توليد تلقائي:' : '📄 **Step 12/14** — Enter Manifest Number or Auto-Generate:',
                    {
                        type: 'quick_actions',
                        actions: [
                            { label: isAr ? '🪄 توليد تلقائي' : '🪄 Auto-Generate', value: '__generate_manifest__' },
                            { label: isAr ? '📝 سأكتب الرقم' : '📝 I will type it', value: '__type_manifest__' }
                        ]
                    }
                );
                break;
            }
            case 'manifest': {
                setFlowStep('delivery_note');
                addAssistantMessage(
                    isAr ? '🚚 **الخطوة 13/14** — أدخل رقم سند التسليم أو اختر توليد تلقائي:' : '🚚 **Step 13/14** — Enter Delivery Note or Auto-Generate:',
                    {
                        type: 'quick_actions',
                        actions: [
                            { label: isAr ? '🪄 توليد تلقائي' : '🪄 Auto-Generate', value: '__generate_dn__' },
                            { label: isAr ? '📝 سأكتب الرقم' : '📝 I will type it', value: '__type_dn__' }
                        ]
                    }
                );
                break;
            }
            case 'delivery_note': {
                setFlowStep('recycle_receipt');
                addAssistantMessage(
                    isAr ? '♻️ **الخطوة 13/13** — أدخل رقم إيصال إعادة التدوير:' : '♻️ **Step 13/13** — Enter Recycle Receipt Number:',
                    { type: 'number', key: 'recycle_receipt_no', placeholder: 'e.g., R-55555' }
                );
                break;
            }
            case 'recycle_receipt': {
                setFlowStep('confirm');
                showConfirmation(draft);
                break;
            }
            case 'fac_name': {
                setFlowStep('fac_type');
                addAssistantMessage(
                    isAr ? '📑 ما هو نوع هذا المرفق؟' : '📑 What type is this facility?',
                    {
                        type: 'select',
                        key: 'fac_type',
                        options: [
                            { id: 'DISPOSAL', label: isAr ? 'مكب نفايات (Disposal)' : 'Disposal' },
                            { id: 'RECYCLE', label: isAr ? 'محطة تدوير (Recycle)' : 'Recycle' },
                            { id: 'SEWAGE_TREATMENT', label: isAr ? 'محطة معالجة (Treatment)' : 'Treatment' }
                        ],
                        placeholder: isAr ? 'اختر النوع...' : 'Select Type...'
                    }
                );
                break;
            }
            case 'fac_type': {
                setFlowStep('fac_location');
                addAssistantMessage(
                    isAr ? '📍 هل لديك رابط موقع المرفق أو تريد مني استخدامه كموقع افتراضي؟' : '📍 Do you have a location URL or should I leave it blank for now?',
                    {
                        type: 'quick_actions',
                        actions: [
                            { label: isAr ? '🚫 تخطي' : '🚫 Skip', value: 'NONE' },
                            { label: isAr ? '📝 سأكتبه' : '📝 I will type it', value: 'TYPE' }
                        ]
                    }
                );
                break;
            }
            case 'fac_location': {
                setFlowStep('fac_confirm');
                const summary = isAr
                    ? `📋 **ملخص المرفق الجديد:**\n\n🏗️ الاسم: **${draft.fac_name}**\n📑 النوع: **${draft.fac_type}**\n📍 الموقع: **${draft.fac_location || 'غير محدد'}**\n\n**هل تريد تأكيد إضافة هذا المرفق؟**`
                    : `📋 **New Facility Summary:**\n\n🏗️ Name: **${draft.fac_name}**\n📑 Type: **${draft.fac_type}**\n📍 Location: **${draft.fac_location || 'Not set'}**\n\n**Confirm adding this facility?**`;

                addAssistantMessage(summary, {
                    type: 'quick_actions',
                    actions: [
                        { label: isAr ? '✅ تأكيد الإضافة' : '✅ Confirm & Add', value: '__confirm_fac__' },
                        { label: isAr ? '❌ إلغاء' : '❌ Cancel', value: '__cancel__' }
                    ]
                });
                break;
            }
            default: break;
        }
    };

    // --- Show trip confirmation ---
    const showConfirmation = (draft: Record<string, any>) => {
        const companyName = companyMap[draft.company_id]?.company_name || draft.company_id;
        const projectName = projectMap[draft.project_id]?.project_name || draft.project_id;
        const serviceName = serviceMap[draft.service_id]?.service_name || draft.service_id;
        const vehiclePlate = vehicleMap[draft.vehicle_id]?.plate_no || draft.vehicle_id;
        const driverName = driverMap[draft.driver_id]?.name || draft.driver_id;
        const supplierName = draft.supplier_id ? supplierMap[draft.supplier_id]?.name : null;
        const facilityName = facilityMap[draft.facility_id]?.name || draft.facility_id;

        const summary = isAr
            ? `📋 **ملخص الرحلة:**\n\n${supplierName ? `🤝 المورد: **${supplierName}**\n` : ''}🏢 الشركة: **${companyName}**\n📍 المشروع: **${projectName}**\n🧹 الخدمة: **${serviceName}**\n📅 التاريخ: **${draft.date}**\n🕐 الوقت: **${draft.time}**\n⚖️ الكمية: **${draft.quantity} ${draft.unit}**\n🚛 المركبة: **${vehiclePlate}**\n👷 السائق: **${driverName}**\n🏢 المرفق: **${facilityName}**\n📄 مانفيست: **${draft.manifest_no}**\n🚚 تسليم: **${draft.delivery_note_no}**\n♻️ تدوير: **${draft.recycle_receipt_no}**\n${draft.notes ? `📝 ملاحظات: ${draft.notes}` : ''}\n\n**هل تريد تأكيد تسجيل الرحلة؟**`
            : `📋 **Trip Summary:**\n\n${supplierName ? `🤝 Supplier: **${supplierName}**\n` : ''}🏢 Company: **${companyName}**\n📍 Project: **${projectName}**\n🧹 Service: **${serviceName}**\n📅 Date: **${draft.date}**\n🕐 Time: **${draft.time}**\n⚖️ Quantity: **${draft.quantity} ${draft.unit}**\n🚛 Vehicle: **${vehiclePlate}**\n👷 Driver: **${driverName}**\n🏢 Facility: **${facilityName}**\n📄 Manifest: **${draft.manifest_no}**\n🚚 DN: **${draft.delivery_note_no}**\n♻️ Recycle: **${draft.recycle_receipt_no}**\n${draft.notes ? `📝 Notes: ${draft.notes}` : ''}\n\n**Confirm trip registration?**`;

        addAssistantMessage(summary, {
            type: 'quick_actions',
            actions: [
                { label: isAr ? '✅ تأكيد وتسجيل' : '✅ Confirm & Register', value: '__confirm_trip__' },
                { label: isAr ? '📝 إضافة ملاحظات' : '📝 Add Notes', value: '__add_notes__' },
                { label: isAr ? '❌ إلغاء' : '❌ Cancel', value: '__cancel__' },
            ]
        });
    };

    // --- Create trip ---
    const createTrip = async () => {
        setLoading(true);
        try {
            const tripId = `TRIP-${Date.now()}`;

            // Construct trip object
            const trip: any = {
                trip_id: tripId,
                company_id: tripDraft.company_id,
                project_id: tripDraft.project_id,
                service_id: tripDraft.service_id,
                date: tripDraft.date,
                time: tripDraft.time || '08:00',
                quantity: String(tripDraft.quantity || 1),
                unit: (tripDraft.unit || 'TON') as 'TON' | 'KG',
                vehicle_id: tripDraft.vehicle_id,
                driver_id: tripDraft.driver_id,
                notes: tripDraft.notes || '',
                status: TripStatus.REQUESTED,
                created_by: currentUser.id,
                proof_images: [] as string[],
                // Add Document Numbers
                waste_manifest_no: tripDraft.manifest_no,
                delivery_note_no: tripDraft.delivery_note_no,
                recycle_receipt_no: tripDraft.recycle_receipt_no,
                facility_id: tripDraft.facility_id
            };

            // Validate required fields to prevent 400 Bad Request
            if (!trip.company_id || !trip.project_id || !trip.vehicle_id || !trip.driver_id) {
                const missing = [];
                if (!trip.company_id) missing.push('Company');
                if (!trip.project_id) missing.push('Project');
                if (!trip.vehicle_id) missing.push('Vehicle');
                if (!trip.driver_id) missing.push('Driver');

                throw new Error(`Missing required fields: ${missing.join(', ')}`);
            }

            await upsertTrip(trip);
            setFlowStep('done');

            addAssistantMessage(
                isAr
                    ? `✅ **تم تسجيل الرحلة بنجاح!** 🎉\n\n📋 رقم الرحلة: \`${tripId}\`\n\nيمكنك مراجعتها في صفحة الرحلات.`
                    : `✅ **Trip registered successfully!** 🎉\n\n📋 Trip ID: \`${tripId}\`\n\nYou can view it in the Trips page.`,
                {
                    type: 'quick_actions',
                    actions: [
                        { label: isAr ? '🚛 رحلة جديدة' : '🚛 New Trip', value: isAr ? 'سجل رحلة جديدة' : 'Register a new trip' },
                        { label: isAr ? '📄 عرض الرحلات' : '📄 View Trips', value: '/trips' },
                    ]
                }
            );

            // Log session
            logSession('completed', tripId);
        } catch (e: any) {
            console.error('[Shady] Trip error:', e);
            addAssistantMessage(
                isAr ? `❌ خطأ في التسجيل: ${e.message || 'حدث خطأ غير متوقع'}` : `❌ Error: ${e.message || 'Unexpected error'}`,
                { type: 'quick_actions', actions: [{ label: isAr ? '🔄 إعادة المحاولة' : '🔄 Retry', value: '__confirm_trip__' }] }
            );
        } finally {
            setLoading(false);
        }
    };

    const createFacility = async () => {
        setLoading(true);
        try {
            const facId = `FAC-${Date.now()}`;
            const facility = {
                facility_id: facId,
                name: tripDraft.fac_name,
                type: tripDraft.fac_type,
                location_url: tripDraft.fac_location || '',
                status: 'ACTIVE',
                accepted_services: []
            };

            await store.upsertFacility(facility as any);
            setFlowStep('done');

            addAssistantMessage(
                isAr
                    ? `✅ **تمت إضافة المرفق بنجاح!** 🎉\n\n الاسم: **${facility.name}**\n الرقم: \`${facId}\``
                    : `✅ **Facility added successfully!** 🎉\n\n Name: **${facility.name}**\n ID: \`${facId}\``,
                {
                    type: 'quick_actions',
                    actions: [
                        { label: isAr ? '🏗️ عرض المرافق' : '🏗️ View Facilities', value: '/fac' },
                        { label: isAr ? '🔙 الرئيسية' : '🔙 Home', value: '/' }
                    ]
                }
            );
        } catch (e: any) {
            addAssistantMessage(isAr ? `❌ خطأ: ${e.message}` : `❌ Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Handle quick action / widget selection ---
    const handleAction = (value: string) => {
        if (value === '__restart__') {
            setFlowStep('idle');
            setTripDraft({});
            startTripFlow();
            return;
        }
        if (value === '__confirm_trip__') {
            createTrip();
            return;
        }
        if (value === '__add_notes__') {
            setFlowStep('notes');
            addUserMessage(isAr ? 'إضافة ملاحظات' : 'Add notes');
            addAssistantMessage(
                isAr ? '📝 اكتب ملاحظاتك:' : '📝 Type your notes:',
            );
            return;
        }
        if (value === '__generate_manifest__') {
            const nextNo = getNextNumber('M-');
            handleStepSelection('manifest_no', nextNo, `🪄 ${nextNo}`);
            return;
        }
        if (value === '__type_manifest__') {
            addAssistantMessage(isAr ? 'تفضل، أدخل رقم المانفيست:' : 'Go ahead, enter the Manifest number:', { type: 'number', key: 'manifest_no', placeholder: 'M-XXXXXX' });
            return;
        }
        if (value === '__generate_dn__') {
            const nextNo = getNextNumber('DN-');
            handleStepSelection('delivery_note_no', nextNo, `🪄 ${nextNo}`);
            return;
        }
        if (value === '__type_dn__') {
            addAssistantMessage(isAr ? 'تفضل، أدخل رقم سند التسليم:' : 'Go ahead, enter the Delivery Note number:', { type: 'number', key: 'delivery_note_no', placeholder: 'DN-XXXXXX' });
            return;
        }

        if (value === '__cancel__') {
            setFlowStep('idle');
            setTripDraft({});
            addUserMessage(isAr ? 'إلغاء' : 'Cancel');
            addAssistantMessage(
                isAr ? 'تم الإلغاء. كيف أقدر أساعدك؟' : 'Cancelled. How can I help you?',
                {
                    type: 'quick_actions',
                    actions: [
                        { label: isAr ? '🚛 تسجيل رحلة' : '🚛 Register Trip', value: isAr ? 'سجل رحلة جديدة' : 'Register a new trip' },
                    ]
                }
            );
            return;
        }

        // Handle Trip Flow Quick Actions (Ownership & Document Type)
        if (flowStep === 'ownership' && (value === 'INTERNAL' || value === 'SUPPLIER')) {
            const label = value === 'INTERNAL'
                ? (isAr ? '🏢 أسطول الشركة' : 'Internal Fleet')
                : (isAr ? '🤝 مورد خارجي' : 'External Supplier');
            handleStepSelection('ownership', value, label);
            return;
        }



        if (value === '__confirm_fac__') {
            createFacility();
            return;
        }
        if (value === 'سجل مرفق جديد' || value === 'New Facility' || value === '/fac') {
            startFacilityFlow();
            return;
        }
        if (flowStep === 'fac_location' && (value === 'NONE' || value === 'TYPE')) {
            if (value === 'NONE') {
                handleStepSelection('fac_location', '', isAr ? 'تخطي' : 'Skip');
            } else {
                addAssistantMessage(isAr ? 'قم بلصق رابط الموقع هنا:' : 'Paste the location URL here:');
            }
            return;
        }
        if (value.startsWith('/')) {
            // Navigate
            addUserMessage(value);
            addAssistantMessage(
                isAr ? `جاري نقلك...` : `Navigating...`
            );
            navigate(value);
            setIsOpen(false);
            return;
        }
        // Otherwise treat as regular input
        handleSend(value);
    };

    // --- AI Chat (Structured) ---
    const sendToAI = async (text: string) => {
        setLoading(true);
        try {
            // Include current trip draft in context so AI knows what we have
            const currentContext = {
                ...buildContext(),
                language: saasConfig.language || 'ar',
                current_trip_draft: tripDraft,
                current_step: flowStep
            };

            const apiMessages = messages
                .filter(m => m.role !== 'system' && m.id !== messages[0]?.id)
                .map(m => ({ role: m.role, content: m.content }));

            apiMessages.push({ role: 'user', content: text });

            const res = await api.chatWithAI(apiMessages, currentContext);

            // Attempt to parse JSON response if the AI obeyed instructions
            let aiResponse: any;
            try {
                // Sometimes AI might wrap JSON in markdown code blocks
                const raw = res.reply.replace(/```json/g, '').replace(/```/g, '').trim();
                aiResponse = JSON.parse(raw);
            } catch {
                // Fallback for non-JSON response (legacy/error)
                aiResponse = { reply: res.reply, intent: 'GENERAL_CHAT' };
            }

            processAIResponse(aiResponse);

        } catch (e) {
            console.error('AI Error:', e);
            addAssistantMessage(isAr ? '⚠️ خطأ في الاتصال. حاول مرة أخرى.' : '⚠️ Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const processAIResponse = (response: any) => {
        const { reply, intent, trip_data, next_step, missing_fields } = response;

        // 1. Show AI's text reply
        if (reply) addAssistantMessage(reply);

        // 2. Update Draft with extracted data
        let currentDraft = tripDraft;
        if (trip_data && Object.keys(trip_data).length > 0) {
            setTripDraft(prev => {
                const updated = { ...prev, ...trip_data };
                currentDraft = updated; // Capture for immediate use
                return updated;
            });
        }

        // 3. Handle Intents
        if (intent === 'TRIP_REGISTRATION') {
            if (flowStep === 'idle' || flowStep === 'done') {
                setFlowStep('ownership'); // Start flow if not already
            }

            // 4. Auto-advance step based on AI recommendation
            if (next_step === 'confirmation') {
                setFlowStep('confirm');
                // We need to wait for state update, so passing merged data directly
                showConfirmation({ ...tripDraft, ...trip_data });
            } else if (next_step && flowStep !== next_step) {
                // Map AI's next_step to our FlowStep
                // The AI might return 'supplier_id', map it to 'supplier' step, etc.
                const stepMap: Record<string, FlowStep> = {
                    'ownership': 'ownership',
                    'supplier_id': 'supplier',
                    'company_id': 'company',
                    'project_id': 'project',
                    'service_id': 'service',
                    'date': 'date',
                    'time': 'time',
                    'quantity': 'quantity',
                    'unit': 'unit',
                    'vehicle_id': 'vehicle',
                    'driver_id': 'driver',
                    'facility_id': 'facility',
                    'manifest_no': 'manifest',
                    'delivery_note_no': 'delivery_note',
                    'recycle_receipt_no': 'recycle_receipt'
                };

                const mappedStep = stepMap[next_step];
                if (mappedStep) {
                    setFlowStep(mappedStep);
                    // trigger widget for compliance with latest data
                    triggerWidgetForStep(mappedStep, currentDraft);
                }
            }
        } else if (intent === 'FACILITY_ONBOARDING') {
            if (flowStep === 'idle' || flowStep === 'done') {
                startFacilityFlow();
            }
            if (trip_data && (trip_data.name || trip_data.fac_name)) {
                setTripDraft(prev => ({ ...prev, fac_name: trip_data.name || trip_data.fac_name, ...trip_data }));
            }
        } else if (intent === 'REPORT_EXPORT') {
            const { export_options } = response;
            if (export_options && (export_options.project_id || export_options.start_date)) {
                const filtered = filterTripsForAI(trips, export_options);

                if (filtered.length > 0) {
                    addAssistantMessage(isAr
                        ? `📄 جاري استخراج التقرير لـ ${filtered.length} رحلة...`
                        : `📄 Generating report for ${filtered.length} trips...`
                    );
                    generateBulkPdf(filtered, projects, drivers, vehicles, services, companies, suppliers, facilities, isAr, { includeSummary: true, includeManifest: true, includeDeliveryNote: true, includeRecycleReceipt: true }, saasConfig?.templateConfig);
                } else {
                    addAssistantMessage(isAr
                        ? '⚠️ لم يتم العثور على رحلات تطابق هذا المشروع أو الفترة الزمنية.'
                        : '⚠️ No trips found matching this project or timeframe.'
                    );
                }
            }
        } else if (intent === 'DATA_QUERY') {
            // Local aggregation engine - compute stats without overloading LLM context
            const filters = response.query_filters || {};
            let filtered = [...trips];

            // Apply filters
            if (filters.company_id) {
                const projectIds = projects.filter(p => p.company_id === filters.company_id).map(p => p.project_id);
                filtered = filtered.filter(t => projectIds.includes(t.project_id));
            }
            if (filters.project_id) filtered = filtered.filter(t => t.project_id === filters.project_id);
            if (filters.service_id) filtered = filtered.filter(t => t.service_id === filters.service_id);
            if (filters.status) filtered = filtered.filter(t => t.status === filters.status);
            if (filters.driver_id) filtered = filtered.filter(t => t.driver_id === filters.driver_id);
            if (filters.start_date) filtered = filtered.filter(t => t.date && t.date >= filters.start_date);
            if (filters.end_date) filtered = filtered.filter(t => t.date && t.date <= filters.end_date);

            // Aggregate
            const totalTrips = filtered.length;
            const totalQty = filtered.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
            const completedTrips = filtered.filter(t => t.status === 'COMPLETED').length;
            const pendingTrips = filtered.filter(t => ['REQUESTED', 'PENDING_APPROVAL', 'PENDING_DOCS', 'PENDING_REVIEW'].includes(t.status || '')).length;

            // Resolve display names for the filter context
            const companyName = filters.company_id ? companyMap[filters.company_id]?.company_name : null;
            const projectName = filters.project_id ? projectMap[filters.project_id]?.project_name : null;

            const header = companyName
                ? (isAr ? `📊 **نتائج البحث - ${companyName}${projectName ? ` / ${projectName}` : ''}**` : `📊 **Query Results - ${companyName}${projectName ? ` / ${projectName}` : ''}**`)
                : (isAr ? '📊 **نتائج البحث**' : '📊 **Query Results**');

            const statsText = isAr
                ? `${header}\n\n🚛 إجمالي الرحلات: **${totalTrips}**\n📦 إجمالي الكميات: **${totalQty.toLocaleString()}** طن\n✅ مكتملة: **${completedTrips}**\n⏳ معلقة: **${pendingTrips}**`
                : `${header}\n\n🚛 Total Trips: **${totalTrips}**\n📦 Total Quantity: **${totalQty.toLocaleString()}** tons\n✅ Completed: **${completedTrips}**\n⏳ Pending: **${pendingTrips}**`;

            addAssistantMessage(statsText);
        }
    };

    const triggerWidgetForStep = (step: FlowStep, currentDraft: any = tripDraft) => {
        // This helper re-triggers the standard widget message for a given step
        // We can reuse the logic from handleStepSelection transitions or duplicate it slightly
        // For now, we rely on the AI's 'reply' to ask the question, but we need to append the widget manually if needed.

        // This part is tricky because 'addAssistantMessage' appends. 
        // We might want to append a separate message with *just* the widget if the AI didn't provide one.

        // Strategy: The AI gives the text "Please select a project". 
        // We identify 'next_step' = 'project'. 
        // We append a UI widget immediately after.

        switch (step) {
            case 'ownership':
                addAssistantMessage('', {
                    type: 'quick_actions',
                    actions: [
                        { label: isAr ? '🏢 أسطول الشركة' : '🏢 Internal Fleet', value: 'INTERNAL' },
                        { label: isAr ? '🤝 مورد خارجي' : '🤝 Supplier', value: 'SUPPLIER' }
                    ]
                });
                break;
            case 'supplier': {
                const activeSuppliers = suppliers.filter(s => s.status === 'ACTIVE');
                addAssistantMessage('', {
                    type: 'select',
                    key: 'supplier_id',
                    options: activeSuppliers.map(s => ({ id: s.supplier_id, label: s.name })),
                    placeholder: isAr ? 'اختر المورد...' : 'Select Supplier...'
                });
                break;
            }
            case 'company': {
                const companyOptions = companies.map(c => ({ id: c.company_id, label: c.company_name }));
                addAssistantMessage('', {
                    type: 'select',
                    key: 'company_id',
                    options: companyOptions,
                    placeholder: isAr ? 'اختر شركة...' : 'Select company...'
                });
                break;
            }
            case 'project': {
                // We show all projects if company is not selected yet, or filter if we have it
                const companyProjects = currentDraft.company_id
                    ? projects.filter(p => p.company_id === currentDraft.company_id)
                    : projects;

                addAssistantMessage('', {
                    type: 'select',
                    key: 'project_id',
                    options: companyProjects.map(p => ({ id: p.project_id, label: p.project_name })),
                    placeholder: isAr ? 'اختر مشروع...' : 'Select project...'
                });
                break;
            }
            case 'service': {
                addAssistantMessage('', {
                    type: 'select',
                    key: 'service_id',
                    options: services.map(s => ({ id: s.service_id, label: s.service_name })),
                    placeholder: isAr ? 'اختر خدمة...' : 'Select service...'
                });
                break;
            }
            case 'date':
                addAssistantMessage('', { type: 'date', key: 'date', placeholder: '' });
                break;
            case 'time':
                addAssistantMessage('', { type: 'time', key: 'time', placeholder: '' });
                break;
            case 'quantity':
                addAssistantMessage('', { type: 'number', key: 'quantity', placeholder: '' });
                break;
            case 'unit':
                addAssistantMessage('', { type: 'unit', key: 'unit' });
                break;
            case 'vehicle':
                {
                    // Filter vehicles by ownership type (Internal or Supplier)
                    const ownership = currentDraft.ownership || 'INTERNAL';
                    const activeVehicles = vehicles.filter(v =>
                        v.status === 'ACTIVE' &&
                        (ownership === 'INTERNAL'
                            ? (!v.ownership_type || v.ownership_type === 'INTERNAL')
                            : (v.ownership_type === 'SUPPLIER' && v.supplier_id === currentDraft.supplier_id)
                        )
                    );
                    addAssistantMessage('', {
                        type: 'select',
                        key: 'vehicle_id',
                        options: activeVehicles.map(v => ({ id: v.vehicle_id, label: `${v.plate_no}` })),
                        placeholder: isAr ? 'اختر مركبة...' : 'Select vehicle...'
                    });
                }
                break;
            case 'driver':
                {
                    const ownership = currentDraft.ownership || 'INTERNAL';
                    const activeDrivers = drivers.filter(d =>
                        d.status === 'ACTIVE' &&
                        (ownership === 'INTERNAL'
                            ? (!d.ownership_type || d.ownership_type === 'INTERNAL')
                            : (d.ownership_type === 'SUPPLIER' && d.supplier_id === currentDraft.supplier_id)
                        )
                    );
                    addAssistantMessage('', {
                        type: 'select',
                        key: 'driver_id',
                        options: activeDrivers.map(d => ({ id: d.driver_id, label: d.name })),
                        placeholder: isAr ? 'اختر سائق...' : 'Select driver...'
                    });
                }
                break;
            case 'facility': {
                const availableFacilities = store.facilities.filter(f =>
                    f.status === 'ACTIVE' &&
                    (!currentDraft.service_id || (f.accepted_services || []).includes(currentDraft.service_id))
                );

                if (availableFacilities.length === 0) {
                    addAssistantMessage(isAr
                        ? '⚠️ لا توجد مرافق معتمدة تقبل هذه الخدمة.'
                        : '⚠️ No approved facilities found for this service.',
                        { type: 'quick_actions', actions: [{ label: isAr ? 'تغيير الخدمة' : 'Change Service', value: '__restart__' }] }
                    );
                } else {
                    addAssistantMessage('', {
                        type: 'select',
                        key: 'facility_id',
                        options: availableFacilities.map(f => ({ id: f.facility_id, label: `${f.name}` })),
                        placeholder: isAr ? 'اختر المرفق...' : 'Select Facility...'
                    });
                }
                break;
            }
            case 'manifest':
                addAssistantMessage('', { type: 'number', key: 'manifest_no', placeholder: 'Manifest No' });
                break;
            case 'delivery_note':
                addAssistantMessage('', { type: 'number', key: 'delivery_note_no', placeholder: 'Delivery Note No' });
                break;
            case 'recycle_receipt':
                addAssistantMessage('', { type: 'number', key: 'recycle_receipt_no', placeholder: 'Recycle Receipt No' });
                break;
        }
    };

    // --- Main send handler ---
    const handleSend = (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;
        setInput('');

        addUserMessage(msg);

        // Standard flow intercepts (Notes, Navigation)
        if (msg.startsWith('/')) {
            // ... existing nav logic ...
            return;
        }

        if (flowStep === 'notes') {
            setTripDraft(prev => ({ ...prev, notes: msg }));
            setFlowStep('confirm');
            showConfirmation({ ...tripDraft, notes: msg });
            return;
        }

        if (flowStep === 'fac_name') {
            handleStepSelection('fac_name', msg, msg);
            return;
        }

        if (flowStep === 'fac_location' && !['NONE', 'TYPE'].includes(msg)) {
            handleStepSelection('fac_location', msg, msg);
            return;
        }

        // Just send everything to AI now! 
        // The AI backend will determine if it's a trip registration or just chat.
        sendToAI(msg);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    // --- Session logging ---
    const logSession = async (status: string, tripRef?: string, errorMsg?: string) => {
        try {
            await api.logAISession({
                user_id: currentUser.id,
                user_name: currentUser.name,
                user_role: currentUser.role,
                action_type: 'register_trip',
                language: isAr ? 'ar' : 'en',
                status,
                started_at: sessionStart.toISOString(),
                ended_at: new Date().toISOString(),
                duration_seconds: Math.round((Date.now() - sessionStart.getTime()) / 1000),
                trip_reference: tripRef,
                error_message: errorMsg,
            });
        } catch { /* silent */ }
    };

    const clearChat = () => {
        setMessages([]);
        setFlowStep('idle');
        setTripDraft({});
        sessionStorage.removeItem(STORAGE_KEY);
    };

    // --- Format markdown ---
    const formatMsg = (text: string) => {
        if (!text) return '';
        // 1. Escape HTML
        const escaped = text.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m] || m));

        // 2. Apply formatting
        return escaped
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code class="bg-white/10 dark:bg-white/10 bg-black/5 px-1 rounded text-xs font-mono">$1</code>')
            .replace(/\n/g, '<br/>');
    };

    // If AI assistant is disabled, render nothing
    if (aiConfig?.enabled === false) return null;

    // ===========================
    // RENDER
    // ===========================
    return (
        <>
            {/* ---- Floating Button ---- */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className={`fixed bottom-6 ${positionClass} z-[90] w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl shadow-violet-500/30 flex items-center justify-center hover:shadow-violet-500/50 transition-shadow`}
                        style={aiConfig?.color ? { background: aiConfig.color, boxShadow: `0 10px 25px -5px ${aiConfig.color}80` } : {}}
                    >
                        <FloatingIcon size={24} />
                        <span className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ---- Chat Panel ---- */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`fixed bottom-6 ${positionClass} z-[95] w-[400px] h-[600px] bg-surface border border-border rounded-2xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden`}
                    >
                        {/* Header */}
                        <div
                            className="p-4 bg-primary text-white flex items-center justify-between bg-gradient-to-br from-primary to-primary-600"
                            style={aiConfig?.color ? { background: aiConfig.color } : {}}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                    <Bot size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">{assistantName}</h3>
                                    <p className="text-white/70 text-[10px]">
                                        {flowStep !== 'idle' && flowStep !== 'done'
                                            ? (isAr ? '📝 تسجيل رحلة...' : '📝 Registering trip...')
                                            : (isAr ? 'المساعد الذكي • متصل' : 'AI Assistant • Online')
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title={isAr ? 'مسح' : 'Clear'}>
                                    <Trash2 size={16} />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title={isAr ? 'تصغير' : 'Minimize'}>
                                    <Minus size={18} />
                                </button>
                                <button
                                    onClick={async () => {
                                        const ok = await confirmClose({
                                            title: isAr ? 'إغلاق المحادثة' : 'Close Chat',
                                            message: isAr ? 'هل أنت متأكد من إغلاق ومسح المحادثة؟' : 'Are you sure you want to close and clear the chat?',
                                            confirmLabel: isAr ? 'إغلاق ومسح' : 'Close & Clear',
                                            variant: 'danger'
                                        });
                                        if (ok) {
                                            clearChat();
                                            setIsOpen(false);
                                        }
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/60 hover:text-white hover:bg-rose-500 transition-colors"
                                    title={isAr ? 'إغلاق ومسح' : 'Close & Reset'}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-subtle/30">
                            {messages.map(msg => (
                                <div key={msg.id}>
                                    {/* Message Bubble */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className="flex gap-2 max-w-[88%]">
                                            {msg.role === 'assistant' && (
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Bot size={12} className="text-white" />
                                                </div>
                                            )}
                                            <div
                                                className={`px-3 py-2.5 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-primary text-white rounded-br-sm'
                                                    : 'bg-surface border border-border text-text-main rounded-bl-sm'
                                                    }`}
                                                dangerouslySetInnerHTML={{ __html: formatMsg(msg.content) }}
                                            />
                                            {msg.role === 'user' && (
                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <User size={12} className="text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>

                                    {/* Interactive Widget */}
                                    {msg.widget && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15 }}
                                            className="ms-8 mt-2"
                                        >
                                            <WidgetRenderer
                                                widget={msg.widget}
                                                isAr={isAr}
                                                onSelect={handleStepSelection}
                                                onAction={handleAction}
                                            />
                                        </motion.div>
                                    )}
                                </div>
                            ))}

                            {/* Typing */}
                            {loading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                        <Bot size={12} className="text-white" />
                                    </div>
                                    <div className="bg-surface border border-border px-4 py-3 rounded-2xl rounded-bl-sm">
                                        <div className="flex gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-text-subtle/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-text-subtle/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-text-subtle/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Bar */}
                        <div className="p-3 border-t border-border bg-surface flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={
                                        flowStep === 'notes' ? (isAr ? 'اكتب ملاحظاتك...' : 'Type your notes...')
                                            : (isAr ? 'اكتب رسالتك...' : 'Type a message...')
                                    }
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-surface-subtle border border-border text-sm text-text-main placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-all"
                                    dir="auto"
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || loading}
                                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center disabled:opacity-40 transition-all shadow-lg shadow-violet-500/20"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-text-subtle/50 text-center mt-1.5">
                                {isAr ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <ConfirmDialogRenderer />
        </>
    );
};

// ======================================================
// Widget Renderer — Renders interactive elements
// ======================================================
interface WidgetRendererProps {
    widget: ChatWidget;
    isAr: boolean;
    onSelect: (key: string, value: string, label: string) => void;
    onAction: (value: string) => void;
}

const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, isAr, onSelect, onAction }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    switch (widget.type) {
        case 'select': {
            const filtered = widget.options.filter(o =>
                o.label.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return (
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface border border-primary/30 text-sm text-text-main hover:border-primary/60 transition-colors"
                    >
                        <span className="text-text-subtle">{widget.placeholder}</span>
                        <ChevronDown size={16} className={`text-text-subtle transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {dropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="absolute top-full mt-1 w-full bg-surface border border-border rounded-xl shadow-xl z-10 max-h-48 overflow-hidden"
                            >
                                {widget.options.length > 5 && (
                                    <div className="p-2 border-b border-border">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder={isAr ? 'بحث...' : 'Search...'}
                                            className="w-full px-2 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs text-text-main focus:outline-none"
                                            dir="auto"
                                            autoFocus
                                        />
                                    </div>
                                )}
                                <div className="overflow-y-auto max-h-36">
                                    {filtered.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                setDropdownOpen(false);
                                                onSelect(widget.key, opt.id, opt.label);
                                            }}
                                            className="w-full text-start px-3 py-2 text-sm text-text-main hover:bg-primary/10 hover:text-primary transition-colors border-b border-border/30 last:border-0"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                    {filtered.length === 0 && (
                                        <p className="text-center py-3 text-xs text-text-subtle">{isAr ? 'لا توجد نتائج' : 'No results'}</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        case 'date': {
            const [selectedDate, setSelectedDate] = useState('');
            return (
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-violet-400 flex-shrink-0" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-surface border border-primary/30 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                        onClick={() => { if (selectedDate) onSelect(widget.key, selectedDate, selectedDate); }}
                        className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors"
                    >
                        {isAr ? 'تأكيد' : 'OK'}
                    </button>
                </div>
            );
        }

        case 'time': {
            const [selectedTime, setSelectedTime] = useState('');
            return (
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-violet-400 flex-shrink-0" />
                    <input
                        type="time"
                        value={selectedTime}
                        onChange={e => setSelectedTime(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-surface border border-primary/30 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                        onClick={() => { if (selectedTime) onSelect(widget.key, selectedTime, selectedTime); }}
                        className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors"
                    >
                        {isAr ? 'تأكيد' : 'OK'}
                    </button>
                </div>
            );
        }

        case 'number':
            return (
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder={widget.placeholder}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value;
                                if (val) onSelect(widget.key, val, val);
                            }
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-surface border border-primary/30 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                        autoFocus
                    />
                    <button
                        onClick={() => {
                            const inp = document.querySelector<HTMLInputElement>(`input[type="number"]`);
                            if (inp?.value) onSelect(widget.key, inp.value, inp.value);
                        }}
                        className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors"
                    >
                        {isAr ? 'تأكيد' : 'OK'}
                    </button>
                </div>
            );

        case 'unit':
            return (
                <div className="flex gap-2">
                    {['TON', 'KG'].map(u => (
                        <button
                            key={u}
                            onClick={() => onSelect(widget.key, u, u)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-primary/30 text-sm font-medium text-text-main hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors"
                        >
                            {u === 'TON' ? (isAr ? '🏋️ طن (TON)' : '🏋️ TON') : (isAr ? '⚖️ كيلو (KG)' : '⚖️ KG')}
                        </button>
                    ))}
                </div>
            );

        case 'quick_actions':
            return (
                <div className="flex flex-wrap gap-2">
                    {widget.actions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => onAction(action.value)}
                            className="px-3 py-2 rounded-xl border border-border text-xs font-medium text-text-main hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            );

        default:
            return null;
    }
};

export default ShadyChat;
