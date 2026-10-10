import { ArrowUpRight, Dumbbell, Flame, Moon, Sparkles } from 'lucide-react';

const icons = { training: Dumbbell, calories: Flame, sleep: Moon, habits: Sparkles } as const;
type IconName = keyof typeof icons;

type Props = { label: string; value: string | number; unit?: string; progress: number; icon?: IconName; helper?: string };

export function CircularMetric({ label, value, unit, progress, icon = 'training', helper }: Props) {
  const Icon = icons[icon];
  const normalized = Math.min(100, Math.max(0, progress));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;
  return (
    <article className="card metric-card">
      <div className="row"><span className="eyebrow">{label}</span><Icon size={19} className="metric-icon" aria-hidden="true" /></div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div><span className="big-number">{value}</span>{unit ? <span className="unit">{unit}</span> : null}<p className="card-copy">{helper ?? `${normalized}% 已完成`}</p></div>
        <div className="progress-ring progress-ring-small" aria-label={`${label}${normalized}%`}>
          <svg viewBox="0 0 108 108" aria-hidden="true"><circle className="progress-ring-track" cx="54" cy="54" r={radius} /><circle className="progress-ring-progress" cx="54" cy="54" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} /></svg>
          <span className="progress-ring-value">{Math.round(normalized)}</span>
        </div>
      </div>
    </article>
  );
}

export function RingProgress({ value, label, size = 'large' }: { value: number; label: string; size?: 'large' | 'small' }) {
  const normalized = Math.min(100, Math.max(0, value));
  const radius = size === 'large' ? 45 : 34;
  const view = size === 'large' ? 112 : 84;
  const center = view / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;
  return <div className={`progress-ring ${size === 'small' ? 'progress-ring-small' : ''}`} style={{ width: view, height: view }}>
    <svg viewBox={`0 0 ${view} ${view}`} aria-hidden="true"><circle className="progress-ring-track" cx={center} cy={center} r={radius} /><circle className="progress-ring-progress" cx={center} cy={center} r={radius} strokeDasharray={circumference} strokeDashoffset={offset} /></svg>
    <span className="progress-ring-value" aria-label={`${label}${Math.round(normalized)}%`}>{Math.round(normalized)}</span>
  </div>;
}

export function TrendBadge({ text }: { text: string }) { return <span className="row" style={{ justifyContent: 'flex-start', gap: 4, color: '#fff', fontSize: '.78rem' }}><ArrowUpRight size={14} />{text}</span>; }
