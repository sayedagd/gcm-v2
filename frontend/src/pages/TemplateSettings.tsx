/**
 * =====================================================
 * [AR] إعدادات القوالب - المانفيست وإشعار التسليم
 * [EN] Template Settings - Manifest & Delivery Note
 * =====================================================
 */

import React, { useState, useMemo } from 'react';
import { useStore } from '@/context';
import { Eye, Save, RotateCcw, Image as ImageIcon, Type, AlignLeft, CheckSquare, Upload, Palette } from 'lucide-react';
import { Card, Button, Input } from '@/components';
import { ManifestTemplateConfig, DeliveryNoteTemplateConfig, NotificationType } from '@/types';

// --- Simple XSS Sanitizer ---
const sanitize = (val: string) => {
    if (!val) return val;
    return val.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m] || m));
};

type ActiveTab = 'manifest' | 'deliveryNote' | 'reports';

const TemplateSettings: React.FC = () => {
    const { saasConfig, updateSaaS, addNotification } = useStore();
    const isAr = saasConfig.language === 'ar';

    const [activeTab, setActiveTab] = useState<ActiveTab>('manifest');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Local state for manifest config
    const [manifestConfig, setManifestConfig] = useState<ManifestTemplateConfig>(() => ({
        headerTextAr: saasConfig.templateConfig?.manifest?.headerTextAr || 'بيان إدارة النفايات',
        headerTextEn: saasConfig.templateConfig?.manifest?.headerTextEn || 'WASTE MANAGEMENT MANIFEST',
        footerTextAr: saasConfig.templateConfig?.manifest?.footerTextAr || '',
        footerTextEn: saasConfig.templateConfig?.manifest?.footerTextEn || '',
        showLogo: saasConfig.templateConfig?.manifest?.showLogo ?? true,
        showSignatures: saasConfig.templateConfig?.manifest?.showSignatures ?? true,
        logoOverride: saasConfig.templateConfig?.manifest?.logoOverride || '',
    }));

    // Local state for delivery note config
    const [deliveryNoteConfig, setDeliveryNoteConfig] = useState<DeliveryNoteTemplateConfig>(() => ({
        headerTextAr: saasConfig.templateConfig?.deliveryNote?.headerTextAr || 'إشعار تسليم',
        headerTextEn: saasConfig.templateConfig?.deliveryNote?.headerTextEn || 'DELIVERY NOTE / SERVICE TICKET',
        footerTextAr: saasConfig.templateConfig?.deliveryNote?.footerTextAr || '',
        footerTextEn: saasConfig.templateConfig?.deliveryNote?.footerTextEn || '',
        showLogo: saasConfig.templateConfig?.deliveryNote?.showLogo ?? true,
        showQR: saasConfig.templateConfig?.deliveryNote?.showQR ?? false,
        showSignatures: saasConfig.templateConfig?.deliveryNote?.showSignatures ?? true,
        logoOverride: saasConfig.templateConfig?.deliveryNote?.logoOverride || '',
    }));

    // Local state for global reports config
    const [globalConfig, setGlobalConfig] = useState(() => ({
        headerTextAr: saasConfig.templateConfig?.global?.headerTextAr || '',
        headerTextEn: saasConfig.templateConfig?.global?.headerTextEn || '',
        footerTextAr: saasConfig.templateConfig?.global?.footerTextAr || '',
        footerTextEn: saasConfig.templateConfig?.global?.footerTextEn || '',
        logoOverride: saasConfig.templateConfig?.global?.logoOverride || '',
        gcmStampOverride: saasConfig.templateConfig?.global?.gcmStampOverride || '',
        accentColor: saasConfig.templateConfig?.global?.accentColor || '#10b981',
    }));

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            await updateSaaS({
                templateConfig: {
                    manifest: manifestConfig,
                    deliveryNote: deliveryNoteConfig,
                    global: globalConfig,
                }
            });
            addNotification({
                type: NotificationType.SUCCESS,
                title: isAr ? 'تم الحفظ' : 'Saved',
                message: isAr ? 'تم حفظ إعدادات القوالب بنجاح' : 'Template settings saved successfully',
            });
        } catch (err) {
            addNotification({
                type: NotificationType.ERROR,
                title: isAr ? 'خطأ' : 'Error',
                message: isAr ? 'فشل حفظ الإعدادات' : 'Failed to save template settings',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCurrentConfig((prev: any) => ({ ...prev, logoOverride: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setGlobalConfig((prev: any) => ({ ...prev, gcmStampOverride: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleReset = (tab: ActiveTab) => {
        if (tab === 'manifest') {
            setManifestConfig({
                headerTextAr: 'بيان إدارة النفايات',
                headerTextEn: 'WASTE MANAGEMENT MANIFEST',
                footerTextAr: '',
                footerTextEn: '',
                showLogo: true,
                showSignatures: true,
                logoOverride: '',
            });
        } else if (tab === 'deliveryNote') {
            setDeliveryNoteConfig({
                headerTextAr: 'إشعار تسليم',
                headerTextEn: 'DELIVERY NOTE / SERVICE TICKET',
                footerTextAr: '',
                footerTextEn: '',
                showLogo: true,
                showQR: false,
                showSignatures: true,
                logoOverride: '',
            });
        } else {
            setGlobalConfig({
                headerTextAr: '',
                headerTextEn: '',
                footerTextAr: '',
                footerTextEn: '',
                logoOverride: '',
                gcmStampOverride: '',
                accentColor: '#10b981',
            });
        }
    };

    // Generate preview HTML
    const previewHtml = useMemo(() => {
        const config = activeTab === 'manifest' ? manifestConfig : activeTab === 'deliveryNote' ? deliveryNoteConfig : globalConfig;
        const isManifest = activeTab === 'manifest';
        const isReports = activeTab === 'reports';
        const accentColor = isReports ? (globalConfig.accentColor || '#10b981') : isManifest ? '#0f766e' : '#2563eb';
        const headerEn = sanitize(isManifest ? (config as ManifestTemplateConfig).headerTextEn : config.headerTextEn);
        const headerAr = sanitize(isManifest ? (config as ManifestTemplateConfig).headerTextAr : config.headerTextAr);
        const footerEn = sanitize(config.footerTextEn || '');
        const footerAr = sanitize(config.footerTextAr || '');
        const showLogo = isReports ? true : (config as any).showLogo !== false;
        const showSignatures = isReports ? false : (config as any).showSignatures !== false;
        const logoUrl = (config as any).logoOverride || saasConfig.logoUrl || '';

        return `
        <div style="width: 100%; padding: 24px 28px; font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${accentColor}; padding-bottom: 12px; margin-bottom: 16px;">
                <div style="flex: 1;">
                    ${showLogo && logoUrl ? `<img src="${logoUrl}" style="height: 40px; object-fit: contain;" />` : `<div style="width: 40px; height: 40px; background: ${accentColor}; border-radius: 8px;"></div>`}
                    <div style="font-size: 9px; color: #94a3b8; margin-top: 3px;">Sample Company LLC</div>
                </div>
                <div style="text-align: center; flex: 2;">
                    <div style="font-size: 16px; font-weight: 800; color: ${accentColor}; letter-spacing: 1px;">${headerEn || '---'}</div>
                    <div style="font-size: 12px; font-weight: 700; color: ${accentColor}; margin-top: 3px; direction: rtl;">${headerAr || '---'}</div>
                </div>
                <div style="flex: 1; text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                    <div style="font-size: 10px; font-weight: 700; color: #334155;">${isManifest ? 'Manifest No.' : 'Ref No.'}</div>
                    <div style="font-size: 14px; font-weight: 800; color: ${accentColor}; border: 2px solid ${accentColor}; display: inline-block; padding: 3px 12px; border-radius: 6px; margin-top: 3px;">MNF-0001</div>
                    ${!isManifest && (config as any).showQR ? `
                    <div style="margin-top: 8px; border: 1px solid #e2e8f0; padding: 2px; border-radius: 4px; background: white;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=PREVIEW" style="width:40px;height:40px;display:block;" />
                    </div>` : ''}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
                    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">${isManifest ? 'WASTE GENERATOR' : 'CLIENT'}</div>
                    <div style="font-size: 11px;"><strong>Company:</strong> Sample Company LLC</div>
                    <div style="font-size: 11px;"><strong>Project:</strong> Sample Project Alpha</div>
                </div>
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
                    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">TRANSPORTER</div>
                    <div style="font-size: 11px;"><strong>Driver:</strong> Ahmad Ali</div>
                    <div style="font-size: 11px;"><strong>Vehicle:</strong> KSA-1234-ABC</div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
                <thead>
                    <tr style="background: ${accentColor}; color: #fff;">
                        <th style="padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase;">Service</th>
                        <th style="padding: 8px 10px; text-align: center; font-size: 9px; text-transform: uppercase;">Qty</th>
                        <th style="padding: 8px 10px; text-align: center; font-size: 9px; text-transform: uppercase;">Unit</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 10px; font-weight: 600;">General Waste Collection</td>
                        <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: ${accentColor};">15.5</td>
                        <td style="padding: 8px 10px; text-align: center;">TON</td>
                    </tr>
                </tbody>
            </table>

            ${showSignatures ? `
            <div style="display: grid; grid-template-columns: ${isManifest ? '1fr 1fr 1fr' : '1fr 1fr'}; gap: 16px; margin-top: 20px; padding-top: 16px; border-top: 2px solid #e2e8f0;">
                <div style="text-align: center;">
                    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #94a3b8;">${isManifest ? 'Generator' : 'Delivered By'}</div>
                    <div style="border-bottom: 1px solid #cbd5e1; width: 70%; margin: 24px auto 4px;"></div>
                    <div style="font-size: 8px; color: #cbd5e1;">Signature</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #94a3b8;">${isManifest ? 'Transporter' : 'Received By'}</div>
                    <div style="border-bottom: 1px solid #cbd5e1; width: 70%; margin: 24px auto 4px;"></div>
                    <div style="font-size: 8px; color: #cbd5e1;">Signature</div>
                </div>
                ${isManifest ? `
                <div style="text-align: center;">
                    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #94a3b8;">Facility</div>
                    <div style="border-bottom: 1px solid #cbd5e1; width: 70%; margin: 24px auto 4px;"></div>
                    <div style="font-size: 8px; color: #cbd5e1;">Signature</div>
                </div>` : ''}
            </div>` : ''}

            ${(footerAr || footerEn) ? `
            <div style="margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8;">
                ${footerEn ? `<div>${footerEn}</div>` : ''}
                ${footerAr ? `<div style="direction: rtl; margin-top: 2px;">${footerAr}</div>` : ''}
            </div>` : ''}
        </div>
        `;
    }, [activeTab, manifestConfig, deliveryNoteConfig, saasConfig.logoUrl]);

    const currentConfig = activeTab === 'manifest' ? manifestConfig : activeTab === 'deliveryNote' ? deliveryNoteConfig : globalConfig;
    const setCurrentConfig = activeTab === 'manifest'
        ? (fn: (prev: ManifestTemplateConfig) => ManifestTemplateConfig) => setManifestConfig(fn)
        : activeTab === 'deliveryNote'
            ? (fn: (prev: DeliveryNoteTemplateConfig) => DeliveryNoteTemplateConfig) => setDeliveryNoteConfig(fn as any)
            : (fn: (prev: any) => any) => setGlobalConfig(fn);

    const tabs: { key: ActiveTab; labelEn: string; labelAr: string; color: string }[] = [
        { key: 'manifest', labelEn: 'Waste Manifest', labelAr: 'المانفيست', color: '#0f766e' },
        { key: 'deliveryNote', labelEn: 'Delivery Note', labelAr: 'إشعار التسليم', color: '#2563eb' },
        { key: 'reports', labelEn: 'Reports (Global)', labelAr: 'تقارير عامة', color: '#10b981' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2 bg-surface rounded-xl p-1.5 border border-border w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === tab.key
                                ? 'bg-primary text-surface shadow-md'
                                : 'text-text-subtle hover:text-text-main hover:bg-surface-subtle'
                                }`}
                        >
                            {isAr ? tab.labelAr : tab.labelEn}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        icon={Eye}
                    >
                        {isAr ? (showPreview ? 'إخفاء المعاينة' : 'معاينة') : (showPreview ? 'Hide' : 'Preview')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReset(activeTab)}
                        icon={RotateCcw}
                    >
                        {isAr ? 'إعادة ضبط' : 'Reset'}
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleSave}
                        isLoading={isSubmitting}
                        icon={Save}
                        className="px-8 shadow-lg shadow-primary/20"
                    >
                        {isAr ? 'حفظ' : 'Save'}
                    </Button>
                </div>
            </div>

            <div className={`grid ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-8`}>
                {/* Settings Panel */}
                <div className="space-y-6">
                    {/* Header Text */}
                    <Card className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Type size={18} className="text-primary" />
                            <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">
                                {isAr ? 'نص العنوان' : 'Header Text'}
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label={isAr ? 'العنوان (إنجليزي)' : 'Header (English)'}
                                value={currentConfig.headerTextEn || ''}
                                onChange={(val) => setCurrentConfig((prev: any) => ({ ...prev, headerTextEn: val }))}
                                placeholder="WASTE MANAGEMENT MANIFEST"
                            />
                            <Input
                                label={isAr ? 'العنوان (عربي)' : 'Header (Arabic)'}
                                value={currentConfig.headerTextAr || ''}
                                onChange={(val) => setCurrentConfig((prev: any) => ({ ...prev, headerTextAr: val }))}
                                placeholder="بيان إدارة النفايات"
                                dir="rtl"
                            />
                        </div>
                    </Card>

                    {/* Footer Text */}
                    <Card className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <AlignLeft size={18} className="text-primary" />
                            <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">
                                {isAr ? 'نص التذييل' : 'Footer Text'}
                            </h3>
                        </div>
                        <p className="text-xs font-semibold text-text-subtle">
                            {isAr ? 'يظهر هذا النص في أسفل صفحات الملفات المصدرة.' : 'This text appears at the bottom of exported document pages.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label={isAr ? 'التذييل (إنجليزي)' : 'Footer (English)'}
                                value={currentConfig.footerTextEn || ''}
                                onChange={(val) => setCurrentConfig((prev: any) => ({ ...prev, footerTextEn: val }))}
                                placeholder="All rights reserved © 2024"
                            />
                            <Input
                                label={isAr ? 'التذييل (عربي)' : 'Footer (Arabic)'}
                                value={currentConfig.footerTextAr || ''}
                                onChange={(val) => setCurrentConfig((prev: any) => ({ ...prev, footerTextAr: val }))}
                                placeholder="جميع الحقوق محفوظة"
                                dir="rtl"
                            />
                        </div>
                    </Card>

                    {/* Report Color Control */}
                    {activeTab === 'reports' && (
                        <Card className="p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Palette size={18} className="text-primary" />
                                <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">
                                    {isAr ? 'لون التقارير' : 'Report Accent Color'}
                                </h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-xl border border-border shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: globalConfig.accentColor || '#10b981' }}
                                />
                                <div className="flex-1">
                                    <Input
                                        label={isAr ? 'اللون (HEX)' : 'Color (HEX)'}
                                        value={globalConfig.accentColor || '#10b981'}
                                        onChange={(val) => setGlobalConfig(prev => ({ ...prev, accentColor: val }))}
                                        placeholder="#10b981"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {['#10b981', '#0f766e', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#1e293b'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setGlobalConfig(prev => ({ ...prev, accentColor: c }))}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${globalConfig.accentColor === c ? 'border-primary' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </Card>
                    )}
                    {/* Logo Override */}
                    <Card className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <ImageIcon size={18} className="text-primary" />
                            <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">
                                {isAr ? 'تجاوز الشعار' : 'Logo Override'}
                            </h3>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-6 bg-surface-subtle p-4 rounded-2xl border border-dashed border-border hover:border-primary transition-colors">
                            <div className="relative group">
                                <div className="w-24 h-24 bg-surface rounded-xl border border-border flex items-center justify-center overflow-hidden">
                                    {(currentConfig as any).logoOverride || saasConfig.logoUrl ? (
                                        <img src={(currentConfig as any).logoOverride || saasConfig.logoUrl} className="w-full h-full object-contain" alt="Template Logo" />
                                    ) : (
                                        <ImageIcon className="text-text-subtle opacity-30" size={30} />
                                    )}
                                </div>
                                <label className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity rounded-xl">
                                    <Upload size={20} />
                                    <span className="text-[10px] font-bold uppercase mt-1">Upload</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                            </div>
                            <div className="flex-1 w-full space-y-3">
                                <p className="text-xs font-semibold text-text-subtle">
                                    {isAr ? 'يمكنك رفع شعار مخصص لهذه القوالب فقط، أو وضع رابط خارجي.' : 'Upload a custom logo for these templates only, or provide an external URL.'}
                                </p>
                                <Input
                                    label={isAr ? 'رابط الشعار' : 'Logo URL'}
                                    value={currentConfig.logoOverride || ''}
                                    onChange={(val) => setCurrentConfig((prev: any) => ({ ...prev, logoOverride: val }))}
                                    placeholder="https://..."
                                    className="!py-2"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* GCM Stamp Override */}
                    {activeTab === 'reports' && (
                        <Card className="p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <ImageIcon size={18} className="text-primary" />
                                <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">
                                    {isAr ? 'ختم الشركة' : 'GCM Stamp Override'}
                                </h3>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-6 bg-surface-subtle p-4 rounded-2xl border border-dashed border-border hover:border-primary transition-colors">
                                <div className="relative group">
                                    <div className="w-24 h-24 bg-surface rounded-xl border border-border flex items-center justify-center overflow-hidden">
                                        {globalConfig.gcmStampOverride ? (
                                            <img src={globalConfig.gcmStampOverride} className="w-full h-full object-contain mix-blend-multiply" alt="GCM Stamp" />
                                        ) : (
                                            <ImageIcon className="text-text-subtle opacity-30" size={30} />
                                        )}
                                    </div>
                                    <label className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity rounded-xl">
                                        <Upload size={20} />
                                        <span className="text-[10px] font-bold uppercase mt-1">Upload</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleStampUpload} />
                                    </label>
                                </div>
                                <div className="flex-1 w-full space-y-3">
                                    <p className="text-xs font-semibold text-text-subtle">
                                        {isAr ? 'قم برفع صورة الختم الرسمي الشفاف بصيغة PNG.' : 'Upload official transparent PNG stamp.'}
                                    </p>
                                    <Input
                                        label={isAr ? 'رابط الختم' : 'Stamp URL'}
                                        value={globalConfig.gcmStampOverride || ''}
                                        onChange={(val) => setGlobalConfig((prev) => ({ ...prev, gcmStampOverride: val }))}
                                        placeholder="https://..."
                                        className="!py-2"
                                    />
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Live Preview */}
                {showPreview && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Eye size={16} className="text-text-subtle" />
                            <span className="text-xs font-bold text-text-subtle uppercase tracking-widest">
                                {isAr ? 'معاينة مباشرة' : 'Live Preview'}
                            </span>
                        </div>
                        <Card className="p-0 overflow-hidden border-2 border-primary/10 shadow-2xl">
                            <div
                                className="bg-white overflow-auto max-h-[800px] border-none"
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                        </Card>
                    </div>
                )}
            </div>

            {/* Toggle Options */}
            {activeTab !== 'reports' && (
                <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckSquare size={18} className="text-primary" />
                        <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">
                            {isAr ? 'خيارات العرض' : 'Display Options'}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <ToggleOption
                            label={isAr ? 'إظهار الشعار' : 'Show Logo'}
                            checked={(currentConfig as any).showLogo !== false}
                            onChange={(v) => setCurrentConfig((prev: any) => ({ ...prev, showLogo: v }))}
                        />
                        <ToggleOption
                            label={isAr ? 'إظهار التوقيعات' : 'Show Signatures'}
                            checked={(currentConfig as any).showSignatures !== false}
                            onChange={(v) => setCurrentConfig((prev: any) => ({ ...prev, showSignatures: v }))}
                        />
                        {activeTab === 'deliveryNote' && (
                            <ToggleOption
                                label={isAr ? 'إظهار QR Code' : 'Show QR Code'}
                                checked={(currentConfig as any).showQR === true}
                                onChange={(v) => setCurrentConfig((prev: any) => ({ ...prev, showQR: v }))}
                            />
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};

// Toggle component for display options
const ToggleOption: React.FC<{
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}> = ({ label, checked, onChange }) => {
    return (
        <label className="flex items-center justify-between cursor-pointer group py-1">
            <span className="text-sm text-text-main group-hover:text-primary transition-colors">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-border'
                    }`}
            >
                <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                />
            </button>
        </label>
    );
};

export default TemplateSettings;
