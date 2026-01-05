/**
 * Centralized Logout Utility
 * 
 * This function provides a single source of truth for logout behavior.
 * It handles:
 * - Clearing all Redux state (including persisted state)
 * - Clearing all browser storage (localStorage, sessionStorage)
 * - Redirecting to login page
 * - Handling both manual and automatic logout scenarios
 * 
 * Use this function for:
 * - Manual logout (user clicks logout button)
 * - Automatic logout (401/403 API responses)
 * - Token expiration
 * - Invalid session scenarios
 */

import { persistor } from "@/store/redux";
import { resetAllState } from "@/store/redux/rootActions";
import { userActions } from "@/store/redux/user/user-slice";
import { adminActions } from "@/store/redux/admin/admin-slice";
import type { AppDispatch } from "@/store/redux";

interface LogoutOptions {
  /**
   * Whether to redirect to login page after logout
   * @default true
   */
  redirect?: boolean;
  
  /**
   * Custom redirect path (defaults to /sign-in or /admin/login)
   */
  redirectPath?: string;
  
  /**
   * Whether to save current pathname for redirect after login
   * @default false
   */
  saveRedirectPath?: boolean;
  
  /**
   * Current pathname (required if saveRedirectPath is true)
   */
  currentPathname?: string;
  
  /**
   * Redux dispatch function (required)
   */
  dispatch: AppDispatch;
  
  /**
   * Router instance for navigation (required if redirect is true)
   */
  router?: {
    push: (path: string) => void;
    replace?: (path: string) => void;
  };
  
  /**
   * Whether this is an admin logout (defaults to false)
   * @default false
   */
  isAdmin?: boolean;
}

/**
 * Application-specific localStorage keys that should be cleared on logout
 */
const APP_LOCAL_STORAGE_KEYS = [
  "taxcomply_share_prompt_dismissed",
  "taxcomply_review_intent",
  "taxcomply_review_data",
  "taxcomply_referral_info",
  "taxcomply_vat_filters_expanded",
  "redirectAfterLogin", // User session restoration
  "adminRedirectAfterLogin", // Admin session restoration
  // Add any other app-specific keys here
];

/**
 * Application-specific sessionStorage keys that should be cleared on logout
 */
const APP_SESSION_STORAGE_KEYS = [
  "redirectAfterLogin",
  "pending_review_data",
  "pending_review_source",
  // Add any other app-specific keys here
];

/**
 * Clear all application-specific localStorage items
 */
function clearApplicationLocalStorage(): void {
  if (typeof window === "undefined") return;
  
  try {
    // Clear known application keys
    APP_LOCAL_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
    
      // Clear any keys that start with our app prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("taxcomply_") || key.startsWith("persist:"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });
      
      // Clear persist:admin if it exists (for admin logout)
      try {
        localStorage.removeItem("persist:admin");
      } catch (e) {
        // Ignore errors
      }
  } catch (error) {
    console.error("Failed to clear application localStorage:", error);
  }
}

/**
 * Clear all application-specific sessionStorage items
 */
function clearApplicationSessionStorage(): void {
  if (typeof window === "undefined") return;
  
  try {
    // Clear known application keys
    APP_SESSION_STORAGE_KEYS.forEach((key) => {
      sessionStorage.removeItem(key);
    });
    
    // Clear any keys that start with our app prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("taxcomply_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  } catch (error) {
    console.error("Failed to clear application sessionStorage:", error);
  }
}

/**
 * Clear all Redux persisted state
 * 
 * Simplified version that:
 * 1. Pauses persistor to prevent new writes
 * 2. Purges persisted state
 * 3. Manually clears localStorage as fallback
 * 
 * This is called synchronously during logout to ensure complete cleanup.
 */
