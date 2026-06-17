"use client";

import React, { useMemo } from 'react';
import { useStore } from '@/context';
import { SupplierDetailsContent } from '@/components/suppliers/SupplierDetails';
import { motion } from 'framer-motion';
import { Building2, ShieldCheck, Mail, Phone, MapPin, Globe, CreditCard, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Badge } from '@/components';

const SubcontractorProfile: React.FC = () => {
    const {
        currentUser, saasConfig, suppliers, vehicles,
        drivers, containers, tanks
    } = useStore();
    const router = useRouter();
    const isAr = saasConfig.language === 'ar';

    const mySupplier = useMemo(() =>
        suppliers.find(s => s.supplier_id === currentUser.supplier_id),
        [suppliers, currentUser.supplier_id]);

    const stats = useMemo(() => {
        if (!mySupplier) return { vehicles: [], containers: [], tanks: [], staff: [], staffCount: 0 };
        
        const sVehicles = (vehicles || []).filter(v => v.supplier_id === mySupplier.supplier_id || v.supplier_name === mySupplier.name);
        const sDrivers = (drivers || []).filter(d => d.supplier_id === mySupplier.supplier_id || d.supplier_name === mySupplier.name);
        const sContainers = (containers || []).filter(c => c.supplier_id === mySupplier.supplier_id);
        const sTanks = (tanks || []).filter(t => t.supplier_id === mySupplier.supplier_id);

        return {
            vehicles: sVehicles,
            containers: sContainers,
            tanks: sTanks,
            staff: sDrivers,
            staffCount: sDrivers.length
        };
    }, [mySupplier, vehicles, drivers, containers, tanks]);

    const contactDetails = useMemo(() => {
        if (!mySupplier?.contact_persons) return { email: 'N/A', phone: 'N/A' };
        const contacts = typeof mySupplier.contact_persons === 'string' ? JSON.parse(mySupplier.contact_persons || '[]') : mySupplier.contact_persons;
        const main = Array.isArray(contacts) ? contacts[0] : null;
        return {
            email: main?.email || 'N/A',
            phone: main?.phone || 'N/A'
        };
    }, [mySupplier]);

    if (!mySupplier) {
        return (
            <div className="p-12 text-center">
                <p className="text-text-subtle font-bold uppercase tracking-widest">
                    {isAr ? 'لم يتم العثور على بيانات المورد' : 'Supplier data not found'}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 p-4 md:p-8 space-y-8">
            {/* Breadcrumb / Navigation */}
            <div className="flex items-center gap-4 mb-2">
                <button 
                    onClick={() => router.back()}
                    className="p-2 hover:bg-surface-subtle rounded-full transition-colors group"
                >
                    <ChevronLeft size={20} className="text-text-subtle group-hover:text-primary transition-colors" />
                </button>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">
                    <span>{isAr ? 'بوابة الشركاء' : 'Partner Portal'}</span>
                    <span className="opacity-30">/</span>
                    <span className="text-primary">{isAr ? 'الملف الشخصي' : 'Company Profile'}</span>
                </div>
            </div>

            {/* Profile Page Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Sidebar - Quick Info */}
                <div className="lg:col-span-1 space-y-6">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 flex flex-col items-center text-center overflow-hidden relative"
                    >
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary/10 to-transparent" />
                        
                        <div className="w-24 h-24 bg-primary text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/20 relative z-10 mb-6 group-hover:scale-105 transition-transform duration-500">
                            <Building2 size={48} />
                        </div>

                        <h2 className="text-xl font-black text-text-main uppercase tracking-tighter leading-tight mb-2">
                            {mySupplier.name}
                        </h2>
                        <Badge variant="primary" className="text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                            {mySupplier.category}
                        </Badge>

                        <div className="w-full space-y-4 text-left rtl:text-right pt-6 border-t border-border">
                            <div className="flex items-center gap-3 group/info">
                                <div className="p-2 bg-surface-subtle border border-border rounded-xl group-hover/info:bg-primary/10 group-hover/info:border-primary/30 transition-all text-text-subtle group-hover/info:text-primary">
                                    <Mail size={14} />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-text-subtle uppercase tracking-widest opacity-50">{isAr ? 'البريد الإلكتروني' : 'Official Email'}</p>
                                    <p className="text-xs font-bold text-text-main truncate max-w-[150px]">{contactDetails.email}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 group/info">
                                <div className="p-2 bg-surface-subtle border border-border rounded-xl group-hover/info:bg-emerald-500/10 group-hover/info:border-emerald-500/30 transition-all text-text-subtle group-hover/info:text-emerald-500">
                                    <Phone size={14} />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-text-subtle uppercase tracking-widest opacity-50">{isAr ? 'رقم التواصل' : 'HQ Phone'}</p>
                                    <p className="text-xs font-bold text-text-main">{contactDetails.phone}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 group/info">
                                <div className="p-2 bg-surface-subtle border border-border rounded-xl group-hover/info:bg-amber-500/10 group-hover/info:border-amber-500/30 transition-all text-text-subtle group-hover/info:text-amber-500">
                                    <MapPin size={14} />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-text-subtle uppercase tracking-widest opacity-50">{isAr ? 'العنوان' : 'Operations Base'}</p>
                                    <p className="text-xs font-bold text-text-main">{mySupplier.address || 'Saudi Arabia'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 w-full">
                            <Button variant="secondary" className="w-full text-[10px] font-black tracking-widest py-4 rounded-2xl" icon={ShieldCheck}>
                                {isAr ? 'التحقق من الامتثال' : 'VERIFIED PARTNER'}
                            </Button>
                        </div>
                    </motion.div>

                    {/* Quick Stats sidebar cards */}
                    <div className="space-y-4">
                        <div className="p-6 bg-surface-subtle border border-border rounded-[2rem] flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black text-text-subtle uppercase tracking-widest opacity-60 mb-1">{isAr ? 'الرقم الضريبي' : 'VAT Number'}</p>
                                <p className="text-sm font-black text-text-main">{mySupplier.tax_no || 'Pending'}</p>
                            </div>
                            <CreditCard size={20} className="text-text-subtle opacity-20" />
                        </div>
                        <div className="p-6 bg-surface-subtle border border-border rounded-[2rem] flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black text-text-subtle uppercase tracking-widest opacity-60 mb-1">{isAr ? 'السجل التجاري' : 'CR Number'}</p>
                                <p className="text-sm font-black text-text-main">{mySupplier.cr_no || '---'}</p>
                            </div>
                            <Globe size={20} className="text-text-subtle opacity-20" />
                        </div>
                    </div>
                </div>

                {/* Right Content - Full Dashboard Content */}
                <div className="lg:col-span-3">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-xl shadow-black/5"
                    >
                        <div className="flex justify-between items-center mb-8 pb-6 border-b border-border">
                            <div>
                                <h3 className="text-2xl font-black text-text-main uppercase tracking-tighter italic">
                                    {isAr ? 'مركز معلومات الشريك' : 'Partner Information Center'}
                                </h3>
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.2em] mt-1 opacity-60">
                                    {isAr ? 'إدارة بيانات المؤسسة والموارد المسجلة في النظام' : 'Manage corporate records and registered system resources'}
                                </p>
                            </div>
                        </div>

                        <SupplierDetailsContent
                            supplier={mySupplier}
                            stats={stats}
                            isAr={isAr}
                            onEdit={() => {}} 
                            hideHeader={true}
                        />
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default SubcontractorProfile;
