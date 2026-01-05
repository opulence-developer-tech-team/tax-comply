"use client";

import { useAppSelector } from "@/hooks/useAppSelector";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { EmployeesContent } from "@/components/dashboard/employees";

export default function BusinessEmployeesPage() {
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "BusinessEmployeesPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "BusinessEmployeesPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `BusinessEmployeesPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  const accountType = user.accountType;
  const isBusinessAccount = accountType === AccountType.Business;

  // CRITICAL: Validate account type is Business
  if (!isBusinessAccount) {
    throw new Error(
      `BusinessEmployeesPage: Invalid account type "${accountType}". Expected AccountType.Business.`
    );
  }

  // Get business state from Redux (already fetched in DashboardLayout)
  const { businesses, selectedBusinessId, isLoading: isLoadingBusiness, hasFetched: hasFetchedBusiness } = useAppSelector((state: any) => state.business);

  // CRITICAL: Determine entityId based on account type - fail loudly if missing
  // BUT: Show loading state if businesses exist but selection is pending (DashboardLayout useEffect will fix this)
  let entityId: string | null = null;
  let isLoadingEntity = false;
  
  if (isLoadingBusiness || (!hasFetchedBusiness) || (!selectedBusinessId && hasFetchedBusiness && businesses.length > 0)) {
    // Still fetching, not fetched yet, or businesses exist but none selected - show loading
    isLoadingEntity = true;
  } else if (!selectedBusinessId) {
    throw new Error(
      "BusinessEmployeesPage: selectedBusinessId is required for Business accounts. " +
      "A business must be selected before accessing employee management. " +
      "DashboardLayout should ensure a business is selected or redirect to onboarding."
    );
  } else {
    entityId = selectedBusinessId;
    isLoadingEntity = isLoadingBusiness;
  }

  // CRITICAL: Get subscription state - check loading state before accessing currentSubscription
  const { currentSubscription, isLoading: isLoadingSubscription, hasFetched: hasFetchedSubscription } = useAppSelector((state: any) => state.subscription);

  // CRITICAL: If entityId is still null but we're showing loading, return loading state
  // This prevents the page from trying to fetch data with a null entityId
  // Also check subscription loading state
  if ((!entityId && isLoadingEntity) || isLoadingSubscription || !hasFetchedSubscription) {
    return (
      <RouteGuard requireAccountType={[AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading employee management...">
        <LoadingState message="Initializing..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // CRITICAL: Fail loudly if subscription is missing after loading check
  if (!currentSubscription) {
    throw new Error(
      "BusinessEmployeesPage: currentSubscription is required. Subscription data must be fetched before rendering this page. " +
      "DashboardLayout should ensure subscription is loaded."
    );
  }
  
  if (!currentSubscription.plan) {
    throw new Error(
      "BusinessEmployeesPage: currentSubscription.plan is required. Subscription object must have plan property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate plan is a valid SubscriptionPlan enum value
  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentSubscription.plan)) {
    throw new Error(
      `BusinessEmployeesPage: Invalid subscription plan "${currentSubscription.plan}". ` +
      `Valid values are: ${validPlans.join(", ")}. ` +
      "Use SubscriptionPlan enum, not string literals."
    );
  }

  const currentPlan = currentSubscription.plan as SubscriptionPlan;

  // CRITICAL: Fail loudly if entityId is still null after loading check
  if (!entityId) {
    throw new Error("BusinessEmployeesPage: entityId is required but is null.");
  }

  return (
    <RouteGuard requireAccountType={[AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading employee management...">
      <EmployeesContent entityId={entityId} accountType={AccountType.Business} currentPlan={currentPlan} />
    </RouteGuard>
  );
}

