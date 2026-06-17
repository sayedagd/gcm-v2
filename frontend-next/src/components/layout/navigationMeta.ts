export type LocalizedCopy = {
  ar: string;
  en: string;
};

export type SearchPageMeta = {
  id: string;
  href: string;
  iconKey:
    | 'dashboard'
    | 'companies'
    | 'projects'
    | 'trips'
    | 'fleet'
    | 'inventory'
    | 'drivers'
    | 'reports'
    | 'services'
    | 'users'
    | 'logs'
    | 'settings';
  label: LocalizedCopy;
  sublabel: LocalizedCopy;
};

export const NAV_COMMON = {
  homeCrumb: { ar: 'الرئيسية', en: 'Home' },
  dashboardLabel: { ar: 'الرئيسية', en: 'Dashboard' },
  pagesCategory: { ar: 'صفحات', en: 'Pages' },
} satisfies Record<string, LocalizedCopy>;

export const ROUTE_LABELS: Record<string, LocalizedCopy> = {
  '/dashboard': { ar: 'الرئيسية', en: 'Dashboard' },
  '/companies': { ar: 'الشركات', en: 'Companies' },
  '/projects': { ar: 'المشاريع', en: 'Projects' },
  '/trips': { ar: 'الرحلات', en: 'Trips' },
  '/reports-dashboard': { ar: 'لوحة التقارير', en: 'Reports Hub' },
  '/fleet': { ar: 'الأسطول', en: 'Fleet' },
  '/inventory': { ar: 'المخزون', en: 'Inventory' },
  '/drivers': { ar: 'الموظفين', en: 'Staff Hub' },
  '/suppliers': { ar: 'الموردين', en: 'Suppliers Hub' },
  '/facilities': { ar: 'المرافق', en: 'Facilities' },
  '/logistics/trip-queue': { ar: 'قائمة الطلبات', en: 'Trip Queue' },
  '/accountant-portal': { ar: 'المحاسبة', en: 'Finance' },
  '/user-management': { ar: 'الفريق', en: 'Team' },
  '/services': { ar: 'الخدمات', en: 'Services' },
  '/activity-logs': { ar: 'سجل الأنشطة', en: 'Activity Logs' },
  '/settings': { ar: 'الإعدادات', en: 'Settings' },
  '/system-monitor': { ar: 'المراقبة', en: 'System Monitor' },
  '/landing-settings': { ar: 'إعدادات الموقع', en: 'Landing Settings' },
  '/equipment-admin': { ar: 'إدارة المتجر', en: 'Store Management' },
  '/profile': { ar: 'الملف الشخصي', en: 'Profile' },
  '/client/dashboard': { ar: 'لوحة العميل', en: 'Client Dashboard' },
  '/client/reports': { ar: 'تقارير العميل', en: 'Client Reports' },
  '/client/account': { ar: 'الحساب', en: 'Account' },
  '/subcontractor/dashboard': { ar: 'لوحة المورد', en: 'Partner Dashboard' },
  '/subcontractor/profile': { ar: 'ملف المورد', en: 'Partner Profile' },
  '/subcontractor/assets': { ar: 'الأصول', en: 'Assets' },
  '/driver': { ar: 'لوحة السائق', en: 'Driver Dashboard' },
  '/driver/map': { ar: 'الخريطة', en: 'Map View' },
};

