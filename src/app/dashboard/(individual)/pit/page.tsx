"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { pitActions, type PITSummary, type PITRemittance, type IncomeSource } from "@/store/redux/pit/pit-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { createErrorStateProps } from "@/components/shared/errorUtils";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { RefreshCw } from "lucide-react";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";
import { toast } from "sonner";
import {
  PITHeader,
  PITInfoBanner,
  PITYearFilter,
  PITSummaryCards,
  PITCalculationBreakdown,
  PITIncomeSources,
  PITComplianceDisclaimer,
  PITRemittancesPreview,
  PITEmploymentDeductions,
} from "@/components/dashboard/pit";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { PitGuideModal } from "@/components/dashboard/guide-modals/PitGuideModal";

// NRS PIT Filing Deadline: March 31 of the year following the tax year
// Reference: Nigeria Tax Act 2025 (effective from 2026) - https://www.nipc.gov.ng/wp-content/uploads/2025/07/Nigeria-Tax-Act-2025.pdf
// Note: NRS has been rebranded as NRS (Nigeria Revenue Service) effective January 1, 2026
const NRS_PIT_FILING_DEADLINE_MONTH = 3; // March
const NRS_PIT_FILING_DEADLINE_DAY = 31;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function PITPage() {
  const dispatch = useAppDispatch();
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  
  // Get user from Redux
  const { user } = useAppSelector((state: any) => state.user);
  
  // ============================================================================
  // CRITICAL: Account Type Validation & Data Source Verification
  // ============================================================================
  // PIT (Personal Income Tax) page for Individual accounts ONLY.
  // CRITICAL: Business accounts should use /dashboard/business/pit (separate page for consistency).
  // 
  // Data Flow:
  // 1. RouteGuard validates accountType === "individual" and redirects if not
  // 2. API endpoints validate accountType via requireAccountType(["individual", "business"])
  // 3. API controllers validate accountId === userId.toString() (individual only)
  // 4. All income sources use entityType: "individual" (PIT is personal tax)
  // 5. All PIT calculations use individual account data only
  //
  // accountId Source:
  // - For individual accounts: accountId = user._id (the user's own ID)
  // - This is NOT a company ID - PIT is personal tax, not company tax
  // - All API calls use this user ID to fetch their personal income/expenses
  // ============================================================================
  const accountType = user?.accountType;
  const isIndividualAccount = accountType === AccountType.Individual;
  
  // CRITICAL: accountId must be the user's ID (NOT a company ID)
  // For individual accounts: accountId === user._id.toString()
  // This ensures we fetch data from the individual's account, not a company account
  const accountId = isIndividualAccount ? (user?._id?.toString() || null) : null;
  
  // Get subscription from Redux subscription slice (user-based, works for both individual and company accounts)
  const { currentSubscription } = useAppSelector((state: any) => state.subscription);
  
  // Get PIT state from Redux
  const {
    summary,
    remittances,
    incomeSources,
    taxYear,
    accountId: pitAccountId,
    hasFetched,
    isLoading,
    error,
  } = useAppSelector((state: any) => state.pit);
  
  const { sendHttpRequest: fetchPITReq } = useHttp();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  
  const currentPlan = (currentSubscription?.plan || SubscriptionPlan.Free) as SubscriptionPlan;
  const hasPITTracking = SUBSCRIPTION_PRICING[currentPlan]?.features?.pitTracking === true;
  const hasPITRemittance = SUBSCRIPTION_PRICING[currentPlan]?.features?.pitRemittance === true;
  
  // Filter state
  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const currentYear = taxYear || now.getFullYear();
    // CRITICAL: Ensure minimum year is 2026 (when Nigeria Tax Act 2025 takes effect)
    // This app does NOT support tax years before 2026
    return Math.max(2026, currentYear);
  });

  // CRITICAL: Validate and enforce minimum year 2026 when year changes
  const handleYearChange = useCallback((year: number) => {
    // Enforce minimum year 2026 per Nigeria Tax Act 2025
    const validYear = Math.max(2026, year);
    if (validYear !== year) {
      console.warn(`[PITPage] Attempted to select year ${year}, but minimum is 2026. Using ${validYear} instead.`);
    }
    setSelectedYear(validYear);
  }, []);

  // Fetch PIT summary
  const fetchSummary = useCallback(() => {
    // CRITICAL: Validate account type and accountId before making API calls
    if (!isIndividualAccount) {
      console.warn("[PITPage] fetchSummary: Invalid account type - PIT page is only for individual accounts");
      return;
    }
    
    if (!accountId || !hasPITTracking) {
      console.warn("[PITPage] fetchSummary: accountId missing or no PIT tracking access");
      return;
    }

    const params = new URLSearchParams({
      accountId: accountId,
      taxYear: selectedYear.toString(),
    });

    console.log("[PITPage] Fetching PIT summary:", {
      accountId,
      taxYear: selectedYear,
      url: `/pit/summary?${params.toString()}`,
    });

    // CRITICAL: Capture selectedYear at request time to prevent race conditions
    // If user switches years quickly, we only process responses for the correct year
    const requestYear = selectedYear;
    
    fetchPITReq({
      successRes: (response: any) => {
        const summaryData = response?.data?.data || response?.data;
        
        // CRITICAL: Validate response is for the correct year to prevent race conditions
        // If user switched years while request was in flight, ignore stale response
        if (summaryData && summaryData.taxYear !== requestYear) {
          console.warn("[PITPage] ⚠️ Ignoring stale PIT summary response", {
            responseYear: summaryData.taxYear,
            requestedYear: requestYear,
            currentSelectedYear: selectedYear,
          });
          return; // Ignore stale response
        }
        
        console.log("[PITPage] ✅ PIT summary received:", {
          accountId,
          taxYear: requestYear,
          summary: summaryData ? {
            totalGrossIncome: summaryData.totalGrossIncome,
            pitAfterWHT: summaryData.pitAfterWHT,
            pitRemitted: summaryData.pitRemitted,
            pitPending: summaryData.pitPending,
            remittanceStatus: summaryData.remittanceStatus,
            filingStatus: summaryData.filingStatus,
          } : null,
        });
        
        // CRITICAL: Double-check selectedYear hasn't changed before updating state
        // This prevents race conditions when user switches years quickly
        if (selectedYear === requestYear && accountId) {
          dispatch(pitActions.setPITSummary({
            summary: summaryData || null,
            taxYear: requestYear,
            accountId,
          }));
        } else {
          console.warn("[PITPage] ⚠️ Year changed during fetch, ignoring response", {
            responseYear: requestYear,
            currentSelectedYear: selectedYear,
          });
        }
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status || errorResponse?.response?.status;
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        const upgradeRequired = errorData?.upgradeRequired || errorData?.data?.upgradeRequired;
        
        console.error("[PITPage] ❌ Error fetching PIT summary:", {
          status,
          error: errorData?.description || errorData?.message || "Unknown error",
          upgradeRequired: !!upgradeRequired,
        });
        
        if (status === 403 && upgradeRequired) {
          showUpgradePrompt({
            feature: upgradeRequired.feature || "PIT Tracking",
            currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
            requiredPlan: upgradeRequired.requiredPlan || "free",
            requiredPlanPrice: upgradeRequired.requiredPlanPrice || 0,
            message: errorData?.description || "PIT tracking is not available on your current plan.",
            reason: upgradeRequired.reason || "plan_limitation",
          });
          dispatch(pitActions.setError(null));
        } else if (status === 404) {
          // NOTE: 404 should never occur because getPITSummary always creates a summary if missing
          // This likely indicates a server error during summary creation
          // Retry the fetch (which will trigger summary creation via getPITSummary)
          console.warn("[PITPage] Unexpected 404 - retrying fetch to trigger summary creation...");
          setTimeout(() => fetchSummary(), 1000); // Retry after 1 second
          return false;
        } else {
          dispatch(pitActions.setError(errorData?.description || "Failed to load PIT summary"));
        }
        return true;
      },
      requestConfig: {
        url: `/pit/summary?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [accountId, selectedYear, fetchPITReq, dispatch, currentPlan, showUpgradePrompt, hasPITTracking, isIndividualAccount]);

  // Update/recalculate PIT summary
  const updateSummary = useCallback(() => {
    // CRITICAL: Validate account type before making API calls
    if (!isIndividualAccount) {
      console.warn("[PITPage] updateSummary: Invalid account type - PIT is only for individual and business accounts");
      return;
    }
    
    if (!accountId || !hasPITTracking) {
      console.warn("[PITPage] updateSummary: accountId missing or no PIT tracking access");
      return;
    }

    const params = new URLSearchParams({
      accountId: accountId,
      taxYear: selectedYear.toString(),
    });

    // CRITICAL: Capture selectedYear at request time to prevent race conditions
    const requestYear = selectedYear;
    
    fetchPITReq({
      successRes: (response: any) => {
        const summaryData = response?.data?.data || response?.data;
        
        // CRITICAL: Validate response is for the correct year
        if (summaryData && summaryData.taxYear !== requestYear) {
          console.warn("[PITPage] ⚠️ Ignoring stale PIT summary update response", {
            responseYear: summaryData.taxYear,
            requestedYear: requestYear,
            currentSelectedYear: selectedYear,
          });
          return;
        }
        
        // CRITICAL: Double-check selectedYear hasn't changed before updating state
        if (selectedYear === requestYear && accountId) {
          dispatch(pitActions.setPITSummary({
            summary: summaryData || null,
            taxYear: requestYear,
            accountId,
          }));
          toast.success("PIT summary updated successfully");
        } else {
          console.warn("[PITPage] ⚠️ Year changed during update, ignoring response");
        }
      },
      errorRes: (errorResponse: any) => {
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        toast.error(errorData?.description || "Failed to update PIT summary");
      },
      requestConfig: {
        url: `/pit/summary?${params.toString()}`,
        method: HttpMethod.PUT,
      },
    });
  }, [accountId, selectedYear, fetchPITReq, dispatch, hasPITTracking, isIndividualAccount]);

  // Fetch income sources
  const fetchIncomeSources = useCallback(() => {
    // CRITICAL: Validate account type before making API calls
    if (!isIndividualAccount) {
      console.warn("[PITPage] fetchIncomeSources: Invalid account type - PIT is only for individual and business accounts");
      return;
    }
    
    if (!accountId) {
      console.warn("[PITPage] fetchIncomeSources: accountId missing");
      return;
    }

    // CRITICAL: Always use entityType: "individual" for PIT income sources
    // This ensures we only fetch income from individual accounts, not company accounts
    const params = new URLSearchParams({
      accountId: accountId, // Individual user's ID
      entityType: "individual", // CRITICAL: Must be "individual" for PIT
    });

    // CRITICAL: Capture accountId at request time to prevent race conditions
    const requestAccountId = accountId;
    
    fetchPITReq({
      successRes: (response: any) => {
        const incomesData = response?.data?.data || response?.data || [];
        
        // CRITICAL: Validate accountId hasn't changed before updating state
        // This prevents race conditions when user switches accounts or years
        if (accountId === requestAccountId && accountId) {
          // CRITICAL: Store income sources with individual user's accountId
          // All income sources have entityType: "individual" (validated by API)
          dispatch(pitActions.setIncomeSources({
            incomeSources: Array.isArray(incomesData) ? incomesData : [],
            accountId, // Individual user's ID (NOT a company ID)
          }));
        } else {
          console.warn("[PITPage] ⚠️ Account changed during fetch, ignoring income sources response", {
            requestAccountId,
            currentAccountId: accountId,
          });
        }
      },
      errorRes: (errorResponse: any) => {
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        console.error("[PITPage] ❌ Error fetching income sources:", {
          status: errorResponse?.status,
          error: errorData?.description || errorData?.message || "Unknown error",
        });
        // Set empty array on error to prevent UI breakage
        dispatch(pitActions.setIncomeSources({
          incomeSources: [],
          accountId,
        }));
      },
      requestConfig: {
        url: `/income?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [accountId, fetchPITReq, dispatch, isIndividualAccount]);

  // Fetch PIT remittances
  const fetchRemittances = useCallback(() => {
    // CRITICAL: Validate account type before making API calls
    if (!isIndividualAccount) {
      console.warn("[PITPage] fetchRemittances: Invalid account type - PIT page is only for individual accounts");
      return;
    }
    
    if (!accountId) {
      console.warn("[PITPage] fetchRemittances: accountId missing");
      return;
    }
    
    // CRITICAL: Always fetch remittances for preview (even if user doesn't have access)
    // API will return 403 with upgradeRequired if user doesn't have access
    // This ensures preview is shown to all users, with upgrade prompts when needed

    const params = new URLSearchParams({
      accountId: accountId,
      taxYear: selectedYear.toString(),
    });

    // CRITICAL: Capture selectedYear and accountId at request time to prevent race conditions
    const requestYear = selectedYear;
    const requestAccountId = accountId;
    
    fetchPITReq({
      successRes: (response: any) => {
        const remittancesData = response?.data?.data || response?.data || [];
        
        // CRITICAL: Validate accountId and year haven't changed before updating state
        // This prevents race conditions when user switches years or accounts quickly
        if (accountId === requestAccountId && selectedYear === requestYear && accountId) {
          dispatch(pitActions.setPITRemittances({
            remittances: Array.isArray(remittancesData) ? remittancesData : [],
            accountId,
          }));
        } else {
          console.warn("[PITPage] ⚠️ Year or account changed during fetch, ignoring remittances response", {
            requestYear,
            currentSelectedYear: selectedYear,
            requestAccountId,
            currentAccountId: accountId,
          });
        }
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status || errorResponse?.response?.status;
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        const upgradeRequired = errorData?.upgradeRequired || errorData?.data?.upgradeRequired;
        
        if (status === 403 && upgradeRequired) {
          showUpgradePrompt({
            feature: upgradeRequired.feature || "PIT Remittance Tracking",
            currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
            requiredPlan: upgradeRequired.requiredPlan || "starter",
            requiredPlanPrice: upgradeRequired.requiredPlanPrice || SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
            message: errorData?.description || "PIT remittance tracking is available on Starter plan (₦3,500/month) and above.",
            reason: upgradeRequired.reason || "plan_limitation",
          });
          dispatch(pitActions.setError(null));
        } else if (status === 404) {
          // 404 means no remittances found - this is valid
          dispatch(pitActions.setPITRemittances({
            remittances: [],
            accountId,
          }));
          return false;
        } else {
          dispatch(pitActions.setPITRemittances({
            remittances: [],
            accountId,
          }));
        }
        return true;
      },
      requestConfig: {
        url: `/pit/remittance?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [accountId, selectedYear, fetchPITReq, dispatch, currentPlan, showUpgradePrompt, isIndividualAccount]);

  // Fetch all PIT data
  // NOTE: These are HTTP requests with callbacks, not promises, so we can't await them
  // Each function handles its own state updates and errors
  const fetchAllPITData = useCallback(() => {
    // CRITICAL: Validate account type before making any API calls
    if (!isIndividualAccount) {
      console.warn("[PITPage] fetchAllPITData: Invalid account type - PIT is only for individual and business accounts");
      return;
    }
    
    if (!accountId) {
      console.warn("[PITPage] fetchAllPITData: accountId missing");
      return;
    }

    if (!hasPITTracking) {
      console.warn("[PITPage] fetchAllPITData: No PIT tracking access");
      return;
    }

    dispatch(pitActions.setLoading(true));
    
    // Fetch summary first (this will create/update it if needed)
    fetchSummary();
    
    // Fetch income sources and remittances (they're independent of summary)
    fetchIncomeSources();
    
    // CRITICAL: Always try to fetch remittances - let API handle access control
    // API will return 403 with upgradeRequired if user doesn't have access
    // This ensures upgrade prompts are shown automatically
    fetchRemittances();
    
    // NOTE: Loading state will be set to false by individual fetch functions
    // via Redux actions (setPITSummary, setIncomeSources, setPITRemittances)
  }, [accountId, hasPITTracking, fetchSummary, fetchIncomeSources, fetchRemittances, dispatch, isIndividualAccount]);

  // CRITICAL: Update tax year in Redux when it changes
  // CRITICAL: Immediately refetch data when year changes to prevent stale data
  // CRITICAL: Ensure selectedYear is always >= 2026 per Nigeria Tax Act 2025
  useEffect(() => {
    // Enforce minimum year 2026 - this app does NOT support tax years before 2026
    if (selectedYear < 2026) {
      console.warn(`[PITPage] Invalid tax year ${selectedYear} detected. Enforcing minimum 2026 per Nigeria Tax Act 2025.`);
      setSelectedYear(2026);
      return;
    }
    
    if (selectedYear !== taxYear) {
      dispatch(pitActions.setTaxYear(selectedYear));
      dispatch(pitActions.invalidateCache());
      // CRITICAL: Refetch data immediately when year changes to prevent stale data
      // Only refetch if we have valid account and access
      if (isIndividualAccount && accountId && hasPITTracking) {
        fetchAllPITData();
      }
    }
  }, [selectedYear, taxYear, dispatch, isIndividualAccount, accountId, hasPITTracking, fetchAllPITData]);

  // Initial data fetch
  // CRITICAL: Only fetch if user is an individual account
  // CRITICAL: Include selectedYear in dependencies to refetch when year changes
  useEffect(() => {
    if (isIndividualAccount && accountId && hasPITTracking && (!hasFetched || pitAccountId !== accountId)) {
      fetchAllPITData();
    }
  }, [isIndividualAccount, accountId, hasPITTracking, hasFetched, pitAccountId, selectedYear, fetchAllPITData]);

  // CRITICAL: Refetch PIT data when cache is invalidated (e.g., when expenses are added/updated/deleted)
  // This ensures PIT summary reflects the latest expense changes immediately
  // 
  // IMPORTANT: This effect handles cache invalidation from other pages (e.g., expenses page)
  // When expenses are deleted, the expenses page invalidates PIT cache, which sets hasFetched = false
  // This effect detects that change and immediately refetches, ensuring data is always up-to-date
  useEffect(() => {
    // Only refetch if:
    // 1. User is individual account
    // 2. Account ID exists
    // 3. PIT tracking is enabled
    // 4. Cache was invalidated (hasFetched is false)
    // 5. Not currently loading (to avoid duplicate requests)
    // 6. Account ID matches (to avoid refetching for wrong account)
    if (
      isIndividualAccount &&
      accountId &&
      hasPITTracking &&
      !hasFetched &&
      !isLoading &&
      pitAccountId === accountId
    ) {
      // Cache was invalidated (hasFetched became false), refetch data immediately
      console.log("[PITPage] Cache invalidated, refetching PIT data", {
        accountId,
        taxYear: selectedYear,
        timestamp: new Date().toISOString(),
      });
      fetchAllPITData();
    }
  }, [isIndividualAccount, accountId, hasPITTracking, hasFetched, isLoading, pitAccountId, selectedYear, fetchAllPITData]);

  // Calculate filing deadline
  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  const getFilingDeadline = (year: number): Date => {
    // Ensure year is 2026 or later
    const validYear = Math.max(2026, year);
    const deadline = new Date(validYear + 1, NRS_PIT_FILING_DEADLINE_MONTH - 1, NRS_PIT_FILING_DEADLINE_DAY);
    deadline.setHours(23, 59, 59, 999);
    return deadline;
  };

  // Check if deadline has passed
  const isDeadlinePassed = (deadline: string): boolean => {
    return new Date() > new Date(deadline);
  };

  // Get days until deadline
  const getDaysUntilDeadline = (deadline: string): number => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Handle refresh
  const handleRefresh = () => {
    dispatch(pitActions.invalidateCache());
    fetchAllPITData();
  };

  // Handle recalculate
  const handleRecalculate = () => {
    // CRITICAL: Validate account type before recalculating
    if (!isIndividualAccount) {
      console.warn("[PITPage] handleRecalculate: Invalid account type - PIT page is only for individual accounts");
      return;
    }
    
    if (!hasPITTracking) {
      showUpgradePrompt({
        feature: "PIT Tracking",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "free",
        requiredPlanPrice: 0,
        message: "PIT tracking is available on all plans. This feature should be accessible.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }
    updateSummary();
  };

  // Generate available years (2026 onward only, per Nigeria Tax Act 2025)
  // CRITICAL: This app only supports tax years 2026 and onward
  const currentYear = now.getFullYear();
  const minYear = 2026; // Nigeria Tax Act 2025 effective date
  const maxYear = Math.max(minYear, currentYear);
  const availableYears = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  // Calculate deadline info
  const filingDeadline = summary ? new Date(summary.filingDeadline) : getFilingDeadline(selectedYear);
  const daysUntilDeadline = summary ? getDaysUntilDeadline(summary.filingDeadline) : getDaysUntilDeadline(filingDeadline.toISOString());
  const isOverdue = summary ? isDeadlinePassed(summary.filingDeadline) : isDeadlinePassed(filingDeadline.toISOString());

  // Loading state
  if (isLoading && !hasFetched) {
    return (
      <RouteGuard requireAccountType={AccountType.Individual} redirectTo="/dashboard/expenses" loadingMessage="Loading PIT information...">
        <LoadingState message="Loading PIT information..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // Error state
  if (error && !summary && hasFetched) {
    const errorProps = createErrorStateProps(error);
    return (
      <RouteGuard requireAccountType={AccountType.Individual} redirectTo="/dashboard/expenses" loadingMessage="Loading PIT information...">
        <ErrorState
          {...errorProps}
          title="Could Not Load PIT Data"
          primaryAction={{
            label: "Try Again",
            onClick: handleRefresh,
            icon: RefreshCw,
          }}
        />
      </RouteGuard>
    );
  }

  // CRITICAL: This page is exclusively for Individual accounts
  // Business accounts should use /dashboard/business/pit
  return (
    <RouteGuard requireAccountType={AccountType.Individual} redirectTo="/dashboard/expenses" loadingMessage="Loading PIT information...">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <UpgradePromptComponent />

        {/* Header */}
        <PITHeader
          isLoading={isLoading}
          hasPITTracking={hasPITTracking}
          onRefresh={handleRefresh}
          onRecalculate={handleRecalculate}
          currentYear={selectedYear}
          onShowGuide={() => setIsGuideModalOpen(true)}
        />

        {/* Info Banner */}
        <PITInfoBanner />

        {/* Year Filter */}
        <PITYearFilter
          selectedYear={selectedYear}
          availableYears={availableYears}
          filingDeadline={filingDeadline}
          isOverdue={isOverdue}
          daysUntilDeadline={daysUntilDeadline}
          onYearChange={handleYearChange}
        />

        {/* Summary Cards */}
        <AnimatePresence mode="wait">
          {summary && (
            <motion.div
              key={`summary-cards-${selectedYear}`}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <PITSummaryCards summary={summary} isBusiness={false} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Employment Deductions Section */}
        {/* CRITICAL: Employment deductions (Pension, NHF, NHIS) affect PIT calculations
            Users can enter these values here, and they will be used in calculations
            This is especially important for employed individuals */}
        {accountId && (
          <motion.div
            key={`employment-deductions-${selectedYear}`}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <PITEmploymentDeductions
              accountId={accountId}
              taxYear={selectedYear}
              onDeductionsUpdated={() => {
                // Invalidate cache and refetch PIT data when deductions are updated
                dispatch(pitActions.invalidateCache());
                fetchAllPITData();
              }}
              totalGrossIncome={summary?.totalGrossIncome || 0}
              isBusiness={false}
            />
          </motion.div>
        )}

        {/* Detailed Breakdown */}
        <AnimatePresence mode="wait">
          {summary && (
            <motion.div
              key={`calculation-breakdown-${selectedYear}`}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <PITCalculationBreakdown
                summary={summary}
                selectedYear={selectedYear}
                isBusiness={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Income Sources Section */}
        <motion.div
          key={`income-sources-${selectedYear}`}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <PITIncomeSources
            incomeSources={incomeSources}
            selectedYear={selectedYear}
            isBusiness={false}
          />
        </motion.div>

        {/* Remittances Preview Section */}
        {/* CRITICAL: This is a READ-ONLY preview, consistent with Income Sources pattern
            Full remittance management happens on /dashboard/pit/remittances page
            This ensures PIT page focuses on calculations, not data management */}
        <PITRemittancesPreview
          remittances={remittances}
          selectedYear={selectedYear}
        />

        {/* Compliance Disclaimer */}
        <PITComplianceDisclaimer />

        {/* Next Step Navigation */}
        <NextStepCard
          title="Next Step: File Your Returns"
          description="You've reviewed your consolidated Personal Income Tax. It's time to generate your official tax filings."
          href="/dashboard/tax-filing"
          actionLabel="Go to Tax Filing"
        />

        {/* Guide Modal */}
        <PitGuideModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
        />
      </motion.div>
    </RouteGuard>
  );
}
