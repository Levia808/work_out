import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Dumbbell, FileImage, Plus, Repeat2, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AppShell } from '../components/AppShell';
import { Heatmap } from '../components/Heatmap';
import { PhotoSourcePicker } from '../components/PhotoSourcePicker';
import { RingProgress } from '../components/CircularMetric';
import { analyzeTrainingPlanImage, getAnalysisProvider } from '../lib/ai';
import { createPlan, createPlanFromImport, formatWeekday, getPlans, getSettings, habitHeatmap, planProgress, weekModeLabel } from '../lib/localData';
import type { WeekMode } from '../lib/types';

const planSchema = z.object({
  title: z.string().trim().min(1, '请填写计划名称'),
  weekday: z.coerce.number().int().min(0).max(6),
  weekMode: z.enum(['every', 'odd', 'even']),
  exerciseName: z.string().trim().optional(),
  targetSets: z.coerce.number().int().min(1).max(30),
  targetReps: z.coerce.number().int().min(1).max(100),
});

export function WorkoutsPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(getPlans);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | string>('all');
  const [form, setForm] = useState({ title: '', weekday: String(new Date().getDay()), weekMode: 'every' as WeekMode, exerciseName: '', targetSets: '3', targetReps: '10' });
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'reading' | 'compressing' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    const sync = () => setPlans(getPlans());
    window.addEventListener('fittrack:data', sync);
    return () => window.removeEventListener('fittrack:data', sync);
  }, []);

  const visiblePlans = useMemo(() => filter === 'all' ? plans : plans.filter(plan => String(plan.weekday) === filter), [filter, plans]);

  const save = () => {
    const result = planSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? '请检查输入');
      return;
    }
    createPlan({ ...result.data, targetSets: Number(result.data.targetSets), targetReps: Number(result.data.targetReps) });
    setPlans(getPlans());
    setForm({ title: '', weekday: String(new Date().getDay()), weekMode: 'every', exerciseName: '', targetSets: '3', targetReps: '10' });
    setError('');
    setShowForm(false);
  };

  const importFromImage = async (imageDataUrl: string) => {
    const provider = getAnalysisProvider(getSettings());
    if (!provider) {
      setPhotoStatus('error');
      setImportStatus('请先到设置中选择千问或 DeepSeek 并填写对应 API Key。不会在没有数据时生成虚假计划。');
      return;
    }
    setImporting(true);
    setPhotoStatus('submitting');
    setImportStatus(`正在使用${provider.provider === 'qwen' ? '千问' : 'DeepSeek'}识别图片…`);
    try {
      const imported = await analyzeTrainingPlanImage(provider.provider, provider.apiKey, imageDataUrl);
      const plan = createPlanFromImport(imported);
      setPlans(getPlans());
      setPhotoStatus('success');
      setImportStatus(`已导入「${plan.title}」，共 ${plan.items.length} 个动作。`);
      navigate(`/workouts/${plan.id}`);
    } catch (reason) {
      setPhotoStatus('error');
      setImportStatus(reason instanceof Error ? reason.message : '训练计划导入失败，请换一张更清晰的图片。');
    } finally {
      setImporting(false);
    }
  };

  return <AppShell title="训练" subtitle="按天执行，每组都有记录">
    <div className="stack">
      <section className="card workout-week-bar">
        <div className="row-start workout-week-heading">
          <span className="list-leading"><CalendarDays size={20} /></span>
          <div className="list-content"><h2 className="card-title">每周计划</h2><p className="card-copy">支持每周、单周、双周重复</p></div>
        </div>
        <div className="workout-week-actions">
          <button className="secondary-btn row" type="button" onClick={() => { setShowForm(value => !value); setError(''); }}><span>{showForm ? '关闭新建' : '新建计划'}</span>{showForm ? <X size={17} /> : <Plus size={17} />}</button>
          <button className="secondary-btn row" type="button" onClick={() => { setShowImport(true); requestAnimationFrame(() => document.getElementById('workout-ai-import')?.scrollIntoView({ behavior: 'smooth', block: 'center' })); }} disabled={importing}><span>{showImport ? '更换计划图片' : 'AI 导入计划'}</span><FileImage size={17} /></button>
        </div>
        {showImport ? <div id="workout-ai-import" className="workout-import-picker"><PhotoSourcePicker preview={photoPreview} status={photoStatus} statusText={importing ? '正在识别训练计划…' : '拍照或从相册选择训练计划图片'} onReady={selection => { setPhotoPreview(selection.dataUrl); setPhotoStatus('submitting'); void importFromImage(selection.dataUrl); }} onClear={() => { setPhotoPreview(''); setPhotoStatus('idle'); setImportStatus(''); }} disabled={importing} /></div> : null}
        {importStatus ? <p className="health-status" role="status" aria-live="polite">{importStatus}</p> : null}
      </section>

      {showForm ? <section className="card stack form-panel">
        <h2 className="card-title">新建训练计划</h2>
        <label className="label">计划名称<input className="input-field" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="例如：上肢力量" /></label>
        <div className="form-grid">
          <label className="label">训练日<select className="input-field" value={form.weekday} onChange={event => setForm({ ...form, weekday: event.target.value })}>{[0, 1, 2, 3, 4, 5, 6].map(day => <option value={day} key={day}>{formatWeekday(day)}</option>)}</select></label>
          <label className="label">重复方式<select className="input-field" value={form.weekMode} onChange={event => setForm({ ...form, weekMode: event.target.value as WeekMode })}><option value="every">每周重复</option><option value="odd">单周执行</option><option value="even">双周执行</option></select></label>
        </div>
        <label className="label">第一个动作（可选）<input className="input-field" value={form.exerciseName} onChange={event => setForm({ ...form, exerciseName: event.target.value })} placeholder="例如：杠铃卧推" /></label>
        {form.exerciseName.trim() ? <div className="form-grid"><label className="label">目标组数<input className="input-field" inputMode="numeric" value={form.targetSets} onChange={event => setForm({ ...form, targetSets: event.target.value })} /></label><label className="label">目标次数<input className="input-field" inputMode="numeric" value={form.targetReps} onChange={event => setForm({ ...form, targetReps: event.target.value })} /></label></div> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="primary-btn row" type="button" onClick={save}><span>保存计划</span><Plus size={18} /></button>
      </section> : null}

      <div className="segmented-control" role="tablist" aria-label="训练日筛选">{[['all', '全部'], ...[0, 1, 2, 3, 4, 5, 6].map(day => [String(day), formatWeekday(day)])].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
      {visiblePlans.length ? visiblePlans.map(plan => <Link to={`/workouts/${plan.id}`} className="card workout-plan-card" key={plan.id}><div className="row-start"><RingProgress value={planProgress(plan)} label={`${plan.title}进度`} size="small" /><div className="list-content"><h2 className="card-title">{plan.title}</h2><p className="card-copy">{formatWeekday(plan.weekday)} · {weekModeLabel(plan.weekMode)} · {plan.items.length || '暂无'} 个动作</p></div><ChevronRight size={19} className="muted" /></div><div className="row workout-plan-meta"><span className="muted">{plan.active ? '已启用' : '已停用'}</span><span className="row muted"><Dumbbell size={15} />查看动作</span></div></Link>) : <section className="card empty-state"><Repeat2 size={26} className="muted" /><h2 className="card-title">还没有训练计划</h2><p className="card-copy">先建立一个计划，再把动作和检查项补齐。</p><button className="primary-btn" type="button" onClick={() => setShowForm(true)}>新建训练计划</button></section>}
      <Heatmap points={habitHeatmap()} />
    </div>
  </AppShell>;
}
