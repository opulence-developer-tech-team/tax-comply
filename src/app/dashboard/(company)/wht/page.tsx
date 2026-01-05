"use client";

/**
 * Company WHT Page
 * 
 * Dedicated page for Company accounts to manage WHT (Withholding Tax).
 * Validates account type, determines entityId, validates subscription, and renders shared WHTContent component.
 * 
 * CRITICAL REQUIREMENTS (Ruthless Mentor Standards):
 * - Only accessible to AccountType.Company accounts
 * - Must have selectedCompanyId before rendering
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

export default function CompanyWHTPage() {
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "CompanyWHTPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "CompanyWHTPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `CompanyWHTPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  const accountType = user.accountType;

  // CRITICAL: Validate account type is Company - fail loudly if not
  if (accountType !== AccountType.Company) {
    throw new Error(
      `CompanyWHTPage: Invalid account type "${accountType}". ` +
      `Expected AccountType.Company. ` +
      "This page is exclusively for Company accounts. Business accounts should use /dashboard/business/wht. " +
      "Individual accounts do not have WHT management."
    );
  }

  // Get company state from Redux (already fetched in DashboardLayout)
  const { companies, selectedCompanyId, isLoading: isLoadingCompany, hasFetched: hasFetchedCompany } = useAppSelector((state: any) => state.company);

  // CRITICAL: Determine entityId based on account type - fail loudly if missing
  let entityId: string | null = null;
  let isLoadingEntity = false;
  
  if (isLoadingCompany || !hasFetchedCompany || (!selectedCompanyId && hasFetchedCompany && companies.length > 0)) {
    isLoadingEntity = true;
  } else if (!selectedCompanyId) {
    throw new Error(
      "CompanyWHTPage: selectedCompanyId is required for Company accounts. " +
      "A company must be selected before accessing WHT management. " +
      "DashboardLayout should ensure a company is selected or redirect to onboarding."
    );
  } else {
    entityId = selectedCompanyId;
    isLoadingEntity = isLoadingCompany;
  }

  // CRITICAL: Get subscription state - check loading state before accessing currentSubscription
  const { currentSubscription, isLoading: isLoadingSubscription, hasFetched: hasFetchedSubscription } = useAppSelector((state: any) => state.subscription);

  // CRITICAL: If entityId is still null but we're showing loading, return loading state
  // Also check subscription loading state
  if ((!entityId && isLoadingEntity) || isLoadingSubscription || !hasFetchedSubscription) {
    return (
      <RouteGuard requireAccountType={[AccountType.Company]} redirectTo="/dashboard/expenses" loadingMessage="Loading WHT management...">
        <LoadingState message="Initializing..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // CRITICAL: Fail loudly if subscription is missing after loading check
  if (!currentSubscription) {
    throw new Error(
      "CompanyWHTPage: currentSubscription is required. Subscription data must be fetched before rendering this page. " +
      "DashboardLayout should ensure subscription is loaded."
    );
  }
  
  if (!currentSubscription.plan) {
    throw new Error(
      "CompanyWHTPage: currentSubscription.plan is required. Subscription object must have plan property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate plan is a valid SubscriptionPlan enum value
  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentSubscription.plan)) {
    throw new Error(
      `CompanyWHTPage: Invalid subscription plan "${currentSubscription.plan}". ` +
      `Valid values are: ${validPlans.join(", ")}. ` +
      "Use SubscriptionPlan enum, not string literals."
    );
  }

  const currentPlan = currentSubscription.plan as SubscriptionPlan;

  // CRITICAL: entityId must be set at this point - fail loudly if not
  if (!entityId) {
    throw new Error(
      "CompanyWHTPage: entityId is required but is null. " +
      "This should never happen - entityId validation should have caught this. " +
      "This is a critical logic error."
    );
  }

  return (
    <RouteGuard requireAccountType={[AccountType.Company]} redirectTo="/dashboard/expenses" loadingMessage="Loading WHT management...">
      <WHTContent entityId={entityId} accountType={AccountType.Company} currentPlan={currentPlan} />
    </RouteGuard>
  );
}
