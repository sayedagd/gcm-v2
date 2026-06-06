/**
 * [AR] خطاف مزامنة الفلاتر مع الرابط — يحافظ على حالة البحث والتصفح عند إعادة التحميل
 * [EN] URL-Synced Filters Hook — Persists search, pagination, and filter state in the URL
 *
 * Usage:
 *   const { filters, setFilter, resetFilters } = useUrlFilters({
 *     page: 1,
 *     search: '',
 *     status: 'ALL',
 *     view: 'grid'
 *   });
 *
 * All values are synced to URL search params. Refreshing preserves state.
 */
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type FilterConfig = Record<string, string | number>;

export function useUrlFilters<T extends FilterConfig>(defaults: T) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const replaceParams = useCallback((nextParams: URLSearchParams) => {
    const query = nextParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.replace(url);
  }, [pathname, router]);

  /** Read current filters from URL, falling back to defaults */
  const filters = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const urlValue = searchParams.get(key);
      if (urlValue !== null) {
        // Coerce to number if default is number
        if (typeof defaults[key] === 'number') {
          const parsed = Number(urlValue);
          (result as any)[key] = isNaN(parsed) ? defaults[key] : parsed;
        } else {
          (result as any)[key] = urlValue;
        }
      }
    }
    return result as T;
  }, [searchParams, defaults]);

  /** Set a single filter value — updates URL */
  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    const next = new URLSearchParams(searchParams.toString());
    const strVal = String(value);
    const defaultVal = String(defaults[key as string]);

    // Remove from URL if it matches the default (keep URL clean)
    if (strVal === defaultVal) {
      next.delete(key as string);
    } else {
      next.set(key as string, strVal);
    }

    replaceParams(next);
  }, [searchParams, defaults, replaceParams]);

  /** Set multiple filters at once */
  const setFilters = useCallback((updates: Partial<T>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      const strVal = String(value);
      const defaultVal = String(defaults[key]);
      if (strVal === defaultVal) {
        next.delete(key);
      } else {
        next.set(key, strVal);
      }
    }
    replaceParams(next);
  }, [searchParams, defaults, replaceParams]);

  /** Reset all filters to defaults */
  const resetFilters = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  return { filters, setFilter, setFilters, resetFilters };
}

export default useUrlFilters;
