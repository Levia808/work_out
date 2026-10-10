import type { AiProvider } from './types';
import { makeId } from './localData';

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
};

const STORAGE_KEY = 'fittrack:ai-jobs';
const MAX_JOBS = 12;

function readJobs(): AiJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as AiJob[] : [];
  } catch {
    return [];
  }
}

function writeJobs(jobs: AiJob[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(-MAX_JOBS)));
  window.dispatchEvent(new CustomEvent('fittrack:ai-jobs'));
}

export function getAiJobs(): AiJob[] {
  return readJobs().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLatestAiJob(kind: AiJobKind, inputSummary?: string) {
  return getAiJobs().find(job => job.kind === kind && (inputSummary === undefined || job.inputSummary === inputSummary));
}

export function createAiJob(input: Pick<AiJob, 'kind' | 'provider' | 'inputSummary'> & Partial<Pick<AiJob, 'status'>>): AiJob {
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
