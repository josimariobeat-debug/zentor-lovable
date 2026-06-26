import { createFileRoute } from "@tanstack/react-router";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { Toaster } from "@/components/ui/toaster";
import App from "@/App";

export const Route = createFileRoute("/$")({
  ssr: false,
  component: ZentorAppShell,
});

function ZentorAppShell() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </SubscriptionProvider>
    </AuthProvider>
  );
}
