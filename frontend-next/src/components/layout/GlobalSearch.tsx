/**
 * [AR] بحث شامل بالاختصار Ctrl+K — يبحث عبر كل الصفحات والكيانات
 * [EN] Global Search Spotlight (Ctrl+K) — Search across all pages and entities
 *
 * Features:
 *  - Keyboard shortcut Ctrl+K / Cmd+K to open
 *  - Searches pages, companies, projects, drivers, vehicles, trips
 *  - Keyboard navigation with arrow keys + Enter
 *  - Quick navigation with instant deep links
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Building2, Briefcase, Truck, HardHat, ClipboardList, ArrowRight, Command, LayoutDashboard, Package, BarChart3, Box, Users, ScrollText, Settings, Zap } from 'lucide-react';
import { useStore } from '@/context';
import { useDebounce } from '@/hooks/useDebounce';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_COMMON, SEARCH_PAGE_META, pickLocalized } from './navigationMeta';

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.FC<any>;
  href: string;
  category: string;
}

const SEARCH_PAGE_ICONS = {
  dashboard: LayoutDashboard,
  companies: Building2,
  projects: Briefcase,
  trips: ClipboardList,
  fleet: Truck,
  inventory: Package,
  drivers: HardHat,
  reports: BarChart3,
  services: Box,
  users: Users,
  logs: ScrollText,
  settings: Settings,
} as const;

/** Page navigation results */
const getPageResults = (isAr: boolean): SearchResult[] => [
  ...SEARCH_PAGE_META.map((page) => ({
    id: page.id,
    label: pickLocalized(page.label, isAr),
    sublabel: pickLocalized(page.sublabel, isAr),
    icon: SEARCH_PAGE_ICONS[page.iconKey],
    href: page.href,
    category: pickLocalized(NAV_COMMON.pagesCategory, isAr),
  })),
];

