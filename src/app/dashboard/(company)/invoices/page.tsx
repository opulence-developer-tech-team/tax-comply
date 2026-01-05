"use client";

import { useAppSelector } from "@/hooks/useAppSelector";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { InvoicesContent } from "@/components/dashboard/invoices";

export default function CompanyInvoicesPage() {
  // CRITICAL: Validate user exists - fail loudly if missing
  const { user } = useAppSelector((state: any) => state.user);
  if (!user) {
    throw new Error(
      "CompanyInvoicesPage: User is required. This page should not render without authenticated user. " +
      "RouteGuard should prevent access without authentication."
    );
  }
  
  if (!user.accountType) {
    throw new Error(
      "CompanyInvoicesPage: user.accountType is required. User object must have accountType property. " +
      "This is a critical data integrity error."
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `CompanyInvoicesPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  const accountType = user.accountType;
  const isCompanyAccount = accountType === AccountType.Company;

  // CRITICAL: Validate account type is Company
  if (!isCompanyAccount) {
    throw new Error(
      `CompanyInvoicesPage: Invalid account type "${accountType}". Expected AccountType.Company.`
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
      "CompanyInvoicesPage: selectedCompanyId is required for Company accounts. " +
      "A company must be selected before accessing invoice management. " +
      "DashboardLayout should ensure a company is selected or redirect to onboarding."
    );
  } else {
    entityId = selectedCompanyId;
    isLoadingEntity = isLoadingCompany;
  }

  // CRITICAL: If entityId is still null but we're showing loading, return loading state
  // This prevents the page from trying to fetch data with a null entityId
  if (!entityId && isLoadingEntity) {
    return (
      <RouteGuard requireAccountType={[AccountType.Company]} redirectTo="/dashboard/expenses" loadingMessage="Loading invoice management...">
        <LoadingState message="Initializing..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // CRITICAL: Fail loudly if entityId is still null after loading check
  if (!entityId) {
    throw new Error("CompanyInvoicesPage: entityId is required but is null.");
  }

  return (
    <RouteGuard requireAccountType={[AccountType.Company]} redirectTo="/dashboard/expenses" loadingMessage="Loading invoice management...">
      <InvoicesContent entityId={entityId} accountType={AccountType.Company} />
    </RouteGuard>
  );
}
