import { useLayoutEffect, useRef, useState, type TouchEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from '../../components/BottomNav';

const primaryRoutes = ['/', '/workouts', '/records', '/stats'] as const;

function navIndex(pathname: string) {
  if (pathname === '/') return 0;
  if (pathname.startsWith('/workouts')) return 1;
  if (pathname.startsWith('/records')) return 2;
  if (pathname.startsWith('/stats')) return 3;
  return 0;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const previousIndex = useRef(navIndex(location.pathname));
  const touchStart = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);
  const currentIndex = navIndex(location.pathname);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  useLayoutEffect(() => {
    const previous = previousIndex.current;
    if (previous !== currentIndex) {
      setDirection(currentIndex > previous ? 'next' : 'prev');
      previousIndex.current = currentIndex;
    }
  }, [currentIndex]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, target: event.target };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const target = start.target instanceof Element ? start.target : null;
    if (target?.closest('a, button, input, select, textarea, [role="button"], [data-no-swipe]')) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 64 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;

    const nextIndex = deltaX < 0 ? Math.min(primaryRoutes.length - 1, currentIndex + 1) : Math.max(0, currentIndex - 1);
    if (nextIndex !== currentIndex) navigate(primaryRoutes[nextIndex]);
  };

  return <div className="app-route-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    <div className={`page-transition slide-in-${direction}`} key={location.pathname}><Outlet /></div>
    <BottomNav />
  </div>;
}
