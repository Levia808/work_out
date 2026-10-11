import { ArrowDown, ArrowLeft, ArrowRight, CalendarDays, ChevronRight, Sparkles } from 'lucide-react';
import { format, parse, subMonths, addMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { getAiJobs, type AiJob, type AiJobStatus } from '../lib/aiJobs';

const modeLabels: Record<string, string> = { 'analysis:1': '今日分析', 'analysis:7': '本周分析', 'analysis:28': '持续训练' };
const statusLabels: Record<AiJobStatus, string> = { reading: '读取中', uploading: '上传中', submitting: '已提交', generating: '生成中', succeeded: '已生成', failed: '失败', interrupted: '已中断' };

function providerLabel(job: AiJob) { return job.source === 'preview' ? '本地演示' : job.provider === 'qwen' ? '千问' : 'DeepSeek'; }
function monthKey(date: string) { return format(new Date(date), 'yyyy-MM'); }
function monthTitle(key: string) { return format(parse(`${key}-01`, 'yyyy-MM-dd', new Date()), 'yyyy年M月', { locale: zhCN }); }

export function StatsHistoryPage() {
  const jobs = useMemo(() => getAiJobs().filter(job => job.kind === 'training-analysis'), []);
  const months = useMemo(() => Array.from(new Set(jobs.map(job => monthKey(job.createdAt)))).sort((a, b) => b.localeCompare(a)), [jobs]);
  const [selectedMonth, setSelectedMonth] = useState(() => months[0] ?? format(new Date(), 'yyyy-MM'));
  const selectedIndex = months.indexOf(selectedMonth);
  const filtered = jobs.filter(job => monthKey(job.createdAt) === selectedMonth);
  const monthDate = parse(`${selectedMonth}-01`, 'yyyy-MM-dd', new Date());
  const quickMonths = months.slice(0, 6);
  const previousMonth = format(subMonths(monthDate, 1), 'yyyy-MM');
  const nextMonth = format(addMonths(monthDate, 1), 'yyyy-MM');

  const jumpMonth = (direction: -1 | 1) => {
    const known = direction < 0 ? months[selectedIndex + 1] : months[selectedIndex - 1];
    setSelectedMonth(known ?? (direction < 0 ? previousMonth : nextMonth));
  };

  return <AppShell title="报告记录" actions={false}>
    <div className="stack stats-secondary-page">
      <Link to="/stats" className="secondary-back-link"><ArrowLeft size={17} />返回统计</Link>
      <section className="card history-month-picker">
        <div className="row history-month-heading"><div><span className="report-metric-icon"><CalendarDays size={17} /></span><strong>{monthTitle(selectedMonth)}</strong></div><div className="history-month-arrows"><button className="icon-btn" type="button" aria-label="更早一个月" onClick={() => jumpMonth(-1)}><ArrowLeft size={17} /></button><button className="icon-btn" type="button" aria-label="更新一个月" onClick={() => jumpMonth(1)}><ArrowRight size={17} /></button></div></div>
        <label className="history-select-label" htmlFor="report-month-select">选择月份</label>
        <div className="history-select-wrap"><select id="report-month-select" value={selectedMonth} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedMonth(event.target.value)}><option value={format(new Date(), 'yyyy-MM')}>{monthTitle(format(new Date(), 'yyyy-MM'))}</option>{months.filter(month => month !== format(new Date(), 'yyyy-MM')).map(month => <option value={month} key={month}>{monthTitle(month)}</option>)}</select><ArrowDown size={15} aria-hidden="true" /></div>
        {quickMonths.length ? <div className="history-quick-months" aria-label="快速跳转月份">{quickMonths.map(month => <button key={month} type="button" className={month === selectedMonth ? 'is-selected' : ''} onClick={() => setSelectedMonth(month)}>{monthTitle(month).replace('年', ' / ').replace('月', '')}</button>)}</div> : null}
      </section>

      <section className="card stack history-results">
        <div className="row history-results-heading"><h2 className="card-title">{monthTitle(selectedMonth)}</h2><span className="history-count">{filtered.length}</span></div>
        {filtered.length ? <div className="ai-history-list">{filtered.map(job => {
          const isReadable = job.status === 'succeeded' && Boolean(job.result);
          return <Link className="ai-history-item" to={isReadable ? `/stats/report/${job.id}` : '#'} key={job.id} aria-disabled={!isReadable} onClick={(event: MouseEvent<HTMLAnchorElement>) => { if (!isReadable) event.preventDefault(); }}>
            <span className={`ai-history-dot is-${job.status}`} /><span className="ai-history-copy"><strong>{modeLabels[job.inputSummary] ?? `${job.inputSummary.split(':')[1] ?? ''} 天分析`}</strong><span>{new Date(job.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {providerLabel(job)}</span></span><span className="ai-history-status">{statusLabels[job.status]}</span><ChevronRight size={16} className="muted" />
          </Link>;
        })}</div> : <div className="report-empty-history"><Sparkles size={18} /><span>这个月份没有报告</span></div>}
      </section>
    </div>
  </AppShell>;
}
