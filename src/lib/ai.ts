import type { AiProvider, FoodLog, UserSettings, WorkoutPlanImport } from './types';
import type { TrainingAnalytics } from './localData';

export type { AiProvider } from './types';
export type MealAnalysis = { name: string; meal: FoodLog['meal']; kcal: number; protein: number; carbs: number; fat: number; notes: string; confidence?: number };
export type TrainingMetricKey = 'training' | 'sleep' | 'nutrition' | 'habits' | 'body';
export type TrainingAnalysisMetric = {
  key: TrainingMetricKey;
  label: string;
  value: number | null;
  unit: string;
  note: string;
  progress: number | null;
};
export type TrainingSuggestion = { title: string; body: string; basis: string; priority: 'high' | 'medium' | 'low' };
export type TrainingAnalysis = {
  summary: string;
  strengths: string[];
  suggestions: TrainingSuggestion[];
  dataNote: string;
  score: { value: number | null; label: string; basis: string };
  metrics: TrainingAnalysisMetric[];
  trend: { title: string; unit: string; labels: string[]; values: Array<number | null> };
};

function endpoint(provider: AiProvider) { return provider === 'qwen' ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' : 'https://api.deepseek.com/chat/completions'; }
function model(provider: AiProvider, multimodal = false) {
  // Keep the text and vision models explicit so a selected provider never
  // silently falls back to an unavailable/legacy model.
  if (provider === 'qwen') return multimodal ? 'qwen3-vl-plus' : 'qwen-plus';
  // DeepSeek Flash is the current multimodal model and accepts both text and
  // image_url content in the OpenAI-compatible Chat Completions API.
  return 'deepseek-flash';
}
function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map(part => {
    if (typeof part === 'string') return part;
    if (!part || typeof part !== 'object') return '';
    const value = part as { text?: unknown; content?: unknown };
    if (typeof value.text === 'string') return value.text;
    return textFromContent(value.content);
  }).join('');
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const value = payload as {
    choices?: Array<{
      text?: unknown;
      delta?: { content?: unknown };
      message?: { content?: unknown; reasoning_content?: unknown; output_text?: unknown };
    }>;
    output_text?: unknown;
    output?: Array<{ content?: unknown; text?: unknown }>;
  };
  const choice = value.choices?.[0];
  const candidates = [
    choice?.message?.content,
    choice?.message?.output_text,
    choice?.text,
    choice?.delta?.content,
    value.output_text,
    ...(value.output ?? []).flatMap(item => [item.content, item.text]),
    // Reasoning models can occasionally put the final JSON in this field
    // when the normal content field is empty. It is parsed by parseAiJson,
    // which safely extracts the JSON portion from any surrounding reasoning.
    choice?.message?.reasoning_content,
  ];
  for (const candidate of candidates) {
    const text = textFromContent(candidate);
    if (text.trim()) return text;
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const serialized = JSON.stringify(candidate);
      if (serialized && serialized !== '{}') return serialized;
    }
  }
  return '';
}

