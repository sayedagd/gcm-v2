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
import { NAV_COMMON, ROUTE_GROUP_LABELS, ROUTE_LABELS, pickLocalized } from './navigationMeta';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Maps route paths to breadcrumb labels */
const getRouteLabel = (path: string, isAr: boolean): string | null => {
  const entry = ROUTE_LABELS[path];
  return entry ? pickLocalized(entry, isAr) : null;
};

const getGroupForPath = (path: string, isAr: boolean): string | null => {
  const entry = ROUTE_GROUP_LABELS[path];
  return entry ? pickLocalized(entry, isAr) : null;
};

export const Breadcrumbs: React.FC = () => {
  const pathname = usePathname();
  const { saasConfig } = useStore();
  const isAr = saasConfig.language === 'ar';
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const crumbs = useMemo((): BreadcrumbItem[] => {
    const path = pathname;
    const items: BreadcrumbItem[] = [];
    const homeCrumbLabel = pickLocalized(NAV_COMMON.homeCrumb, isAr);
    const dashboardLabel = pickLocalized(NAV_COMMON.dashboardLabel, isAr);

    // Always start with Home
    items.push({ label: homeCrumbLabel, href: '/dashboard' });

    // Add group if applicable
    const group = getGroupForPath(path, isAr);
    if (group) {
      items.push({ label: group });
    }

    // Add current page (no href — it's the active page)
    const label = getRouteLabel(path, isAr);
    if (label && label !== dashboardLabel) {
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
