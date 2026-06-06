import React, { useState, useEffect } from 'react';
import { useStore } from '../../context';
import { ArrowLeft, Send, CheckCircle2, MapPin, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RegisterModeProps {
    onBackToLogin: () => void;
    // Receive initial role from parent to sync with login selection
    initialRole: 'STAFF' | 'CLIENT' | 'SUBCONTRACTOR';
}

const RegisterMode: React.FC<RegisterModeProps> = ({ onBackToLogin, initialRole }) => {
    const { addPermissionRequest, saasConfig } = useStore();
    const isAr = saasConfig.language === 'ar';

    // Request Form State
    // Initialize with the prop passed from parent (syncing logic)
    const [reqRole, setReqRole] = useState<'STAFF' | 'CLIENT' | 'SUBCONTRACTOR'>(initialRole);
    const [reqDirection, setReqDirection] = useState(0);

    const [reqCompany, setReqCompany] = useState('');
    const [reqNotes, setReqNotes] = useState('');
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [mobile, setMobile] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const tabs = ['STAFF', 'CLIENT', 'SUBCONTRACTOR'] as const;

    // Optional: If initialRole changes while mounted, update it (though usually we remount)
    useEffect(() => {
        setReqRole(initialRole);
    }, [initialRole]);

    const changeReqTab = (newRole: typeof reqRole) => {
        const newIndex = tabs.indexOf(newRole);
        const oldIndex = tabs.indexOf(reqRole);
        const newDirection = newIndex > oldIndex ? 1 : -1;

        setReqDirection(isAr ? -newDirection : newDirection);
        setReqRole(newRole);
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

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError(isAr ? 'برجاء إدخال البريد الإلكتروني' : 'Please enter your email address');
            return;
        }
        if (!email.includes('@')) {
            setError(isAr ? 'برجاء إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address');
            return;
        }
        if (!reqCompany) {
            setError(isAr ? 'برجاء إدخال اسم الشركة' : 'Please enter your company name');
            return;
        }
        if (!location) {
            setError(isAr ? 'برجاء إدخال الموقع أو المدينة' : 'Please enter your location/city');
            return;
        }

        setIsSubmitting(true);
        try {
            const mergedNotes = [
                `role=${reqRole}`,
                `company=${reqCompany}`,
                mobile ? `mobile=${mobile}` : null,
                reqNotes ? `notes=${reqNotes}` : null,
            ].filter(Boolean).join('\n');

            await addPermissionRequest({
                email,
                from_location: location,
                notes: mergedNotes,
            });

            setIsSuccess(true);
            setTimeout(() => {
                onBackToLogin();
            }, 3000);
        } catch (err: any) {
            setError(isAr ? 'حدث خطأ أثناء إرسال الطلب' : 'An error occurred while sending your request');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center py-10">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="font-bold text-xl text-slate-900 dark:text-white">{isAr ? 'تم إرسال الطلب بنجاح' : 'Request Sent Successfully'}</h3>
                <p className="text-slate-400 text-sm mt-2">{isAr ? 'سيقوم الإدمن بمراجعة طلبك وتفعيل حسابك' : 'Admins will review your request shortly.'}</p>
            </div>
        );
    }

    return (
        <motion.form
            key="request"
            initial={{ opacity: 0, x: isAr ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isAr ? 20 : -20 }}
            onSubmit={handleRequest}
            className="space-y-4"
        >
            {/* Request Role Selector */}
            <div className="flex bg-surface-subtle p-1 rounded-xl mb-4 relative isolate border border-border">
                {/* Animated Background Pill */}
                <motion.div
                    className="absolute top-1 bottom-1 bg-surface shadow-sm rounded-lg -z-10"
                    initial={false}
                    animate={{
                        left: isAr
                            ? (reqRole === 'STAFF' ? '66.66%' : reqRole === 'CLIENT' ? '33.33%' : '4px')
                            : (reqRole === 'STAFF' ? '4px' : reqRole === 'CLIENT' ? '33.33%' : '66.66%'),
                        x: isAr
                            ? (reqRole === 'STAFF' ? '-4px' : reqRole === 'CLIENT' ? '0%' : '0px')
                            : (reqRole === 'STAFF' ? '0px' : reqRole === 'CLIENT' ? '0%' : '-4px'),
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
                        onClick={() => changeReqTab(type)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors relative z-10 ${reqRole === type ? 'text-text-main' : 'text-text-subtle hover:text-text-main'}`}
                    >
                        {type === 'STAFF' ? (isAr ? 'موظف' : 'Staff') : type === 'CLIENT' ? (isAr ? 'عميل' : 'Client') : (isAr ? 'مورد' : 'Supplier')}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait" custom={reqDirection}>
                <motion.div
                    key={reqRole}
                    custom={reqDirection}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 bg-surface-subtle rounded-[1.5rem] border transition-all ${error && !email ? 'border-danger' : 'border-transparent focus-within:border-primary'}`}>
                            <label className="text-[9px] font-bold uppercase text-text-subtle tracking-widest block mb-1.5">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
                            <input required type="email" className="bg-transparent border-none outline-none font-bold text-xs w-full text-text-main" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="p-4 bg-surface-subtle rounded-[1.5rem] border border-transparent focus-within:border-primary">
                            <label className="text-[9px] font-bold uppercase text-text-subtle tracking-widest block mb-1.5">{isAr ? 'رقم الجوال' : 'Mobile'}</label>
                            <input className="bg-transparent border-none outline-none font-bold text-xs w-full text-text-main" placeholder="05..." value={mobile} onChange={e => setMobile(e.target.value)} />
                        </div>
                    </div>

                    <div className={`p-4 bg-surface-subtle rounded-[1.5rem] border transition-all ${error && !reqCompany ? 'border-danger' : 'border-transparent focus-within:border-primary'}`}>
                        <label className="text-[9px] font-bold uppercase text-text-subtle tracking-widest block mb-1.5">{isAr ? 'اسم الشركة / الجهة التابعة' : 'Company / Organization'}</label>
                        <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-text-subtle" />
                            <input required className="bg-transparent border-none outline-none font-bold text-xs w-full text-text-main" value={reqCompany} onChange={e => setReqCompany(e.target.value)} placeholder={isAr ? 'اسم الشركة الرسمي' : 'Official Company Name'} />
                        </div>
                    </div>

                    <div className={`p-4 bg-surface-subtle rounded-[1.5rem] border transition-all ${error && !location ? 'border-danger' : 'border-transparent focus-within:border-primary'}`}>
                        <label className="text-[9px] font-bold uppercase text-text-subtle tracking-widest block mb-1.5">{isAr ? 'الموقع / المدينة' : 'Location / City'}</label>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-text-subtle" />
                            <input required className="bg-transparent border-none outline-none font-bold text-xs w-full text-text-main" value={location} onChange={e => setLocation(e.target.value)} />
                        </div>
                    </div>

                    <div className="p-4 bg-surface-subtle rounded-[1.5rem] border border-transparent focus-within:border-primary">
                        <label className="text-[9px] font-bold uppercase text-text-subtle tracking-widest block mb-1.5">{isAr ? 'وصف الطلب / نبذة تعريفية' : 'Request Description'}</label>
                        <textarea
                            className="bg-transparent border-none outline-none font-bold text-xs w-full text-text-main h-16 resize-none"
                            value={reqNotes}
                            onChange={e => setReqNotes(e.target.value)}
                            placeholder={isAr ? 'الرجاء توضيح سبب طلب الصلاحية...' : 'Please explain who you are...'}
                        />
                    </div>
                </motion.div>
            </AnimatePresence>

            {error && <p className="text-danger text-[10px] font-bold text-center bg-danger-muted p-3 rounded-lg border border-danger/20">{error}</p>}

            <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-xs flex items-center gap-2 justify-center shadow-lg active:scale-[0.97] transition-all ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}>
                {isSubmitting ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال طلب الانضمام' : 'Submit Access Request')}
                {!isSubmitting && <Send size={16} />}
            </button>
            <button type="button" onClick={onBackToLogin} className="w-full py-2 text-text-subtle font-medium text-xs hover:text-primary transition-colors flex items-center justify-center gap-2">
                <ArrowLeft size={14} className={isAr ? 'rotate-180' : ''} />
                {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
            </button>
        </motion.form>
    );
};

export default RegisterMode;
