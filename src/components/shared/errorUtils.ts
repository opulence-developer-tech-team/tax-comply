/**
 * Error utility functions for determining error types and creating error configurations
 */

import { AxiosError } from "axios";
import { ErrorType } from "@/lib/utils/client-enums";

/**
 * Determines the error type from an axios error response
 * 
 * CRITICAL: Network errors are detected first to enable retry functionality
 */
export function getErrorType(error: unknown): ErrorType {
  if (!error || typeof error !== "object") {
    return ErrorType.Generic;
  }

  // Check for network errors NRST (before response errors)
  // This includes axios network errors and standard Error objects with network messages
  if ("code" in error) {
    if (
      // @ts-ignore
      error.code === "ERR_NETWORK" ||
      // @ts-ignore
      error.code === "ECONNABORTED" ||
      // @ts-ignore
      error.code === "ECONNREFUSED" ||
      // @ts-ignore
      error.code === "ETIMEDOUT"
    ) {
      return ErrorType.Network;
    }
  }

  // Check for network errors in Error messages (fetch API errors)
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes("failed to fetch") ||
      errorMessage.includes("networkerror") ||
      errorMessage.includes("network request failed") ||
      errorMessage.includes("networkerror when attempting to fetch")
    ) {
      return ErrorType.Network;
    }
  }

  // Check for axios error response
  if ("response" in error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    if (status === 401 || status === 403) {
      return ErrorType.Authorization;
    }

    if (status === 404) {
      return ErrorType.NotFound;
    }

    // Server errors (500+) - always return "server" type
    // Message will be standardized to "Something went wrong"
    if (status && status >= 500) {
      return ErrorType.Server;
    }
  }

  return ErrorType.Generic;
}

/**
 * Extracts a user-friendly error message from an error object
 * 
 * CRITICAL: All server errors (500+) MUST return "Something went wrong"
 * to prevent exposing internal server details to users.
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  // Axios error with response data
  if ("response" in error) {
    const axiosError = error as AxiosError<{ description?: string; message?: string }>;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;

    // CRITICAL: All server errors (500+) return standardized message
    // This prevents exposing internal server details, stack traces, or error codes
    if (status && status >= 500) {
      return "Something went wrong";
    }

    // For client errors (400-499), we can show specific messages
    // but only if they're safe user-facing messages
    if (status && status >= 400 && status < 500) {
      // Use server-provided message for client errors (validation, auth, etc.)
      if (data?.description) {
        return data.description;
      }
      if (data?.message) {
        return data.message;
      }
      // Fallback to status text for client errors
      if (axiosError.response?.statusText) {
        return axiosError.response.statusText;
      }
    }
  }

  // Network error - these are handled separately with retry functionality
  if ("code" in error) {
    if (
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ETIMEDOUT"
    ) {
      return "Network error. Please check your internet connection.";
    }
    if (error.code === "ECONNABORTED") {
      return "Request timed out. Please try again.";
    }
  }

  // Standard Error object - check for network-related messages
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes("failed to fetch") ||
      errorMessage.includes("networkerror") ||
      errorMessage.includes("network request failed") ||
      errorMessage.includes("networkerror when attempting to fetch")
    ) {
      return "Network error. Please check your internet connection.";
    }
    if (errorMessage.includes("timeout") || errorMessage.includes("aborted")) {
      return "Request timed out. Please try again.";
    }
    // For other errors, return the message only if it's not a server error
    return error.message || fallback;
  }

  return fallback;
}

/**
 * Creates error state props from an error object
 */
export function createErrorStateProps(error: unknown) {
  const errorType = getErrorType(error);
  const errorMessage = getErrorMessage(error);

  return {
    type: errorType,
    description: errorMessage,
  };
}












