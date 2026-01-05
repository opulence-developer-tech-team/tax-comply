"use client";

import { useAppSelector } from "@/hooks/useAppSelector";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { InvoicesContent } from "@/components/dashboard/invoices";

export default function BusinessInvoicesPage() {
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "BusinessInvoicesPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "BusinessInvoicesPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `BusinessInvoicesPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  const accountType = user.accountType;
  const isBusinessAccount = accountType === AccountType.Business;

  // CRITICAL: Validate account type is Business
  if (!isBusinessAccount) {
    throw new Error(
      `BusinessInvoicesPage: Invalid account type "${accountType}". Expected AccountType.Business.`
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
      "BusinessInvoicesPage: selectedBusinessId is required for Business accounts. " +
      "A business must be selected before accessing invoice management. " +
      "DashboardLayout should ensure a business is selected or redirect to onboarding."
    );
  } else {
    entityId = selectedBusinessId;
    isLoadingEntity = isLoadingBusiness;
  }

  // CRITICAL: If entityId is still null but we're showing loading, return loading state
  // This prevents the page from trying to fetch data with a null entityId
  if (!entityId && isLoadingEntity) {
    return (
      <RouteGuard requireAccountType={[AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading invoice management...">
        <LoadingState message="Initializing..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // CRITICAL: Fail loudly if entityId is still null after loading check
  if (!entityId) {
    throw new Error("BusinessInvoicesPage: entityId is required but is null.");
  }

  return (
    <RouteGuard requireAccountType={[AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading invoice management...">
      <InvoicesContent entityId={entityId} accountType={AccountType.Business} />
    </RouteGuard>
  );
}

