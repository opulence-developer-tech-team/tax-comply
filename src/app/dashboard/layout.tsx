"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuthInit } from "@/hooks/useAuthInit";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { AccessControlGuard } from "@/components/auth/AccessGuard";

/**
 * Dashboard Layout with Auth Initialization
 * 
 * This layout ensures:
 * - Component is fully mounted (client-side only)
 * - Redux Persist rehydration completes (user data available)
 * - User is authenticated (redirects to sign-in if not)
 * 
 * CRITICAL: Children are NOT rendered until:
 * 1. Component is mounted (prevents hydration mismatches)
 * 2. Rehydration is complete (user data is available)
 * 3. User is authenticated (redirects unauthenticated users to sign-in)
 * 
 * NOTE: Token validation is NOT done here because:
 * - Every API call already validates the token via middleware
 * - If token is invalid, API calls return 401/403 and trigger automatic logout
 * - This avoids unnecessary API calls on every page load
 * - Better UX: user sees content immediately, token validated on first API call
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isInitialized, isAuthenticated } = useAuthInit();
  const [isMounted, setIsMounted] = useState(false);
  
  // Track component mount (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // CRITICAL: Redirect unauthenticated users to sign-in
  // This must happen AFTER rehydration completes (isInitialized = true)
  // to avoid redirecting users who are actually authenticated but rehydration hasn't completed yet
  useEffect(() => {
    if (isMounted && isInitialized && !isAuthenticated) {
      console.log("[DashboardLayout] 🔒 User not authenticated, redirecting to sign-in");
      router.replace("/sign-in");
    }
  }, [isMounted, isInitialized, isAuthenticated, router]);
  
  // CRITICAL: Block rendering until:
  // 1. Component is mounted (client-side only, prevents hydration mismatches)
  // 2. Rehydration is complete (user data available from localStorage)
  // 3. User is authenticated (if not authenticated, redirect happens above)
  // 
  // Use a fixed layout to prevent flicker - maintain same structure during loading
  if (!isMounted || !isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Loading..." size={LoadingStateSize.Md} />
      </div>
    );
  }
  
  // Only render dashboard after:
  // 1. Component is mounted
  // 2. Rehydration is complete
  // 3. User is authenticated
  // Error handling for API requests (like company fetch) is done in DashboardLayout
  
  // CRITICAL: ACCESS CONTROL ENFORCEMENT
  // We wrap the entire dashboard logic in the guard to ensure:
  // 1. User has a valid account type
  // 2. User is accessing a route permitted for their type
  // 3. Unauthorized access is logged and redirected
  return (
    <AccessControlGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </AccessControlGuard>
  );
}












