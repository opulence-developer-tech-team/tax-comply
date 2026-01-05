"use client";

import { useAppSelector } from "@/hooks/useAppSelector";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { TaxFilingContent } from "@/components/dashboard/tax-filing";

export default function TaxFilingPage() {
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "TaxFilingPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "TaxFilingPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `TaxFilingPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  const accountType = user.accountType;
  const isIndividualAccount = accountType === AccountType.Individual;
  const isCompanyAccount = accountType === AccountType.Company;

  // CRITICAL: Validate account type is Individual or Company (Business has separate route)
  if (!isIndividualAccount && !isCompanyAccount) {
    throw new Error(
      `TaxFilingPage: Invalid account type "${accountType}". ` +
      `Expected AccountType.Individual or AccountType.Company. ` +
      `Business accounts must use /dashboard/business/tax-filing route.`
    );
  }

  // CRITICAL: Validate user._id exists
  if (!user._id) {
    throw new Error(
      "TaxFilingPage: user._id is required. User object must have _id property. " +
      "This is a critical data integrity error."
    );
  }
  const accountId = user._id.toString();

  // Get company state from Redux (already fetched in DashboardLayout)
  // Note: Business accounts use /dashboard/business/tax-filing route (separate page)
  const { companies, selectedCompanyId, isLoading: isLoadingCompany, hasFetched: hasFetchedCompany } = useAppSelector((state: any) => state.company);

  // CRITICAL: Determine entityId based on account type - fail loudly if missing
  let entityId: string | null = null;
  let isLoadingEntity = false;
  
  if (isCompanyAccount) {
    if (isLoadingCompany || (!hasFetchedCompany) || (!selectedCompanyId && hasFetchedCompany && companies.length > 0)) {
      isLoadingEntity = true;
    } else if (!selectedCompanyId) {
      throw new Error(
        "TaxFilingPage: selectedCompanyId is required for Company accounts. " +
        "A company must be selected before accessing tax filing. " +
        "DashboardLayout should ensure a company is selected or redirect to onboarding."
      );
    } else {
      entityId = selectedCompanyId;
      isLoadingEntity = isLoadingCompany;
    }
  }
  // Individual accounts don't need entityId (use accountId directly)

  // CRITICAL: Get subscription state - check loading state before accessing currentSubscription
  const { currentSubscription, isLoading: isLoadingSubscription, hasFetched: hasFetchedSubscription } = useAppSelector((state: any) => state.subscription);

  // CRITICAL: If entityId is still null but we're showing loading (for Company), return loading state
  // Also check subscription loading state
  if ((isCompanyAccount && !entityId && isLoadingEntity) || isLoadingSubscription || !hasFetchedSubscription) {
    return (
      <RouteGuard requireAccountType={[AccountType.Company, AccountType.Individual]} redirectTo="/dashboard/expenses" loadingMessage="Loading tax filing...">
        <LoadingState message="Initializing..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // CRITICAL: Fail loudly if subscription is missing after loading check
  if (!currentSubscription) {
    throw new Error(
      "TaxFilingPage: currentSubscription is required. Subscription data must be fetched before rendering this page. " +
      "DashboardLayout should ensure subscription is loaded."
    );
  }
  
  if (!currentSubscription.plan) {
    throw new Error(
      "TaxFilingPage: currentSubscription.plan is required. Subscription object must have plan property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate plan is a valid SubscriptionPlan enum value
  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentSubscription.plan)) {
    throw new Error(
      `TaxFilingPage: Invalid subscription plan "${currentSubscription.plan}". ` +
      `Valid values are: ${validPlans.join(", ")}. ` +
      "Use SubscriptionPlan enum, not string literals."
    );
  }

  const currentPlan = currentSubscription.plan as SubscriptionPlan;

  return (
    <RouteGuard requireAccountType={[AccountType.Company, AccountType.Individual]} redirectTo="/dashboard/expenses" loadingMessage="Loading tax filing...">
      <TaxFilingContent accountId={accountId} entityId={entityId} accountType={accountType} currentPlan={currentPlan} />
    </RouteGuard>
  );
}
