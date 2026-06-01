import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User as UserIcon, Mail, Lock, Shield, Building2, AlertCircle, UserPlus
} from 'lucide-react';
import { Modal, Button, Input } from '@/components';
import { Role, Company, Project, Supplier } from '@/types';
import { formatRole } from '@/utils/helpers';

interface UserWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userData: any) => void;
    isSubmitting?: boolean;
    editingUser: any | null;
    isAr: boolean;
    isCompanyAdmin: boolean;
    currentUser: any;
    companies: Company[];
    projects: Project[];
    suppliers: Supplier[];
}

const getRoleIcon = (role: Role) => {
    // You might want to import this from a shared helper or pass it down if it's complex, 
    // but for now I'll duplicate the simple switch case or import if I extracted it.
    // Since I didn't extract the icon helper globally yet, I'll keep it simple here.
    return <Shield size={16} />;
};

const UserWizard: React.FC<UserWizardProps> = ({
    isOpen,
    onClose,
    onSave,
    isSubmitting,
    editingUser,
    isAr,
    isCompanyAdmin,
    currentUser,
    companies,
    projects,
    suppliers
}) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>(isCompanyAdmin ? Role.PROJECT_USER : Role.DATA_ENTRY);
    const [companyId, setCompanyId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [avatar, setAvatar] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingUser) {
                setName(editingUser.name || '');
                setEmail(editingUser.email || '');
                setPassword(editingUser.password || '');
                setRole(editingUser.role || (isCompanyAdmin ? Role.PROJECT_USER : Role.DATA_ENTRY));
                setCompanyId(editingUser.company_id || '');
                setProjectId(editingUser.project_id || '');
                setSupplierId(editingUser.supplier_id || '');
                setAvatar(editingUser.avatar || '');
            } else {
                setName('');
                setEmail('');
                setPassword('');
                setRole(isCompanyAdmin ? Role.PROJECT_USER : Role.DATA_ENTRY);
                setCompanyId(isCompanyAdmin ? currentUser.company_id! : '');
                setProjectId('');
                setSupplierId('');
                setAvatar('');
            }
            setError('');
        }
    }, [isOpen, editingUser, isCompanyAdmin, currentUser]);

    const validate = () => {
        if (!name.trim()) { setError(isAr ? 'الاسم مطلوب' : 'Name is required'); return false; }
        if (!email.trim()) { setError(isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required'); return false; }
        if (!editingUser && !password.trim()) { setError(isAr ? 'يجب تعيين كلمة مرور' : 'Password is required'); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email'); return false; }
        if ((role === Role.COMPANY_USER || role === Role.PROJECT_USER) && !companyId) { setError(isAr ? 'يجب اختيار الشركة المرتبطة' : 'Please select a company'); return false; }
        if (role === Role.PROJECT_USER && !projectId) { setError(isAr ? 'يجب اختيار المشروع المرتبط' : 'Please select a project'); return false; }
        if (role === Role.SUBCONTRACTOR && !supplierId) { setError(isAr ? 'يجب اختيار المورد المرتبط' : 'Please select a supplier'); return false; }
        setError('');
        return true;
    };

    const handleSave = () => {
        if (validate()) {
            onSave({
                name,
                email,
                password,
                role,
                companyId: companyId || undefined,
                projectId: projectId || undefined,
                supplierId: supplierId || undefined,
                avatar: avatar || '/logo.png'
            });
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={editingUser ? (isAr ? 'تعديل بيانات العضو' : 'Edit Member Profile') : (isAr ? 'دعوة عضو جديد للفريق' : 'Operational Workforce Invitation')}
        >
            <div className={`space-y-6 pt-2 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar ${isAr ? 'text-right' : 'text-left'}`}>
                {/* Basic Information Section */}
                <div className="p-6 bg-surface-subtle rounded-xl border border-border space-y-6">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-text-subtle tracking-widest mb-4">
                        <UserIcon size={16} className="text-primary" /> {isAr ? 'المعلومات الأساسية' : 'Basic Information'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest block ml-1 flex items-center gap-2">
                                <UserIcon size={12} /> {isAr ? 'اسم المستخدم الكامل' : 'Full Name'}
                            </label>
                            <Input className="py-4 font-bold" value={name} onChange={setName} placeholder="e.g. Ahmad Ali" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest block ml-1 flex items-center gap-2">
                                <Mail size={12} /> {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                            </label>
                            <Input type="email" className="py-4 font-bold" value={email} onChange={setEmail} placeholder="colleague@gcm-waste.com" />
                        </div>
                    </div>
                </div>

                {/* Authentication & Profile Identity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-success-muted rounded-xl border border-success/30 space-y-4">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-success tracking-widest mb-4">
                            <Lock size={16} /> {isAr ? 'بروتوكول المصادقة' : 'Authentication Protocol'}
                        </h4>
                        <Input
                            icon={Lock}
                            value={password}
                            onChange={setPassword}
                            className="bg-transparent border-none outline-none font-bold text-lg text-success !p-0 shadow-none focus:ring-0"
                            containerClassName="!space-y-0"
                            placeholder="SET PASSWORD"
                        />
                    </div>

                    <div className="p-6 bg-surface-subtle rounded-xl border border-border space-y-4">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-text-subtle tracking-widest mb-4">
                            <UserIcon size={16} className="text-primary" /> {isAr ? 'الصورة الشخصية' : 'Profile Identity'}
                        </h4>
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            setAvatar(reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                    accept="image/*"
                                />
                                <div className="w-16 h-16 rounded-2xl bg-surface border-2 border-dashed border-border flex items-center justify-center text-text-subtle group-hover:border-primary transition-all overflow-hidden">
                                    {(avatar || name) ? (
                                        <img
                                            src={avatar || '/logo.png'}
                                            alt="avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <UserIcon size={24} />
                                    )}
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'تحديث الصورة' : 'Update Avatar'}</p>
                                <p className="text-[9px] text-text-subtle opacity-70">{isAr ? 'اضغط للرفع أو السحب' : 'Click to upload'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Role Assignment Section */}
                {!isCompanyAdmin && (
                    <div className="p-6 bg-surface-subtle rounded-xl border border-border space-y-6">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-primary tracking-widest mb-4">
                            <Shield size={16} /> {isAr ? 'الدور الوظيفي' : 'Role Assignment'}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[Role.ADMIN, Role.COMPANY_USER, Role.PROJECT_USER, Role.STAFF, Role.DATA_ENTRY, Role.LOGISTICS, Role.ACCOUNTANT, Role.SUBCONTRACTOR, Role.REPORTS_MANAGER, Role.DRIVER].map(r => (
                                <button
                                    key={r}
                                    onClick={() => { setRole(r); setCompanyId(''); setProjectId(''); setSupplierId(''); }}
                                    className={`p-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border-2 text-center flex flex-col items-center gap-3 ${role === r ? 'bg-primary text-surface border-primary-600 shadow-xl shadow-primary/20 scale-105' : 'bg-surface text-text-subtle border-border hover:border-primary/20 hover:scale-102'}`}
                                >
                                    <div className={`p-3 rounded-xl ${role === r ? 'bg-white/20' : 'bg-surface-subtle'}`}>
                                        <Shield size={16} />
                                    </div>
                                    {formatRole(r, isAr)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Organizational Assignment Section */}
                <div className="p-6 bg-surface-subtle rounded-xl border border-border space-y-6">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-primary tracking-widest mb-4">
                        <Building2 size={16} /> {isAr ? 'التبعية التنظيمية' : 'Organizational Scope'}
                    </h4>

                    <div className="space-y-4">
                        {!isCompanyAdmin && (role === Role.COMPANY_USER || role === Role.PROJECT_USER) && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                <select className="w-full p-4 bg-surface rounded-2xl font-bold text-sm border-2 border-border outline-none focus:border-primary transition-all text-text-main" value={companyId} onChange={e => { setCompanyId(e.target.value); setProjectId(''); }}>
                                    <option value="">{isAr ? '--- اختر الشركة ---' : '--- CHOOSE ENTITY ---'}</option>
                                    {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
                                </select>
                            </motion.div>
                        )}

                        {(role === Role.PROJECT_USER) && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                <select className="w-full p-4 bg-surface rounded-2xl font-bold text-sm border-2 border-border outline-none focus:border-primary transition-all text-text-main" value={projectId} onChange={e => setProjectId(e.target.value)}>
                                    <option value="">{isAr ? '--- اختر المشروع ---' : '--- CHOOSE SITE ---'}</option>
                                    {projects.filter(p => isCompanyAdmin ? p.company_id === currentUser.company_id : p.company_id === companyId).map(p => (
                                        <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                                    ))}
                                </select>
                            </motion.div>
                        )}

                        {(role === Role.SUBCONTRACTOR || role === Role.DRIVER) && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                <select className="w-full p-4 bg-surface rounded-2xl font-bold text-sm border-2 border-border outline-none focus:border-primary transition-all text-text-main" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                                    <option value="">{isAr ? '--- اختر المورد (اختياري للسائق الداخلي) ---' : '--- CHOOSE SUPPLIER (OPTIONAL FOR INTERNAL) ---'}</option>
                                    {suppliers.length === 0 && (
                                        <option value="" disabled className="text-text-subtle italic">
                                            {isAr ? '(لا يوجد موردين مسجلين - يرجى إضافتهم من قائمة الموردين)' : '(No suppliers found - Please add via Suppliers menu)'}
                                        </option>
                                    )}
                                    {suppliers.map(s => (
                                        <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
                                    ))}
                                </select>
                            </motion.div>
                        )}
                    </div>
                </div>

                {error && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-danger-muted border-2 border-danger/20 rounded-3xl flex items-center gap-4 text-danger text-sm font-bold shadow-lg">
                        <AlertCircle size={24} className="shrink-0" /> {error}
                    </motion.div>
                )}

                <div className="pt-4 pb-8 flex gap-4">
                    <Button variant="secondary" onClick={onClose} className="flex-1 py-6 uppercase tracking-widest">{isAr ? 'إلغاء' : 'Abort'}</Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        isLoading={isSubmitting}
                        className="flex-2 py-6 bg-primary border-none shadow-primary/40 text-lg uppercase tracking-widest"
                        icon={UserPlus}
                    >
                        {isAr ? 'اعتماد العضوية' : 'ACTIVATE ACCESS'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default UserWizard;