function stripCodeFence(text: string) {
  return text.replace(/^\uFEFF/, '').trim()
    .replace(/^```(?:json|JSON)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/** Find balanced JSON values while respecting quoted strings and escapes. */
function jsonCandidates(text: string): string[] {
  const candidates: string[] = [];
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{' && text[start] !== '[') continue;
    const opening = text[start];
    const closing = opening === '{' ? '}' : ']';
    const stack = [closing];
    let quoted = false;
    let escaped = false;
    for (let index = start + 1; index < text.length; index += 1) {
      const char = text[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') { quoted = true; continue; }
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack[stack.length - 1] !== char) break;
        stack.pop();
        if (!stack.length) {
          candidates.push(text.slice(start, index + 1));
          break;
        }
      }
    }
  }
  return candidates.sort((left, right) => right.length - left.length);
}

function removeJsonTrailingCommas(text: string) {
  let result = '';
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      result += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; result += char; continue; }
    if (char === ',' && /^[\s]*[}\]]/.test(text.slice(index + 1))) continue;
    result += char;
  }
  return result;
}

function parseJsonCandidate(candidate: string): unknown {
  const cleaned = removeJsonTrailingCommas(candidate.trim());
  try { return JSON.parse(cleaned) as unknown; } catch {
    // Some compatible models occasionally use JavaScript-style single quotes
    // or unquoted keys despite being asked for JSON. Repair only the common,
    // unambiguous forms and leave values containing apostrophes untouched.
    const repaired = cleaned
      .replace(/([{,]\s*)'([^'\n]+)'\s*:/g, '$1"$2":')
      .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)\s*:/g, '$1"$2":')
      .replace(/:\s*'([^'\n]*)'/g, ': "$1"');
    return JSON.parse(repaired) as unknown;
  }
}

/**
 * Parse the JSON-like text returned by Qwen/DeepSeek gateways.
 * Handles code fences, leading prose, nested objects, trailing commas and
 * the occasional already-serialized JSON string. The result is still checked
 * by each feature-specific normalizer afterwards.
 */
export function parseAiJson<T>(text: string): T {
  if (typeof text !== 'string' || !text.trim()) throw new Error('AI 没有返回内容，请重试。');
  const cleaned = stripCodeFence(text);
  const attempts = [cleaned, ...jsonCandidates(cleaned)];
  const errors: string[] = [];
  for (const candidate of attempts) {
    try {
      let parsed = parseJsonCandidate(candidate);
      if (typeof parsed === 'string') parsed = parseJsonCandidate(parsed);
      if (parsed && typeof parsed === 'object') return parsed as T;
      errors.push('not-object');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'invalid-json');
    }
  }
  // Avoid exposing raw model output (which can contain personal data) in the
  // UI error message or logs.
  void errors;
  throw new Error('AI 返回内容不是有效 JSON，请重试。');
}
async function callProvider(provider: AiProvider, apiKey: string, messages: unknown[], temperature = 0.2, multimodal = false) {
  if (!apiKey.trim()) throw new Error(`请先在设置中填写${provider === 'qwen' ? '千问' : 'DeepSeek'} API Key。`);
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.trim()}` };
    const request = (withJsonMode: boolean) => fetch(endpoint(provider), {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model: model(provider, multimodal),
        temperature,
        messages,
        stream: false,
        ...(withJsonMode ? { response_format: { type: 'json_object' } } : {}),
        max_tokens: 4_000,
      }),
    });
    let response = await request(true);
    let payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    if (!response.ok) throw new Error(payload?.error?.message ?? `AI 请求失败（${response.status}）。`);
    let text = extractText(payload);
    // Some OpenAI-compatible gateways return HTTP 200 but omit message.content
    // when JSON mode is enabled. Retry once without that optional parameter;
    // the prompt still requires JSON and the same parser validates the result.
    if (!text.trim()) {
      response = await request(false);
      payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? `AI 请求失败（${response.status}）。`);
      text = extractText(payload);
    }
    return text;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('AI 请求超时，请检查网络后重试。');
    throw error;
  } finally { window.clearTimeout(timeout); }
}

export async function analyzeMealPhoto(provider: AiProvider, apiKey: string, imageDataUrl: string): Promise<MealAnalysis> {
  const text = await callProvider(provider, apiKey, [{ role: 'user', content: [
    { type: 'text', text: '你是营养记录助手。识别这张餐食照片，严格只返回 JSON，不要 Markdown。字段：name（食物或餐食名称）、meal（breakfast/lunch/dinner/snack 之一）、kcal（整数）、protein（克数）、carbs（克数）、fat（克数）、notes（识别依据与不确定性，中文）、confidence（0 到 1）。看不清或无法估算时不要编造，返回合理估计并在 notes 标明需要确认。' },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ] }], 0.2, true);
  const result = parseAiJson<MealAnalysis>(text);
  if (typeof result.name !== 'string' || !result.name.trim() || !Number.isFinite(result.kcal) || !Number.isFinite(result.protein) || !Number.isFinite(result.carbs) || !Number.isFinite(result.fat)) throw new Error('AI 没有返回完整营养数据，请重试或手动录入。');
  return { ...result, name: result.name.trim(), notes: typeof result.notes === 'string' ? result.notes.trim() : '', kcal: Math.max(0, Math.round(result.kcal)), protein: Math.max(0, Number(result.protein)), carbs: Math.max(0, Number(result.carbs)), fat: Math.max(0, Number(result.fat)), meal: ['breakfast', 'lunch', 'dinner', 'snack'].includes(result.meal) ? result.meal : 'snack' };
}

