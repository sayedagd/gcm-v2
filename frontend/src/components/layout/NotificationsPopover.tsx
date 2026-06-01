
import React from 'react';
import { Popover, Text, ScrollArea, Group, Stack, ActionIcon, Indicator, Badge, UnstyledButton, Avatar, Tooltip } from '@mantine/core';
import { Bell, CheckCheck, Activity, AlertCircle, Info, ShieldCheck, Zap, Trash2, Eye, EyeOff, MapPin, ExternalLink } from 'lucide-react';
import { useStore } from '@/context';
import { NotificationType, Role } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface NotificationsPopoverProps {
    children: React.ReactNode;
}

const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ children }) => {
    const {
        notifications,
        saasConfig,
        markAllNotificationsRead,
        deleteAllNotifications,
        toggleNotificationRead,
        deleteNotification,
        presenceMap,
        currentUser
    } = useStore();

    const navigate = useNavigate();
    const isAr = saasConfig.language === 'ar';
    const lang = saasConfig.language === 'ar' ? 'ar' : 'en';

    const filteredNotifications = React.useMemo(() => {
        const CLIENT_ROLES = [Role.COMPANY_USER, Role.PROJECT_USER, Role.CLIENT];

        // Client users: only show notifications addressed to them or tagged with their company/project
        if (CLIENT_ROLES.includes(currentUser.role as Role)) {
            return notifications.filter(n => {
                // Always show if notification is addressed directly to this user
                if (n.userId === currentUser.id) return true;
                // Show if tagged with user's company
                if (currentUser.company_id && n.companyId === currentUser.company_id) return true;
                // Show if tagged with user's project
                if (currentUser.project_id && n.projectId === currentUser.project_id) return true;
                return false;
            });
        }

        // Driver: only show approval and document expiry notifications
        if (currentUser.role === Role.DRIVER) {
            return notifications.filter(n => {
                if (n.userId === currentUser.id) return true;
                const text = (n.title + ' ' + n.message).toLowerCase();
                const isApproval = text.includes('اعتماد') || text.includes('approved') || text.includes('approval') || text.includes('قبول');
                const isExpiry = text.includes('مستند') || text.includes('تصريح') || text.includes('انتهاء') || text.includes('expire') || text.includes('permit') || text.includes('document');
                return isApproval || isExpiry;
            });
        }

        return notifications;
    }, [notifications, currentUser.role, currentUser.id, currentUser.company_id, currentUser.project_id]);

    const unreadCount = filteredNotifications.filter(n => !n.isRead).length;

    // Filter active users in the last 2 minutes, excluding self
    const activeUsers = Object.values(presenceMap).filter(p => {
        const lastActive = new Date(p.lastActive).getTime();
        const now = Date.now();
        return p.userId !== currentUser.id && (now - lastActive < 120000);
    });

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case NotificationType.SYSTEM: return <Zap size={14} className="text-blue-500" />;
            case NotificationType.SECURITY: return <ShieldCheck size={14} className="text-rose-500" />;
            case NotificationType.OPERATIONAL: return <Activity size={14} className="text-amber-500" />;
            case NotificationType.ACCESS_REQUEST: return <Info size={14} className="text-violet-500" />;
            case NotificationType.ERROR: return <AlertCircle size={14} className="text-red-500" />;
            case NotificationType.WARNING: return <AlertCircle size={14} className="text-orange-500" />;
            case NotificationType.SUCCESS: return <CheckCheck size={14} className="text-emerald-500" />;
            default: return <Bell size={14} className="text-slate-400" />;
        }
    };

    const handleNotificationClick = (notif: typeof notifications[0]) => {
        // Mark as read on click
        if (!notif.isRead) {
            toggleNotificationRead(notif.id);
        }
        // Navigate if the notification has a link
        const target = notif.link || notif.actionUrl;
        if (target) {
            navigate(target);
        }
    };

    return (
        <Popover width={400} position="bottom-end" shadow="xl" radius="lg" withArrow offset={10}>
            <Popover.Target>
                {children}
            </Popover.Target>
            <Popover.Dropdown p={0} className="overflow-hidden border-border">
                {/* Header */}
                <div className="p-3.5 border-b border-border">
                    <Group justify="space-between">
                        <Group gap="xs">
                            <Text fw={700} size="sm">
                                {isAr ? 'الإشعارات' : 'Notifications'}
                            </Text>
                            {unreadCount > 0 && (
                                <Badge color="red" variant="filled" size="xs" circle>
                                    {unreadCount}
                                </Badge>
                            )}
                        </Group>
                        <Group gap={4}>
                            <Tooltip label={isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}>
                                <ActionIcon
                                    variant="subtle"
                                    color="primary"
                                    size="sm"
                                    onClick={markAllNotificationsRead}
                                    disabled={unreadCount === 0}
                                >
                                    <CheckCheck size={16} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label={isAr ? 'حذف الكل' : 'Delete all'}>
                                <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    size="sm"
                                    onClick={deleteAllNotifications}
                                    disabled={filteredNotifications.length === 0}
                                >
                                    <Trash2 size={16} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Group>
                </div>

                {/* Team Presence Section */}
                {activeUsers.length > 0 && (
                    <div className="px-4 py-3 bg-emerald-500/5 border-b border-border">
                        <Text size="xs" fw={600} c="dimmed" mb={8} className="uppercase tracking-wider flex items-center gap-1.5">
                            <Activity size={12} className="text-emerald-500" />
                            {isAr ? 'نشاط الفريق' : 'Team Activity'}
                        </Text>
                        <Stack gap={6}>
                            {activeUsers.map(user => (
                                <Group key={user.userId} gap="xs" wrap="nowrap">
                                    <Indicator color="emerald" position="bottom-end" offset={2} processing>
                                        <Avatar size="xs" radius="xl" color="initials" name={user.userName} />
                                    </Indicator>
                                    <div className="flex-1 min-w-0">
                                        <Text size="xs" fw={700} className="truncate">{user.userName}</Text>
                                        <Text size="10px" c="dimmed" className="truncate flex items-center gap-1">
                                            <MapPin size={10} />
                                            {isAr ? 'يشاهد:' : 'Viewing:'} {user.currentPage}
                                        </Text>
                                    </div>
                                </Group>
                            ))}
                        </Stack>
                    </div>
                )}

                {/* Notifications List */}
                <ScrollArea.Autosize mah={400} type="scroll" offsetScrollbars>
                    {filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-30">
                            <Bell size={32} />
                            <Text size="xs" fw={700}>
                                {isAr ? 'لا توجده تنبيهات' : 'Zero notifications'}
                            </Text>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {[...filteredNotifications].reverse().map((notif) => {
                                const hasLink = !!(notif.link || notif.actionUrl);
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`group p-4 transition-all ${hasLink ? 'cursor-pointer hover:bg-primary-500/8 active:scale-[0.995]' : 'hover:bg-surface-subtle'} ${!notif.isRead ? 'bg-primary-500/5' : ''}`}
                                    >
                                        <Group align="flex-start" wrap="nowrap" gap="sm">
                                            <div className="mt-1 shrink-0">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <Text size="xs" fw={700} className="truncate">
                                                        {notif.title}
                                                    </Text>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {hasLink && (
                                                            <ExternalLink size={10} className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                        <Text size="10px" c="dimmed" fw={600}>
                                                            {formatDistanceToNow(new Date(notif.timestamp), {
                                                                addSuffix: false,
                                                                locale: lang === 'ar' ? ar : enUS
                                                            })}
                                                        </Text>
                                                    </div>
                                                </div>
                                                <Text size="xs" c="dimmed" className="leading-snug line-clamp-2">
                                                    {notif.message}
                                                </Text>

                                                {/* Action Bar (Visible on Hover) */}
                                                <Group gap={8} mt={10} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <UnstyledButton
                                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleNotificationRead(notif.id); }}
                                                        className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                                                    >
                                                        {notif.isRead ? <EyeOff size={12} /> : <Eye size={12} />}
                                                        {notif.isRead ? (isAr ? 'غير مقروء' : 'Unread') : (isAr ? 'مقروء' : 'Read')}
                                                    </UnstyledButton>
                                                    <UnstyledButton
                                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                                        className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:underline"
                                                    >
                                                        <Trash2 size={12} />
                                                        {isAr ? 'حذف' : 'Delete'}
                                                    </UnstyledButton>
                                                </Group>
                                            </div>
                                            {!notif.isRead && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5 shadow-[0_0_8px_var(--primary-color)]" />
                                            )}
                                        </Group>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea.Autosize>

                {/* Footer */}
                {filteredNotifications.length > 0 && (
                    <div className="p-3 border-t border-border text-center">
                        <Text
                            size="xs"
                            fw={600}
                            c="primary"
                            className="cursor-pointer hover:underline"
                            onClick={() => navigate('/l')}
                        >
                            {isAr ? 'عرض كافة الأنشطة' : 'View all activity logs'}
                        </Text>
                    </div>
                )}
            </Popover.Dropdown>
        </Popover>
    );
};

export default NotificationsPopover;
