import { useMemo, useState } from 'react';
import { Apple, ChevronLeft, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AppShell } from '../components/AppShell';
import { ProgressBar } from '../components/ProgressBar';
import { RingProgress } from '../components/CircularMetric';
import { foodLogs } from '../lib/demoData';
import { totalCalories } from '../lib/calculations';

export function NutritionPage() {
  const [logs, setLogs] = useState(foodLogs);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const total = useMemo(() => totalCalories(logs), [logs]);
  const progress = Math.min(100, total / 2200 * 100);
  const add = () => {
    const kcal = Number(calories);
    if (!name.trim() || !Number.isFinite(kcal) || kcal <= 0) return;
    setLogs(current => [...current, { id: crypto.randomUUID(), meal: '加餐', name: name.trim(), kcal, protein: 0, carbs: 0, fat: 0 }]);
    setName('');
    setCalories('');
    setAdding(false);
  };

  return <AppShell title="饮食" subtitle="吃得更有意识，练得更有效"><div className="stack">
    <Link to="/records" className="muted row back-link"><ChevronLeft size={17} />返回记录</Link>
    <section className="card nutrition-summary">
      <div className="row">
        <div className="metric-value-wrap"><p className="eyebrow">今日摄入</p><div><AnimatedNumber value={total} className="big-number" /><span className="unit">/ 2,200 kcal</span></div></div>
        <RingProgress value={progress} label="今日热量进度" size="small" />
      </div>
      <ProgressBar value={progress} label="今日热量进度" style={{ marginTop: 18 }} />
    </section>
    <section className="card"><div className="row"><h2 className="card-title">今日餐次</h2><button className="icon-btn" type="button" style={{ width: 40, height: 40 }} onClick={() => setAdding(true)} aria-label="添加食物"><Plus size={19} /></button></div>{logs.map(item => <div className="list-row" key={item.id}><span className="list-leading"><Apple size={19} /></span><div className="list-content"><div className="list-title">{item.meal} · {item.name}</div><div className="list-meta">蛋白质 {item.protein}g · 碳水 {item.carbs}g · 脂肪 {item.fat}g</div></div><strong>{item.kcal}</strong></div>)}</section>
    {adding ? <section className="card stack"><h2 className="card-title">添加自定义食物</h2><label className="label">食物名称<input className="input-field" value={name} onChange={event => setName(event.target.value)} placeholder="例如：鸡蛋" /></label><label className="label">热量（kcal）<input className="input-field" inputMode="numeric" value={calories} onChange={event => setCalories(event.target.value)} placeholder="每份热量" /></label><div className="row"><button className="secondary-btn" type="button" onClick={() => setAdding(false)}>取消</button><button className="primary-btn" type="button" onClick={add}>保存记录</button></div></section> : null}
  </div></AppShell>;
}
