import { ArrowLeft, CalendarDays } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { AiDetailedReport } from '../components/AiDetailedReport';
import { AppShell } from '../components/AppShell';
import { normalizeTrainingAnalysis, type TrainingAnalysis } from '../lib/ai';
import { getAiJobs, type AiJob } from '../lib/aiJobs';
import { isPreviewMode } from '../lib/localData';

function providerLabel(job: AiJob) {
  return job.source === 'preview' ? '本地演示' : job.provider === 'qwen' ? '千问' : 'DeepSeek';
}

export function StatsReportPage() {
  const { jobId } = useParams();
  const previewMode = isPreviewMode();
  const job = getAiJobs().find(item => item.id === jobId && item.kind === 'training-analysis' && (previewMode || item.source !== 'preview')) as AiJob<TrainingAnalysis> | undefined;
  const report = job?.status === 'succeeded' && job.result ? normalizeTrainingAnalysis(job.result) : undefined;

  return <AppShell title="详细分析" actions={false}>
    <div className="stack stats-secondary-page">
      <Link to={`/stats${previewMode ? '?demo=1' : ''}`} className="secondary-back-link"><ArrowLeft size={17} />返回统计</Link>
      {report ? <>
        <div className="report-meta-strip"><CalendarDays size={15} /><span>{new Date(job!.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><span>{job!.inputSummary === 'analysis:1' ? '今日' : job!.inputSummary === 'analysis:7' ? '本周' : job!.inputSummary === 'analysis:28' ? '持续训练' : '训练分析'}</span><span>{providerLabel(job!)}</span></div>
        <AiDetailedReport compact={report.compact} detail={report.detailed} provider={providerLabel(job!)} />
      </> : <section className="card detail-empty-state"><h2>{job ? '此记录没有可展示的报告' : '未找到这份报告'}</h2><p>{job?.error || '该报告可能已被删除，或生成时未能保存完整结果。'}</p><Link className="secondary-action-link" to={`/stats/history${previewMode ? '?demo=1' : ''}`}>查看报告记录</Link></section>}
    </div>
  </AppShell>;
}