export async function analyzeTrainingPlanImage(provider: AiProvider, apiKey: string, imageDataUrl: string): Promise<WorkoutPlanImport> {
  const text = await callProvider(provider, apiKey, [{ role: 'user', content: [
    { type: 'text', text: '你是 FitTrack 训练计划录入助手。读取这张训练计划截图或照片，只转录图片中明确可见的内容，不要凭空补全缺失动作、组数、次数或重量。严格只返回 JSON，不要 Markdown，结构为：{title: string, weekday: 0-6, weekMode: "every"|"odd"|"even", exercises: [{name: string, muscleGroup: string, instructions: string, todos: string[], targetSets: number, targetReps: number, targetWeightKg?: number}]}。weekday 按周日=0、周一=1 到周六=6；如果图片没有明确星期，使用 0 并在 title 或 instructions 中标注“星期未识别”；如果没有明确重复方式，使用 every；无法识别的文字用空字符串，不要猜测。todos 只填写图片中明确列出的检查项。' },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ] }], 0.1, true);
  const raw = parseAiJson<WorkoutPlanImport>(text);
  if (!raw || typeof raw.title !== 'string' || !Array.isArray(raw.exercises)) throw new Error('AI 没有返回有效的训练计划 JSON。');
  const weekMode = raw.weekMode === 'odd' || raw.weekMode === 'even' ? raw.weekMode : 'every';
  const weekday = Number.isInteger(raw.weekday) && raw.weekday >= 0 && raw.weekday <= 6 ? raw.weekday : 0;
  const exercises = raw.exercises.map(item => ({
    name: typeof item?.name === 'string' ? item.name.trim() : '',
    muscleGroup: typeof item?.muscleGroup === 'string' ? item.muscleGroup.trim() : '',
    instructions: typeof item?.instructions === 'string' ? item.instructions.trim() : '',
    todos: Array.isArray(item?.todos) ? item.todos.filter((todo): todo is string => typeof todo === 'string').map(todo => todo.trim()).filter(Boolean) : [],
    targetSets: Number.isFinite(Number(item?.targetSets)) && Number(item.targetSets) > 0 ? Math.min(30, Math.round(Number(item.targetSets))) : 0,
    targetReps: Number.isFinite(Number(item?.targetReps)) && Number(item.targetReps) > 0 ? Math.min(100, Math.round(Number(item.targetReps))) : 0,
    targetWeightKg: Number.isFinite(Number(item?.targetWeightKg)) && Number(item.targetWeightKg) >= 0 ? Number(item.targetWeightKg) : undefined,
  })).filter(item => item.name && item.targetSets > 0 && item.targetReps > 0);
  if (!raw.title.trim() || !exercises.length) throw new Error('没有从图片中识别到可导入的动作与目标，请换一张更清晰的图片。');
  return { title: raw.title.trim(), weekday, weekMode, exercises };
}

