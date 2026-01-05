"use client";

import { useAppSelector } from "@/hooks/useAppSelector";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { ComplianceContent } from "@/components/dashboard/compliance";

export default function CompanyCompliancePage() {
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "CompanyCompliancePage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "CompanyCompliancePage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `CompanyCompliancePage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  const accountType = user.accountType;
  const isCompanyAccount = accountType === AccountType.Company;

  // CRITICAL: Validate account type is Company
  if (!isCompanyAccount) {
    throw new Error(
      `CompanyCompliancePage: Invalid account type "${accountType}". Expected AccountType.Company.`
    );
  }

  // Get company state from Redux (already fetched in DashboardLayout)
  const { companies, selectedCompanyId, isLoading: isLoadingCompany, hasFetched: hasFetchedCompany } = useAppSelector((state: any) => state.company);

  // CRITICAL: Determine entityId based on account type - fail loudly if missing
  // BUT: Show loading state if companies exist but selection is pending (DashboardLayout useEffect will fix this)
  let entityId: string | null = null;
  let isLoadingEntity = false;
  
  if (isLoadingCompany || (!hasFetchedCompany) || (!selectedCompanyId && hasFetchedCompany && companies.length > 0)) {
    // Still fetching, not fetched yet, or companies exist but none selected - show loading
    isLoadingEntity = true;
  } else if (!selectedCompanyId) {
    throw new Error(
      "CompanyCompliancePage: selectedCompanyId is required for Company accounts. " +
      "A company must be selected before accessing compliance dashboard. " +
      "DashboardLayout should ensure a company is selected or redirect to onboarding."
    );
  } else {
    entityId = selectedCompanyId;
    isLoadingEntity = isLoadingCompany;
  }

  // CRITICAL: Get subscription state - check loading state before accessing currentSubscription
  const { currentSubscription, isLoading: isLoadingSubscription, hasFetched: hasFetchedSubscription } = useAppSelector((state: any) => state.subscription);

  // CRITICAL: If entityId is still null but we're showing loading, return loading state
  // This prevents the page from trying to fetch data with a null entityId
  // Also check subscription loading state
  if ((!entityId && isLoadingEntity) || isLoadingSubscription || !hasFetchedSubscription) {
    return (
      <RouteGuard requireAccountType={[AccountType.Company]} redirectTo="/dashboard/expenses" loadingMessage="Loading compliance dashboard...">
        <LoadingState message="Initializing..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // CRITICAL: Fail loudly if subscription is missing after loading check
  if (!currentSubscription) {
    throw new Error(
      "CompanyCompliancePage: currentSubscription is required. Subscription data must be fetched before rendering this page. " +
      "DashboardLayout should ensure subscription is loaded."
    );
  }
  
  if (!currentSubscription.plan) {
    throw new Error(
      "CompanyCompliancePage: currentSubscription.plan is required. Subscription object must have plan property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate plan is a valid SubscriptionPlan enum value
  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentSubscription.plan)) {
    throw new Error(
      `CompanyCompliancePage: Invalid subscription plan "${currentSubscription.plan}". ` +
      `Valid values are: ${validPlans.join(", ")}. ` +
      "Use SubscriptionPlan enum, not string literals."
    );
  }

  const currentPlan = currentSubscription.plan as SubscriptionPlan;

  // CRITICAL: Fail loudly if entityId is still null after loading check
  if (!entityId) {
    throw new Error("CompanyCompliancePage: entityId is required but is null.");
  }

  return (
    <RouteGuard requireAccountType={[AccountType.Company]} redirectTo="/dashboard/expenses" loadingMessage="Loading compliance dashboard...">
      <ComplianceContent entityId={entityId} accountType={AccountType.Company} currentPlan={currentPlan} />
    </RouteGuard>
  );
}
