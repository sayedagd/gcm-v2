import React, { useMemo } from 'react';
import {
    Activity, Building2, Briefcase, UserCog, Mail, Key, Shield, Clock, MapPin, Truck, HardHat, Wallet, User as UserIcon
} from 'lucide-react';
import { Card, StatCard, Button } from '@/components';
import { Role, Company, Project, UserPresence, Trip } from '@/types';
import { formatRole, resolveImagePath, formatDate, handleImageError } from '@/utils/helpers';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface UserDetailsProps {
    user: any;
    presence: UserPresence | undefined;
    isAr: boolean;
    companies: Company[];
    projects: Project[];
    trips: Trip[];
    onEdit: () => void;
}

const getRoleIcon = (role: Role) => {
    switch (role) {
        case Role.ADMIN: return <Shield className="text-white" />;
        case Role.COMPANY_USER: return <Building2 className="text-white" />;
        case Role.PROJECT_USER: return <Briefcase className="text-white" />;
        case Role.LOGISTICS: return <Truck className="text-white" />;
        case Role.DATA_ENTRY: return <HardHat className="text-white" />;
        case Role.ACCOUNTANT: return <Wallet className="text-white" />;
        case Role.SUBCONTRACTOR: return <Truck className="text-white" />;
        default: return <UserIcon className="text-white" />;
    }
};