async function clearReduxPersistedState(): Promise<void> {
  try {
    // Pause persistor to prevent any new writes
    persistor.pause();
    
    // Purge all persisted state
    // Note: This is async but we don't need to wait for it to complete
    // The manual localStorage clearing below ensures cleanup even if purge fails
    persistor.purge().catch((error) => {
      console.warn("Persistor purge failed (will use manual cleanup):", error);
    });
    
    // Manually clear all persist keys immediately (synchronous fallback)
    if (typeof window !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("persist:")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove ${key} from localStorage:`, error);
        }
      });
    }
  } catch (error) {
    console.error("Failed to clear Redux persisted state:", error);
    // Even if purge fails, try to clear localStorage directly
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("persist:")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (localError) {
            console.warn(`Failed to remove ${key}:`, localError);
          }
        });
      } catch (localError) {
        console.error("Failed to clear persist keys from localStorage:", localError);
      }
    }
  }
}

/**
 * Centralized logout function
 * 
 * This is the single source of truth for logout behavior.
 * All logout scenarios (manual, 401, 403, token expiration) should use this function.
 * 
 * @param options - Logout configuration options
 * 
 * @example
 * // Manual logout
 * performLogout({
 *   dispatch,
 *   router,
 *   currentPathname: pathname,
 *   saveRedirectPath: true,
 * });
 * 
 * @example
 * // Automatic logout on 401
 * performLogout({
 *   dispatch,
 *   router,
 *   redirect: true,
 * });
 */
export async function performLogout(options: LogoutOptions): Promise<void> {
  const {
    redirect = true,
    redirectPath,
    saveRedirectPath = false,
    currentPathname,
    dispatch,
    router,
    isAdmin = false,
  } = options;

  try {
    // Step 1: Clear all Redux state slices (synchronous)
    dispatch(resetAllState());
    
    // Clear user or admin state based on logout type (synchronous)
    if (isAdmin) {
      dispatch(adminActions.clearAdmin());
    } else {
      dispatch(userActions.clearUser());
    }

    // Step 2: Clear Redux persisted state (async, but we don't wait)
    // This runs in background - manual localStorage clearing below ensures cleanup
    clearReduxPersistedState().catch((err) => {
      console.warn("Failed to clear persisted state (using manual cleanup):", err);
    });

    // Step 3: Clear all application-specific localStorage (synchronous)
    clearApplicationLocalStorage();

    // Step 4: Clear all application-specific sessionStorage (synchronous)
    clearApplicationSessionStorage();

    // Step 5: Save redirect path if requested (for post-login redirect)
    if (saveRedirectPath && currentPathname && typeof window !== "undefined") {
      // Only save if it's not already a login page
      const isLoginPage = currentPathname.includes("/sign-in") ||
                         currentPathname.includes("/sign-up") ||
                         currentPathname.includes("/verify-email") ||
                         currentPathname.includes("/admin/login");
      
      if (!isLoginPage) {
        const storageKey = isAdmin ? "adminRedirectAfterLogin" : "redirectAfterLogin";
        sessionStorage.setItem(storageKey, currentPathname);
      }
    }

    // Step 6: Redirect to login page
    if (redirect && router) {
      const finalRedirectPath = redirectPath || (isAdmin ? "/admin/login" : "/sign-in");
      // Use replace instead of push to prevent back button navigation to protected pages
      if (router.replace) {
        router.replace(finalRedirectPath);
      } else {
        router.push(finalRedirectPath);
      }
    }
  } catch (error) {
    console.error("Error during logout:", error);
    // Even if there's an error, try to redirect
    if (redirect && router) {
      const finalRedirectPath = redirectPath || (isAdmin ? "/admin/login" : "/sign-in");
      if (router.replace) {
        router.replace(finalRedirectPath);
      } else {
        router.push(finalRedirectPath);
      }
    }
    throw error;
  }
}

/**
 * Check if a response status should trigger automatic logout
 */
export function shouldTriggerLogout(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * Get appropriate redirect path based on current pathname
 */
export function getLogoutRedirectPath(currentPathname?: string): string {
  if (currentPathname?.includes("admin")) {
    return "/admin/login";
  }
  return "/sign-in";
}

