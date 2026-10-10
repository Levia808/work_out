import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';

export function ProtectedLayout() {
  const { configured, loading, session } = useAuth();
  const location = useLocation();
  if (!configured) return <Outlet />;
  if (loading) return <div className="install-page"><main className="card install-card"><p className="eyebrow">FITTRACK</p><h1 className="fit-title" style={{ fontSize: '2.4rem', marginTop: 8 }}>加载中…</h1></main></div>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
