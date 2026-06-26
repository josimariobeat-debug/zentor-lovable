import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

export const Route = createFileRoute("/$")({
  ssr: false,
  component: ZentorAppShell,
});

function ZentorAppShell() {
  const mountedRef = useRef(false);
  const rootRef = useRef<Root | null>(null);
  const elRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const el = document.createElement("div");
    el.id = "zentor-root";
    document.body.appendChild(el);
    elRef.current = el;
    const root = createRoot(el);
    rootRef.current = root;
    import("@/ZentorApp").then(({ default: ZentorApp }) => {
      root.render(<ZentorApp />);
    });
    return () => {
      setTimeout(() => {
        rootRef.current?.unmount();
        if (elRef.current && elRef.current.parentNode) {
          elRef.current.parentNode.removeChild(elRef.current);
        }
      }, 0);
    };
  }, []);

  return null;
}
