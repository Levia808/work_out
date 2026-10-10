import { useEffect, useState, type CSSProperties } from 'react';

type ProgressBarProps = {
  value: number;
  className?: string;
  style?: CSSProperties;
  label?: string;
};

export function ProgressBar({ value, className = '', style, label }: ProgressBarProps) {
  const normalized = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimatedValue(normalized);
      return;
    }
    const frame = requestAnimationFrame(() => setAnimatedValue(normalized));
    return () => cancelAnimationFrame(frame);
  }, [normalized]);

  return <div className={`progress-bar ${className}`} style={style} role={label ? 'progressbar' : undefined} aria-label={label} aria-valuemin={label ? 0 : undefined} aria-valuemax={label ? 100 : undefined} aria-valuenow={label ? Math.round(normalized) : undefined}>
    <span style={{ width: `${animatedValue}%` }} />
  </div>;
}
