import { useMemo } from 'react';

type Shape = 'circular' | 'quadrado' | 'personalizado';
type Position = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
type Unit = 'px' | '%';
type BorderStyle = 'pulsar' | 'solido' | 'tracejado' | 'nenhum';

export interface MiniConfig {
  shape?: Shape;
  width?: number;
  widthUnit?: Unit;
  height?: number;
  borderRadius?: number;
  position?: Position;
  spacingBottom?: number;
  spacingLeft?: number;
  borderStyle?: BorderStyle;
  color?: string;
  hideStories?: boolean;
}

interface Props {
  config: MiniConfig | null | undefined;
  kind?: 'floating' | 'carousel';
  /** Largura do thumb em px. Altura é calculada com aspect 9/16. */
  width?: number;
}

const BASE_W = 300; // mesma base do editor (mobile phone width)
const BASE_H = 600;

/**
 * Render reduzido do preview do celular usado no AppearanceEditor.
 * Reflete forma, cor, borda, posição e espaçamento da aparência salva.
 */
export default function AppearanceMiniPreview({ config, kind = 'floating', width = 64 }: Props) {
  const cfg = {
    shape: 'circular' as Shape,
    width: 100,
    widthUnit: 'px' as Unit,
    height: 100,
    borderRadius: 100,
    position: 'bottom-left' as Position,
    spacingBottom: 20,
    spacingLeft: 20,
    borderStyle: 'pulsar' as BorderStyle,
    color: '#000000',
    hideStories: false,
    ...(config ?? {}),
  };

  const scale = width / BASE_W;
  const height = BASE_H * scale;

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
      cfg.borderStyle === 'nenhum' || cfg.borderStyle === 'pulsar'
        ? cfg.borderStyle === 'pulsar'
          ? `2px solid ${cfg.color}`
          : 'none'
        : `2px ${cfg.borderStyle === 'tracejado' ? 'dashed' : 'solid'} ${cfg.color}`;
    return {
      position: 'absolute',
      width: w,
      height: h,
      borderRadius: radius,
      border: borderCss,
      overflow: 'hidden',
      background: 'linear-gradient(135deg,#a78bfa,#f472b6)',
      [isBottom ? 'bottom' : 'top']: cfg.spacingBottom,
      [isLeft ? 'left' : 'right']: cfg.spacingLeft,
      zIndex: 2,
    } as React.CSSProperties;
  }, [cfg]);

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-[10px] bg-neutral-900"
      style={{ width, height }}
      aria-hidden="true"
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: BASE_W,
          height: BASE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Phone outer frame */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#171717',
            borderRadius: 44,
            padding: 12,
          }}
        >
          {/* Screen */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              background: '#fff',
              borderRadius: 32,
              overflow: 'hidden',
            }}
          >
            {/* Notch */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#171717',
                height: 24,
                width: 110,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                zIndex: 5,
              }}
            />
            {/* Fake store grid */}
            <div style={{ padding: '32px 12px 0' }}>
              <div style={{ height: 22, background: '#e5e5e5', borderRadius: 6, width: '66%', marginBottom: 12 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {Array.from({ length: kind === 'carousel' ? 6 : 8 }).map((_, i) => (
                  <div key={i} style={{ aspectRatio: '1 / 1', borderRadius: 12, background: '#e5e5e5' }} />
                ))}
              </div>
            </div>
            {/* Widget bubble */}
            {!cfg.hideStories && <div style={bubbleStyle} />}
          </div>
        </div>
      </div>
    </div>
  );
}