const UserDetails: React.FC<UserDetailsProps> = ({
    user,
    presence,
    isAr,
    companies,
    projects,
    trips,
    onEdit
}) => {
    if (!user) return null;

    const isOnline = presence && (Date.now() - new Date(presence.lastActive).getTime() < 60000);
    const company = companies.find(c => c.company_id === user.company_id);
    const project = projects.find(p => p.project_id === user.project_id);

    const userTrips = useMemo(() => {
        return trips.filter(t => t.driver_id === user.id || t.supervisor_name === user.name || t.gcm_supervisor_name === user.name);
    }, [trips, user.id, user.name]);

    const onlineText = isOnline ? (isAr ? 'نشط الآن' : 'ONLINE') : (isAr ? 'غير متصل' : 'OFFLINE');
    const roleText = formatRole(user.role, isAr);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Employee Hero Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 bg-surface-subtle rounded-[2rem] border border-border relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-10 transition-colors ${isOnline ? 'bg-emerald-500' : 'bg-primary'}`} />

                <div className="flex items-center gap-6 relative z-10">
                    <div className="relative">
                        <img
                            src={resolveImagePath(user.avatar) || undefined}
                            className={`w-20 h-20 sm:w-28 sm:h-28 rounded-[2rem] border-4 border-surface shadow-2xl object-cover ${!user.avatar ? 'bg-surface-subtle p-2' : ''}`}
                            alt={user.name}
                            onError={handleImageError}
                        />
                        <div className={`absolute -bottom-3 -right-3 p-3 rounded-2xl shadow-xl border-4 border-surface ${isOnline ? 'bg-emerald-500' : 'bg-primary'}`}>
                            {getRoleIcon(user.role as Role)}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.3em] font-mono">{user.id || 'N/A'}</span>
                            <div className="h-1 w-1 rounded-full bg-text-subtle/30" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] flex items-center gap-1">
                                <Shield size={10} /> {roleText}
                            </span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight uppercase leading-tight mb-4">{user.name}</h2>

                        <div className="flex flex-wrap gap-2">
                            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isOnline ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-surface border border-border text-text-subtle'}`}>
                                <div className={`h-2 w-2 rounded-full ${isOnline ? 'animate-pulse bg-emerald-500' : 'bg-text-subtle'}`} />
                                {onlineText}
                            </div>
                            <div className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface border border-border text-text-subtle flex items-center gap-2">
                                <Mail size={12} /> {user.email}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 relative z-10">
                    <Button
                        variant="primary"
                        icon={UserCog}
                        onClick={onEdit}
                        className="h-14 px-8 rounded-2xl font-bold tracking-widest text-xs uppercase"
                    >
                        {isAr ? 'إدارة الصلاحيات' : 'Manage Access'}
                    </Button>
                </div>
            </div>

            {/* Smart KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title={isAr ? 'الرحلات المسجلة' : 'Trips Logged'}
                    value={userTrips.length}
                    icon={MapPin}
                    variant="blue"
                />
                <StatCard
                    title={isAr ? 'الشركة التابع لها' : 'Affiliation'}
                    value={company ? company.company_name : (isAr ? 'جميع الشركات / GCM' : 'GCM HUB')}
                    icon={Building2}
                    variant="emerald"
                />
                <StatCard
                    title={isAr ? 'المشروع المخصص' : 'Project Scope'}
                    value={project ? project.project_name : (isAr ? 'كافة المشاريع' : 'GLOBAL SCOPE')}
                    icon={Briefcase}
                    variant="amber"
                />
                <StatCard
                    title={isAr ? 'حالة الحساب' : 'Account Status'}
                    value={user.role === Role.DEACTIVATED ? (isAr ? 'معطل' : 'INACTIVE') : (isAr ? 'مفعل' : 'ACTIVE')}
                    icon={Key}
                    variant={user.role === Role.DEACTIVATED ? "amber" : "blue"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Authorization & Tracking Data */}
                <Card className="p-8 space-y-6 flex flex-col">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-text-subtle">
                        <Shield size={16} /> {isAr ? 'هوية النظام والمصادقة' : 'System ID & Auth'}
                    </h4>

                    <div className="space-y-4 flex-1">
                        <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-2xl border border-border">
                            <span className="text-xs font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'مستوى الصلاحية' : 'Privilege Level'}</span>
                            <span className="text-xs font-black text-primary uppercase">{roleText}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-2xl border border-border">
                            <span className="text-xs font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الارتباط المؤسسي' : 'Entity Binding'}</span>
                            <span className="text-xs font-black text-text-main uppercase text-right truncate pl-4">
                                {company ? company.company_name : 'GLOBAL (GCM)'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-2xl border border-border">
                            <span className="text-xs font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'نطاق المشروع' : 'Project Scope'}</span>
                            <span className="text-xs font-black text-text-main uppercase text-right truncate pl-4">
                                {project ? project.project_name : 'UNRESTRICTED'}
                            </span>
                        </div>
                        {user.supplier_id && (
                            <div className="flex items-center justify-between p-4 bg-amber-muted/30 rounded-2xl border border-amber/20">
                                <span className="text-xs font-bold text-amber uppercase tracking-widest">{isAr ? 'المورد المرتبط' : 'Supplier Link'}</span>
                                <span className="text-xs font-black text-amber uppercase">{user.supplier_id}</span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Activity Trail */}
                <Card className="p-8 space-y-6 flex flex-col">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-text-subtle">
                        <Activity size={16} /> {isAr ? 'تتبع النشاط التشغيلي' : 'Operational Activity Trail'}
                    </h4>

                    <div className="space-y-6 flex-1">
                        {presence ? (
                            <div className="space-y-4">
                                <div className="border-l-2 border-primary/30 pl-6 pb-2 relative">
                                    <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                                    <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">
                                        {isAr ? 'آخر ظهور' : 'Last Seen Engine'}
                                    </p>
                                    <p className="text-sm font-bold text-text-main uppercase mb-1">{presence.currentPage || '/home'}</p>
                                    <p className="text-[10px] text-text-subtle font-bold italic">
                                        {formatDistanceToNow(new Date(presence.lastActive), {
                                            addSuffix: true,
                                            ...(isAr ? { locale: ar } : {})
                                        })}
                                    </p>
                                </div>
                                <div className="border-l-2 border-border pl-6 relative">
                                    <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-border" />
                                    <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">
                                        {isAr ? 'تأكيد الحضور' : 'Presence Pulse'}
                                    </p>
                                    <p className="text-[10px] text-text-main font-mono">
                                        {formatDate(presence.lastActive)}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-10 bg-surface-subtle rounded-3xl border border-dashed border-border text-center flex flex-col items-center justify-center h-full">
                                <Clock size={32} className="text-text-subtle/30 mb-4" />
                                <p className="text-xs font-bold text-text-subtle opacity-50 uppercase tracking-widest">
                                    {isAr ? 'لم يتم تسجيل دخوله بعد' : 'No presence telemetry logged yet'}
                                </p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default UserDetails;
