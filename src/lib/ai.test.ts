import { getAnalysisProvider } from './ai';

describe('AI provider selection', () => {
  it('uses only the selected provider key', () => {
    expect(JSON.stringify(getAnalysisProvider({ aiProvider: 'qwen', qwenApiKey: 'qwen-key', deepseekApiKey: 'deepseek-key' }))).toBe(JSON.stringify({ provider: 'qwen', apiKey: 'qwen-key' }));
    expect(JSON.stringify(getAnalysisProvider({ aiProvider: 'deepseek', qwenApiKey: 'qwen-key', deepseekApiKey: 'deepseek-key' }))).toBe(JSON.stringify({ provider: 'deepseek', apiKey: 'deepseek-key' }));
  });

  it('does not fall back to another provider when the selected key is missing', () => {
    expect(getAnalysisProvider({ aiProvider: 'qwen', deepseekApiKey: 'deepseek-key' })).toBe(null);
    expect(getAnalysisProvider({ aiProvider: 'deepseek', qwenApiKey: 'qwen-key' })).toBe(null);
  });
});

import { parseAiJson } from './ai';

describe('AI JSON response parsing', () => {
  it('extracts JSON from markdown fences and leading prose', () => {
    expect(JSON.stringify(parseAiJson<{ summary: string }>('结果如下：\n```json\n{"summary":"稳定"}\n```'))).toBe(JSON.stringify({ summary: '稳定' }));
  });

  it('handles nested objects, arrays, and trailing commas', () => {
    expect(JSON.stringify(parseAiJson<{ score: { value: number }; values: number[] }>('模型说明： {"score":{"value":80,},"values":[1,2,],}'))).toBe(JSON.stringify({ score: { value: 80 }, values: [1, 2] }));
  });

  it('repairs common JavaScript-style object syntax without exposing raw output', () => {
    expect(JSON.stringify(parseAiJson<{ summary: string; metrics: unknown[] }>("```\n{summary: '完成得不错', metrics: [],}\n```")))
      .toBe(JSON.stringify({ summary: '完成得不错', metrics: [] }));
    let error = '';
    try { parseAiJson('这不是 JSON'); } catch (caught) { error = caught instanceof Error ? caught.message : ''; }
    expect(error).toBe('AI 返回内容不是有效 JSON，请重试。');
  });
});
