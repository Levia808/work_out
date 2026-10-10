import { useRef, useState } from 'react';
import { HeartPulse, LoaderCircle, Upload } from 'lucide-react';
import { healthPlatformLabel, healthSourceLabel, importHealthFile, loadHealthSnapshot, type HealthSnapshot } from '../lib/health';

type HealthDataCardProps = {
  onImported?: (snapshot: HealthSnapshot) => void;
};

function formatImportedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function HealthDataCard({ onImported }: HealthDataCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(() => loadHealthSnapshot());
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const handleImport = async (file: File) => {
    setBusy(true);
    setStatus('正在读取健康数据…');
    try {
      const next = await importHealthFile(file);
      setSnapshot(next);
      onImported?.(next);
      setStatus(`导入成功，已读取 ${next.recordCount} 条记录。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导入失败，请重试。');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return <section className="card health-data-card">
    <div className="row-start">
      <span className="list-leading" aria-hidden="true"><HeartPulse size={20} /></span>
      <div className="list-content">
        <h2 className="card-title">接入手机健康数据</h2>
        <p className="card-copy">iOS 导入 Apple Health XML，安卓导入 Health Connect CSV / JSON。</p>
      </div>
    </div>
    <input ref={inputRef} className="visually-hidden" type="file" accept=".xml,.csv,.json,application/xml,text/csv,application/json" aria-hidden="true" tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; if (file) void handleImport(file); }} />
    <button className="icon-btn health-import-btn" type="button" disabled={busy} onClick={() => inputRef.current?.click()} aria-label={busy ? '导入健康数据中' : `导入${healthPlatformLabel()}`} title={busy ? '导入中' : `导入${healthPlatformLabel()}`}>{busy ? <LoaderCircle className="spin" size={19} /> : <Upload size={19} />}</button>
    {snapshot ? <div className="health-sync-summary">
      <div className="row"><span className="muted">最近同步</span><span className="eyebrow">{healthSourceLabel(snapshot.source)} · {formatImportedAt(snapshot.importedAt)}</span></div>
      <div className="health-sync-stats">
        {snapshot.latestSleepHours !== undefined ? <span><strong>{snapshot.latestSleepHours.toFixed(1)}</strong><small>小时睡眠</small></span> : null}
        {snapshot.latestWeightKg !== undefined ? <span><strong>{snapshot.latestWeightKg.toFixed(1)}</strong><small>kg 体重</small></span> : null}
        {snapshot.latestSteps !== undefined ? <span><strong>{Math.round(snapshot.latestSteps).toLocaleString('zh-CN')}</strong><small>步数</small></span> : null}
      </div>
    </div> : <p className="health-hint">浏览器 PWA 不能直接读取系统 HealthKit / Health Connect，首次使用请从系统导出文件后导入。</p>}
    {status ? <p className="health-status" role="status">{status}</p> : null}
  </section>;
}
