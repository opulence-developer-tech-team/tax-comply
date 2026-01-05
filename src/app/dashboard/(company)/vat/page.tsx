"use client";

/**
 * Company VAT Page
 * 
 * Dedicated page for Company accounts to manage VAT.
 * Validates account type, determines entityId, and renders shared VATContent component.
 * 
 * CRITICAL REQUIREMENTS (Ruthless Mentor Standards):
 * - Only accessible to AccountType.Company accounts
 * - Must have selectedCompanyId before rendering
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

export default function CompanyVATPage() {
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "CompanyVATPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "CompanyVATPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `CompanyVATPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  const accountType = user.accountType;

  // CRITICAL: Validate account type is Company - fail loudly if not
  if (accountType !== AccountType.Company) {
    throw new Error(
      `CompanyVATPage: Invalid account type "${accountType}". ` +
      `Expected AccountType.Company. ` +
      "This page is exclusively for Company accounts. Business accounts should use /dashboard/business/vat. " +
      "Individual accounts do not have VAT management."
    );
  }

  // Get company state from Redux (already fetched in DashboardLayout)
  const { companies, selectedCompanyId, isLoading: isLoadingCompany, hasFetched: hasFetchedCompany } = useAppSelector((state: any) => state.company);

  // CRITICAL: Determine entityId based on account type - fail loudly if missing
  // Show loading state if companies exist but selection is pending (DashboardLayout useEffect will fix this)
  let entityId: string | null = null;
  let isLoadingEntity = false;
  
  if (isLoadingCompany || !hasFetchedCompany || (!selectedCompanyId && hasFetchedCompany && companies.length > 0)) {
    // Still fetching, not fetched yet, or companies exist but none selected - show loading
    isLoadingEntity = true;
  } else if (!selectedCompanyId) {
    throw new Error(
      "CompanyVATPage: selectedCompanyId is required for Company accounts. " +
      "A company must be selected before accessing VAT management. " +
      "DashboardLayout should ensure a company is selected or redirect to onboarding."
    );
  } else {
    entityId = selectedCompanyId;
    isLoadingEntity = isLoadingCompany;
  }

  // CRITICAL: If entityId is still null but we're showing loading, return loading state
  if (!entityId && isLoadingEntity) {
    return (
      <RouteGuard requireAccountType={[AccountType.Company]} redirectTo="/dashboard/expenses" loadingMessage="Loading VAT management...">
        <LoadingState message="Initializing..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // CRITICAL: entityId must be set at this point - fail loudly if not
  if (!entityId) {
    throw new Error(
      "CompanyVATPage: entityId is required but is null. " +
      "This should never happen - entityId validation should have caught this. " +
      "This is a critical logic error."
    );
  }

  return (
    <RouteGuard requireAccountType={[AccountType.Company]} redirectTo="/dashboard/expenses" loadingMessage="Loading VAT management...">
      <VATContent entityId={entityId} accountType={AccountType.Company} />
    </RouteGuard>
  );
}
