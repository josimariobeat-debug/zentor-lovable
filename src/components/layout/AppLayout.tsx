import { Outlet } from 'react-router';
import { memo } from 'react';
import Sidebar from './Sidebar';

function AppLayout() {
  return (
    <div data-ev-id="ev_3539cb7e88" className="flex bg-white text-neutral-900 min-h-screen">
      <Sidebar />
      <div data-ev-id="ev_099528319d" className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </div>
    </div>);

}

export default memo(AppLayout);