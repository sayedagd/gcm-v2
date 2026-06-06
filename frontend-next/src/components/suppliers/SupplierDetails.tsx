import React, { useState } from 'react';
import {
    Building2, TrendingUp, Truck, Package, Users, Phone, Shield, FileText, Edit2,
    Search, ChevronRight, HardHat, Calendar, Target,
    Briefcase, FileDown, CreditCard
} from 'lucide-react';
import {
    Modal, StatCard, Card, Button, Badge
} from '@/components';
import { Supplier, SupplierContact } from '@/types';
import { useStore } from '@/context';

import { printSubcontractorDossier } from '@/utils/exportHelpers';
import { safeParseArray } from '@/utils/helpers';

interface SupplierDetailsProps {
    isOpen: boolean;
    onClose: () => void;
    supplier: Supplier | null;
    stats: {
        vehicles: any[];
        containers: any[];
        tanks: any[];
        staff: any[];
        staffCount: number;
    };
    isAr: boolean;
    onEdit: () => void;
}

interface SupplierDetailsContentProps {
    supplier: Supplier;
    stats: {
        vehicles: any[];
        containers: any[];
        tanks: any[];
        staff: any[];
        staffCount: number;
    };
    isAr: boolean;
    onEdit: () => void;
    hideHeader?: boolean;
}

