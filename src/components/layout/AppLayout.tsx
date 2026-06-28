import { Outlet, useLocation } from 'react-router';
import { memo, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import CLSDebugOverlay from '@/components/debug/CLSDebugOverlay';

function AppLayout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div data-ev-id="ev_3539cb7e88" className="bg-white text-neutral-900 h-screen overflow-hidden md:pl-[260px]">
      <Sidebar />
      <main
        ref={mainRef}
        data-ev-id="ev_099528319d"
        className="min-w-0 h-screen overflow-y-auto overscroll-contain flex flex-col"
      >
        <Outlet />
      </main>
      <CLSDebugOverlay />
    </div>);

}


export default memo(AppLayout);
