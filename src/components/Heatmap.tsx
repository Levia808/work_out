import { format, subDays } from 'date-fns';

export type HeatmapPoint = { date: string; level: number };
export function Heatmap({ weeks = 14, points = [] }: { weeks?: number; points?: HeatmapPoint[] }) {
  const totalDays = weeks * 7;
  const source = new Map(points.map(point => [point.date, Math.max(0, Math.min(4, point.level))]));
  const dates = Array.from({ length: totalDays }, (_, index) => subDays(new Date(), totalDays - index - 1));
  const months = Array.from(new Set(dates.map(date => format(date, 'M月')))).slice(-3);
  return <section className="card">
    <div className="month-grid">{months.map(month => <div className="month-label" key={month}>{month}</div>)}</div>
    <div className="heatmap-scroll" data-no-swipe data-scrollbar>
      <div className="heatmap" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }} aria-label="习惯完成热力图">{dates.map((date, index) => {
        const key = format(date, 'yyyy-MM-dd'); const level = source.get(key) ?? 0;
        return <span key={key} className={`heat-dot level-${level}`} title={`${format(date, 'M月d日')}：${level ? `${level} 项完成` : '无完成记录'}`} aria-label={`${format(date, 'M月d日')} ${level ? `${level} 项完成` : '无完成记录'}`} />;
      })}</div>
    </div>
    <div className="row" style={{ marginTop: 18 }}><span className="muted" style={{ fontSize: '.82rem' }}>近 {weeks} 周完成记录</span><div className="heatmap-legend"><span className="muted" style={{ fontSize: '.72rem' }}>少</span>{[0, 1, 2, 3, 4].map(level => <span className={`heat-dot level-${level}`} key={level} aria-hidden="true" />)}<span className="muted" style={{ fontSize: '.72rem' }}>多</span></div></div>
  </section>;
}
