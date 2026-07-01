import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import mannequinUrl from '@/assets/mannequin.svg';

export type MeasureType = 'Busto' | 'Quadril' | 'Cintura' | 'Manga' | 'Altura' | 'Dentro da Perna' | 'Bíceps';
export const MEASURE_TYPES: MeasureType[] = ['Busto', 'Quadril', 'Cintura', 'Manga', 'Altura', 'Dentro da Perna', 'Bíceps'];
export type MeasureRow = { id: string; tamanho: string; medida: MeasureType; valor: string };
export type MeasureModel = { id: string; name: string; rows: MeasureRow[] };

const HORIZONTAL_MEASURES: Partial<Record<MeasureType, { y: number; x1?: number; x2?: number }>> = {
  Busto: { y: 198 },
  Cintura: { y: 266 },
  Quadril: { y: 332 },
  Bíceps: { y: 232, x1: 18, x2: 70 },
};

const VERTICAL_MEASURES: Partial<Record<MeasureType, { x: number; y1: number; y2: number }>> = {
  Altura: { x: 220, y1: 70, y2: 700 },
  Manga: { x: 36, y1: 175, y2: 360 },
  'Dentro da Perna': { x: 121, y1: 372, y2: 695 },
};

export function MannequinSVG({ activeTypes }: { activeTypes: MeasureType[] }) {
  const showAll = activeTypes.length === 0;
  const isActive = (m: MeasureType) =>
    showAll && (m === 'Busto' || m === 'Cintura' || m === 'Quadril') ? true : activeTypes.includes(m);

  return (
    <div className="mx-auto flex w-full justify-center">
      <div className="relative w-full max-w-[200px] sm:max-w-[210px]">
        <img
          src={mannequinUrl}
          alt="Manequim"
          width={242}
          height={727}
          className="block h-auto w-full select-none object-contain"
          draggable={false}
        />
        <svg
          viewBox="0 0 242 727"
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ overflow: 'visible' }}
          aria-hidden
        >
          {(Object.entries(HORIZONTAL_MEASURES) as [MeasureType, { y: number; x1?: number; x2?: number }][])
            .filter(([m]) => isActive(m))
            .map(([label, cfg]) => {
              const x1 = cfg.x1 ?? 8;
              const x2 = cfg.x2 ?? 219;
              return (
                <g key={label}>
                  <line x1={x1} x2={x2} y1={cfg.y} y2={cfg.y} stroke="#ef4444" strokeWidth={1.2} strokeDasharray="4 3" />
                  <text
                    x={x2 + 4}
                    y={cfg.y + 4}
                    textAnchor="start"
                    fontSize={12}
                    fontWeight={600}
                    fill="#ef4444"
                    style={{ paintOrder: 'stroke' }}
                    stroke="#fff"
                    strokeWidth={3}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

          {(Object.entries(VERTICAL_MEASURES) as [MeasureType, { x: number; y1: number; y2: number }][])
            .filter(([m]) => isActive(m))
            .map(([label, cfg]) => {
              const cy = (cfg.y1 + cfg.y2) / 2 + (label === 'Altura' ? 20 : 0);
              const tx = cfg.x + (label === 'Altura' ? 15 : 10);
              return (
                <g key={label}>
                  <line x1={cfg.x} x2={cfg.x} y1={cfg.y1} y2={cfg.y2} stroke="#ef4444" strokeWidth={1.2} strokeDasharray="4 3" />
                  <line x1={cfg.x - 5} x2={cfg.x + 5} y1={cfg.y1} y2={cfg.y1} stroke="#ef4444" strokeWidth={1.2} />
                  <line x1={cfg.x - 5} x2={cfg.x + 5} y1={cfg.y2} y2={cfg.y2} stroke="#ef4444" strokeWidth={1.2} />
                  <text
                    x={tx}
                    y={cy}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="#ef4444"
                    style={{ paintOrder: 'stroke' }}
                    stroke="#fff"
                    strokeWidth={3}
                    transform={`rotate(-90 ${tx} ${cy})`}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>
    </div>
  );
}

export function MeasurePreviewModal({ model, onClose }: { model: MeasureModel | null; onClose: () => void }) {
  const open = !!model;
  const activeTypes = useMemo<MeasureType[]>(() => {
    if (!model) return [];
    return Array.from(new Set(model.rows.map((r) => r.medida)));
  }, [model]);

  const { sizes, types } = useMemo(() => {
    if (!model) return { sizes: [] as string[], types: [] as MeasureType[] };
    const sizeOrder: string[] = [];
    const seen = new Set<string>();
    model.rows.forEach((r) => {
      const t = (r.tamanho || '—').trim() || '—';
      if (!seen.has(t)) {
        seen.add(t);
        sizeOrder.push(t);
      }
    });
    return { sizes: sizeOrder, types: activeTypes };
  }, [model, activeTypes]);

  const valueFor = (size: string, medida: MeasureType) => {
    if (!model) return '';
    const found = model.rows.find((r) => ((r.tamanho || '—').trim() || '—') === size && r.medida === medida);
    return found ? found.valor : '—';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-[min(100%,56rem)] sm:max-w-4xl mx-auto my-auto p-0 overflow-hidden max-h-[90vh] max-h-[90dvh] flex flex-col">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-0.5">
              <span className="text-[12px] font-medium uppercase tracking-wide text-neutral-500">
                Medidas da Modelo
              </span>
              <span className="text-[18px] font-semibold text-neutral-900">
                {model?.name ?? 'Modelo de medidas'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {sizes.length > 0
                ? `A modelo usa o tamanho ${sizes.join(', ')}`
                : 'Pré-visualização do manequim com as referências de medida.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)] gap-4 sm:gap-5 items-start">
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 sm:p-4 flex items-center justify-center mx-auto w-full max-w-[260px] md:max-w-none">
              <MannequinSVG activeTypes={activeTypes} />
            </div>

            <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
              {sizes.length === 0 || types.length === 0 ? (
                <div className="p-6 text-center text-[13px] text-neutral-500">
                  Nenhuma medida cadastrada neste modelo.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] text-neutral-800 border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-[11.5px] uppercase tracking-wide text-neutral-500">
                        <th className="text-left font-medium px-3 py-2.5 border-b border-neutral-200">Medida</th>
                        <th className="text-left font-medium px-3 py-2.5 border-b border-neutral-200 whitespace-nowrap">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {types.map((t, i) => {
                        const val = valueFor(sizes[0], t);
                        return (
                          <tr key={t} className={i !== types.length - 1 ? 'border-b border-neutral-100' : ''}>
                            <td className="px-3 py-2.5 font-semibold text-neutral-900 whitespace-nowrap">{t}</td>
                            <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                              {val}{val !== '—' ? ' cm' : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-neutral-100 flex items-center justify-end shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-[13.5px] font-medium text-neutral-700 rounded-xl hover:bg-neutral-100 transition-colors">
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
