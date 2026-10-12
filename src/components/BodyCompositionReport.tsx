import { AnimatedNumber } from './AnimatedNumber';
import type { TrainingAnalysisBodyComposition } from '../lib/ai';

function Stat({ label, value, unit, decimals = 1, isPercent = false }: { label: string; value?: number; unit: string; decimals?: number; isPercent?: boolean }) {
  return <article className="composition-report-stat">
    <span>{label}</span>
    {value === undefined ? <strong>暂无</strong> : <strong><AnimatedNumber value={value} decimals={decimals} />{unit ? <small>{unit}</small> : null}</strong>}
    {isPercent && value !== undefined ? <i aria-hidden="true"><b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i> : null}
  </article>;
}

export function BodyCompositionReport({ data, detailed = false }: { data: TrainingAnalysisBodyComposition | null; detailed?: boolean }) {
  if (!data) return null;
  const estimate = data.estimate;
  const hasEstimate = estimate.bodyFatEstimatePercent !== undefined;
  return <section className={`body-composition-report ${detailed ? 'is-detailed' : ''}`}>
    <header className="body-composition-report-heading"><div><span className="composition-overline">{detailed ? '体测 · 来源分层' : '算法估算'}</span><h3>身体组成</h3></div><time>{data.measuredOn}</time></header>
    {hasEstimate || detailed ? <div className="composition-report-grid">
      {hasEstimate ? <>
        <Stat label="估算体脂率" value={estimate.bodyFatEstimatePercent} unit="%" isPercent />
        <Stat label="估算脂肪量" value={estimate.estimatedFatMassKg} unit="kg" />
        <Stat label="估算去脂体重" value={estimate.estimatedFatFreeMassKg} unit="kg" />
        {estimate.androidRegionFatEstimatePercent === undefined ? null : <Stat label="Android 区域估算" value={estimate.androidRegionFatEstimatePercent} unit="%" isPercent />}
      </> : null}
      {detailed ? <>
        <Stat label="BMI" value={estimate.bmi} unit="" />
        <Stat label="腰高比" value={estimate.waistToHeightRatio} unit="" decimals={3} />
        <Stat label="脂肪质量指数" value={estimate.fatMassIndex} unit="kg/m²" />
        <Stat label="去脂质量指数" value={estimate.fatFreeMassIndex} unit="kg/m²" />
      </> : null}
    </div> : null}
    {hasEstimate ? <>
      <p className="composition-report-note">{estimate.method ?? '公式估算'}。{estimate.methodNote} 脂肪量与去脂体重由同一估算推导；去脂体重不等于肌肉量。{estimate.androidRegionFatEstimatePercent === undefined ? '' : ' Android 区域百分比是研究方程估算，不代表内脏脂肪。'}</p>
      {detailed ? <div className="composition-report-basis">计算输入：{[
        data.measuredWeightKg === undefined ? null : `体重 ${data.measuredWeightKg} kg`,
        data.profile.heightCm === undefined ? null : `身高 ${data.profile.heightCm} cm`,
        data.measuredWaistCm === undefined ? null : `腰围 ${data.measuredWaistCm} cm（${data.waistMeasurementSite === 'narrowest' ? '最窄处' : data.waistMeasurementSite === 'midpoint' ? '肋骨与髂嵴中点' : '测量位置未记录'}）`,
        data.profile.ageYears === undefined ? null : `年龄 ${data.profile.ageYears} 岁`,
        data.profile.formulaSex === undefined ? null : `${data.profile.formulaSex === 'male' ? '男性' : '女性'}方程分类`,
      ].filter(Boolean).join(' · ') || '暂无完整输入'}。腰高比不是内脏脂肪测量；本报告不推测肌肉量、骨量或器官脂肪。</div> : null}
    </> : <div className="composition-report-unavailable">当前资料不足以计算体脂估算；下方仅列出已有记录，不补造缺失指标。</div>}
    {[data.measuredWeightKg, data.measuredBodyFatPercent, data.measuredWaistCm].some(value => value !== undefined) ? <div className="composition-measured-report"><span><strong>已记录数据</strong><small>用户录入或导入；与公式估算分开展示</small></span><div className="composition-record-values">{data.measuredWeightKg !== undefined ? <span>体重 <b><AnimatedNumber value={data.measuredWeightKg} decimals={1} /> kg</b></span> : null}{data.measuredBodyFatPercent !== undefined ? <span>记录体脂 <b><AnimatedNumber value={data.measuredBodyFatPercent} decimals={1} />%</b></span> : null}{data.measuredWaistCm !== undefined ? <span>腰围 <b><AnimatedNumber value={data.measuredWaistCm} decimals={1} /> cm</b></span> : null}</div></div> : null}
  </section>;
}
