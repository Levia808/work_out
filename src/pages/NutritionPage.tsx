import { useMemo, useState } from 'react';
import { Apple, Camera, ChevronLeft, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { PhotoSourcePicker } from '../components/PhotoSourcePicker';
import { ProgressBar } from '../components/ProgressBar';
import { RingProgress } from '../components/CircularMetric';
import { analyzeMealPhoto, getAnalysisProvider, type MealAnalysis } from '../lib/ai';
import { createAiJob, getLatestAiJob, updateAiJob, type AiJob } from '../lib/aiJobs';
import { dateKey, deleteMeal, getMeals, getSettings, saveMeal } from '../lib/localData';
import type { MealType } from '../lib/types';

const mealLabels: Record<MealType, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
type PhotoStatus = 'idle' | 'reading' | 'compressing' | 'submitting' | 'success' | 'error';

export function NutritionPage() {
  const loggedOn = dateKey();
  const [logs, setLogs] = useState(() => getMeals(loggedOn));
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', meal: 'snack' as MealType, kcal: '', protein: '', carbs: '', fat: '' });
  const [status, setStatus] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>('idle');
  const [photoError, setPhotoError] = useState('');
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(() => {
    const job = getLatestAiJob('meal-photo', `meal:${loggedOn}`) as AiJob<MealAnalysis> | undefined;
    return job?.status === 'succeeded' ? job.result ?? null : null;
  });
  const [analyzing, setAnalyzing] = useState(false);
  const goal = getSettings().calorieGoal;
  const total = useMemo(() => logs.reduce((sum, item) => sum + item.kcal, 0), [logs]);
  const progress = goal ? Math.min(100, total / goal * 100) : 0;

  const update = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }));
  const addManual = () => {
    const kcal = Number(form.kcal);
    if (!form.name.trim() || !Number.isFinite(kcal) || kcal < 0) {
      setStatus('请填写食物名称和有效热量。');
      return;
    }
    const item = saveMeal({ loggedOn, name: form.name.trim(), meal: form.meal, kcal, protein: Number(form.protein) || 0, carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0, source: 'manual' });
    setLogs(current => [...current, item]);
    setForm({ name: '', meal: 'snack', kcal: '', protein: '', carbs: '', fat: '' });
    setStatus('已保存饮食记录。');
    setAdding(false);
  };

  const readPhoto = async (dataUrl: string) => {
    setPhotoPreview(dataUrl);
    setAnalysis(null);
    setPhotoError('');
    const provider = getAnalysisProvider(getSettings());
    if (!provider) {
      setPhotoStatus('error');
      setPhotoError('请先在设置中选择千问或 DeepSeek 并填写对应 API Key。照片识别不会生成本地猜测数据。');
      return;
    }
    const job = createAiJob({ kind: 'meal-photo', provider: provider.provider, inputSummary: `meal:${loggedOn}`, status: 'submitting' });
    setAnalyzing(true);
    setPhotoStatus('submitting');
    setStatus('照片已压缩，正在提交识别。');
    try {
      updateAiJob(job.id, { status: 'generating' });
      const result = await analyzeMealPhoto(provider.provider, provider.apiKey, dataUrl);
      updateAiJob(job.id, { status: 'succeeded', result, retryable: false, error: undefined });
      setAnalysis(result);
      setPhotoStatus('success');
      setStatus('识别完成，请确认营养数据后保存。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '照片识别失败，请手动记录。';
      updateAiJob(job.id, { status: 'failed', error: message, retryable: true });
      setPhotoStatus('error');
      setPhotoError(message);
      setStatus(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAi = () => {
    if (!analysis) return;
    const item = saveMeal({ loggedOn, name: analysis.name, meal: analysis.meal, kcal: analysis.kcal, protein: analysis.protein, carbs: analysis.carbs, fat: analysis.fat, source: 'ai', notes: analysis.notes });
    setLogs(current => [...current, item]);
    setAnalysis(null);
    setPhotoPreview('');
    setPhotoStatus('idle');
    setStatus('已保存 AI 识别结果。');
  };
  const remove = (id: string) => { deleteMeal(id); setLogs(current => current.filter(item => item.id !== id)); };

  return <AppShell title="饮食" subtitle="只记录已经确认的数据">
    <div className="stack">
      <Link to="/records" className="muted row back-link"><ChevronLeft size={17} />返回记录</Link>
      <section className="card nutrition-summary">
        <div className="row">
          <div className="metric-value-wrap"><p className="eyebrow">今日摄入</p><div>{goal ? <><AnimatedNumber value={total} className="big-number" /><span className="unit">/ {goal.toLocaleString()} kcal</span></> : <p className="empty-value">-- <span className="unit">kcal</span></p>}</div><p className="card-copy">{goal ? '目标来自设置' : '请先在设置中填写每日热量目标'}</p></div>
          <RingProgress value={progress} label="今日热量进度" size="small" />
        </div>
        {goal ? <ProgressBar value={progress} label="今日热量进度" style={{ marginTop: 18 }} /> : null}
      </section>

      <section className="card stack">
        <div className="row"><div><h2 className="card-title">拍照识别</h2><p className="card-copy">拍照或从相册选择餐食，识别结果需确认后保存。</p></div><Camera size={21} className="muted" /></div>
        <PhotoSourcePicker preview={photoPreview} status={photoStatus} statusText={analyzing ? '正在识别餐食…' : analysis ? '识别完成，请确认后保存' : '选择拍照或相册'} error={photoError} disabled={analyzing} onReady={selection => { void readPhoto(selection.dataUrl); }} onClear={() => { setPhotoPreview(''); setAnalysis(null); setPhotoStatus('idle'); setPhotoError(''); setStatus(''); }} />
        {analysis ? <div className="ai-result stack"><div className="row"><div><span className="eyebrow">识别结果</span><h3 className="card-title">{analysis.name}</h3></div><Sparkles size={19} /></div><div className="macro-grid"><span><strong>{analysis.kcal}</strong><small>kcal</small></span><span><strong>{analysis.protein}g</strong><small>蛋白质</small></span><span><strong>{analysis.carbs}g</strong><small>碳水</small></span><span><strong>{analysis.fat}g</strong><small>脂肪</small></span></div><p className="card-copy">{analysis.notes}{analysis.confidence !== undefined ? ` · 置信度 ${Math.round(analysis.confidence * 100)}%` : ''}</p><div className="row"><button className="primary-btn" type="button" onClick={saveAi}>确认并保存</button><button className="icon-btn" type="button" onClick={() => { setAnalysis(null); setPhotoStatus('idle'); }} aria-label="丢弃识别结果"><X size={18} /></button></div></div> : null}
      </section>

      <section className="card">
        <div className="row"><div><h2 className="card-title">今日餐次</h2><p className="card-copy">手动录入或确认 AI 识别结果</p></div><button className="icon-btn" type="button" onClick={() => setAdding(value => !value)} aria-label={adding ? '关闭手动录入' : '添加食物'}>{adding ? <X size={19} /> : <Plus size={19} />}</button></div>
        {logs.length ? logs.map(item => <div className="list-row" key={item.id}><span className="list-leading"><Apple size={19} /></span><div className="list-content"><div className="list-title">{mealLabels[item.meal]} · {item.name}</div><div className="list-meta">蛋白质 {item.protein}g · 碳水 {item.carbs}g · 脂肪 {item.fat}g · {item.source === 'ai' ? 'AI 已确认' : '手动记录'}</div></div><strong>{item.kcal} kcal</strong><button className="icon-btn small-icon-btn" type="button" onClick={() => remove(item.id)} aria-label={`删除${item.name}`}><Trash2 size={15} /></button></div>) : <p className="card-copy empty-copy">今天还没有饮食记录。</p>}
      </section>

      {adding ? <section className="card stack form-panel"><h2 className="card-title">手动添加食物</h2><label className="label">食物名称<input className="input-field" value={form.name} onChange={event => update('name', event.target.value)} placeholder="例如：鸡蛋" /></label><label className="label">餐次<select className="input-field" value={form.meal} onChange={event => update('meal', event.target.value)}>{Object.entries(mealLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="form-grid"><label className="label">热量（kcal）<input className="input-field" inputMode="decimal" value={form.kcal} onChange={event => update('kcal', event.target.value)} /></label><label className="label">蛋白质（g）<input className="input-field" inputMode="decimal" value={form.protein} onChange={event => update('protein', event.target.value)} /></label><label className="label">碳水（g）<input className="input-field" inputMode="decimal" value={form.carbs} onChange={event => update('carbs', event.target.value)} /></label><label className="label">脂肪（g）<input className="input-field" inputMode="decimal" value={form.fat} onChange={event => update('fat', event.target.value)} /></label></div>{status ? <p className="form-error" role="status">{status}</p> : null}<button className="primary-btn row" type="button" onClick={addManual}><span>保存餐食</span><Plus size={18} /></button></section> : null}
      {status && !adding ? <p className="form-status" role="status">{status}</p> : null}
    </div>
  </AppShell>;
}
