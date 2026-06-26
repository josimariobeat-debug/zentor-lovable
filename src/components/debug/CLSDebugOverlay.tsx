import { useEffect, useState } from 'react';

/**
 * Dev-only overlay that displays the running CLS score and the top
 * elements that contributed layout shift on the current page.
 *
 * Enable with `?clsDebug=1` in the URL (persists in sessionStorage)
 * or by setting `sessionStorage.setItem('clsDebug', '1')`.
 *
 * Disable with `?clsDebug=0` or by removing the key.
 */
interface ShiftSource {
  selector: string;
  value: number;
}

interface LayoutShiftAttribution {
  node?: Node | null;
  previousRect: DOMRectReadOnly;
  currentRect: DOMRectReadOnly;
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources?: LayoutShiftAttribution[];
}

function describe(node: Node | null | undefined): string {
  if (!node || !(node instanceof Element)) return '(unknown)';
  const id = node.id ? `#${node.id}` : '';
  const evId = node.getAttribute?.('data-ev-id');
  const cls = node.className && typeof node.className === 'string'
    ? '.' + node.className.split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${node.tagName.toLowerCase()}${id}${cls}${evId ? `[${evId}]` : ''}`;
}

export default function CLSDebugOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [cls, setCls] = useState(0);
  const [sources, setSources] = useState<ShiftSource[]>([]);

  // Toggle logic
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const param = url.searchParams.get('clsDebug');
    if (param === '1') sessionStorage.setItem('clsDebug', '1');
    if (param === '0') sessionStorage.removeItem('clsDebug');
    setEnabled(sessionStorage.getItem('clsDebug') === '1');
  }, []);

  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === 'undefined') return;
    const aggregate = new Map<string, number>();
    let total = 0;

    const observer = new PerformanceObserver((list) => {
      for (const raw of list.getEntries()) {
        const entry = raw as LayoutShiftEntry;
        if (entry.hadRecentInput) continue;
        total += entry.value;
        for (const src of entry.sources ?? []) {
          const key = describe(src.node);
          aggregate.set(key, (aggregate.get(key) ?? 0) + entry.value);
        }
      }
      setCls(Math.round(total * 10000) / 10000);
      setSources(
        Array.from(aggregate.entries())
          .map(([selector, value]) => ({ selector, value: Math.round(value * 10000) / 10000 }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6),
      );
    });

    try {
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // Browser doesn't support layout-shift entries.
    }
    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled) return null;

  const color = cls < 0.1 ? '#10b981' : cls < 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 999999,
        background: 'rgba(17, 24, 39, 0.95)',
        color: 'white',
        padding: '10px 12px',
        borderRadius: 10,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        lineHeight: 1.45,
        minWidth: 280,
        maxWidth: 360,
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <strong>CLS Debug</strong>
        <span style={{ color, fontWeight: 700 }}>{cls.toFixed(4)}</span>
      </div>
      {sources.length === 0 ? (
        <div style={{ opacity: 0.6 }}>No layout shifts captured yet.</div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 16 }}>
          {sources.map((s) => (
            <li key={s.selector} style={{ marginBottom: 2 }}>
              <span style={{ color: '#fbbf24' }}>{s.value.toFixed(4)}</span>{' '}
              <span style={{ opacity: 0.85 }}>{s.selector}</span>
            </li>
          ))}
        </ol>
      )}
      <div style={{ marginTop: 6, opacity: 0.55 }}>?clsDebug=0 to disable</div>
    </div>
  );
}
