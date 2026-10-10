import { Outlet, useLocation } from 'react-router-dom';

export function AppLayout() {
  const location = useLocation();

  return <div className="page-transition" key={location.pathname}><Outlet /></div>;
}
