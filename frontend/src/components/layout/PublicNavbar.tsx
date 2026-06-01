
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, User, ShieldCheck, Lock, Zap, Key, Sun, Moon, Menu, X } from 'lucide-react';
import { useStore } from '@/context';

interface PublicNavbarProps {
    isScrolled: boolean;
    setIsLoginModalOpen: (val: boolean) => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ isScrolled, setIsLoginModalOpen }) => {
    const { saasConfig, updateSaaS, darkMode, setDarkMode } = useStore();
    const navigate = useNavigate();
    const isAr = saasConfig.language === 'ar';
    const lp = saasConfig.landingPage;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const getPortalIcon = (type: string) => {
        switch (type) {
            case 'shield': return <ShieldCheck size={18} />;
            case 'lock': return <Lock size={18} />;
            case 'zap': return <Zap size={18} />;
            case 'key': return <Key size={18} />;
            default: return <User size={18} />;
        }
    };

    const scrollToSection = (id: string) => {
        setMobileMenuOpen(false);
        if (window.location.pathname !== '/landing') {
            navigate('/landing');
            setTimeout(() => {
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            return;
        }
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const navLinks = [
        { label: isAr ? 'عن الشركة' : 'About', action: () => scrollToSection('about') },
        { label: isAr ? 'خدماتنا' : 'Services', action: () => scrollToSection('services') },
        { label: isAr ? 'متجر الأجهزة' : 'Equipment Store', action: () => { navigate('/store'); setMobileMenuOpen(false); } },
        { label: isAr ? 'الأسطول' : 'Fleet', action: () => scrollToSection('fleet') },
        { label: isAr ? 'تواصل معنا' : 'Contact', action: () => scrollToSection('contact') },
    ];

    return (
        <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${isScrolled ? 'h-16 md:h-20 glass border-b border-primary-500/10 shadow-lg' : 'h-20 md:h-28 bg-transparent'}`}>
            <div className="max-w-7xl mx-auto h-full px-6 md:px-12 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/landing')}>
                    {((darkMode && saasConfig.logoDarkUrl) || saasConfig.logoUrl) ? (
                        <img src={(darkMode && saasConfig.logoDarkUrl) ? saasConfig.logoDarkUrl : saasConfig.logoUrl} className="w-10 h-10 md:w-14 md:h-14 rounded-2xl object-cover shadow-lg" alt="App Logo" />
                    ) : (
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-surface rounded-2xl flex items-center justify-center overflow-hidden shadow-lg border border-border/50">
                            <img src="/logo-light.png" alt="GCM" className="w-full h-full object-contain" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="text-lg md:text-2xl font-bold tracking-tight text-text-main leading-none">{isAr ? saasConfig.appNameAr : saasConfig.appNameEn}</span>
                        <span className="text-[8px] md:text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-1">{isAr ? saasConfig.appSloganAr : saasConfig.appSloganEn}</span>
                    </div>
                </div>

                {/* Desktop Nav Links */}
                <div className={`hidden lg:flex items-center gap-10 text-[11px] font-bold uppercase tracking-[0.2em] text-text-subtle ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
                    {navLinks.map((link, i) => (
                        <button key={i} onClick={link.action} className="hover:text-primary-600 transition-colors">{link.label}</button>
                    ))}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 md:gap-3">
                    <button onClick={() => setDarkMode(!darkMode)} className="p-2 glass border rounded-xl flex items-center justify-center transition-colors">
                        {darkMode ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-indigo-500" />}
                    </button>
                    <button onClick={() => updateSaaS({ language: isAr ? 'en' : 'ar' })} className="p-2 glass border rounded-xl flex items-center gap-1.5 text-[10px] font-bold text-text-main transition-colors">
                        <Globe size={14} className="text-primary-600" />
                        <span className="hidden sm:inline">{isAr ? 'EN' : 'AR'}</span>
                    </button>
                    <button onClick={() => setIsLoginModalOpen(true)} className="px-4 md:px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl md:rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                        {getPortalIcon(lp?.portalIconType || 'user')}
                        <span className="hidden sm:inline">{isAr ? lp?.portalBtnTextAr : lp?.portalBtnTextEn || 'Login'}</span>
                    </button>
                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setMobileMenuOpen(v => !v)}
                        className="lg:hidden p-2 glass border rounded-xl flex items-center justify-center transition-colors"
                        aria-label="Toggle mobile menu"
                    >
                        {mobileMenuOpen ? <X size={18} className="text-text-main" /> : <Menu size={18} className="text-text-main" />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav Menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden absolute top-full left-0 right-0 glass border-t border-border/50 shadow-2xl z-[101] py-2 px-6 flex flex-col">
                    {navLinks.map((link, i) => (
                        <button
                            key={i}
                            onClick={link.action}
                            className={`${isAr ? 'text-right' : 'text-left'} text-text-main font-bold text-sm py-4 border-b border-border/30 hover:text-primary-600 transition-colors last:border-b-0`}
                        >
                            {link.label}
                        </button>
                    ))}
                </div>
            )}
        </nav>
    );
};