export const ROUTE_GROUP_LABELS: Record<string, LocalizedCopy> = {
  '/dashboard': { ar: 'العمليات', en: 'Operations' },
  '/companies': { ar: 'العمليات', en: 'Operations' },
  '/projects': { ar: 'العمليات', en: 'Operations' },
  '/trips': { ar: 'العمليات', en: 'Operations' },
  '/reports-dashboard': { ar: 'العمليات', en: 'Operations' },
  '/fleet': { ar: 'اللوجستيات', en: 'Logistics' },
  '/inventory': { ar: 'اللوجستيات', en: 'Logistics' },
  '/drivers': { ar: 'اللوجستيات', en: 'Logistics' },
  '/suppliers': { ar: 'اللوجستيات', en: 'Logistics' },
  '/facilities': { ar: 'اللوجستيات', en: 'Logistics' },
  '/logistics/trip-queue': { ar: 'اللوجستيات', en: 'Logistics' },
  '/accountant-portal': { ar: 'الإدارة', en: 'Admin' },
  '/user-management': { ar: 'الإدارة', en: 'Admin' },
  '/services': { ar: 'الإدارة', en: 'Admin' },
  '/activity-logs': { ar: 'الإدارة', en: 'Admin' },
  '/settings': { ar: 'الإدارة', en: 'Admin' },
  '/system-monitor': { ar: 'الإدارة', en: 'Admin' },
  '/landing-settings': { ar: 'الإدارة', en: 'Admin' },
  '/equipment-admin': { ar: 'الإدارة', en: 'Admin' },
};

export const SEARCH_PAGE_META: SearchPageMeta[] = [
  {
    id: 'p-db',
    href: '/dashboard',
    iconKey: 'dashboard',
    label: { ar: 'الرئيسية', en: 'Dashboard' },
    sublabel: { ar: 'مركز القيادة', en: 'Command Center' },
  },
  {
    id: 'p-c',
    href: '/companies',
    iconKey: 'companies',
    label: { ar: 'الشركات', en: 'Companies' },
    sublabel: { ar: 'إدارة العملاء', en: 'Client Management' },
  },
  {
    id: 'p-p',
    href: '/projects',
    iconKey: 'projects',
    label: { ar: 'المشاريع', en: 'Projects' },
    sublabel: { ar: 'مواقع العمل', en: 'Job Sites' },
  },
  {
    id: 'p-t',
    href: '/trips',
    iconKey: 'trips',
    label: { ar: 'الرحلات', en: 'Trips' },
    sublabel: { ar: 'العمليات الميدانية', en: 'Field Operations' },
  },
  {
    id: 'p-f',
    href: '/fleet',
    iconKey: 'fleet',
    label: { ar: 'الأسطول', en: 'Fleet' },
    sublabel: { ar: 'المركبات والمعدات', en: 'Vehicles & Equipment' },
  },
  {
    id: 'p-iv',
    href: '/inventory',
    iconKey: 'inventory',
    label: { ar: 'المخزون', en: 'Inventory' },
    sublabel: { ar: 'الحاويات والخزانات', en: 'Containers & Tanks' },
  },
  {
    id: 'p-dr',
    href: '/drivers',
    iconKey: 'drivers',
    label: { ar: 'الموظفين', en: 'Staff Hub' },
    sublabel: { ar: 'السائقين والمشرفين', en: 'Drivers & Supervisors' },
  },
  {
    id: 'p-rd',
    href: '/reports-dashboard',
    iconKey: 'reports',
    label: { ar: 'التقارير', en: 'Reports' },
    sublabel: { ar: 'التحليلات المتقدمة', en: 'Advanced Analytics' },
  },
  {
    id: 'p-s',
    href: '/services',
    iconKey: 'services',
    label: { ar: 'الخدمات', en: 'Services' },
    sublabel: { ar: 'كتالوج الخدمات', en: 'Service Catalog' },
  },
  {
    id: 'p-u',
    href: '/user-management',
    iconKey: 'users',
    label: { ar: 'الفريق', en: 'Team' },
    sublabel: { ar: 'إدارة المستخدمين', en: 'User Management' },
  },
  {
    id: 'p-l',
    href: '/activity-logs',
    iconKey: 'logs',
    label: { ar: 'سجل الأنشطة', en: 'Activity Logs' },
    sublabel: { ar: 'تتبع العمليات', en: 'Audit Trail' },
  },
  {
    id: 'p-st',
    href: '/settings',
    iconKey: 'settings',
    label: { ar: 'الإعدادات', en: 'Settings' },
    sublabel: { ar: 'إعدادات النظام', en: 'System Configuration' },
  },
];

export const pickLocalized = (copy: LocalizedCopy, isAr: boolean): string => {
  return isAr ? copy.ar : copy.en;
};