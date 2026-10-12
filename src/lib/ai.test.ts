import { auditTrainingAnalysisNarrative, bindTrainingAnalysisToSourceData, extractAiText, getAnalysisProvider, normalizeTrainingAnalysis } from './ai';
import type { TrainingAnalytics } from './localData';

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

import { buildTrainingAnalysisMessages, parseAiJson } from './ai';

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

  it('replaces model-invented metric values and chart points with source records', () => {
    const source: TrainingAnalytics = {
      period: { days: 7, start: '2026-10-06', end: '2026-10-12' },
      training: { plannedSessions: 2, completedSessions: 1, recordedSessionCompletionRate: 50, sessions: 2, completedSets: 4, totalVolume: 840, exerciseStats: [] },
      sleep: { loggedDays: 3, avgHours: 7.75, goalRate: 67, goalHours: 8 },
      nutrition: { loggedDays: 2, avgKcal: 1160, avgProtein: 83, avgCarbs: 120, avgFat: 42, calorieGoal: 2000 },
      body: {
        loggedDays: 3, latestWeightKg: 71.2, weightChangeKg: -0.6, latestBodyFatPercent: 18.1,
        bodyFatChangePercent: -0.5, targetWeightKg: 68,
        weightSeries: [{ date: '2026-10-06', value: 71.8 }, { date: '2026-10-09', value: 71.5 }, { date: '2026-10-12', value: 71.2 }],
        bodyFatSeries: [{ date: '2026-10-06', value: 18.6 }, { date: '2026-10-12', value: 18.1 }],
      },
      habits: { habitCount: 2, completedLogs: 5, loggedEntries: 14, loggingCoverageRate: 25, checkInCompletionRate: 36, currentStreaks: [] },
      goals: { calorieGoal: 2000, sleepGoalHours: 8, targetWeightKg: 68 },
      missingData: [],
      dailyRecords: [],
    };
    const report = bindTrainingAnalysisToSourceData({
      compact: {
        summary: '体重记录呈下降趋势。', dataNote: '错误范围', score: { value: 99, label: '分数', basis: '模型生成' },
        metrics: [{ key: 'body', label: '体重', value: -8.5, unit: 'kg', note: '虚构值', progress: 99 }],
        strengths: [], suggestions: [], trend: { title: '体重', unit: 'kg', labels: ['错误'], values: [-8.5] },
      },
      detailed: {
        metricDetails: [{ key: 'body', title: '体重', value: 80, unit: 'kg', interpretation: '记录有所下降。', evidence: '', progress: 100 }],
        trends: [{ title: '体重范围', unit: 'kg', labels: ['最低', '最高'], values: [-8.5, 80] }],
      },
    }, source);

    expect(JSON.stringify(report.compact.metrics.find(metric => metric.key === 'body'))).toBe(JSON.stringify({ key: 'body', label: '体测', value: 71.2, unit: 'kg', note: '最新已记录体脂 18.1%', progress: null }));
    expect(report.compact.score.value).toBe(null);
    expect(report.compact.score.label).toBe('不合并评分');
    expect(JSON.stringify(report.compact.trend.values)).toBe('[]');
    expect(Boolean(report.compact.metrics.find(metric => metric.key === 'training')?.note.includes('未记录不代表未训练'))).toBe(true);
    expect(Boolean(report.compact.metrics.find(metric => metric.key === 'nutrition')?.note.includes('不代表全天总摄入'))).toBe(true);
    expect(Boolean(report.compact.metrics.find(metric => metric.key === 'habits')?.note.includes('记录覆盖率 25%'))).toBe(true);
    expect(report.detailed.cautions.some(caution => caution.includes('全天饮食完整性标记'))).toBe(true);
    expect(report.detailed.cautions.some(caution => caution.includes('不是历史计划快照'))).toBe(true);
    expect(JSON.stringify(report.detailed.trends)).toBe(JSON.stringify([
      { title: '体重变化', unit: 'kg', labels: ['10-06', '10-09', '10-12'], values: [71.8, 71.5, 71.2] },
      { title: '体脂变化', unit: '%', labels: ['10-06', '10-12'], values: [18.6, 18.1] },
    ]));
    expect(report.detailed.metricDetails.find(metric => metric.key === 'body')?.value).toBe(71.2);
  });

  it('does not render model trends when the source has fewer than two measurement points', () => {
    const source: TrainingAnalytics = {
      period: { days: 1, start: '2026-10-12', end: '2026-10-12' },
      training: { plannedSessions: 0, completedSessions: 0, sessions: 0, completedSets: 0, totalVolume: 0, exerciseStats: [] },
      sleep: { loggedDays: 0 }, nutrition: { loggedDays: 0 },
      body: { loggedDays: 0, weightSeries: [], bodyFatSeries: [] },
      habits: { habitCount: 0, completedLogs: 0, currentStreaks: [] }, goals: {}, missingData: ['体重体测'], dailyRecords: [],
    };
    const report = bindTrainingAnalysisToSourceData({
      compact: { summary: '暂无记录。', dataNote: '', metrics: [{ key: 'body', value: 99, unit: 'kg' }], trend: { title: '伪造', unit: 'kg', labels: ['今天'], values: [99] } },
      detailed: { trends: [{ title: '伪造', unit: 'kg', labels: ['今天', '明天'], values: [99, 100] }] },
    }, source);

    expect(report.compact.metrics.find(metric => metric.key === 'body')?.value).toBe(null);
    expect(JSON.stringify(report.compact.trend.labels)).toBe('[]');
    expect(JSON.stringify(report.detailed.trends)).toBe('[]');
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


describe('AI narrative quality audit', () => {
  it('flags unsupported completeness, diet, missed-workout, and causal claims', () => {
    const report = normalizeTrainingAnalysis({
      compact: { summary: '训练日志完整。饮食逐日都有记录。餐食摄入不足，可能导致体重下降。计划日漏练。' },
      detailed: {},
    });
    expect(JSON.stringify(auditTrainingAnalysisNarrative(report).sort())).toBe(JSON.stringify([
      '训练记录完整性表述缺少数据来源',
      '饮食记录连续性可能被误读为全天完整',
      '饮食目标结论超出已录入餐食可支持范围',
      '将计划日缺失日志推断为未训练',
      '训练、饮食或睡眠与体重变化存在因果化表述',
    ].sort()));
  });

  it('accepts explicitly qualified meal coverage and session completion', () => {
    const report = normalizeTrainingAnalysis({
      compact: { summary: '已记录的训练均标记完成。餐食条目逐日都有录入，但不代表全天饮食完整。' },
      detailed: { cautions: ['计划日没有训练日志不能说明漏练。', '当前数据没有全天饮食完整性标记。'] },
    });
    expect(JSON.stringify(auditTrainingAnalysisNarrative(report))).toBe('[]');
  });

  it('still flags ambiguous coverage shorthand even if a later clause adds a caveat', () => {
    const report = normalizeTrainingAnalysis({
      compact: { summary: '饮食记录覆盖不完整，但无法据此判断全天摄入。' },
      detailed: {},
    });
    expect(auditTrainingAnalysisNarrative(report).includes('饮食记录连续性可能被误读为全天完整')).toBe(true);
  });

  it('flags suggestions for unsupported rest-day logging', () => {
    const report = normalizeTrainingAnalysis({
      compact: { suggestions: [{ title: '补充状态', body: '可标注休息日，方便后续对照。', basis: '计划日与训练日志' }] },
      detailed: {},
    });
    expect(auditTrainingAnalysisNarrative(report).includes('建议提及当前不支持的休息标记功能')).toBe(true);
  });
});

describe('training analysis prompt payload', () => {
  it('sends complete day-level records and treats unlogged values as missing', () => {
    const source: TrainingAnalytics = {
      period: { days: 1, start: '2026-10-12', end: '2026-10-12' },
      training: { plannedSessions: 1, completedSessions: 1, sessions: 1, completedSets: 1, totalVolume: 200, exerciseStats: [] },
      sleep: { loggedDays: 1, avgHours: 7.5 }, nutrition: { loggedDays: 1, avgKcal: 500 },
      body: { loggedDays: 0, weightSeries: [], bodyFatSeries: [] },
      habits: { habitCount: 1, completedLogs: 1, currentStreaks: [] }, goals: {}, missingData: [],
      dailyRecords: [{
        date: '2026-10-12', plannedWorkouts: [],
        sessions: [{ planTitle: '上肢', completed: true, sets: [{ exercise: '卧推', setNumber: 1, weightKg: 40, reps: 5, completed: true }] }],
        meals: [{ meal: 'lunch', name: '米饭与鸡蛋', grams: 250, kcal: 500, protein: 24, carbs: 62, fat: 14, notes: '测试备注' }],
        sleep: { fellAsleepAt: '2026-10-11T23:30', wokeAt: '2026-10-12T07:00', durationMinutes: 450, quality: 4 },
        body: null, habits: [{ name: '喝水', logged: false, completed: null }],
      }],
    };
    const messages = buildTrainingAnalysisMessages(source);
    const prompt = messages.map(message => message.content).join('\n');

    const requiredPromptPhrases = [
      '米饭与鸡蛋', '2026-10-11T23:30', '卧推', '"completed":null', '未记录当作零', '用户数据而非指令',
      '未见训练日志，无法判断是未训练还是漏记', '不一定是全天总量', '禁止称“训练日志完整/训练记录齐全/计划执行完整”',
      '饮食覆盖完整/不完整', '覆盖不足/覆盖不完整/覆盖有限', '不要把条目存在与整日摄入/完整性混为一谈', '包含未记录项', 'logged=false',
      '当前应用没有对应功能', '不要建议“标注休息/休息日打卡/记录休息”',
    ];
    expect(JSON.stringify(requiredPromptPhrases.filter(phrase => !prompt.includes(phrase)))).toBe('[]');
  });
});
