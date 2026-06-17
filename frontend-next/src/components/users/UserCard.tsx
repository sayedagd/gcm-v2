import React from 'react';
import Image from 'next/image';
import {
    Activity, Building2, Briefcase, UserCog, UserMinus, Shield, Truck,
    HardHat, Wallet, User as UserIcon
} from 'lucide-react';
import { Card } from '@/components';
import { Role, Company, Project, UserPresence, User } from '@/types';
import { formatRole, resolveImagePath, handleImageError } from '@/utils/helpers';
import { useConfirmDialog } from '@/components/common/ConfirmDialog';
import { useLookupMaps } from '@/hooks/useLookupMaps';

interface UserCardProps {
    user: User;
    currentUser: User;
    presence: UserPresence | undefined;
    isAr: boolean;
    isMasterAdmin: boolean;
    isCompanyAdmin: boolean;
    companies: Company[];
    projects: Project[];
    t: {
        card: {
            online: string;
            latestActivity: string;
            offline: string;
        }
    };
    tripsCount: number;
    onView: (user: User) => void;
    onEdit: (user: User) => void;
    onDelete: (userId: string) => void;
}

const getRoleIcon = (role: Role) => {
    switch (role) {
        case Role.ADMIN: return <Shield className="tone-info" />;
        case Role.COMPANY_USER: return <Building2 className="tone-success" />;
        case Role.PROJECT_USER: return <Briefcase className="text-primary" />;
        case Role.LOGISTICS: return <Truck className="tone-warning" />;
        case Role.DATA_ENTRY: return <HardHat className="tone-warning" />;
        case Role.ACCOUNTANT: return <Wallet className="tone-info" />;
        case Role.SUBCONTRACTOR: return <Truck className="tone-danger" />;
        default: return <UserIcon className="text-text-subtle" />;
    }
};

const UserCard: React.FC<UserCardProps> = ({
    user,
    currentUser,
    presence,
    isAr,
    isMasterAdmin,
    isCompanyAdmin,
    t,
    tripsCount,
    onView,
    onEdit,
    onDelete
}) => {
    const isOnline = Boolean(presence?.lastActive);
    const { confirm, ConfirmDialogRenderer } = useConfirmDialog();
    const { companyMap, projectMap } = useLookupMaps();
    const avatarSrc = resolveImagePath(user.avatar) || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

    return (<>
        <Card className="p-5 sm:p-8 flex flex-col group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-border bg-surface-subtle">
            {isOnline && (
                <div className={`accent-chip-strong absolute top-6 ${isAr ? 'left-6' : 'right-6'} flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest`}>
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    {t.card.online}
                </div>
            )}

            <div className="flex items-center gap-5 mb-8">
                <div className="relative">
                    <Image
                        src={avatarSrc}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-4 border-surface shadow-xl ${!user.avatar ? 'bg-surface-subtle p-2' : ''}`}
                        alt={user.name || 'User avatar'}
                        width={80}
                        height={80}
                        unoptimized
                        onError={handleImageError}
                    />
                    <div className="absolute -bottom-2 -right-2 p-1.5 sm:p-2 bg-surface rounded-2xl shadow-lg border border-border">
                        {getRoleIcon(user.role as Role)}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg sm:text-xl leading-none truncate text-text-main uppercase tracking-tight">{user.name}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-text-subtle mt-2 uppercase tracking-[0.2em] truncate">{user.email}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-surface rounded-full border border-border shadow-sm">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-text-subtle">{formatRole(user.role, isAr)}</span>
                </div>
                {user.company_id && (
                    <div className="accent-chip-strong flex items-center gap-2 px-4 py-1.5 rounded-full">
                        <Building2 size={12} />
                        <span className="text-[9px] font-bold uppercase truncate max-w-[100px]">{companyMap[user.company_id]?.company_name}</span>
                    </div>
                )}
                {user.project_id && (
                    <div className="accent-chip flex items-center gap-2 px-4 py-1.5 rounded-full">
                        <Briefcase size={12} />
                        <span className="text-[9px] font-bold uppercase truncate max-w-[100px]">{projectMap[user.project_id]?.project_name}</span>
                    </div>
                )}
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full shadow-sm ${isAr ? 'mr-auto' : 'ml-auto'} ${tripsCount > 0 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface border border-border text-text-subtle'}`}>
                    <span className="text-[9px] font-bold uppercase tracking-widest">{tripsCount} {isAr ? 'رحلات' : 'TRIPS'}</span>
                </div>
            </div>

            <button
                onClick={() => onView(user)}
                className="w-full mb-6 py-3 rounded-xl bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
            >
                <UserIcon size={14} className="group-hover/btn:scale-110 transition-transform" />
                {isAr ? 'عرض الملف الشخصي' : 'VIEW PROFILE'}
            </button>

            <div className="mt-auto pt-6 border-t border-border flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-text-subtle uppercase tracking-[0.2em] mb-1">{t.card.latestActivity}</span>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-text-subtle">
                        <Activity size={12} className="tone-info" />
                        {presence?.currentPage?.replace('/', ' ') || t.card.offline}
                    </div>
                </div>

                {(isMasterAdmin || (isCompanyAdmin && user.company_id === currentUser.company_id)) && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEdit(user)}
                            className="tone-info hover:bg-surface-subtle rounded-2xl h-11 w-11 p-0 flex items-center justify-center transition-all border border-transparent hover:border-border"
                        >
                            <UserCog size={18} />
                        </button>
                        {user.id !== currentUser.id && (
                            <button
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: isAr ? 'تأكيد التعطيل' : 'Confirm Deactivation',
                                        message: isAr ? 'هل أنت متأكد من تعطيل وصول هذا العضو؟' : 'Deactivate member access? This cannot be undone.',
                                        confirmLabel: isAr ? 'تعطيل' : 'Deactivate',
                                        variant: 'danger'
                                    });
                                    if (ok) onDelete(user.id);
                                }}
                                className="tone-danger hover:bg-surface-subtle rounded-2xl h-11 w-11 p-0 flex items-center justify-center transition-all border border-transparent hover:border-border"
                            >
                                <UserMinus size={18} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </Card>
        <ConfirmDialogRenderer />
    </>);
};

export default UserCard;
