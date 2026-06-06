import React, { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Modal, Card, StatCard, Button, Select, Input } from '@/components';
import { Project, Company, ProjectService, Service, Supplier, SupplierRate, Trip } from '@/types';
import { Briefcase, Package, Edit2, MapPin, ArrowRight, Trash2, BarChart3, Wrench, Printer } from 'lucide-react';
import { formatNumber, handleImageError } from '@/utils/helpers';

interface ProjectDetailsProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    companies: Company[];
    isAr: boolean;
    projectServices: ProjectService[];
    services: Service[];
    suppliers: Supplier[];
    supplierRates: SupplierRate[];
    addSupplierRate: (rate: Omit<SupplierRate, 'id'>) => void;
    deleteSupplierRate: (id: string) => void;
    onEdit: () => void;
    trips: Trip[];
    // Progress Data
    budgetProgress: number;
    qtyProgress: number;
    timeProgress: number;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({
    isOpen,
    onClose,
    project,
    companies,
    isAr,
    projectServices,
    services,
    suppliers,
    supplierRates,
    addSupplierRate,
    deleteSupplierRate,
    onEdit,
    trips,
    budgetProgress,
    qtyProgress,
    timeProgress
}) => {
    const projectId = project?.project_id || '';

    const tripsPerServiceData = useMemo(() => {
        if (!projectId) return [];
        const projectTrips = trips.filter(t => t.project_id === projectId);
        const pServices = projectServices.filter(ps => ps.project_id === projectId);
        return pServices.map(ps => {
            const svc = services.find(s => s.service_id === ps.service_id);
            // Count actual quantity consumed (sum of quantities, not trip count)
            const actualQty = projectTrips
                .filter(t => t.service_id === ps.service_id)
                .reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
            return {
                name: svc?.service_name || ps.service_id,
                actual: actualQty,
                target: Number(ps.quantity) || 0,
                alertAt: Number(ps.warning_threshold) || 0
            };
        }).filter(d => d.target > 0 || d.actual > 0);
    }, [trips, projectServices, services, project, projectId]);

    if (!project) return null;

    const servicesCount = projectServices.filter(ps => ps.project_id === project.project_id).length;

    // Returns dynamic bar color based on alert threshold progress
    const getBarColor = (actual: number, target: number, alertAt: number): string => {
        if (target <= 0) return '#10b981';
        const pct = actual / target;
        if (pct >= 1) return '#ef4444'; // Fully consumed → red
        if (alertAt > 0 && actual >= alertAt) {
            // Between alertAt and target: interpolate amber → red
            const alertPct = alertAt / target;
            const dangerProgress = (pct - alertPct) / (1 - alertPct);
            const r = Math.round(245 + (239 - 245) * dangerProgress);
            const g = Math.round(158 + (68 - 158) * dangerProgress);
            const b = Math.round(11 + (68 - 11) * dangerProgress);
            return `rgb(${r},${g},${b})`;
        }
        if (pct >= 0.7) return '#f59e0b'; // Getting close → amber
        return '#10b981'; // Healthy → green
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const companyName = companies.find(c => c.company_id === project.company_id)?.company_name || '---';
        const projectSupplierRates = supplierRates.filter(r => r.project_id === project.project_id);


        const serviceRowsHtml = tripsPerServiceData.map(d => {
            const pct = d.target > 0 ? Math.min(100, Math.round((d.actual / d.target) * 100)) : 0;
            const barColor = getBarColor(d.actual, d.target, d.alertAt);
            const alertPct = d.alertAt > 0 && d.target > 0 ? Math.round((d.alertAt / d.target) * 100) : 0;
            const status = pct >= 100 ? (isAr ? 'مكتمل' : 'COMPLETE') : d.alertAt > 0 && d.actual >= d.alertAt ? (isAr ? 'تنبيه' : 'WARNING') : (isAr ? 'نشط' : 'ACTIVE');
            const statusBg = pct >= 100 ? '#fee2e2' : d.alertAt > 0 && d.actual >= d.alertAt ? '#fef3c7' : '#d1fae5';
            const statusColor = pct >= 100 ? '#b91c1c' : d.alertAt > 0 && d.actual >= d.alertAt ? '#92400e' : '#065f46';
            return `
                <tr>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;">${d.name}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-weight:700;color:${barColor};">${d.actual}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-weight:700;">${d.target}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center;">
                        ${d.alertAt > 0 ? `<span style="font-family:monospace;font-size:11px;color:#92400e;">${d.alertAt}</span>` : '<span style="color:#94a3b8;">—</span>'}
                    </td>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">
                        <div style="position:relative;height:12px;background:#f1f5f9;border-radius:9999px;overflow:hidden;">
                            ${alertPct > 0 ? `<div style="position:absolute;top:0;left:${alertPct}%;height:100%;width:1px;background:rgba(251,191,36,0.7);z-index:2;"></div>` : ''}
                            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:9999px;"></div>
                        </div>
                        <div style="text-align:right;font-size:9px;font-weight:700;color:${barColor};margin-top:2px;">${pct}%</div>
                    </td>
                    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center;">
                        <span style="padding:2px 8px;border-radius:9999px;font-size:9px;font-weight:700;background:${statusBg};color:${statusColor};">${status}</span>
                    </td>
                </tr>
            `;
        }).join('');

        const supplierRowsHtml = projectSupplierRates.length > 0
            ? projectSupplierRates.map(r => {
                const svc = services.find(s => s.service_id === r.service_id);
                const sup = suppliers.find(s => s.supplier_id === r.supplier_id);
                return `
                    <tr>
                        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;">${sup?.name || '—'}</td>
                        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">${svc?.service_name || r.service_id}</td>
                        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-weight:700;color:#059669;">${r.cost_price?.toLocaleString() || 0} SAR</td>
                    </tr>
                `;
            }).join('')
            : `<tr><td colspan="3" style="padding:20px;text-align:center;color:#94a3b8;font-weight:600;">${isAr ? 'لا يوجد عقود موردين' : 'No supplier contracts'}</td></tr>`;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="${isAr ? 'rtl' : 'ltr'}">
            <head>
                <meta charset="utf-8">
                <title>${isAr ? 'تقرير المشروع' : 'Project Report'} — ${project.project_name}</title>
                <style>
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body { font-family:'Segoe UI',Tahoma,sans-serif; color:#0f172a; padding:36px; background:#fff; font-size:13px; }
                    .header { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #0f766e; padding-bottom:20px; margin-bottom:24px; gap:16px; }
                    .gcm-logo { height:52px; object-fit:contain; }
                    .logo-box { width:60px; height:60px; border-radius:12px; border:2px solid #e2e8f0; overflow:hidden; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
                    .logo-box img { width:100%; height:100%; object-fit:contain; padding:5px; }
                    .header-info h1 { font-size:22px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; }
                    .header-info .sub { font-size:11px; color:#64748b; font-weight:600; margin-top:4px; }
                    .badge { display:inline-block; padding:2px 10px; border-radius:9999px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; background:#0f766e; color:#fff; margin-top:6px; }
                    .meta-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
                    .meta-box { padding:12px 14px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0; }
                    .meta-box label { font-size:8px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px; display:block; margin-bottom:4px; }
                    .meta-box span { font-size:14px; font-weight:700; color:#0f172a; }
                    .progress-section { margin-bottom:20px; display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
                    .progress-item label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; display:flex; justify-content:space-between; margin-bottom:5px; }
                    .bar-bg { height:10px; background:#f1f5f9; border-radius:9999px; overflow:hidden; }
                    .bar-fill { height:100%; border-radius:9999px; }
                    .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:8px; }
                    .section-title .dot { width:6px; height:6px; border-radius:50%; }
                    table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px; }
                    thead th { background:#0f766e; color:#fff; padding:10px 14px; text-align:${isAr ? 'right' : 'left'}; font-size:9px; text-transform:uppercase; letter-spacing:1px; }
                    thead th:not(:first-child) { text-align:center; }
                    tbody tr:nth-child(even) { background:#f8fafc; }
                    .footer { margin-top:32px; padding-top:14px; border-top:2px solid #e2e8f0; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; font-weight:600; }
                    @media print { body { padding:20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${window.location.origin}/logo-dark.png" class="gcm-logo" alt="GCM" />
                    <div class="header-info" style="flex:1;text-align:center;">
                        <div class="sub" style="text-align:center;">${isAr ? 'الملف التعريفي التشغيلي' : 'Operational Project Report'}</div>
                        <h1 style="text-align:center;">${project.project_name}</h1>
                        <div style="text-align:center;"><span class="badge">${companyName}</span></div>
                    </div>
                    ${project.logo_url
                        ? `<div class="logo-box"><img src="${project.logo_url}" /></div>`
                        : `<div style="width:60px;"></div>`
                    }
                </div>

                <div class="meta-grid">
                    <div class="meta-box"><label>${isAr ? 'رقم المشروع' : 'Project ID'}</label><span style="font-family:monospace;font-size:12px;">#${project.project_id}</span></div>
                    <div class="meta-box"><label>${isAr ? 'تاريخ البدء' : 'Start Date'}</label><span>${project.start_date || '—'}</span></div>
                    <div class="meta-box"><label>${isAr ? 'تاريخ الانتهاء' : 'End Date'}</label><span style="color:#e11d48;">${project.end_date || '—'}</span></div>
                    <div class="meta-box"><label>${isAr ? 'عدد الخدمات' : 'Services'}</label><span>${servicesCount}</span></div>
                </div>

                <div class="section-title"><div class="dot" style="background:#f59e0b;"></div>${isAr ? 'مؤشرات الأداء' : 'Performance Indicators'}</div>
                <div class="progress-section">
                    <div class="progress-item">
                        <label style="color:#d97706;">${isAr ? 'استهلاك الميزانية' : 'Budget'}<span>${budgetProgress}%</span></label>
                        <div class="bar-bg"><div class="bar-fill" style="width:${budgetProgress}%;background:#f59e0b;"></div></div>
                    </div>
                    <div class="progress-item">
                        <label style="color:#2563eb;">${isAr ? 'تنفيذ الكميات' : 'Quantity'}<span>${qtyProgress}%</span></label>
                        <div class="bar-bg"><div class="bar-fill" style="width:${qtyProgress}%;background:#3b82f6;"></div></div>
                    </div>
                    <div class="progress-item">
                        <label style="color:#7c3aed;">${isAr ? 'المسار الزمني' : 'Timeline'}<span>${timeProgress}%</span></label>
                        <div class="bar-bg"><div class="bar-fill" style="width:${timeProgress}%;background:#8b5cf6;"></div></div>
                    </div>
                </div>

                <div class="section-title"><div class="dot" style="background:#3b82f6;"></div>${isAr ? 'تفصيل الخدمات والكميات' : 'Service Consumption Breakdown'}</div>
                <table>
                    <thead><tr>
                        <th>${isAr ? 'الخدمة' : 'Service'}</th>
                        <th>${isAr ? 'المستهلك' : 'Consumed'}</th>
                        <th>${isAr ? 'المستهدف' : 'Target'}</th>
                        <th>${isAr ? 'حد التنبيه' : 'Alert At'}</th>
                        <th>${isAr ? 'نسبة التنفيذ' : 'Progress'}</th>
                        <th>${isAr ? 'الحالة' : 'Status'}</th>
                    </tr></thead>
                    <tbody>${serviceRowsHtml || `<tr><td colspan="6" style="padding:20px;text-align:center;color:#94a3b8;">${isAr ? 'لا توجد بيانات' : 'No data'}</td></tr>`}</tbody>
                </table>

                <div class="section-title"><div class="dot" style="background:#10b981;"></div>${isAr ? 'عقود الموردين' : 'Supplier Contracts'}</div>
                <table>
                    <thead><tr>
                        <th>${isAr ? 'المورد' : 'Supplier'}</th>
                        <th>${isAr ? 'الخدمة' : 'Service'}</th>
                        <th>${isAr ? 'التكلفة' : 'Cost Price'}</th>
                    </tr></thead>
                    <tbody>${supplierRowsHtml}</tbody>
                </table>

                <div class="footer">
                    <span style="display:flex;align-items:center;gap:8px;">
                        <img src="${window.location.origin}/logo-dark.png" style="height:18px;opacity:0.5;" alt="GCM" />
                        GCM ERP System
                    </span>
                    <span>${isAr ? 'تاريخ الطباعة' : 'Print Date'}: ${new Date().toLocaleDateString()}</span>
                    <span>${isAr ? 'وثيقة سرية — للاستخدام الداخلي فقط' : 'Confidential — Internal Use Only'}</span>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    return (
        <Modal size="3xl" isOpen={isOpen} onClose={onClose} title={isAr ? 'نظرة عامة على المشروع' : 'Project Overview'}>
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left Identity Card — Compact on mobile, full on desktop */}
                    <Card className="lg:col-span-1 p-4 bg-surface-subtle border-none shadow-inner flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-surface shadow-sm flex items-center justify-center border border-border overflow-hidden">
                            {project.logo_url ? <Image src={project.logo_url} onError={handleImageError} className="w-full h-full object-cover" alt={project.project_name} width={80} height={80} unoptimized /> : <Briefcase size={32} className="text-text-subtle" />}
                        </div>
                        <div className="text-center space-y-1 w-full">
                            <h2 className="text-base font-bold text-text-main tracking-tight uppercase line-clamp-2">{project.project_name}</h2>
                            <span className="inline-block px-2 py-0.5 bg-primary text-white text-[8px] font-bold rounded-full uppercase tracking-widest">
                                {companies.find(c => c.company_id === project.company_id)?.company_name}
                            </span>
                        </div>
                        <div className="w-full space-y-2.5 pt-3 border-t border-border">
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-text-subtle uppercase">ID</span><span className="text-[10px] font-bold text-text-main font-mono">#{project.project_id.slice(-8)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-text-subtle uppercase">{isAr ? 'البداية' : 'Start'}</span><span className="text-[10px] font-bold text-text-main">{project.start_date}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-text-subtle uppercase">{isAr ? 'النهاية' : 'End'}</span><span className="text-[10px] font-bold text-rose-500">{project.end_date}</span></div>
                        </div>
                    </Card>

                    {/* Right Panel */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                title={isAr ? 'عدد الخدمات' : 'Services'}
                                value={servicesCount}
                                icon={Wrench}
                                variant="amber"
                            />
                            <StatCard
                                title={isAr ? 'الكميات المستهدفة' : 'Target Qty'}
                                value={formatNumber(project.total_quantities)}
                                icon={Package}
                                variant="blue"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-surface-subtle border border-border-subtle rounded-2xl">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[9px] font-bold uppercase text-amber-600">
                                    <span>{isAr ? 'الميزانية' : 'BUDGET'}</span>
                                    <span>{budgetProgress}%</span>
                                </div>
                                <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${budgetProgress}%` }} className="h-full bg-amber-500 rounded-full" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[9px] font-bold uppercase text-blue-600">
                                    <span>{isAr ? 'الكميات' : 'QUANTITY'}</span>
                                    <span>{qtyProgress}%</span>
                                </div>
                                <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${qtyProgress}%` }} className="h-full bg-blue-500 rounded-full" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[9px] font-bold uppercase text-purple-600">
                                    <span>{isAr ? 'الوقت' : 'TIME'}</span>
                                    <span>{timeProgress}%</span>
                                </div>
                                <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${timeProgress}%` }} className="h-full bg-purple-500 rounded-full" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="primary" onClick={onEdit} className="flex-1 py-3" icon={Edit2}>
                                {isAr ? 'تعديل المشروع' : 'Edit Project'}
                            </Button>
                            {project.location && (
                                <Button variant="secondary" onClick={() => window.open(project.location, '_blank')} className="py-3 px-4" icon={MapPin} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Trips per Service Chart */}
                {tripsPerServiceData.length > 0 && (
                    <Card className="p-4 space-y-4">
                        <h4 className="text-xs font-bold text-text-main uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 size={14} className="text-blue-600" /> {isAr ? 'الرحلات المسجلة لكل خدمة' : 'Trips per Service'}
                        </h4>
                        <div className="space-y-4">
                            {tripsPerServiceData.map((d, idx) => {
                                const pct = d.target > 0 ? Math.min(100, Math.round((d.actual / d.target) * 100)) : 0;
                                const alertPct = d.alertAt > 0 && d.target > 0 ? Math.round((d.alertAt / d.target) * 100) : 0;
                                const barColor = getBarColor(d.actual, d.target, d.alertAt);
                                const isWarning = d.alertAt > 0 && d.actual >= d.alertAt && d.actual < d.target;
                                const isDone = pct >= 100;
                                return (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: barColor }} />
                                                <span className="text-xs font-bold text-text-main truncate">{d.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-sm font-bold font-mono" style={{ color: barColor }}>{d.actual}</span>
                                                <span className="text-[10px] font-bold text-text-subtle">/ {d.target}</span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                    isDone ? 'bg-rose-100 text-rose-700' :
                                                    isWarning ? 'bg-amber-100 text-amber-700' :
                                                    'bg-surface-subtle text-text-subtle'
                                                }`}>
                                                    {pct}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="relative h-2.5 bg-surface-subtle rounded-full overflow-hidden">
                                            {/* Alert threshold marker */}
                                            {alertPct > 0 && alertPct < 100 && (
                                                <div
                                                    className="absolute top-0 h-full w-0.5 bg-amber-400/50 z-10"
                                                    style={{ left: `${alertPct}%` }}
                                                />
                                            )}
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: idx * 0.1 }}
                                                className="absolute top-0 start-0 h-full rounded-full transition-colors duration-500"
                                                style={{ backgroundColor: barColor }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}


                {/* Supplier Rates Management */}
                <Card className="p-4 space-y-4">
                    <h4 className="text-xs font-bold text-text-main uppercase tracking-widest flex items-center gap-2">
                        <Wrench size={14} className="text-emerald-600" /> {isAr ? 'عقود الموردين' : 'Supplier Contracts'}
                    </h4>

                    <div className="space-y-4">
                        {supplierRates.filter(r => r.project_id === project.project_id).length === 0 ? (
                            <div className="p-8 text-center bg-surface-subtle rounded-2xl border border-dashed border-border">
                                <p className="text-text-subtle text-xs font-bold uppercase tracking-widest">{isAr ? 'لا يوجد عقود موردين مسجلة' : 'No Supplier Contracts Active'}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {supplierRates.filter(r => r.project_id === project.project_id).map(rate => {
                                    return (
                                        <div key={rate.id} className="p-4 bg-surface rounded-xl border border-border shadow-sm flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-1">
                                                <Select
                                                    value={rate.supplier_id}
                                                    onChange={(val) => { if (val) addSupplierRate({ ...rate, supplier_id: val }); }}
                                                    options={suppliers.map(s => ({ label: s.name, value: s.supplier_id }))}
                                                    className="w-1/3 min-w-[150px]"
                                                    placeholder={isAr ? 'المورد' : 'Supplier'}
                                                />
                                                <div className="text-border"><ArrowRight size={14} /></div>
                                                <Select
                                                    value={rate.service_id}
                                                    onChange={(val) => { if (val) addSupplierRate({ ...rate, service_id: val }); }}
                                                    options={projectServices.filter(ps => ps.project_id === project.project_id).map(ps => {
                                                        const s = services.find(sx => sx.service_id === ps.service_id);
                                                        return { label: s?.service_name || ps.service_id, value: ps.service_id };
                                                    })}
                                                    className="w-1/3 min-w-[150px]"
                                                    placeholder={isAr ? 'الخدمة' : 'Service'}
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={rate.cost_price ? String(rate.cost_price) : ''}
                                                    onChange={(val) => addSupplierRate({ ...rate, cost_price: Number(val) })}
                                                    className="w-24 text-right font-bold text-emerald-600"
                                                    placeholder="Cost"
                                                />
                                                <span className="text-[10px] font-bold text-text-subtle">SAR</span>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                icon={Trash2}
                                                className="text-slate-400 hover:text-rose-500"
                                                onClick={() => deleteSupplierRate(rate.id)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Sticky Action Bar */}
                <div className="flex gap-3 sticky bottom-0 bg-surface pt-3 pb-2 border-t border-border z-10">
                    <Button variant="secondary" onClick={handlePrint} icon={Printer} className="flex-1 py-3 uppercase tracking-widest font-bold text-xs">
                        {isAr ? 'طباعة / PDF' : 'Print / PDF'}
                    </Button>
                    <Button variant="primary" onClick={onEdit} icon={Edit2} className="flex-1 py-3 uppercase tracking-widest font-bold text-xs shadow-sm">
                        {isAr ? 'تعديل البيانات' : 'Edit Project'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ProjectDetails;
