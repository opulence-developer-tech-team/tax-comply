"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ReactNode } from "react";
import store, { persistor } from "@/store/redux";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { LoadingState } from "@/components/shared/LoadingState";

interface ClientProviderProps {
  children: ReactNode;
}

export default function ClientProvider({ children }: ClientProviderProps) {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        {/* PersistGate with null loading to prevent double loading states */}
        {/* The dashboard layout will handle the loading state */}
        <PersistGate loading={null} persistor={persistor}>
          <ScrollToTop />
          {children}
          <Toaster position="top-right" />
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}





