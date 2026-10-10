import { useEffect, useState } from 'react';
import { ArrowUpRight, Dumbbell, Flame, Moon, Sparkles } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

const icons = { training: Dumbbell, calories: Flame, sleep: Moon, habits: Sparkles } as const;
type IconName = keyof typeof icons;

type Props = { label: string; value: number; decimals?: number; unit?: string; progress: number; icon?: IconName; helper?: string };

function useAnimatedProgress(value: number) {
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

  return animatedValue;
}

function Ring({ value, label, size = 'large' }: { value: number; label: string; size?: 'large' | 'small' }) {
  const normalized = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const animatedValue = useAnimatedProgress(normalized);
  const radius = size === 'large' ? 45 : 34;
  const view = size === 'large' ? 112 : 84;
  const center = view / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  return <div className={`progress-ring ${size === 'small' ? 'progress-ring-small' : ''}`} style={{ width: view, height: view }} role="img" aria-label={`${label}${Math.round(normalized)}%`}>
    <svg viewBox={`0 0 ${view} ${view}`} aria-hidden="true"><circle className="progress-ring-track" cx={center} cy={center} r={radius} /><circle className="progress-ring-progress" cx={center} cy={center} r={radius} strokeDasharray={circumference} strokeDashoffset={offset} /></svg>
    <AnimatedNumber value={animatedValue} className="progress-ring-value" aria-hidden="true" />
  </div>;
}

export function CircularMetric({ label, value, decimals = 0, unit, progress, icon = 'training', helper }: Props) {
  const Icon = icons[icon];
  const normalized = Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0));
  return (
    <article className="card metric-card">
      <div className="row metric-card-head"><span className="eyebrow">{label}</span><Icon size={19} className="metric-icon" aria-hidden="true" /></div>
      <div className="metric-card-main">
        <div className="metric-value-wrap"><div className="metric-value"><AnimatedNumber value={value} decimals={decimals} className="big-number" />{unit ? <span className="unit">{unit}</span> : null}</div><p className="card-copy">{helper ?? `${Math.round(normalized)}% 已完成`}</p></div>
        <Ring value={normalized} label={`${label}进度`} size="small" />
      </div>
    </article>
  );
}

export function RingProgress({ value, label, size = 'large' }: { value: number; label: string; size?: 'large' | 'small' }) {
  return <Ring value={value} label={label} size={size} />;
}

export function TrendBadge({ text }: { text: string }) { return <span className="row trend-badge"><ArrowUpRight size={14} />{text}</span>; }
