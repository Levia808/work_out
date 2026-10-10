import { useMemo, useState } from 'react';
import { BedDouble, ChevronLeft, Moon, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { HealthDataCard } from '../components/HealthDataCard';
import { loadHealthSnapshot, type HealthSnapshot } from '../lib/health';
import { sleepDurationMinutes } from '../lib/calculations';

export function SleepPage() {
  const [fellAsleep, setFellAsleep] = useState('23:30');
  const [woke, setWoke] = useState('07:00');
  const [saved, setSaved] = useState(false);
  const [healthSnapshot, setHealthSnapshot] = useState<HealthSnapshot | null>(() => loadHealthSnapshot());
  const manualDuration = useMemo(() => {
    const start = new Date(`${fellAsleep <= woke ? '2026-10-09' : '2026-10-08'}T${fellAsleep}:00`);
    const end = new Date(`2026-10-09T${woke}:00`);
    return sleepDurationMinutes(start, end);
  }, [fellAsleep, woke]);
  const healthDurationMinutes = healthSnapshot?.latestSleepHours !== undefined ? Math.round(healthSnapshot.latestSleepHours * 60) : null;
  const duration = healthDurationMinutes ?? manualDuration;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  return <AppShell title="作息" subtitle="睡够了，恢复才完整"><div className="stack">
    <Link to="/records" className="muted row back-link"><ChevronLeft size={17} />返回记录</Link>
    <section className="card">
      <div className="row">
        <div className="metric-value-wrap"><p className="eyebrow">{healthDurationMinutes !== null ? '手机健康数据' : '昨晚睡眠'}</p><div className="duration-value" aria-label={`${hours}小时${minutes}分`}><span className="duration-part"><span className="duration-number">{hours}</span><span className="duration-unit">小时</span></span><span className="duration-part"><span className="duration-number">{minutes}</span><span className="duration-unit">分</span></span></div><p className="card-copy">目标 8 小时 · {Math.round(duration / 480 * 100)}% 达标</p></div>
        <div className="list-leading metric-leading"><Moon size={26} /></div>
      </div>
    </section>
    <HealthDataCard onImported={setHealthSnapshot} />
    <section className="card stack">
      <div className="row"><h2 className="card-title">记录昨晚</h2><BedDouble size={20} className="muted" /></div>
      <label className="label">入睡时间<input className="input-field" type="time" value={fellAsleep} onChange={event => { setFellAsleep(event.target.value); setSaved(false); }} /></label>
      <label className="label">起床时间<input className="input-field" type="time" value={woke} onChange={event => { setWoke(event.target.value); setSaved(false); }} /></label>
      <button className="primary-btn row" type="button" onClick={() => setSaved(true)}><span>{saved ? '已保存' : '保存睡眠记录'}</span><Save size={18} /></button>
    </section>
    <section className="card"><h2 className="card-title">达标视图</h2><div className="row sleep-week" style={{ marginTop: 18, alignItems: 'flex-end' }}>{['一', '二', '三', '四', '五', '六', '日'].map((day, index) => <div key={day} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}><span className="muted" style={{ fontSize: '.7rem' }}>{day}</span><span className={`heat-dot level-${index < 5 ? 4 : 0}`} /></div>)}</div></section>
  </div></AppShell>;
}
