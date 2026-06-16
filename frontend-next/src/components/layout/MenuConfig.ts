
import {
    LayoutDashboard, Building2, Briefcase, ClipboardList, BarChart3,
    Truck, Package, HardHat, Users, Box, Activity, ScrollText, MapPin, Layout as LayoutIcon,
    FileText, Map, User, FolderOpen, Headphones, Zap
} from 'lucide-react';
import { Role } from '../../types';

export const getMenuGroups = (t: any, isAr: boolean, role: Role) => {
    const isClient = [Role.COMPANY_USER, Role.PROJECT_USER, Role.CLIENT].includes(role);

    if (isClient) {
        return [
            {
                title: isAr ? 'بوابة العميل' : 'Client Portal',
                roles: [Role.COMPANY_USER, Role.PROJECT_USER, Role.CLIENT],
                items: [
                    { name: t.dashboard, href: '/client/dashboard', icon: LayoutDashboard, roles: [Role.COMPANY_USER, Role.PROJECT_USER, Role.CLIENT] },
                    { name: isAr ? 'التقارير' : 'Reports', href: '/client/reports', icon: FileText, roles: [Role.COMPANY_USER, Role.PROJECT_USER, Role.CLIENT] },
                    { name: isAr ? 'الحساب والعقود' : 'Account & Contracts', href: '/client/account', icon: FolderOpen, roles: [Role.COMPANY_USER, Role.PROJECT_USER, Role.CLIENT] },
                    { name: isAr ? 'الدعم الفني' : 'Support', href: '/client/support', icon: Headphones, roles: [Role.COMPANY_USER, Role.PROJECT_USER, Role.CLIENT] },
                ]
            }
        ]
    }

    if (role === Role.SUBCONTRACTOR) {
        return [
            {
                title: isAr ? 'بوابة الموردين' : 'Partner Portal',
                roles: [Role.SUBCONTRACTOR],
                items: [
                    { name: isAr ? 'الرئيسية' : 'Dashboard', href: '/subcontractor/dashboard', icon: LayoutDashboard, roles: [Role.SUBCONTRACTOR] },
                    { name: isAr ? 'ملف المورد' : 'My Profile', href: '/subcontractor/profile', icon: User, roles: [Role.SUBCONTRACTOR] },
                    { name: isAr ? 'الأصول والمعدات' : 'My Assets', href: '/subcontractor/assets', icon: Truck, roles: [Role.SUBCONTRACTOR] },
                ]
            }
        ];
    }

    if (role === Role.DRIVER) {
        return [
            {
                title: isAr ? 'بوابة السائقين' : 'Driver Portal',
                roles: [Role.DRIVER],
                items: [
                    { name: isAr ? 'لوحة العمل' : 'Dashboard', href: '/driver', icon: LayoutDashboard, roles: [Role.DRIVER] },
                    { name: isAr ? 'الخريطة' : 'Map', href: '/driver/map', icon: Map, roles: [Role.DRIVER] }
                ]
            }
        ];
    }

    const internalMenus = [
    {
        title: t.ops,
        roles: [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS, Role.ACCOUNTANT, Role.REPORTS_MANAGER, Role.DRIVER],
        items: [
            { name: t.dashboard, href: '/dashboard', icon: LayoutDashboard, roles: [Role.ADMIN, Role.ACCOUNTANT, Role.DATA_ENTRY, Role.DRIVER] },
            { name: t.companies, href: '/companies', icon: Building2, roles: [Role.ADMIN] },
            { name: t.projects, href: '/projects', icon: Briefcase, roles: [Role.ADMIN] },
            { name: t.trips, href: '/trips', icon: ClipboardList, roles: [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS, Role.REPORTS_MANAGER, Role.DRIVER] },
            { name: isAr ? 'لوحة التقارير' : 'Reports Hub', href: '/reports-dashboard', icon: BarChart3, roles: [Role.ADMIN, Role.REPORTS_MANAGER] }
        ]
    },
    {
        title: t.logistics,
        roles: [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS],
        items: [
            { name: t.fleet, href: '/fleet', icon: Truck, roles: [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS] },
            { name: t.inventory, href: '/inventory', icon: Package, roles: [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS] },
            { name: t.drivers, href: '/drivers', icon: HardHat, roles: [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS] },
            { name: isAr ? 'قائمة الطلبات والتتبع' : 'Trip Queue & Tracking', href: '/logistics/trip-queue', icon: MapPin, roles: [Role.ADMIN, Role.LOGISTICS, Role.REPORTS_MANAGER] },
            { name: t.suppliers, href: '/suppliers', icon: Building2, roles: [Role.ADMIN, Role.LOGISTICS] },
            { name: t.facilities, href: '/facilities', icon: Building2, roles: [Role.ADMIN, Role.REPORTS_MANAGER] }
        ]
    },
    {
        title: t.admin,
        roles: [Role.ADMIN, Role.ACCOUNTANT, Role.REPORTS_MANAGER],
        items: [
            { name: t.accounting, href: '/accountant-portal', icon: BarChart3, roles: [Role.ADMIN, Role.ACCOUNTANT] },
            { name: t.users, href: '/user-management', icon: Users, roles: [Role.ADMIN] },
            { name: t.services, href: '/services', icon: Box, roles: [Role.ADMIN, Role.REPORTS_MANAGER] },
            { name: t.logs, href: '/activity-logs', icon: ScrollText, roles: [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS, Role.REPORTS_MANAGER] },
            { name: t.settings, href: '/settings', icon: Box, roles: [Role.ADMIN] },
            { name: t.monitor, href: '/system-monitor', icon: Activity, roles: [Role.ADMIN] },
            { name: t.landing, href: '/landing-settings', icon: LayoutIcon, roles: [Role.ADMIN] },
            { name: isAr ? 'إدارة المتجر' : 'Store Management', href: '/equipment-admin', icon: Package, roles: [Role.ADMIN] }
        ]
    }
];

    const hasMenuForRole = internalMenus.some(group => group.items.some(item => item.roles.includes(role)));
    if (hasMenuForRole) {
        return internalMenus;
    }

    return [
        {
            title: isAr ? 'التنقل' : 'Navigation',
            roles: [role],
            items: [
                { name: isAr ? 'الرئيسية' : 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: [role] }
            ]
        }
    ];
};
