import type { AiProvider } from './types';
import { bindTrainingAnalysisToSourceData, type TrainingAnalysis } from './ai';
import { getTrainingAnalytics, isPreviewMode, makeId } from './localData';

export type AiJobKind = 'meal-photo' | 'workout-plan-image' | 'training-analysis';
export type AiJobStatus = 'reading' | 'uploading' | 'submitting' | 'generating' | 'succeeded' | 'failed' | 'interrupted';

export type AiJob<T = unknown> = {
  id: string;
  kind: AiJobKind;
  provider: AiProvider;
  createdAt: string;
  updatedAt: string;
  status: AiJobStatus;
  inputSummary: string;
  result?: T;
  error?: string;
  retryable: boolean;
  /** Preview-only records are never created for a real user account. */
  source?: 'user' | 'preview';
};

const STORAGE_KEY = 'fittrack:ai-jobs';
const PREVIEW_DATA_KEY = 'fittrack:demo:preview-seeded';

function jobsStorageKey() {
  return isPreviewMode() ? 'fittrack:demo:ai-jobs' : STORAGE_KEY;
}

function readJobs(): AiJob[] {
  try {
    const raw = localStorage.getItem(jobsStorageKey());
    return raw ? JSON.parse(raw) as AiJob[] : [];
  } catch {
    return [];
  }
}

function writeJobs(jobs: AiJob[]) {
  // Keep every generated report so users can compare changes over time.
  // The payload is structured JSON and each job has a stable id.
  localStorage.setItem(jobsStorageKey(), JSON.stringify(jobs));
  window.dispatchEvent(new CustomEvent('fittrack:ai-jobs'));
}

