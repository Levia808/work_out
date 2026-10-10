export function Heatmap({ weeks = 14, activeDays = [1, 4, 8, 12, 16, 19, 24, 27, 32, 38, 45, 50, 58, 61, 68, 74] }: { weeks?: number; activeDays?: number[] }) {
  const months = ['7月', '8月', '9月'];
  const totalDays = weeks * 7;
  return <section className="card">
    <div className="month-grid">{months.map(month => <div className="month-label" key={month}>{month}</div>)}</div>
    <div className="heatmap-scroll">
      <div className="heatmap" aria-label="习惯完成热力图">{Array.from({ length: totalDays }, (_, index) => {
        const level = activeDays.includes(index) ? Math.min(4, 1 + (index % 4)) : 0;
        return <span key={index} className={`heat-dot level-${level}`} title={`${Math.floor(index / 7) + 1} 周第 ${index % 7 + 1} 天`} />;
      })}</div>
    </div>
    <div className="row" style={{ marginTop: 18 }}><span className="muted" style={{ fontSize: '.82rem' }}>近 {weeks} 周完成记录</span><div className="heatmap-legend"><span className="muted" style={{ fontSize: '.72rem' }}>少</span>{[0, 1, 2, 3, 4].map(level => <span className={`heat-dot level-${level}`} key={level} aria-hidden="true" />)}<span className="muted" style={{ fontSize: '.72rem' }}>多</span></div></div>
  </section>;
}
