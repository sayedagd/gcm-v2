
"use client";

import React, { useEffect, useState } from 'react';
import { AppShell, Burger, Group, ScrollArea, ActionIcon, Text, Menu, UnstyledButton, Indicator } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Sun, Moon, Globe, Bell, ExternalLink, ChevronRight, Sparkles, Search, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/context';
import { getMenuGroups } from './MenuConfig';
import NotificationsPopover from './NotificationsPopover';
import { Breadcrumbs } from './Breadcrumbs';
import { GlobalSearch } from './GlobalSearch';
import { formatRole } from '@/utils/helpers';
import { Role } from '@/types';

const translations = {
    ar: { ops: 'العمليات', logistics: 'اللوجستيات', admin: 'الإدارة', dashboard: 'الرئيسية', companies: 'الشركات', projects: 'المشاريع', trips: 'الرحلات', reports: 'التحليلات', fleet: 'الأسطول', inventory: 'المخزون', drivers: 'الموظفين', suppliers: 'الموردين', facilities: 'المرافق', accounting: 'المحاسبة', users: 'الفريق', services: 'الخدمات', settings: 'الإعدادات', landing: 'الموقع', monitor: 'المراقبة', profile: 'الملف الشخصي', logout: 'خروج', logs: 'سجل الأنشطة', notifs: 'الإشعارات' },
    en: { ops: 'Operations', logistics: 'Logistics', admin: 'Admin', dashboard: 'Dashboard', companies: 'Companies', projects: 'Projects', trips: 'Trips', reports: 'Analytics', fleet: 'Fleet', inventory: 'Inventory', drivers: 'Staff Hub', suppliers: 'Suppliers Hub', facilities: 'Facilities Hub', accounting: 'Finance', users: 'Team', services: 'Services', settings: 'Settings', landing: 'Landing', monitor: 'Monitor', profile: 'My Profile', logout: 'Logout', logs: 'Activity Logs', notifs: 'Notifications' }
};

interface MainLayoutProps {
    children: React.ReactNode;
}

type MenuItem = {
    name: string;
    href: string;
    icon: React.ElementType;
    roles: Role[];
};

