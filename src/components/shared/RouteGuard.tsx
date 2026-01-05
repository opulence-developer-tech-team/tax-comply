"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/hooks/useAppSelector";
import { LoadingState } from "./LoadingState";
import { AccountType } from "@/lib/utils/account-type";
import { ErrorState } from "./ErrorState";

interface RouteGuardProps {
  children: React.ReactNode;
  requireAccountType: AccountType | AccountType[]; // CRITICAL: No longer optional - must be explicitly specified
  redirectTo?: string; // DEPRECATED: All unauthorized access redirects to /dashboard - this prop is ignored for account type mismatches
  loadingMessage?: string;
}

/**
 * RouteGuard component to protect routes based on account type
 * 
 * BULLETPROOF ENFORCEMENT:
 * - requireAccountType is REQUIRED (no optional/undefined allowed)
 * - ALL unauthorized access redirects to "/dashboard" (consistent behavior)
 * - Fails loudly with ErrorState if user.accountType is invalid or missing
 * - Uses strict enum checks - no string literal unions
 * - No auto-assignment, no defaults, no fallbacks
 * 
 * CRITICAL: When user's account type doesn't match requireAccountType, user is ALWAYS
 * redirected to "/dashboard" regardless of redirectTo prop value.
 * This ensures consistent behavior across the application.
 * 
 * @example
 * // Protect a company-only route
 * <RouteGuard requireAccountType={AccountType.Company}>
 *   <YourCompanyPage />
 * </RouteGuard>
 * 
 * @example
 * // Protect a route accessible by both Company and Business
 * <RouteGuard requireAccountType={[AccountType.Company, AccountType.Business]}>
 *   <SharedPage />
 * </RouteGuard>
 */
export function RouteGuard({
  children,
  requireAccountType,
  redirectTo,
  loadingMessage = "Loading...",
}: RouteGuardProps) {
  const router = useRouter();
  const { user, hasFetched } = useAppSelector((state: any) => state.user);
  const [isClient, setIsClient] = useState(false);

  // CRITICAL: Validate requireAccountType prop - fail loudly if invalid
  useEffect(() => {
    if (!requireAccountType) {
      throw new Error(
        "RouteGuard: requireAccountType prop is required. " +
        "You must explicitly specify which account type(s) can access this route. " +
        "Use AccountType enum: AccountType.Company, AccountType.Business, or AccountType.Individual"
      );
    }

    // Normalize to array for validation
    const allowedTypes = Array.isArray(requireAccountType) ? requireAccountType : [requireAccountType];
    
    // Validate each type is a valid AccountType enum value
    const validAccountTypes = Object.values(AccountType);
    for (const type of allowedTypes) {
      if (!validAccountTypes.includes(type)) {
        throw new Error(
          `RouteGuard: Invalid account type "${type}" in requireAccountType. ` +
          `Valid values are: ${validAccountTypes.join(", ")}. ` +
          "Use AccountType enum, not string literals."
        );
      }
    }
  }, [requireAccountType]);

  // Wait for client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Wait for client-side hydration
    if (!isClient) return;

    // If user exists (from persistence or fetch), we know auth state is ready
    // If user doesn't exist and hasFetched is true, user is not authenticated
    if (hasFetched && !user) {
      // User not authenticated - redirect to sign-in
      router.push("/sign-in");
      return;
    }

    // If user exists, check account type requirement
    if (user && requireAccountType) {
      // CRITICAL: Validate user.accountType exists and is valid - fail loudly if not
      if (!user.accountType) {
        console.error(
          "[RouteGuard] CRITICAL: user.accountType is missing. " +
          "This should never happen - user object must have accountType property."
        );
        // Don't throw here (React error boundary would catch), but log and redirect
        router.push("/sign-in");
        return;
      }

      // CRITICAL: Validate user.accountType is a valid enum value
      const validAccountTypes = Object.values(AccountType);
      if (!validAccountTypes.includes(user.accountType)) {
        console.error(
          `[RouteGuard] CRITICAL: user.accountType "${user.accountType}" is not a valid AccountType enum value. ` +
          `Valid values are: ${validAccountTypes.join(", ")}.`
        );
        router.push("/sign-in");
        return;
      }

      // Normalize requireAccountType to array
      const allowedTypes = Array.isArray(requireAccountType) ? requireAccountType : [requireAccountType];
      
      // Check if user's account type is allowed
      if (!allowedTypes.includes(user.accountType)) {
        // CRITICAL: Account type mismatch - ALWAYS redirect to /dashboard
        // This ensures consistent behavior: all unauthorized access redirects to dashboard
        // redirectTo prop is ignored for account type mismatches to maintain consistency
        // Use replace instead of push to prevent adding unauthorized pages to browser history
        console.log(
          "[RouteGuard] Account type mismatch - redirecting to dashboard. " +
          `User account type: ${user.accountType}, Required: ${allowedTypes.join(" or ")}. ` +
          "All unauthorized access redirects to /dashboard for consistency."
        );
        router.replace("/dashboard");
        return;
      }
    }
  }, [isClient, user, hasFetched, requireAccountType, redirectTo, router]);

  // Show loading while checking auth
  // If user exists, we're ready (even if hasFetched is false, user from persistence is valid)
  // If user doesn't exist, wait for hasFetched to be true to confirm no user
  if (!isClient || (!user && !hasFetched)) {
    return <LoadingState message={loadingMessage} />;
  }

  // CRITICAL: Validate user.accountType before checking access
  if (user) {
    if (!user.accountType) {
      // Fail loudly - show error state instead of silently failing
      return (
        <ErrorState
          title="Account Error"
          description="Your account type is missing. Please contact support or try logging in again."
          primaryAction={{
            label: "Go to Login",
            onClick: () => router.push("/sign-in"),
          }}
        />
      );
    }

    // Validate accountType is a valid enum value
    const validAccountTypes = Object.values(AccountType);
    if (!validAccountTypes.includes(user.accountType)) {
      return (
        <ErrorState
          title="Invalid Account Type"
          description={`Your account type "${user.accountType}" is invalid. Valid types: ${validAccountTypes.join(", ")}. Please contact support.`}
          primaryAction={{
            label: "Go to Login",
            onClick: () => router.push("/sign-in"),
          }}
        />
      );
    }

    // Check account type requirement
    if (requireAccountType) {
      const allowedTypes = Array.isArray(requireAccountType) ? requireAccountType : [requireAccountType];
      if (!allowedTypes.includes(user.accountType)) {
        return <LoadingState message="Redirecting..." />;
      }
    }
  }

  return <>{children}</>;
}





