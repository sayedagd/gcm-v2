import React from 'react';
import { Modal, Card, StatCard, Button } from '@/components';
import { Company, Project, Trip, ProjectService, Service } from '@/types';
import {
    Building2, Zap, Phone, Navigation, Edit2, ArrowRight,
    Download, Printer, FileText, FileCheck, FileX, Briefcase,
    MapPin, Calendar, Package
} from 'lucide-react';
import { formatDate, formatNumber } from '@/utils/helpers';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface CompanyDetailsProps {
    isOpen: boolean;
    onClose: () => void;
    company: Company | null;
    projects: Project[];
    trips: Trip[];
    projectServices: ProjectService[];
    services: Service[];
    isAr: boolean;
    onEdit: () => void;
}

const CompanyDetails: React.FC<CompanyDetailsProps> = ({
    isOpen, onClose, company, projects, trips, projectServices, services, isAr, onEdit
}) => {
    const router = useRouter();

    if (!company) return null;

    const companyProjects = projects.filter(p => p.company_id === company.company_id);
    const companyTrips = trips.filter(t => companyProjects.some(p => p.project_id === t.project_id));
    const totalQuantity = companyTrips.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);

    const documents = [
        { key: 'cr_file', label: isAr ? 'السجل التجاري' : 'Commercial Registration', file: company.cr_file, icon: FileText },
        { key: 'vat_file', label: isAr ? 'شهادة الضريبة' : 'VAT Certificate', file: company.vat_file, icon: FileCheck },
        { key: 'national_address_file', label: isAr ? 'العنوان الوطني' : 'National Address', file: company.national_address_file, icon: MapPin },
        { key: 'logo_url', label: isAr ? 'شعار الشركة' : 'Company Logo', file: company.logo_url, icon: Building2 },
    ];

    const availableDocs = documents.filter(d => d.file);

    const handleDownloadDoc = (dataUrl: string, filename: string) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        availableDocs.forEach((doc, idx) => {
            setTimeout(() => {
                handleDownloadDoc(doc.file!, `${company.company_name}_${doc.key}.${doc.file!.startsWith('data:application/pdf') ? 'pdf' : 'png'}`);
            }, idx * 300);
        });
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const projectsHtml = companyProjects.map(p => {
            const pTrips = trips.filter(t => t.project_id === p.project_id);
            const pQty = pTrips.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
            const pServices = projectServices.filter(ps => ps.project_id === p.project_id);
            return `
                <tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:600;">${p.project_name}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${pTrips.length}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${formatNumber(pQty)} ${isAr ? 'طن' : 'TON'}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${pServices.length}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-size:11px;">${p.start_date || '---'} → ${p.end_date || '---'}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="${isAr ? 'rtl' : 'ltr'}">
            <head>
                <meta charset="utf-8">
                <title>${isAr ? 'الملف التعريفي' : 'Company Profile'} - ${company.company_name}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a1a2e; padding: 40px; background: #fff; }
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f766e; padding-bottom: 24px; margin-bottom: 32px; }
                    .header-info h1 { font-size: 28px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
                    .header-info p { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 600; }
                    .logo-box { width: 80px; height: 80px; border-radius: 16px; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                    .logo-box img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
                    .section { margin-bottom: 28px; }
                    .section-title { font-size: 13px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                    .info-item { padding: 12px 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
                    .info-item label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 4px; }
                    .info-item span { font-size: 14px; font-weight: 700; color: #0f172a; }
                    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
                    .stat-box { text-align: center; padding: 16px; background: #f0fdfa; border-radius: 12px; border: 1px solid #99f6e4; }
                    .stat-box .value { font-size: 22px; font-weight: 800; color: #0f766e; }
                    .stat-box .label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    thead th { background: #0f766e; color: white; padding: 10px 12px; text-align: ${isAr ? 'right' : 'left'}; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
                    thead th:not(:first-child) { text-align: center; }
                    .footer { margin-top: 40px; padding-top: 16px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-weight: 600; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-info">
                        <h1>${company.company_name}</h1>
                        <p>${isAr ? 'الملف التعريفي للشريك التجاري' : 'Commercial Partner Profile'} | ${isAr ? 'تاريخ الطباعة' : 'Print Date'}: ${formatDate(new Date().toISOString(), 'yyyy-MM-dd')}</p>
                    </div>
                    ${company.logo_url ? `<div class="logo-box"><img src="${company.logo_url}" /></div>` : ''}
                </div>

                <div class="stats-row">
                    <div class="stat-box"><div class="value">${companyProjects.length}</div><div class="label">${isAr ? 'المشاريع' : 'Projects'}</div></div>
                    <div class="stat-box"><div class="value">${companyTrips.length}</div><div class="label">${isAr ? 'الرحلات' : 'Trips'}</div></div>
                    <div class="stat-box"><div class="value">${formatNumber(totalQuantity)}</div><div class="label">${isAr ? 'الكميات (طن)' : 'Quantity (TON)'}</div></div>
                </div>

                <div class="section">
                    <div class="section-title">${isAr ? 'البيانات التجارية' : 'Commercial Data'}</div>
                    <div class="info-grid">
                        <div class="info-item"><label>${isAr ? 'السجل التجاري' : 'Commercial Reg.'}</label><span>${company.commercial_reg}</span></div>
                        <div class="info-item"><label>${isAr ? 'الرقم الضريبي' : 'VAT Number'}</label><span>${company.vat_no || '---'}</span></div>
                        <div class="info-item"><label>${isAr ? 'رقم العقد' : 'Contract No.'}</label><span>${company.contract_no || '---'}</span></div>
                        <div class="info-item"><label>${isAr ? 'عميل منذ' : 'Client Since'}</label><span>${company.client_since}</span></div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">${isAr ? 'معلومات التواصل' : 'Contact Information'}</div>
                    <div class="info-grid">
                        <div class="info-item"><label>${isAr ? 'المسؤول' : 'Contact Person'}</label><span>${company.contact_name || '---'}</span></div>
                        <div class="info-item"><label>${isAr ? 'الهاتف' : 'Phone'}</label><span>${company.contact_phone || '---'}</span></div>
                        <div class="info-item"><label>${isAr ? 'البريد الإلكتروني' : 'Email'}</label><span>${company.contact_email || '---'}</span></div>
                        <div class="info-item"><label>${isAr ? 'عنوان الفواتير' : 'Billing Address'}</label><span>${company.billing_address || '---'}</span></div>
                    </div>
                </div>

                ${companyProjects.length > 0 ? `
                <div class="section">
                    <div class="section-title">${isAr ? 'المشاريع التابعة' : 'Associated Projects'}</div>
                    <table>
                        <thead><tr>
                            <th>${isAr ? 'المشروع' : 'Project'}</th>
                            <th>${isAr ? 'الرحلات' : 'Trips'}</th>
                            <th>${isAr ? 'الكمية' : 'Quantity'}</th>
                            <th>${isAr ? 'الخدمات' : 'Services'}</th>
                            <th>${isAr ? 'المدة' : 'Duration'}</th>
                        </tr></thead>
                        <tbody>${projectsHtml}</tbody>
                    </table>
                </div>
                ` : ''}

                <div class="footer">
                    <span>GCM ERP System</span>
                    <span>${isAr ? 'وثيقة سرية - للإستخدام الداخلي فقط' : 'Confidential Document - Internal Use Only'}</span>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    const getProjectProgress = (projectId: string) => {
        const project = companyProjects.find(p => p.project_id === projectId);
        if (!project) return 0;
        let target = Number(project.total_quantities) || 0;
        if (target <= 0) {
            const pServices = projectServices.filter(ps => ps.project_id === projectId);
            target = pServices.reduce((sum, ps) => sum + (Number(ps.quantity) || 0), 0);
        }
        if (target <= 0) return 0;
        const actual = trips.filter(t => t.project_id === projectId).reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
        return Math.min(Math.round((actual / target) * 100), 100);
    };

    return (
        <Modal size="3xl" isOpen={isOpen} onClose={onClose} title={isAr ? 'الملف التعريفي للشريك' : 'Partner Profile'}>
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-5 duration-700 max-h-[85vh] overflow-y-auto custom-scrollbar px-1">

                {/* Header Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <Card className="lg:col-span-1 p-5 space-y-4 bg-surface-subtle border-none shadow-inner flex flex-col items-center">
                        <div className="w-24 h-24 rounded-2xl bg-surface shadow-sm flex items-center justify-center border border-border overflow-hidden">
                            {company.logo_url ? <img src={company.logo_url} className="w-full h-full object-contain p-2" /> : <Building2 size={36} className="text-text-subtle" />}
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-lg font-bold text-text-main tracking-tight uppercase leading-tight">{company.company_name}</h2>
                            <span className="inline-block px-3 py-1 bg-primary text-white text-[9px] font-bold rounded-full uppercase tracking-widest">{isAr ? 'شريك نشط' : 'Active Partner'}</span>
                        </div>
                        <div className="w-full space-y-3 pt-4 border-t border-border">
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'المعرف' : 'ID'}</span><span className="text-xs font-bold text-text-main font-mono">#{company.company_id.slice(-8)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'السجل التجاري' : 'CR No.'}</span><span className="text-xs font-bold text-text-main font-mono">{company.commercial_reg}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الضريبة' : 'VAT'}</span><span className="text-xs font-bold text-success">{company.vat_no || '---'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'رقم العقد' : 'Contract'}</span><span className="text-xs font-bold text-text-main">{company.contract_no || '---'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'عميل منذ' : 'Since'}</span><span className="text-xs font-bold text-text-main">{company.client_since}</span></div>
                        </div>
                    </Card>

                    <div className="lg:col-span-2 space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <StatCard title={isAr ? 'المشاريع' : 'Projects'} value={companyProjects.length} icon={Briefcase} variant="blue" />
                            <StatCard title={isAr ? 'الرحلات' : 'Trips'} value={companyTrips.length} icon={Zap} variant="amber" />
                            <StatCard title={isAr ? 'الكميات' : 'Tonnage'} value={`${formatNumber(totalQuantity)}T`} icon={Package} variant="emerald" />
                        </div>

                        {/* Contact Info */}
                        <div className="p-4 bg-surface rounded-2xl border border-border space-y-4">
                            <h4 className="text-xs font-bold text-text-main uppercase tracking-widest flex items-center gap-2"><Phone size={14} className="text-primary" /> {isAr ? 'معلومات التواصل' : 'Contact Information'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-0.5"><p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'المسؤول' : 'Manager'}</p><p className="font-bold text-sm text-text-main">{company.contact_name || '---'}</p></div>
                                <div className="space-y-0.5"><p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الهاتف' : 'Phone'}</p><p className="font-bold text-sm text-primary">{company.contact_phone || '---'}</p></div>
                                <div className="space-y-0.5"><p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'البريد' : 'Email'}</p><p className="font-bold text-sm text-text-main">{company.contact_email || '---'}</p></div>
                                <div className="space-y-0.5"><p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الفواتير' : 'Billing'}</p><p className="font-bold text-sm text-text-main leading-relaxed">{company.billing_address || '---'}</p></div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                {company.main_location_url && <Button variant="primary" size="sm" onClick={() => window.open(company.main_location_url, '_blank')} icon={Navigation} className="flex-1">{isAr ? 'الخريطة' : 'Map'}</Button>}
                                <Button variant="secondary" size="sm" onClick={onEdit} icon={Edit2} className="flex-1">{isAr ? 'تعديل' : 'Edit'}</Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Projects Section */}
                <Card className="p-4 space-y-4 !rounded-2xl">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-text-main uppercase tracking-widest flex items-center gap-2"><Zap size={14} className="text-amber-500" /> {isAr ? 'المشاريع التابعة' : 'Associated Projects'}</h4>
                        <span className="text-[9px] font-bold text-text-subtle bg-surface-subtle px-2 py-1 rounded-lg border border-border">{companyProjects.length} {isAr ? 'مشاريع' : 'projects'}</span>
                    </div>
                    {companyProjects.length === 0 ? (
                        <div className="text-center p-10 bg-surface-subtle rounded-2xl border-2 border-dashed border-border">
                            <Briefcase size={40} className="mx-auto text-text-subtle opacity-30 mb-4" />
                            <p className="text-text-subtle font-bold">{isAr ? 'لا توجد مشاريع مسجلة لهذا الشريك' : 'No projects registered for this partner'}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {companyProjects.map(p => {
                                const pTrips = trips.filter(t => t.project_id === p.project_id);
                                const pQty = pTrips.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
                                const pProgress = getProjectProgress(p.project_id);
                                const pServices = projectServices.filter(ps => ps.project_id === p.project_id);

                                return (
                                    <motion.div
                                        key={p.project_id}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        className="p-5 bg-surface-subtle rounded-2xl border border-border flex flex-col justify-between hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group"
                                        onClick={() => { onClose(); router.push(`/p?id=${p.project_id}`); }}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${p.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-surface text-text-subtle'}`}>{p.status || 'ACTIVE'}</span>
                                            <ArrowRight size={14} className="text-text-subtle group-hover:text-primary transition-colors" />
                                        </div>
                                        <h5 className="font-bold text-text-main uppercase text-sm mb-1 line-clamp-1">{p.project_name}</h5>
                                        <p className="text-[10px] font-bold text-text-subtle font-mono mb-4">#{p.project_id}</p>

                                        {/* Progress Bar */}
                                        <div className="mb-4">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[9px] font-bold text-text-subtle uppercase">{isAr ? 'الإنجاز' : 'Progress'}</span>
                                                <span className="text-[9px] font-bold text-primary">{pProgress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pProgress}%` }} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="p-2 bg-surface rounded-xl">
                                                <p className="text-xs font-bold text-primary">{pTrips.length}</p>
                                                <p className="text-[8px] font-bold text-text-subtle uppercase">{isAr ? 'رحلات' : 'Trips'}</p>
                                            </div>
                                            <div className="p-2 bg-surface rounded-xl">
                                                <p className="text-xs font-bold text-success">{formatNumber(pQty)}</p>
                                                <p className="text-[8px] font-bold text-text-subtle uppercase">{isAr ? 'طن' : 'TON'}</p>
                                            </div>
                                            <div className="p-2 bg-surface rounded-xl">
                                                <p className="text-xs font-bold text-amber-500">{pServices.length}</p>
                                                <p className="text-[8px] font-bold text-text-subtle uppercase">{isAr ? 'خدمات' : 'Services'}</p>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-border flex items-center justify-end">
                                            <div className="text-[9px] font-bold text-text-subtle flex items-center gap-1">
                                                <Calendar size={10} />
                                                {p.start_date ? formatDate(p.start_date, 'MMM yyyy') : '---'}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* Documents Section */}
                <Card className="p-4 space-y-4 !rounded-2xl">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-text-main uppercase tracking-widest flex items-center gap-2"><FileText size={14} className="text-primary" /> {isAr ? 'مستندات الشركة' : 'Company Documents'}</h4>
                        {availableDocs.length > 0 && (
                            <Button variant="primary" onClick={handleDownloadAll} icon={Download} className="shadow-lg shadow-primary/10">
                                {isAr ? 'تحميل الكل' : 'Download All'} ({availableDocs.length})
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {documents.map(doc => {
                            const Icon = doc.icon;
                            const hasFile = !!doc.file;
                            return (
                                <div key={doc.key} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${hasFile ? 'border-success/20 bg-success/5' : 'border-border bg-surface-subtle opacity-60'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${hasFile ? 'bg-success text-white' : 'bg-surface text-text-subtle'}`}>
                                            {hasFile ? <FileCheck size={18} /> : <FileX size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-text-main">{doc.label}</p>
                                            <p className={`text-[10px] font-bold ${hasFile ? 'text-success' : 'text-text-subtle'}`}>{hasFile ? (isAr ? 'مرفوع ✓' : 'Uploaded ✓') : (isAr ? 'غير مرفوع' : 'Not uploaded')}</p>
                                        </div>
                                    </div>
                                    {hasFile && (
                                        <Button variant="ghost" onClick={() => handleDownloadDoc(doc.file!, `${company.company_name}_${doc.key}`)} icon={Download} className="text-success hover:bg-success/10 p-2" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Action Bar */}
                <div className="flex gap-3 sticky bottom-0 bg-surface pt-3 pb-2 border-t border-border z-10">
                    <Button variant="secondary" onClick={handlePrint} icon={Printer} className="flex-1 py-3 uppercase tracking-widest font-bold text-xs">
                        {isAr ? 'طباعة' : 'Print'}
                    </Button>
                    <Button variant="primary" onClick={onEdit} icon={Edit2} className="flex-1 py-3 uppercase tracking-widest font-bold text-xs shadow-sm">
                        {isAr ? 'تعديل البيانات' : 'Edit Record'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default CompanyDetails;
