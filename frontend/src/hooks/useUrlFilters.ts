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
import { useSearchParams } from 'react-router-dom';

type FilterConfig = Record<string, string | number>;

export function useUrlFilters<T extends FilterConfig>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();

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
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const strVal = String(value);
      const defaultVal = String(defaults[key as string]);

      // Remove from URL if it matches the default (keep URL clean)
      if (strVal === defaultVal) {
        next.delete(key as string);
      } else {
        next.set(key as string, strVal);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams, defaults]);

  /** Set multiple filters at once */
  const setFilters = useCallback((updates: Partial<T>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        const strVal = String(value);
        const defaultVal = String(defaults[key]);
        if (strVal === defaultVal) {
          next.delete(key);
        } else {
          next.set(key, strVal);
        }
      }
      return next;
    }, { replace: true });
  }, [setSearchParams, defaults]);

  /** Reset all filters to defaults */
  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { filters, setFilter, setFilters, resetFilters };
}

export default useUrlFilters;
