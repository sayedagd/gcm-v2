import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components';
import { User, Role } from '@/types';
import { Mail, Lock, User as UserIcon, Shield, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/context';

interface QuickUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: User) => void;
    initialRole: Role;
    initialName?: string;
    isAr: boolean;
}

const QuickUserModal: React.FC<QuickUserModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    initialRole,
    initialName = '',
    isAr
}) => {
    const { upsertUser } = useStore();
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setEmail('');
            setPassword('');
            setError('');
        }
    }, [isOpen, initialName]);

    const handleCreate = async () => {
        if (!name || !email || !password) {
            setError(isAr ? 'يرجى إكمال كافة الحقول' : 'Please fill all fields');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const newUser = {
                id: `USR-${Date.now()}`,
                name,
                email,
                password,
                role: initialRole,
                avatar: '/logo.png'
            };

            await upsertUser(newUser);
            onSuccess(newUser as User);
            onClose();
        } catch (e: any) {
            setError(e.message || (isAr ? 'فشل إنشاء الحساب' : 'Failed to create user'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title={isAr ? 'إنشاء حساب نظام سريع' : 'Quick System Account Creation'}
        >
            <div className={`space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-300 ${isAr ? 'text-right' : 'text-left'}`}>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-surface shadow-lg">
                        <Shield size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الصلاحية الممنوحة' : 'Assigned Role'}</p>
                        <p className="font-bold text-primary">{initialRole}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <Input
                        label={isAr ? 'الاسم الكامل' : 'Full Name'}
                        icon={UserIcon}
                        value={name}
                        onChange={setName}
                        placeholder="Ex: Ahmad Ali"
                    />
                    <Input
                        label={isAr ? 'البريد الإلكتروني' : 'Email Address'}
                        icon={Mail}
                        type="email"
                        value={email}
                        onChange={setEmail}
                        placeholder="user@gcm.com"
                    />
                    <Input
                        label={isAr ? 'كلمة المرور' : 'Password'}
                        icon={Lock}
                        type="password"
                        value={password}
                        onChange={setPassword}
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="text-xs font-bold text-danger bg-danger-muted p-3 rounded-xl border border-danger/20 flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        className="flex-1 py-6 rounded-2xl uppercase tracking-widest font-bold"
                        onClick={onClose}
                    >
                        {isAr ? 'إلغاء' : 'Abort'}
                    </Button>
                    <Button
                        variant="primary"
                        className="flex-2 py-6 rounded-2xl uppercase tracking-[0.2em] font-black shadow-xl shadow-primary-200 dark:shadow-primary-900/40"
                        onClick={handleCreate}
                        isLoading={isSubmitting}
                        icon={CheckCircle2}
                    >
                        {isAr ? 'تفعيل الحساب' : 'ACTIVATE'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default QuickUserModal;
