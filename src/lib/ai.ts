import type { AiProvider, FoodLog, UserSettings, WorkoutPlanImport } from './types';

export type { AiProvider } from './types';
export type MealAnalysis = { name: string; meal: FoodLog['meal']; kcal: number; protein: number; carbs: number; fat: number; notes: string; confidence?: number };
export type TrainingAnalysis = { summary: string; strengths: string[]; suggestions: string[]; dataNote: string };

function endpoint(provider: AiProvider) { return provider === 'qwen' ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' : 'https://api.deepseek.com/chat/completions'; }
function model(provider: AiProvider, multimodal = false) {
  // Keep the text and vision models explicit so a selected provider never
  // silently falls back to an unavailable/legacy model.
  if (provider === 'qwen') return multimodal ? 'qwen3-vl-plus' : 'qwen-plus';
  // DeepSeek Flash is the current multimodal model and accepts both text and
  // image_url content in the OpenAI-compatible Chat Completions API.
  return 'deepseek-flash';
}
function extractText(payload: unknown): string {
  const value = payload as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> };
  const content = value.choices?.[0]?.message?.content;
  if (Array.isArray(content)) return content.map(part => part.text ?? '').join('');
  return content ?? '';
}
function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI 返回格式无法解析，请重试。');
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
async function callProvider(provider: AiProvider, apiKey: string, messages: unknown[], temperature = 0.2, multimodal = false) {
  if (!apiKey.trim()) throw new Error(`请先在设置中填写${provider === 'qwen' ? '千问' : 'DeepSeek'} API Key。`);
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(endpoint(provider), { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.trim()}` }, body: JSON.stringify({
        model: model(provider, multimodal),
        temperature,
        messages,
        response_format: { type: 'json_object' },
        max_tokens: 2_000,
      }) });
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    if (!response.ok) throw new Error(payload?.error?.message ?? `AI 请求失败（${response.status}）。`);
    return extractText(payload);
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
  const result = parseJson<MealAnalysis>(text);
  if (typeof result.name !== 'string' || !result.name.trim() || !Number.isFinite(result.kcal) || !Number.isFinite(result.protein) || !Number.isFinite(result.carbs) || !Number.isFinite(result.fat)) throw new Error('AI 没有返回完整营养数据，请重试或手动录入。');
  return { ...result, name: result.name.trim(), notes: typeof result.notes === 'string' ? result.notes.trim() : '', kcal: Math.max(0, Math.round(result.kcal)), protein: Math.max(0, Number(result.protein)), carbs: Math.max(0, Number(result.carbs)), fat: Math.max(0, Number(result.fat)), meal: ['breakfast', 'lunch', 'dinner', 'snack'].includes(result.meal) ? result.meal : 'snack' };
}

export async function analyzeTrainingPlanImage(provider: AiProvider, apiKey: string, imageDataUrl: string): Promise<WorkoutPlanImport> {
  const text = await callProvider(provider, apiKey, [{ role: 'user', content: [
    { type: 'text', text: '你是 FitTrack 训练计划录入助手。读取这张训练计划截图或照片，只转录图片中明确可见的内容，不要凭空补全缺失动作、组数、次数或重量。严格只返回 JSON，不要 Markdown，结构为：{title: string, weekday: 0-6, weekMode: "every"|"odd"|"even", exercises: [{name: string, muscleGroup: string, instructions: string, todos: string[], targetSets: number, targetReps: number, targetWeightKg?: number}]}。weekday 按周日=0、周一=1 到周六=6；如果图片没有明确星期，使用 0 并在 title 或 instructions 中标注“星期未识别”；如果没有明确重复方式，使用 every；无法识别的文字用空字符串，不要猜测。todos 只填写图片中明确列出的检查项。' },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ] }], 0.1, true);
  const raw = parseJson<WorkoutPlanImport>(text);
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

export async function analyzeTraining(provider: AiProvider, apiKey: string, data: { days: number; sessions: number; completedSets: number; totalVolume: number; avgSleepHours?: number; mealDays: number }): Promise<TrainingAnalysis> {
  const text = await callProvider(provider, apiKey, [{ role: 'system', content: '你是 FitTrack 的训练分析助手。只根据提供的真实统计给出具体建议，不要编造不存在的训练、睡眠或饮食记录。严格返回 JSON：summary 字符串、strengths 字符串数组、suggestions 字符串数组、dataNote 字符串。' }, { role: 'user', content: JSON.stringify(data) }]);
  const result = parseJson<TrainingAnalysis>(text);
  const strengths = Array.isArray(result.strengths) ? result.strengths.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean) : [];
  const suggestions = Array.isArray(result.suggestions) ? result.suggestions.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean) : [];
  if (typeof result.summary !== 'string' || !result.summary.trim() || !Array.isArray(result.strengths) || !Array.isArray(result.suggestions) || typeof result.dataNote !== 'string' || !result.dataNote.trim()) throw new Error('AI 返回的分析格式不完整。');
  return { summary: result.summary.trim(), strengths, suggestions, dataNote: result.dataNote.trim() };
}

export function getAnalysisProvider(settings: UserSettings): { provider: AiProvider; apiKey: string } | null {
  // The selected service is authoritative. Never silently send a request to
  // the other provider when the selected provider has no key.
  const provider = settings.aiProvider ?? (settings.qwenApiKey ? 'qwen' : 'deepseek');
  const apiKey = provider === 'qwen' ? settings.qwenApiKey : settings.deepseekApiKey;
  return apiKey?.trim() ? { provider, apiKey } : null;
}
