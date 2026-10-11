import { AlertTriangle, Check, CircleAlert, Dumbbell, Flame, Moon, Scale, Target } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { TrainingAnalysisDetail, TrainingAnalysisMetricDetail, TrainingMetricKey } from '../lib/ai';
import { AnimatedNumber } from './AnimatedNumber';
import { AiScoreRing, AiTrendChart } from './AiReportCard';

type AiDetailedReportProps = {
  compact: { summary: string; score: { value: number | null; label: string; basis: string } };
  detail: TrainingAnalysisDetail;
  provider?: string;
};

const metricIcons: Record<TrainingMetricKey, typeof Dumbbell> = {
  training: Dumbbell,
  sleep: Moon,
  nutrition: Flame,
  habits: Check,
  body: Scale,
};

function metricValue(metric: TrainingAnalysisMetricDetail) {
  if (metric.value === null) return <span className="report-empty-value">暂无</span>;
  const decimals = Number.isInteger(metric.value) ? 0 : 1;
  return <><AnimatedNumber value={metric.value} decimals={decimals} /><span className="unit">{metric.unit}</span></>;
}

function DetailMetric({ metric, index }: { metric: TrainingAnalysisMetricDetail; index: number }) {
  const Icon = metricIcons[metric.key];
  return <article className="detail-metric-tile" style={{ '--report-delay': `${index * 50}ms` } as CSSProperties}>
    <div className="row detail-metric-title"><span className="report-metric-icon"><Icon size={16} /></span><strong>{metric.title}</strong></div>
    <div className="detail-metric-value">{metricValue(metric)}</div>
    <p>{metric.interpretation || '暂无可确认的解读。'}</p>
    <span className="detail-metric-evidence">{metric.evidence || '暂无可确认的证据。'}</span>
    {metric.progress !== null ? <div className="report-meter" aria-label={`${metric.title} ${Math.round(metric.progress)}%`}><span style={{ width: `${metric.progress}%` }} /></div> : null}
  </article>;
}

export function AiDetailedReport({ compact, detail, provider }: AiDetailedReportProps) {
  return <article className="ai-detailed-report report-reveal">
    <header className="detail-report-hero">
      <div className="detail-report-copy"><h2>详细训练分析</h2><p>{detail.overview || compact.summary || '暂无可用分析。'}</p><div className="detail-report-basis"><Target size={14} />{compact.score.basis || '仅使用当前已保存的数据。'}</div></div>
      <AiScoreRing value={compact.score.value} label={compact.score.label} size="large" />
    </header>

    <section className="detail-section detail-coverage">
      <div className="detail-section-heading"><h3>数据覆盖</h3><span>{detail.coverage.period}</span></div>
      <div className="coverage-groups">
        <div><span className="detail-label">已纳入</span><div className="report-chip-list">{detail.coverage.included.length ? detail.coverage.included.map(item => <span className="report-chip is-positive" key={item}>{item}</span>) : <span className="detail-empty">暂无数据</span>}</div></div>
        <div><span className="detail-label">缺少</span><div className="report-chip-list">{detail.coverage.missing.length ? detail.coverage.missing.map(item => <span className="report-chip is-muted" key={item}>{item}</span>) : <span className="detail-empty">暂无</span>}</div></div>
      </div>
    </section>

    <section className="detail-section"><div className="detail-section-heading"><h3>指标解读</h3><span>{detail.metricDetails.length} 项</span></div>{detail.metricDetails.length ? <div className="detail-metric-grid">{detail.metricDetails.map((metric, index) => <DetailMetric key={metric.key} metric={metric} index={index} />)}</div> : <div className="detail-empty-panel">暂无可解读的指标</div>}</section>

    <section className="detail-section"><div className="detail-section-heading"><h3>趋势与变化</h3><span>基于已记录值</span></div>{detail.trends.length ? <div className="detail-trends-grid">{detail.trends.map((trend, index) => <AiTrendChart key={`${trend.title}-${index}`} trend={trend} />)}</div> : <div className="detail-empty-panel">暂无足够记录形成趋势</div>}</section>

    <section className="detail-section"><div className="detail-section-heading"><h3>记录亮点</h3><span>{detail.highlights.length} 项</span></div>{detail.highlights.length ? <div className="detail-highlight-grid">{detail.highlights.map((item, index) => <article className="detail-highlight" key={`${item.title}-${index}`}><div className="detail-highlight-icon"><Check size={17} /></div><div><strong>{item.title}</strong><p>{item.detail}</p>{item.basis ? <span>{item.basis}</span> : null}</div></article>)}</div> : <div className="detail-empty-panel">暂无可确认的记录亮点</div>}</section>

    <section className="detail-section"><div className="detail-section-heading"><h3>下一步建议</h3><span>{detail.nextSteps.length} 项</span></div>{detail.nextSteps.length ? <div className="detail-next-grid">{detail.nextSteps.map((item, index) => <article className={`detail-next-item priority-${item.priority}`} key={`${item.title}-${index}`}><div className="row"><strong>{item.title}</strong>{item.priority === 'high' ? <CircleAlert size={15} /> : null}</div><p>{item.body}</p>{item.basis ? <span>{item.basis}</span> : null}</article>)}</div> : <div className="detail-empty-panel">暂无下一步建议</div>}</section>

    <section className="detail-section detail-cautions"><div className="detail-section-heading"><h3><AlertTriangle size={16} />数据边界</h3><span>请以原始记录为准</span></div>{detail.cautions.length ? <ul>{detail.cautions.map(item => <li key={item}>{item}</li>)}</ul> : <p>暂无额外说明。</p>}</section>
    <footer className="detail-report-footer">{provider ? <span>来源：{provider}</span> : null}<span>报告内容只基于当前已保存数据，缺失信息不会自动补全。</span></footer>
  </article>;
}
