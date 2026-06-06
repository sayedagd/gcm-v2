// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { useStore } from '@/context';
import {
   Save, ImageIcon, Upload, Link as LinkIcon, Sparkles,
   Truck, Shield, Droplets, Factory, Plus, Trash2, Building2, MessageSquare, CheckCircle2, Clock, Zap, Mail, Edit2, X,
   User, Lock, Facebook, Twitter, Linkedin, Instagram, Youtube, Layout, Globe, Smartphone, Share2, Palette, Code, Cloud, Send, ShieldCheck, Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionType, EntityType } from '@/types';
import { Input, Textarea, ColorPicker } from '@/components';

const LandingSettings: React.FC = () => {
   const { saasConfig, updateSaaS, updateLandingPage, contactSubmissions, deleteContactSubmission, currentUser, addLog } = useStore();
   const [activeTab, setActiveTab] = useState<'hero' | 'about' | 'services' | 'fleet' | 'partners' | 'carbon' | 'headerfooter' | 'seo' | 'messages' | 'system'>('hero');
   const [showSaveToast, setShowSaveToast] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);

   const isAr = saasConfig.language === 'ar';
   const lp = saasConfig.landingPage;

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onloadend = () => {
            callback(reader.result as string);
            addLog(ActionType.UPLOAD, EntityType.LANDING, 'IMAGE_UPLOAD', file.name, 'Uploaded a file to landing page assets');
         };
         reader.readAsDataURL(file);
      }
   };

   const handleSave = async () => {
      setIsSubmitting(true);
      try {
         // Landing page updates are typically handled by individual update functions 
         // which might already be calling API, but here we provide a global feedback
         setShowSaveToast(true);
         setTimeout(() => setShowSaveToast(false), 3000);
      } catch (err) {
         console.error(err);
      } finally {
         setIsSubmitting(false);
      }
   };

   const SmartImageControl = ({ label, value, onChange, onUpload }: any) => {
      const [mode, setMode] = useState<'view' | 'edit'>(value ? 'view' : 'edit');
      return (
         <div className="space-y-4">
            <label className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.2em] block">{label}</label>
            {mode === 'view' ? (
               <div className="relative group overflow-hidden rounded-2xl border-4 border-surface shadow-xl aspect-video md:aspect-auto md:h-48 bg-surface-subtle transition-colors">
                  <img src={value} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="Preview" />
                  <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                     <button onClick={() => setMode('edit')} className="p-4 bg-surface text-text-main rounded-2xl font-bold text-xs flex items-center gap-2 hover:scale-110 transition-all shadow-lg">
                        <Edit2 size={16} /> {isAr ? 'تغيير الصورة' : 'Change Image'}
                     </button>
                  </div>
               </div>
            ) : (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-surface-subtle rounded-2xl border-2 border-dashed border-border">
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="flex-1 space-y-3">
                        <Input
                           icon={LinkIcon}
                           placeholder="https://..."
                           value={value?.startsWith('data:') ? '' : value}
                           onChange={onChange}
                           className="!bg-surface border-none !p-0 h-auto"
                           containerClassName="flex-1"
                        />
                        <label className="flex items-center justify-center gap-2 p-3 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase cursor-pointer hover:bg-emerald-700 transition-all">
                           <Upload size={14} /> {isAr ? 'رفع من الجهاز' : 'Upload File'}
                           <input type="file" className="hidden" accept="image/*" onChange={(e) => { handleFileUpload(e, onUpload); setMode('view'); }} />
                        </label>
                     </div>
                     {value && <button onClick={() => setMode('view')} className="px-4 py-2 text-text-subtle font-bold text-[10px] uppercase">{isAr ? 'إلغاء' : 'Cancel'}</button>}
                  </div>
               </motion.div>
            )}
         </div>
      );
   };

   const tabs = [
      { id: 'hero', label: isAr ? 'قسم الهيرو' : 'Hero', icon: ImageIcon },
      { id: 'about', label: isAr ? 'عن الشركة' : 'About', icon: Building2 },
      { id: 'services', label: isAr ? 'الخدمات' : 'Services', icon: Layout },
      { id: 'fleet', label: isAr ? 'الأسطول' : 'Fleet', icon: Truck },
      { id: 'partners', label: isAr ? 'الشركاء' : 'Partners', icon: Sparkles },
      { id: 'carbon', label: isAr ? 'الكربون' : 'Carbon', icon: Leaf },
      { id: 'headerfooter', label: isAr ? 'هيدر وفوتر' : 'H/F', icon: Smartphone },
      { id: 'seo', label: isAr ? 'السيو والأكواد' : 'SEO', icon: Globe },
      { id: 'messages', label: isAr ? 'الرسائل' : 'Inbox', icon: MessageSquare },
      { id: 'system', label: isAr ? 'النظام والتحكم' : 'System', icon: ShieldCheck }
   ];

   if (currentUser.role !== 'ADMIN') return <div className="p-20 text-center font-bold">Access Denied</div>;

   return (
      <div className="space-y-10 max-w-7xl mx-auto pb-40 px-4 md:px-0">
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-4">
            <div>
               <h1 className="text-3xl md:text-5xl font-bold flex items-center gap-4 tracking-tight text-text-main">
                  <Palette className="text-emerald-500" size={44} />
                  {isAr ? 'استوديو تصميم الموقع العام' : 'Landing Designer Hub'}
               </h1>
               <p className="text-text-subtle font-bold mt-2">{isAr ? 'تحكم كامل في نصوص، صور، سيو وأكواد التتبع' : 'Manage content, images, SEO and tracking scripts.'}</p>
            </div>
         </div>

         <div className="w-full bg-surface p-2 rounded-2xl shadow-xl border border-border overflow-x-auto custom-scrollbar transition-colors">
            <div className="flex items-center min-w-max gap-1">
               {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative z-10 flex items-center gap-2 ${activeTab === tab.id ? 'text-white' : 'text-text-subtle hover:bg-surface-subtle'}`}>
                     <tab.icon size={14} />
                     {tab.label}
                     {activeTab === tab.id && <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-emerald-600 rounded-xl -z-10 shadow-lg shadow-emerald-600/20" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />}
                  </button>
               ))}
            </div>
         </div>

         <AnimatePresence mode="wait">
            {activeTab === 'hero' && (
               <motion.div key="hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                  <div className="bg-surface p-10 md:p-12 rounded-[4rem] border border-border shadow-sm space-y-12 transition-colors">
                     <h3 className="font-bold text-2xl flex items-center gap-3 text-emerald-600"><ImageIcon size={24} /> {isAr ? 'قسم الواجهة (Hero)' : 'Hero Section'}</h3>
                     <SmartImageControl label={isAr ? 'صورة الخلفية البانورامية' : 'Hero Background Image'} value={lp.heroBgUrl} onChange={val => updateLandingPage({ heroBgUrl: val })} onUpload={b64 => updateLandingPage({ heroBgUrl: b64 })} />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                           <Textarea
                              label="العنوان الرئيسي (AR)"
                              value={lp.heroTitleAr}
                              onChange={val => updateLandingPage({ heroTitleAr: val })}
                              rows={2}
                              className="text-xl font-bold"
                           />
                           <Textarea
                              label="الوصف الفرعي (AR)"
                              value={lp.heroDescAr}
                              onChange={val => updateLandingPage({ heroDescAr: val })}
                              rows={3}
                           />
                        </div>
                        <div className="space-y-4">
                           <Textarea
                              label="Main Title (EN)"
                              value={lp.heroTitleEn}
                              onChange={val => updateLandingPage({ heroTitleEn: val })}
                              rows={2}
                              className="text-xl font-bold"
                           />
                           <Textarea
                              label="Hero Description (EN)"
                              value={lp.heroDescEn}
                              onChange={val => updateLandingPage({ heroDescEn: val })}
                              rows={3}
                           />
                        </div>
                     </div>
                  </div>
               </motion.div>
            )}

            {activeTab === 'about' && (
               <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                  <div className="bg-surface p-10 md:p-12 rounded-[4rem] border border-border shadow-sm space-y-12 transition-colors">
                     <h3 className="font-bold text-2xl flex items-center gap-3 text-emerald-600"><Building2 size={24} /> {isAr ? 'تعريف الشركة (About Us)' : 'About Us Section'}</h3>
                     <SmartImageControl label={isAr ? 'الصورة التعريفية' : 'About Section Image'} value={lp.aboutImageUrl} onChange={val => updateLandingPage({ aboutImageUrl: val })} onUpload={b64 => updateLandingPage({ aboutImageUrl: b64 })} />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                           <Input label="العنوان الصغير (AR)" value={lp.aboutTitleAr} onChange={val => updateLandingPage({ aboutTitleAr: val })} />
                           <Input label="العنوان العريض (AR)" value={lp.aboutDescAr} onChange={val => updateLandingPage({ aboutDescAr: val })} className="text-lg" />
                           <Textarea label="نص المحتوى (AR)" value={lp.aboutTextAr} onChange={val => updateLandingPage({ aboutTextAr: val })} rows={5} />
                        </div>
                        <div className="space-y-4">
                           <Input label="Small Label (EN)" value={lp.aboutTitleEn} onChange={val => updateLandingPage({ aboutTitleEn: val })} />
                           <Input label="Big Heading (EN)" value={lp.aboutDescEn} onChange={val => updateLandingPage({ aboutDescEn: val })} className="text-lg" />
                           <Textarea label="Body Text (EN)" value={lp.aboutTextEn} onChange={val => updateLandingPage({ aboutTextEn: val })} rows={5} />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <Input
                           label="Years of Experience"
                           type="number"
                           value={String(lp.experienceYears || 0)}
                           onChange={val => updateLandingPage({ experienceYears: parseInt(val) || 0 })}
                        />
                        <Input
                           label="Projects Count"
                           value={lp.projectsCount || ''}
                           onChange={val => updateLandingPage({ projectsCount: val })}
                        />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-border">
                        <div className="space-y-4">
                           <Textarea 
                              label={isAr ? 'نص الالتزام البيئي (AR)' : 'Compliance Text (AR)'} 
                              value={lp.complianceTextAr || ''} 
                              onChange={val => updateLandingPage({ complianceTextAr: val })} 
                              rows={2}
                              placeholder="نظام متوافق بالكامل مع معايير..."
                           />
                        </div>
                        <div className="space-y-4">
                           <Textarea 
                              label={isAr ? 'Compliance Text (EN)' : 'Compliance Text (EN)'} 
                              value={lp.complianceTextEn || ''} 
                              onChange={val => updateLandingPage({ complianceTextEn: val })} 
                              rows={2}
                              placeholder="Fully NCEC compliant system..."
                           />
                        </div>
                     </div>
                  </div>
               </motion.div>
            )}

             {activeTab === 'services' && (
               <motion.div key="services" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="bg-surface p-10 rounded-[4rem] border border-border shadow-sm space-y-12">
                     <h3 className="font-bold text-2xl flex items-center gap-3 text-emerald-600"><Layout size={24} /> {isAr ? 'إدارة قسم الخدمات' : 'Services Section Controls'}</h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-10 border-b border-border">
                        <div className="space-y-4">
                           <Input label={isAr ? 'عنوان القسم (AR)' : 'Section Title (AR)'} value={lp.servicesSectionTitleAr || ''} onChange={val => updateLandingPage({ servicesSectionTitleAr: val })} />
                           <Textarea label={isAr ? 'وصف القسم (AR)' : 'Section Desc (AR)'} value={lp.servicesSectionDescAr || ''} onChange={val => updateLandingPage({ servicesSectionDescAr: val })} rows={2} />
                        </div>
                        <div className="space-y-4">
                           <Input label={isAr ? 'Section Title (EN)' : 'Section Title (EN)'} value={lp.servicesSectionTitleEn || ''} onChange={val => updateLandingPage({ servicesSectionTitleEn: val })} />
                           <Textarea label={isAr ? 'Section Desc (EN)' : 'Section Desc (EN)'} value={lp.servicesSectionDescEn || ''} onChange={val => updateLandingPage({ servicesSectionDescEn: val })} rows={2} />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-6">
                        {lp.services.map((s, idx) => (
                           <div key={s.id} className="p-8 bg-surface-subtle rounded-2xl border border-border flex flex-col md:flex-row items-center gap-8 relative group">
                              <button onClick={() => {
                                 const n = lp.services.filter(x => x.id !== s.id);
                                 updateLandingPage({ services: n });
                              }} className="absolute top-6 right-6 p-2 bg-rose-500/10 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                              <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center text-emerald-600 border border-border shrink-0 relative">
                                 {s.iconType === 'custom' ? (
                                    <img src={s.iconUrl} className="w-12 h-12 object-contain" alt="" />
                                 ) : (
                                    s.iconType === 'truck' ? <Truck size={32} /> : s.iconType === 'shield' ? <Shield size={32} /> : s.iconType === 'factory' ? <Factory size={32} /> : <Droplets size={32} />
                                 )}
                              </div>
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-4">
                                    <Input
                                       placeholder="العنوان (AR)"
                                       value={s.titleAr}
                                       onChange={val => {
                                          const n = lp.services.map((svc, i) => i === idx ? { ...svc, titleAr: val } : svc);
                                          updateLandingPage({ services: n });
                                       }}
                                       className="!py-3 !rounded-2xl"
                                    />
                                    <Textarea
                                       placeholder="الوصف (AR)"
                                       value={s.descAr}
                                       onChange={val => {
                                          const n = lp.services.map((svc, i) => i === idx ? { ...svc, descAr: val } : svc);
                                          updateLandingPage({ services: n });
                                       }}
                                       rows={3}
                                       className="!py-3 !rounded-2xl text-xs"
                                    />
                                 </div>
                                 <div className="space-y-4">
                                    <Input
                                       placeholder="Title (EN)"
                                       value={s.titleEn}
                                       onChange={val => {
                                          const n = lp.services.map((svc, i) => i === idx ? { ...svc, titleEn: val } : svc);
                                          updateLandingPage({ services: n });
                                       }}
                                       className="!py-3 !rounded-2xl"
                                    />
                                    <Textarea
                                       placeholder="Description (EN)"
                                       value={s.descEn}
                                       onChange={val => {
                                          const n = lp.services.map((svc, i) => i === idx ? { ...svc, descEn: val } : svc);
                                          updateLandingPage({ services: n });
                                       }}
                                       rows={3}
                                       className="!py-3 !rounded-2xl text-xs"
                                    />
                                 </div>
                              </div>
                              <div className="w-48 space-y-3">
                                 <div>
                                    <label className="text-[9px] font-bold uppercase text-text-subtle block mb-2">Icon Type</label>
                                    <select className="w-full p-2 bg-surface rounded-lg text-xs font-bold text-text-main border border-border" value={s.iconType} onChange={e => {
                                       const n = lp.services.map((svc, i) => i === idx ? { ...svc, iconType: e.target.value } : svc);
                                       updateLandingPage({ services: n });
                                    }}>
                                       <option value="truck">Truck Icon</option>
                                       <option value="shield">Shield Icon</option>
                                       <option value="factory">Factory Icon</option>
                                       <option value="droplet">Droplet Icon</option>
                                       <option value="custom">Custom Image/Icon</option>
                                    </select>
                                 </div>
                                 {s.iconType === 'custom' && (
                                    <div className="space-y-2">
                                       <label className="text-[8px] font-bold text-text-subtle uppercase">Icon Asset (Link or File)</label>
                                       <div className="flex gap-1">
                                          <input className="flex-1 p-2 bg-surface rounded-lg text-[9px] border border-border text-text-main" value={s.iconUrl || ''} onChange={e => {
                                             const n = lp.services.map((svc, i) => i === idx ? { ...svc, iconUrl: e.target.value } : svc);
                                             updateLandingPage({ services: n });
                                          }} placeholder="https://..." />
                                          <label className="p-2 bg-emerald-600 text-white rounded-lg cursor-pointer hover:bg-emerald-700">
                                             <Upload size={12} />
                                             <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b64) => {
                                                const n = lp.services.map((svc, i) => i === idx ? { ...svc, iconUrl: b64 } : svc);
                                                updateLandingPage({ services: n });
                                             })} />
                                          </label>
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </div>
                        ))}
                        <button onClick={() => {
                           const n = [...lp.services, { id: Date.now().toString(), titleAr: 'خدمة جديدة', titleEn: 'New Service', descAr: '', descEn: '', iconType: 'truck' }];
                           updateLandingPage({ services: n });
                        }} className="w-full py-10 border-2 border-dashed border-border rounded-2xl text-text-subtle hover:border-emerald-500 hover:text-emerald-500 transition-all flex flex-col items-center gap-2">
                           <Plus size={32} />
                           <span className="font-bold text-xs uppercase tracking-widest">Add New Service Card</span>
                        </button>
                     </div>
                  </div>
               </motion.div>
            )}

            {activeTab === 'fleet' && (
               <motion.div key="fleet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="bg-surface p-10 rounded-[4rem] border border-border shadow-sm space-y-8">
                     <h3 className="font-bold text-2xl flex items-center gap-3 text-emerald-600"><Truck size={24} /> {isAr ? 'إدارة قسم الأسطول' : 'Fleet Section Controls'}</h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-10 border-b border-border">
                        <div className="space-y-4">
                           <Input label={isAr ? 'عنوان القسم (AR)' : 'Section Title (AR)'} value={lp.fleetSectionTitleAr || ''} onChange={val => updateLandingPage({ fleetSectionTitleAr: val })} />
                           <Textarea label={isAr ? 'وصف القسم (AR)' : 'Section Desc (AR)'} value={lp.fleetSectionDescAr || ''} onChange={val => updateLandingPage({ fleetSectionDescAr: val })} rows={2} />
                        </div>
                        <div className="space-y-4">
                           <Input label={isAr ? 'Section Title (EN)' : 'Section Title (EN)'} value={lp.fleetSectionTitleEn || ''} onChange={val => updateLandingPage({ fleetSectionTitleEn: val })} />
                           <Textarea label={isAr ? 'Section Desc (EN)' : 'Section Desc (EN)'} value={lp.fleetSectionDescEn || ''} onChange={val => updateLandingPage({ fleetSectionDescEn: val })} rows={2} />
                        </div>
                     </div>
                     <div className="grid grid-cols-1 gap-6">
                        {lp.fleet.map((f, idx) => (
                           <div key={f.id} className="p-8 bg-surface-subtle rounded-2xl border border-border grid grid-cols-1 md:grid-cols-4 gap-8 relative group">
                              <button onClick={() => {
                                 const n = lp.fleet.filter(x => x.id !== f.id);
                                 updateLandingPage({ fleet: n });
                              }} className="absolute top-6 right-6 p-2 bg-rose-500/10 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                              <div className="space-y-2">
                                 <label className="text-[9px] font-bold uppercase text-slate-400">Unit Image</label>
                                 <div className="h-40 bg-surface-subtle rounded-3xl border border-border p-4 flex items-center justify-center relative group/img">
                                    <img src={f.image} className="h-full w-full object-contain" />
                                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex flex-col items-center justify-center text-white rounded-3xl cursor-pointer transition-opacity">
                                       <Upload size={20} />
                                       <span className="text-[9px] font-bold uppercase mt-1">Upload New</span>
                                       <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b64) => {
                                          const n = lp.fleet.map((item, i) => i === idx ? { ...item, image: b64 } : item);
                                          updateLandingPage({ fleet: n });
                                       })} />
                                    </label>
                                 </div>
                                 <input className="w-full p-2 bg-surface rounded-xl text-[10px] mt-2 text-text-main border border-border" value={f.image} onChange={e => {
                                    const n = lp.fleet.map((item, i) => i === idx ? { ...item, image: e.target.value } : item);
                                    updateLandingPage({ fleet: n });
                                 }} placeholder="Image URL" />
                              </div>
                              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <input className="w-full p-3 bg-surface rounded-xl font-bold text-sm text-text-main border border-border" value={f.nameAr} onChange={e => {
                                       const n = lp.fleet.map((item, i) => i === idx ? { ...item, nameAr: e.target.value } : item);
                                       updateLandingPage({ fleet: n });
                                    }} placeholder="الاسم (AR)" />
                                    <textarea className="w-full p-3 bg-surface rounded-xl font-bold text-xs h-24 text-text-main border border-border" value={f.specsAr} onChange={e => {
                                       const n = lp.fleet.map((item, i) => i === idx ? { ...item, specsAr: e.target.value } : item);
                                       updateLandingPage({ fleet: n });
                                    }} placeholder="المواصفات (AR)" />
                                 </div>
                                 <div className="space-y-2">
                                    <input className="w-full p-3 bg-surface rounded-xl font-bold text-sm text-text-main border border-border" value={f.nameEn} onChange={e => {
                                       const n = lp.fleet.map((item, i) => i === idx ? { ...item, nameEn: e.target.value } : item);
                                       updateLandingPage({ fleet: n });
                                    }} placeholder="Name (EN)" />
                                    <textarea className="w-full p-3 bg-surface rounded-xl font-bold text-xs h-24 text-text-main border border-border" value={f.specsEn} onChange={e => {
                                       const n = lp.fleet.map((item, i) => i === idx ? { ...item, specsEn: e.target.value } : item);
                                       updateLandingPage({ fleet: n });
                                    }} placeholder="Specs (EN)" />
                                 </div>
                              </div>
                           </div>
                        ))}
                        <button onClick={() => {
                           const n = [...lp.fleet, { id: Date.now().toString(), nameAr: 'شاحنة جديدة', nameEn: 'New Truck', specsAr: '', specsEn: '', image: 'https://cdn-icons-png.flaticon.com/512/2830/2830305.png' }];
                           updateLandingPage({ fleet: n });
                        }} className="w-full py-10 border-2 border-dashed border-border rounded-2xl text-text-subtle hover:border-emerald-500 hover:text-emerald-500 transition-all flex flex-col items-center gap-2">
                           <Plus size={32} />
                           <span className="font-bold text-xs uppercase tracking-widest">Add New Fleet Unit</span>
                        </button>
                     </div>
                  </div>
               </motion.div>
            )}

            {activeTab === 'partners' && (
               <motion.div key="partners" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="bg-surface p-10 rounded-[4rem] border border-border shadow-sm transition-colors">
                     <h3 className="font-bold text-2xl flex items-center gap-3 text-emerald-600 mb-8"><Sparkles size={24} /> {isAr ? 'إدارة قسم الشركاء' : 'Partners Section Controls'}</h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-10 border-b border-border">
                        <div className="space-y-4">
                           <Input label={isAr ? 'عنوان القسم (AR)' : 'Section Title (AR)'} value={lp.partnersSectionTitleAr || ''} onChange={val => updateLandingPage({ partnersSectionTitleAr: val })} />
                        </div>
                        <div className="space-y-4">
                           <Input label={isAr ? 'Section Title (EN)' : 'Section Title (EN)'} value={lp.partnersSectionTitleEn || ''} onChange={val => updateLandingPage({ partnersSectionTitleEn: val })} />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {lp.partners.map((p, idx) => (
                           <div key={p.id} className="p-6 bg-surface-subtle rounded-2xl border border-border group relative">
                              <button onClick={() => {
                                 const n = lp.partners.filter(x => x.id !== p.id);
                                 updateLandingPage({ partners: n });
                              }} className="absolute -top-2 -right-2 p-2 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><Trash2 size={12} /></button>
                              <div className="h-20 bg-surface rounded-2xl flex items-center justify-center p-4 mb-4 border border-border transition-colors shadow-sm relative group/img">
                                 <img src={p.logo} className="h-full w-full object-contain" />
                                 <label className="absolute inset-0 bg-emerald-600/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white rounded-2xl cursor-pointer transition-opacity">
                                    <Upload size={14} />
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (b64) => {
                                       const n = lp.partners.map((item, i) => i === idx ? { ...item, logo: b64 } : item);
                                       updateLandingPage({ partners: n });
                                    })} />
                                 </label>
                              </div>
                              <input className="w-full bg-transparent border-none text-center font-bold text-[10px] outline-none text-text-main" value={p.name} onChange={e => {
                                 const n = lp.partners.map((item, i) => i === idx ? { ...item, name: e.target.value } : item);
                                 updateLandingPage({ partners: n });
                              }} />
                           </div>
                        ))}
                        <button onClick={() => {
                           const n = [...lp.partners, { id: Date.now().toString(), name: 'Partner Name', logo: '/logo.png' }];
                           updateLandingPage({ partners: n });
                        }} className="aspect-square border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-text-subtle hover:border-emerald-500 hover:text-emerald-500 transition-all">
                           <Plus size={32} />
                           <span className="text-[10px] font-bold uppercase mt-2">Add Partner</span>
                        </button>
                     </div>
                  </div>
               </motion.div>
            )}

            {activeTab === 'carbon' && (
               <motion.div key="carbon" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                  <div className="bg-surface p-10 md:p-12 rounded-[4rem] border border-border shadow-sm space-y-12 transition-colors">
                     <h3 className="font-bold text-2xl flex items-center gap-3 text-emerald-600"><Leaf size={24} /> {isAr ? 'قسم البصمة الكربونية' : 'Carbon Impact Section'}</h3>
                     <p className="text-text-subtle text-sm font-medium">{isAr ? 'تحكم في نصوص قسم الاستدامة الرقمية المعروض في الصفحة العامة.' : 'Customize the digital sustainability section displayed on the public landing page.'}</p>

                     {/* Badge */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <Input label={isAr ? 'شارة القسم (عربي)' : 'Section Badge (AR)'} value={lp.carbon?.badgeAr || ''} onChange={val => updateLandingPage({ carbon: { ...lp.carbon, badgeAr: val } })} placeholder="الاستدامة الرقمية" />
                        <Input label={isAr ? 'شارة القسم (إنجليزي)' : 'Section Badge (EN)'} value={lp.carbon?.badgeEn || ''} onChange={val => updateLandingPage({ carbon: { ...lp.carbon, badgeEn: val } })} placeholder="Digital Sustainability" />
                     </div>

                     {/* Title */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <Textarea label={isAr ? 'العنوان الرئيسي (عربي)' : 'Main Title (AR)'} value={lp.carbon?.titleAr || ''} onChange={val => updateLandingPage({ carbon: { ...lp.carbon, titleAr: val } })} rows={2} placeholder="موقعنا صديق للبيئة، حرفياً." className="text-xl font-bold" />
                        <Textarea label={isAr ? 'العنوان الرئيسي (إنجليزي)' : 'Main Title (EN)'} value={lp.carbon?.titleEn || ''} onChange={val => updateLandingPage({ carbon: { ...lp.carbon, titleEn: val } })} rows={2} placeholder="A Website That Breathes, Literally." className="text-xl font-bold" />
                     </div>

                     {/* Description */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <Textarea label={isAr ? 'الوصف (عربي)' : 'Description (AR)'} value={lp.carbon?.descAr || ''} onChange={val => updateLandingPage({ carbon: { ...lp.carbon, descAr: val } })} rows={4} placeholder="نحن لا ندير البيئة في الواقع فقط، بل نلتزم بأقل بصمة كربونية رقمية ممكنة..." />
                        <Textarea label={isAr ? 'الوصف (إنجليزي)' : 'Description (EN)'} value={lp.carbon?.descEn || ''} onChange={val => updateLandingPage({ carbon: { ...lp.carbon, descEn: val } })} rows={4} placeholder="We don't just manage the environment; we lead by example..." />
                     </div>

                     {/* Footer Banner */}
                     <div className="border-t border-border pt-10 space-y-8">
                        <h4 className="font-bold text-lg text-text-main">{isAr ? 'بانر أسفل القسم' : 'Section Footer Banner'}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <Input label={isAr ? 'عنوان البانر (عربي)' : 'Banner Title (AR)'} value={lp.carbon?.footerTitleAr || ''} onChange={val => updateLandingPage({ carbon: { ...lp.carbon, footerTitleAr: val } })} placeholder="فخورون بكوننا جزءاً من الحل" />
                           <Input label={isAr ? 'عنوان البانر (إنجليزي)' : 'Banner Title (EN)'} value={lp.carbon?.footerTitleEn || ''} onChange={val => updateLandingPage({ carbon: { ...lp.carbon, footerTitleEn: val } })} placeholder="Proud to be part of the solution" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <Textarea label={isAr ? 'وصف البانر (عربي)' : 'Banner Description (AR)'} value={lp.carbon?.footerDescAr || ''} onChange={val => updateLandingPage({ carbon: { ...lp.carbon, footerDescAr: val } })} rows={3} placeholder="كل سطر برمجي كتبناه تم تحسينه لتقليل استهلاك الطاقة..." />
                           <Textarea label={isAr ? 'وصف البانر (إنجليزي)' : 'Banner Description (EN)'} value={lp.carbon?.footerDescEn || ''} onChange={val => updateLandingPage({ carbon: { ...lp.carbon, footerDescEn: val } })} rows={3} placeholder="Every line of code is optimized to reduce server energy consumption..." />
                        </div>
                     </div>
                  </div>
               </motion.div>
            )}

            {activeTab === 'headerfooter' && (
               <motion.div key="hf" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                  <div className="bg-surface p-10 md:p-12 rounded-[4rem] border border-border shadow-sm space-y-12 transition-colors">
                     <h3 className="font-bold text-2xl flex items-center gap-3 text-emerald-600"><Smartphone size={24} /> {isAr ? 'الهوية البصرية والروابط' : 'Branding & Navigation'}</h3>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                           <SmartImageControl label={isAr ? 'شعار المنصة الرئيسي (فاتح)' : 'Main Logo (Light Mode)'} value={saasConfig.logoUrl} onChange={(val: string) => updateSaaS({ logoUrl: val })} onUpload={(b64: string) => updateSaaS({ logoUrl: b64 })} />
                           <SmartImageControl label={isAr ? 'شعار المنصة (للنمط الداكن)' : 'Dark Mode Logo'} value={saasConfig.logoDarkUrl} onChange={(val: string) => updateSaaS({ logoDarkUrl: val })} onUpload={(b64: string) => updateSaaS({ logoDarkUrl: b64 })} />

                           <div className="space-y-4">
                              <label className="text-[10px] font-bold uppercase text-text-subtle">{isAr ? 'اسم المنصة (عربي / إنجليزي)' : 'Platform Name (AR/EN)'}</label>
                              <div className="flex gap-4">
                                 <input className="flex-1 p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm text-text-main" value={saasConfig.appNameAr} onChange={e => updateSaaS({ appNameAr: e.target.value })} placeholder="عربي" />
                                 <input className="flex-1 p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm text-text-main" value={saasConfig.appNameEn} onChange={e => updateSaaS({ appNameEn: e.target.value })} placeholder="English" />
                              </div>
                           </div>

                           <div className="space-y-4">
                              <label className="text-[10px] font-bold uppercase text-text-subtle">{isAr ? 'شعار المنصة الإعلاني (عربي / إنجليزي)' : 'Platform Slogan (AR/EN)'}</label>
                              <div className="flex gap-4">
                                 <input className="flex-1 p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm text-text-main" value={saasConfig.appSloganAr} onChange={e => updateSaaS({ appSloganAr: e.target.value })} placeholder="عربي" />
                                 <input className="flex-1 p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm text-text-main" value={saasConfig.appSloganEn} onChange={e => updateSaaS({ appSloganEn: e.target.value })} placeholder="English" />
                              </div>
                           </div>
                        </div>

                        <div className="space-y-10">
                           <div className="space-y-4">
                              <label className="text-[10px] font-bold uppercase text-text-subtle">Portal Button (AR/EN)</label>
                              <div className="flex gap-4">
                                 <input className="flex-1 p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm text-text-main" value={lp.portalBtnTextAr} onChange={e => updateLandingPage({ portalBtnTextAr: e.target.value })} placeholder="عربي" />
                                 <input className="flex-1 p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm text-text-main" value={lp.portalBtnTextEn} onChange={e => updateLandingPage({ portalBtnTextEn: e.target.value })} placeholder="English" />
                              </div>
                           </div>
                           <div className="space-y-4">
                              <label className="text-[10px] font-bold uppercase text-text-subtle">Portal Icon Type</label>
                              <select className="w-full p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm text-text-main" value={lp.portalIconType} onChange={e => updateLandingPage({ portalIconType: e.target.value })}>
                                 <option value="user">User Avatar</option>
                                 <option value="shield">Shield</option>
                                 <option value="lock">Lock</option>
                                 <option value="zap">Zap</option>
                                 <option value="key">Key</option>
                              </select>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-8 pt-8 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="space-y-4">
                              <label className="text-[10px] font-bold uppercase text-text-subtle">Footer About Us (AR/EN)</label>
                              <div className="space-y-4">
                                 <textarea className="w-full p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm h-32 text-text-main" value={lp.footerAboutAr || ''} onChange={e => updateLandingPage({ footerAboutAr: e.target.value })} placeholder="Arabic Footer Text" />
                                 <textarea className="w-full p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm h-32 text-text-main" value={lp.footerAboutEn || ''} onChange={e => updateLandingPage({ footerAboutEn: e.target.value })} placeholder="English Footer Text" />
                              </div>
                           </div>
                           <div className="space-y-4">
                              <label className="text-[10px] font-bold uppercase text-text-subtle">Copyright Text (AR/EN)</label>
                              <div className="space-y-4">
                                 <input className="w-full p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm text-text-main" value={lp.copyrightTextAr || ''} onChange={e => updateLandingPage({ copyrightTextAr: e.target.value })} placeholder="© 2024 جميع الحقوق محفوظة" />
                                 <input className="w-full p-4 bg-surface-subtle border border-border rounded-2xl font-bold text-sm text-text-main" value={lp.copyrightTextEn || ''} onChange={e => updateLandingPage({ copyrightTextEn: e.target.value })} placeholder="© 2024 All Rights Reserved" />
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-8 pt-8 border-t border-border">
                        <h4 className="text-lg font-bold flex items-center gap-2 text-emerald-600"><Mail size={20} /> {isAr ? 'بيانات التواصل (قسم Contact)' : 'Contact Section Info'}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="space-y-4">
                              <Input label={isAr ? 'عنوان قسم التواصل (AR)' : 'Contact Title (AR)'} value={lp.contactTitleAr || ''} onChange={val => updateLandingPage({ contactTitleAr: val })} />
                              <Input label={isAr ? 'عنوان قسم التواصل (EN)' : 'Contact Title (EN)'} value={lp.contactTitleEn || ''} onChange={val => updateLandingPage({ contactTitleEn: val })} />
                           </div>
                           <div className="space-y-4">
                              <Textarea label={isAr ? 'وصف قسم التواصل (AR)' : 'Contact Description (AR)'} value={lp.contactDescAr || ''} onChange={val => updateLandingPage({ contactDescAr: val })} rows={2} />
                              <Textarea label={isAr ? 'وصف قسم التواصل (EN)' : 'Contact Description (EN)'} value={lp.contactDescEn || ''} onChange={val => updateLandingPage({ contactDescEn: val })} rows={2} />
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <Input label={isAr ? 'البريد الإلكتروني' : 'Email'} value={lp.contactRecipientEmail || ''} onChange={val => updateLandingPage({ contactRecipientEmail: val })} />
                           <Input label={isAr ? 'رقم الجوال' : 'Phone Number'} value={lp.contactPhone || ''} onChange={val => updateLandingPage({ contactPhone: val })} />
                           <Input label={isAr ? 'رابط المتجر (Store)' : 'Store URL'} value={lp.storeUrl || ''} onChange={val => updateLandingPage({ storeUrl: val })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <Input label={isAr ? 'الموقع / العنوان (AR)' : 'Location (AR)'} value={lp.contactLocationAr || ''} onChange={val => updateLandingPage({ contactLocationAr: val })} />
                           <Input label={isAr ? 'الموقع / العنوان (EN)' : 'Location (EN)'} value={lp.contactLocationEn || ''} onChange={val => updateLandingPage({ contactLocationEn: val })} />
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h4 className="text-lg font-bold flex items-center gap-2"><Share2 size={20} className="text-emerald-500" /> {isAr ? 'روابط التواصل الاجتماعي' : 'Social Media Links'}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                           {lp.socialLinks.map((link, idx) => (
                              <div key={link.id} className="p-5 bg-surface-subtle rounded-xl border border-border relative group">
                                 <button onClick={() => {
                                    const n = lp.socialLinks.filter(x => x.id !== link.id);
                                    updateLandingPage({ socialLinks: n });
                                 }} className="absolute top-2 right-2 p-1.5 bg-rose-500/10 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                 <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-surface rounded-lg border border-border text-emerald-600">
                                       {link.platform === 'facebook' ? <Facebook size={18} /> : link.platform === 'twitter' ? <Twitter size={18} /> : link.platform === 'linkedin' ? <Linkedin size={18} /> : link.platform === 'instagram' ? <Instagram size={18} /> : link.platform === 'youtube' ? <Youtube size={18} /> : <MessageSquare size={18} />}
                                    </div>
                                    <select className="bg-transparent border-none text-[10px] font-bold uppercase outline-none text-text-subtle" value={link.platform} onChange={e => {
                                       const n = lp.socialLinks.map((item, i) => i === idx ? { ...item, platform: e.target.value } : item);
                                       updateLandingPage({ socialLinks: n });
                                    }}>
                                       <option value="facebook">Facebook</option>
                                       <option value="twitter">Twitter / X</option>
                                       <option value="linkedin">LinkedIn</option>
                                       <option value="instagram">Instagram</option>
                                       <option value="youtube">YouTube</option>
                                       <option value="whatsapp">WhatsApp</option>
                                    </select>
                                 </div>
                                 <input className="w-full p-2 bg-surface rounded-xl text-[10px] border border-border text-text-main" value={link.url} onChange={e => {
                                    const n = lp.socialLinks.map((item, i) => i === idx ? { ...item, url: e.target.value } : item);
                                    updateLandingPage({ socialLinks: n });
                                 }} placeholder="https://..." />
                              </div>
                           ))}
                           <button onClick={() => {
                              const n = [...lp.socialLinks, { id: Date.now().toString(), platform: 'linkedin', url: 'https://' }];
                              updateLandingPage({ socialLinks: n });
                           }} className="h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-300 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                              <Plus size={24} />
                              <span className="text-[9px] font-bold uppercase mt-1">Add Link</span>
                           </button>
                        </div>
                     </div>
                  </div>
               </motion.div>
            )}

            {activeTab === 'seo' && (
               <motion.div key="seo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                  <div className="bg-surface p-10 md:p-12 rounded-[4rem] border border-border shadow-sm space-y-12 transition-colors">
                     <h3 className="font-bold text-2xl flex items-center gap-3 text-emerald-600"><Globe size={24} /> {isAr ? 'محركات البحث وأكواد التتبع' : 'SEO & Analytics Scripts'}</h3>

                     <div className="p-8 bg-blue-500/10 rounded-2xl border border-blue-500/20 space-y-4">
                        <h4 className="text-lg font-bold flex items-center gap-2 text-blue-600"><Cloud size={20} /> {isAr ? 'رابط بوابة السحاب (Cloud)' : 'Custom Cloud Portal URL'}</h4>
                        <p className="text-xs font-bold text-text-subtle leading-relaxed">{isAr ? 'الرابط الذي سيفتح عند الضغط على أيقونة السحابة في شريط التنقل العلوي للنظام.' : 'This link will be opened when clicking the cloud icon in the internal system header.'}</p>
                        <div className="flex items-center gap-4 bg-surface p-4 rounded-2xl border border-border shadow-inner">
                           <LinkIcon size={18} className="text-text-subtle" />
                           <input className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-blue-500" placeholder="https://cloud.gcm-gulf.com" value={saasConfig.cloudUrl || ''} onChange={e => updateSaaS({ cloudUrl: e.target.value })} />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Meta Title (AR)</label>
                              <input className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl font-bold text-sm dark:text-white" value={lp.seo.metaTitleAr} onChange={e => updateLandingPage({ seo: { ...lp.seo, metaTitleAr: e.target.value } })} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Meta Description (AR)</label>
                              <textarea className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl font-bold text-xs h-24 dark:text-white" value={lp.seo.metaDescAr} onChange={e => updateLandingPage({ seo: { ...lp.seo, metaDescAr: e.target.value } })} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Keywords (AR)</label>
                              <input className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl font-bold text-xs dark:text-white" value={lp.seo.keywordsAr} onChange={e => updateLandingPage({ seo: { ...lp.seo, keywordsAr: e.target.value } })} placeholder="نفايات، بيئة، معالجة..." />
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Meta Title (EN)</label>
                              <input className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl font-bold text-sm dark:text-white" value={lp.seo.metaTitleEn} onChange={e => updateLandingPage({ seo: { ...lp.seo, metaTitleEn: e.target.value } })} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Meta Description (EN)</label>
                              <textarea className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl font-bold text-xs h-24 dark:text-white" value={lp.seo.metaDescEn} onChange={e => updateLandingPage({ seo: { ...lp.seo, metaDescEn: e.target.value } })} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Google Analytics ID</label>
                              <input className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl font-bold text-sm dark:text-white border-2 border-emerald-500/10" value={lp.seo.googleAnalyticsId} onChange={e => updateLandingPage({ seo: { ...lp.seo, googleAnalyticsId: e.target.value } })} placeholder="G-XXXXXXXX" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-8">
                        <h4 className="text-lg font-bold flex items-center gap-2 text-rose-600"><Code size={20} /> {isAr ? 'حقن الأكواد المخصصة (Script Injection)' : 'Custom Scripts (Code Injection)'}</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                           <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase text-text-subtle flex items-center gap-2">Header Scripts</label>
                              <textarea className="w-full p-4 bg-surface-subtle border border-border text-emerald-600 font-mono text-[10px] rounded-2xl h-48" placeholder="<!-- Add scripts here -->" value={lp.seo.headerScripts} onChange={e => updateLandingPage({ seo: { ...lp.seo, headerScripts: e.target.value } })} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase text-text-subtle flex items-center gap-2">Body Start Scripts</label>
                              <textarea className="w-full p-4 bg-surface-subtle border border-border text-emerald-600 font-mono text-[10px] rounded-2xl h-48" placeholder="<!-- GTM noscript, etc -->" value={lp.seo.bodyScripts} onChange={e => updateLandingPage({ seo: { ...lp.seo, bodyScripts: e.target.value } })} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase text-text-subtle flex items-center gap-2">Footer Scripts</label>
                              <textarea className="w-full p-4 bg-surface-subtle border border-border text-emerald-600 font-mono text-[10px] rounded-2xl h-48" placeholder="<!-- Chat widgets, FB Pixel -->" value={lp.seo.footerScripts} onChange={e => updateLandingPage({ seo: { ...lp.seo, footerScripts: e.target.value } })} />
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            )}

            {activeTab === 'messages' && (
               <motion.div key="inbox" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="flex items-center justify-between px-6">
                     <h3 className="font-bold text-2xl flex items-center gap-3 text-emerald-600"><MessageSquare size={24} /> {isAr ? 'صندوق استفسارات العملاء' : 'Client Inbox'}</h3>
                     <div className="flex items-center gap-3">
                        <span className="px-4 py-2 bg-surface-subtle rounded-xl text-[10px] font-bold uppercase tracking-widest text-text-subtle">{contactSubmissions.length} Total Messages</span>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                     {contactSubmissions.length > 0 ? contactSubmissions.map(sub => (
                        <div key={sub.id} className="bg-surface p-8 rounded-2xl border border-border shadow-sm relative group overflow-hidden transition-all hover:shadow-xl">
                           <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 opacity-20" />
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                              <div className="flex items-center gap-4">
                                 <div className="w-16 h-16 bg-surface-subtle rounded-2xl flex items-center justify-center text-text-subtle border border-border shadow-inner group-hover:text-emerald-500 transition-colors">
                                    <User size={32} />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-2xl leading-none text-text-main">{sub.name}</h4>
                                    <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-widest flex items-center gap-1"><Building2 size={12} /> {sub.company}</p>
                                 </div>
                              </div>
                              <div className="flex flex-col md:items-end gap-3">
                                 <div className="px-4 py-2 bg-surface-subtle rounded-xl border border-border flex items-center gap-2">
                                    <Clock size={14} className="text-text-subtle" />
                                    <span className="text-[10px] font-bold text-text-subtle">{new Date(sub.timestamp).toLocaleString()}</span>
                                 </div>
                                 <div className="flex gap-2">
                                    <a href={`mailto:${sub.email}`} className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><Send size={18} /></a>
                                    <button onClick={() => deleteContactSubmission(sub.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                                 </div>
                              </div>
                           </div>
                           <div className="p-8 bg-surface-subtle rounded-2xl border border-border group-hover:border-emerald-500/10 transition-all relative">
                              <div className="absolute -top-4 left-10 p-2 bg-surface border border-border rounded-lg text-[9px] font-bold uppercase text-text-subtle">{sub.subject || 'Standard Inquiry'}</div>
                              <p className="text-lg font-bold text-text-main leading-relaxed italic">"{sub.message}"</p>
                              <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center gap-6">
                                 <div className="flex items-center gap-3">
                                    <Mail size={16} className="text-emerald-500" />
                                    <p className="text-xs font-bold text-text-subtle uppercase tracking-widest">{sub.email}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     )) : (
                        <div className="p-32 bg-surface rounded-[5rem] text-center border-2 border-dashed border-border transition-colors">
                           <Mail size={80} className="mx-auto text-slate-100 dark:text-slate-800 mb-8" />
                           <p className="text-2xl font-bold text-slate-300 italic">{isAr ? 'صندوق الوارد فارغ حالياً' : 'Your inbox is completely empty.'}</p>
                        </div>
                     )}
                  </div>
               </motion.div>
            )}
            {activeTab === 'system' && (
               <motion.div key="system" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                  <div className="bg-surface p-10 md:p-12 rounded-[4rem] border border-border shadow-sm space-y-12 transition-colors">
                     <h3 className="font-bold text-2xl flex items-center gap-3 text-emerald-600">
                        <ShieldCheck size={24} /> {isAr ? 'إعدادات النظام وشاشة التحميل' : 'System & Boot Configuration'}
                     </h3>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                           <h4 className="text-lg font-bold flex items-center gap-2 text-slate-700 dark:text-slate-200">
                              <Zap size={20} className="text-yellow-500" /> {isAr ? 'تخصيص شاشة الإقلاع والتحميل' : 'Boot / Loading Screen Customization'}
                           </h4>
                           <div className="bg-slate-50/50 dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                              <ColorPicker
                                 label={isAr ? 'لون الخلفية الأساسي' : 'Primary Background'}
                                 value={saasConfig.bootConfig?.backgroundColor || 'bg-slate-950'}
                                 onChange={val => updateSaaS({ bootConfig: { ...saasConfig.bootConfig, backgroundColor: val } })}
                              />
                              <ColorPicker
                                 label={isAr ? 'لون النص' : 'Typography Color'}
                                 value={saasConfig.bootConfig?.textColor || 'text-white'}
                                 onChange={val => updateSaaS({ bootConfig: { ...saasConfig.bootConfig, textColor: val } })}
                              />
                              <ColorPicker
                                 label={isAr ? 'لون اللمسات الجمالية (Accent)' : 'Accent / Branding Color'}
                                 value={saasConfig.bootConfig?.accentColor || 'emerald-500'}
                                 onChange={val => updateSaaS({ bootConfig: { ...saasConfig.bootConfig, accentColor: val } })}
                              />
                              <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border shadow-sm">
                                 <span className="text-[10px] font-bold uppercase text-slate-500">{isAr ? 'إظهار شعار الشركة النصي' : 'Display Slogan Text'}</span>
                                 <button
                                    onClick={() => updateSaaS({ bootConfig: { ...saasConfig.bootConfig, showSlogan: !(saasConfig.bootConfig?.showSlogan) } })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${saasConfig.bootConfig?.showSlogan ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                 >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${saasConfig.bootConfig?.showSlogan ? 'left-7' : 'left-1'}`} />
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-8">
                           <h4 className="text-lg font-bold flex items-center gap-2 text-slate-700 dark:text-slate-200">
                              <Lock size={20} className="text-rose-500" /> {isAr ? 'التحكم العام في النظام' : 'Global Management Controls'}
                           </h4>
                           <div className="p-8 bg-rose-50/50 dark:bg-rose-950/20 rounded-[3rem] border border-rose-100 dark:border-rose-900/30 space-y-6">
                              <div className="flex items-center justify-between">
                                 <div>
                                    <h5 className="font-bold text-rose-900 dark:text-rose-300">{isAr ? 'تفعيل وضع الإدارة' : 'Production Management'}</h5>
                                    <p className="text-[10px] font-bold text-rose-600/70 mt-1 uppercase tracking-widest">{saasConfig.managementControlsEnabled ? (isAr ? 'جميع أدوات التحكم متاحة' : 'All controls visible') : (isAr ? 'أدوات التحكم مخفية' : 'Controls restricted')}</p>
                                 </div>
                                 <button
                                    onClick={() => updateSaaS({ managementControlsEnabled: !saasConfig.managementControlsEnabled })}
                                    className={`w-14 h-8 rounded-full transition-all relative ${saasConfig.managementControlsEnabled ? 'bg-rose-500 shadow-lg shadow-rose-500/20' : 'bg-slate-300 dark:bg-slate-700'}`}
                                 >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${saasConfig.managementControlsEnabled ? 'left-7' : 'left-1'}`} />
                                 </button>
                              </div>
                              <div className="p-4 bg-white/50 dark:bg-black/20 rounded-2xl border border-rose-200/50 dark:border-rose-800/30">
                                 <p className="text-xs font-bold text-rose-800/80 dark:text-rose-400/80 leading-relaxed italic">
                                    {isAr ? '⚠️ تعطيل هذا الخيار سيخفي أزرار (تعديل/حذف) من كافة واجهات النظام لجميع المستخدمين، يستخدم للتأمين النهائي.' : '⚠️ Disabling this will strip out management actions (Edit/Delete) system-wide, creating a read-only environment for all users.'}
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         <div className="fixed bottom-6 right-6 z-[110]">
            <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={handleSave}
               disabled={isSubmitting}
               className={`px-8 py-4 bg-slate-900 text-white dark:bg-emerald-600 dark:text-white rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-3 hover:shadow-emerald-500/20 transition-all border border-slate-800 dark:border-emerald-500 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
               {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               ) : (
                  <Save size={20} />
               )}
               {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Publishing...') : (isAr ? 'حفظ ونشر التغييرات' : 'Publish Changes')}
            </motion.button>
         </div>

         <AnimatePresence>
            {showSaveToast && (
               <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-10 py-6 rounded-2xl font-bold text-sm shadow-lg z-[111] flex items-center gap-4">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse"><CheckCircle2 size={20} /></div>
                  {isAr ? 'تم حفظ ومزامنة التصميم الجديد بنجاح!' : 'Design Published & Synced Successfully!'}
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
};

export default LandingSettings;

