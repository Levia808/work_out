import { BarChart3, CalendarDays, Grid2X2, MessageSquare } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

const nav = [
  { to: '/', label: '总览', Icon: Grid2X2 },
  { to: '/workouts', label: '训练', Icon: CalendarDays },
  { to: '/records', label: '记录', Icon: BarChart3 },
  { to: '/stats', label: '统计', Icon: MessageSquare }
];

function isNavActive(pathname: string, to: string) {
  // The dock represents top-level destinations only. Detail screens keep the
  // dock available without falsely claiming a parent tab is active.
  return pathname === to;
}

export function BottomNav() {
  const location = useLocation();
  const activeIndex = nav.findIndex(({ to }) => isNavActive(location.pathname, to));
  return <nav className="bottom-nav" aria-label="主导航">
    <div className="bottom-nav-track">
      {activeIndex >= 0 ? <span className="nav-indicator" style={{ transform: `translateX(${activeIndex * 100}%)` }} aria-hidden="true" /> : null}
      {nav.map(({ to, label, Icon }) => <NavLink key={to} to={to} className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive && isNavActive(location.pathname, to) ? 'active' : ''}`} aria-label={label} end><Icon size={24} strokeWidth={2} /></NavLink>)}
    </div>
  </nav>;
}
