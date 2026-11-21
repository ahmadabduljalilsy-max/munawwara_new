import React from 'react';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: 'default' | 'compact' | 'positive';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
  className = ''
}) => {
  const isCompact = variant === 'compact';
  const isPositive = variant === 'positive';

  return (
    <div
      className={`text-center bg-surface rounded-2xl border border-dashed border-border ${
        isCompact ? 'py-8 px-4' : 'py-12 px-6'
      } ${className}`}
      dir="rtl"
    >
      <div
        className={`mx-auto rounded-2xl flex items-center justify-center mb-3.5 ${
          isCompact ? 'w-12 h-12' : 'w-16 h-16'
        } ${
          isPositive
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500'
        }`}
      >
        <Icon className={isCompact ? 'w-6 h-6' : 'w-8 h-8'} />
      </div>

      <h3 className={`${isCompact ? 'text-sm' : 'text-base sm:text-lg'} font-bold text-slate-900 dark:text-white mb-1.5`}>
        {title}
      </h3>

      {description && (
        <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <div className="flex items-center justify-center gap-2.5 mt-5 flex-wrap">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-4 py-2 bg-surface border border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};
