"use client";

import React, { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

interface ErrorBoundaryProviderProps {
  children: ReactNode;
  /**
   * Custom error handler
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Provider component that wraps children with ErrorBoundary
 * ErrorBoundary already handles route change resets via resetOnNavigation prop
 */
export function ErrorBoundaryProvider({
  children,
  onError,
}: ErrorBoundaryProviderProps) {
  return (
    <ErrorBoundary resetOnNavigation={true} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}
















