"use client";

import { useAppSelector } from "@/hooks/useAppSelector";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { ExpensesContent } from "@/components/dashboard/expenses";

import { useEffect } from "react"; // Explicit import

export default function ExpensesPage() {
  const router = useRouter(); // Import useRouter
  const { user } = useAppSelector((state: any) => state.user);

  // ... (validation checks remain same)
  // CRITICAL: Validate user exists - fail loudly if missing
  if (!user) {
    throw new Error(
      "ExpensesPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "ExpensesPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `ExpensesPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  const accountType = user.accountType;
  const isIndividualAccount = accountType === AccountType.Individual;
  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;

  // CRITICAL: Validate account type is Individual, Company, or Business
  if (!isIndividualAccount && !isCompanyAccount && !isBusinessAccount) {
    throw new Error(
      `ExpensesPage: Invalid account type "${accountType}". Expected AccountType.Individual, AccountType.Company, or AccountType.Business.`
    );
  }

  // Determine accountId based on account type
  let accountId: string | null = null;
  let isLoadingEntity = false;

  // CRITICAL: Get entity states from Redux
  const { companies, selectedCompanyId, isLoading: isLoadingCompany, hasFetched: hasFetchedCompany } = useAppSelector((state: any) => state.company);
  const { businesses, selectedBusinessId, isLoading: isLoadingBusiness, hasFetched: hasFetchedBusiness } = useAppSelector((state: any) => state.business);

  useEffect(() => {
    if (user?.accountType === AccountType.Company) {
       if (!isLoadingCompany && hasFetchedCompany && !selectedCompanyId) {
          router.push("/dashboard/company/onboard");
       }
    } else if (user?.accountType === AccountType.Business) {
       if (!isLoadingBusiness && hasFetchedBusiness && !selectedBusinessId) {
          router.push("/dashboard/business/onboard");
       }
    }
  }, [user?.accountType, isLoadingCompany, hasFetchedCompany, selectedCompanyId, isLoadingBusiness, hasFetchedBusiness, selectedBusinessId, router]);

  if (isIndividualAccount) {
    // CRITICAL: Validate user._id exists for Individual accounts
    if (!user._id) {
      throw new Error(
        "ExpensesPage: user._id is required for Individual accounts. " +
        "User object must have _id property."
      );
    }
    accountId = user._id.toString();
  } else if (isCompanyAccount) {
    if (isLoadingCompany || (!hasFetchedCompany) || (!selectedCompanyId && hasFetchedCompany && companies.length > 0)) {
       isLoadingEntity = true;
    } else if (!selectedCompanyId) {
       // Redirect explicitly handled in useEffect, but we must block rendering
       isLoadingEntity = true; 
    } else {
      accountId = selectedCompanyId;
      isLoadingEntity = isLoadingCompany;
    }
  } else if (isBusinessAccount) {
    if (isLoadingBusiness || (!hasFetchedBusiness) || (!selectedBusinessId && hasFetchedBusiness && businesses.length > 0)) {
       isLoadingEntity = true;
    } else if (!selectedBusinessId) {
       // Redirect explicitly handled in useEffect, but we must block rendering
       isLoadingEntity = true;
    } else {
       accountId = selectedBusinessId;
       isLoadingEntity = isLoadingBusiness;
    }
  }

  // CRITICAL: Get subscription state - check loading state before accessing currentSubscription
  const { currentSubscription, isLoading: isLoadingSubscription, hasFetched: hasFetchedSubscription } = useAppSelector((state: any) => state.subscription);
  
  // CRITICAL: If accountId is still null but we're showing loading, return loading state
  // This prevents the page from trying to fetch data with a null accountId
  // Also check subscription loading state
  if ((!accountId && isLoadingEntity) || isLoadingSubscription || !hasFetchedSubscription) {
    return (
      <RouteGuard requireAccountType={[AccountType.Individual, AccountType.Company, AccountType.Business]} redirectTo="/dashboard" loadingMessage="Loading your expenses...">
        <LoadingState message="Initializing..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // CRITICAL: Fail loudly if subscription is missing after loading check
  if (!currentSubscription) {
    throw new Error(
      "ExpensesPage: currentSubscription is required. Subscription data must be fetched before rendering this page. " +
      "DashboardLayout should ensure subscription is loaded."
    );
  }
  
  if (!currentSubscription.plan) {
    throw new Error(
      "ExpensesPage: currentSubscription.plan is required. Subscription object must have plan property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate plan is a valid SubscriptionPlan enum value
  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentSubscription.plan)) {
    throw new Error(
      `ExpensesPage: Invalid subscription plan "${currentSubscription.plan}". ` +
      `Valid values are: ${validPlans.join(", ")}. ` +
      "Use SubscriptionPlan enum, not string literals."
    );
  }

  const currentPlan = currentSubscription.plan as SubscriptionPlan;

  // CRITICAL: Fail loudly if accountId is still null after loading check
  if (!accountId) {
    // This should ideally strictly account for race conditions where redirect hasn't happened yet.
    // However, we return LoadingState above if isLoadingEntity is true. 
    // If we reach here, it means we are NOT loading, but accountId is null.
    // This implies logic failure or immediate redirect pending.
    // We can fallback to return null (empty render) to avoid error flash during redirect.
    return null; 
  }

  return (
    <RouteGuard requireAccountType={[AccountType.Individual, AccountType.Company]} redirectTo="/dashboard" loadingMessage="Loading your expenses...">
      <ExpensesContent accountId={accountId} accountType={accountType} currentPlan={currentPlan} />
    </RouteGuard>
  );
}
