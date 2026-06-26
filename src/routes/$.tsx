import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

export const Route = createFileRoute("/$")({
  ssr: false,
  component: ZentorAppShell,
});

const ZentorApp = lazy(() => import("@/ZentorApp"));

function ZentorAppShell() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <ZentorApp />
    </Suspense>
  );
}
