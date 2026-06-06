/**
 * [AR] مكون الهيكل العظمي للصفحات - يعرض حالة تحميل متحركة
 * [EN] Page Skeleton Component - Animated loading placeholders
 *
 * Provides reusable skeleton shapes for cards, tables, stats, and full pages.
 * Uses pure CSS animations for performance (no framer-motion dependency).
 */
import React from 'react';

const shimmer = 'animate-pulse bg-surface-subtle rounded';

/** Single rectangular skeleton block */
export const SkeletonBlock: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div className={`${shimmer} ${className}`} style={style} />
);

/** A stat card placeholder */
export const SkeletonStatCard: React.FC = () => (
  <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
    <div className="flex items-center gap-3">
      <SkeletonBlock className="w-10 h-10 rounded-xl" />
      <SkeletonBlock className="h-4 w-24" />
    </div>
    <SkeletonBlock className="h-8 w-16" />
    <SkeletonBlock className="h-3 w-32" />
  </div>
);

/** A grid of stat card placeholders */
export const SkeletonStatsGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonStatCard key={i} />
    ))}
  </div>
);

/** A card placeholder (for grid views) */
export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 4 }) => (
  <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
    <div className="flex items-center gap-3">
      <SkeletonBlock className="w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
    </div>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBlock key={i} className={`h-3 ${i % 2 === 0 ? 'w-full' : 'w-2/3'}`} />
    ))}
    <div className="flex gap-2 pt-2">
      <SkeletonBlock className="h-8 w-20 rounded-lg" />
      <SkeletonBlock className="h-8 w-20 rounded-lg" />
    </div>
  </div>
);

/** A grid of card placeholders */
export const SkeletonCardGrid: React.FC<{ count?: number; cols?: string }> = ({
  count = 6,
  cols = 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
}) => (
  <div className={`grid ${cols} gap-6`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

/** A table row placeholder */
const SkeletonTableRow: React.FC<{ cols: number }> = ({ cols }) => (
  <tr className="border-b border-border">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="p-3">
        <SkeletonBlock className={`h-4 ${i === 0 ? 'w-32' : i === cols - 1 ? 'w-20' : 'w-24'}`} />
      </td>
    ))}
  </tr>
);

/** A table placeholder with header and rows */
export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 8, cols = 6 }) => (
  <div className="bg-surface border border-border rounded-2xl overflow-hidden">
    <table className="w-full">
      <thead>
        <tr className="border-b border-border bg-surface-subtle">
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="p-3 text-start">
              <SkeletonBlock className="h-3 w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  </div>
);

/** A page header placeholder */
export const SkeletonPageHeader: React.FC = () => (
  <div className="space-y-4">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-64" />
        <SkeletonBlock className="h-4 w-96" />
      </div>
      <div className="flex gap-3">
        <SkeletonBlock className="h-10 w-32 rounded-xl" />
        <SkeletonBlock className="h-10 w-10 rounded-xl" />
      </div>
    </div>
    <SkeletonBlock className="h-12 w-full rounded-xl" />
  </div>
);

/** Chart / visualization placeholder */
export const SkeletonChart: React.FC<{ height?: string }> = ({ height = 'h-[360px]' }) => (
  <div className={`bg-surface border border-border rounded-2xl p-6 ${height} flex flex-col`}>
    <div className="flex items-center justify-between mb-6">
      <SkeletonBlock className="h-5 w-40" />
      <div className="flex gap-2">
        <SkeletonBlock className="h-6 w-16 rounded-full" />
        <SkeletonBlock className="h-6 w-16 rounded-full" />
      </div>
    </div>
    <div className="flex-1 flex items-end gap-2 pb-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className="flex-1 rounded-t-md"
          style={{ height: `${20 + Math.random() * 60}%` } as React.CSSProperties}
        />
      ))}
    </div>
    <div className="flex justify-between">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-3 w-8" />
      ))}
    </div>
  </div>
);

/** Full-page skeleton with header + stats + content */
export const SkeletonFullPage: React.FC<{ variant?: 'cards' | 'table' | 'dashboard' }> = ({ variant = 'cards' }) => (
  <div className="space-y-8 pb-16 max-w-[1920px] mx-auto">
    <SkeletonPageHeader />
    <SkeletonStatsGrid count={variant === 'dashboard' ? 6 : 4} />
    {variant === 'table' ? (
      <SkeletonTable />
    ) : variant === 'dashboard' ? (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8"><SkeletonChart height="h-[480px]" /></div>
          <div className="lg:col-span-4"><SkeletonChart height="h-[480px]" /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2"><SkeletonChart /></div>
          <div><SkeletonChart /></div>
        </div>
      </div>
    ) : (
      <SkeletonCardGrid />
    )}
  </div>
);

export default SkeletonFullPage;
