import { useMemo } from 'react';
import type { MiniConfig } from './AppearanceMiniPreview';

interface Props {
  config: MiniConfig | null | undefined;
  kind?: 'floating' | 'carousel';
  /** Largura do thumb em px. Altura é calculada com aspect 16/10. */
  width?: number;
}

const BASE_W = 480;
const BASE_H = 300;

/**
 * Render reduzido do preview de desktop (browser) com a bolha do widget posicionada.
 * Espelha a configuração salva (forma, cor, borda, posição, espaçamento).
 */
export default function AppearanceMiniPreviewDesktop({
  config,
  kind = 'floating',
  width = 104,
}: Props) {
  const cfg = {
    shape: 'circular' as const,
    width: 100,
    widthUnit: 'px' as const,
    height: 100,
    borderRadius: 100,
    position: 'bottom-left' as const,
    spacingBottom: 20,
    spacingLeft: 20,
    borderStyle: 'pulsar' as const,
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
        {/* Browser frame */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#171717',
            borderRadius: 16,
            padding: 8,
          }}
        >
          {/* Title bar */}
          <div
            style={{
              height: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
            <div
              style={{
                marginLeft: 12,
                flex: 1,
                height: 16,
                background: '#262626',
                borderRadius: 8,
              }}
            />
          </div>
          {/* Viewport */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 'calc(100% - 32px)',
              background: '#fff',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {/* Fake store grid */}
            <div style={{ padding: '20px 24px 0' }}>
              <div
                style={{
                  height: 22,
                  background: '#e5e5e5',
                  borderRadius: 6,
                  width: '40%',
                  marginBottom: 16,
                }}
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                }}
              >
                {Array.from({ length: kind === 'carousel' ? 4 : 8 }).map((_, i) => (
                  <div
                    key={i}
                    style={{ aspectRatio: '1 / 1', borderRadius: 10, background: '#e5e5e5' }}
                  />
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
