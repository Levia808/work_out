import { Activity, ArrowUpRight, Check, CircleAlert, Dumbbell, Flame, Lightbulb, Moon, Scale } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { TrainingAnalysis, TrainingAnalysisCompact, TrainingAnalysisMetric, TrainingAnalysisTrend, TrainingMetricKey } from '../lib/ai';
import { BodyCompositionReport } from './BodyCompositionReport';
import { AnimatedNumber } from './AnimatedNumber';

type AiReportCardProps = {
  report: Pick<TrainingAnalysis, 'compact' | 'bodyComposition'>;
  provider?: string;
  detailHref?: string;
};

const metricIcons: Record<TrainingMetricKey, typeof Activity> = {
  training: Dumbbell,
  sleep: Moon,
  nutrition: Flame,
  habits: Check,
  body: Scale,
};

function metricValue(metric: TrainingAnalysisMetric) {
  if (metric.value === null) return <span className="report-empty-value">暂无</span>;
  const decimals = Number.isInteger(metric.value) ? 0 : 1;
  return <><AnimatedNumber value={metric.value} decimals={decimals} /><span className="unit">{metric.unit}</span></>;
}

function MetricTile({ metric, index }: { metric: TrainingAnalysisMetric; index: number }) {
  const Icon = metricIcons[metric.key];
  return <article className="report-metric-tile" style={{ '--report-delay': `${index * 55}ms` } as CSSProperties}>
    <div className="row report-metric-heading"><span className="report-metric-icon"><Icon size={16} /></span><span className="report-metric-label">{metric.label}</span></div>
    <div className="report-metric-value">{metricValue(metric)}</div>
    {metric.note ? <p className="report-metric-note">{metric.note}</p> : null}
    {metric.progress !== null ? <div className="report-meter" aria-label={`${metric.label} ${Math.round(metric.progress)}%`}><span style={{ width: `${metric.progress}%` }} /></div> : null}
  </article>;
}

