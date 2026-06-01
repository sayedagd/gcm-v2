/**
 * =====================================================
 * [AR] مكون طلب تثبيت التطبيق (PWA)
 * [EN] PWA Install Prompt Component
 * =====================================================
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download } from 'lucide-react';
import { useStore } from '../../context';

const InstallWebAppPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const { saasConfig } = useStore();
    const isAr = saasConfig.language === 'ar';

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show prompt only on mobile devices
            if (window.innerWidth < 768) setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setShowPrompt(false);
        setDeferredPrompt(null);
    };

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-6 right-6 z-[300] bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900 shadow-[0_20px_50px_rgba(16,185,129,0.2)] rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center gap-6"
                >
                    <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                        <Smartphone size={32} />
                    </div>
                    <div className="flex-1 text-center md:text-right">
                        <h4 className="font-black text-lg">{isAr ? 'تثبيت تطبيق GCM' : 'Install GCM App'}</h4>
                        <p className="text-xs font-bold text-slate-500 mt-1">{isAr ? 'أضف أيقونة للنظام على شاشتك الرئيسية للوصول السريع' : 'Add a system shortcut to your home screen for quick access.'}</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => setShowPrompt(false)} className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-800 rounded-2xl font-black text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-300 transition-colors">{isAr ? 'لاحقاً' : 'Later'}</button>
                        <button onClick={handleInstall} className="flex-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl">
                            <Download size={16} /> {isAr ? 'تثبيت الآن' : 'Install Now'}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InstallWebAppPrompt;
