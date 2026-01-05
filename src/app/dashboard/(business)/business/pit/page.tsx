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
import { ExemptionReason } from "@/lib/utils/exemption-reason";
import { toast } from "sonner";
import {
  PITHeader,
  PITYearFilter,
  PITSummaryCards,
  PITCalculationBreakdown,
  PITIncomeSources,
  PITRemittancesSection,
  PITEmploymentDeductions,
} from "@/components/dashboard/pit";
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

/**
 * Business Account PIT Page
 * 
 * CRITICAL: Business accounts (sole proprietorships) use PIT (Personal Income Tax), NOT CIT (Company Income Tax).
 * This page is exclusively for Business accounts, maintaining separation from Individual accounts.
 * 
 * Data Flow:
 * 1. RouteGuard validates accountType === "business" and redirects if not
 * 2. API endpoints validate accountType via requireAccountType(["business"]) or ["individual", "business"]
 * 3. API controllers validate accountId === userId.toString() (business owner's ID)
 * 4. All income sources use entityType: "individual" (PIT is personal tax)
 * 5. All PIT calculations use business account data only
 *
 * accountId Source:
 * - For business accounts (sole proprietorships): accountId = user._id (the owner's ID)
 * - This is NOT a company ID - PIT is personal tax, not company tax
 * - All API calls use this user ID to fetch their business income/expenses
 */
