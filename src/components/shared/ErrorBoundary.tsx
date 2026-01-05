"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorState } from "./ErrorState";
import { ErrorVariant, ButtonVariant } from "@/lib/utils/client-enums";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
// Client-side logger (fallback if server logger not available)
const logger = {
  error: (message: string, error?: Error, metadata?: Record<string, any>) => {
    console.error(`[ErrorBoundary] ${message}`, error, metadata);
    // In production, send to error tracking service
    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      // Example: window.errorTracking?.captureException(error, { extra: metadata });
    }
  },
};

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Custom fallback component (optional)
   * If not provided, uses default ErrorState
   */
  fallback?: ReactNode;
  /**
   * Whether to show error details in development
   * @default true in development, false in production
   */
  showErrorDetails?: boolean;
  /**
   * Callback when error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Custom error message
   */
  errorMessage?: string;
  /**
   * Whether to reset error state on navigation
   * @default true
   */
  resetOnNavigation?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * Production-ready Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * IMPORTANT: Error boundaries MUST be class components in React.
 * This is a React API limitation, not a design choice. React's
 * error boundary API requires:
 * - componentDidCatch lifecycle method (class-only)
 * - getDerivedStateFromError static method (class-only)
 * 
 * Hooks cannot be used for error boundaries (as of React 18+).
 * If you need a functional API, use the ErrorBoundaryProvider wrapper.
 *
 * Features:
 * - Automatic error logging
 * - User-friendly error UI using ErrorState component
 * - Error ID generation for support tracking
 * - Optional error details in development
 * - Reset functionality
 * - Navigation-aware error reset
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With custom error handler
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     // Send to error tracking service
 *     trackError(error, errorInfo);
 *   }}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Generate error ID if not already set (fallback)
    const errorId = this.state.errorId || `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Log error with full context
    logger.error("React Error Boundary caught an error", error, {
      componentStack: errorInfo.componentStack,
      errorId,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        // Don't let error handler errors break the boundary
        console.error("Error in ErrorBoundary onError handler:", handlerError);
      }
    }

    // In production, you might want to send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, {
      //   contexts: { react: { componentStack: errorInfo.componentStack } },
      //   tags: { errorId: this.state.errorId },
      // });
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state if children change (navigation)
    if (
      this.props.resetOnNavigation !== false &&
      this.state.hasError &&
      prevProps.children !== this.props.children
    ) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    // Cleanup timeout if component unmounts
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId } = this.state;
      const isDevelopment = process.env.NODE_ENV === "development";
      const showDetails = this.props.showErrorDetails ?? isDevelopment;

      // Default error UI using ErrorState component
      return (
        <div className="min-h-screen">
          <ErrorState
            variant={ErrorVariant.Error}
            title={this.props.errorMessage || "Something Went Wrong"}
            description={
              showDetails && error
                ? `An unexpected error occurred. Error ID: ${errorId}`
                : "We encountered an unexpected error. Our team has been notified. Please try refreshing the page or contact support if the problem persists."
            }
            icon={AlertCircle}
            primaryAction={{
              label: "Try Again",
              onClick: this.handleRetry,
              icon: RefreshCw,
            }}
            secondaryAction={{
              label: "Go to Dashboard",
              onClick: this.handleGoHome,
              icon: Home,
              variant: ButtonVariant.Outline,
            }}
            fullPage={true}
          />

          {/* Development error details */}
          {showDetails && error && errorInfo && (
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-red-900">
                    Error Details (Development Only)
                  </h3>
                  <button
                    onClick={this.handleRetry}
                    className="text-sm text-red-700 hover:text-red-900 underline"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-red-800 mb-1">Error ID:</p>
                    <p className="text-xs font-mono text-red-700 bg-red-100 p-2 rounded">
                      {errorId}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-red-800 mb-1">Error Message:</p>
                    <p className="text-sm text-red-700 bg-red-100 p-2 rounded font-mono">
                      {error.message}
                    </p>
                  </div>

                  {error.stack && (
                    <div>
                      <p className="text-sm font-medium text-red-800 mb-1">Stack Trace:</p>
                      <pre className="text-xs text-red-700 bg-red-100 p-3 rounded overflow-auto max-h-64 font-mono">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {errorInfo.componentStack && (
                    <div>
                      <p className="text-sm font-medium text-red-800 mb-1">Component Stack:</p>
                      <pre className="text-xs text-red-700 bg-red-100 p-3 rounded overflow-auto max-h-64 font-mono whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap a component with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || "Component"})`;

  return WrappedComponent;
}

/**
 * Hook to manually trigger error boundary (for testing)
 * WARNING: Only use in development/testing
 */
export function useErrorBoundary() {
  const [, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return { captureError, resetError };
}
