export const SupplierDetailsContent: React.FC<SupplierDetailsContentProps> = ({
    supplier,
    stats,
    isAr,
    onEdit,
    hideHeader = false
}) => {
    const { projects, services, saasConfig } = useStore();
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FLEET' | 'EQUIPMENT' | 'PERSONNEL'>('OVERVIEW');
    const [searchTerm, setSearchTerm] = useState('');

    const tabs = [
        { id: 'OVERVIEW', label: isAr ? 'نظرة عامة' : 'Overview', icon: TrendingUp },
        { id: 'FLEET', label: isAr ? 'الأسطول' : 'Fleet', icon: Truck },
        { id: 'EQUIPMENT', label: isAr ? 'المعدات' : 'Equipment', icon: Package },
        { id: 'PERSONNEL', label: isAr ? 'العمالة' : 'Personnel', icon: Users },
    ];

    const assignedProjectNames = safeParseArray(supplier.assigned_projects)
        .map(id => projects.find(p => p.project_id === id)?.project_name)
        .filter(n => !!n);

    const assignedServiceNames = safeParseArray(supplier.assigned_services)
        .map(id => services.find(s => s.service_id === id)?.service_name)
        .filter(n => !!n);

    const downloadFile = (data?: string, name?: string) => {
        if (!data) return;
        const link = document.createElement('a'); link.href = data; link.download = name || 'file'; link.click();
    };

    return (
        <div className="space-y-6 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Identity Header */}
            {!hideHeader && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-surface-subtle rounded-3xl border border-border relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-20 h-20 bg-amber-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-amber-500/20 shrink-0 group-hover:scale-105 transition-transform duration-500">
                            <Building2 size={40} />
                        </div>
                        <div className="text-center md:text-left rtl:md:text-right">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.3em]">{supplier.supplier_id}</span>
                                <div className="w-1 h-1 rounded-full bg-border" />
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.3em]">{supplier.category}</span>
                            </div>
                            <h3 className="text-2xl font-black text-text-main tracking-tighter uppercase leading-none">{supplier.name}</h3>
                            <div className="flex items-center gap-2 mt-3 justify-center md:justify-start">
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${supplier.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {supplier.status}
                                </div>
                                <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest opacity-60">
                                    {isAr ? 'مسجل منذ:' : 'Partnered:'} {supplier.created_at || 'Jan 2024'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 relative z-10">
                        <Button
                            variant="secondary"
                            onClick={() => printSubcontractorDossier(supplier, stats, isAr, projects, services, saasConfig?.templateConfig)}
                            icon={FileDown}
                            className="h-14 px-6 rounded-2xl font-bold tracking-widest text-xs"
                        >
                            {isAr ? 'تصدير التقرير' : 'EXPORT REPORT'}
                        </Button>
                        <Button variant="primary" onClick={onEdit} icon={Edit2} className="h-14 px-8 rounded-2xl font-bold tracking-widest text-xs shadow-xl shadow-primary/20">
                            {isAr ? 'تحديث البيانات' : 'UPDATE DATA'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex p-1.5 bg-surface-subtle rounded-2xl border border-border overflow-x-auto custom-scrollbar no-scrollbar">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-surface text-primary shadow-sm border border-border' : 'text-text-subtle hover:text-primary opacity-60 hover:opacity-100'}`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'OVERVIEW' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard
                                title={isAr ? 'قوة الأسطول الشغال' : 'Operational Fleet'}
                                value={stats.vehicles.length}
                                icon={Truck}
                                variant="blue"
                            />
                            <StatCard
                                title={isAr ? 'الأصول الميدانية' : 'Field Assets'}
                                value={stats.containers.length + stats.tanks.length}
                                icon={Package}
                                variant="emerald"
                            />
                            <StatCard
                                title={isAr ? 'القوى البشرية' : 'Headcount'}
                                value={stats.staffCount}
                                icon={Users}
                                variant="purple"
                            />
                        </div>

                        {/* Contract & Assignments Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <Card className="p-6 col-span-2 border-l-4 border-l-primary">
                                <h4 className="text-[10px] font-bold uppercase text-text-subtle tracking-[0.2em] flex items-center gap-3 mb-6">
                                    <Calendar size={16} className="text-primary" />
                                    {isAr ? 'تفاصيل العقد والجدولة الزمنية' : 'Contract Intelligence & Timeline'}
                                </h4>
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-[9px] font-black text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'تاريخ تفعيل العقد' : 'Contract Activation'}</p>
                                        <p className="text-sm font-black text-text-main">{supplier.contract_start || '---'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'تاريخ انتهاء العقد' : 'Contract Termination'}</p>
                                        <p className="text-sm font-black text-rose-500">{supplier.contract_end || '---'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'تاريخ البدء الفعلي' : 'Work Commencement'}</p>
                                        <p className="text-sm font-black text-emerald-500">{supplier.work_start_date || '---'}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 border-l-4 border-l-amber-500">
                                <h4 className="text-[10px] font-bold uppercase text-text-subtle tracking-[0.2em] flex items-center gap-3 mb-4">
                                    <Shield size={16} className="text-amber-500" />
                                    {isAr ? 'نظام الحوكمة' : 'Governance Status'}
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-text-subtle">{isAr ? 'اكتمال الوثائق' : 'Doc Readiness'}</span>
                                        <Badge variant="emerald" className="text-[8px] font-black">100%</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-text-subtle">{isAr ? 'الامتثال الفني' : 'Technical Compliance'}</span>
                                        <Badge variant="blue" className="text-[8px] font-black">STABLE</Badge>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="p-8 group h-full">
                                <h4 className="text-[10px] font-bold uppercase text-text-subtle tracking-[0.3em] flex items-center gap-3 mb-8">
                                    <Target size={14} className="text-amber-500" />
                                    {isAr ? 'التخصيص الاستراتيجي' : 'Strategic Assignments'}
                                </h4>

                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[9px] font-black text-text-subtle uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Briefcase size={12} className="text-emerald-500" />
                                            {isAr ? 'المشاريع النشطة' : 'Active Projects'}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {assignedProjectNames.length > 0 ? assignedProjectNames.map((n, i) => (
                                                <Badge key={i} className="bg-emerald-500/10 text-emerald-600 border-none px-3 py-1.5 text-[9px] font-black uppercase tracking-tight italic">
                                                    {n}
                                                </Badge>
                                            )) : <span className="text-[10px] italic text-text-subtle opacity-50 px-2">{isAr ? 'لم يتم تعيين مشاريع' : 'No projects assigned'}</span>}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border/50">
                                        <p className="text-[9px] font-black text-text-subtle uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Shield size={12} className="text-primary" />
                                            {isAr ? 'الخدمات المعتمدة' : 'Certified Services'}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {assignedServiceNames.length > 0 ? assignedServiceNames.map((n, i) => (
                                                <Badge key={i} className="bg-primary/5 text-primary border-none px-3 py-1.5 text-[9px] font-black uppercase tracking-tight italic">
                                                    {n}
                                                </Badge>
                                            )) : <span className="text-[10px] italic text-text-subtle opacity-50 px-2">{isAr ? 'لم يتم تعيين خدمات' : 'No services assigned'}</span>}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <div className="space-y-6">
                                <Card className="p-6">
                                    <h5 className="text-[10px] font-bold uppercase text-text-subtle tracking-[0.2em] flex items-center gap-3 mb-6">
                                        <Phone size={16} className="text-primary" />
                                        {isAr ? 'بروتوكول التواصل' : 'Communication Protocol'}
                                    </h5>
                                    <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {safeParseArray(supplier.contact_persons).map((c: any, idx: number) => (
                                            <div key={idx} className="p-4 bg-surface-subtle rounded-2xl border border-border hover:border-primary/30 transition-all group/contact">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-black text-[10px] text-text-main uppercase tracking-tight">{c.name}</div>
                                                    <Badge variant="primary" className="text-[7px] font-black uppercase tracking-widest">{c.role}</Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-text-subtle opacity-70">
                                                    <Phone size={10} /> {c.phone}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                <Card className="p-8 bg-slate-900 border-none shadow-3xl text-white relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
                                    <h4 className="font-black text-xs tracking-widest uppercase flex items-center gap-3 mb-6 relative z-10">
                                        <Shield size={18} className="text-amber-500" />
                                        {isAr ? 'المستندات السيادية' : 'Compliance Vault'}
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2 relative z-10">
                                        {supplier.cr_file && (
                                            <Button variant="ghost" onClick={() => downloadFile(supplier.cr_file, 'CR')} className="w-full bg-white/5 border-white/10 text-white text-[10px] py-6 hover:bg-white/10 justify-between group/btn" icon={FileText}>
                                                <span>COMMERCIAL REGISTER (CR)</span>
                                                <ChevronRight size={14} className="opacity-40 group-hover/btn:translate-x-1 transition-transform" />
                                            </Button>
                                        )}
                                        {supplier.tax_file && (
                                            <Button variant="ghost" onClick={() => downloadFile(supplier.tax_file, 'TAX')} className="w-full bg-white/5 border-white/10 text-white text-[10px] py-6 hover:bg-white/10 justify-between group/btn" icon={Shield}>
                                                <span>TAX CLEARANCE CERTIFICATE</span>
                                                <ChevronRight size={14} className="opacity-40 group-hover/btn:translate-x-1 transition-transform" />
                                            </Button>
                                        )}
                                        {supplier.contract_file && (
                                            <Button variant="ghost" onClick={() => downloadFile(supplier.contract_file, 'Contract')} className="w-full bg-white/5 border-white/10 text-white text-[10px] py-6 hover:bg-white/10 justify-between group/btn" icon={CreditCard}>
                                                <span>EXECUTED SERVICE CONTRACT</span>
                                                <ChevronRight size={14} className="opacity-40 group-hover/btn:translate-x-1 transition-transform" />
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'FLEET' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h4 className="text-xl font-black text-text-main uppercase tracking-tighter">{isAr ? 'جرد الأسطول' : 'Fleet Inventory'}</h4>
                            <div className="flex items-center gap-2 px-4 py-2 bg-surface-subtle border border-border rounded-xl w-full md:w-64">
                                <Search size={14} className="text-text-subtle" />
                                <input
                                    type="text"
                                    placeholder={isAr ? 'بحث عن لوحة...' : 'Search Plate...'}
                                    className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-widest text-text-main placeholder:opacity-50 w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(stats.vehicles || []).filter(v => v.plate_no.toLowerCase().includes(searchTerm.toLowerCase())).map((vehicle: any) => (
                                <div key={vehicle.vehicle_id} className="p-5 bg-surface-subtle rounded-3xl border border-border hover:border-primary/40 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-text-subtle group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                            <Truck size={20} />
                                        </div>
                                        <Badge variant={vehicle.status === 'ACTIVE' ? 'emerald' : 'amber'} className="text-[8px] font-black uppercase tracking-widest">
                                            {vehicle.status}
                                        </Badge>
                                    </div>
                                    <h4 className="text-lg font-black text-text-main tracking-tight uppercase leading-none mb-1">{vehicle.plate_no}</h4>
                                    <p className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.2em]">{vehicle.vehicle_type}</p>

                                    <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Shield size={12} className="text-primary opacity-60" />
                                            <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{vehicle.permit_count} Permits</span>
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                </div>
                            ))}
                            {(stats.vehicles || []).length === 0 && (
                                <div className="col-span-2 p-20 text-center bg-surface-subtle rounded-3xl border border-dashed border-border opacity-50">
                                    <Truck size={40} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-[0.2em]">{isAr ? 'لا توجد مركبات مسجلة' : 'No registered fleet found'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'EQUIPMENT' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <h4 className="text-xl font-black text-text-main uppercase tracking-tighter mb-4">{isAr ? 'جرد الأصول والمعدات' : 'Asset & Equipment Intel'}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[...(stats.containers || []), ...(stats.tanks || [])].map((item: any, idx: number) => (
                                <div key={idx} className="p-5 bg-surface-subtle rounded-3xl border border-border hover:border-emerald-500/40 transition-all group">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="p-3 bg-surface rounded-xl text-text-subtle group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                            <Package size={20} />
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    </div>
                                    <div className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1 opacity-60">{item.code}</div>
                                    <h5 className="font-black text-text-main uppercase tracking-tight">{item.size_id || 'GENERAL UNIT'}</h5>
                                    <div className="mt-4 flex flex-wrap gap-1">
                                        <Badge className="bg-emerald-500/10 text-emerald-600 text-[8px] border-none px-2">{item.status}</Badge>
                                        <Badge className="bg-primary/5 text-primary text-[8px] border-none px-2">{item.ownership}</Badge>
                                    </div>
                                </div>
                            ))}
                            {[...(stats.containers || []), ...(stats.tanks || [])].length === 0 && (
                                <div className="col-span-3 p-20 text-center bg-surface-subtle rounded-3xl border border-dashed border-border opacity-50">
                                    <Package size={40} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-[0.2em]">{isAr ? 'لا توجد معدات مسجلة' : 'No field equipment found'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'PERSONNEL' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <h4 className="text-xl font-black text-text-main uppercase tracking-tighter mb-4">{isAr ? 'قاعدة بيانات العمالة' : 'Personnel Database'}</h4>
                        <div className="bg-surface-subtle rounded-[2rem] border border-border overflow-hidden shadow-sm">
                            <table className="w-full text-left rtl:text-right">
                                <thead>
                                    <tr className="bg-surface border-b border-border">
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-subtle">{isAr ? 'الموظف' : 'Consultant / Driver'}</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-subtle">{isAr ? 'البيانات' : 'Credentials'}</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-subtle">{isAr ? 'الجاهزية' : 'Compliance'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {(stats.staff || []).map((member: any) => (
                                        <tr key={member.driver_id} className="hover:bg-surface/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center font-black text-xs text-text-subtle group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-text-main leading-none mb-1">{member.name}</div>
                                                        <div className="text-[9px] font-bold text-text-subtle uppercase tracking-widest opacity-60">{member.role_title || 'Operator'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1.5 text-right rtl:text-right">
                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-text-subtle">
                                                        <Shield size={10} className="text-primary" /> {member.iqama_no || '---'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-text-subtle">
                                                        <HardHat size={10} className="text-emerald-500" /> {member.license_no || '---'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-main">{member.status}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(stats.staff || []).length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-10 text-center opacity-50">
                                                <Users size={32} className="mx-auto mb-3 opacity-20" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest">{isAr ? 'لا يوجد موظفين مسجلين' : 'Registry Empty'}</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-border/50">
                <Button variant="primary" onClick={onEdit} className="w-full py-6 rounded-2xl shadow-xl shadow-primary/10 tracking-[0.2em] font-black" icon={Edit2}>
                    {isAr ? 'تحديث النظام الفني للشريك' : 'SYNC PARTNER SYSTEMS'}
                </Button>
            </div>
        </div>
    );
};

const SupplierDetails: React.FC<SupplierDetailsProps> = ({
    isOpen,
    onClose,
    supplier,
    stats,
    isAr,
    onEdit
}) => {
    if (!supplier) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="3xl"
            title={isAr ? 'مركز الاستخبارات للشريك' : 'Partner Intelligence Hub'}
        >
            <SupplierDetailsContent
                supplier={supplier}
                stats={stats}
                isAr={isAr}
                onEdit={onEdit}
            />
        </Modal>
    );
};

export default SupplierDetails;
