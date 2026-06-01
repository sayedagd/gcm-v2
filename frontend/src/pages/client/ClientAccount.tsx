import React, { useMemo, useState } from 'react';
import { useStore } from '@/context';
import { Card } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';
import { useClientScope } from '@/hooks/useClientScope';
import { Role } from '@/types';
import { resolveImagePath } from '@/utils/helpers';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Briefcase, CalendarDays, Clock, FileText, MapPin,
    Phone, Mail, Hash, Shield, ChevronDown, ChevronRight,
    Package, DollarSign, BarChart3, AlertTriangle, CheckCircle2,
    Timer, TrendingUp, Layers, Globe, Receipt, Box, Truck,
    Stamp, Trash2, Upload, Eraser, PenTool, ImagePlus
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────
const fmt = (d: string | undefined) => {
    if (!d) return '---';
    try {
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
};

const daysRemaining = (end: string | undefined): number => {
    if (!end) return 0;
    const diff = new Date(end).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const pct = (used: number, total: number) => total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

const currency = (v: number | null | undefined) => (v ?? 0).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const safeNum = (v: any): number => parseFloat(String(v)) || 0;

// ─── Sub-components ──────────────────────────────────────
const InfoRow: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; accent?: string }> = ({ icon: Icon, label, value, accent }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent || 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'}`}>
            <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{label}</p>
            <p className="text-sm font-bold text-text-main mt-0.5 break-words">{value || '---'}</p>
        </div>
    </div>
);

const ProgressRing: React.FC<{ value: number; size?: number; label: string; color: string }> = ({ value, size = 80, label, color }) => {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (value / 100) * circ;
    return (
        <div className="flex flex-col items-center gap-2">
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-border" />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    strokeDasharray={circ}
                />
            </svg>
            <div className="text-center -mt-14">
                <p className="text-xl font-black text-text-main">{value}%</p>
            </div>
            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mt-2">{label}</p>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────
const ClientAccount: React.FC = () => {
    const { currentUser, companies, projects, services, projectServices, trips, upsertUser } = useStore();
    const { t, isAr } = useTranslation();
    const { scopedProjects, scopedTrips, scopedServices } = useClientScope();
    const { companyMap, serviceMap } = useLookupMaps();

    const isCompanyUser = currentUser.role === Role.COMPANY_USER;
    const stampInputRef = React.useRef<HTMLInputElement>(null);

    const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            await upsertUser({ ...currentUser, stamp: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const clearStamp = async () => {
        await upsertUser({ ...currentUser, stamp: undefined });
        if (stampInputRef.current) stampInputRef.current.value = '';
    };

    const clearSignature = async () => {
        await upsertUser({ ...currentUser, signature: undefined });
    };

    // Company data
    const company = useMemo(() => {
        if (!currentUser.company_id) return null;
        return companyMap[currentUser.company_id!] || null;
    }, [companies, currentUser.company_id]);

    // Expanded projects tracker
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const toggleProject = (id: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Per-project service breakdown
    const projectBreakdowns = useMemo(() => {
        return scopedProjects.map(project => {
            const pTrips = scopedTrips.filter(t => t.project_id === project.project_id);
            const pServices = projectServices.filter(ps => ps.project_id === project.project_id);
            const totalDays = project.start_date && project.end_date ? Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
            const remaining = daysRemaining(project.end_date);
            const elapsed = Math.max(0, totalDays - remaining);
            const timeProgress = totalDays > 0 ? pct(elapsed, totalDays) : 0;

            // Aggregate service usage
            const serviceDetails = pServices.map(ps => {
                const svc = serviceMap[ps.service_id];
                const usedTrips = pTrips.filter(t => t.service_id === ps.service_id);
                const usedQty = usedTrips.reduce((sum, t) => sum + safeNum(t.quantity), 0);
                const contractQty = safeNum(ps.quantity);
                const qtyProgress = contractQty > 0 ? pct(usedQty, contractQty) : 0;
                return {
                    ...ps,
                    serviceName: svc?.service_name || ps.service_id,
                    category: svc?.category || 'GENERAL',
                    quantity: contractQty,
                    unit_price: safeNum(ps.unit_price),
                    total_cost: safeNum(ps.total_cost),
                    usedQty,
                    tripCount: usedTrips.length,
                    qtyProgress,
                };
            });

            const totalBudget = pServices.reduce((sum, ps) => sum + safeNum(ps.total_cost), 0);
            const totalUsedQty = serviceDetails.reduce((sum, s) => sum + s.usedQty, 0);
            const totalContractQty = pServices.reduce((sum, ps) => sum + safeNum(ps.quantity), 0);

            return {
                project,
                pTrips,
                serviceDetails,
                totalDays,
                remaining,
                timeProgress,
                totalBudget,
                totalUsedQty,
                totalContractQty,
                qtyProgress: totalContractQty > 0 ? pct(totalUsedQty, totalContractQty) : 0,
            };
        });
    }, [scopedProjects, scopedTrips, projectServices, services]);

    const totalTrips = scopedTrips.length;
    const totalBudgetAll = projectBreakdowns.reduce((s, b) => s + b.totalBudget, 0);

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Page Title */}
            <div>
                <h1 className="text-3xl font-black text-text-main">
                    {isAr ? 'إدارة الحساب والعقود' : 'Account & Contracts'}
                </h1>
                <p className="text-text-subtle font-bold mt-1">
                    {isAr
                        ? 'ملخص شامل لبيانات شركتك ومشاريعك والخدمات المسجلة في النظام.'
                        : 'Comprehensive overview of your company profile, projects, and registered services.'}
                </p>
            </div>

            {/* ─── Company Profile Card ─── */}
            {company && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <Card className="!rounded-2xl overflow-hidden border border-border">
                        {/* Company Header */}
                        <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-6 pb-20">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                            <div className="relative flex items-center gap-4">
                                {company.logo_url ? (
                                    <img src={resolveImagePath(company.logo_url)} alt="" className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm object-contain p-2 border border-white/20 shadow-lg" />
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
                                        <Building2 size={28} className="text-white/80" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-2xl font-black text-white">{company.company_name}</h2>
                                    {company.details && <p className="text-white/70 text-sm font-bold mt-0.5">{company.details}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Bar */}
                        <div className="relative -mt-12 mx-6 grid grid-cols-2 md:grid-cols-4 gap-3 z-10">
                            {[
                                { icon: Briefcase, label: isAr ? 'المشاريع' : 'Projects', value: scopedProjects.length, color: 'from-blue-500 to-blue-600' },
                                { icon: Truck, label: isAr ? 'الرحلات' : 'Trips', value: totalTrips, color: 'from-emerald-500 to-emerald-600' },
                                { icon: Layers, label: isAr ? 'الخدمات' : 'Services', value: scopedServices.length, color: 'from-violet-500 to-violet-600' },
                                { icon: DollarSign, label: isAr ? 'الميزانية' : 'Budget', value: `${(totalBudgetAll / 1000).toFixed(0)}K`, color: 'from-amber-500 to-amber-600' },
                            ].map((stat, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i, duration: 0.4 }}
                                    className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 shadow-lg border border-white/10`}>
                                    <div className="flex items-center justify-between">
                                        <stat.icon size={18} className="text-white/70" />
                                        <p className="text-2xl font-black text-white">{stat.value}</p>
                                    </div>
                                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Company Details Grid */}
                        <div className="p-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <InfoRow icon={Hash} label={isAr ? 'السجل التجاري' : 'Commercial Registration'} value={company.commercial_reg} />
                            <InfoRow icon={Receipt} label={isAr ? 'رقم العقد' : 'Contract No.'} value={company.contract_no} />
                            <InfoRow icon={Shield} label={isAr ? 'الرقم الضريبي (VAT)' : 'VAT Number'} value={company.vat_no} />
                            <InfoRow icon={CalendarDays} label={isAr ? 'عميل منذ' : 'Client Since'} value={fmt(company.client_since)} />
                            <InfoRow icon={Phone} label={isAr ? 'جهة الاتصال' : 'Contact Person'} value={`${company.contact_name || '---'} ${company.contact_phone ? `• ${company.contact_phone}` : ''}`} />
                            <InfoRow icon={Mail} label={isAr ? 'البريد الإلكتروني' : 'Contact Email'} value={company.contact_email} />
                            <InfoRow icon={MapPin} label={isAr ? 'عنوان المراسلات' : 'Billing Address'} value={company.billing_address} />
                            {company.main_location_url && (
                                <InfoRow icon={Globe} label={isAr ? 'الموقع الرئيسي' : 'Main Location'} value={
                                    <a href={company.main_location_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-xs">
                                        {isAr ? 'فتح على الخريطة ↗' : 'Open in Maps ↗'}
                                    </a>
                                } />
                            )}
                        </div>

                        {/* Uploaded Documents */}
                        {(company.cr_file || company.vat_file || company.national_address_file) && (
                            <div className="px-6 pb-6">
                                <p className="text-xs font-bold text-text-subtle uppercase tracking-widest mb-3">{isAr ? 'المستندات المرفقة' : 'Attached Documents'}</p>
                                <div className="flex flex-wrap gap-2">
                                    {company.cr_file && (
                                        <a href={resolveImagePath(company.cr_file)} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-200 dark:border-blue-800">
                                            <FileText size={14} /> {isAr ? 'السجل التجاري' : 'CR Document'}
                                        </a>
                                    )}
                                    {company.vat_file && (
                                        <a href={resolveImagePath(company.vat_file)} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200 dark:border-emerald-800">
                                            <FileText size={14} /> {isAr ? 'شهادة الضريبة' : 'VAT Certificate'}
                                        </a>
                                    )}
                                    {company.national_address_file && (
                                        <a href={resolveImagePath(company.national_address_file)} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-xl text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors border border-violet-200 dark:border-violet-800">
                                            <FileText size={14} /> {isAr ? 'العنوان الوطني' : 'National Address'}
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                </motion.div>
            )}

            {/* ─── Projects & Service Contracts ─── */}
            <div>
                <h2 className="text-xl font-black text-text-main mb-4 flex items-center gap-2">
                    <Briefcase size={20} className="text-primary-500" />
                    {isAr ? 'المشاريع والعقود' : 'Projects & Service Contracts'}
                    <span className="text-sm font-bold text-text-subtle ml-2">({scopedProjects.length})</span>
                </h2>

                <div className="space-y-4">
                    {projectBreakdowns.map(({ project, pTrips, serviceDetails, totalDays, remaining, timeProgress, totalBudget, totalUsedQty, totalContractQty, qtyProgress }, idx) => {
                        const isExpanded = expandedProjects.has(project.project_id);
                        const isExpired = remaining <= 0 && !!project.end_date;
                        const isWarning = remaining > 0 && remaining <= 30;

                        return (
                            <motion.div key={project.project_id}
                                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08, duration: 0.35 }}>
                                <Card className={`!rounded-2xl overflow-hidden border ${isExpired ? 'border-red-300 dark:border-red-800' : isWarning ? 'border-amber-300 dark:border-amber-800' : 'border-border'}`}>
                                    {/* Project Header — always visible */}
                                    <button onClick={() => toggleProject(project.project_id)}
                                        className="w-full flex items-center gap-4 p-5 text-left hover:bg-surface-subtle/50 transition-colors">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isExpired ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : isWarning ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'}`}>
                                            <Briefcase size={22} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-lg font-black text-text-main">{project.project_name}</h3>
                                                {project.status && (
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${project.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : project.status === 'COMPLETED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                        {project.status}
                                                    </span>
                                                )}
                                                {isExpired && (
                                                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center gap-1">
                                                        <AlertTriangle size={10} /> {isAr ? 'منتهي' : 'EXPIRED'}
                                                    </span>
                                                )}
                                                {isWarning && (
                                                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center gap-1">
                                                        <Timer size={10} /> {remaining} {isAr ? 'يوم' : 'days'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-text-subtle font-bold">
                                                <span>{fmt(project.start_date)} → {fmt(project.end_date)}</span>
                                                <span>•</span>
                                                <span>{pTrips.length} {isAr ? 'رحلة' : 'trips'}</span>
                                                <span>•</span>
                                                <span>{serviceDetails.length} {isAr ? 'خدمة' : 'services'}</span>
                                            </div>
                                        </div>
                                        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                            <ChevronRight size={20} className="text-text-subtle" />
                                        </motion.div>
                                    </button>

                                    {/* Compact Progress Bar (always visible) */}
                                    <div className="px-5 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <div className="flex justify-between text-[10px] font-bold text-text-subtle mb-1">
                                                    <span>{isAr ? 'الوقت المنقضي' : 'Time Elapsed'}</span>
                                                    <span>{timeProgress}%</span>
                                                </div>
                                                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                                    <motion.div className={`h-full rounded-full ${isExpired ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-primary-500'}`}
                                                        initial={{ width: 0 }} animate={{ width: `${timeProgress}%` }}
                                                        transition={{ duration: 1, ease: 'easeOut' }} />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between text-[10px] font-bold text-text-subtle mb-1">
                                                    <span>{isAr ? 'الكمية المستهلكة' : 'Qty Used'}</span>
                                                    <span>{totalUsedQty.toLocaleString()} / {totalContractQty.toLocaleString()}</span>
                                                </div>
                                                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                                    <motion.div className={`h-full rounded-full ${qtyProgress > 90 ? 'bg-red-500' : qtyProgress > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                        initial={{ width: 0 }} animate={{ width: `${qtyProgress}%` }}
                                                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="border-t border-border">
                                                    {/* Project Info Grid */}
                                                    <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="space-y-1 p-3 bg-surface-subtle rounded-xl border border-border">
                                                            <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'رقم أمر الشراء' : 'PO Number'}</p>
                                                            <p className="text-sm font-black text-text-main">{project.po_number || '---'}</p>
                                                        </div>
                                                        <div className="space-y-1 p-3 bg-surface-subtle rounded-xl border border-border">
                                                            <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'مدة العقد' : 'Contract Duration'}</p>
                                                            <p className="text-sm font-black text-text-main">{totalDays} {isAr ? 'يوم' : 'days'}</p>
                                                            <p className="text-[10px] font-bold text-text-subtle">
                                                                {remaining > 0
                                                                    ? `${remaining} ${isAr ? 'يوم متبقي' : 'days remaining'}`
                                                                    : (isAr ? 'منتهي' : 'Expired')}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-1 p-3 bg-surface-subtle rounded-xl border border-border">
                                                            <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'إجمالي الميزانية' : 'Total Budget'}</p>
                                                            <p className="text-sm font-black text-text-main">{currency(totalBudget)} <span className="text-[10px] text-text-subtle">SAR</span></p>
                                                        </div>
                                                    </div>

                                                    {/* Location */}
                                                    {(project.location || project.map_url) && (
                                                        <div className="px-5 pb-3">
                                                            <div className="flex items-center gap-2 p-3 bg-surface-subtle rounded-xl border border-border">
                                                                <MapPin size={14} className="text-primary-500 shrink-0" />
                                                                <span className="text-xs font-bold text-text-main flex-1">{project.location || '---'}</span>
                                                                {project.map_url && (
                                                                    <a href={project.map_url} target="_blank" rel="noreferrer" className="text-[10px] font-black text-primary-600 hover:underline shrink-0">
                                                                        {isAr ? 'الخريطة ↗' : 'Map ↗'}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Assets */}
                                                    {project.assets && (project.assets.large_containers > 0 || project.assets.small_containers > 0 || project.assets.compactors > 0) && (
                                                        <div className="px-5 pb-4">
                                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-2">{isAr ? 'الأصول المخصصة' : 'Assigned Assets'}</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {project.assets.large_containers > 0 && (
                                                                    <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800">
                                                                        <Box size={12} className="inline mr-1" /> {project.assets.large_containers} {isAr ? 'حاوية كبيرة' : 'Large Containers'}
                                                                    </span>
                                                                )}
                                                                {project.assets.small_containers > 0 && (
                                                                    <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                                                                        <Package size={12} className="inline mr-1" /> {project.assets.small_containers} {isAr ? 'حاوية صغيرة' : 'Small Containers'}
                                                                    </span>
                                                                )}
                                                                {project.assets.compactors > 0 && (
                                                                    <span className="px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-xl text-xs font-bold border border-violet-200 dark:border-violet-800">
                                                                        <Truck size={12} className="inline mr-1" /> {project.assets.compactors} {isAr ? 'كباس' : 'Compactors'}
                                                                    </span>
                                                                )}
                                                                {project.assets.other_assets && (
                                                                    <span className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
                                                                        {project.assets.other_assets}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* PO Document */}
                                                    {project.po_file && (
                                                        <div className="px-5 pb-4">
                                                            <a href={resolveImagePath(project.po_file)} target="_blank" rel="noreferrer"
                                                                className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors border border-amber-200 dark:border-amber-800">
                                                                <FileText size={14} /> {isAr ? 'أمر الشراء (PO)' : 'Purchase Order Document'}
                                                            </a>
                                                        </div>
                                                    )}

                                                    {/* Service Contracts Table */}
                                                    {serviceDetails.length > 0 && (
                                                        <div className="px-5 pb-5">
                                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-3">{isAr ? 'تفاصيل الخدمات المتعاقد عليها' : 'Contracted Service Breakdown'}</p>
                                                            <div className="border border-border rounded-xl overflow-hidden">
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="bg-surface-subtle">
                                                                            <th className="text-left p-3 font-bold text-text-subtle">{isAr ? 'الخدمة' : 'Service'}</th>
                                                                            <th className="text-center p-3 font-bold text-text-subtle">{isAr ? 'الكمية المتعاقد عليها' : 'Contract Qty'}</th>
                                                                            <th className="text-center p-3 font-bold text-text-subtle">{isAr ? 'المُستهلك' : 'Used'}</th>
                                                                            <th className="text-center p-3 font-bold text-text-subtle">{isAr ? 'الرحلات' : 'Trips'}</th>
                                                                            <th className="text-center p-3 font-bold text-text-subtle hidden md:table-cell">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                                                                            <th className="text-center p-3 font-bold text-text-subtle hidden md:table-cell">{isAr ? 'الإجمالي' : 'Total'}</th>
                                                                            <th className="text-center p-3 font-bold text-text-subtle">{isAr ? 'التقدم' : 'Progress'}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {serviceDetails.map((sd, si) => (
                                                                            <tr key={si} className="border-t border-border/50 hover:bg-surface-subtle/50 transition-colors">
                                                                                <td className="p-3">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${sd.category === 'HAZARDOUS' ? 'bg-red-500' : sd.category === 'WATER' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                                                                        <span className="font-bold text-text-main">{sd.serviceName}</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="p-3 text-center font-bold text-text-main">{sd.quantity.toLocaleString()}</td>
                                                                                <td className="p-3 text-center font-black text-primary-600">{sd.usedQty.toLocaleString()}</td>
                                                                                <td className="p-3 text-center font-bold text-text-subtle">{sd.tripCount}</td>
                                                                                <td className="p-3 text-center font-bold text-text-subtle hidden md:table-cell">{currency(sd.unit_price)}</td>
                                                                                <td className="p-3 text-center font-bold text-text-main hidden md:table-cell">{currency(sd.total_cost)}</td>
                                                                                <td className="p-3">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                                                                                            <div className={`h-full rounded-full transition-all ${sd.qtyProgress > 90 ? 'bg-red-500' : sd.qtyProgress > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                                                style={{ width: `${sd.qtyProgress}%` }} />
                                                                                        </div>
                                                                                        <span className="text-[10px] font-black text-text-subtle w-8 text-right">{sd.qtyProgress}%</span>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {serviceDetails.length === 0 && (
                                                        <div className="px-5 pb-5 text-center">
                                                            <p className="text-sm text-text-subtle font-bold py-6">
                                                                {isAr ? 'لم يتم تسجيل خدمات لهذا المشروع بعد.' : 'No services registered for this project yet.'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        );
                    })}

                    {projectBreakdowns.length === 0 && (
                        <Card className="p-12 !rounded-2xl text-center">
                            <Briefcase size={48} className="mx-auto text-text-subtle/30 mb-4" />
                            <p className="text-lg font-bold text-text-subtle">{isAr ? 'لا توجد مشاريع مسجلة في حسابك.' : 'No projects registered on your account.'}</p>
                        </Card>
                    )}
                </div>
            </div>

            {/* ─── Digital Identity (Signature & Stamp) ─── */}
            <div>
                <h2 className="text-xl font-black text-text-main mb-4 flex items-center gap-2">
                    <Stamp size={20} className="text-emerald-500" />
                    {isAr ? 'الهوية الرقمية للاعتمادات' : 'Digital Identity & Approvals'}
                </h2>
                <Card className="p-6 !rounded-2xl border border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Stamp Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                                        <Stamp size={16} className="text-emerald-500" />
                                        {isAr ? 'ختم الشركة' : 'Company Stamp'}
                                    </h3>
                                    <p className="text-[10px] text-text-subtle font-bold mt-1">
                                        {isAr ? 'يرجى رفع صورة لختم الشركة الرسمي بخلفية شفافة' : 'Upload official company stamp with transparent background'}
                                    </p>
                                </div>
                                {currentUser.stamp && (
                                    <button onClick={clearStamp} className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded">
                                        <Trash2 size={14} /> {isAr ? 'حذف الختم' : 'Delete'}
                                    </button>
                                )}
                            </div>
                            <input type="file" accept="image/*" className="hidden" ref={stampInputRef} onChange={handleStampUpload} />
                            
                            {currentUser.stamp ? (
                                <div className="border border-border rounded-xl p-6 flex items-center justify-center bg-surface cursor-pointer hover:bg-surface-subtle transition-colors" onClick={() => stampInputRef.current?.click()}>
                                    <img src={currentUser.stamp} alt="Stamp" className="h-24 object-contain" />
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center bg-surface-subtle cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors" onClick={() => stampInputRef.current?.click()}>
                                    <ImagePlus size={28} className="text-emerald-500 mb-3 opacity-50" />
                                    <span className="text-sm font-bold text-text-main text-center">
                                        {isAr ? 'انقر لرفع صورة الختم' : 'Click to upload stamp image'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Signature Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                                        <PenTool size={16} className="text-primary-500" />
                                        {isAr ? 'التوقيع المعتمد' : 'Authorized Signature'}
                                    </h3>
                                    <p className="text-[10px] text-text-subtle font-bold mt-1">
                                        {isAr ? 'يتم حفظ توقيعك تلقائياً عند اعتماد أول رحلة لتسهيل الإجراءات.' : 'Your signature is automatically saved upon first trip approval.'}
                                    </p>
                                </div>
                                {currentUser.signature && (
                                    <button onClick={clearSignature} className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded">
                                        <Trash2 size={14} /> {isAr ? 'حذف التوقيع' : 'Delete'}
                                    </button>
                                )}
                            </div>
                            
                            {currentUser.signature ? (
                                <div className="border border-border rounded-xl p-6 flex items-center justify-center bg-surface">
                                    <img src={currentUser.signature} alt="Signature" className="h-24 object-contain mix-blend-multiply dark:mix-blend-normal" />
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center bg-surface-subtle">
                                    <PenTool size={28} className="text-text-subtle mb-3 opacity-30" />
                                    <span className="text-sm font-bold text-text-subtle text-center">
                                        {isAr ? 'لم يتم حفظ توقيع حتى الآن' : 'No signature saved yet'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ClientAccount;
