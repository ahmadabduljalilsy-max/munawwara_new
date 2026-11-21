import React, { useEffect, useState } from 'react';

export function useDelayedLoading(isLoading: boolean, delayMs = 200): boolean {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowSkeleton(true);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [isLoading, delayMs]);

  return showSkeleton;
}

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`bg-slate-200/80 dark:bg-slate-700/60 rounded-xl skeleton-shimmer ${className}`}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 pb-12" dir="rtl" aria-busy="true" aria-label="جارٍ تحميل لوحة القيادة">
      {/* Top Executive Operations Banner Skeleton */}
      <div className="p-5 sm:p-6 bg-surface rounded-[20px] border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-6 w-64 rounded-full" />
              <Skeleton className="h-8 w-40 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/60 bg-background/60">
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-64 shrink-0 p-4 rounded-[18px] border border-border/60 bg-background/60 flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full shrink-0" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Indicator Cards Grid Skeleton */}
      <div className="p-5 sm:p-6 bg-surface rounded-3xl border border-border shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-3.5 w-72" />
            </div>
          </div>
          <Skeleton className="h-12 w-28 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl border border-border/70 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
              </div>
              <Skeleton className="h-8 w-14" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl border border-border/70 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-14" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-8 w-44 rounded-xl" />
          </div>
          <div className="h-[260px] flex items-end gap-4 pt-6 px-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-lg"
                // varied realistic bar heights
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CompanyDriversSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" dir="rtl" aria-busy="true" aria-label="جارٍ تحميل سجل السائقين">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3.5 w-80" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 6 Metric Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3.5 bg-surface rounded-2xl border border-border shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="w-7 h-7 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Search & Filter Skeleton */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex items-center gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Table Rows Skeleton */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-slate-50/70 dark:bg-slate-900/40 grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-20" />
          ))}
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 8 }).map((_, rowIdx) => (
            <div key={rowIdx} className="px-4 py-3.5 grid grid-cols-6 gap-4 items-center">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-7 w-16 rounded-lg" />
                <Skeleton className="h-7 w-12 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DriverDetailsSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col flex-1" dir="rtl" aria-busy="true" aria-label="جارٍ تحميل بطاقة السائق">
      {/* Header Skeleton */}
      <div className="p-5 sm:p-6 border-b border-border space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 flex-1">
            <Skeleton className="w-13 h-13 rounded-2xl shrink-0" />
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-border/60">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Body Fields Skeleton */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="p-3 rounded-2xl border border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded-xl" />
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border space-y-4">
          <Skeleton className="h-4 w-36" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`p-3 rounded-xl border border-border/70 space-y-2 ${i === 4 ? 'sm:col-span-2' : ''}`}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
