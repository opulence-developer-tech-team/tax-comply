/**
 * useAuthInit Hook
 * 
 * Centralized authentication initialization hook that:
 * 1. Waits for Redux Persist rehydration
 * 2. Provides single source of truth for auth state
 * 
 * NOTE: Token validation is NOT done here because:
 * - Every API call already validates the token
 * - If token is invalid, API calls will return 401/403 and trigger logout
 * - This avoids unnecessary API calls on every page load
 * 
 * This hook MUST be used in the root layout/component to ensure
 * auth state is initialized before any child components render.
 * 
 * @example
 * function App() {
 *   const { isInitialized, isAuthenticated, user } = useAuthInit();
 *   
 *   if (!isInitialized) {
 *     return <LoadingState />;
 *   }
 *   
 *   return <YourApp />;
 * }
 */

import { useEffect, useState } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";

export interface AuthInitState {
  /** Whether auth initialization is complete (rehydration done) */
  isInitialized: boolean;
  /** Whether user is authenticated (based on persisted state) */
  isAuthenticated: boolean;
  /** Current user object (null if not authenticated) */
  user: any;
}

/**
 * Hook to initialize authentication state (rehydration only)
 * 
 * This hook:
 * - Waits for Redux Persist rehydration
 * - Returns persisted user state
 * 
 * Token validation is NOT done here because:
 * - Every API call already validates the token via middleware
 * - If token is invalid, API calls return 401/403 and trigger automatic logout
 * - This avoids unnecessary API calls on every page load
 * - Better UX: user sees content immediately, token validated on first API call
 * 
 * @returns AuthInitState with initialization status and user data
 */
export function useAuthInit(): AuthInitState {
  // Get persisted user state from Redux
  const userState = useAppSelector((state: any) => state.user);
  const persistedUser = userState?.user || null;
  const _persist = userState?._persist;
  
  // Local state for initialization
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Check if rehydration is complete
  const isRehydrated = _persist?.rehydrated === true;
  
  /**
   * Mark as initialized once rehydration completes
   * 
   * Set immediately to prevent unnecessary delays and flicker
   */
  useEffect(() => {
    if (isRehydrated && !isInitialized) {
      setIsInitialized(true);
    }
  }, [isRehydrated, isInitialized]);
  
  return {
    isInitialized,
    isAuthenticated: !!persistedUser,
    user: persistedUser,
  };
}

