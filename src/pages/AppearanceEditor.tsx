import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Loader2, Smartphone, Monitor, X } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/toaster';
import { Switch } from '@/components/ui/switch';

type Kind = 'floating' | 'carousel';
type Shape = 'circular' | 'quadrado' | 'personalizado';
type Position = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
type Unit = 'px' | '%';
type BorderStyle = 'pulsar' | 'solido' | 'tracejado' | 'nenhum';
type MediaFit = 'cover' | 'contain';

interface Config {
  useAllDevices: boolean;
  shape: Shape;
  width: number;
  widthUnit: Unit;
  height: number;
  borderRadius: number;
  position: Position;
  spacingBottom: number;
  spacingLeft: number;
  cta: string;
  ctaSize: number;
  borderStyle: BorderStyle;
  ctaDuration: number;
  color: string;
  hideStories: boolean;
  draggable: boolean;
  allowClose: boolean;
  mediaFit: MediaFit;
  zIndex: number;
}

const DEFAULT_CONFIG: Config = {
  useAllDevices: true,
  shape: 'circular',
  width: 100,
  widthUnit: 'px',
  height: 100,
  borderRadius: 100,
  position: 'bottom-left',
  spacingBottom: 20,
  spacingLeft: 20,
  cta: 'Detalhes',
  ctaSize: 15,
  borderStyle: 'pulsar',
  ctaDuration: 5,
  color: '#000000',
  hideStories: false,
  draggable: true,
  allowClose: true,
  mediaFit: 'cover',
  zIndex: 9999999,
};

const POSITIONS: { value: Position; label: string }[] = [
  { value: 'bottom-left', label: 'Inferior Esquerdo' },
  { value: 'bottom-right', label: 'Inferior Direito' },
  { value: 'top-left', label: 'Superior Esquerdo' },
  { value: 'top-right', label: 'Superior Direito' },
];

const BORDER_STYLES: { value: BorderStyle; label: string }[] = [
  { value: 'pulsar', label: 'Pulsar' },
  { value: 'solido', label: 'Sólido' },
  { value: 'tracejado', label: 'Tracejado' },
  { value: 'nenhum', label: 'Nenhum' },
];

const MEDIA_FITS: { value: MediaFit; label: string }[] = [
  { value: 'cover', label: 'Preencher (cover)' },
  { value: 'contain', label: 'Encaixar (contain)' },
];

const PREVIEW_IMG =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=320&h=320&fit=crop&crop=faces';

