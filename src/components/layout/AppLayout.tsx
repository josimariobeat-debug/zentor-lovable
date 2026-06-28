import { Outlet } from 'react-router';
import { memo } from 'react';
import Sidebar from './Sidebar';
import CLSDebugOverlay from '@/components/debug/CLSDebugOverlay';

function AppLayout() {
  return (
    <div data-ev-id="ev_3539cb7e88" className="bg-white text-neutral-900 h-screen overflow-hidden md:pl-[260px]">
      <Sidebar />
      <main data-ev-id="ev_099528319d" className="min-w-0 h-screen overflow-y-auto overscroll-contain flex flex-col">
        <Outlet />
      </main>
      <CLSDebugOverlay />
    </div>);

}


export default memo(AppLayout);