type MenuGroup = {
    title: string;
    roles: Role[];
    items: MenuItem[];
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const [opened, { toggle, close }] = useDisclosure(true);
    const isMobile = useMediaQuery('(max-width: 48em)');
    const { currentUser, logout, saasConfig, updateSaaS, notifications, updatePresence, darkMode, setDarkMode } = useStore();
    const router = useRouter();
    const pathname = usePathname();
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

    const lang = (saasConfig.language === 'en' || saasConfig.language === 'ar') ? saasConfig.language : 'ar';
    const t = translations[lang] || translations['ar'];
    const isAr = lang === 'ar';
    const isDark = darkMode;

    // Keep sidebar usable during early boot by deriving a safe role from route when needed.
    const effectiveRole = React.useMemo(() => {
        const rawRole = String(currentUser?.role || '').trim().toUpperCase();
        if (Object.values(Role).includes(rawRole as Role)) {
            return rawRole as Role;
        }

        if (pathname.startsWith('/client')) return Role.CLIENT;
        if (pathname.startsWith('/subcontractor')) return Role.SUBCONTRACTOR;
        if (pathname.startsWith('/driver')) return Role.DRIVER;
        return Role.ADMIN;
    }, [currentUser?.role, pathname]);

    const CLIENT_ROLES = [Role.COMPANY_USER, Role.PROJECT_USER, Role.CLIENT];
    const scopedNotifications = React.useMemo(() => {
        if (CLIENT_ROLES.includes(effectiveRole)) {
            return notifications.filter(n =>
                n.userId === currentUser.id ||
                (currentUser.company_id && n.companyId === currentUser.company_id) ||
                (currentUser.project_id && n.projectId === currentUser.project_id)
            );
        }
        if (effectiveRole === Role.DRIVER) {
            return notifications.filter(n => {
                if (n.userId === currentUser.id) return true;
                const text = (n.title + ' ' + n.message).toLowerCase();
                return text.includes('اعتماد') || text.includes('approved') || text.includes('approval') || text.includes('expire') || text.includes('permit');
            });
        }
        return notifications;
    }, [notifications, currentUser, effectiveRole]);
    const unreadCount = scopedNotifications.filter(n => !n.isRead).length;

    useEffect(() => {
        document.documentElement.dir = isAr ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    }, [lang, isAr]);

    useEffect(() => {
        updatePresence({ currentPage: pathname });
    }, [pathname, updatePresence]);

    const menuGroups = getMenuGroups(t, isAr, effectiveRole) as MenuGroup[];
    const filteredGroups = menuGroups
        .filter((g) => g.roles.includes(effectiveRole))
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.roles.includes(effectiveRole))
        }));

    const visibleGroups = (filteredGroups.length > 0 ? filteredGroups : menuGroups)
        .map((group) => ({
            ...group,
            items: (group.items || []).filter((item) => (item.roles || []).includes(effectiveRole))
        }))
        .filter((group) => group.items.length > 0);

    const userInitials = (currentUser.name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

    // Auto-expand the group containing the active page
    useEffect(() => {
        let timerId: number | undefined;
        const activeGroupIdx = visibleGroups.findIndex((g) =>
            g.items.some((item) => pathname === item.href)
        );
        if (activeGroupIdx !== -1) {
            timerId = window.setTimeout(() => setExpandedGroup(activeGroupIdx), 0);
        }
        return () => {
            if (timerId !== undefined) window.clearTimeout(timerId);
        };
    }, [pathname, visibleGroups]);

    // Theme-aware sidebar tokens
    const sb = isDark ? {
        bg: 'linear-gradient(180deg, #0f172a 0%, #1a2744 50%, #0f172a 100%)',
        groupTitle: 'text-slate-500',
        itemText: 'text-slate-400',
        itemTextHover: 'hover:text-white',
        itemHoverBg: 'hover:bg-white/[0.06]',
        activeText: 'text-white',
        activeBg: 'bg-primary/10',
        activeIconBg: 'bg-primary/20 text-primary-300',
        hoverIconBg: 'bg-white/[0.08] text-slate-300',
        iconColor: 'text-slate-500',
        divider: 'via-slate-600/40',
        logoText: 'text-white',
        logoSub: 'text-slate-400',
        ctaBg: 'from-primary-700/90 via-primary-600/80 to-primary-800/70',
        ctaShadow: 'shadow-primary/20',
        ctaBtn: 'bg-white/20 hover:bg-white/30 border-white/10 hover:border-white/20',
        ctaText: 'text-white',
        ctaSubText: 'text-primary-200/80',
        ctaBodyText: 'text-primary-100/70',
        newTabHover: 'hover:bg-white/10 text-slate-500 hover:text-primary-300',
        chevronColor: 'text-primary/60',
        indicatorBg: 'bg-primary-400',
        indicatorBorder: 'border-slate-900',
        indicatorShadow: 'shadow-primary/50',
        borderClass: '!border-e-0',
    } : {
        bg: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%)',
        groupTitle: 'text-slate-400',
        itemText: 'text-slate-500',
        itemTextHover: 'hover:text-slate-900',
        itemHoverBg: 'hover:bg-slate-100/80',
        activeText: 'text-slate-900',
        activeBg: 'bg-primary/5',
        activeIconBg: 'bg-primary/10 text-primary',
        hoverIconBg: 'bg-slate-100 text-slate-600',
        iconColor: 'text-slate-400',
        divider: 'via-slate-200/80',
        logoText: 'text-slate-900',
        logoSub: 'text-slate-500',
        ctaBg: 'from-primary via-primary-600 to-primary-700',
        ctaShadow: 'shadow-primary/20',
        ctaBtn: 'bg-white/25 hover:bg-white/40 border-white/20 hover:border-white/30',
        ctaText: 'text-white',
        ctaSubText: 'text-primary-100',
        ctaBodyText: 'text-primary-50/90',
        newTabHover: 'hover:bg-slate-200/60 text-slate-400 hover:text-primary',
        chevronColor: 'text-primary/60',
        indicatorBg: 'bg-primary',
        indicatorBorder: 'border-white',
        indicatorShadow: 'shadow-primary/40',
        borderClass: 'border-e border-slate-200/80',
    };

    return (
        <AppShell
            header={{ height: 56 }}
            navbar={{
                width: 280,
                breakpoint: 'sm',
                collapsed: { mobile: !opened, desktop: !opened },
            }}
            padding="md"
            transitionDuration={300}
            transitionTimingFunction="ease"
        >
            {/* ═══════════════ HEADER ═══════════════ */}
            <AppShell.Header className="border-b border-border bg-surface transition-none">
                <Group h="100%" px="md" justify="space-between">
                    <Group gap="sm">
                        <Burger opened={opened} onClick={toggle} size="sm" />
                        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
                            {saasConfig.logoUrl ? (
                                <Image src={saasConfig.logoUrl} alt="Logo" className="h-8 w-auto object-contain" width={128} height={32} unoptimized />
                            ) : (
                                <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center overflow-hidden border border-border/50 shadow-sm">
                                    <Image src="/logo-light.png" alt="GCM" className="w-full h-full object-contain" width={32} height={32} />
                                </div>
                            )}
                            <Text fw={700} size="sm" className="text-text-main">
                                {isAr ? saasConfig.appNameAr : saasConfig.appNameEn}
                            </Text>
                        </Group>
                    </Group>

                    <Group gap={4}>
                        {/* Global Search Trigger */}
                        {currentUser?.role === Role.ADMIN && (
                            <UnstyledButton
                                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-subtle border border-border text-text-subtle text-xs font-medium hover:border-primary/50 hover:text-primary transition-colors"
                            >
                                <Search size={14} />
                                <span>{isAr ? 'بحث...' : 'Search...'}</span>
                                <kbd className="px-1.5 py-0.5 text-[9px] font-bold bg-surface border border-border rounded ml-2">Ctrl+K</kbd>
                            </UnstyledButton>
                        )}

                        <ActionIcon variant="subtle" size="md" radius="lg" onClick={() => updateSaaS({ language: isAr ? 'en' : 'ar' })}>
                            <Globe size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" size="md" radius="lg" onClick={() => setDarkMode(!darkMode)}>
                            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                        </ActionIcon>

                        <NotificationsPopover>
                            <ActionIcon variant="subtle" size="md" radius="lg">
                                <Indicator color="red" disabled={unreadCount === 0} size={6} offset={3}>
                                    <Bell size={16} />
                                </Indicator>
                            </ActionIcon>
                        </NotificationsPopover>

                        <Menu shadow="md" width={200} radius="lg">
                            <Menu.Target>
                                <UnstyledButton className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-subtle transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                        {userInitials}
                                    </div>
                                    <div className="hidden sm:block">
                                        <Text size="xs" fw={600} className="leading-tight">{currentUser.name}</Text>
                                        <Text c="dimmed" size="10px">{formatRole(currentUser.role, isAr)}</Text>
                                    </div>
                                </UnstyledButton>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item
                                    leftSection={<User size={14} />}
                                    onClick={() => router.push('/profile')}
                                >
                                    {t.profile}
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                    leftSection={<LogOut size={14} />}
                                    color="red"
                                    onClick={() => {
                                        logout();
                                        router.push('/logout');
                                    }}
                                >
                                    {t.logout}
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </AppShell.Header>

            {/* ═══════════════ PREMIUM SIDEBAR ═══════════════ */}
            <AppShell.Navbar
                className={`${sb.borderClass} transition-none overflow-hidden`}
                style={{ background: sb.bg }}
                p={0}
                id="MAIN-LAYOUT-V3"
            >
                {/* Logo / Brand Section */}
                <div className="px-4 pt-5 pb-4">
                    <div className="flex items-center gap-3" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                            {saasConfig.logoUrl ? (
                                <Image src={saasConfig.logoUrl} alt="Logo" className="w-full h-full object-contain" width={44} height={44} unoptimized />
                            ) : (
                                <Image src="/logo-light.png" alt="GCM" className="w-full h-full object-contain" width={44} height={44} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${sb.logoText} truncate`}>
                                {isAr ? saasConfig.appNameAr || 'GCM للخدمات البيئية' : saasConfig.appNameEn || 'GCM Environmental'}
                            </p>
                            <p className={`text-[11px] ${sb.logoSub} font-medium truncate`}>
                                {isAr ? 'نظام إدارة العمليات' : 'Operations Platform'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className={`mx-4 h-px bg-gradient-to-r from-transparent ${sb.divider} to-transparent`} />

                {/* Navigation Groups — Accordion Style */}
                <ScrollArea className="flex-1 custom-scrollbar" type="scroll" style={{ padding: '8px 0' }}>
                    <div className="px-3 py-2 space-y-1">
                        {visibleGroups.map((group, gIdx: number) => {
                            const hasActiveChild = group.items.some((item) => pathname === item.href);
                            const isGroupOpen = expandedGroup === gIdx;

                            return (
                                <div key={gIdx}>
                                    {/* Group Header — Clickable Accordion Toggle */}
                                    <button
                                        onClick={() => setExpandedGroup(isGroupOpen ? null : gIdx)}
                                        className={`
                                            w-full flex items-center justify-between px-3 py-2.5 rounded-xl
                                            transition-all duration-200 mb-0.5
                                            ${isGroupOpen || hasActiveChild
                                                ? `${sb.activeText} ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100/80'}`
                                                : `${sb.itemText} ${sb.itemHoverBg}`
                                            }
                                        `}
                                    >
                                        <span className={`text-[11px] font-bold uppercase tracking-[0.12em] ${isGroupOpen || hasActiveChild ? sb.activeText : sb.groupTitle}`}>
                                            {group.title}
                                        </span>
                                        <motion.div
                                            animate={{ rotate: isGroupOpen ? 90 : 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ChevronRight size={14} className={`${isGroupOpen ? sb.chevronColor : sb.iconColor} ${isAr && !isGroupOpen ? 'rotate-180' : ''}`} />
                                        </motion.div>
                                    </button>

                                    {/* Collapsible Nav Items */}
                                    <AnimatePresence initial={false}>
                                        {isGroupOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                                className="overflow-hidden"
                                            >
                                                <div className={`space-y-0.5 ${isAr ? 'pr-2' : 'pl-2'} pb-2 pt-1`}>
                                                    {group.items.map((item, iIdx: number) => {
                                                        const isActive = pathname === item.href;
                                                        const itemKey = `${gIdx}-${iIdx}`;
                                                        const isHovered = hoveredItem === itemKey;

                                                        return (
                                                            <motion.div
                                                                key={iIdx}
                                                                initial={{ opacity: 0, x: isAr ? 8 : -8 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: iIdx * 0.03 }}
                                                                onHoverStart={() => setHoveredItem(itemKey)}
                                                                onHoverEnd={() => setHoveredItem(null)}
                                                                whileTap={{ scale: 0.97 }}
                                                            >
                                                                <Link
                                                                    href={item.href}
                                                                    onClick={() => { if (isMobile) close(); }}
                                                                    className={`
                                                                        group relative flex items-center gap-3 px-3 py-2 rounded-xl
                                                                        transition-all duration-200 no-underline
                                                                        ${isActive
                                                                            ? `${sb.activeBg} ${sb.activeText}`
                                                                            : `${sb.itemText} ${sb.itemTextHover} ${sb.itemHoverBg}`
                                                                        }
                                                                    `}
                                                                >
                                                                    {/* Active Indicator Bar */}
                                                                    {isActive && (
                                                                        <motion.div
                                                                            layoutId="activeIndicator"
                                                                            className={`absolute ${isAr ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 w-1 h-5 rounded-full ${sb.indicatorBg} shadow-lg ${sb.indicatorShadow}`}
                                                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                                        />
                                                                    )}

                                                                    {/* Icon Container */}
                                                                    <div className={`
                                                                        flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
                                                                        ${isActive
                                                                            ? sb.activeIconBg
                                                                            : isHovered
                                                                                ? sb.hoverIconBg
                                                                                : sb.iconColor
                                                                        }
                                                                    `}>
                                                                        <item.icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                                                                    </div>

                                                                    {/* Label */}
                                                                    <span className={`text-[13px] font-semibold flex-1 ${isActive ? sb.activeText : ''}`}>
                                                                        {item.name}
                                                                    </span>

                                                                    {/* Right Actions */}
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(item.href, '_blank'); }}
                                                                            className={`opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded-md ${sb.newTabHover}`}
                                                                            title={isAr ? 'فتح في علامة تبويب جديدة' : 'Open in new tab'}
                                                                        >
                                                                            <ExternalLink size={12} />
                                                                        </button>
                                                                        {isActive && (
                                                                            <ChevronRight size={13} className={`${sb.chevronColor} ${isAr ? 'rotate-180' : ''}`} />
                                                                        )}
                                                                    </div>
                                                                </Link>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

            </AppShell.Navbar>

            {/* ═══════════════ MAIN CONTENT ═══════════════ */}
            <AppShell.Main style={{ backgroundColor: 'var(--surface-subtle)' }}>
                <Breadcrumbs />
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
                {currentUser?.role === Role.ADMIN && <GlobalSearch />}
            </AppShell.Main>
        </AppShell>
    );
};
