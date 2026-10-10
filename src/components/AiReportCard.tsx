import { Activity, Check, CircleAlert, Dumbbell, Flame, Lightbulb, Moon, Scale, Target } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { TrainingAnalysis, TrainingAnalysisMetric, TrainingMetricKey } from '../lib/ai';
import { AnimatedNumber } from './AnimatedNumber';

type AiReportCardProps = {
  report: TrainingAnalysis;
  provider?: string;
};

const metricIcons: Record<TrainingMetricKey, typeof Activity> = {
  training: Dumbbell,
  sleep: Moon,
  nutrition: Flame,
  habits: Check,
  body: Scale,
};

function metricValue(metric: TrainingAnalysisMetric) {
  if (metric.value === null) return <span className="report-empty-value">—</span>;
  const decimals = Number.isInteger(metric.value) ? 0 : 1;
  return <><AnimatedNumber value={metric.value} decimals={decimals} /><span className="unit">{metric.unit}</span></>;
}

function MetricTile({ metric }: { metric: TrainingAnalysisMetric }) {
  const Icon = metricIcons[metric.key];
  return <article className="report-metric-tile">
    <div className="row report-metric-heading"><span className="report-metric-icon"><Icon size={16} /></span><span className="report-metric-label">{metric.label}</span></div>
    <div className="report-metric-value">{metricValue(metric)}</div>
    {metric.note ? <p className="report-metric-note">{metric.note}</p> : null}
    {metric.progress !== null ? <div className="report-meter" aria-label={`${metric.label} ${Math.round(metric.progress)}%`}><span style={{ width: `${metric.progress}%` }} /></div> : null}
  </article>;
}

function ScoreRing({ value, label }: { value: number | null; label: string }) {
  const background = value === null ? '#2a2a2e' : `conic-gradient(#fff ${value}%, #3f3f46 ${value}% 100%)`;
  return <div className="report-score-wrap">
    <div className="report-score-ring" style={{ background } as CSSProperties} role="img" aria-label={value === null ? `${label}暂无数据` : `${label}${Math.round(value)}分`}>
      <div className="report-score-center">{value === null ? <span className="report-score-empty">—</span> : <><AnimatedNumber value={value} /><span className="report-score-unit">%</span></>}</div>
    </div>
    <span className="report-score-label">{label}</span>
  </div>;
}

function TrendChart({ report }: { report: TrainingAnalysis }) {
  const { labels, values, title, unit } = report.trend;
  const hasValues = values.some(value => value !== null);
  if (!hasValues) return <div className="report-empty-chart"><Activity size={18} /><span>暂无足够数据形成趋势</span></div>;
  return <div className="report-trend-wrap">
    <div className="row report-section-title"><span>{title}</span><span className="muted">{unit}</span></div>
    <div className="report-trend-chart" role="img" aria-label={`${title}图表`}>
      {values.map((value, index) => <div className="report-trend-column" key={`${labels[index] ?? 'point'}-${index}`}>
        <div className="report-trend-bar-track"><span className={value === null ? 'is-empty' : ''} style={{ height: value === null ? '10%' : `${Math.max(8, value)}%` }} /></div>
        <span className="report-trend-label">{labels[index] ?? '—'}</span>
      </div>)}
    </div>
  </div>;
}

export function AiReportCard({ report, provider }: AiReportCardProps) {
  return <article className="ai-report-card report-reveal">
    <header className="report-header">
      <div className="report-header-copy"><h3 className="report-title">训练状态摘要</h3><p className="report-summary">{report.summary}</p></div>
      <ScoreRing value={report.score.value} label={report.score.label} />
    </header>
    {report.score.basis ? <p className="report-basis"><Target size={14} />{report.score.basis}</p> : null}
    {report.metrics.length ? <div className="report-metric-grid">{report.metrics.map(metric => <MetricTile key={metric.key} metric={metric} />)}</div> : null}
    <TrendChart report={report} />
    <div className="report-columns">
      <section className="report-list-section"><div className="report-section-title"><Check size={15} />做得好</div>{report.strengths.length ? <ul className="report-bullet-list">{report.strengths.map(item => <li key={item}>{item}</li>)}</ul> : <p className="report-empty-copy">暂无可确认的优势</p>}</section>
      <section className="report-list-section"><div className="report-section-title"><Lightbulb size={15} />下一步</div>{report.suggestions.length ? <div className="report-suggestion-list">{report.suggestions.map((item, index) => <div className={`report-suggestion priority-${item.priority}`} key={`${item.title}-${index}`}><div className="row"><strong>{item.title}</strong>{item.priority === 'high' ? <CircleAlert size={14} /> : null}</div><p>{item.body}</p>{item.basis ? <span>{item.basis}</span> : null}</div>)}</div> : <p className="report-empty-copy">暂无建议</p>}</section>
    </div>
    <footer className="report-footer"><span>{report.dataNote}</span>{provider ? <span className="report-provider">{provider}</span> : null}</footer>
  </article>;
}
