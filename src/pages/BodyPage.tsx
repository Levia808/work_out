import { useMemo, useState } from 'react';
import { ChevronLeft, Scale, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AppShell } from '../components/AppShell';
import { HealthDataCard } from '../components/HealthDataCard';
import { loadHealthSnapshot, type HealthSnapshot } from '../lib/health';
import { weightTrend } from '../lib/demoData';

export function BodyPage() {
  const initialSnapshot = loadHealthSnapshot();
  const [weight, setWeight] = useState(initialSnapshot?.latestWeightKg?.toFixed(1) ?? '68.4');
  const [fat, setFat] = useState('18.6');
  const [saved, setSaved] = useState(false);
  const [healthSnapshot, setHealthSnapshot] = useState<HealthSnapshot | null>(initialSnapshot);
  const parsedWeight = Number(weight);
  const safeWeight = Number.isFinite(parsedWeight) ? parsedWeight : 0;
  const points = useMemo(() => weightTrend.map((item, index) => `${(index / (weightTrend.length - 1)) * 100},${100 - ((item.value - 68) / 3) * 100}`).join(' '), []);

  return <AppShell title="体重体测" subtitle="数据是反馈，不是评判"><div className="stack">
    <Link to="/records" className="muted row back-link"><ChevronLeft size={17} />返回记录</Link>
    <section className="card">
      <div className="row">
        <div className="metric-value-wrap"><p className="eyebrow">{healthSnapshot?.latestWeightKg !== undefined ? '手机健康数据' : '当前体重'}</p><div className="big-number"><AnimatedNumber value={safeWeight} decimals={1} /><span className="unit">kg</span></div><p className="card-copy">目标 65 kg · 还差 {Math.max(0, safeWeight - 65).toFixed(1)} kg</p></div>
        <span className="list-leading metric-leading"><Scale size={26} /></span>
      </div>
      <div className="chart-wrap"><svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }} aria-label="体重趋势图"><polyline points={points} fill="none" stroke="#fff" strokeWidth="1.7" vectorEffect="non-scaling-stroke" /></svg></div>
    </section>
    <HealthDataCard onImported={snapshot => { setHealthSnapshot(snapshot); if (snapshot.latestWeightKg !== undefined) setWeight(snapshot.latestWeightKg.toFixed(1)); }} />
    <section className="card stack"><h2 className="card-title">记录今日数据</h2><label className="label">体重（kg）<input className="input-field" inputMode="decimal" value={weight} onChange={event => { setWeight(event.target.value); setSaved(false); }} /></label><label className="label">体脂率（%）<input className="input-field" inputMode="decimal" value={fat} onChange={event => { setFat(event.target.value); setSaved(false); }} /></label><button className="primary-btn row" type="button" onClick={() => setSaved(true)}><span>{saved ? '已保存' : '保存体测'}</span><Save size={18} /></button></section>
  </div></AppShell>;
}