function nullableNumber(value: unknown, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function normalizeTrainingAnalysisValue(input: unknown): TrainingAnalysis {
  const raw = (input ?? {}) as Record<string, unknown>;
  const strengths = Array.isArray(raw.strengths) ? raw.strengths.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean) : [];
  const rawSuggestions = Array.isArray(raw.suggestions) ? raw.suggestions : [];
  const suggestions: TrainingSuggestion[] = rawSuggestions.map(item => {
    if (typeof item === 'string') return { title: '建议', body: item.trim(), basis: '', priority: 'medium' as const };
    const value = (item ?? {}) as Record<string, unknown>;
    const priority: TrainingSuggestion['priority'] = value.priority === 'high' || value.priority === 'low' ? value.priority : 'medium';
    return {
      title: typeof value.title === 'string' && value.title.trim() ? value.title.trim() : '建议',
      body: typeof value.body === 'string' ? value.body.trim() : '',
      basis: typeof value.basis === 'string' ? value.basis.trim() : '',
      priority,
    };
  }).filter(item => item.body);

  const rawMetrics = Array.isArray(raw.metrics) ? raw.metrics : [];
  const validKeys: TrainingMetricKey[] = ['training', 'sleep', 'nutrition', 'habits', 'body'];
  const metrics: TrainingAnalysisMetric[] = rawMetrics.map(item => {
    const value = (item ?? {}) as Record<string, unknown>;
    const key = validKeys.includes(value.key as TrainingMetricKey) ? value.key as TrainingMetricKey : 'training';
    return {
      key,
      label: typeof value.label === 'string' && value.label.trim() ? value.label.trim() : key,
      value: nullableNumber(value.value),
      unit: typeof value.unit === 'string' ? value.unit.trim() : '',
      note: typeof value.note === 'string' ? value.note.trim() : '',
      progress: nullableNumber(value.progress, 0, 100),
    };
  }).filter((item, index, list) => list.findIndex(candidate => candidate.key === item.key) === index);

  const rawTrend = (raw.trend ?? {}) as Record<string, unknown>;
  const labels = Array.isArray(rawTrend.labels) ? rawTrend.labels.filter((item): item is string => typeof item === 'string').map(item => item.trim()) : [];
  const values = Array.isArray(rawTrend.values) ? rawTrend.values.map(item => nullableNumber(item, 0, 100)) : [];
  const trendValues = labels.map((_, index) => values[index] ?? null);
  const scoreRaw = (raw.score ?? {}) as Record<string, unknown>;
  const scoreValue = nullableNumber(scoreRaw.value, 0, 100);

  return {
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    strengths,
    suggestions,
    dataNote: typeof raw.dataNote === 'string' ? raw.dataNote.trim() : '',
    score: {
      value: scoreValue,
      label: typeof scoreRaw.label === 'string' && scoreRaw.label.trim() ? scoreRaw.label.trim() : '执行度',
      basis: typeof scoreRaw.basis === 'string' ? scoreRaw.basis.trim() : '',
    },
    metrics,
    trend: {
      title: typeof rawTrend.title === 'string' && rawTrend.title.trim() ? rawTrend.title.trim() : '趋势',
      unit: typeof rawTrend.unit === 'string' ? rawTrend.unit.trim() : '%',
      labels,
      values: trendValues,
    },
  };
}

export function normalizeTrainingAnalysis(input: unknown): TrainingAnalysis {
  return normalizeTrainingAnalysisValue(input);
}

export async function analyzeTraining(provider: AiProvider, apiKey: string, data: TrainingAnalytics): Promise<TrainingAnalysis> {
  const text = await callProvider(provider, apiKey, [
    { role: 'system', content: '你是 FitTrack 的训练分析助手。你会收到用户在一个时间范围内的真实训练、睡眠、饮食、体重体测、习惯和目标数据。只允许基于这些已传入的数据分析；不得补全、猜测或伪造不存在的记录。缺失字段必须明确写“暂无数据”或“无法判断”，不要为了填满图表而生成 0。不要给出医疗诊断或替代医生意见。严格只返回 JSON，不要 Markdown。必须使用以下结构：{summary:string,dataNote:string,score:{value:number|null,label:string,basis:string},metrics:[{key:"training"|"sleep"|"nutrition"|"habits"|"body",label:string,value:number|null,unit:string,note:string,progress:number|null}],trend:{title:string,unit:string,labels:string[],values:(number|null)[]},strengths:string[],suggestions:[{title:string,body:string,basis:string,priority:"high"|"medium"|"low"}]}. score.value 与 metrics.progress 只有在数据足够时填写 0-100，否则为 null。trend.values 表示实际数据支持的 0-100 变化，不存在的数据用 null，labels 与 values 长度一致。每条 suggestions 必须引用真实数据维度作为 basis。dataNote 必须说明分析区间、覆盖的数据项和缺失项。' },
    { role: 'user', content: JSON.stringify(data) },
  ], 0.2);
  const result = normalizeTrainingAnalysisValue(parseAiJson<unknown>(text));
  if (!result.summary || !result.dataNote) throw new Error('AI 返回的分析 JSON 不完整，请重试。');
  return result;
}

export function getAnalysisProvider(settings: UserSettings): { provider: AiProvider; apiKey: string } | null {
  // The selected service is authoritative. Never silently send a request to
  // the other provider when the selected provider has no key.
  const provider = settings.aiProvider ?? (settings.qwenApiKey ? 'qwen' : 'deepseek');
  const apiKey = provider === 'qwen' ? settings.qwenApiKey : settings.deepseekApiKey;
  return apiKey?.trim() ? { provider, apiKey } : null;
}
