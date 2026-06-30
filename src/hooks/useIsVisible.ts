import { useEffect, useState, type RefObject } from 'react';

/**
 * Returns true when the referenced element is intersecting the viewport.
 * Used to hide a "duplicate" header CTA when the in-page CTA is visible.
 */
export function useIsVisible(
  ref: RefObject<Element | null>,
  options: IntersectionObserverInit = { threshold: 0.01 },
): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), options);
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
  return visible;
}
