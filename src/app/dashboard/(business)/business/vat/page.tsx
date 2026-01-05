"use client";

/**
 * Business VAT Page
 * 
 * Dedicated page for Business accounts to manage VAT.
 * Validates account type, determines entityId, and renders shared VATContent component.
 * 
 * CRITICAL REQUIREMENTS (Ruthless Mentor Standards):
 * - Only accessible to AccountType.Business accounts
 * - Must have selectedBusinessId before rendering
 * - All validation must fail loudly (throw errors) - no defaults, no fallbacks, no auto-assignment
 * - Uses enums, not string literals
 * - Production-ready, bulletproof code
 */

import { useAppSelector } from "@/hooks/useAppSelector";
import { LoadingState } from "@/components/shared/LoadingState";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { VATContent } from "@/components/dashboard/vat";

export default function BusinessVATPage() {
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "BusinessVATPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "BusinessVATPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `BusinessVATPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  const accountType = user.accountType;

  // CRITICAL: Validate account type is Business - fail loudly if not
  if (accountType !== AccountType.Business) {
    throw new Error(
      `BusinessVATPage: Invalid account type "${accountType}". ` +
      `Expected AccountType.Business. ` +
      "This page is exclusively for Business accounts. Company accounts should use /dashboard/vat. " +
      "Individual accounts do not have VAT management."
    );
  }

  // Get business state from Redux (already fetched in DashboardLayout)
  const { businesses, selectedBusinessId, isLoading: isLoadingBusiness, hasFetched: hasFetchedBusiness } = useAppSelector((state: any) => state.business);

  // CRITICAL: Determine entityId based on account type - fail loudly if missing
  // Show loading state if businesses exist but selection is pending (DashboardLayout useEffect will fix this)
  let entityId: string | null = null;
  let isLoadingEntity = false;
  
  if (isLoadingBusiness || !hasFetchedBusiness || (hasFetchedBusiness && businesses.length > 0 && !selectedBusinessId)) {
    // Still fetching, not fetched yet, or businesses exist but none selected - show loading
    isLoadingEntity = true;
  } else if (!selectedBusinessId) {
    throw new Error(
      "BusinessVATPage: selectedBusinessId is required for Business accounts. " +
      "A business must be selected before accessing VAT management. " +
      "DashboardLayout should ensure a business is selected or redirect to onboarding."
    );
  } else {
    entityId = selectedBusinessId;
    isLoadingEntity = isLoadingBusiness;
  }

  // CRITICAL: If entityId is still null but we're showing loading, return loading state
  if (!entityId && isLoadingEntity) {
    return (
      <RouteGuard requireAccountType={[AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading VAT management...">
        <LoadingState message="Initializing..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // CRITICAL: entityId must be set at this point - fail loudly if not
  if (!entityId) {
    throw new Error(
      "BusinessVATPage: entityId is required but is null. " +
      "This should never happen - entityId validation should have caught this. " +
      "This is a critical logic error."
    );
  }

  return (
    <RouteGuard requireAccountType={[AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading VAT management...">
      <VATContent entityId={entityId} accountType={AccountType.Business} />
    </RouteGuard>
  );
}

