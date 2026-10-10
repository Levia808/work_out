import { Check, ChevronRight, Droplets, Download, Moon, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { CircularMetric, RingProgress } from '../components/CircularMetric';
import { Heatmap } from '../components/Heatmap';
import { ProgressBar } from '../components/ProgressBar';
import { loadHealthSnapshot } from '../lib/health';
import { dashboardData, habits, workoutPlans } from '../lib/demoData';

export function DashboardPage() {
  const completed = habits.filter(habit => habit.completed).length;
  const healthSnapshot = loadHealthSnapshot();
  const sleepHours = healthSnapshot?.latestSleepHours ?? dashboardData.sleepHours;
  return <AppShell title="总览" subtitle="周五，10 月 9 日" actionLink={{ to: "/records", label: "添加记录" }}>
    <div className="stack">
      <section className="card card-muted">
        <div className="row">
          <div>
            <p className="eyebrow">今日训练</p>
            <h2 style={{ margin: '7px 0 0', fontSize: '1.35rem' }}>胸部 + 三头</h2>
            <p className="card-copy">5 个动作 · 预计 42 分钟</p>
          </div>
          <RingProgress value={dashboardData.trainingProgress} label="训练进度" />
        </div>
        <div style={{ marginTop: 18 }}>
          <div className="row"><span className="muted" style={{ fontSize: '.8rem' }}>本周完成 3 / 5 次</span><span className="eyebrow">{dashboardData.trainingProgress}%</span></div>
          <ProgressBar value={dashboardData.trainingProgress} label="本周训练完成进度" style={{ marginTop: 8 }} />
        </div>
      </section>
      <div className="card-grid dashboard-metric-grid">
        <CircularMetric label="摄入热量" value={dashboardData.calories} unit="kcal" progress={(dashboardData.calories / dashboardData.calorieGoal) * 100} icon="calories" helper={`目标 ${dashboardData.calorieGoal.toLocaleString()} kcal`} />
        <CircularMetric label="睡眠" value={sleepHours} unit="小时" progress={(sleepHours / dashboardData.sleepGoal) * 100} icon="sleep" helper="昨晚记录" />
      </div>
      <section className="card">
        <div className="row">
          <div><p className="eyebrow">习惯完成度</p><h2 style={{ margin: '5px 0 0', fontSize: '1.5rem' }}>{completed} / {habits.length} 项</h2></div>
          <Link to="/records/habits" className="icon-btn" style={{ width: 40, height: 40 }} aria-label="查看习惯"><ChevronRight size={19} /></Link>
        </div>
        <ProgressBar value={dashboardData.habitProgress} label="习惯完成进度" style={{ marginTop: 17 }} />
        <p className="card-copy" style={{ marginTop: 10 }}>保持节奏，连续第 8 天</p>
      </section>
      <section>
        <div className="row" style={{ marginBottom: 12 }}><h2 className="card-title">快捷打卡</h2><Link to="/records" className="muted" style={{ fontSize: '.82rem' }}>全部记录</Link></div>
        <div className="action-grid">
          <Link className="action-btn" to="/records/habits" aria-label="记录习惯"><Check size={21} /><span>习惯</span></Link>
          <Link className="action-btn" to="/records/habits" aria-label="记录饮水习惯"><Droplets size={21} /><span>饮水</span></Link>
          <Link className="action-btn" to="/records/sleep" aria-label="记录睡眠"><Moon size={21} /><span>睡眠</span></Link>
          <Link className="action-btn" to="/records/body" aria-label="记录体重"><Plus size={21} /><span>体重</span></Link>
        </div>
      </section>
      <section className="stack">
        <div className="row"><h2 className="card-title">今日计划</h2><Link to="/workouts" className="muted" style={{ fontSize: '.82rem' }}>查看全部</Link></div>
        {workoutPlans.map(plan => <div className="card row" key={plan.id}>
          <div className="row-start"><RingProgress value={plan.progress / plan.exercises * 100} label={`${plan.title}进度`} size="small" /><div><h3 className="card-title">{plan.title}</h3><p className="card-copy">{plan.weekday} · {plan.exercises} 个动作</p></div></div>
          <Link to="/workouts" className="icon-btn" style={{ width: 40, height: 40 }} aria-label={`打开${plan.title}`}><ChevronRight size={19} /></Link>
        </div>)}
      </section>
      <Heatmap />
      <Link to="/install" className="card row" style={{ color: '#fff' }}><div><p className="eyebrow">FitTrack PWA</p><h2 className="card-title" style={{ marginTop: 5 }}>安装到主屏幕</h2><p className="card-copy">离线也能继续记录每日状态</p></div><Download size={22} className="muted" /></Link>
    </div>
  </AppShell>;
}
