import { NavLink, useLocation } from 'react-router';
import { memo, useMemo, useState, useEffect } from 'react';
import {
  LayoutGrid,
  Store,
  GraduationCap,
  CreditCard,
  User,
  Megaphone,
  MessageCircle,
  Menu,
  X } from
'lucide-react';
import { cn } from '@/lib/utils';

const items = [
{ key: 'meus-apps', label: 'Meus apps', icon: LayoutGrid, path: '/' },
{ key: 'loja', label: 'Loja de apps', icon: Store, path: '/loja' },
{ key: 'tutoriais', label: 'Tutoriais', icon: GraduationCap, path: '/tutoriais' },
{ key: 'assinaturas', label: 'Assinaturas', icon: CreditCard, path: '/assinaturas' },
{ key: 'perfil', label: 'Perfil', icon: User, path: '/perfil' }];


function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isMeusApps = location.pathname === '/' || location.pathname.startsWith('/app/');
  const activeByPath = useMemo(
    () => new Map(items.map((item) => [item.key, item.path === '/' ? isMeusApps : location.pathname.startsWith(item.path)])),
    [isMeusApps, location.pathname]
  );

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm"
      >
        <Menu className="w-5 h-5 text-neutral-800" />
      </button>

      {/* Backdrop on mobile when open */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        data-ev-id="ev_5375042d05"
        className={cn(
          'w-[260px] border-r border-neutral-200 bg-white flex flex-col z-50',
          'fixed left-0 top-0 bottom-0 md:static md:h-auto md:self-stretch md:shrink-0',
          'transition-transform duration-200 md:transition-none md:transform-none',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >


        {/* Mobile close */}
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="md:hidden absolute top-3 right-3 w-9 h-9 rounded-lg hover:bg-neutral-100 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-neutral-700" />
        </button>

        {/* Brand */}
        <div data-ev-id="ev_3b9bdb7b46" className="px-6 pt-7 pb-8">
          <div data-ev-id="ev_bc4bf3916b" className="items-baseline flex gap-2">
            <span data-ev-id="ev_1189ae3e96" className="text-[26px] font-bold tracking-tight text-neutral-900">Zentor</span>
            <span data-ev-id="ev_e27049c05d" className="text-[10px] font-medium tracking-[0.15em] text-neutral-500 uppercase">Sistemas</span>
          </div>
        </div>

        {/* Nav */}
        <nav data-ev-id="ev_3682cafbab" className="px-3 flex flex-col gap-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeByPath.get(item.key) ?? false;
            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-colors duration-150',
                  active ?
                  'bg-neutral-900 text-white shadow-sm' :
                  'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                )}>

                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                <span data-ev-id="ev_27464a4a3c">{item.label}</span>
              </NavLink>);

          })}
        </nav>

        {/* Footer actions */}
        <div data-ev-id="ev_0d2d05f377" className="p-4 mt-auto flex flex-col gap-2.5">
          <button data-ev-id="ev_8f708914ff" className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium text-neutral-700 border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors">
            <Megaphone className="w-[18px] h-[18px]" strokeWidth={1.75} />
            Novidades
          </button>
          <button data-ev-id="ev_173802e90d" className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 transition-colors">
            <MessageCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
            Entre em contato
          </button>
        </div>
      </aside>
    </>
  );
}

export default memo(Sidebar);
