
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthInit } from "@/hooks/useAuthInit";
import { 
  getDashboardForType, 
  isAccessAllowed, 
  DASHBOARD_MAPPING 
} from "@/lib/config/access-control";
import { AccountType } from "@/lib/utils/account-type";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoadingStateSize } from "@/lib/utils/client-enums";

/**
 * AccessControlGuard
 * 
 * Centralized guard that STRICTLY enforces access rights.
 * Wraps the dashboard layout.
 */
export function AccessControlGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isInitialized, isAuthenticated, user } = useAuthInit();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Wait for auth to initialize
    if (!isInitialized) return;

    // 2. Ensure user is authenticated (Layout already handles this, but double check)
    if (!isAuthenticated || !user) {
      // Should be handled by layout, but if we get here, safe fallback
      return; 
    }

    const { accountType } = user;

    // 3. FAIL LOUDLY if account type is missing or invalid
    if (!accountType || !Object.values(AccountType).includes(accountType as AccountType)) {
       throw new Error(`CRITICAL: User has invalid or missing account type: ${accountType}`);
    }

    try {
      // 4. Determine current segment
      // pathname example: /dashboard/individual/overview -> segment: "individual"
      const segments = pathname.split("/").filter(Boolean);
      // segments[0] should be "dashboard"
      const contextSegment = segments[1]; // "individual" | "company" | "business"

      // 5. Handle Root Dashboard Access (/dashboard)
      // We allow access to /dashboard as it acts as the main dispatcher
      // The logic inside dashboard/page.tsx handles the specific content rendering
      if (!contextSegment) {
        setIsAuthorized(true);
        return;
      }

      // 6. Check Permissions
      // This throws ERROR for missing config (Failure Condition 6)
      const allowed = isAccessAllowed(contextSegment, accountType as AccountType);

      if (allowed) {
        setIsAuthorized(true);
      } else {
        // 7. Handle Unauthorized Access (Failure Condition 4)
        // Do NOT throw error. Log and Redirect.
        const targetDashboard = getDashboardForType(accountType as AccountType);
        
        console.warn(`[AccessGuard] ⛔ UNAUTHORIZED ACCESS ATTEMPT`);
        console.warn(`User (${accountType}) attempted to access restricted route: ${pathname}`);
        console.warn(`Redirecting to: ${targetDashboard}`);

        router.replace(targetDashboard);
      }

    } catch (error) {
      // Re-throw critical configuration errors
      throw error;
    }

  }, [isInitialized, isAuthenticated, user, pathname, router]);

  // Show nothing while checking (or loading state)
  if (!isAuthorized) {
    return (
       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <LoadingState message="Verifying permissions..." size={LoadingStateSize.Md} />
       </div>
    );
  }

  return <>{children}</>;
}
