import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const Route = createFileRoute("/$")({
  ssr: false,
  component: ZentorAppShell,
});

const ZentorApp = lazy(() => import("@/ZentorApp"));

function ZentorAppShell() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.id = "zentor-root";
    document.body.appendChild(el);
    setContainer(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);
  if (!container) return null;
  return createPortal(
    <Suspense fallback={null}>
      <ZentorApp />
    </Suspense>,
    container,
  );
}
