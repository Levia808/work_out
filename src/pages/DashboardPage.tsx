import { Check, ChevronRight, Download, Moon, Scale, Utensils } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { CircularMetric, RingProgress } from '../components/CircularMetric';
import { Heatmap } from '../components/Heatmap';
import { ProgressBar } from '../components/ProgressBar';
import { getDashboardSnapshot, getHabits, getMeals, getSettings, habitHeatmap, habitStreak } from '../lib/localData';
import { loadHealthSnapshot } from '../lib/health';

export function DashboardPage() {
  const [snapshot, setSnapshot] = useState(getDashboardSnapshot);
  const [healthSleepHours, setHealthSleepHours] = useState<number | undefined>(() => loadHealthSnapshot()?.latestSleepHours);

  useEffect(() => {
    const sync = () => {
      setSnapshot(getDashboardSnapshot());
      setHealthSleepHours(loadHealthSnapshot()?.latestSleepHours);
    };
    window.addEventListener('fittrack:data', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('fittrack:data', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const habits = useMemo(() => getHabits(), [snapshot]);
  const meals = useMemo(() => getMeals(), [snapshot]);
  const settings = useMemo(() => getSettings(), [snapshot]);
  const sleepHours = snapshot.sleepHours ?? healthSleepHours;
  const hasSleep = sleepHours !== undefined;
  const hasMeals = meals.length > 0;
  const calorieProgress = snapshot.calorieGoal && hasMeals ? (snapshot.calories / snapshot.calorieGoal) * 100 : 0;
  const sleepProgress = settings.sleepGoalMinutes && hasSleep ? (sleepHours / (settings.sleepGoalMinutes / 60)) * 100 : 0;
  const habitProgress = habits.length ? snapshot.habitProgress : 0;
  const firstHabit = habits[0];

  return <AppShell title="总览" actionLink={{ to: '/records', label: '添加记录' }}>
    <div className="stack dashboard-page">
      <section className="card card-muted">
        {snapshot.todayPlan ? <>
          <div className="row">
            <div className="metric-value-wrap">
              <p className="eyebrow">今日训练</p>
              <h2 style={{ margin: '7px 0 0', fontSize: '1.35rem' }}>{snapshot.todayPlan.title}</h2>
              <p className="card-copy">{snapshot.todayPlan.items.length ? `${snapshot.todayPlan.items.length} 个动作` : '尚未添加动作'}</p>
            </div>
            <RingProgress value={snapshot.trainingProgress} label="训练进度" />
          </div>
          <div style={{ marginTop: 18 }}>
            <div className="row"><span className="muted" style={{ fontSize: '.8rem' }}>{snapshot.trainingProgress ? '已完成动作' : '尚未开始训练'}</span><span className="eyebrow">{snapshot.trainingProgress}%</span></div>
            <ProgressBar value={snapshot.trainingProgress} label="今日训练完成进度" style={{ marginTop: 8 }} />
          </div>
          <Link to={`/workouts/${snapshot.todayPlan.id}`} className="secondary-btn row" style={{ marginTop: 16, color: '#fff' }}><span>打开今日计划</span><ChevronRight size={18} /></Link>
        </> : <div className="empty-state compact-empty"><p className="eyebrow">今日训练</p><h2 className="card-title">今天没有已安排的训练</h2><p className="card-copy">在训练页创建计划后，这里会显示今天的动作与进度。</p><Link to="/workouts" className="secondary-btn row" style={{ marginTop: 14, color: '#fff' }}><span>管理训练计划</span><ChevronRight size={18} /></Link></div>}
      </section>

      <div className="card-grid dashboard-metric-grid">
        <CircularMetric label="摄入热量" value={hasMeals ? snapshot.calories : undefined} unit="kcal" progress={calorieProgress} icon="calories" helper={snapshot.calorieGoal ? `目标 ${snapshot.calorieGoal.toLocaleString()} kcal` : '尚未设置每日目标'} />
        <CircularMetric label="睡眠" value={hasSleep ? sleepHours : undefined} decimals={1} unit="小时" progress={sleepProgress} icon="sleep" helper={snapshot.sleepGoal ? `目标 ${snapshot.sleepGoal} 小时` : '尚未设置睡眠目标'} />
      </div>

      <section className="card">
        <div className="row">
          <div><p className="eyebrow">习惯完成度</p><h2 style={{ margin: '5px 0 0', fontSize: '1.5rem' }}>{habits.length ? `${snapshot.habitCount} / ${snapshot.habitTotal} 项` : '尚未添加习惯'}</h2></div>
          <Link to="/records/habits" className="icon-btn" style={{ width: 40, height: 40 }} aria-label="查看习惯"><ChevronRight size={19} /></Link>
        </div>
        <ProgressBar value={habitProgress} label="习惯完成进度" style={{ marginTop: 17 }} />
        <p className="card-copy" style={{ marginTop: 10 }}>{firstHabit ? `${firstHabit.name} 连续 ${habitStreak(firstHabit.id)} 天` : '添加习惯后，这里会显示真实完成记录。'}</p>
      </section>

      <section>
        <div className="row" style={{ marginBottom: 12 }}><h2 className="card-title">快捷记录</h2><Link to="/records" className="muted" style={{ fontSize: '.82rem' }}>全部记录</Link></div>
        <div className="action-grid">
          <Link className="action-btn icon-only-action" to="/records/habits" aria-label="记录习惯" title="习惯"><Check size={23} /></Link>
          <Link className="action-btn icon-only-action" to="/records/nutrition" aria-label="记录饮食" title="饮食"><Utensils size={23} /></Link>
          <Link className="action-btn icon-only-action" to="/records/sleep" aria-label="记录睡眠" title="睡眠"><Moon size={23} /></Link>
          <Link className="action-btn icon-only-action" to="/records/body" aria-label="记录体重" title="体重"><Scale size={23} /></Link>
        </div>
      </section>

      <section className="stack">
        <div className="row"><h2 className="card-title">今日计划</h2><Link to="/workouts" className="muted" style={{ fontSize: '.82rem' }}>查看全部</Link></div>
        {snapshot.todayPlan ? <div className="card row">
          <div className="row-start"><RingProgress value={snapshot.trainingProgress} label={`${snapshot.todayPlan.title}进度`} size="small" /><div className="list-content"><h3 className="card-title">{snapshot.todayPlan.title}</h3><p className="card-copy">{snapshot.todayPlan.items.length ? `${snapshot.todayPlan.items.length} 个动作` : '请添加动作'}</p></div></div>
          <Link to={`/workouts/${snapshot.todayPlan.id}`} className="icon-btn" style={{ width: 40, height: 40 }} aria-label={`打开${snapshot.todayPlan.title}`}><ChevronRight size={19} /></Link>
        </div> : <div className="card empty-state compact-empty"><p className="card-copy">尚未安排今日计划。</p></div>}
      </section>

      <Heatmap points={habitHeatmap()} />
      <Link to="/install" className="card row" style={{ color: '#fff' }}><div><p className="eyebrow">FitTrack PWA</p><h2 className="card-title" style={{ marginTop: 5 }}>安装到主屏幕</h2><p className="card-copy">离线也能继续记录每日状态</p></div><Download size={22} className="muted" /></Link>
    </div>
  </AppShell>;
}
