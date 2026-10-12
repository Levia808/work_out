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
  const nutritionProgress = data.nutrition.calorieGoal && data.nutrition.avgKcal !== undefined
    ? Math.max(0, Math.min(100, Math.round((data.nutrition.avgKcal / data.nutrition.calorieGoal) * 100)))
    : null;
  const habitProgress = data.habits.completionRate ?? null;
  const bodyProgress = data.body.targetWeightKg !== undefined && data.body.latestWeightKg !== undefined
    ? Math.max(0, Math.min(100, Math.round(100 - Math.abs(data.body.latestWeightKg - data.body.targetWeightKg) * 10)))
    : null;
  const available = [data.training.completionRate, sleepProgress, nutritionProgress, habitProgress, bodyProgress].filter((value): value is number => value !== null && value !== undefined);
  const score = available.length ? Math.round(available.reduce((sum, value) => sum + value, 0) / available.length) : null;
  const metrics = [
    { key: 'training' as const, label: '训练', value: data.training.completionRate ?? null, unit: '%', note: `${data.training.completedSessions}/${data.training.plannedSessions} 次已完成`, progress: clampPercent(data.training.completionRate) },
    { key: 'sleep' as const, label: '睡眠', value: data.sleep.avgHours ?? null, unit: '小时', note: data.sleep.goalRate === undefined ? '暂无睡眠目标' : `达标 ${data.sleep.goalRate}%`, progress: sleepProgress },
    { key: 'nutrition' as const, label: '饮食', value: data.nutrition.avgProtein ?? null, unit: 'g 蛋白质', note: data.nutrition.avgKcal === undefined ? '暂无热量记录' : `日均 ${Math.round(data.nutrition.avgKcal)} kcal`, progress: nutritionProgress },
    { key: 'habits' as const, label: '习惯', value: data.habits.completionRate ?? null, unit: '%', note: `${data.habits.completedLogs} 条已完成记录`, progress: habitProgress },
    { key: 'body' as const, label: '体测', value: data.body.latestWeightKg ?? null, unit: 'kg', note: data.body.latestBodyFatPercent === undefined ? '暂无体脂记录' : `体脂 ${data.body.latestBodyFatPercent}%`, progress: bodyProgress },
  ];
  const trend = { title: '区间完成度', unit: '%', labels: ['训练', '睡眠', '饮食', '习惯', '体测'], values: [data.training.completionRate ?? null, sleepProgress, nutritionProgress, habitProgress, bodyProgress] };
  const suggestions = [
    data.sleep.goalRate !== undefined && data.sleep.goalRate < 100 ? { title: '补齐睡眠目标', body: '继续记录入睡与起床时间，才能判断是否稳定达标。', basis: `当前睡眠达标率 ${data.sleep.goalRate}%。`, priority: 'medium' as const } : null,
    data.training.completionRate !== undefined && data.training.completionRate < 100 ? { title: '按计划完成训练', body: '优先完成已安排的训练日，并在每组结束后保存重量与次数。', basis: `当前训练完成率 ${data.training.completionRate}%。`, priority: 'high' as const } : null,
    !data.nutrition.loggedDays ? { title: '先补充饮食记录', body: '至少记录一天完整饮食后再判断热量与蛋白质趋势。', basis: '当前区间暂无饮食记录。', priority: 'low' as const } : null,
  ].filter((item): item is TrainingAnalysis['compact']['suggestions'][number] => item !== null);
  const compact = {
    summary: `过去 ${data.period.days} 天，${data.training.completedSessions ? `完成 ${data.training.completedSessions} 次训练` : '暂无已完成训练'}，${data.sleep.loggedDays ? `记录 ${data.sleep.loggedDays} 天作息` : '暂无作息记录'}，${data.nutrition.loggedDays ? `记录 ${data.nutrition.loggedDays} 天饮食` : '暂无饮食记录'}。`,
    dataNote: '演示数据 · 仅用于本地验证；真实账号不会自动生成。',
    score: { value: score, label: '记录完成度', basis: '按当前区间内已有训练、睡眠、饮食、习惯与体测数据计算。' },
    metrics,
    trend,
    strengths: [
      data.training.completedSessions ? `完成了 ${data.training.completedSessions} 次训练记录。` : '',
      data.sleep.loggedDays ? `已记录 ${data.sleep.loggedDays} 天作息。` : '',
      data.nutrition.loggedDays ? `已记录 ${data.nutrition.loggedDays} 天饮食。` : '',
    ].filter(Boolean),
    suggestions,
  };
  return {
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
  };
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