export default function AppearanceEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { appId, presetId } = useParams();
  const [search] = useSearchParams();
  const kind: Kind = (search.get('kind') as Kind) === 'carousel' ? 'carousel' : 'floating';

  const isNew = !presetId || presetId === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');

  useEffect(() => {
    if (isNew || !user) return;
    (async () => {
      const { data } = await supabase
        .from('appearance_presets')
        .select('*')
        .eq('id', presetId!)
        .maybeSingle();
      if (data) {
        setName(data.name);
        setCfg({ ...DEFAULT_CONFIG, ...((data.config as Partial<Config>) ?? {}) });
      }
      setLoading(false);
    })();
  }, [isNew, presetId, user]);

  function backToTab() {
    navigate(`/app/${appId}?tab=aparencia`);
  }

  async function save() {
    if (!name.trim()) { toast.error('Dê um nome ao padrão'); return; }
    if (!user) return;
    setSaving(true);
    if (isNew) {
      const { error } = await supabase.from('appearance_presets').insert({
        user_id: user.id, name: name.trim(), kind, config: cfg as unknown as never,
      });
      if (error) { setSaving(false); toast.error('Erro ao criar'); return; }
    } else {
      const { error } = await supabase
        .from('appearance_presets')
        .update({ name: name.trim(), config: cfg as unknown as never })
        .eq('id', presetId!);
      if (error) { setSaving(false); toast.error('Erro ao salvar'); return; }
    }
    setSaving(false);
    toast.success('Padrão salvo');
    backToTab();
  }

  const bubbleStyle = useMemo<React.CSSProperties>(() => {
    const isBottom = cfg.position.startsWith('bottom');
    const isLeft = cfg.position.endsWith('left');
    let radius: string | number = 0;
    let w: string | number = cfg.width;
    let h: string | number = cfg.width;
    if (cfg.shape === 'circular') radius = '50%';
    else if (cfg.shape === 'quadrado') radius = 16;
    else {
      radius = cfg.borderRadius;
      w = cfg.widthUnit === '%' ? `${cfg.width}%` : cfg.width;
      h = cfg.height;
    }
    const borderCss =
      cfg.borderStyle === 'nenhum'
        ? 'none'
        : `3px ${cfg.borderStyle === 'tracejado' ? 'dashed' : 'solid'} ${cfg.color}`;
    return {
      position: 'absolute',
      width: w,
      height: h,
      borderRadius: radius,
      border: borderCss,
      backgroundImage: `url(${PREVIEW_IMG})`,
      backgroundSize: cfg.mediaFit,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#d1d5db',
      [isBottom ? 'bottom' : 'top']: cfg.spacingBottom,
      [isLeft ? 'left' : 'right']: cfg.spacingLeft,
      zIndex: 2,
    } as React.CSSProperties;
  }, [cfg]);


  const ctaBase = useMemo<React.CSSProperties>(() => {
    const isBottom = cfg.position.startsWith('bottom');
    const isLeft = cfg.position.endsWith('left');
    const bubbleW =
      cfg.shape === 'personalizado' && cfg.widthUnit === 'px'
        ? cfg.width
        : cfg.shape === 'personalizado'
        ? 100
        : cfg.width;
    const bubbleH = cfg.shape === 'personalizado' ? cfg.height : cfg.width;
    const verticalCenter = cfg.spacingBottom + bubbleH / 2;
    const horizontalAfter = cfg.spacingLeft + bubbleW + 10;
    return {
      position: 'absolute',
      [isBottom ? 'bottom' : 'top']: verticalCenter,
      [isLeft ? 'left' : 'right']: horizontalAfter,
      background: cfg.color,
      color: '#fff',
      fontSize: cfg.ctaSize,
      lineHeight: 1,
      padding: '6px 12px',
      borderRadius: 999,
      fontWeight: 700,
      letterSpacing: 0.3,
      whiteSpace: 'nowrap',
      boxShadow: '0 6px 18px rgba(0,0,0,.18)',
      willChange: 'transform, opacity',
      transition: 'opacity 380ms cubic-bezier(.22,.61,.36,1), transform 380ms cubic-bezier(.22,.61,.36,1)',
      transformOrigin: 'center',
    } as React.CSSProperties;
  }, [cfg]);

  // Translate Y baseline keeps pill vertically aligned with bubble center.
  const ctaShown: React.CSSProperties = { opacity: 1, transform: 'translateY(50%) scale(1)' };
  const ctaHidden: React.CSSProperties = { opacity: 0, transform: 'translateY(calc(50% + 8px)) scale(0.9)', pointerEvents: 'none' };

  // CTA visibility timer: shows on mount, hides after ctaDuration seconds, loops every (duration+2)s.
  const [ctaVisible, setCtaVisible] = useState(true);
  useEffect(() => {
    setCtaVisible(true);
    if (!cfg.cta || cfg.ctaDuration <= 0) return;
    let hideTimer: ReturnType<typeof setTimeout>;
    let showTimer: ReturnType<typeof setTimeout>;
    const loop = () => {
      setCtaVisible(true);
      hideTimer = setTimeout(() => {
        setCtaVisible(false);
        showTimer = setTimeout(loop, 1500);
      }, cfg.ctaDuration * 1000);
    };
    loop();
    return () => { clearTimeout(hideTimer); clearTimeout(showTimer); };
  }, [cfg.cta, cfg.ctaDuration]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-neutral-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const showPersonalizado = cfg.shape === 'personalizado';

  return (
    <>
      <TopBar
        title={isNew ? 'Nova aparência' : 'Editar aparência'}
        breadcrumb="Stories Vídeos"
        backTo={`/app/${appId}?tab=aparencia`}
      />
      <main className="px-10 py-8 fade-in">
        <button
          onClick={backToTab}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Aparência
        </button>

        <div className="bg-white border border-neutral-200 rounded-2xl p-6">
          <label className="flex flex-col gap-1.5 text-sm mb-6">
            <span className="text-neutral-700 font-medium">Aparência</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Story vídeo redondo"
              className="h-11 rounded-xl border border-neutral-200 px-3 max-w-md"
            />
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
            {/* Preview */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 min-h-[520px]">
              <div className="flex justify-center mb-4">
                <div className="inline-flex bg-white border border-neutral-200 rounded-xl p-1">
                  <button
                    onClick={() => setDevice('mobile')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      device === 'mobile' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> Mobile
                  </button>
                  <button
                    onClick={() => setDevice('desktop')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      device === 'desktop' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500'
                    }`}
                  >
                    <Monitor className="w-4 h-4" /> Desktop
                  </button>
                </div>
              </div>

              {device === 'mobile' ? (
                <div
                  className="relative mx-auto"
                  style={{ width: 300, height: 600 }}
                >
                  {/* Phone outer frame */}
                  <div
                    className="absolute inset-0 bg-neutral-900 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)]"
                    style={{ borderRadius: 44, padding: 12 }}
                  >
                    {/* Screen */}
                    <div
                      className="relative w-full h-full overflow-hidden bg-white"
                      style={{ borderRadius: 32 }}
                    >
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-neutral-900 h-6 w-32 rounded-b-2xl" />
                      {/* Status bar */}
                      <div className="flex items-center justify-between px-6 pt-2 text-[10px] font-semibold text-neutral-800">
                        <span>9:41</span>
                        <span />
                      </div>
                      {/* Fake store content */}
                      <div className="px-3 pt-6">
                        <div className="h-6 bg-neutral-200 rounded-md w-2/3 mb-3" />
                        <div className="grid grid-cols-2 gap-2.5">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-neutral-200/80" />
                          ))}
                        </div>
                      </div>
                      {/* Widget overlay */}
                      {!cfg.hideStories && (
                        <>
                          {cfg.borderStyle === 'pulsar' && (
                            <>
                              <PulseRing style={bubbleStyle} delay="0s" color={cfg.color} />
                              <PulseRing style={bubbleStyle} delay="2.66s" color={cfg.color} />
                              <PulseRing style={bubbleStyle} delay="5.33s" color={cfg.color} />
                            </>
                          )}
                          <div style={bubbleStyle}>
                            {cfg.allowClose && (
                              <div className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-black/60 text-white">
                                <X className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          {cfg.cta && (
                            <div style={{ ...ctaBase, ...(ctaVisible ? ctaShown : ctaHidden) }}>
                              {cfg.cta.toUpperCase()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative mx-auto w-full" style={{ maxWidth: 760 }}>
                  {/* Browser window */}
                  <div className="bg-neutral-100 border border-neutral-300 rounded-t-xl overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]">
                    {/* Title bar */}
                    <div className="flex items-center gap-2 px-4 h-9 bg-neutral-200/80 border-b border-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                      </div>
                      <div className="mx-auto bg-white border border-neutral-300 rounded-md h-6 px-3 flex items-center text-[11px] text-neutral-500 min-w-[240px] max-w-[360px] w-full justify-center">
                        minhaloja.com.br
                      </div>
                    </div>
                    {/* Viewport */}
                    <div className="relative bg-white" style={{ height: 460 }}>
                      <div className="px-6 pt-5">
                        <div className="h-7 bg-neutral-200 rounded-md w-1/3 mb-4" />
                        <div className="grid grid-cols-4 gap-4">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-neutral-200/80" />
                          ))}
                        </div>
                      </div>
                      {!cfg.hideStories && (
                        <>
                          {cfg.borderStyle === 'pulsar' && (
                            <>
                              <PulseRing style={bubbleStyle} delay="0s" color={cfg.color} />
                              <PulseRing style={bubbleStyle} delay="2.66s" color={cfg.color} />
                              <PulseRing style={bubbleStyle} delay="5.33s" color={cfg.color} />
                            </>
                          )}
                          <div style={bubbleStyle}>
                            {cfg.allowClose && (
                              <div className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-black/60 text-white">
                                <X className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          {cfg.cta && (
                            <div style={{ ...ctaBase, ...(ctaVisible ? ctaShown : ctaHidden) }}>
                              {cfg.cta.toUpperCase()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {/* Monitor stand */}
                  <div className="mx-auto w-32 h-3 bg-neutral-300 rounded-b-xl" />
                  <div className="mx-auto w-48 h-1.5 bg-neutral-400/70 rounded-full mt-1" />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3">
                <Switch
                  checked={cfg.useAllDevices}
                  onCheckedChange={(v) => setCfg({ ...cfg, useAllDevices: !!v })}
                />
                <div>
                  <div className="text-sm font-medium text-neutral-900">
                    Usar aparência em todos os dispositivos
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Quando ativado, a mesma aparência será aplicada no mobile e no desktop.
                  </p>
                </div>
              </div>

              <Field label="Forma">
                <select
                  className="h-10 rounded-xl border border-neutral-200 px-3 bg-white w-full"
                  value={cfg.shape}
                  onChange={(e) => setCfg({ ...cfg, shape: e.target.value as Shape })}
                >
                  <option value="circular">Circular</option>
                  <option value="quadrado">Quadrado</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </Field>

              {showPersonalizado ? (
                <>
                  <div className="flex flex-col gap-1.5 text-sm">
                    <span className="text-neutral-700 font-medium">
                      Largura ({cfg.width}{cfg.widthUnit})
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={cfg.widthUnit === '%' ? 10 : 48}
                        max={cfg.widthUnit === '%' ? 100 : 400}
                        value={cfg.width}
                        onChange={(e) => setCfg({ ...cfg, width: Number(e.target.value) })}
                        className="accent-blue-600 flex-1"
                      />
                      <select
                        value={cfg.widthUnit}
                        onChange={(e) => setCfg({ ...cfg, widthUnit: e.target.value as Unit })}
                        className="h-9 rounded-lg border border-neutral-200 px-2 bg-white text-sm"
                      >
                        <option value="px">Px</option>
                        <option value="%">%</option>
                      </select>
                    </div>
                  </div>
                  <Slider label={`Altura (${cfg.height}px)`} min={48} max={400}
                    value={cfg.height} onChange={(v) => setCfg({ ...cfg, height: v })} />
                  <Slider label={`Raio da Borda (${cfg.borderRadius}px)`} min={0} max={200}
                    value={cfg.borderRadius} onChange={(v) => setCfg({ ...cfg, borderRadius: v })} />
                </>
              ) : (
                <Slider label={`Largura (${cfg.width}px)`} min={48} max={400}
                  value={cfg.width} onChange={(v) => setCfg({ ...cfg, width: v, height: v })} />
              )}

              <Field label="Posição">
                <select
                  className="h-10 rounded-xl border border-neutral-200 px-3 bg-white w-full"
                  value={cfg.position}
                  onChange={(e) => setCfg({ ...cfg, position: e.target.value as Position })}
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </Field>

              <Slider label={`Espaçamento Inferior (${cfg.spacingBottom}px)`} min={0} max={400}
                value={cfg.spacingBottom} onChange={(v) => setCfg({ ...cfg, spacingBottom: v })} />
              <Slider label={`Espaçamento Esquerdo (${cfg.spacingLeft}px)`} min={0} max={400}
                value={cfg.spacingLeft} onChange={(v) => setCfg({ ...cfg, spacingLeft: v })} />

              <Field label="Chamada para Ação">
                <input
                  value={cfg.cta}
                  onChange={(e) => setCfg({ ...cfg, cta: e.target.value })}
                  placeholder="Detalhes"
                  className="h-10 rounded-xl border border-neutral-200 px-3 w-full"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Deixe vazio para ocultar a chamada para ação.
                </p>
                <p className="text-xs text-neutral-500">
                  Defina transparente para ocultar a chamada para ação.
                </p>
              </Field>

              <Slider label={`Tamanho da Chamada para Ação (${cfg.ctaSize}px)`} min={8} max={40}
                value={cfg.ctaSize} onChange={(v) => setCfg({ ...cfg, ctaSize: v })} />

              <Field label="Estilo da Borda">
                <select
                  className="h-10 rounded-xl border border-neutral-200 px-3 bg-white w-full"
                  value={cfg.borderStyle}
                  onChange={(e) => setCfg({ ...cfg, borderStyle: e.target.value as BorderStyle })}
                >
                  {BORDER_STYLES.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Duração da Chamada para Ação">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={cfg.ctaDuration}
                    onChange={(e) => setCfg({ ...cfg, ctaDuration: Number(e.target.value) })}
                    className="h-10 w-24 rounded-xl border border-neutral-200 px-3"
                  />
                  <span className="text-sm text-neutral-500">segundos</span>
                </div>
              </Field>

              <Field label="Cor">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.color}
                    onChange={(e) => setCfg({ ...cfg, color: e.target.value })}
                    className="h-10 w-16 rounded-xl border border-neutral-200 bg-white cursor-pointer"
                  />
                  <input
                    value={cfg.color}
                    onChange={(e) => setCfg({ ...cfg, color: e.target.value })}
                    className="h-10 flex-1 rounded-xl border border-neutral-200 px-3 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setCfg({ ...cfg, color: 'transparent' })}
                    className="h-10 px-3 rounded-xl border border-neutral-200 text-xs font-medium hover:bg-neutral-50"
                  >
                    Remover Cor
                  </button>
                </div>
              </Field>

              <ToggleRow
                label="Ocultar o stories?"
                checked={cfg.hideStories}
                onChange={(v) => setCfg({ ...cfg, hideStories: v })}
              />
              <ToggleRow
                label="Arrastável"
                checked={cfg.draggable}
                onChange={(v) => setCfg({ ...cfg, draggable: v })}
              />
              <ToggleRow
                label="Permite Fechar"
                checked={cfg.allowClose}
                onChange={(v) => setCfg({ ...cfg, allowClose: v })}
              />

              <Field label="Exibição do vídeo/imagem">
                <select
                  className="h-10 rounded-xl border border-neutral-200 px-3 bg-white w-full"
                  value={cfg.mediaFit}
                  onChange={(e) => setCfg({ ...cfg, mediaFit: e.target.value as MediaFit })}
                >
                  {MEDIA_FITS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1">
                  Cover preenche a área cortando se necessário; contain exibe a mídia inteira.
                </p>
              </Field>

              <Field label="Z-Index">
                <input
                  type="number"
                  value={cfg.zIndex}
                  onChange={(e) => setCfg({ ...cfg, zIndex: Number(e.target.value) })}
                  className="h-10 rounded-xl border border-neutral-200 px-3 w-full"
                />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  onClick={backToTab}
                  className="h-10 px-4 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
                >
                  Voltar
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-neutral-700 font-medium">{label}</span>
      {children}
    </label>
  );
}

function Slider({
  label, min, max, value, onChange,
}: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="text-neutral-700 font-medium">{label}</span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-blue-600"
      />
    </div>
  );
}

function ToggleRow({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border border-neutral-100 rounded-xl px-3 py-2.5">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      <Switch checked={checked} onCheckedChange={(v) => onChange(!!v)} />
    </div>
  );
}

function PulseRing({ style, delay, color }: { style: React.CSSProperties; delay: string; color: string }) {
  const ringStyle: React.CSSProperties = {
    ...style,
    backgroundImage: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    zIndex: 1,
    pointerEvents: 'none',
    // Use CSS custom property so keyframes can reference the ring color
    ['--zt-ring' as any]: color,
    animation: `zt-pulse-ring 8s cubic-bezier(.22,.61,.36,1) ${delay} infinite`,
    willChange: 'box-shadow, opacity',
  };
  return (
    <>
      <style>{`@keyframes zt-pulse-ring {
        0%   { box-shadow: 0 0 0 0px var(--zt-ring);  opacity: 0.75; }
        15%  { box-shadow: 0 0 0 12px var(--zt-ring); opacity: 0; }
        100% { box-shadow: 0 0 0 12px var(--zt-ring); opacity: 0; }
      }`}</style>
      <div style={ringStyle} />
    </>
  );
}
