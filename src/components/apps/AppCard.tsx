import { Play, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { memo, useCallback, useState, type MouseEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';

interface App {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  expiresInDays: number;
}

interface AppCardProps {
  app: App;
  onDelete?: (id: string) => void;
  isExpired?: boolean;
}

function AppCard({ app, onDelete, isExpired = false }: AppCardProps) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleOpen = useCallback(() => {
    navigate(`/app/${app.id}`);
  }, [app.id, navigate]);

  const handleDelete = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(() => {
    onDelete?.(app.id);
    toast.success('Aplicativo removido com sucesso');
    setShowDeleteConfirm(false);
  }, [app.id, onDelete]);

  return (
    <>
      <div data-ev-id="ev_1bcf52e50a"
      onClick={handleOpen}
      className="group w-full h-[130px] text-left bg-white border border-neutral-200 rounded-2xl p-5 flex items-center gap-5 hover:border-neutral-300 hover:shadow-[0_4px_24px_-12px_rgba(0,0,0,0.12)] transition-all duration-200 cursor-pointer">

        <div data-ev-id="ev_443499abd4" className="w-[88px] h-[88px] rounded-2xl bg-neutral-900 text-white flex items-center justify-center shrink-0 group-hover:scale-[1.02] transition-transform">
          <Play className="w-9 h-9 fill-white" strokeWidth={0} />
        </div>
        <div data-ev-id="ev_5b87050420" className="flex-1 min-w-0">
          <div data-ev-id="ev_ff8ef0f384" className="flex items-center gap-2.5 mb-1.5">
            <h3 data-ev-id="ev_28f1d790c2" className="text-[18px] font-semibold text-neutral-900">{app.name}</h3>
            <span data-ev-id="ev_0683306985" className="text-[10px] font-semibold tracking-wider uppercase bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-md">
              {app.type}
            </span>
          </div>
          <p data-ev-id="ev_46379eda40" className="text-[14px] text-neutral-600 mb-3 line-clamp-1">{app.description}</p>
          <div data-ev-id="ev_e652815ee3" className="flex items-center gap-2 text-[12.5px]">
            <span data-ev-id="ev_7d503d3f7f" className="text-neutral-500">Assinatura {app.status}</span>
            {isExpired ?
            <span data-ev-id="ev_5497c61cf3" className="text-[10.5px] font-semibold tracking-wider uppercase bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md border border-amber-100">
                Expirado
              </span> :

            <span data-ev-id="ev_e2c9198fae" className="text-[10.5px] font-semibold tracking-wider uppercase bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md border border-emerald-100">
                Expira em {app.expiresInDays} dias
              </span>
            }
          </div>
        </div>
        <button data-ev-id="ev_76efa4b446"
        onClick={handleDelete}
        className="w-10 h-10 rounded-xl hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-neutral-400 transition-colors shrink-0"
        title="Excluir aplicativo">

          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir aplicativo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o aplicativo "{app.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button data-ev-id="ev_2d82b5d2c6"
            onClick={() => setShowDeleteConfirm(false)}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">

              Cancelar
            </button>
            <button data-ev-id="ev_bd9f917019"
            onClick={confirmDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">

              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>);

}

export default memo(AppCard);