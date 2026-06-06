/**
 * [AR] مكون مسار التنقل — يعرض الموقع الحالي في التطبيق
 * [EN] Breadcrumbs Component — Shows current location hierarchy
 *
 * Auto-generated from the current route path and menu configuration.
 */
import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ChevronLeft, Home } from 'lucide-react';
import { useStore } from '@/context';
import { getMenuGroups } from './MenuConfig';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Maps route paths to breadcrumb labels */
const getRouteLabel = (path: string, isAr: boolean): string | null => {
  const map: Record<string, [string, string]> = {
    '/dashboard': ['الرئيسية', 'Dashboard'],
    '/companies': ['الشركات', 'Companies'],
    '/projects': ['المشاريع', 'Projects'],
    '/trips': ['الرحلات', 'Trips'],
    '/reports-dashboard': ['لوحة التقارير', 'Reports Hub'],
    '/fleet': ['الأسطول', 'Fleet'],
    '/inventory': ['المخزون', 'Inventory'],
    '/drivers': ['الموظفين', 'Staff Hub'],
    '/suppliers': ['الموردين', 'Suppliers Hub'],
    '/facilities': ['المرافق', 'Facilities'],
    '/logistics/trip-queue': ['قائمة الطلبات', 'Trip Queue'],
    '/accountant-portal': ['المحاسبة', 'Finance'],
    '/user-management': ['الفريق', 'Team'],
    '/services': ['الخدمات', 'Services'],
    '/activity-logs': ['سجل الأنشطة', 'Activity Logs'],
    '/settings': ['الإعدادات', 'Settings'],
    '/system-monitor': ['المراقبة', 'System Monitor'],
    '/landing-settings': ['إعدادات الموقع', 'Landing Settings'],
    '/equipment-admin': ['إدارة المتجر', 'Store Management'],
    '/ai-sessions': ['جلسات الذكاء', 'AI Sessions'],
    '/profile': ['الملف الشخصي', 'Profile'],
    '/client/dashboard': ['لوحة العميل', 'Client Dashboard'],
    '/client/reports': ['تقارير العميل', 'Client Reports'],
    '/client/account': ['الحساب', 'Account'],
    '/subcontractor/dashboard': ['لوحة المورد', 'Partner Dashboard'],
    '/subcontractor/profile': ['ملف المورد', 'Partner Profile'],
    '/subcontractor/assets': ['الأصول', 'Assets'],
    '/driver': ['لوحة السائق', 'Driver Dashboard'],
    '/driver/map': ['الخريطة', 'Map View'],
  };
  const entry = map[path];
  return entry ? (isAr ? entry[0] : entry[1]) : null;
};

const getGroupForPath = (path: string, isAr: boolean): string | null => {
  const groupMap: Record<string, [string, string]> = {
    '/dashboard': ['العمليات', 'Operations'],
    '/companies': ['العمليات', 'Operations'],
    '/projects': ['العمليات', 'Operations'],
    '/trips': ['العمليات', 'Operations'],
    '/reports-dashboard': ['العمليات', 'Operations'],
    '/fleet': ['اللوجستيات', 'Logistics'],
    '/inventory': ['اللوجستيات', 'Logistics'],
    '/drivers': ['اللوجستيات', 'Logistics'],
    '/suppliers': ['اللوجستيات', 'Logistics'],
    '/facilities': ['اللوجستيات', 'Logistics'],
    '/logistics/trip-queue': ['اللوجستيات', 'Logistics'],
    '/accountant-portal': ['الإدارة', 'Admin'],
    '/user-management': ['الإدارة', 'Admin'],
    '/services': ['الإدارة', 'Admin'],
    '/activity-logs': ['الإدارة', 'Admin'],
    '/settings': ['الإدارة', 'Admin'],
    '/system-monitor': ['الإدارة', 'Admin'],
    '/landing-settings': ['الإدارة', 'Admin'],
    '/equipment-admin': ['الإدارة', 'Admin'],
    '/ai-sessions': ['الإدارة', 'Admin'],
  };
  const entry = groupMap[path];
  return entry ? (isAr ? entry[0] : entry[1]) : null;
};

export const Breadcrumbs: React.FC = () => {
  const pathname = usePathname();
  const { saasConfig } = useStore();
  const isAr = saasConfig.language === 'ar';
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const crumbs = useMemo((): BreadcrumbItem[] => {
    const path = pathname;
    const items: BreadcrumbItem[] = [];

    // Always start with Home
    items.push({ label: isAr ? 'الرئيسية' : 'Home', href: '/dashboard' });

    // Add group if applicable
    const group = getGroupForPath(path, isAr);
    if (group) {
      items.push({ label: group });
    }

    // Add current page (no href — it's the active page)
    const label = getRouteLabel(path, isAr);
    if (label && label !== (isAr ? 'الرئيسية' : 'Dashboard')) {
      items.push({ label });
    }

    return items;
  }, [pathname, isAr]);

  // Don't render on dashboard (it's the root)
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium mb-4 px-1">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <Chevron size={12} className="text-text-subtle/50 shrink-0" />}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="text-text-subtle hover:text-primary transition-colors flex items-center gap-1"
              >
                {i === 0 && <Home size={12} />}
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-text-main font-bold' : 'text-text-subtle'}>
                {crumb.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
