import { useEffect, useRef, useState, type HTMLAttributes } from 'react';

type AnimatedNumberProps = HTMLAttributes<HTMLSpanElement> & {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
};

const formatNumber = (value: number, decimals: number) => value.toLocaleString('zh-CN', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
});

export function AnimatedNumber({ value, decimals = 0, className, duration = 720, suffix, ...props }: AnimatedNumberProps) {
  const previousValue = useRef<number | null>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const from = previousValue.current ?? 0;
    const to = Number.isFinite(value) ? value : 0;
    previousValue.current = to;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
      setDisplayValue(to);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(from + (to - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return <span className={className} {...props}>{formatNumber(displayValue, decimals)}{suffix ?? ''}</span>;
}