export function AiScoreRing({ value, label, size = 'normal' }: { value: number | null; label: string; size?: 'normal' | 'large' }) {
  const normalized = value === null ? 0 : Math.max(0, Math.min(100, value));
  const ringStyle = { '--ring-offset': `${100 - normalized}` } as CSSProperties;
  return <div className={`report-score-wrap ${size === 'large' ? 'is-large' : ''}`}>
    <div className={`report-score-ring ${value === null ? 'is-empty' : ''}`} style={ringStyle} role="img" aria-label={value === null ? `${label}暂无数据` : `${label}${Math.round(value)}分`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="report-score-track" cx="50" cy="50" r="45" />
        {value === null ? null : <circle className="report-score-progress" cx="50" cy="50" r="45" pathLength="100" />}
      </svg>
      <div className="report-score-center">{value === null ? <span className="report-score-empty">暂无</span> : <><AnimatedNumber value={value} /><span className="report-score-unit">%</span></>}</div>
    </div>
    <span className="report-score-label">{label}</span>
  </div>;
}

export function AiTrendChart({ trend, compact = false }: { trend: TrainingAnalysisTrend; compact?: boolean }) {
  const { labels, values, title, unit } = trend;
  const hasValues = values.some(value => value !== null);
  if (!hasValues) return <div className="report-empty-chart"><Activity size={18} /><span>暂无足够数据形成趋势</span></div>;
  const width = Math.max(220, labels.length * 54);
  const height = compact ? 92 : 132;
  const numericValues = values.filter((value): value is number => value !== null);
  const dataMin = Math.min(...numericValues);
  const dataMax = Math.max(...numericValues);
  const usePercentScale = unit === '%' && dataMin >= 0 && dataMax <= 100;
  const dataRange = Math.max(dataMax - dataMin, Math.abs(dataMax) * 0.04, 1);
  const domainMin = usePercentScale ? 0 : dataMin - dataRange * 0.12;
  const domainMax = usePercentScale ? 100 : dataMax + dataRange * 0.12;
  const domainRange = domainMax - domainMin || 1;
  const rangeLabel = usePercentScale
    ? '0–100%'
    : `${domainMin.toFixed(Math.abs(domainMin) < 10 ? 1 : 0)}–${domainMax.toFixed(Math.abs(domainMax) < 10 ? 1 : 0)} ${unit}`;
  const points = values.map((value, index) => {
    const x = labels.length === 1 ? width / 2 : (index / (labels.length - 1)) * (width - 16) + 8;
    const y = value === null ? height - 14 : height - 18 - ((value - domainMin) / domainRange) * (height - 32);
    return { x, y, value };
  });
  return <div className={`report-trend-wrap ${compact ? 'is-compact' : ''}`}>
    <div className="row report-section-title"><span>{title}</span><span className="muted">{rangeLabel}</span></div>
    <div className="report-line-chart" role="img" aria-label={`${title}图表`}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1="8" x2={width - 8} y1={height - 18} y2={height - 18} className="chart-axis" />
        <polyline points={points.filter(point => point.value !== null).map(point => `${point.x},${point.y}`).join(' ')} className="chart-line" />
        {points.map((point, index) => point.value === null ? null : <circle key={`${labels[index]}-${index}`} cx={point.x} cy={point.y} r={compact ? 3 : 4} className="chart-point"><title>{`${labels[index]} ${point.value}${unit}`}</title></circle>)}
      </svg>
      <div className="report-line-labels">{labels.map((label, index) => <span key={`${label}-${index}`}>{label || '—'}</span>)}</div>
    </div>
  </div>;
}

export function AiReportCard({ report, provider, detailHref }: AiReportCardProps) {
  const compact = report.compact;
  const keyStrengths = compact.strengths.slice(0, 3);
  const keySuggestions = compact.suggestions.slice(0, 2);
  return <article className="ai-report-card report-reveal">
    <header className="report-header">
      <div className="report-header-copy"><h3 className="report-title">训练状态摘要</h3><p className="report-summary">{compact.summary || '暂无可用摘要。'}</p></div>
      <AiScoreRing value={compact.score.value} label={compact.score.label} />
    </header>
    {compact.score.basis ? <p className="report-basis"><Activity size={14} />{compact.score.basis}</p> : null}
    {compact.metrics.length ? <div className="report-metric-grid">{compact.metrics.map((metric, index) => <MetricTile key={metric.key} metric={metric} index={index} />)}</div> : <div className="report-empty-chart">暂无可用指标</div>}
    <div className="report-summary-strip" aria-label="报告数据摘要">
      <div><strong><AnimatedNumber value={compact.metrics.filter(metric => metric.value !== null).length} /></strong><span>已纳入指标</span></div>
      <div><strong><AnimatedNumber value={compact.trend.values.filter(value => value !== null).length} /></strong><span>趋势点</span></div>
      <div><strong><AnimatedNumber value={keySuggestions.length} /></strong><span>下一步</span></div>
    </div>
    {compact.trend.labels.length ? <AiTrendChart trend={compact.trend} compact /> : null}
    <BodyCompositionReport data={report.bodyComposition} />
    <div className="report-insight-grid">
      <section className="report-insight-block"><div className="report-section-title"><Check size={15} />做得好</div>{keyStrengths.length ? <div className="report-chip-list">{keyStrengths.map(item => <span className="report-chip" key={item}>{item}</span>)}</div> : <p className="report-empty-copy">暂无可确认的优势</p>}</section>
      <section className="report-insight-block"><div className="report-section-title"><Lightbulb size={15} />下一步</div>{keySuggestions.length ? <div className="report-next-list">{keySuggestions.map((item, index) => <div className="report-next-item" key={`${item.title}-${index}`}><div className="row"><strong>{item.title}</strong>{item.priority === 'high' ? <CircleAlert size={14} /> : null}</div><p>{item.body}</p></div>)}</div> : <p className="report-empty-copy">暂无建议</p>}</section>
    </div>
    <footer className="report-footer"><span>数据范围：已保存记录</span>{provider ? <span className="report-provider">{provider}</span> : null}</footer>
    {detailHref ? <Link to={detailHref} className="report-detail-link">阅读详细分析<ArrowUpRight size={16} /></Link> : null}
  </article>;
}
