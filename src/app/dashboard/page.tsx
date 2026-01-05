"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { dashboardActions } from "@/store/redux/dashboard/dashboard-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { createErrorStateProps } from "@/components/shared/errorUtils";
import { RefreshCw } from "lucide-react";
import { IndividualDashboardContent } from "@/components/dashboard/home/IndividualDashboardContent";
import { CompanyDashboardContent } from "@/components/dashboard/home/CompanyDashboardContent";
import { BusinessDashboardContent } from "@/components/dashboard/home/BusinessDashboardContent";
import { useGuestReviewFlow } from "@/hooks/useGuestReviewFlow";
import { RouteGuard } from "@/components/shared/RouteGuard";
import type { DashboardData } from "@/store/redux/dashboard/dashboard-slice";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { ComplianceStatus } from "@/lib/server/utils/enum";
import { LoadingStateSize } from "@/lib/utils/client-enums";


export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { hasPendingReview, getPendingReviewData, clearPendingReviewData } = useGuestReviewFlow();

  // Redux state
  const { data: dashboardData, isLoading, error, hasFetched } = useAppSelector(
    (state: any) => state.dashboard
  );
  
  const { selectedCompanyId, hasFetched: hasFetchedCompany, isLoading: isLoadingCompany } = useAppSelector(
    (state: any) => state.company
  );

  const { selectedBusinessId, hasFetched: hasFetchedBusiness, isLoading: isLoadingBusiness } = useAppSelector(
    (state: any) => state.business
  );

  const { user } = useAppSelector(
    (state: any) => state.user
  );

  const accountType = user?.accountType;
  const isIndividualAccount = accountType === AccountType.Individual;
  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;

  const { sendHttpRequest: fetchDashboardReq } = useHttp();

  // User data is now persisted from login - no need to fetch

  // Note: Individual accounts now have their own dashboard view (no redirect)
  // They see PIT summary, income, and expenses instead of company-focused metrics

  // Fetch dashboard data when companyId/businessId is available (company/business accounts only)
  // Companies/businesses are already fetched in DashboardLayout
  useEffect(() => {
    if (!isIndividualAccount) {
      const entityId = isCompanyAccount ? selectedCompanyId : (isBusinessAccount ? selectedBusinessId : null);
      if (entityId && !hasFetched) {
        fetchDashboardData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIndividualAccount, isCompanyAccount, isBusinessAccount, selectedCompanyId, selectedBusinessId, hasFetched]);

  const fetchDashboardData = () => {
    // Only fetch dashboard data for company/business accounts
    if (isIndividualAccount) return;
    
    const entityId = isCompanyAccount ? selectedCompanyId : (isBusinessAccount ? selectedBusinessId : null);
    if (!entityId) return;
    
    dispatch(dashboardActions.setLoading(true));
    fetchDashboardReq({
      successRes: (response: any) => {
        dispatch(dashboardActions.setDashboardData(response?.data?.data));
      },
      errorRes: (errorResponse: any) => {
        if (errorResponse?.status === 404) {
          // 404 means no dashboard data (valid state, not an error)
          // Create empty dashboard data structure to mark as fetched
          // This prevents infinite loading while allowing the page to render
          const emptyDashboardData: DashboardData = {
            complianceStatus: {
              status: ComplianceStatus.Compliant,
              score: 100,
              alerts: [],
            },
            currentMonthVAT: {
              inputVAT: 0,
              outputVAT: 0,
              netVAT: 0,
              status: "no_data",
            },
            currentMonthPayroll: {
              totalEmployees: 0,
              totalPAYE: 0,
              totalNetSalary: 0,
            },
            totalInvoices: 0,
            taxDeadlines: [],
          };
          dispatch(dashboardActions.setDashboardData(emptyDashboardData));
          return false; // Suppress error toast
        }
        // For other errors, set error state (which sets hasFetched = true via setError)
        dispatch(
          dashboardActions.setError(
            errorResponse?.data?.description || "Failed to load dashboard data"
          )
        );
        return true;
      },
      requestConfig: {
        url: isCompanyAccount 
          ? `/compliance/dashboard?companyId=${entityId}`
          : `/compliance/dashboard?businessId=${entityId}`,
        method: HttpMethod.GET,
      },
    });
  };

  const fetchDashboard = () => {
    const entityId = isCompanyAccount ? selectedCompanyId : (isBusinessAccount ? selectedBusinessId : null);
    if (entityId) {
      fetchDashboardData();
    }
  };

  // Check for pending review after signup (from guest review flow)
  useEffect(() => {
    const showReview = searchParams.get("showReview");
    if (showReview === "true" && hasPendingReview()) {
      const reviewData = getPendingReviewData();
      // TODO: When review page/component is created, redirect there
      // For now, we'll just clear the pending review data
      // You can integrate this with your review component when it's ready
      console.log("Pending review data:", reviewData);
      clearPendingReviewData();
      // Example: router.push("/reviews/create?data=" + encodeURIComponent(JSON.stringify(reviewData)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Show loading state until:
  // 1. User is loaded
  // 2. For company/business accounts: 
  //    - Company/business fetch is complete (hasFetchedCompany/hasFetchedBusiness = true)
  //    - Company/business is selected (selectedCompanyId/selectedBusinessId exists)
  //    - Company/business is not currently loading (isLoadingCompany/isLoadingBusiness = false)
  // 3. Dashboard data fetch has been attempted (hasFetched = true OR error exists)
  //    OR dashboard is currently loading (isLoading = true)
  const shouldShowLoading = 
    !user || 
    isLoading || 
    (!isIndividualAccount && (
      (isCompanyAccount && (isLoadingCompany || !hasFetchedCompany || !selectedCompanyId)) ||
      (isBusinessAccount && (isLoadingBusiness || !hasFetchedBusiness || !selectedBusinessId)) ||
      (!hasFetched && !error) // Wait for dashboard fetch attempt (hasFetched will be true on success/error)
    ));
  
  // Use consistent background and layout to prevent flicker
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Loading your information..." size={LoadingStateSize.Md} />
      </div>
    );
  }

  // For individual accounts, show individual-focused dashboard
  if (isIndividualAccount) {
    return (
      <RouteGuard requireAccountType={AccountType.Individual} redirectTo="/dashboard/expenses" loadingMessage="Loading dashboard...">
        <IndividualDashboardContent />
      </RouteGuard>
    );
  }

  // For company/business accounts, show company/business-focused dashboard
  // Show error state for company/business accounts if there's an error
  if (!isIndividualAccount && error && !dashboardData && !isLoading && hasFetched) {
    const errorProps = createErrorStateProps(error);
    const requiredAccountType = isCompanyAccount ? AccountType.Company : AccountType.Business;
    return (
      <RouteGuard requireAccountType={requiredAccountType} redirectTo="/dashboard/expenses" loadingMessage="Loading dashboard...">
        <ErrorState
          {...errorProps}
          title="Could Not Load Your Information"
          primaryAction={{
            label: "Try Again",
            onClick: fetchDashboard,
            icon: RefreshCw,
          }}
        />
      </RouteGuard>
    );
  }

  // For company accounts, show company-focused dashboard
  if (isCompanyAccount) {
    return (
      <RouteGuard requireAccountType={AccountType.Company} redirectTo="/dashboard/expenses" loadingMessage="Loading dashboard...">
        <CompanyDashboardContent dashboardData={dashboardData || null} />
      </RouteGuard>
    );
  }

  // For business accounts, show business-focused dashboard
  // CRITICAL: Business accounts have their own dashboard component for proper separation
  if (isBusinessAccount) {
    return (
      <RouteGuard requireAccountType={AccountType.Business} redirectTo="/dashboard/expenses" loadingMessage="Loading dashboard...">
        <BusinessDashboardContent dashboardData={dashboardData || null} />
      </RouteGuard>
    );
  }

  // CRITICAL: This should never be reached - fail loudly if it is
  // All account types should be handled above (Individual, Company, or Business)
  throw new Error(
    `DashboardPage: Invalid account type "${accountType}". ` +
    `Expected AccountType.Individual, AccountType.Company, or AccountType.Business. ` +
    `This is a critical error - all account types must be explicitly handled.`
  );
}
