import { useRouter, usePathname } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import axios from "@/lib/axios";
import { toast } from "sonner";
import { HttpRequestConfigProps, AppError } from "@/types/http";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { performLogout, shouldTriggerLogout, getLogoutRedirectPath } from "@/lib/utils/logout";
import { getErrorMessage, getErrorType } from "@/components/shared/errorUtils";

export const useHttp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRetryable, setIsRetryable] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  
  // Store the last request config for retry functionality
  const lastRequestRef = useRef<HttpRequestConfigProps | null>(null);

  const clearError = useCallback(() => {
    setError(null);
    setIsRetryable(false);
  }, []);

  const sendHttpRequest = useCallback(
    async ({ successRes, errorRes, requestConfig }: HttpRequestConfigProps) => {
      setError(null);
      setSuccess(false);
      setIsRetryable(false);
      setIsLoading(true);
      
      // Store request config for retry functionality
      lastRequestRef.current = { successRes, errorRes, requestConfig };
      
      console.log("useHttp req", requestConfig);

      try {
        const isFormData = requestConfig.body instanceof FormData;
        const config = {
          ...(requestConfig.baseURL && { baseURL: requestConfig.baseURL }),
          ...(requestConfig.url && { url: `/api/v1${requestConfig.url}` }),
          method: requestConfig.method,
          headers: {
            ...(isFormData ? {} : { "Content-Type": requestConfig.contentType || "application/json" }),
          },
          ...(requestConfig.params && { params: requestConfig.params }),
          ...(requestConfig.body && { data: requestConfig.body }),
          ...(requestConfig.responseType && { responseType: requestConfig.responseType }),
        };

        const res = await axios.request(config);

        console.log("useHttp resss", res);

        if (res.status >= 200 && res.status < 300) {
          setIsLoading(false);
          setIsRetryable(false);
          
          // Show success state briefly for visual feedback
          setSuccess(true);
          
          if (requestConfig.successMessage) {
            toast.success(requestConfig.successMessage);
          }
          
          // Call success handler
          successRes(res);
          
          // Reset success state after animation completes (faster for speed perception)
          setTimeout(() => {
            setSuccess(false);
          }, 600); // Reduced from 1000ms to 600ms for faster feel
        }
      } catch (error: any) {
        console.log("useHttp error", error);
        
        // Log error details for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.log("[useHttp] Error details:", {
            status: error?.response?.status,
            hasResponse: !!error?.response,
            message: error?.message,
            code: error?.code,
          });
        }
        
        // Check if custom error handler wants to handle this
        // Pass error.response if it exists, otherwise pass the full error object
        // This allows error handlers to work with both HTTP errors (with response) and network errors (without response)
        if (errorRes) {
          // For axios errors, error.response contains the HTTP response
          // For network errors, error.response is undefined, so we pass the error itself
          const errorToPass = error?.response || error;
          
          // Log what we're passing to error handler (only in development)
          if (process.env.NODE_ENV === 'development') {
            console.log("[useHttp] Passing to error handler:", {
              status: errorToPass?.status,
              hasData: !!errorToPass?.data,
              source: error?.response ? 'error.response' : 'error (full object)',
            });
          }
          
          // Only call error handler if we have something meaningful to pass
          if (errorToPass) {
            const shouldUseCustomHandler = errorRes(errorToPass);
            if (shouldUseCustomHandler === false) {
              setError(null);
              setIsRetryable(false);
              setIsLoading(false);
              return;
            }
          }
        }

        // Use standardized error message utility
        const errorType = getErrorType(error);
        const errorMessage = getErrorMessage(error);
        
        // Determine if error is retryable (network errors and server errors)
        const retryable = errorType === "network" || errorType === "server";
        setIsRetryable(retryable);

        const isAuthEndpoint =
          error.config?.url?.includes("auth") ||
          error.config?.url?.includes("sign-in") ||
          error.config?.url?.includes("sign-up");

        const status = error.response?.status;
        const errorDescription = error.response?.data?.description || "";
        
        // Check if this is an account type mismatch error (authorization, not authentication)
        // These should NOT trigger logout - they're permission errors, not auth errors
        const isAccountTypeMismatch = errorDescription.toLowerCase().includes("account type") ||
          errorDescription.toLowerCase().includes("only available for") ||
          errorDescription.toLowerCase().includes("this feature is only available");
        
        // Handle automatic logout for 401/403 errors (except on auth endpoints and account type mismatches)
        // 401 = Authentication error (invalid/missing token) - always trigger logout
        // 403 = Could be auth error OR authorization error (account type mismatch)
        // For 403, only trigger logout if it's NOT an account type mismatch
        const shouldLogout = status === 401 || (status === 403 && !isAccountTypeMismatch);
        
        if (status && shouldLogout && !isAuthEndpoint) {
          // Don't show error toast for automatic logout
          setError(null);
          setIsRetryable(false);
          setIsLoading(false);
          
          // Detect if this is an admin route
          const isAdminRoute = pathname?.includes("/admin");
          
          // Use centralized logout function with session restoration
          performLogout({
            dispatch,
            router: {
              push: router.push.bind(router),
              replace: router.replace?.bind(router),
            },
            currentPathname: pathname || undefined,
            saveRedirectPath: true, // Save path for session restoration
            redirectPath: getLogoutRedirectPath(pathname || undefined),
            isAdmin: isAdminRoute,
          }).catch((err) => {
            console.error("Failed to perform logout:", err);
          });
          
          return;
        }

        setError({
          message: errorMessage,
          type: errorType,
          status: status,
          description: errorDescription || undefined,
        });
        setSuccess(false);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    },
    [router, pathname, dispatch]
  );

  // Retry function for network and server errors
  const retry = useCallback(() => {
    if (lastRequestRef.current && isRetryable) {
      sendHttpRequest(lastRequestRef.current);
    }
  }, [isRetryable, sendHttpRequest]);

  return {
    isLoading,
    sendHttpRequest,
    error,
    success,
    clearError,
    isRetryable,
    retry,
  };
};





