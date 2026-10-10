import { Activity, ArrowDownRight, CalendarDays, ChevronRight, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AiReportCard } from '../components/AiReportCard';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AppShell } from '../components/AppShell';
import { ReasoningText } from '../components/ReasoningText';
import { TrendBadge } from '../components/CircularMetric';
import { analyzeTraining, getAnalysisProvider, normalizeTrainingAnalysis, type TrainingAnalysis } from '../lib/ai';
import { createAiJob, getAiJobs, markAiJobInterrupted, updateAiJob, type AiJob } from '../lib/aiJobs';
import { getBodyMetrics, getSettings, getTrainingAnalytics, getTrainingRate } from '../lib/localData';

type AnalysisMode = { key: 'day' | 'week' | 'ongoing'; label: string; days: number };
const analysisModes: AnalysisMode[] = [
  { key: 'day', label: '今日分析', days: 1 },
  { key: 'week', label: '本周分析', days: 7 },
  { key: 'ongoing', label: '持续训练', days: 28 },
];

function formatChange(current: number | undefined, previous: number | undefined, unit: string) {
  if (current === undefined || previous === undefined) return null;
  const delta = Number((current - previous).toFixed(1));
  if (delta === 0) return `较上次记录 0${unit}`;
  return `较上次记录 ${delta > 0 ? '+' : ''}${delta}${unit}`;
}

function modeFromInput(inputSummary: string) {
  const days = Number(inputSummary.split(':')[1]);
  return analysisModes.find(mode => mode.days === days)?.label ?? '训练分析';
}

function providerLabel(provider: AiJob['provider']) {
  return provider === 'qwen' ? '千问' : 'DeepSeek';
}

function jobProviderLabel(job: AiJob) {
  return job.source === 'preview' ? '本地演示' : providerLabel(job.provider);
}

function statusLabel(status: AiJob['status']) {
  return ({ submitting: '已提交', generating: '生成中', succeeded: '已生成', failed: '失败', interrupted: '已中断', uploading: '上传中', reading: '读取中' } as Record<AiJob['status'], string>)[status];
}

