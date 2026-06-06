
import React from 'react';
import { Facebook, Twitter, Linkedin, Instagram, Youtube, MessageSquare, Globe } from 'lucide-react';
import { useStore } from '@/context';

export const PublicFooter: React.FC = () => {
    const { saasConfig, darkMode } = useStore();
    const isAr = saasConfig.language === 'ar';
    const lp = saasConfig.landingPage;

    const getSocialIcon = (platform: string) => {
        switch (platform) {
            case 'facebook': return <Facebook size={20} />;
            case 'twitter': return <Twitter size={20} />;
            case 'linkedin': return <Linkedin size={20} />;
            case 'instagram': return <Instagram size={20} />;
            case 'youtube': return <Youtube size={20} />;
            case 'whatsapp': return <MessageSquare size={20} />;
            default: return <Globe size={20} />;
        }
    };

    return (
        <footer className="py-24 border-t border-border bg-background px-6 md:px-10 transition-colors">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
                {/* Column 1: Brand & About */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center gap-4">
                        {((darkMode && saasConfig.logoDarkUrl) || saasConfig.logoUrl) ? (
                            <img src={(darkMode && saasConfig.logoDarkUrl) ? saasConfig.logoDarkUrl : saasConfig.logoUrl} className="w-14 h-14 rounded-2xl object-cover shadow-lg" alt="App Logo" />
                        ) : (
                            <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center overflow-hidden shadow-lg border border-border/50">
                                <img src="/assets/logo_gcm.png" alt="GCM" className="w-full h-full object-contain" />
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold text-text-main leading-none">{isAr ? saasConfig.appNameAr : saasConfig.appNameEn}</span>
                            <span className="text-[9px] font-bold text-primary-600 uppercase tracking-widest mt-1">{isAr ? saasConfig.appSloganAr : saasConfig.appSloganEn}</span>
                        </div>
                    </div>
                    <p className="text-text-subtle font-medium leading-relaxed max-w-sm">{isAr ? lp?.footerAboutAr : lp?.footerAboutEn}</p>
                    
                    <div className="flex gap-3">
                        {(lp?.socialLinks || []).map((link: any) => (
                            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-surface-subtle rounded-xl text-text-subtle hover:text-primary-500 transition-all border border-border hover:shadow-lg">
                                {getSocialIcon(link.platform)}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Column 2: Quick Links */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-text-main uppercase tracking-widest">{isAr ? 'روابط سريعة' : 'Quick Links'}</h4>
                    <div className="flex flex-col gap-4 text-sm font-bold text-text-subtle">
                        <a href="/login" className="hover:text-primary-500 transition-colors flex items-center gap-2">
                           {isAr ? 'الدخول للنظام' : 'System Access'}
                        </a>
                        {lp?.storeUrl && (
                            <a href={lp.storeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary-500 transition-colors flex items-center gap-2">
                                {isAr ? 'المتجر الإلكتروني' : 'Online Store'}
                            </a>
                        )}
                        <a href="#services" className="hover:text-primary-500 transition-colors">{isAr ? 'خدماتنا' : 'Our Services'}</a>
                        <a href="#contact" className="hover:text-primary-500 transition-colors">{isAr ? 'تواصل معنا' : 'Contact'}</a>
                    </div>
                </div>

                {/* Column 3: Contact Info */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-text-main uppercase tracking-widest">{isAr ? 'معلومات التواصل' : 'Contact Info'}</h4>
                    <div className="flex flex-col gap-4 text-sm font-bold text-text-subtle">
                        {lp?.contactRecipientEmail && (
                            <a href={`mailto:${lp.contactRecipientEmail}`} className="hover:text-primary-500 transition-colors flex items-center gap-3">
                                <span className="p-2 bg-surface-subtle rounded-lg border border-border italic text-[10px] normal-case">{lp.contactRecipientEmail}</span>
                            </a>
                        )}
                        {lp?.contactPhone && (
                            <a href={`tel:${lp.contactPhone}`} className="hover:text-primary-500 transition-colors flex items-center gap-3 direction-ltr justify-end">
                                <span className="p-2 bg-surface-subtle rounded-lg border border-border">{lp.contactPhone}</span>
                            </a>
                        )}
                        <div className={`inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ${isAr ? 'flex-row-reverse' : ''}`}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {isAr ? 'نظام صديق للبيئة' : 'Eco-Friendly System'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.2em]">
                    {isAr ? lp?.copyrightTextAr : lp?.copyrightTextEn}
                </p>
                <div className="flex gap-6 text-[9px] font-black text-text-subtle uppercase tracking-widest opacity-50">
                    <a href="#" className="hover:text-primary-500 transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-primary-500 transition-colors">Terms of Service</a>
                </div>
            </div>
        </footer>
    );
};
