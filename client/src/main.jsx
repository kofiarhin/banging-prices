import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./main.styles.scss";
import "./clerk.styles.scss";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env");
}

const clerkAppearance = {
  baseTheme: dark,
  variables: {
    fontFamily: "Montserrat, sans-serif",
    colorPrimary: "#6d5cff",
    colorBackground: "#181a1f",
    colorText: "#f5f7fb",
    colorTextSecondary: "#a6afbf",
    colorInputBackground: "#12141a",
    colorInputText: "#f5f7fb",
    colorDanger: "#ff4d6d",
    borderRadius: "14px",
  },
  elements: {
    cardBox: "clerk-cardbox",
    card: "clerk-card",
    headerTitle: "clerk-title",
    headerSubtitle: "clerk-subtitle",
    socialButtonsBlockButton: "clerk-social-btn",
    socialButtonsBlockButtonText: "clerk-social-btn-text",
    dividerLine: "clerk-divider-line",
    dividerText: "clerk-divider-text",
    formFieldLabel: "clerk-label",
    formFieldInput: "clerk-input",
    formButtonPrimary: "clerk-primary-btn",
    footerActionText: "clerk-footer-text",
    footerActionLink: "clerk-footer-link",
    identityPreviewText: "clerk-muted",
    formFieldErrorText: "clerk-error",
  },
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={clerkAppearance}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
);
