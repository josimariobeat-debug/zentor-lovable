import { BrowserRouter } from "react-router";
import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { Toaster } from "@/components/ui/toaster";
import App from "@/App";

// Suppress known harmless React 19 + react-router v7 dev warning where
// BrowserRouter's initial subscription triggers a state update during the
// TanStack Transitioner render cycle. It does not affect runtime behavior.
if (typeof window !== "undefined" && import.meta.env.DEV) {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      first.includes("Cannot update a component") &&
      args.some((a) => a === "Transitioner" || a === "BrowserRouter")
    ) {
      return;
    }
    origError(...args);
  };
}

export default function ZentorApp() {
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
