import React, { useState } from 'react';
import { useStore } from '../../context';
import { useRouter } from 'next/navigation';
import { Mail, Lock, UserPlus, ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Role } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginModeProps {
    onSuccess?: () => void;
    onSwitchToRequest: () => void;
    // We can pass the current portalType to the parent if needed, 
    // but for now we manage it locally or receive initial?
    // Actually, the parent `LoginForm` probably doesn't need to know the portalType 
    // UNLESS we want to sync it to the RegisterMode.
    // So better to lift `portalType` state up to `LoginForm`? 
    // The user said "split into files", but for state syncing (the "sync request" feature),
    // lifting state is best. However, to keep files clean and independent as requested ("prevent confusion"),
    // passing `onSwitchToRequest(currentRole)` is a good middle ground.
    currentPortalType: 'STAFF' | 'CLIENT' | 'SUBCONTRACTOR';
    setPortalType: (type: 'STAFF' | 'CLIENT' | 'SUBCONTRACTOR') => void;
}

const LoginMode: React.FC<LoginModeProps> = ({ onSuccess, onSwitchToRequest, currentPortalType, setPortalType }) => {
    const { login, logout, confirmLogin, saasConfig } = useStore();
    const router = useRouter();
    const isAr = saasConfig.language === 'ar';

    const [direction, setDirection] = useState(0);
    const tabs = ['STAFF', 'CLIENT', 'SUBCONTRACTOR'] as const;

    const changeTab = (newType: typeof currentPortalType) => {
        const newIndex = tabs.indexOf(newType);
        const oldIndex = tabs.indexOf(currentPortalType);
        const newDirection = newIndex > oldIndex ? 1 : -1;
        setDirection(isAr ? -newDirection : newDirection);
        setPortalType(newType);
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
            scale: 0.95
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 50 : -50,
            opacity: 0,
            scale: 0.95
        })
    };

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError(isAr ? 'برجاء إدخال البريد وكلمة المرور' : 'Please enter email and password');
            return;
        }

        setIsLoggingIn(true);
        setError('');

        try {
            const user = await login(email, password);
            if (!user) {
                setError(isAr ? 'بيانات الدخول غير صحيحة أو الحساب غير موجود' : 'Invalid login credentials or user not found');
                return;
            }

            const role = user.role;
            const STAFF_ROLES = [Role.ADMIN, Role.ACCOUNTANT, Role.DATA_ENTRY, Role.LOGISTICS, Role.REPORTS_MANAGER, Role.DRIVER];
            const CLIENT_ROLES = [Role.CLIENT, Role.COMPANY_USER, Role.PROJECT_USER];
            const PARTNER_ROLES = [Role.SUBCONTRACTOR];

            if (currentPortalType === 'STAFF') {
                if (!STAFF_ROLES.includes(role)) {
                    setError(isAr ? 'عذراً، هذا الحساب ليس حساب "موظف". يرجى اختيار البوابة الصحيحة.' : 'Access Denied: Not a Staff account.');
                    return;
                }
                await confirmLogin(user, rememberMe);
                if (onSuccess) onSuccess();
                
                // [AR] توجيه السائق إلى صفحة الداشبورد الخاصة به في المسار الموحد /db
                // [EN] Redirect driver to their dashboard under the unified /db path
                if (role === Role.DRIVER) {
                    router.push('/dashboard');
                } else if (role === Role.REPORTS_MANAGER) {
                    router.push('/reports-dashboard');
                } else {
                    router.push('/dashboard'); // Standard /db for admin/ops
                }
            }
            else if (currentPortalType === 'CLIENT') {
                if (!CLIENT_ROLES.includes(role)) {
                    setError(isAr ? 'عذراً، هذا الحساب ليس حساب "عميل". يرجى اختيار البوابة الصحيحة.' : 'Access Denied: Not a Client account.');
                    return;
                }
                await confirmLogin(user, rememberMe);
                if (onSuccess) onSuccess();
                router.push('/client/dashboard');
            }
            else if (currentPortalType === 'SUBCONTRACTOR') {
                // If a driver somehow logs in here, we still allow it but Staff portal is now preferred.
                const SUBCONTRACTOR_PORTAL_ROLES = [Role.SUBCONTRACTOR, Role.DRIVER];
                if (!SUBCONTRACTOR_PORTAL_ROLES.includes(role)) {
                    setError(isAr ? 'عذراً، هذا الحساب ليس حساب "مورد أو سائق". يرجى اختيار البوابة الصحيحة.' : 'Access Denied: Not a Supplier/Driver account.');
                    return;
                }
                await confirmLogin(user, rememberMe);
                if (onSuccess) onSuccess();
                router.push(role === Role.DRIVER ? '/dashboard' : '/subcontractor/dashboard');
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <motion.form
            key="login"
            initial={{ opacity: 0, x: isAr ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isAr ? 20 : -20 }}
            onSubmit={handleLogin}
            className="space-y-6"
        >
            {/* Portal Type Switcher (3-Way) - Animated */}
            <div className="flex bg-surface-subtle p-1 rounded-xl mb-6 relative isolate border border-border">
                {/* Animated Background Pill */}
                <motion.div
                    className="absolute top-1 bottom-1 bg-surface shadow-sm rounded-lg -z-10"
                    initial={false}
                    animate={{
                        left: isAr
                            ? (currentPortalType === 'STAFF' ? '66.66%' : currentPortalType === 'CLIENT' ? '33.33%' : '4px')
                            : (currentPortalType === 'STAFF' ? '4px' : currentPortalType === 'CLIENT' ? '33.33%' : '66.66%'),
                        x: isAr
                            ? (currentPortalType === 'STAFF' ? '-4px' : currentPortalType === 'CLIENT' ? '0%' : '0px')
                            : (currentPortalType === 'STAFF' ? '0px' : currentPortalType === 'CLIENT' ? '0%' : '-4px'),
                    }}
                    style={{
                        width: 'calc(33.33% - 6px)',
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />

                {(['STAFF', 'CLIENT', 'SUBCONTRACTOR'] as const).map((type) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => changeTab(type)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors relative z-10 ${currentPortalType === type ? 'text-text-main' : 'text-text-subtle hover:text-text-main'}`}
                    >
                        {type === 'STAFF' ? (isAr ? 'موظف' : 'Staff') : type === 'CLIENT' ? (isAr ? 'عميل' : 'Client') : (isAr ? 'مورد' : 'Supplier')}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={currentPortalType}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                    className="space-y-4"
                >
                    <div className={`p-4 bg-surface-subtle rounded-xl border transition-all ${error ? 'border-danger' : 'border-transparent focus-within:border-primary-500'}`}>
                        <label className="text-xs font-medium text-text-subtle block mb-1.5">{isAr ? 'البريد الإلكتروني للعمل' : 'Work Email'}</label>
                        <div className="flex items-center gap-3">
                            <Mail size={18} className="text-text-subtle" />
                            <input type="email" placeholder={currentPortalType === 'STAFF' ? "name@company.com" : "client@company.com"} className="bg-transparent border-none outline-none font-medium text-sm w-full text-text-main" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <div className={`p-4 bg-surface-subtle rounded-xl border transition-all ${error ? 'border-danger' : 'border-transparent focus-within:border-primary-500'}`}>
                        <label className="text-xs font-medium text-text-subtle block mb-1.5">{isAr ? 'كلمة المرور' : 'Password'}</label>
                        <div className="flex items-center gap-3">
                            <Lock size={18} className="text-text-subtle" />
                            <input type={showPassword ? 'text' : 'password'} className="bg-transparent border-none outline-none font-medium text-sm w-full text-text-main" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-text-subtle hover:text-primary-500 transition-colors">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="px-2 flex items-center justify-between">
                        <button type="button" onClick={() => setRememberMe(!rememberMe)} className="flex items-center gap-2 group">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-primary border-primary' : 'border-border'}`}>
                                {rememberMe && <ShieldCheck size={12} className="text-white" />}
                            </div>
                            <span className="text-xs font-medium text-text-subtle group-hover:text-text-main transition-colors">
                                {isAr ? 'ابقائي متصلاً' : 'Keep me signed in'}
                            </span>
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>

            {error && <p className="text-danger text-xs font-medium text-center bg-danger-muted p-3 rounded-lg">{error}</p>}

            <button
                type="submit"
                disabled={isLoggingIn}
                className={`w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.97] transition-all text-white ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
                style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px var(--primary-color-30)' }}
            >
                {isAr ? (isLoggingIn ? 'جاري التحقق...' : 'دخول للنظام') : (isLoggingIn ? 'Verifying...' : 'Sign In')}
                {!isLoggingIn && (isAr ? <ArrowLeft size={18} /> : <ArrowRight size={18} />)}
            </button>

            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider"><span className="bg-surface px-3 text-text-subtle">{isAr ? 'أو' : 'OR'}</span></div>
            </div>

            <button type="button" onClick={onSwitchToRequest} className="w-full py-4 border-2 border-border rounded-xl text-text-subtle font-bold text-sm hover:border-primary-600 hover:text-primary-600 hover:bg-surface-subtle transition-all flex items-center justify-center gap-2">
                <UserPlus size={18} />
                {isAr ? 'طلب صلاحية وصول جديدة' : 'Request System Access'}
            </button>
        </motion.form>
    );
};

export default LoginMode;
