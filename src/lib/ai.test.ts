import { extractAiText, getAnalysisProvider, normalizeTrainingAnalysis } from './ai';

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


describe('AI response text extraction', () => {
  it('reads non-first choices and tool-call arguments', () => {
    expect(extractAiText({ choices: [
      { message: { content: '' } },
      { message: { tool_calls: [{ function: { arguments: '{"summary":"稳定"}' } }] } },
    ] })).toBe('{"summary":"稳定"}');
  });

  it('reads nested responses output content parts', () => {
    expect(extractAiText({ response: { output: [{ content: [{ type: 'output_text', text: '{"score":80}' }] }] } }))
      .toBe('{"score":80}');
  });
});

describe('training analysis presentation normalization', () => {
  it('keeps measurement trends outside the 0–100 score range', () => {
    const report = normalizeTrainingAnalysis({
      compact: {
        summary: '记录持续稳定。', dataNote: '近一周', score: { value: 80, label: '记录完整度', basis: '' },
        metrics: [], strengths: [], suggestions: [],
        trend: { title: '体重趋势', unit: 'kg', labels: ['周一', '周日'], values: [72.4, 71.8] },
      },
    });
    expect(JSON.stringify(report.compact.trend.values)).toBe('[72.4,71.8]');
  });

  it('prioritizes high-impact suggestions, removes leaked debug tails, and avoids duplicate evidence', () => {
    const report = normalizeTrainingAnalysis({
      compact: {
        summary: '睡眠记录接近目标。 training.plannedSessions=1, completedSessions=0', dataNote: '本周',
        score: { value: 70, label: '记录完整度', basis: '' }, metrics: [],
        strengths: ['睡眠记录接近目标。'],
        suggestions: [
          { title: '次要事项', body: '保持记录。', priority: 'low' },
          { title: '优先事项', body: '补充训练记录。', priority: 'high' },
          { title: '常规事项', body: '继续按计划训练。', priority: 'medium' },
        ],
        trend: { title: '趋势', unit: '%', labels: [], values: [] },
      },
      detailed: {
        metricDetails: [{ key: 'sleep', title: '睡眠', value: 7.5, unit: '小时', interpretation: '已记录 7.5 小时。', evidence: '已记录 7.5 小时。' }],
      },
    });
    expect(report.compact.summary).toBe('睡眠记录接近目标。');
    expect(report.compact.suggestions.map(item => item.priority).join(',')).toBe('high,medium,low');
    expect(report.detailed.metricDetails[0].evidence).toBe('');
  });
});
