import { BarChart3, CalendarDays, Grid2X2, MessageSquare } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/', label: '总览', Icon: Grid2X2 },
  { to: '/workouts', label: '训练', Icon: CalendarDays },
  { to: '/records', label: '记录', Icon: BarChart3 },
  { to: '/stats', label: '统计', Icon: MessageSquare }
];
export function BottomNav() { return <nav className="bottom-nav" aria-label="主导航">{nav.map(({ to, label, Icon }) => <NavLink key={to} to={to} className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`} aria-label={label}><Icon size={24} strokeWidth={2} /></NavLink>)}</nav>; }
