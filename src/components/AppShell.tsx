import { Plus, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: boolean;
  actionLink?: { to: string; label: string };
};

export function AppShell({ children, title, subtitle, actions = true, actionLink }: AppShellProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isSecondary = location.pathname !== '/' && (location.pathname.startsWith('/workouts/') || location.pathname.startsWith('/records/') || location.pathname === '/settings' || location.pathname.startsWith('/stats/'));

  return <div className={`fit-app ${isSecondary ? 'fit-app-secondary' : ''}`}>
    <main className={`fit-shell ${isSecondary ? 'fit-shell-secondary' : ''}`}>
      <header className="fit-header">
        <div>
          <h1 className="fit-title">{title}</h1>
          {subtitle ? <p className="fit-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="header-actions">
          {isHome ? <Link to="/settings" className="icon-btn" aria-label="设置"><Settings size={21} /></Link> : null}
          {actionLink ? <Link to={actionLink.to} className="icon-btn" aria-label={actionLink.label}><Plus size={23} /></Link> : null}
        </div> : null}
      </header>
      {children}
    </main>
  </div>;
}
