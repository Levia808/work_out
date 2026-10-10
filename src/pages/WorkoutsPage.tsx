import { useState } from 'react';
import { Dumbbell, Plus, Timer, TrendingUp, X } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { RingProgress } from '../components/CircularMetric';
import { Heatmap } from '../components/Heatmap';
import { workoutPlans as initialPlans } from '../lib/demoData';
import type { WorkoutPlan } from '../lib/types';

export function WorkoutsPage() {
  const [plans, setPlans] = useState(initialPlans);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [weekday, setWeekday] = useState('周六');

  const addPlan = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const plan: WorkoutPlan = { id: crypto.randomUUID(), title: trimmedTitle, weekday, exercises: 0, progress: 0, active: false };
    setPlans(current => [...current, plan]);
    setTitle('');
    setWeekday('周六');
    setAdding(false);
  };

  return <AppShell title="训练" subtitle="保持节奏，持续变强">
    <div className="stack">
      <div className="card-grid">
        {plans.map(plan => <article className="card" key={plan.id}>
          <div className="row"><RingProgress value={plan.exercises ? plan.progress / plan.exercises * 100 : 0} label={`${plan.title}进度`} size="small" /><Dumbbell size={20} className="muted" /></div>
          <div style={{ marginTop: 24 }}><h2 className="card-title">{plan.title}</h2><p className="card-copy">{plan.weekday} · {plan.exercises ? `${plan.exercises} 个动作` : '待添加动作'}</p></div>
        </article>)}
      </div>
      <Heatmap />
      <section className="card">
        <div className="row"><div><p className="eyebrow">总训练量</p><p className="card-copy">过去 7 天</p></div><div className="row"><span className="big-number">3,200</span><span className="unit">kg</span></div></div>
        <div className="divider" style={{ margin: '17px 0' }} />
        <div className="row"><span className="muted">较上周</span><span className="row" style={{ justifyContent: 'flex-end', color: '#fff' }}><TrendingUp size={16} />12.4%</span></div>
      </section>
      {adding ? <section className="card stack">
        <div className="row"><h2 className="card-title">新建训练计划</h2><button className="icon-btn" style={{ width: 40, height: 40 }} onClick={() => setAdding(false)} aria-label="关闭新建训练计划"><X size={18} /></button></div>
        <label className="label">计划名称<input className="input-field" value={title} onChange={event => setTitle(event.target.value)} placeholder="例如：上肢力量" /></label>
        <label className="label">训练日<select className="input-field" value={weekday} onChange={event => setWeekday(event.target.value)}><option>周一</option><option>周二</option><option>周三</option><option>周四</option><option>周五</option><option>周六</option><option>周日</option></select></label>
        <button className="primary-btn row" onClick={addPlan}><span>保存计划</span><Plus size={18} /></button>
      </section> : <button className="empty-add" onClick={() => setAdding(true)} aria-label="新建训练计划"><Plus size={42} /><span>新建训练计划</span></button>}
      <section className="stack"><h2 className="card-title">最近训练</h2>{['胸部 + 三头', '下肢力量', '背部 + 二头'].map((name, index) => <div className="card list-row" key={name}><span className="list-leading"><Timer size={19} /></span><div className="list-content"><div className="list-title">{name}</div><div className="list-meta">{index + 1} 天前 · {38 + index * 7} 分钟</div></div></div>)}</section>
    </div>
  </AppShell>;
}