export const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { companies, projects, drivers, vehicles, trips, services, saasConfig } = useStore();
  const isAr = saasConfig.language === 'ar';
  const debouncedQuery = useDebounce(query, 150);

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build search results
  const results = useMemo((): SearchResult[] => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return getPageResults(isAr).slice(0, 8);

    const items: SearchResult[] = [];

    // Pages
    getPageResults(isAr).forEach(p => {
      if (p.label.toLowerCase().includes(q) || (p.sublabel || '').toLowerCase().includes(q)) {
        items.push(p);
      }
    });

    // Companies
    companies.filter(c => (c.company_name || '').toLowerCase().includes(q) || (c.commercial_reg || '').includes(q))
      .slice(0, 5)
      .forEach(c => items.push({
        id: `c-${c.company_id}`,
        label: c.company_name,
        sublabel: c.commercial_reg || '',
        icon: Building2,
        href: `/c?id=${c.company_id}`,
        category: isAr ? 'شركات' : 'Companies',
      }));

    // Projects
    projects.filter(p => (p.project_name || '').toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(p => items.push({
        id: `p-${p.project_id}`,
        label: p.project_name,
        sublabel: p.project_id,
        icon: Briefcase,
        href: `/p?id=${p.project_id}`,
        category: isAr ? 'مشاريع' : 'Projects',
      }));

    // Drivers
    drivers.filter(d => (d.name || '').toLowerCase().includes(q) || (d.phone || '').includes(q))
      .slice(0, 5)
      .forEach(d => items.push({
        id: `d-${d.driver_id}`,
        label: d.name,
        sublabel: d.phone || d.driver_id,
        icon: HardHat,
        href: `/dr?id=${d.driver_id}`,
        category: isAr ? 'موظفين' : 'Staff',
      }));

    // Vehicles
    vehicles.filter(v => (v.plate_no || '').toLowerCase().includes(q) || (v.vehicle_type || '').toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(v => items.push({
        id: `v-${v.vehicle_id}`,
        label: v.plate_no || v.vehicle_id,
        sublabel: v.vehicle_type || '',
        icon: Truck,
        href: `/f?id=${v.vehicle_id}`,
        category: isAr ? 'أسطول' : 'Fleet',
      }));

    // Trips (by ID or manifest number)
    trips.filter(t =>
      (t.trip_id || '').toLowerCase().includes(q) ||
      (t.waste_manifest_no || '').toLowerCase().includes(q) ||
      (t.delivery_note_no || '').toLowerCase().includes(q)
    )
      .slice(0, 5)
      .forEach(t => items.push({
        id: `t-${t.trip_id}`,
        label: t.trip_id,
        sublabel: t.waste_manifest_no || t.date || '',
        icon: ClipboardList,
        href: `/t?id=${t.trip_id}`,
        category: isAr ? 'رحلات' : 'Trips',
      }));

    return items.slice(0, 20);
  }, [debouncedQuery, companies, projects, drivers, vehicles, trips, services, isAr]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      setIsOpen(false);
    }
  }, [results, selectedIndex, router]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Reset selection when results change
  useEffect(() => setSelectedIndex(0), [results]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={() => setIsOpen(false)}
          />

          {/* Spotlight Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[95%] max-w-[640px] bg-surface border border-border rounded-2xl shadow-2xl z-[9999] overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <Search size={20} className="text-text-subtle shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isAr ? 'ابحث عن صفحة، شركة، مشروع، سائق...' : 'Search pages, companies, projects, drivers...'}
                className="flex-1 bg-transparent text-text-main placeholder-text-subtle text-sm font-medium outline-none"
                autoComplete="off"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-text-subtle bg-surface-subtle border border-border rounded">ESC</kbd>
              </div>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
              {results.length === 0 ? (
                <div className="px-5 py-8 text-center text-text-subtle text-sm">
                  {isAr ? 'لا توجد نتائج' : 'No results found'}
                </div>
              ) : (
                <>
                  {/* Group by category */}
                  {(() => {
                    let lastCategory = '';
                    return results.map((result, idx) => {
                      const showCategory = result.category !== lastCategory;
                      lastCategory = result.category;
                      return (
                        <React.Fragment key={result.id}>
                          {showCategory && (
                            <div className="px-5 pt-3 pb-1 text-[10px] font-bold text-text-subtle uppercase tracking-wider">
                              {result.category}
                            </div>
                          )}
                          <button
                            className={`w-full flex items-center gap-3 px-5 py-2.5 text-start transition-colors ${
                              idx === selectedIndex
                                ? 'bg-primary/10 text-primary'
                                : 'text-text-main hover:bg-surface-subtle'
                            }`}
                            onClick={() => {
                              router.push(result.href);
                              setIsOpen(false);
                            }}
                            onMouseEnter={() => setSelectedIndex(idx)}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 ${idx === selectedIndex ? 'bg-primary/20 text-primary' : 'bg-surface-subtle text-text-subtle'}`}>
                              <result.icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate">{result.label}</div>
                              {result.sublabel && (
                                <div className="text-[11px] text-text-subtle truncate">{result.sublabel}</div>
                              )}
                            </div>
                            {idx === selectedIndex && (
                              <ArrowRight size={14} className="text-primary shrink-0" />
                            )}
                          </button>
                        </React.Fragment>
                      );
                    });
                  })()}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-surface-subtle/50 text-[10px] text-text-subtle font-bold">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-surface border border-border rounded text-[9px]">&uarr;</kbd><kbd className="px-1 py-0.5 bg-surface border border-border rounded text-[9px]">&darr;</kbd> {isAr ? 'تنقل' : 'Navigate'}</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-surface border border-border rounded text-[9px]">&crarr;</kbd> {isAr ? 'فتح' : 'Open'}</span>
              </div>
              <span className="flex items-center gap-1">
                <Command size={10} /> K {isAr ? 'للفتح' : 'to toggle'}
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GlobalSearch;
