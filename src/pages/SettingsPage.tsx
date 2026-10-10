import { ChevronRight, KeyRound, LogOut, ShieldCheck, Target, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../app/AuthProvider';
import { getSettings, saveSettings } from '../lib/localData';
import type { AiProvider, UserSettings } from '../lib/types';

type Panel = 'goals' | 'ai' | 'privacy' | null;

function displayName(email: string | undefined, metadata: Record<string, unknown> | undefined) {
  const name = metadata?.name ?? metadata?.full_name;
  if (typeof name === 'string' && name.trim()) return name;
  if (email?.includes('@')) return email.split('@')[0];
  return 'FitTrack 用户';
}

export function SettingsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings>(() => getSettings());
  const [panel, setPanel] = useState<Panel>(null);
  const [calorieGoal, setCalorieGoal] = useState(() => String(getSettings().calorieGoal ?? ''));
  const [sleepGoal, setSleepGoal] = useState(() => getSettings().sleepGoalMinutes ? String((getSettings().sleepGoalMinutes ?? 0) / 60) : '');
  const [targetWeight, setTargetWeight] = useState(() => String(getSettings().targetWeightKg ?? ''));
  const [aiProvider, setAiProvider] = useState<AiProvider>(() => { const initial = getSettings(); return initial.aiProvider ?? (initial.qwenApiKey ? 'qwen' : 'deepseek'); });
  const [apiKey, setApiKey] = useState('');
  const [clearKey, setClearKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = getSettings();
      setSettings(next);
      setCalorieGoal(next.calorieGoal === undefined ? '' : String(next.calorieGoal));
      setSleepGoal(next.sleepGoalMinutes === undefined ? '' : String(next.sleepGoalMinutes / 60));
      setTargetWeight(next.targetWeightKg === undefined ? '' : String(next.targetWeightKg));
      setAiProvider(next.aiProvider ?? (next.qwenApiKey ? 'qwen' : 'deepseek'));
      setApiKey('');
      setClearKey(false);
    };
    window.addEventListener('fittrack:data', sync);
    return () => window.removeEventListener('fittrack:data', sync);
  }, []);

  const user = auth.session?.user;
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const email = user?.email;
  const name = displayName(email, metadata);
  const togglePanel = (nextPanel: Exclude<Panel, null>) => {
    setPanel(current => current === nextPanel ? null : nextPanel);
    setSaved(false);
    setError('');
  };

  const saveGoals = () => {
    const calorie = calorieGoal.trim() ? Number(calorieGoal) : undefined;
    const sleep = sleepGoal.trim() ? Number(sleepGoal) : undefined;
    const target = targetWeight.trim() ? Number(targetWeight) : undefined;
    if ((calorie !== undefined && (!Number.isFinite(calorie) || calorie <= 0)) || (sleep !== undefined && (!Number.isFinite(sleep) || sleep <= 0)) || (target !== undefined && (!Number.isFinite(target) || target <= 0))) {
      setError('请填写大于 0 的有效数字，或留空表示尚未设置。');
      return;
    }
    // Goal edits only touch goal fields; they cannot clear or replace an AI key.
    saveSettings({
      calorieGoal: calorie,
      sleepGoalMinutes: sleep === undefined ? undefined : Math.round(sleep * 60),
      targetWeightKg: target,
    });
    setSettings(getSettings());
    setSaved(true);
    setError('');
  };

  const saveAiSettings = () => {
    const selectedKey = clearKey ? undefined : apiKey.trim() || (aiProvider === 'qwen' ? settings.qwenApiKey : settings.deepseekApiKey);
    // Persist only the selected provider's key. Switching providers therefore
    // cannot accidentally leave two active credentials on this device.
    saveSettings({
      aiProvider,
      qwenApiKey: aiProvider === 'qwen' ? selectedKey : undefined,
      deepseekApiKey: aiProvider === 'deepseek' ? selectedKey : undefined,
    });
    setSettings(getSettings());
    setApiKey('');
    setClearKey(false);
    setSaved(true);
    setError('');
  };

  const keyStatus = useMemo(() => { const label = aiProvider === 'qwen' ? '千问' : 'DeepSeek'; const hasKey = aiProvider === 'qwen' ? Boolean(settings.qwenApiKey) : Boolean(settings.deepseekApiKey); return `${label}${hasKey ? '已设置' : '未设置'} · 当前仅使用此服务`; }, [aiProvider, settings]);

  const signOut = async () => {
    setSigningOut(true);
    const result = await auth.signOut();
    if (!result.error) navigate('/login', { replace: true });
    setSigningOut(false);
  };

  return <AppShell title="设置" actions={false}>
    <div className="stack">
      <section className="card row">
        <div className="row-start"><span className="list-leading"><UserRound size={21} /></span><div><h2 className="card-title">{name}</h2><p className="card-copy">{email ?? '本地模式 · 数据保存在当前设备'}</p></div></div>
      </section>

      <section className="card">
        <button className="list-row settings-action" onClick={() => togglePanel('goals')} aria-expanded={panel === 'goals'}>
          <Target size={20} className="muted" /><span className="list-content"><span className="list-title">每日目标</span><span className="list-meta">{settings.calorieGoal ? `${settings.calorieGoal.toLocaleString()} kcal` : '热量尚未设置'} · {settings.sleepGoalMinutes ? `${settings.sleepGoalMinutes / 60} 小时睡眠` : '睡眠尚未设置'}</span></span><ChevronRight size={18} className={`muted settings-chevron ${panel === 'goals' ? 'is-open' : ''}`} />
        </button>
        {panel === 'goals' ? <div className="settings-panel stack">
          <label className="label">每日热量目标（kcal）<input className="input-field" inputMode="numeric" value={calorieGoal} onChange={event => { setCalorieGoal(event.target.value); setSaved(false); }} placeholder="可留空" /></label>
          <label className="label">每日睡眠目标（小时）<input className="input-field" inputMode="decimal" value={sleepGoal} onChange={event => { setSleepGoal(event.target.value); setSaved(false); }} placeholder="可留空" /></label>
          <label className="label">目标体重（kg）<input className="input-field" inputMode="decimal" value={targetWeight} onChange={event => { setTargetWeight(event.target.value); setSaved(false); }} placeholder="可留空" /></label>
          <button className="primary-btn row" type="button" onClick={saveGoals}><span>{saved ? '已保存' : '保存目标'}</span><ChevronRight size={18} /></button>
        </div> : null}

        <button className="list-row settings-action" onClick={() => togglePanel('ai')} aria-expanded={panel === 'ai'}>
          <KeyRound size={20} className="muted" /><span className="list-content"><span className="list-title">AI 服务密钥</span><span className="list-meta">{keyStatus}</span></span><ChevronRight size={18} className={`muted settings-chevron ${panel === 'ai' ? 'is-open' : ''}`} />
        </button>
        {panel === 'ai' ? <div className="settings-panel stack">
          <p className="card-copy">请选择一个 AI 服务即可，不需要同时填写两家的 Key。密钥只保存在当前设备的 localStorage，不会写入 FitTrack 数据库。</p>
          <label className="label">AI 服务<select className="input-field" value={aiProvider} onChange={event => { setAiProvider(event.target.value as AiProvider); setApiKey(''); setClearKey(false); setSaved(false); }}><option value="qwen">千问（适合图片识别）</option><option value="deepseek">DeepSeek（文本与图片识别）</option></select></label>
          <label className="label">{aiProvider === 'qwen' ? '千问' : 'DeepSeek'} API Key<input className="input-field" type="password" autoComplete="off" value={apiKey} onChange={event => { setApiKey(event.target.value); setClearKey(false); setSaved(false); }} placeholder={(aiProvider === 'qwen' ? settings.qwenApiKey : settings.deepseekApiKey) ? '已设置，输入新 Key 可替换' : `请输入${aiProvider === 'qwen' ? '千问' : 'DeepSeek'} API Key`} /></label>
          {(aiProvider === 'qwen' ? settings.qwenApiKey : settings.deepseekApiKey) ? <label className="check-row"><input type="checkbox" checked={clearKey} onChange={event => setClearKey(event.target.checked)} />清除当前已保存的 Key</label> : null}
          <p className="health-hint">当前服务：{aiProvider === 'qwen' ? '千问' : 'DeepSeek'}。切换并保存后，FitTrack 只会使用当前选择的服务。</p>
          <button className="primary-btn row" type="button" onClick={saveAiSettings}><span>{saved ? '已保存' : '保存 AI 设置'}</span><ChevronRight size={18} /></button>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div> : null}

        <button className="list-row settings-action" onClick={() => togglePanel('privacy')} aria-expanded={panel === 'privacy'}>
          <ShieldCheck size={20} className="muted" /><span className="list-content"><span className="list-title">数据与隐私</span><span className="list-meta">本地模式与 Supabase 登录状态</span></span><ChevronRight size={18} className={`muted settings-chevron ${panel === 'privacy' ? 'is-open' : ''}`} />
        </button>
        {panel === 'privacy' ? <div className="settings-panel privacy-copy"><p className="card-copy">{auth.configured ? '当前已配置 Supabase，云端数据应由用户账号与 RLS 隔离。' : '当前未配置 Supabase，记录会保存在当前设备的本地缓存中。更换浏览器或清理站点数据后，本地记录可能无法恢复。'}</p><button className="secondary-btn row" type="button" onClick={() => setPanel(null)}><span>收起说明</span><X size={18} /></button></div> : null}
        <Link to="/install" className="list-row" style={{ color: '#fff' }}><span className="list-content"><span className="list-title">安装 FitTrack</span><span className="list-meta">添加到主屏幕，离线继续记录</span></span><ChevronRight size={18} className="muted" /></Link>
      </section>

      {error && panel !== 'ai' ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="secondary-btn row" type="button" style={{ color: '#fff' }} onClick={() => void signOut()} disabled={signingOut}><span>{signingOut ? '正在退出…' : '退出登录'}</span><LogOut size={18} /></button>
      <p className="card-copy" style={{ textAlign: 'center', marginTop: 10 }}>FitTrack v0.1 · 深色模式</p>
    </div>
  </AppShell>;
}