export function StatsPage() {
  const [version, setVersion] = useState(0);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode['key']>('week');
  const [analysisError, setAnalysisError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const analysisInput = `analysis:${analysisModes.find(item => item.key === analysisMode)?.days ?? 7}`;

  useEffect(() => {
    const sync = () => setVersion(value => value + 1);
    const markActiveJobs = () => {
      getAiJobs().filter(job => job.kind === 'training-analysis' && ['submitting', 'generating'].includes(job.status)).forEach(job => markAiJobInterrupted(job.id));
    };
    window.addEventListener('fittrack:data', sync);
    window.addEventListener('fittrack:ai-jobs', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('pagehide', markActiveJobs);
    return () => {
      window.removeEventListener('fittrack:data', sync);
      window.removeEventListener('fittrack:ai-jobs', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pagehide', markActiveJobs);
    };
  }, []);

  const analysisJobs = useMemo(() => getAiJobs().filter(job => job.kind === 'training-analysis').map(job => ({
    ...job,
    result: job.result ? normalizeTrainingAnalysis(job.result) : undefined,
  })) as AiJob<TrainingAnalysis>[], [version]);
  const modeJob = analysisJobs.find(job => job.inputSummary === analysisInput);
  const focusedJob = selectedHistoryId ? analysisJobs.find(job => job.id === selectedHistoryId) ?? modeJob : modeJob;
  const focusedReport = focusedJob?.status === 'succeeded' && focusedJob.result ? focusedJob.result : undefined;

  const metrics = useMemo(() => getBodyMetrics().filter(item => item.weightKg !== undefined || item.bodyFatPercent !== undefined), [version]);
  const weightMetrics = metrics.filter(item => item.weightKg !== undefined);
  const fatMetrics = metrics.filter(item => item.bodyFatPercent !== undefined);
  const latestWeight = weightMetrics.at(-1)?.weightKg;
  const previousWeight = weightMetrics.at(-2)?.weightKg;
  const latestFat = fatMetrics.at(-1)?.bodyFatPercent;
  const previousFat = fatMetrics.at(-2)?.bodyFatPercent;
  const settings = useMemo(() => getSettings(), [version]);
  const trainingRate = useMemo(() => getTrainingRate(28), [version]);
  const selectedMode = analysisModes.find(item => item.key === analysisMode) ?? analysisModes[1];

  const chart = useMemo(() => {
    if (weightMetrics.length < 2) return null;
    const values = weightMetrics.map(item => item.weightKg!);
    const target = settings.targetWeightKg;
    const min = Math.min(...values, target ?? Number.POSITIVE_INFINITY);
    const max = Math.max(...values, target ?? Number.NEGATIVE_INFINITY);
    const range = Math.max(max - min, 1);
    const lower = min - range * 0.15;
    const upper = max + range * 0.15;
    const heightRange = upper - lower;
    const toY = (value: number) => 100 - ((value - lower) / heightRange) * 100;
    return { points: weightMetrics.map((item, index) => `${(index / (weightMetrics.length - 1)) * 100},${toY(item.weightKg!)}`).join(' '), pointY: weightMetrics.map(item => toY(item.weightKg!)), pointsData: weightMetrics, targetY: target === undefined ? undefined : toY(target) };
  }, [settings.targetWeightKg, weightMetrics]);

  const runAnalysis = async () => {
    setAnalysisError('');
    setSelectedHistoryId(null);
    const provider = getAnalysisProvider(settings);
    if (!provider) {
      setAnalysisError('请先在设置中填写千问或 DeepSeek API Key。');
      return;
    }
    const job = createAiJob({ kind: 'training-analysis', provider: provider.provider, inputSummary: analysisInput, status: 'submitting' });
    setAnalyzing(true);
    try {
      updateAiJob(job.id, { status: 'generating' });
      const result = await analyzeTraining(provider.provider, provider.apiKey, getTrainingAnalytics(selectedMode.days));
      updateAiJob(job.id, { status: 'succeeded', result, retryable: false, error: undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : '分析失败，请稍后重试。';
      updateAiJob(job.id, { status: 'failed', error: message, retryable: true });
      setAnalysisError(message);
    } finally {
      setAnalyzing(false);
      setVersion(value => value + 1);
    }
  };

  return <AppShell title="统计">
    <div className="stack">
      <div className="card-grid">
        <div className="card metric-card"><span className="eyebrow">当前体重</span><div>{latestWeight !== undefined ? <><AnimatedNumber value={latestWeight} decimals={1} className="big-number" /><span className="unit">kg</span>{formatChange(latestWeight, previousWeight, 'kg') ? <TrendBadge text={formatChange(latestWeight, previousWeight, 'kg')!} /> : <p className="card-copy">尚无上一条记录可比较</p>}</> : <><div className="big-number empty-number">--</div><p className="card-copy">暂无体重记录</p></>}</div></div>
        <div className="card metric-card"><span className="eyebrow">体脂率</span><div>{latestFat !== undefined ? <><AnimatedNumber value={latestFat} decimals={1} className="big-number" /><span className="unit">%</span>{formatChange(latestFat, previousFat, '%') ? <span className="row trend-badge" style={{ justifyContent: 'flex-start' }}><ArrowDownRight size={14} />{formatChange(latestFat, previousFat, '%')}</span> : <p className="card-copy">尚无上一条记录可比较</p>}</> : <><div className="big-number empty-number">--</div><p className="card-copy">暂无体脂记录</p></>}</div></div>
      </div>

      <section className="card">
        <div className="row"><h2 className="card-title">体重趋势</h2><Activity size={20} className="muted" /></div>
        {chart ? <><div className="chart-wrap" role="img" aria-label="体重趋势图"><svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}><polyline points={chart.points} fill="none" stroke="#fff" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />{chart.targetY !== undefined ? <line x1="0" x2="100" y1={chart.targetY} y2={chart.targetY} stroke="rgba(255,255,255,.3)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /> : null}{chart.pointsData.map((item, index) => <circle key={item.id} cx={(index / (chart.pointsData.length - 1)) * 100} cy={chart.pointY[index]} r="1.6" fill="#fff" vectorEffect="non-scaling-stroke" />)}</svg></div><div className="row muted" style={{ fontSize: '.75rem' }}>{chart.pointsData.slice(-4).map(item => <span key={item.id}>{item.measuredOn.slice(5)}</span>)}</div>{settings.targetWeightKg !== undefined ? <p className="card-copy">虚线为目标体重 {settings.targetWeightKg} kg</p> : null}</> : <div className="empty-chart">暂无足够的体重记录。保存两条不同日期的体重后，这里会显示趋势。</div>}
      </section>

      <div className="card-grid">
        <div className="card"><CalendarDays size={20} className="muted" /><p className="card-copy">近 28 天训练达标率</p><div style={{ marginTop: 13 }}>{trainingRate !== undefined ? <><AnimatedNumber value={trainingRate} className="big-number" /><span className="unit">%</span></> : <div className="big-number empty-number">--</div>}</div><p className="card-copy">{trainingRate === undefined ? '创建并完成训练计划后统计' : '按已完成训练记录计算'}</p></div>
        <div className="card"><Target size={20} className="muted" /><p className="card-copy">目标体重</p><div style={{ marginTop: 13 }}>{settings.targetWeightKg !== undefined ? <><AnimatedNumber value={settings.targetWeightKg} decimals={1} className="big-number" /><span className="unit">kg</span></> : <div className="big-number empty-number">--</div>}</div><p className="card-copy">{settings.targetWeightKg === undefined ? '尚未设置' : '来自每日目标设置'}</p></div>
      </div>

      <section className="card stack ai-analysis-shell">
        <div className="row ai-analysis-heading"><h2 className="card-title">AI 训练分析</h2><Sparkles size={20} className="muted" /></div>
        <div className="segmented-control analysis-tabs" role="tablist" aria-label="分析范围">{analysisModes.map(mode => <button key={mode.key} type="button" className={analysisMode === mode.key ? 'selected' : ''} onClick={() => { setAnalysisMode(mode.key); setSelectedHistoryId(null); setAnalysisError(''); }}>{mode.label}</button>)}</div>
        <button className="primary-btn row" type="button" onClick={() => void runAnalysis()} disabled={analyzing}><span>{analyzing ? '正在分析…' : modeJob?.status === 'succeeded' ? `重新生成${selectedMode.label}` : `生成${selectedMode.label}`}</span><Sparkles size={18} /></button>
        {modeJob && ['submitting', 'generating'].includes(modeJob.status) ? <div className="ai-generating-card"><ReasoningText /><div className="ai-generating-line"><span /><span /><span /></div><p>可离开，结果会保留。</p></div> : null}
        {modeJob ? <div className={`ai-job-status is-${modeJob.status}`}><span>{statusLabel(modeJob.status)}</span><span className="muted">{new Date(modeJob.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div> : null}
        {analysisError || modeJob?.status === 'failed' ? <p className="form-error" role="alert">{analysisError || modeJob?.error}</p> : null}
        {modeJob?.status === 'interrupted' ? <p className="health-hint">本次请求未能在浏览器关闭前完成，状态已保存；重新生成会创建一条新的报告记录。</p> : null}
        {focusedReport ? <AiReportCard report={focusedReport} provider={jobProviderLabel(focusedJob!)} /> : null}
      </section>

      <section className="card stack ai-history-shell">
        <div className="row"><h2 className="card-title">报告记录</h2><span className="history-count">{analysisJobs.length}</span></div>
        {analysisJobs.length ? <div className="ai-history-list">{analysisJobs.map(job => <button className={`ai-history-item${focusedJob?.id === job.id ? ' is-selected' : ''}`} type="button" key={job.id} onClick={() => setSelectedHistoryId(job.id)}><span className={`ai-history-dot is-${job.status}`} /><span className="ai-history-copy"><strong>{modeFromInput(job.inputSummary)}</strong><span>{new Date(job.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {jobProviderLabel(job)}</span></span><span className="ai-history-status">{statusLabel(job.status)}</span><ChevronRight size={16} className="muted" /></button>)}</div> : <div className="report-empty-history"><Sparkles size={18} /><span>暂无 AI 报告</span></div>}
      </section>
    </div>
  </AppShell>;
}
