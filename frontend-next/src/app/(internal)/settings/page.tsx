"use client";

import React, { useState, useEffect } from 'react';
import { useStore } from '@/context';
import { ENDPOINTS } from '@/api/endpoints';
import { exportMultiSheetExcel } from '@/utils/excelUtils';
import axios from 'axios';
import {
  Palette, Globe, Layout, CheckCircle, Save, Languages, Monitor,
  Upload, Image as ImageIcon, Zap, Download, Link2, Bot, Sparkles, FileText, Smartphone, Phone
} from 'lucide-react';
import { Input, Card, Modal, Button, SystemAudit } from '@/components';
import TemplateSettings from './TemplateSettings';
import { toast } from '@/utils/toast';
import { ShieldAlert } from 'lucide-react';

type SettingsTab = 'identity' | 'operations' | 'interface' | 'ai' | 'templates' | 'audit';

const Settings: React.FC = () => {
  const { saasConfig, updateSaaS, darkMode, setDarkMode, exportEnabled, setExportEnabled, currentUser, api } = useStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('identity');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupFormat, setBackupFormat] = useState<'sql' | 'json' | 'xlsx'>('sql');
  const [backupOptions, setBackupOptions] = useState({
    database: true,
    logs: true,
    trips: true,
    assets: true
  });
  const [isExporting, setIsExporting] = useState(false);

  // WhatsApp State
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{ isReady: boolean; qrCode: string | null }>({ isReady: false, qrCode: null });
  const [isFetchingQr, setIsFetchingQr] = useState(false);

  const isAr = saasConfig.language === 'ar';

  // Local state for support contacts to avoid race conditions on every keystroke
  const [supportPhone, setSupportPhone] = useState(saasConfig.support_phone || '');
  const [supportWhatsapp, setSupportWhatsapp] = useState(saasConfig.support_whatsapp || '');
  const [isSavingSupport, setIsSavingSupport] = useState(false);
  const [supportSaved, setSupportSaved] = useState(false);

  // Sync local state when saasConfig changes (e.g. on page load)
  useEffect(() => {
    setSupportPhone(saasConfig.support_phone || '');
    setSupportWhatsapp(saasConfig.support_whatsapp || '');
  }, [saasConfig.support_phone, saasConfig.support_whatsapp]);

  const handleSaveSupportContacts = async () => {
    setIsSavingSupport(true);
    setSupportSaved(false);
    try {
      await updateSaaS({ support_phone: supportPhone, support_whatsapp: supportWhatsapp });
      setSupportSaved(true);
      setTimeout(() => setSupportSaved(false), 3000);
    } catch (err) {
      console.error('[Settings] Failed to save support contacts:', err);
    } finally {
      setIsSavingSupport(false);
    }
  };


  const fetchWhatsappStatus = async () => {
    setIsFetchingQr(true);
    try {
      const res = await api.getWhatsappStatus();
      setWhatsappStatus(res);
    } catch (err) {
      console.error('Failed to fetch WhatsApp status', err);
    } finally {
      setIsFetchingQr(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWhatsappModalOpen && !whatsappStatus.isReady) {
      interval = setInterval(() => {
        fetchWhatsappStatus();
      }, 3000); // Poll every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWhatsappModalOpen, whatsappStatus.isReady]);

  const openWhatsappModal = () => {
    setIsWhatsappModalOpen(true);
    fetchWhatsappStatus();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSaaS({ logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs: { key: SettingsTab; label: string; icon: any }[] = [
    { key: 'identity', label: isAr ? 'هوية المنصة' : 'Platform Identity', icon: Palette },
    { key: 'operations', label: isAr ? 'التحكم والعمليات' : 'Data & Ops', icon: Zap },
    { key: 'interface', label: isAr ? 'مظهر الواجهة' : 'Appearance', icon: Monitor },
    { key: 'ai', label: isAr ? 'الذكاء الاصطناعي' : 'AI Engine', icon: Bot },
    { key: 'templates', label: isAr ? 'قوالب التقارير' : 'Print Templates', icon: FileText },
    { key: 'audit', label: isAr ? 'التدقيق والتعارضات' : 'Audit & Integrity', icon: ShieldAlert },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-primary tracking-tight flex items-center gap-3">
            <Layout className="text-primary fill-primary/10" />
            {isAr ? 'إعدادات النظام' : 'System Settings'}
          </h1>
          <p className="text-text-subtle font-bold mt-1">
            {isAr ? 'تخصيص الهوية، العمليات، والمظهر العام للمنصة' : 'Customize identity, operations, and platform appearance.'}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 bg-surface p-1.5 rounded-2xl border border-border w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.key
              ? 'bg-primary text-surface shadow-lg shadow-primary/20'
              : 'text-text-subtle hover:text-text-main hover:bg-surface-subtle'
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {/* --- IDENTITY TAB --- */}
        {activeTab === 'identity' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Branding Section */}
            <div className="bg-surface rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
              <div className="p-8 md:p-10 space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border/50">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-text-main flex items-center gap-3">
                      <Palette className="text-primary" size={28} />
                      {isAr ? 'الهوية التجارية' : 'Brand Identity'}
                    </h3>
                    <p className="text-sm text-text-subtle font-medium">{isAr ? 'تخصيص الشعار والألوان الأساسية للمنصة' : 'Customize platform branding and primary color system.'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                  {/* Logo Upload Box */}
                  <div className="lg:col-span-2">
                    <div className="relative group">
                      <div className="aspect-square bg-surface-subtle rounded-[2rem] border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 group-hover:bg-primary/5">
                        {saasConfig.logoUrl ? (
                          <img src={saasConfig.logoUrl} className="w-full h-full object-contain p-6" alt="SaaS Logo" />
                        ) : (
                          <ImageIcon className="text-text-subtle opacity-30" size={60} />
                        )}
                      </div>
                      <label className="absolute inset-0 bg-primary/90 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-all duration-300 rounded-[2rem] backdrop-blur-sm">
                        <Upload size={40} className="animate-bounce" />
                        <span className="text-sm font-black uppercase mt-3 tracking-widest">{isAr ? 'شعار جديد' : 'New Logo'}</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </label>
                    </div>
                  </div>

                  {/* Logo Details & Color Picker */}
                  <div className="lg:col-span-3 space-y-10">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-sm font-black text-text-main uppercase tracking-wider">{isAr ? 'رابط الشعار المباشر' : 'Direct Logo URL'}</label>
                        <p className="text-[11px] font-bold text-text-subtle">{isAr ? 'يفضل استخدام تنسيق PNG أو SVG بخلفية شفافة' : 'Use SVG or transparent PNG for best results across all themes.'}</p>
                      </div>
                      <Input
                        icon={Link2}
                        value={saasConfig.logoUrl || ''}
                        onChange={val => updateSaaS({ logoUrl: val })}
                        placeholder="https://..."
                        className="!py-4 !rounded-[1.25rem] shadow-inner bg-surface-subtle border-none"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-1">
                        <label className="text-sm font-black text-text-main uppercase tracking-wider">{isAr ? 'اللون الرئيسي للنظام' : 'System Accent Color'}</label>
                        <p className="text-[11px] font-bold text-text-subtle">{isAr ? 'سيتم تطبيق هذا اللون على الأزرار والروابط والعناصر النشطة' : 'This color will define buttons, links, and active interface elements.'}</p>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { hex: '#10b981', label: 'Emerald' },
                          { hex: '#3b82f6', label: 'Blue' },
                          { hex: '#8b5cf6', label: 'Violet' },
                          { hex: '#f43f5e', label: 'Rose' },
                          { hex: '#f59e0b', label: 'Amber' }
                        ].map((c) => (
                          <button
                            key={c.hex}
                            onClick={() => updateSaaS({ primaryColor: c.hex })}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${saasConfig.primaryColor === c.hex ? 'ring-4 ring-offset-2 ring-primary dark:ring-offset-surface scale-110 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                            style={{ backgroundColor: c.hex }}
                          >
                            {saasConfig.primaryColor === c.hex && <CheckCircle className="text-white drop-shadow-md" size={16} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Naming Section */}
            <div className="bg-surface rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
              <div className="p-8 md:p-10 space-y-10">
                <div className="flex flex-col md:items-center justify-between gap-6 pb-8 border-b border-border/50">
                  <div className="space-y-1 w-full text-center">
                    <h3 className="text-2xl font-black text-text-main flex items-center justify-center gap-3">
                      <Languages className="text-primary" size={28} />
                      {isAr ? 'مسميات المنصة' : 'Platform Naming'}
                    </h3>
                    <p className="text-sm text-text-subtle font-medium">{isAr ? 'تخصيص أسماء وشعارات المنصة باللغتين' : 'Define how your brand appears in localized interfaces.'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Arabic Naming */}
                  <div className="p-8 bg-surface-subtle rounded-[2rem] border border-border/50 space-y-6 group transition-all hover:border-primary/30">
                    <div className="flex items-center gap-3 text-primary">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-bold">ع</div>
                      <span className="text-sm font-black uppercase tracking-widest">{isAr ? 'الهوية العربية' : 'Arabic Version'}</span>
                    </div>
                    <div className="space-y-4">
                      <Input
                        label={isAr ? 'اسم المنصة الكامل' : 'Full Platform Name'}
                        value={saasConfig.appNameAr}
                        onChange={val => updateSaaS({ appNameAr: val })}
                        dir="rtl"
                        className="!py-4 !rounded-2xl bg-surface border-none shadow-sm"
                      />
                      <Input
                        label={isAr ? 'الشعار النصي (Slogan)' : 'Brand Slogan'}
                        value={saasConfig.appSloganAr}
                        onChange={val => updateSaaS({ appSloganAr: val })}
                        dir="rtl"
                        className="!py-4 !rounded-2xl bg-surface border-none shadow-sm"
                      />
                    </div>
                  </div>

                  {/* English Naming */}
                  <div className="p-8 bg-surface-subtle rounded-[2rem] border border-border/50 space-y-6 group transition-all hover:border-primary/30">
                    <div className="flex items-center gap-3 text-primary">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-bold">EN</div>
                      <span className="text-sm font-black uppercase tracking-widest">{isAr ? 'الهوية الإنجليزية' : 'English Version'}</span>
                    </div>
                    <div className="space-y-4">
                      <Input
                        label="Full Platform Name"
                        value={saasConfig.appNameEn}
                        onChange={val => updateSaaS({ appNameEn: val })}
                        dir="ltr"
                        className="!py-4 !rounded-2xl bg-surface border-none shadow-sm"
                      />
                      <Input
                        label="Brand Slogan"
                        value={saasConfig.appSloganEn}
                        onChange={val => updateSaaS({ appSloganEn: val })}
                        dir="ltr"
                        className="!py-4 !rounded-2xl bg-surface border-none shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                  {/* Support Contact Numbers */}
                  <div className="p-8 bg-surface-subtle rounded-[2rem] border border-border/50 space-y-6 group transition-all hover:border-primary/30">
                    <div className="flex items-center gap-3 text-primary">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Phone size={18} />
                      </div>
                      <span className="text-sm font-black uppercase tracking-widest">{isAr ? 'أرقام الدعم الفني' : 'Support Contacts'}</span>
                    </div>
                    <p className="text-xs text-text-subtle">{isAr ? 'هذه الأرقام ستظهر في زرار "تواصل معنا" في الشريط الجانبي.' : 'These numbers will appear in the sidebar Help Center button.'}</p>
                    <div className="space-y-4">
                      <Input
                        label={isAr ? 'رقم الهاتف (اتصال مباشر)' : 'Phone Number (Direct Call)'}
                        placeholder="+966 5X XXX XXXX"
                        value={supportPhone}
                        onChange={val => setSupportPhone(val)}
                        dir="ltr"
                        className="!py-4 !rounded-2xl bg-surface border-none shadow-sm"
                      />
                      <Input
                        label={isAr ? 'رقم واتساب' : 'WhatsApp Number'}
                        placeholder="+966 5X XXX XXXX"
                        value={supportWhatsapp}
                        onChange={val => setSupportWhatsapp(val)}
                        dir="ltr"
                        className="!py-4 !rounded-2xl bg-surface border-none shadow-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        onClick={handleSaveSupportContacts}
                        isLoading={isSavingSupport}
                        icon={supportSaved ? CheckCircle : Save}
                        className={`transition-all ${supportSaved ? '!bg-success !border-success text-white' : ''}`}
                      >
                        {supportSaved
                          ? (isAr ? 'تم الحفظ ✓' : 'Saved ✓')
                          : (isAr ? 'حفظ أرقام الدعم' : 'Save Support Numbers')}
                      </Button>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* --- OPERATIONS TAB --- */}
        {activeTab === 'operations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-8 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2"><Save size={20} className="text-primary" /> {isAr ? 'النظام وقاعدة البيانات' : 'System & Database'}</h3>
              <p className="text-xs font-medium text-text-subtle leading-relaxed">
                {isAr ? 'يمكنك تصدير قاعدة البيانات كاملة للحفظ الخارجي.' : 'Export full database SQL dump for external backup.'}
              </p>
              <Button
                variant="primary"
                onClick={() => setIsBackupModalOpen(true)}
                className="w-full py-4 text-xs font-black uppercase tracking-widest"
                icon={Download}
              >
                {isAr ? 'تحميل نسخة احتياطية' : 'Download Backup (.sql)'}
              </Button>
            </Card>

            <Modal
              isOpen={isBackupModalOpen}
              onClose={() => setIsBackupModalOpen(false)}
              title={isAr ? 'تصدير نسخة احتياطية تفصيلية' : 'Detailed Backup Export'}
            >
              <div className="space-y-6 p-2">
                <p className="text-sm text-text-subtle font-medium">
                  {isAr ? 'حدد البيانات التي تود تضمينها في النسخة الاحتياطية:' : 'Select the data you want to include in the backup:'}
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {(['database', 'logs', 'trips', 'assets'] as const).map(opt => (
                    <label key={opt} className="flex items-center justify-between p-4 bg-surface-subtle border border-border rounded-2xl cursor-pointer hover:border-primary transition-all">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold capitalize">{opt}</span>
                        <span className="text-[10px] text-text-subtle">{isAr ? `تضمين جميع سجلات ${opt}` : `Include all ${opt} records`}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={backupOptions[opt]}
                        onChange={(e) => setBackupOptions(prev => ({ ...prev, [opt]: e.target.checked }))}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                    </label>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-sm text-text-subtle font-medium">
                    {isAr ? 'صيغة التصدير:' : 'Export Format:'}
                  </p>
                  <div className="flex gap-4">
                    {(['sql', 'json', 'xlsx'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setBackupFormat(f)}
                        className={`flex-1 py-3 rounded-xl border-2 transition-all font-bold uppercase text-xs tracking-widest ${backupFormat === f ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text-subtle hover:border-text-subtle'}`}
                      >
                        {f === 'sql' ? (isAr ? 'SQL' : 'SQL') :
                          f === 'xlsx' ? (isAr ? 'Excel' : 'Excel') :
                            (isAr ? 'JSON' : 'JSON')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="ghost" onClick={() => setIsBackupModalOpen(false)} className="flex-1">
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={async () => {
                      const params = new URLSearchParams();
                      Object.entries(backupOptions).forEach(([k, v]) => {
                        params.append(k, v ? '1' : '0');
                      });

                      const token = localStorage.getItem('gcm_jwt_token') || '';
                      const authHeaders = { Authorization: `Bearer ${token}` };

                      if (backupFormat === 'xlsx') {
                        setIsExporting(true);
                        try {
                          params.append('format', 'json');
                          const url = `${ENDPOINTS.SYSTEM.BACKUP}?${params.toString()}`;
                          const response = await axios.get(url, { headers: authHeaders });
                          const data = response.data;

                          if (!data || typeof data !== 'object') {
                            throw new Error(isAr ? 'فشل تحميل البيانات أو البيانات فارغة' : 'Failed to load data or data is empty');
                          }

                          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                          const success = exportMultiSheetExcel(data, `GCM_FULL_BACKUP_${timestamp}`);

                          if (success) {
                            setIsBackupModalOpen(false);
                          } else {
                            toast.error(isAr ? 'فشل تصدير ملف Excel. تأكد من وجود بيانات في النظام.' : 'Excel export failed. Ensure there is data in the system.');
                          }
                        } catch (e: any) {
                          console.error('Excel Export Error:', e);
                          toast.error(isAr ? `خطأ في التصدير: ${e.response?.data?.error || e.message}` : `Export error: ${e.response?.data?.error || e.message}`);
                        } finally {
                          setIsExporting(false);
                        }
                      } else {
                        setIsExporting(true);
                        try {
                          params.append('format', backupFormat);
                          const url = `${ENDPOINTS.SYSTEM.BACKUP}?${params.toString()}`;
                          const response = await fetch(url, { headers: authHeaders });
                          if (!response.ok) throw new Error(`HTTP ${response.status}`);
                          const blob = await response.blob();
                          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                          const ext = backupFormat === 'json' ? 'json' : 'sql';
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.download = `GCM_BACKUP_${timestamp}.${ext}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(link.href);
                          setIsBackupModalOpen(false);
                        } catch (e: any) {
                          console.error('Backup Download Error:', e);
                          toast.error(isAr ? `خطأ في تحميل النسخة الاحتياطية: ${e.message}` : `Backup download error: ${e.message}`);
                        } finally {
                          setIsExporting(false);
                        }
                      }
                    }}
                    isLoading={isExporting}
                  >
                    {isAr ? 'بدء التصدير' : 'Start Export'}
                  </Button>
                </div>
              </div>
            </Modal>

            <Card className={`p-8 space-y-6 transition-all ${exportEnabled ? 'border-primary/40' : ''}`}>
              <h3 className="text-lg font-bold flex items-center gap-2"><Upload size={20} className={exportEnabled ? "text-primary" : "text-text-subtle"} /> {isAr ? 'خيارات التصدير' : 'Export Controls'}</h3>
              <p className="text-xs font-medium text-text-subtle leading-relaxed">
                {isAr ? 'تفعيل ميزات تصدير واستيراد ملفات Excel في الجداول.' : 'Enable Excel export/import features across tables.'}
              </p>
              <div className="flex items-center justify-between bg-surface-subtle p-4 rounded-2xl border border-border">
                <span className={`text-xs font-bold uppercase tracking-widest ${exportEnabled ? 'text-primary' : 'text-text-subtle'}`}>
                  {exportEnabled ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
                </span>
                <button
                  onClick={() => setExportEnabled(!exportEnabled)}
                  className={`w-14 h-8 rounded-full transition-all relative ${exportEnabled ? 'bg-primary' : 'bg-border'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-surface rounded-full transition-all shadow-sm ${exportEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </Card>

            <Card className="p-8 space-y-6 md:col-span-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2"><Smartphone size={20} className="text-[#25D366]" /> {isAr ? 'ربط واتساب النظام' : 'WhatsApp Integration'}</h3>
                  <p className="text-xs font-medium text-text-subtle leading-relaxed mt-2 max-w-lg">
                    {isAr ? 'قم بربط رقم هاتف الشركة لإرسال إشعارات فورية للعملاء عند اكتمال رحلاتهم.' : 'Link the company phone number to send instant notifications to clients when trips are ready.'}
                  </p>
                </div>
                <Button variant="primary" onClick={openWhatsappModal} className="!bg-[#25D366] hover:!bg-[#1DA851] !text-white border-none shadow-lg shadow-[#25D366]/20">
                  {isAr ? 'إدارة الاتصال' : 'Manage Connection'}
                </Button>
              </div>
            </Card>

            <Modal
              isOpen={isWhatsappModalOpen}
              onClose={() => setIsWhatsappModalOpen(false)}
              title={isAr ? 'ربط واتساب' : 'WhatsApp Connection'}
            >
              <div className="p-4 space-y-6 flex flex-col items-center text-center">
                {isFetchingQr ? (
                  <div className="py-10 text-text-subtle animate-pulse">{isAr ? 'جاري التحقق من الاتصال...' : 'Checking connection...'}</div>
                ) : whatsappStatus.isReady ? (
                  <>
                    <div className="w-20 h-20 bg-[#25D366]/10 rounded-full flex items-center justify-center">
                      <CheckCircle size={40} className="text-[#25D366]" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-text-main">{isAr ? 'متصل بنجاح' : 'Connected Successfully'}</h4>
                      <p className="text-sm text-text-subtle mt-2">{isAr ? 'النظام جاهز لإرسال الإشعارات عبر واتساب.' : 'The system is ready to send WhatsApp notifications.'}</p>
                    </div>
                  </>
                ) : whatsappStatus.qrCode ? (
                  <>
                    <div className="p-4 bg-white rounded-2xl border border-border shadow-sm">
                      <img src={whatsappStatus.qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-text-main">{isAr ? 'امسح الرمز ضوئياً' : 'Scan the QR Code'}</h4>
                      <p className="text-sm text-text-subtle mt-2 max-w-sm">
                        {isAr ? 'افتح واتساب على هاتفك > الأجهزة المرتبطة > ربط جهاز، ثم امسح الرمز أعلاه.' : 'Open WhatsApp > Linked Devices > Link a Device, then scan this code.'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center">
                      <Smartphone size={40} className="text-rose-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-text-main">{isAr ? 'الخدمة غير جاهزة' : 'Service Not Ready'}</h4>
                      <p className="text-sm text-text-subtle mt-2 max-w-sm">
                        {isAr ? 'تعذر جلب رمز الـ QR. قد يكون السيرفر قيد إعادة التشغيل أو يقوم بتوليد الرمز حالياً.' : 'Could not fetch QR code. The server might be restarting or generating it.'}
                      </p>
                      <Button variant="ghost" onClick={fetchWhatsappStatus} className="mt-4" icon={Zap}>
                        {isAr ? 'تحديث الحالة' : 'Refresh Status'}
                      </Button>
                    </div>
                  </>
                )}
                
                <Button variant="ghost" onClick={() => setIsWhatsappModalOpen(false)} className="w-full mt-4">
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </Modal>
          </div>
        )}

        {/* --- INTERFACE TAB --- */}
        {activeTab === 'interface' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-8 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2"><Monitor size={20} className="text-primary" /> {isAr ? 'مظهر النظام' : 'System Theme'}</h3>
              <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-2xl border border-border">
                <span className="text-sm font-bold">{isAr ? 'الوضع الليلي' : 'Dark Mode'}</span>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-14 h-8 rounded-full transition-all relative ${darkMode ? 'bg-primary' : 'bg-border'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${darkMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </Card>

            <Card className="p-8 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2"><Globe size={20} className="text-primary" /> {isAr ? 'اللغة الافتراضية' : 'Platform Language'}</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => updateSaaS({ language: 'ar' })}
                  className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all border ${saasConfig.language === 'ar' ? 'bg-primary text-surface border-primary shadow-lg shadow-primary/20' : 'bg-surface border-border text-text-subtle'}`}
                >
                  العربية
                </button>
                <button
                  onClick={() => updateSaaS({ language: 'en' })}
                  className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all border ${saasConfig.language === 'en' ? 'bg-primary text-surface border-primary shadow-lg shadow-primary/20' : 'bg-surface border-border text-text-subtle'}`}
                >
                  English
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* --- AI TAB --- */}
        {activeTab === 'ai' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className={`p-8 flex flex-col justify-between transition-all ${(saasConfig.aiAssistant?.enabled !== false) ? 'border-primary/30' : ''}`}>
                <div className="mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                    <Sparkles size={20} className={(saasConfig.aiAssistant?.enabled !== false) ? 'text-primary' : 'text-text-subtle'} />
                    {isAr ? 'تفعيل المساعد شادي' : 'Activate AI Shady'}
                  </h3>
                  <p className="text-xs font-medium text-text-subtle leading-relaxed">
                    {isAr ? 'عرض أيقونة المساعد الذكي في كافة الصفحات.' : 'Show AI assistant icon across the platform.'}
                  </p>
                </div>
                <div className="flex items-center justify-between bg-surface-subtle p-4 rounded-2xl border border-border">
                  <span className={`text-xs font-bold uppercase tracking-widest ${(saasConfig.aiAssistant?.enabled !== false) ? 'text-primary' : 'text-text-subtle'}`}>
                    {(saasConfig.aiAssistant?.enabled !== false) ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
                  </span>
                  <button
                    onClick={() => updateSaaS({ aiAssistant: { ...saasConfig.aiAssistant, enabled: !(saasConfig.aiAssistant?.enabled !== false) } })}
                    className={`w-14 h-8 rounded-full transition-all relative ${(saasConfig.aiAssistant?.enabled !== false) ? 'bg-primary' : 'bg-border'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-surface rounded-full transition-all shadow-sm ${(saasConfig.aiAssistant?.enabled !== false) ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </Card>

              <Card className="p-8 lg:col-span-2 space-y-6">
                <h3 className="text-lg font-bold">{isAr ? 'مظهر وتخصيص المساعد' : 'Assistant Customization'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-text-subtle tracking-widest">{isAr ? 'الاسم (عربي)' : 'Name (AR)'}</label>
                    <Input value={saasConfig.aiAssistant?.nameAr || 'شادي'} onChange={val => updateSaaS({ aiAssistant: { ...saasConfig.aiAssistant, enabled: saasConfig.aiAssistant?.enabled !== false, nameAr: val } })} dir="rtl" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-text-subtle tracking-widest">{isAr ? 'الاسم (إنجليزي)' : 'Name (EN)'}</label>
                    <Input value={saasConfig.aiAssistant?.name || 'Shady'} onChange={val => updateSaaS({ aiAssistant: { ...saasConfig.aiAssistant, enabled: saasConfig.aiAssistant?.enabled !== false, name: val } })} dir="ltr" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* --- TEMPLATES TAB --- */}
        {activeTab === 'templates' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TemplateSettings />
          </div>
        )}

        {/* --- AUDIT TAB --- */}
        {activeTab === 'audit' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SystemAudit />
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

