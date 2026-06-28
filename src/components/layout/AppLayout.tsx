import { Outlet } from 'react-router';
import { memo } from 'react';
import Sidebar from './Sidebar';
import CLSDebugOverlay from '@/components/debug/CLSDebugOverlay';

function AppLayout() {
  return (
    <div
      data-ev-id="ev_3539cb7e88"
      className="app-shell bg-white text-neutral-900 flex w-full overflow-hidden"
    >

      <Sidebar />
      <main
        data-ev-id="ev_099528319d"
        className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden"
      >
        <Outlet />
      </main>
      <CLSDebugOverlay />
    </div>);

}


export default memo(AppLayout);
