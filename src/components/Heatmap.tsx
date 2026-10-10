export function Heatmap({ weeks = 14, activeDays = [1, 4, 8, 12, 16, 19, 24, 27, 32, 38, 45, 50, 58, 61, 68, 74] }: { weeks?: number; activeDays?: number[] }) {
  const months = ['7月', '8月', '9月'];
  return <div className="card">
    <div className="month-grid">{months.map(month => <div className="month-label" key={month}>{month}</div>)}</div>
    <div className="heatmap" aria-label="习惯完成热力图">{Array.from({ length: weeks * 7 }, (_, index) => <span key={index} className={`heat-dot ${activeDays.includes(index) ? 'active' : ''}`} />)}</div>
    <div className="row" style={{ marginTop: 18 }}><span className="muted" style={{ fontSize: '.82rem' }}>近 14 周完成记录</span><span className="eyebrow">{activeDays.length} 天</span></div>
  </div>;
}
