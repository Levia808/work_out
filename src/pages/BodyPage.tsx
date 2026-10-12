import { useMemo, useState } from 'react';
import { ChevronLeft, Scale, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { HealthDataCard } from '../components/HealthDataCard';
import { useUpsertBodyMetric } from '../features/body/hooks';
import { dateKey, getBodyMetric, getBodyMetrics, getSettings } from '../lib/localData';
import { estimateBodyComposition } from '../lib/calculations';
import { loadHealthSnapshot, type HealthSnapshot } from '../lib/health';
import { AnimatedNumber } from '../components/AnimatedNumber';

function CompositionValue({ value, unit, decimals = 1 }: { value?: number; unit: string; decimals?: number }) {
  return value === undefined
    ? <span className="composition-empty">暂无</span>
    : <span className="composition-value"><AnimatedNumber value={value} decimals={decimals} /><small>{unit}</small></span>;
}

export function BodyPage() {
  const measuredOn = dateKey();
  const existing = getBodyMetric(measuredOn);
  const settings = getSettings();
  const initialSnapshot = loadHealthSnapshot();
  const [weight, setWeight] = useState(existing?.weightKg?.toString() ?? initialSnapshot?.latestWeightKg?.toFixed(1) ?? '');
  const [fat, setFat] = useState(existing?.bodyFatPercent?.toString() ?? '');
  const defaultWaistSite = settings.bodyFormulaSex === 'female' ? 'narrowest' : 'midpoint';
  const [waist, setWaist] = useState(existing?.waistCm?.toString() ?? '');
  const [waistSite, setWaistSite] = useState<'midpoint' | 'narrowest'>(existing?.waistMeasurementSite ?? defaultWaistSite);
  const [saved, setSaved] = useState(Boolean(existing));
  const [formError, setFormError] = useState('');
  const [healthSnapshot, setHealthSnapshot] = useState<HealthSnapshot | null>(initialSnapshot);
  const mutation = useUpsertBodyMetric();
  const pointsData = getBodyMetrics().filter(item => item.weightKg !== undefined);
  const target = settings.targetWeightKg;
  const parsedWeight = weight.trim() ? Number(weight) : undefined;
  const parsedFat = fat.trim() ? Number(fat) : undefined;
  const parsedWaist = waist.trim() ? Number(waist) : undefined;
  const composition = useMemo(() => estimateBodyComposition({
    ageYears: settings.ageYears,
    bodyFormulaSex: settings.bodyFormulaSex,
    heightCm: settings.heightCm,
    weightKg: parsedWeight,
    waistCm: parsedWaist,
    waistMeasurementSite: waistSite,
  }), [settings.ageYears, settings.bodyFormulaSex, settings.heightCm, parsedWeight, parsedWaist, waistSite]);
  const chart = useMemo(() => {
    if (pointsData.length < 2) return null;
    const values = pointsData.map(item => item.weightKg!);
    const min = Math.min(...values) - .4;
    const max = Math.max(...values) + .4;
    const pointString = pointsData.map((item, index) => `${(index / (pointsData.length - 1)) * 100},${100 - ((item.weightKg! - min) / (max - min)) * 100}`).join(' ');
    return { pointString };
  }, [pointsData]);
  const save = async () => {
    if (parsedWeight === undefined || !Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 350) {
      setFormError('体重请填写 20–350 kg 的有效值。');
      return;
    }
    if (parsedFat !== undefined && (!Number.isFinite(parsedFat) || parsedFat < 1 || parsedFat > 70)) {
      setFormError('体脂记录请填写 1–70%；如果没有实测值，请留空。');
      return;
    }
    if (parsedWaist !== undefined && (!Number.isFinite(parsedWaist) || parsedWaist < 30 || parsedWaist > 200)) {
      setFormError('腰围请填写 30–200 cm 的有效值，或留空。');
      return;
    }
    setFormError('');
    await mutation.mutateAsync({ measuredOn, weightKg: parsedWeight, bodyFatPercent: parsedFat, waistCm: parsedWaist, waistMeasurementSite: waistSite });
    setSaved(true);
  };
  const requiresAge = settings.bodyFormulaSex === 'female' && waistSite === 'midpoint';
  const missingProfile = !settings.heightCm || !settings.bodyFormulaSex || (requiresAge && !settings.ageYears);

  return <AppShell title="体重体测">
    <div className="stack">
      <Link to="/records" className="muted row back-link"><ChevronLeft size={17} />返回记录</Link>
      <section className="card body-weight-card">
        <div className="row">
          <div className="metric-value-wrap">
            <p className="eyebrow">{healthSnapshot?.latestWeightKg !== undefined ? '手机健康数据' : existing ? '当前体重' : '尚未记录'}</p>
            {parsedWeight !== undefined && Number.isFinite(parsedWeight) && parsedWeight > 0 ? <div className="big-number"><AnimatedNumber value={parsedWeight} decimals={1} /><span className="unit">kg</span></div> : <p className="empty-value">-- <span className="unit">kg</span></p>}
            <p className="card-copy">{target ? `目标 ${target} kg` : '可在设置中填写目标体重'}</p>
          </div>
          <span className="list-leading metric-leading"><Scale size={26} /></span>
        </div>
        {chart ? <div className="chart-wrap"><svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }} aria-label="体重趋势图"><polyline points={chart.pointString} fill="none" stroke="#fff" strokeWidth="1.7" vectorEffect="non-scaling-stroke" /></svg></div> : <div className="empty-chart">至少保存两条体重记录后显示趋势。</div>}
      </section>
      <HealthDataCard onImported={snapshot => { setHealthSnapshot(snapshot); if (snapshot.latestWeightKg !== undefined) setWeight(snapshot.latestWeightKg.toFixed(1)); }} />

      <section className="card stack composition-card">
        <div className="row body-section-heading"><div><h2 className="card-title">身体组成估算</h2><p className="card-copy">设备实测与公式估算分开显示</p></div><Scale size={19} className="muted" /></div>
        {composition.bodyFatEstimatePercent !== undefined ? <div className="composition-primary">
          <span className="composition-overline">{composition.methodKey === 'peng-2026-chinese-women' ? '2026 中国女性方程 · 估算' : '中国成人方程 · 估算'}</span>
          <div><CompositionValue value={composition.bodyFatEstimatePercent} unit="%" /></div>
          {composition.estimatedFatMassKg !== undefined && composition.estimatedFatFreeMassKg !== undefined ? <div className="composition-split-bar" aria-label={`估算脂肪量 ${composition.estimatedFatMassKg} kg，估算去脂体重 ${composition.estimatedFatFreeMassKg} kg`}><span style={{ width: `${composition.bodyFatEstimatePercent}%` }} /><span style={{ width: `${100 - composition.bodyFatEstimatePercent}%` }} /></div> : null}
          <p>按已记录数据估算；不是设备测量值。</p>
          {composition.androidRegionFatEstimatePercent !== undefined ? <div className="composition-region-estimate"><span>Android 区域体脂估算</span><strong><AnimatedNumber value={composition.androidRegionFatEstimatePercent} decimals={1} />%</strong><small>研究方程估计的躯干区域脂肪，不是内脏脂肪测量。</small></div> : null}
        </div> : null}
        <div className="composition-grid">
          <article><span>BMI</span><CompositionValue value={composition.bmi} unit="" /></article>
          <article><span>腰高比</span><CompositionValue value={composition.waistToHeightRatio} unit="" decimals={3} /></article>
          <article><span>估算体脂率</span><CompositionValue value={composition.bodyFatEstimatePercent} unit="%" /></article>
          <article><span>估算脂肪量</span><CompositionValue value={composition.estimatedFatMassKg} unit="kg" /></article>
          <article><span>估算去脂体重</span><CompositionValue value={composition.estimatedFatFreeMassKg} unit="kg" /></article>
          <article><span>脂肪质量指数</span><CompositionValue value={composition.fatMassIndex} unit="kg/m²" /></article>
          <article><span>去脂质量指数</span><CompositionValue value={composition.fatFreeMassIndex} unit="kg/m²" /></article>
        </div>
        {composition.bodyFatEstimatePercent !== undefined ? <p className="composition-method">{composition.method}。{composition.methodNote} 脂肪量和去脂体重由同一体脂估算推导，不是独立测量。</p> : <div className="composition-unavailable"><span>{missingProfile ? `补充身高与方程分类${requiresAge ? '、年龄' : ''}，并记录腰围后可尝试估算；BMI/腰高比会按现有输入单独计算。` : '体脂估算需要有效体重、身高、腰围、适用的方程分类与对应测量位置；缺少任何必要数据时显示暂无。'}</span>{missingProfile ? <Link to="/settings" className="secondary-action-link">填写身体资料</Link> : null}</div>}
        {parsedFat !== undefined && Number.isFinite(parsedFat) ? <div className="measured-fat-row"><span><strong>已记录体脂</strong><small>用户输入，可能来自设备或其他测量</small></span><strong><AnimatedNumber value={parsedFat} decimals={1} />%</strong></div> : null}
        <p className="composition-limits">腰高比只是筛查指标；Android 区域估算不代表内脏脂肪。肌肉量、骨量、内脏脂肪和基础代谢暂无可靠输入，显示为暂无，不作推算。</p>
      </section>

      <section className="card stack record-form-card">
        <h2 className="card-title">记录今日数据</h2>
        <label className="label">体重（kg）<input className="input-field" inputMode="decimal" value={weight} onChange={event => { setWeight(event.target.value); setSaved(false); setFormError(''); }} placeholder="必填，例如 68.4" /></label>
        <label className="label">体脂率（%）<input className="input-field" inputMode="decimal" value={fat} onChange={event => { setFat(event.target.value); setSaved(false); setFormError(''); }} placeholder="可选；仅填已有实测/设备值" /></label>
        <label className="label">腰围（cm）<input className="input-field" inputMode="decimal" value={waist} onChange={event => { setWaist(event.target.value); setSaved(false); setFormError(''); }} placeholder="可选；估算需要" /></label>
        <label className="label">腰围测量位置<select className="input-field" value={waistSite} onChange={event => { setWaistSite(event.target.value as 'midpoint' | 'narrowest'); setSaved(false); }}><option value="midpoint">肋骨下缘与髂嵴间中点（Liu 方程）</option><option value="narrowest">腰部最窄处（仅女性 2026 方程）</option></select></label>
        <p className="health-hint">保持软尺水平、贴合但不勒紧，在自然呼气末测量。不同方程的测量位置不能混用；位置不确定时先留空，不生成体脂估算。</p>
        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
        {mutation.error ? <p className="form-error" role="alert">保存失败：{mutation.error.message}</p> : null}
        <button className="primary-btn row" type="button" disabled={mutation.isPending || !weight} onClick={() => void save()}><span>{mutation.isPending ? '正在保存…' : saved ? '已保存' : '保存体测'}</span><Save size={18} /></button>
      </section>
    </div>
  </AppShell>;
}
