import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, RotateCcw, X } from 'lucide-react';

export interface ToastOptions {
  message: string;
  variant?: 'default' | 'error';
  durationMs?: number;
  undoLabel?: string;
  onUndo?: () => void | Promise<void>;
  onExpire?: () => void | Promise<void>;
  retryLabel?: string;
  onRetry?: () => void | Promise<void>;
}

interface ActiveToast extends ToastOptions {
  id: string;
  remainingMs: number;
  lastStartedAt: number;
  isPaused: boolean;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => '',
      dismissToast: () => {}
    };
  }
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const timersRef = useRef<Record<string, number>>({});
  const toastsRef = useRef<ActiveToast[]>([]);
  toastsRef.current = toasts;

  const clearTimer = (id: string) => {
    if (timersRef.current[id]) {
      window.clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  };

  const dismissToast = useCallback((id: string, skipExpire = false) => {
    clearTimer(id);
    const target = toastsRef.current.find((t) => t.id === id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (!skipExpire && target?.onExpire) {
      Promise.resolve(target.onExpire()).catch((err) => {
        console.error('Toast onExpire action failed:', err);
      });
    }
  }, []);

  const scheduleTimer = useCallback((id: string, ms: number) => {
    clearTimer(id);
    timersRef.current[id] = window.setTimeout(() => {
      dismissToast(id, false);
    }, Math.max(0, ms));
  }, [dismissToast]);

  const showToast = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = options.durationMs ?? 6000;

    const newToast: ActiveToast = {
      ...options,
      id,
      remainingMs: duration,
      lastStartedAt: Date.now(),
      isPaused: false
    };

    const existing = toastsRef.current;
    if (existing.length >= 3) {
      const oldest = existing[0];
      clearTimer(oldest.id);
      if (oldest.onExpire) {
        Promise.resolve(oldest.onExpire()).catch((err) => {
          console.error('Evicted toast onExpire failed:', err);
        });
      }
    }

    setToasts((prev) => [...prev.slice(-2), newToast]);
    scheduleTimer(id, duration);
    return id;
  }, [scheduleTimer]);

  const pauseToast = useCallback((id: string) => {
    clearTimer(id);
    setToasts((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.isPaused) return t;
        const elapsed = Date.now() - t.lastStartedAt;
        return {
          ...t,
          remainingMs: Math.max(500, t.remainingMs - elapsed),
          isPaused: true
        };
      })
    );
  }, []);

  const resumeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => {
        if (t.id !== id || !t.isPaused) return t;
        scheduleTimer(id, t.remainingMs);
        return {
          ...t,
          lastStartedAt: Date.now(),
          isPaused: false
        };
      })
    );
  }, [scheduleTimer]);

  const handleUndoClick = async (toast: ActiveToast) => {
    dismissToast(toast.id, true);
    if (toast.onUndo) {
      try {
        await toast.onUndo();
        showToast({
          message: 'تم التراجع',
          durationMs: 4000
        });
      } catch (err) {
        console.error('Undo action failed:', err);
        showToast({
          message: 'تعذّر الحفظ، حاول مرة أخرى',
          variant: 'error'
        });
      }
    }
  };

  const handleRetryClick = async (toast: ActiveToast) => {
    dismissToast(toast.id, true);
    if (toast.onRetry) {
      try {
        await toast.onRetry();
      } catch (err) {
        console.error('Retry action failed:', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      Object.keys(timersRef.current).forEach(clearTimer);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast: (id) => dismissToast(id, false) }}>
      {children}

      {/* Bottom-center Toast Region (above bottom nav bar on mobile) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        dir="rtl"
        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[120] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const isError = toast.variant === 'error';
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                onMouseEnter={() => pauseToast(toast.id)}
                onMouseLeave={() => resumeToast(toast.id)}
                className={`pointer-events-auto w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
                  isError
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isError ? (
                    <AlertCircle className="w-4 h-4 text-rose-100 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span className="truncate">{toast.message}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {toast.onUndo && (
                    <button
                      type="button"
                      onClick={() => handleUndoClick(toast)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-sky-300 font-black transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{toast.undoLabel || 'تراجع'}</span>
                    </button>
                  )}

                  {isError && toast.onRetry && (
                    <button
                      type="button"
                      onClick={() => handleRetryClick(toast)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{toast.retryLabel || 'إعادة المحاولة'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id, false)}
                    className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="إغلاق التنبيه"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