export function getAiJobs(): AiJob[] {
  const jobs = readJobs().map(job => {
    if (!isPreviewMode() || job.kind !== 'training-analysis' || !job.result) return job;
    const match = /^analysis:(\d+)$/.exec(job.inputSummary);
    if (!match) return { ...job, source: 'preview' as const };
    const days = Math.max(1, Number(match[1]));
    return {
      ...job,
      source: 'preview' as const,
      // Older local smoke-test reports predate source-bound charts. Rebind
      // their visible facts to the synthetic preview records, never the AI.
      result: bindTrainingAnalysisToSourceData(job.result, getTrainingAnalytics(days)),
    };
  });
  return jobs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLatestAiJob(kind: AiJobKind, inputSummary?: string) {
  return getAiJobs().find(job => job.kind === kind && (inputSummary === undefined || job.inputSummary === inputSummary));
}

export function createAiJob(input: Pick<AiJob, 'kind' | 'provider' | 'inputSummary'> & Partial<Pick<AiJob, 'status' | 'source'>>): AiJob {
  const now = new Date().toISOString();
  const job: AiJob = {
    id: makeId(),
    kind: input.kind,
    provider: input.provider,
    inputSummary: input.inputSummary,
    createdAt: now,
    updatedAt: now,
    status: input.status ?? 'submitting',
    retryable: true,
    source: input.source ?? (isPreviewMode() ? 'preview' : 'user'),
  };
  writeJobs([...getAiJobs(), job]);
  return job;
}

export function updateAiJob<T>(id: string, patch: Partial<Pick<AiJob<T>, 'status' | 'result' | 'error' | 'retryable'>>): AiJob<T> | undefined {
  const jobs = readJobs();
  const index = jobs.findIndex(job => job.id === id);
  if (index < 0) return undefined;
  jobs[index] = { ...jobs[index], ...patch, updatedAt: new Date().toISOString() };
  writeJobs(jobs);
  return jobs[index] as AiJob<T>;
}

export function markAiJobInterrupted(id: string) {
  return updateAiJob(id, { status: 'interrupted', error: '任务在页面离开或应用关闭时中断，可重新提交。', retryable: true });
}

/**
 * A browser fetch cannot be resumed against a provider's server-side token.
 * Stale jobs are therefore marked interrupted instead of pretending they are
 * still generating. The saved result and retry action remain available.
 */

function buildPreviewTrainingAnalysis(days = 7): TrainingAnalysis {
  const data = getTrainingAnalytics(days);
  const clampPercent = (value: number | undefined) => value === undefined ? null : Math.max(0, Math.min(100, value));
  const sleepProgress = data.sleep.goalRate ?? null;
  const nutritionProgress = null;
  const habitProgress = data.habits.checkInCompletionRate ?? null;
  const bodyProgress = null;
  const metrics = [
    { key: 'training' as const, label: '训练', value: data.training.recordedSessionCompletionRate ?? null, unit: '%', note: `${data.training.completedSessions}/${data.training.sessions} 次已记录训练已结束；计划场次不代表实际执行`, progress: clampPercent(data.training.recordedSessionCompletionRate) },
    { key: 'sleep' as const, label: '睡眠', value: data.sleep.avgHours ?? null, unit: '小时', note: data.sleep.goalRate === undefined ? '暂无睡眠目标' : `达标 ${data.sleep.goalRate}%`, progress: sleepProgress },
    { key: 'nutrition' as const, label: '饮食', value: data.nutrition.avgProtein ?? null, unit: 'g 蛋白质', note: data.nutrition.avgKcal === undefined ? '暂无热量记录' : `已录入餐食日均 ${Math.round(data.nutrition.avgKcal)} kcal；不代表全天摄入`, progress: nutritionProgress },
    { key: 'habits' as const, label: '习惯', value: data.habits.checkInCompletionRate ?? null, unit: '%', note: `${data.habits.completedLogs}/${data.habits.loggedEntries ?? 0} 条已记录打卡完成；覆盖率 ${data.habits.loggingCoverageRate ?? '—'}%`, progress: habitProgress },
    { key: 'body' as const, label: '体测', value: data.body.latestWeightKg ?? null, unit: 'kg', note: data.body.latestBodyFatPercent === undefined ? '暂无体脂记录' : `体脂 ${data.body.latestBodyFatPercent}%`, progress: bodyProgress },
  ];
  const trend = { title: '记录趋势', unit: '', labels: [] as string[], values: [] as Array<number | null> };
  const suggestions: TrainingAnalysis['compact']['suggestions'] = [
    data.sleep.goalRate !== undefined && data.sleep.goalRate < 100 ? { title: '补齐睡眠目标', body: '继续记录入睡与起床时间，才能判断是否稳定达标。', basis: `当前睡眠达标率 ${data.sleep.goalRate}%。`, priority: 'medium' as const } : null,
    data.training.sessions > data.training.completedSessions ? { title: '完善训练记录', body: '训练结束后保存实际完成组数；若中途结束，可保留当前记录。', basis: '部分已记录训练尚未标记结束。', priority: 'medium' as const } : null,
    !data.nutrition.loggedDays ? { title: '先补充饮食记录', body: '至少记录一天完整饮食后再判断热量与蛋白质趋势。', basis: '当前区间暂无饮食记录。', priority: 'low' as const } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  const compact = {
    summary: `过去 ${data.period.days} 天，${data.training.completedSessions ? `完成 ${data.training.completedSessions} 次训练` : '暂无已完成训练'}，${data.sleep.loggedDays ? `记录 ${data.sleep.loggedDays} 天作息` : '暂无作息记录'}，${data.nutrition.loggedDays ? `记录 ${data.nutrition.loggedDays} 天饮食` : '暂无饮食记录'}。`,
    dataNote: '演示数据 · 仅用于本地验证；真实账号不会自动生成。',
    score: { value: null, label: '不合并评分', basis: '各项统计口径不同，不合并成单一分数。' },
    metrics,
    trend,
    strengths: [
      data.training.completedSessions ? `完成了 ${data.training.completedSessions} 次训练记录。` : '',
      data.sleep.loggedDays ? `已记录 ${data.sleep.loggedDays} 天作息。` : '',
      data.nutrition.loggedDays ? `已记录 ${data.nutrition.loggedDays} 天饮食。` : '',
    ].filter(Boolean),
    suggestions,
  };
  return bindTrainingAnalysisToSourceData({
    compact,
    detailed: {
      overview: compact.summary,
      coverage: {
        period: `过去 ${data.period.days} 天（${data.period.start} 至 ${data.period.end}）`,
        included: metrics.filter(item => item.value !== null).map(item => item.label),
        missing: metrics.filter(item => item.value === null).map(item => item.label),
      },
      highlights: compact.strengths.map((detail, index) => ({ title: ['训练记录', '作息记录', '饮食记录'][index] ?? '记录亮点', detail, basis: '来自演示数据中已保存的记录。' })),
      metricDetails: metrics.map(item => ({ key: item.key, title: item.label, value: item.value, unit: item.unit, interpretation: item.note, evidence: item.note, progress: item.progress })),
      trends: [trend],
      nextSteps: suggestions,
      cautions: ['演示报告只用于验证界面与交互；真实报告仅使用用户当前已保存的数据。'],
    },
  }, data);
}

/** Seed clearly marked reports so every report surface can be verified locally. */
export function seedPreviewAiJob() {
  if (!isPreviewMode() || !localStorage.getItem(PREVIEW_DATA_KEY)) return false;
  const existing = getAiJobs();
  const now = Date.now();
  const samples: Array<{ inputSummary: string; days: number; ageDays: number; status?: AiJobStatus; error?: string }> = [
    { inputSummary: 'analysis:1', days: 1, ageDays: 2 },
    { inputSummary: 'analysis:3', days: 3, ageDays: 13 },
    { inputSummary: 'analysis:7', days: 7, ageDays: 6 },
    { inputSummary: 'analysis:21', days: 21, ageDays: 38 },
    { inputSummary: 'analysis:28', days: 28, ageDays: 34 },
    { inputSummary: 'analysis:30', days: 30, ageDays: 68, status: 'interrupted', error: '本地演示：用于验证离开页面后恢复为可重试状态。' },
    { inputSummary: 'analysis:60', days: 60, ageDays: 95 },
    { inputSummary: 'analysis:90', days: 90, ageDays: 160, status: 'failed', error: '本地演示：用于验证失败状态与报告记录筛选。' },
    { inputSummary: 'analysis:14', days: 14, ageDays: 41, status: 'failed', error: '本地演示：用于验证失败状态与报告记录筛选。' },
  ];
  const missing = samples.filter(sample => !existing.some(job => job.kind === 'training-analysis' && job.source === 'preview' && job.inputSummary === sample.inputSummary));
  if (!missing.length) return false;
  const jobs: AiJob<TrainingAnalysis>[] = missing.map(sample => {
    const timestamp = new Date(now - sample.ageDays * 24 * 60 * 60 * 1000).toISOString();
    const status = sample.status ?? 'succeeded';
    return {
      id: makeId(),
      kind: 'training-analysis',
      provider: sample.ageDays % 2 ? 'qwen' : 'deepseek',
      createdAt: timestamp,
      updatedAt: timestamp,
      status,
      inputSummary: sample.inputSummary,
      ...(status === 'succeeded' ? { result: buildPreviewTrainingAnalysis(sample.days) } : { error: sample.error }),
      retryable: status !== 'succeeded',
      source: 'preview',
    };
  });
  writeJobs([...existing, ...jobs]);
  return true;
}

export function recoverAiJobs(maxAgeMs = 90_000) {
  const now = Date.now();
  const jobs = readJobs();
  let changed = false;
  const next = jobs.map(job => {
    if (!['submitting', 'generating', 'uploading', 'reading'].includes(job.status)) return job;
    if (now - Date.parse(job.updatedAt) <= maxAgeMs) return job;
    changed = true;
    return { ...job, status: 'interrupted' as const, updatedAt: new Date().toISOString(), error: '上次任务未完成，已恢复为可重试状态。', retryable: true };
  });
  if (changed) writeJobs(next);
  return next;
}
