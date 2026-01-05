"use client";

/**
 * Business WHT Page
 * 
 * Dedicated page for Business accounts to manage WHT (Withholding Tax).
 * Validates account type, determines entityId, validates subscription, and renders shared WHTContent component.
 * 
 * CRITICAL REQUIREMENTS (Ruthless Mentor Standards):
 * - Only accessible to AccountType.Business accounts
 * - Must have selectedBusinessId before rendering
 * - Must have valid subscription before rendering
 * - All validation must fail loudly (throw errors) - no defaults, no fallbacks, no auto-assignment
 * - Uses enums, not string literals
 * - Production-ready, bulletproof code
 */

import { useAppSelector } from "@/hooks/useAppSelector";
import { LoadingState } from "@/components/shared/LoadingState";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { WHTContent } from "@/components/dashboard/wht";

export default function BusinessWHTPage() {
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "BusinessWHTPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "BusinessWHTPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `BusinessWHTPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  const accountType = user.accountType;

  // CRITICAL: Validate account type is Business - fail loudly if not
  if (accountType !== AccountType.Business) {
    throw new Error(
      `BusinessWHTPage: Invalid account type "${accountType}". ` +
      `Expected AccountType.Business. ` +
      "This page is exclusively for Business accounts. Company accounts should use /dashboard/wht. " +
      "Individual accounts do not have WHT management."
    );
  }

  // Get business state from Redux (already fetched in DashboardLayout)
  const { businesses, selectedBusinessId, isLoading: isLoadingBusiness, hasFetched: hasFetchedBusiness } = useAppSelector((state: any) => state.business);

  // CRITICAL: Determine entityId based on account type - fail loudly if missing
  let entityId: string | null = null;
  let isLoadingEntity = false;
  
  if (isLoadingBusiness || !hasFetchedBusiness || (hasFetchedBusiness && businesses.length > 0 && !selectedBusinessId)) {
    isLoadingEntity = true;
  } else if (!selectedBusinessId) {
    throw new Error(
      "BusinessWHTPage: selectedBusinessId is required for Business accounts. " +
      "A business must be selected before accessing WHT management. " +
      "DashboardLayout should ensure a business is selected or redirect to onboarding."
    );
  } else {
    entityId = selectedBusinessId;
    isLoadingEntity = isLoadingBusiness;
  }

  // CRITICAL: Get subscription state - check loading state before accessing currentSubscription
  const { currentSubscription, isLoading: isLoadingSubscription, hasFetched: hasFetchedSubscription } = useAppSelector((state: any) => state.subscription);

  // CRITICAL: If entityId is still null but we're showing loading, return loading state
  // Also check subscription loading state
  if ((!entityId && isLoadingEntity) || isLoadingSubscription || !hasFetchedSubscription) {
    return (
      <RouteGuard requireAccountType={[AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading WHT management...">
        <LoadingState message="Initializing..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // CRITICAL: Fail loudly if subscription is missing after loading check
  if (!currentSubscription) {
    throw new Error(
      "BusinessWHTPage: currentSubscription is required. Subscription data must be fetched before rendering this page. " +
      "DashboardLayout should ensure subscription is loaded."
    );
  }
  
  if (!currentSubscription.plan) {
    throw new Error(
      "BusinessWHTPage: currentSubscription.plan is required. Subscription object must have plan property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate plan is a valid SubscriptionPlan enum value
  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentSubscription.plan)) {
    throw new Error(
      `BusinessWHTPage: Invalid subscription plan "${currentSubscription.plan}". ` +
      `Valid values are: ${validPlans.join(", ")}. ` +
      "Use SubscriptionPlan enum, not string literals."
    );
  }

  const currentPlan = currentSubscription.plan as SubscriptionPlan;

  // CRITICAL: entityId must be set at this point - fail loudly if not
  if (!entityId) {
    throw new Error(
      "BusinessWHTPage: entityId is required but is null. " +
      "This should never happen - entityId validation should have caught this. " +
      "This is a critical logic error."
    );
  }

  return (
    <RouteGuard requireAccountType={[AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading WHT management...">
      <WHTContent entityId={entityId} accountType={AccountType.Business} currentPlan={currentPlan} />
    </RouteGuard>
  );
}