export default function BusinessPITPage() {
  const dispatch = useAppDispatch();
  
  // Get user from Redux
  const { user } = useAppSelector((state: any) => state.user);
  
  // CRITICAL: Validate user and accountType - fail loudly if invalid
  if (!user) {
    throw new Error(
      "BusinessPITPage: User is required. This page should not render without authenticated user."
    );
  }

  if (!user.accountType) {
    throw new Error(
      "BusinessPITPage: user.accountType is required. User object must have accountType property."
    );
  }

  // CRITICAL: Validate accountType is Business - fail loudly if not
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    throw new Error(
      `BusinessPITPage: Invalid user.accountType "${user.accountType}". ` +
      `Valid values are: ${validAccountTypes.join(", ")}. ` +
      "Use AccountType enum, not string literals."
    );
  }

  if (user.accountType !== AccountType.Business) {
    throw new Error(
      `BusinessPITPage: This page is exclusively for Business accounts. ` +
      `Current account type: ${user.accountType}. ` +
      "Use RouteGuard to prevent invalid access."
    );
  }

  const accountType = user.accountType;
  const isBusinessAccount = accountType === AccountType.Business;
  
  // CRITICAL: accountId must be the user's ID (the business owner's ID)
  // For business accounts (sole proprietorships): accountId === user._id.toString()
  // This ensures we fetch data from the business owner's account, not a company account
  const accountId = isBusinessAccount ? (user?._id?.toString() || null) : null;
  
  // CRITICAL: Validate accountId - fail loudly if missing
  if (!accountId) {
    throw new Error(
      "BusinessPITPage: accountId is required. User._id must be available."
    );
  }
  
  // Get subscription from Redux subscription slice
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
  
  const { isLoading: isHttpLoading, sendHttpRequest: fetchPITReq } = useHttp();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
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
      console.warn(`[BusinessPITPage] Attempted to select year ${year}, but minimum is 2026. Using ${validYear} instead.`);
    }
    setSelectedYear(validYear);
  }, []);

  // Fetch PIT summary
  const fetchSummary = useCallback(() => {
    // CRITICAL: Validate account type and accountId before making API calls
    if (!isBusinessAccount) {
      console.warn("[BusinessPITPage] fetchSummary: Invalid account type - PIT is only for business accounts");
      return;
    }
    
    if (!accountId || !hasPITTracking) {
      console.warn("[BusinessPITPage] fetchSummary: accountId missing or no PIT tracking access");
      return;
    }

    const params = new URLSearchParams({
      accountId: accountId,
      taxYear: selectedYear.toString(),
    });

    console.log("[BusinessPITPage] Fetching PIT summary:", {
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
          console.warn("[BusinessPITPage] ⚠️ Ignoring stale PIT summary response", {
            responseYear: summaryData.taxYear,
            requestedYear: requestYear,
            currentSelectedYear: selectedYear,
          });
          return; // Ignore stale response
        }
        
        console.log("[BusinessPITPage] ✅ PIT summary received:", {
          accountId,
          taxYear: requestYear,
          summary: summaryData ? {
            totalGrossIncome: summaryData.totalGrossIncome,
            businessIncome: summaryData.totalBusinessIncome, // Show calculated business revenue
            personalIncome: summaryData.totalPersonalIncome, // Show manual personal income
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
          console.warn("[BusinessPITPage] ⚠️ Year changed during fetch, ignoring response", {
            responseYear: requestYear,
            currentSelectedYear: selectedYear,
          });
        }
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status || errorResponse?.response?.status;
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        const upgradeRequired = errorData?.upgradeRequired || errorData?.data?.upgradeRequired;
        
        console.error("[BusinessPITPage] ❌ Error fetching PIT summary:", {
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
          console.warn("[BusinessPITPage] Unexpected 404 - retrying fetch to trigger summary creation...");
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
  }, [accountId, selectedYear, fetchPITReq, dispatch, currentPlan, showUpgradePrompt, hasPITTracking, isBusinessAccount]);

  // Update/recalculate PIT summary
  const updateSummary = useCallback(() => {
    // CRITICAL: Validate account type before making API calls
    if (!isBusinessAccount) {
      console.warn("[BusinessPITPage] updateSummary: Invalid account type - PIT is only for business accounts");
      return;
    }
    
    if (!accountId || !hasPITTracking) {
      console.warn("[BusinessPITPage] updateSummary: accountId missing or no PIT tracking access");
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
          console.warn("[BusinessPITPage] ⚠️ Ignoring stale PIT summary update response", {
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
          console.warn("[BusinessPITPage] ⚠️ Year changed during update, ignoring response");
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
  }, [accountId, selectedYear, fetchPITReq, dispatch, hasPITTracking, isBusinessAccount]);

  // Fetch income sources
  const fetchIncomeSources = useCallback(() => {
    // CRITICAL: Validate account type before making API calls
    if (!isBusinessAccount) {
      console.warn("[BusinessPITPage] fetchIncomeSources: Invalid account type - PIT is only for business accounts");
      return;
    }
    
    if (!accountId) {
      console.warn("[BusinessPITPage] fetchIncomeSources: accountId missing");
      return;
    }

    // CRITICAL: Fetch BOTH Individual and Business incomes
    // Sole proprietors are taxed on both personal and business income
    const individualParams = new URLSearchParams({
      accountId: accountId,
      entityType: "individual",
    });

    const businessParams = new URLSearchParams({
      accountId: accountId,
      entityType: "business",
    });

    // We need to fetch both. Since useHttp callback style is tricky for parallel, 
    // we'll fetch them sequentially or we need a way to merge.
    // Better approach: Fetch Individual first, then Business, then merge.
    
    // 1. Fetch Individual
    fetchPITReq({
      successRes: (indResponse: any) => {
        const indIncomes = indResponse?.data?.data || indResponse?.data || [];
        
        // 2. Set Incomes (Only Individual/Manual)
        // Business income comes from invoices and is part of the summary (totalBusinessIncome)
        if (accountId) {
          dispatch(pitActions.setIncomeSources({
            incomeSources: Array.isArray(indIncomes) ? indIncomes : [],
            accountId,
          }));
        }
      },

      errorRes: (errorResponse: any) => {
        console.error("[BusinessPITPage] ❌ Error fetching income sources:", errorResponse);
        dispatch(pitActions.setIncomeSources({
          incomeSources: [],
          accountId,
        }));
      },
      requestConfig: {
        url: `/income?${individualParams.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [accountId, fetchPITReq, dispatch, isBusinessAccount]);

  // Fetch PIT remittances
  const fetchRemittances = useCallback(() => {
    // CRITICAL: Validate account type before making API calls
    if (!isBusinessAccount) {
      console.warn("[BusinessPITPage] fetchRemittances: Invalid account type - PIT is only for business accounts");
      return;
    }
    
    if (!accountId) {
      console.warn("[BusinessPITPage] fetchRemittances: accountId missing");
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
          console.warn("[BusinessPITPage] ⚠️ Year or account changed during fetch, ignoring remittances response", {
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
  }, [accountId, selectedYear, fetchPITReq, dispatch, currentPlan, showUpgradePrompt, isBusinessAccount]);

  // Fetch all PIT data
  // NOTE: These are HTTP requests with callbacks, not promises, so we can't await them
  // Each function handles its own state updates and errors
  const fetchAllPITData = useCallback(() => {
    // CRITICAL: Validate account type before making any API calls
    if (!isBusinessAccount) {
      console.warn("[BusinessPITPage] fetchAllPITData: Invalid account type - PIT is only for business accounts");
      return;
    }
    
    if (!accountId) {
      console.warn("[BusinessPITPage] fetchAllPITData: accountId missing");
      return;
    }

    if (!hasPITTracking) {
      console.warn("[BusinessPITPage] fetchAllPITData: No PIT tracking access");
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
  }, [accountId, hasPITTracking, fetchSummary, fetchIncomeSources, fetchRemittances, dispatch, isBusinessAccount]);

  // CRITICAL: Update tax year in Redux when it changes
  // CRITICAL: Immediately refetch data when year changes to prevent stale data
  // CRITICAL: Ensure selectedYear is always >= 2026 per Nigeria Tax Act 2025
  useEffect(() => {
    // Enforce minimum year 2026 - this app does NOT support tax years before 2026
    if (selectedYear < 2026) {
      console.warn(`[BusinessPITPage] Invalid tax year ${selectedYear} detected. Enforcing minimum 2026 per Nigeria Tax Act 2025.`);
      setSelectedYear(2026);
      return;
    }
    
    if (selectedYear !== taxYear) {
      dispatch(pitActions.setTaxYear(selectedYear));
      dispatch(pitActions.invalidateCache());
      // CRITICAL: Refetch data immediately when year changes to prevent stale data
      // Only refetch if we have valid account and access
      if (isBusinessAccount && accountId && hasPITTracking) {
        fetchAllPITData();
      }
    }
  }, [selectedYear, taxYear, dispatch, isBusinessAccount, accountId, hasPITTracking, fetchAllPITData]);

  // Initial data fetch
  // CRITICAL: Only fetch if user is a business account
  // CRITICAL: Include selectedYear in dependencies to refetch when year changes
  useEffect(() => {
    if (isBusinessAccount && accountId && hasPITTracking && (!hasFetched || pitAccountId !== accountId)) {
      fetchAllPITData();
    }
  }, [isBusinessAccount, accountId, hasPITTracking, hasFetched, pitAccountId, selectedYear, fetchAllPITData]);

  // CRITICAL: Refetch PIT data when cache is invalidated (e.g., when expenses are added/updated/deleted)
  // This ensures PIT summary reflects the latest expense changes immediately
  // 
  // IMPORTANT: This effect handles cache invalidation from other pages (e.g., expenses page)
  // When expenses are deleted, the expenses page invalidates PIT cache, which sets hasFetched = false
  // This effect detects that change and immediately refetches, ensuring data is always up-to-date
  useEffect(() => {
    // Only refetch if:
    // 1. User is business account
    // 2. Account ID exists
    // 3. PIT tracking is enabled
    // 4. Cache was invalidated (hasFetched is false)
    // 5. Not currently loading (to avoid duplicate requests)
    // 6. Account ID matches (to avoid refetching for wrong account)
    if (
      isBusinessAccount &&
      accountId &&
      hasPITTracking &&
      !hasFetched &&
      !isLoading &&
      pitAccountId === accountId
    ) {
      // Cache was invalidated (hasFetched became false), refetch data immediately
      console.log("[BusinessPITPage] Cache invalidated, refetching PIT data", {
        accountId,
        taxYear: selectedYear,
        timestamp: new Date().toISOString(),
      });
      fetchAllPITData();
    }
  }, [isBusinessAccount, accountId, hasPITTracking, hasFetched, isLoading, pitAccountId, selectedYear, fetchAllPITData]);

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
    if (!isBusinessAccount) {
      console.warn("[BusinessPITPage] handleRecalculate: Invalid account type - PIT is only for business accounts");
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
      <RouteGuard requireAccountType={AccountType.Business} redirectTo="/dashboard/expenses" loadingMessage="Loading PIT information...">
        <LoadingState message="Loading PIT information..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // Error state
  if (error && !summary && hasFetched) {
    const errorProps = createErrorStateProps(error);
    return (
      <RouteGuard requireAccountType={AccountType.Business} redirectTo="/dashboard/expenses" loadingMessage="Loading PIT information...">
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

  return (
    <RouteGuard requireAccountType={AccountType.Business} redirectTo="/dashboard/expenses" loadingMessage="Loading PIT information...">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <UpgradePromptComponent />

        {/* Header */}
        <PITHeader
          isLoading={isLoading || isHttpLoading}
          hasPITTracking={hasPITTracking}
          onRefresh={handleRefresh}
          onRecalculate={handleRecalculate}
          currentYear={selectedYear}
          onShowGuide={() => setIsGuideOpen(true)}
        />

        {/* Year Filter */}
        <PITYearFilter
          selectedYear={selectedYear}
          availableYears={availableYears}
          filingDeadline={filingDeadline}
          isOverdue={isOverdue}
          daysUntilDeadline={daysUntilDeadline}
          onYearChange={handleYearChange}
        />
        
        <PitGuideModal 
          isOpen={isGuideOpen} 
          onClose={() => setIsGuideOpen(false)}
          summary={summary || undefined}
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
              <PITSummaryCards summary={summary} isBusiness={true} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Employment Deductions Section */}
        {/* CRITICAL: Employment deductions (Pension, NHF, NHIS) affect PIT calculations
            Users can enter these values here, and they will be used in calculations
            This is especially important for business owners with employees */}
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
              isBusiness={true}
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
                isBusiness={true}
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
            totalBusinessIncome={summary?.totalBusinessIncome || 0}
            isBusiness={true}
          />
        </motion.div>

        {/* Remittances Section */}
        {/* CRITICAL: Full remittance management integrated into PIT page
            All remittance CRUD operations available directly on this page
            No separate page needed - better UX and consistency */}
        {/* CRITICAL: Only render if we have required data - summary might be null/undefined during loading
            Fail loudly if summary exists but is missing required fields */}
        {accountId && summary !== undefined && summary !== null && (() => {
          // CRITICAL: Validate summary structure - fail loudly if invalid
          if (typeof summary.isFullyExempt !== "boolean") {
            throw new Error(`BusinessPITPage: summary.isFullyExempt must be a boolean, received ${typeof summary.isFullyExempt}`);
          }
          
          if (typeof summary.pitAfterWHT !== "number" || isNaN(summary.pitAfterWHT)) {
            throw new Error(`BusinessPITPage: summary.pitAfterWHT must be a valid number, received ${summary.pitAfterWHT}`);
          }
          
          if (summary.pitAfterWHT < 0) {
            throw new Error(`BusinessPITPage: summary.pitAfterWHT cannot be negative, received ${summary.pitAfterWHT}`);
          }
          
          // exemptionReason is optional - only validate if present
          if (summary.exemptionReason !== undefined && summary.exemptionReason !== null) {
            const validReasons = Object.values(ExemptionReason);
            if (!validReasons.includes(summary.exemptionReason)) {
              throw new Error(`BusinessPITPage: summary.exemptionReason must be a valid ExemptionReason enum value, received ${summary.exemptionReason}`);
            }
          }
          
          return (
            <PITRemittancesSection
              remittances={remittances}
              accountId={accountId}
              taxYear={selectedYear}
              onRemittanceUpdated={() => {
                // CRITICAL: Invalidate PIT summary cache when remittances change
                // This ensures PIT summary reflects updated remittances immediately
                // Remittances directly affect PIT calculations: pitPending = pitAfterWHT - pitRemitted
                dispatch(pitActions.invalidateCache());
                fetchRemittances();
                // Refetch summary after a short delay to ensure backend has processed the remittance
                // This prevents race conditions and reduces unnecessary API calls
                setTimeout(() => {
                  fetchSummary();
                }, 500);
              }}
              currentPlan={currentPlan}
              isFullyExempt={summary.isFullyExempt}
              exemptionReason={summary.exemptionReason || null}
              pitAfterWHT={summary.pitAfterWHT}
            />
          );
        })()}

        {/* Compliance Disclaimer - Removed (Moved to Guide Modal) */}
      </motion.div>
    </RouteGuard>
  );
}

