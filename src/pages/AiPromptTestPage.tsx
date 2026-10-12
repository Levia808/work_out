import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { analyzeTraining, auditTrainingAnalysisNarrative, getAnalysisProvider, type TrainingAnalysis } from '../lib/ai';
import { countScenarioInputs, createRandomAiTestScenarios, type AiTestScenario } from '../lib/aiTestFixtures';
import type { UserSettings } from '../lib/types';

type RunResult = { scenario: AiTestScenario; result?: TrainingAnalysis; error?: string; elapsedMs: number; narrativeDigitCount: number; suggestionBasisRate: number; narrativeWarnings: string[]; inputChars: number };
function savedAiProvider() {
  try {
    const saved = localStorage.getItem('fittrack:settings');
    if (!saved) return null;
    const settings = JSON.parse(saved) as UserSettings;
    return getAnalysisProvider(settings);
  } catch { return null; }
}
function generatedNarrativeText(result: TrainingAnalysis) {
  // Exclude date ranges, source-bound metric notes/evidence, and other client
  // generated values: only test prose actually returned by the model.
  return [result.compact.summary, ...result.compact.strengths, ...result.compact.suggestions.flatMap(item => [item.title, item.body, item.basis]), result.detailed.overview, ...result.detailed.highlights.flatMap(item => [item.title, item.detail, item.basis]), ...result.detailed.metricDetails.map(item => item.interpretation), ...result.detailed.nextSteps.flatMap(item => [item.title, item.body, item.basis]), ...result.detailed.cautions].join(' ');
}
function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : '请求失败';
  return message.replace(/(?:sk-|ds-)[A-Za-z0-9_-]{10,}/g, '[已隐藏凭据]');
}

export function AiPromptTestPage() {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState<RunResult[]>([]);
  const [notice, setNotice] = useState('');
  const provider = savedAiProvider();

  const run = async () => {
    if (!import.meta.env.DEV) return;
    if (!provider) { setNotice('主环境设置中没有可用的 API Key。'); return; }
    const scenarios = createRandomAiTestScenarios();
    setResults([]); setNotice('本轮仅提交随机合成记录；不会读取或保存真实健康数据。'); setRunning(true);
    const nextResults: RunResult[] = [];
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios[index]!;
      setCurrent(index + 1);
      const input = countScenarioInputs(scenario.data);
      const inputChars = JSON.stringify(scenario.data).length;
      const started = performance.now();
      try {
        const result = await analyzeTraining(provider.provider, provider.apiKey, scenario.data);
        const narratives = generatedNarrativeText(result);
        const basisItems = result.compact.suggestions.concat(result.detailed.nextSteps);
        nextResults.push({
          scenario, result, elapsedMs: Math.round(performance.now() - started),
          narrativeDigitCount: (narratives.match(/[0-9]/g) ?? []).length,
          suggestionBasisRate: basisItems.length ? Math.round(basisItems.filter(item => item.basis.trim()).length / basisItems.length * 100) : 100,
          narrativeWarnings: auditTrainingAnalysisNarrative(result),
          inputChars,
        });
      } catch (error) {
        nextResults.push({ scenario, error: safeError(error), elapsedMs: Math.round(performance.now() - started), narrativeDigitCount: 0, suggestionBasisRate: 0, narrativeWarnings: [], inputChars });
      }
      setResults([...nextResults]);
    }
    setCurrent(0); setRunning(false);
    setNotice(`测试完成：${nextResults.filter(item => item.result).length}/3 份报告成功解析。测试记录只保存在当前页面内存。`);
  };

  return <AppShell title="AI 提示词验证" subtitle="仅供本地开发测试 · 合成数据不会写入报告记录" actions={false}>
    <div className="stack" style={{ gap: 12, paddingBottom: 24 }}>
      <section className="card stack">
        <h2 className="card-title">逐日全量数据回归</h2>
        <p className="card-copy">当前服务：{provider?.provider === 'deepseek' ? 'DeepSeek' : provider?.provider === 'qwen' ? '千问' : '未配置'}。每轮随机生成 28 天逐日训练、逐餐营养、睡眠、体测、习惯与目标数据，并包含有意空缺场景；不访问应用真实记录，不保存 API 请求内容。</p>
        <button className="primary-btn row" type="button" onClick={() => void run()} disabled={running || !provider}>
          <span>{running ? `正在测试 ${current}/3…` : '随机生成数据并运行 3 轮'}</span>
        </button>
        {!provider ? <p className="form-error">请先在主环境设置中配置 AI 服务密钥。</p> : null}
        {notice ? <p className="card-copy" role="status">{notice}</p> : null}
      </section>
      {results.map((item, index) => {
        const counts = countScenarioInputs(item.scenario.data);
        return <section className="card stack" key={item.scenario.seed}>
          <div className="row"><h2 className="card-title">{index + 1}. {item.scenario.title}</h2><span className="eyebrow">{item.result ? '解析成功' : '失败'}</span></div>
          <p className="card-copy">seed {item.scenario.seed} · 输入 {item.inputChars.toLocaleString()} 字符 · 餐食 {counts.mealEntries} 条 · 睡眠 {counts.sleepEntries} 天 · 训练 {counts.trainingSessions} 次 · 体测 {counts.bodyEntries} 天 · 习惯打卡 {counts.habitCheckins} 条 · 耗时 {(item.elapsedMs / 1000).toFixed(1)} 秒</p>
          {item.error ? <p className="form-error">{item.error}</p> : null}
          {item.result ? <>
            <div className="card stack"><h3 className="card-title">精简版</h3><p className="card-copy">{item.result.compact.summary}</p>{item.result.compact.strengths.map((text, textIndex) => <p className="card-copy" key={textIndex}>• {text}</p>)}{item.result.compact.suggestions.map((suggestion, textIndex) => <p className="card-copy" key={textIndex}><strong>{suggestion.title}</strong> — {suggestion.body}<br /><span className="muted">依据：{suggestion.basis || '未提供'}</span></p>)}</div>
            <div className="card stack"><h3 className="card-title">详细版观察</h3><p className="card-copy">{item.result.detailed.overview}</p>{item.result.detailed.metricDetails.map(metric => <p className="card-copy" key={metric.key}><strong>{metric.title}</strong>：{metric.interpretation} <span className="muted">{metric.evidence}</span></p>)}{item.result.detailed.cautions.map((text, textIndex) => <p className="card-copy" key={textIndex}>边界：{text}</p>)}
              <details><summary>查看结构化 JSON</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{JSON.stringify(item.result, null, 2)}</pre></details>
            </div>
            <p className="card-copy">自动检查：结构化报告已解析 · 客户端数值绑定完成 · 叙述中的阿拉伯数字 {item.narrativeDigitCount} 处 · 建议依据字段覆盖 {item.suggestionBasisRate}% · 高风险措辞 {item.narrativeWarnings.length} 处</p>
            {item.narrativeWarnings.map(warning => <p className="form-error" key={warning}>回归警告：{warning}</p>)}
          </> : null}
        </section>;
      })}
    </div>
  </AppShell>;
}
