import { useNavigate } from 'react-router';
import { memo, useCallback, type ReactNode } from 'react';
import { ChevronLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel } from
'@/components/ui/dropdown-menu';

interface TopBarProps {
  title: string;
  backTo?: string;
  breadcrumb?: string;
  rightSlot?: ReactNode;
  /**
   * When true, hides the profile dropdown so `rightSlot` takes its visual
   * position in the header. Used by edit/create pages to swap the user chip
   * for a "Salvar" CTA without changing the surrounding layout.
   */
  hideProfile?: boolean;
}

function TopBar({ title, backTo, breadcrumb, rightSlot, hideProfile = false }: TopBarProps) {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleBack = useCallback(() => {
    backTo ? navigate(backTo) : navigate(-1);
  }, [backTo, navigate]);

  return (
    <header data-ev-id="ev_9690f60d68" className="sticky top-0 z-40 h-[76px] border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 flex items-center justify-between px-10">
      <div data-ev-id="ev_28e457f727" className="flex items-center gap-3 min-w-0">
        {backTo !== undefined &&
        <button data-ev-id="ev_0ff3076648"
        onClick={handleBack}
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors text-neutral-700"
        aria-label="Voltar">

            <ChevronLeft className="w-5 h-5" />
          </button>
        }
        <div data-ev-id="ev_f19620291c" className="min-w-0">
          {breadcrumb &&
          <div data-ev-id="ev_84c98e8e4f" className="text-[12px] text-neutral-500 font-medium leading-none mb-1">{breadcrumb}</div>
          }
          <h1 data-ev-id="ev_07767cb022" className="text-[26px] font-semibold tracking-tight text-neutral-900 leading-tight truncate">{title}</h1>
        </div>
      </div>
      <div data-ev-id="ev_6051211abc" className="flex items-center gap-4">
        {rightSlot}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-ev-id="ev_8771892fd0" className="flex items-center gap-3 outline-none min-w-[190px] justify-end">
              <span data-ev-id="ev_c585fc684b" className="block min-w-[140px] max-w-[140px] truncate text-right text-[14px] font-medium text-neutral-800">{profile?.name || '—'}</span>
              <div data-ev-id="ev_718373a63d" className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[12px] font-semibold tracking-wide">
                {profile?.initials || '·'}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div data-ev-id="ev_67558fb1c3" className="text-[13px] font-semibold text-neutral-900">{profile?.name}</div>
              <div data-ev-id="ev_59b48ea207" className="text-[12px] text-neutral-500 mt-0.5">{profile?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/perfil')}>Perfil</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/assinaturas')}>Assinaturas</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-600">
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>);

}

export default memo(TopBar);