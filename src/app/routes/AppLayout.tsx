import { useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from '../../components/BottomNav';

const primaryRoutes = ['/', '/workouts', '/records', '/stats'] as const;

function navIndex(pathname: string) {
  if (pathname === '/') return 0;
  if (pathname === '/workouts') return 1;
  if (pathname === '/records') return 2;
  if (pathname === '/stats') return 3;
  return -1;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const previousIndex = useRef(navIndex(location.pathname));
  const touchStart = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);
  const currentIndex = navIndex(location.pathname);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  useEffect(() => {
    const viewport = document.documentElement;
    const body = document.body;
    let viewportTimer: number | undefined;
    const containerTimers = new Map<HTMLElement, number>();
    const revealViewportScrollbar = () => {
      viewport.classList.add('is-scrolling');
      body.classList.add('is-scrolling');
      if (viewportTimer !== undefined) window.clearTimeout(viewportTimer);
      viewportTimer = window.setTimeout(() => {
        viewport.classList.remove('is-scrolling');
        body.classList.remove('is-scrolling');
      }, 360);
    };
    const revealContainerScrollbar = (event: Event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) return;
      target.classList.add('is-scrolling');
      const timer = containerTimers.get(target);
      if (timer !== undefined) window.clearTimeout(timer);
      containerTimers.set(target, window.setTimeout(() => {
        target.classList.remove('is-scrolling');
        containerTimers.delete(target);
      }, 360));
    };
    window.addEventListener('scroll', revealViewportScrollbar, { passive: true });
    const containers = Array.from(document.querySelectorAll<HTMLElement>('[data-scrollbar]'));
    containers.forEach(container => container.addEventListener('scroll', revealContainerScrollbar, { passive: true }));
    return () => {
      window.removeEventListener('scroll', revealViewportScrollbar);
      if (viewportTimer !== undefined) window.clearTimeout(viewportTimer);
      viewport.classList.remove('is-scrolling');
      body.classList.remove('is-scrolling');
      containers.forEach(container => {
        container.removeEventListener('scroll', revealContainerScrollbar);
        const timer = containerTimers.get(container);
        if (timer !== undefined) window.clearTimeout(timer);
        container.classList.remove('is-scrolling');
      });
    };
  }, [location.pathname]);

  useLayoutEffect(() => {
    const previous = previousIndex.current;
    if (previous !== currentIndex) {
      setDirection(currentIndex > previous ? 'next' : 'prev');
      previousIndex.current = currentIndex;
    }

    // Each route owns its own scroll position. Reset before the slide enters so
    // a tab change never reveals a half-scrolled page or hides its header.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentIndex, location.pathname]);

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

    // Nested screens keep their own back/forward controls. Do not turn a
    // horizontal gesture inside a detail screen into an unexpected jump to a
    // primary tab.
    if (currentIndex < 0) return;
    const nextIndex = deltaX < 0 ? Math.min(primaryRoutes.length - 1, currentIndex + 1) : Math.max(0, currentIndex - 1);
    if (nextIndex !== currentIndex) navigate(primaryRoutes[nextIndex]);
  };

  return <div className="app-route-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    <div className={`page-transition slide-in-${direction}`} key={location.pathname}><Outlet /></div>
    <BottomNav />
  </div>;
}
