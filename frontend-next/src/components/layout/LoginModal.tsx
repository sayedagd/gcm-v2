
import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';
import { useStore } from '@/context';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { saasConfig, darkMode } = useStore();
    const isAr = saasConfig.language === 'ar';
    const logoSrc = ((darkMode && saasConfig.logoDarkUrl) ? saasConfig.logoDarkUrl : saasConfig.logoUrl) || null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-surface relative z-[201] w-full max-w-md rounded-2xl border border-border p-6 shadow-lg transition-colors sm:p-8 md:p-10">
                        <button onClick={onClose} className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} p-2 bg-surface-subtle rounded-xl hover:bg-surface hover:text-danger transition-all sm:top-6 sm:${isAr ? 'left-6' : 'right-6'}`}><X size={18} className="text-text-subtle" /></button>
                        <div className="text-center mb-8">
                            {logoSrc ? (
                                <Image src={logoSrc} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-xl shadow-primary-500/20" alt="App Logo" width={64} height={64} unoptimized />
                            ) : (
                                <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center overflow-hidden mx-auto mb-4 shadow-xl shadow-primary-500/10 border border-border/50">
                                    <Image src="/logo-light.png" alt="GCM" className="w-full h-full object-contain" width={64} height={64} />
                                </div>
                            )}
                            <h3 className="text-2xl font-bold text-text-main">{isAr ? 'بوابة الدخول' : 'Portal Login'}</h3>
                        </div>

                        <LoginForm isModal={true} onSuccess={onClose} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
