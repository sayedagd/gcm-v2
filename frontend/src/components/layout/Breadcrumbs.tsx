/**
 * [AR] مكون مسار التنقل — يعرض الموقع الحالي في التطبيق
 * [EN] Breadcrumbs Component — Shows current location hierarchy
 *
 * Auto-generated from the current route path and menu configuration.
 */
import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
    '/db': ['الرئيسية', 'Dashboard'],
    '/c': ['الشركات', 'Companies'],
    '/p': ['المشاريع', 'Projects'],
    '/t': ['الرحلات', 'Trips'],
    '/rd': ['لوحة التقارير', 'Reports Hub'],
    '/f': ['الأسطول', 'Fleet'],
    '/iv': ['المخزون', 'Inventory'],
    '/dr': ['الموظفين', 'Staff Hub'],
    '/sup': ['الموردين', 'Suppliers Hub'],
    '/fac': ['المرافق', 'Facilities'],
    '/logistics/queue': ['قائمة الطلبات', 'Trip Queue'],
    '/acc': ['المحاسبة', 'Finance'],
    '/u': ['الفريق', 'Team'],
    '/s': ['الخدمات', 'Services'],
    '/l': ['سجل الأنشطة', 'Activity Logs'],
    '/st': ['الإعدادات', 'Settings'],
    '/sys': ['المراقبة', 'System Monitor'],
    '/le': ['إعدادات الموقع', 'Landing Settings'],
    '/store-admin': ['إدارة المتجر', 'Store Management'],
    '/ai-sessions': ['جلسات الذكاء', 'AI Sessions'],
    '/pr': ['الملف الشخصي', 'Profile'],
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
    '/db': ['العمليات', 'Operations'],
    '/c': ['العمليات', 'Operations'],
    '/p': ['العمليات', 'Operations'],
    '/t': ['العمليات', 'Operations'],
    '/rd': ['العمليات', 'Operations'],
    '/f': ['اللوجستيات', 'Logistics'],
    '/iv': ['اللوجستيات', 'Logistics'],
    '/dr': ['اللوجستيات', 'Logistics'],
    '/sup': ['اللوجستيات', 'Logistics'],
    '/fac': ['اللوجستيات', 'Logistics'],
    '/logistics/queue': ['اللوجستيات', 'Logistics'],
    '/acc': ['الإدارة', 'Admin'],
    '/u': ['الإدارة', 'Admin'],
    '/s': ['الإدارة', 'Admin'],
    '/l': ['الإدارة', 'Admin'],
    '/st': ['الإدارة', 'Admin'],
    '/sys': ['الإدارة', 'Admin'],
    '/le': ['الإدارة', 'Admin'],
    '/store-admin': ['الإدارة', 'Admin'],
    '/ai-sessions': ['الإدارة', 'Admin'],
  };
  const entry = groupMap[path];
  return entry ? (isAr ? entry[0] : entry[1]) : null;
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const { saasConfig } = useStore();
  const isAr = saasConfig.language === 'ar';
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const crumbs = useMemo((): BreadcrumbItem[] => {
    const path = location.pathname;
    const items: BreadcrumbItem[] = [];

    // Always start with Home
    items.push({ label: isAr ? 'الرئيسية' : 'Home', href: '/db' });

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
  }, [location.pathname, isAr]);

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
                to={crumb.href}
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
