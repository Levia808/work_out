import { Bell, ChevronRight, LogOut, ShieldCheck, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../app/AuthProvider';

type Panel = 'goals' | 'privacy' | null;

export function SettingsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>(null);
  const [calorieGoal, setCalorieGoal] = useState('2200');
  const [sleepGoal, setSleepGoal] = useState('8');
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const togglePanel = (nextPanel: Exclude<Panel, null>) => {
    setPanel(current => current === nextPanel ? null : nextPanel);
    setSaved(false);
  };

  const saveGoals = () => {
    if (Number(calorieGoal) <= 0 || Number(sleepGoal) <= 0) return;
    setSaved(true);
  };

  const signOut = async () => {
    setSigningOut(true);
    const result = await auth.signOut();
    if (!result.error) navigate('/login', { replace: true });
    setSigningOut(false);
  };

  return <AppShell title="设置" subtitle="让 FitTrack 更贴合你的节奏" actions={false}>
    <div className="stack">
      <section className="card row">
        <div className="row-start"><span className="list-leading"><UserRound size={21} /></span><div><h2 className="card-title">Levia</h2><p className="card-copy">levia@example.com</p></div></div>
      </section>
      <section className="card">
        <button className="list-row settings-action" onClick={() => togglePanel('goals')} aria-expanded={panel === 'goals'}>
          <Bell size={20} className="muted" /><span className="list-content"><span className="list-title">每日目标</span><span className="list-meta">{Number(calorieGoal).toLocaleString()} kcal · {sleepGoal} 小时睡眠</span></span><ChevronRight size={18} className={`muted settings-chevron ${panel === 'goals' ? 'is-open' : ''}`} />
        </button>
        {panel === 'goals' ? <div className="settings-panel stack">
          <label className="label">每日热量目标（kcal）<input className="input-field" inputMode="numeric" value={calorieGoal} onChange={event => { setCalorieGoal(event.target.value); setSaved(false); }} /></label>
          <label className="label">每日睡眠目标（小时）<input className="input-field" inputMode="decimal" value={sleepGoal} onChange={event => { setSleepGoal(event.target.value); setSaved(false); }} /></label>
          <button className="primary-btn row" onClick={saveGoals}><span>{saved ? '已保存' : '保存目标'}</span><ChevronRight size={18} /></button>
        </div> : null}
        <button className="list-row settings-action" onClick={() => togglePanel('privacy')} aria-expanded={panel === 'privacy'}>
          <ShieldCheck size={20} className="muted" /><span className="list-content"><span className="list-title">数据与隐私</span><span className="list-meta">数据仅属于你</span></span><ChevronRight size={18} className={`muted settings-chevron ${panel === 'privacy' ? 'is-open' : ''}`} />
        </button>
        {panel === 'privacy' ? <div className="settings-panel privacy-copy"><p className="card-copy">演示模式的数据保存在当前设备的本地缓存中。连接 Supabase 后，数据会按用户隔离并通过 RLS 保护。</p><button className="secondary-btn row" onClick={() => setPanel(null)}><span>收起说明</span><X size={18} /></button></div> : null}
        <Link to="/install" className="list-row" style={{ color: '#fff' }}><span className="list-content"><span className="list-title">安装 FitTrack</span><span className="list-meta">添加到主屏幕，离线继续记录</span></span><ChevronRight size={18} className="muted" /></Link>
      </section>
      <button className="secondary-btn row" style={{ color: '#fff' }} onClick={signOut} disabled={signingOut}><span>{signingOut ? '正在退出…' : '退出登录'}</span><LogOut size={18} /></button>
      <p className="card-copy" style={{ textAlign: 'center', marginTop: 10 }}>FitTrack v0.1 · 深色模式</p>
    </div>
  </AppShell>;
}
