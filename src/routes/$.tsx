import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

export const Route = createFileRoute("/$")({
  ssr: false,
  component: ZentorAppShell,
});

const ZentorApp = lazy(() => import("@/ZentorApp"));

function ZentorAppShell() {
  return (
    <Suspense fallback={null}>
      <ZentorApp />
    </Suspense>
  );
}
