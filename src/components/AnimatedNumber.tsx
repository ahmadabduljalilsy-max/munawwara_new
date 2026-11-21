import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 700,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = ''
}) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [displayValue, setDisplayValue] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return safeValue;
    }
    return 0;
  });

  const previousTargetRef = useRef<number>(0);
  const currentRenderedRef = useRef<number>(displayValue);
  const hasAnimatedOnceRef = useRef<boolean>(false);

  // Trigger initial count-up once when element enters viewport
  useEffect(() => {
    const el = spanRef.current;
    if (!el || hasEnteredView) return;

    if (typeof IntersectionObserver === 'undefined') {
      setHasEnteredView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasEnteredView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEnteredView]);

  // Animate from 0 -> value on first view, or from previous -> new value when value changes
  useEffect(() => {
    if (!hasEnteredView) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      currentRenderedRef.current = safeValue;
      previousTargetRef.current = safeValue;
      hasAnimatedOnceRef.current = true;
      setDisplayValue(safeValue);
      return;
    }

    // Do not restart if target value has not changed after initial animation
    if (hasAnimatedOnceRef.current && previousTargetRef.current === safeValue) {
      return;
    }

    const fromValue = hasAnimatedOnceRef.current ? currentRenderedRef.current : 0;
    const toValue = safeValue;
    previousTargetRef.current = toValue;
    hasAnimatedOnceRef.current = true;

    if (fromValue === toValue) {
      currentRenderedRef.current = toValue;
      setDisplayValue(toValue);
      return;
    }

    let rafId = 0;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = fromValue + (toValue - fromValue) * eased;

      currentRenderedRef.current = nextVal;
      setDisplayValue(nextVal);

      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        currentRenderedRef.current = toValue;
        setDisplayValue(toValue);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [safeValue, duration, hasEnteredView]);

  const rounded =
    decimals > 0
      ? Number(displayValue.toFixed(decimals))
      : Math.round(displayValue);

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(rounded);

  return (
    <span ref={spanRef} className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
