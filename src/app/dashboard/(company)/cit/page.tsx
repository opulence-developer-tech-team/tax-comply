"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { citActions, type CITSummary, type CITRemittance } from "@/store/redux/cit/cit-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { ButtonVariant, ButtonSize, LoadingStateSize } from "@/lib/utils/client-enums";
import { TaxClassification } from "@/lib/utils/tax-classification";
import { RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Wallet, Building2, ShieldCheck, PieChart } from "lucide-react";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { toast } from "sonner";
import { CITRemittanceTracker } from "@/components/dashboard/cit/CITRemittanceTracker";
import Link from "next/link";
import { CitGuideModal } from "@/components/dashboard/cit/CitGuideModal";

import { NRS_CIT_DEADLINE_MONTH, NRS_CIT_DEADLINE_DAY } from "@/lib/constants/nrs-constants";
import { NextStepCard } from "@/components/shared/NextStepCard";

// NRS CIT Filing Deadline: June 30 of the following year
// Reference: Nigeria Tax Act 2025 (effective from 2026)
// Note: NRS has been rebranded as NRS (Nigeria Revenue Service) effective January 1, 2026
// Constants imported from source of truth to prevent drift


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

export default function CITPage() {
  const dispatch = useAppDispatch();
  
  // Get user from Redux
  const { user } = useAppSelector((state: any) => state.user);
  
  // CRITICAL: CIT (Company Income Tax) is EXCLUSIVELY for Company accounts
  // Business accounts (sole proprietorships) use PIT (Personal Income Tax), not CIT
  const accountType = user?.accountType;
  const isCompanyAccount = accountType === AccountType.Company;
  
  // Get companyId from Redux company state
  const { selectedCompanyId, isLoading: isLoadingCompany } = useAppSelector((state: any) => state.company);
  const companyId = selectedCompanyId;
  
  // Get subscription from Redux subscription slice
  const { currentSubscription } = useAppSelector((state: any) => state.subscription);
  
  // Get CIT state from Redux
  const {
    summary,
    remittances,
    taxYear,
    companyId: citCompanyId,
    hasFetched,
    isLoading,
    error,
  } = useAppSelector((state: any) => state.cit);
  
  const { sendHttpRequest: fetchCITReq } = useHttp();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  const currentPlan = (currentSubscription?.plan || SubscriptionPlan.Free) as SubscriptionPlan;
  const hasCITAccess = SUBSCRIPTION_PRICING[currentPlan]?.features?.citTracking === true;
  const hasCITRemittance = SUBSCRIPTION_PRICING[currentPlan]?.features?.citRemittance === true;
  
  // Filter state - initialize from Redux state if available
  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  const minTaxYear = 2026;
  const now = new Date();
  const currentYear = now.getFullYear();
  // CRITICAL: Ensure maxTaxYear is at least minTaxYear to always have at least one option
  const maxTaxYear = Math.max(minTaxYear, currentYear);
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (taxYear) return Math.max(minTaxYear, taxYear);
    return Math.max(minTaxYear, currentYear);
  });
  const [isInfoBannerExpanded, setIsInfoBannerExpanded] = useState(false);
  const [isCalculationBreakdownExpanded, setIsCalculationBreakdownExpanded] = useState(false); // Collapsed by default
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Sync companyId in Redux when it changes
  useEffect(() => {
    if (companyId && companyId !== citCompanyId) {
      dispatch(citActions.setTaxYear(selectedYear));
    }
  }, [companyId, citCompanyId, selectedYear, dispatch]);

  // Update tax year in Redux when it changes
  useEffect(() => {
    if (selectedYear !== taxYear) {
      dispatch(citActions.setTaxYear(selectedYear));
    }
  }, [selectedYear, taxYear, dispatch]);

  // Fetch CIT summary
  const fetchCITSummary = useCallback(async () => {
    if (!companyId) {
      console.warn("[CIT_PAGE] ⚠️ Cannot fetch CIT summary - companyId is missing");
      return;
    }

    console.log("===========================================");
    console.log("[CIT_PAGE] 🚀 FETCHING CIT SUMMARY");
    console.log("===========================================");
    console.log("[CIT_PAGE] Request Parameters:", {
      companyId,
      taxYear: selectedYear,
      timestamp: new Date().toISOString(),
    });
    console.log("[CIT_PAGE] API URL:", `/cit/summary?companyId=${companyId}&taxYear=${selectedYear}`);

    dispatch(citActions.setLoading(true));

    fetchCITReq({
      successRes: (response: any) => {
        console.log("===========================================");
        console.log("[CIT_PAGE] 🔍 CIT SUMMARY API RESPONSE RECEIVED");
        console.log("===========================================");
        console.log("[CIT_PAGE] Request Parameters:", {
          companyId,
          taxYear: selectedYear,
          timestamp: new Date().toISOString(),
        });
        console.log("[CIT_PAGE] Full Response Object:", response);
        console.log("[CIT_PAGE] Response.data:", response.data);
        console.log("[CIT_PAGE] Response.data.data:", response.data?.data);
        console.log("[CIT_PAGE] Response Keys:", {
          responseKeys: Object.keys(response || {}),
          dataKeys: Object.keys(response.data || {}),
          dataDataKeys: response.data?.data ? Object.keys(response.data.data) : null,
        });
        console.log("[CIT_PAGE] CIT Rate Check:", {
          citRateFromResponse: response.data?.citRate,
          citRateFromDataData: response.data?.data?.citRate,
          citRateTypeFromResponse: typeof response.data?.citRate,
          citRateTypeFromDataData: typeof response.data?.data?.citRate,
          citRateIsNaN: isNaN(response.data?.citRate),
        });
        console.log("[CIT_PAGE] Tax Classification Check:", {
          taxClassificationFromResponse: response.data?.taxClassification,
          taxClassificationFromDataData: response.data?.data?.taxClassification,
        });

        // CRITICAL: Handle nested response structure (response.data.data)
        const summaryData = response.data?.data || response.data;
        
        console.log("[CIT_PAGE] Extracted Summary Data:", summaryData);
        console.log("[CIT_PAGE] Summary Data Keys:", summaryData ? Object.keys(summaryData) : "N/A");
        
        if (!summaryData) {
          console.error("===========================================");
          console.error("[CIT_PAGE] ❌ CRITICAL ERROR: Response data is missing");
          console.error("===========================================");
          console.error("[CIT_PAGE] Full Response:", response);
          console.error("[CIT_PAGE] Response.data:", response.data);
          dispatch(citActions.setError("Failed to fetch CIT summary - response data is missing"));
          return;
        }

        console.log("[CIT_PAGE] Summary Data Values:", {
          companyId: summaryData.companyId,
          taxYear: summaryData.taxYear,
          totalRevenue: summaryData.totalRevenue,
          totalExpenses: summaryData.totalExpenses,
          taxableProfit: summaryData.taxableProfit,
          taxClassification: summaryData.taxClassification,
          citRate: summaryData.citRate,
          citRateType: typeof summaryData.citRate,
          citRateIsNaN: isNaN(summaryData.citRate),
          citRateIsFinite: isFinite(summaryData.citRate),
          citBeforeWHT: summaryData.citBeforeWHT,
          whtCredits: summaryData.whtCredits,
          citAfterWHT: summaryData.citAfterWHT,
          totalCITRemitted: summaryData.totalCITRemitted,
          totalCITPending: summaryData.totalCITPending,
          status: summaryData.status,
        });
        
        console.log("[CIT_PAGE] ⚠️ ZERO VALUE CHECK:", {
          totalRevenueIsZero: summaryData.totalRevenue === 0,
          totalExpensesIsZero: summaryData.totalExpenses === 0,
          taxableProfitIsZero: summaryData.taxableProfit === 0,
          citAfterWHTIsZero: summaryData.citAfterWHT === 0,
          allValuesZero: summaryData.totalRevenue === 0 && summaryData.totalExpenses === 0 && summaryData.citAfterWHT === 0,
        });

        // CRITICAL: Validate citRate before dispatching - fail loudly if invalid
        if (summaryData.citRate === undefined || summaryData.citRate === null) {
          console.error("[CIT_PAGE] CRITICAL ERROR: citRate is missing in summary data", {
            companyId,
            taxYear: selectedYear,
            summaryData,
            responseData: response.data,
            response,
          });
          dispatch(citActions.setError(`CRITICAL: CIT rate is missing in response. Tax classification: ${summaryData.taxClassification || "unknown"}`));
          return;
        }

        if (typeof summaryData.citRate !== "number") {
          console.error("[CIT_PAGE] CRITICAL ERROR: citRate is not a number", {
            companyId,
            taxYear: selectedYear,
            citRate: summaryData.citRate,
            citRateType: typeof summaryData.citRate,
            summaryData,
            responseData: response.data,
          });
          dispatch(citActions.setError(`CRITICAL: CIT rate is not a number. Type: ${typeof summaryData.citRate}, Value: ${summaryData.citRate}`));
          return;
        }

        if (isNaN(summaryData.citRate)) {
          console.error("[CIT_PAGE] CRITICAL ERROR: citRate is NaN", {
            companyId,
            taxYear: selectedYear,
            citRate: summaryData.citRate,
            taxClassification: summaryData.taxClassification,
            summaryData,
            responseData: response.data,
          });
          dispatch(citActions.setError(`CRITICAL: CIT rate is NaN. Tax classification: ${summaryData.taxClassification || "unknown"}`));
          return;
        }

        if (!isFinite(summaryData.citRate)) {
          console.error("[CIT_PAGE] CRITICAL ERROR: citRate is not finite", {
            companyId,
            taxYear: selectedYear,
            citRate: summaryData.citRate,
            summaryData,
            responseData: response.data,
          });
          dispatch(citActions.setError(`CRITICAL: CIT rate is not finite: ${summaryData.citRate}`));
          return;
        }

        console.log("[CIT_PAGE] ✅ Validation passed - dispatching to Redux");
        console.log("[CIT_PAGE] Redux Payload:", {
          summary: summaryData,
          taxYear: selectedYear,
          companyId: companyId,
        });

        dispatch(citActions.setCITSummary({
          summary: summaryData,
          taxYear: selectedYear,
          companyId: companyId,
        }));
        
        console.log("[CIT_PAGE] ✅ Redux state updated");
        console.log("===========================================");
      },
      errorRes: (errorResponse: any) => {
        console.error("===========================================");
        console.error("[CIT_PAGE] ❌ ERROR FETCHING CIT SUMMARY");
        console.error("===========================================");
        console.error("[CIT_PAGE] Error Response:", errorResponse);
        console.error("[CIT_PAGE] Error Details:", {
          message: errorResponse?.message,
          description: errorResponse?.description,
          data: errorResponse?.data,
          status: errorResponse?.status,
          upgradeRequired: errorResponse?.data?.upgradeRequired,
        });
        
        if (errorResponse?.data?.upgradeRequired) {
          console.warn("[CIT_PAGE] ⚠️ Upgrade required:", errorResponse.data.upgradeRequired);
          showUpgradePrompt({
            feature: errorResponse.data.upgradeRequired.feature,
            currentPlan: errorResponse.data.upgradeRequired.currentPlan,
            requiredPlan: errorResponse.data.upgradeRequired.requiredPlan,
            requiredPlanPrice: errorResponse.data.upgradeRequired.requiredPlanPrice,
          });
        } else {
          const errorMessage = errorResponse?.description || "Failed to fetch CIT summary";
          console.error("[CIT_PAGE] Setting error state:", errorMessage);
          dispatch(citActions.setError(errorMessage));
        }
        console.error("===========================================");
      },
      requestConfig: {
        url: `/cit/summary?companyId=${companyId}&taxYear=${selectedYear}`,
        method: HttpMethod.GET,
      },
    });
  }, [companyId, selectedYear, dispatch, fetchCITReq, showUpgradePrompt]);

  // Fetch CIT remittances
  const fetchRemittances = useCallback(async () => {
    if (!companyId) {
      console.log("[CIT_PAGE] fetchRemittances: companyId is missing, skipping");
      return;
    }

    console.log("[CIT_PAGE] Fetching CIT remittances:", {
      companyId,
      selectedYear,
    });

    // Check feature access
    if (!hasCITRemittance) {
       dispatch(citActions.setCITRemittances({
        remittances: [],
        companyId: companyId,
      }));
      return;
    }

    fetchCITReq({
      successRes: (response: any) => {
        console.log("[CIT_PAGE] CIT remittances fetched successfully:", {
          response,
          responseData: response?.data,
          responseDataType: typeof response?.data,
          isArray: Array.isArray(response?.data),
          length: Array.isArray(response?.data) ? response.data.length : "N/A",
          responseDataData: response?.data?.data,
          responseDataDataType: typeof response?.data?.data,
          isResponseDataDataArray: Array.isArray(response?.data?.data),
        });
        
        // CRITICAL: Extract the remittances array from the response
        // The API returns { data: { data: [...], message: "...", description: "..." } }
        // So we need response.data.data to get the actual array
        const remittancesArray = Array.isArray(response?.data?.data) 
          ? response.data.data 
          : Array.isArray(response?.data) 
            ? response.data 
            : [];
        
        console.log("[CIT_PAGE] Extracted remittances array:", {
          remittancesArray,
          remittancesArrayLength: remittancesArray.length,
          remittancesArrayType: typeof remittancesArray,
          isArray: Array.isArray(remittancesArray),
        });
        
        if (remittancesArray.length > 0 || response?.data) {
          console.log("[CIT_PAGE] Dispatching setCITRemittances with data:", {
            remittances: remittancesArray,
            companyId: companyId,
          });
          
          dispatch(citActions.setCITRemittances({
            remittances: remittancesArray,
            companyId: companyId,
          }));
          
          console.log("[CIT_PAGE] setCITRemittances dispatched");
        } else {
          console.warn("[CIT_PAGE] No remittances array found in response, response is:", response);
        }
      },
      errorRes: (errorResponse: any) => {
        // Ignore 403 (Forbidden) errors, as they likely indicate plan limitations (e.g. Free plan)
        if (errorResponse?.status === 403) {
           dispatch(citActions.setCITRemittances({
            remittances: [],
            companyId: companyId,
          }));
          return;
        }

        console.error("[CIT_PAGE] Failed to fetch CIT remittances:", {
          errorResponse,
          errorStatus: errorResponse?.status,
          errorData: errorResponse?.data,
          companyId,
          selectedYear,
        });
      },
      requestConfig: {
        url: `/cit/remittance?companyId=${companyId}&taxYear=${selectedYear}`,
        method: HttpMethod.GET,
      },
    });
  }, [companyId, selectedYear, dispatch, fetchCITReq]);

  // Fetch all CIT data
  const fetchAllCITData = useCallback(async () => {
    await Promise.all([
      fetchCITSummary(),
      fetchRemittances(),
    ]);
  }, [fetchCITSummary, fetchRemittances]);

  // CRITICAL: Log remittances from Redux state
  useEffect(() => {
    console.log("[CIT_PAGE] Remittances from Redux state:", {
      remittances,
      remittancesType: typeof remittances,
      isArray: Array.isArray(remittances),
      length: Array.isArray(remittances) ? remittances.length : "N/A",
      remittancesData: remittances,
      citCompanyId,
      companyId,
      selectedYear,
      matchCompanyId: citCompanyId === companyId,
    });
  }, [remittances, citCompanyId, companyId, selectedYear]);

  // Fetch data when companyId or taxYear changes
  useEffect(() => {
    if (companyId && !isLoadingCompany) {
      fetchAllCITData();
    }
  }, [companyId, selectedYear, isLoadingCompany, fetchAllCITData]);

  // Handle remittance update
  const handleRemittanceUpdated = useCallback(() => {
    fetchAllCITData();
  }, [fetchAllCITData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    dispatch(citActions.invalidateCache());
    fetchAllCITData();
  }, [dispatch, fetchAllCITData]);

  // Calculate filing deadline
  const getFilingDeadline = (year: number): Date => {
    // NRS_CIT_DEADLINE_MONTH is 0-indexed (5 = June)
    // Date constructor expects 0-indexed month
    return new Date(year + 1, NRS_CIT_DEADLINE_MONTH, NRS_CIT_DEADLINE_DAY);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "text-emerald-600 bg-emerald-50";
      case "pending":
        return "text-amber-600 bg-amber-50";
      case "overdue":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return "✓";
      case "pending":
        return "⏱";
      case "overdue":
        return "⚠";
      default:
        return "?";
    }
  };

  if (!isCompanyAccount) {
    return (
      <RouteGuard requireAccountType={AccountType.Company}>
        <div className="p-3 md:p-6">
          <ErrorState
            title="Access Denied"
            description="CIT (Company Income Tax) is only available for Company accounts. Business accounts (sole proprietorships) use PIT (Personal Income Tax)."
            primaryAction={{
              label: "Go to Dashboard",
              onClick: () => window.location.href = "/dashboard",
            }}
          />
        </div>
      </RouteGuard>
    );
  }

  if (isLoadingCompany || (!companyId && !isLoadingCompany)) {
    return (
      <div className="p-3 md:p-6">
        <LoadingState size={LoadingStateSize.Lg} message="Loading company data..." />
      </div>
    );
  }

  if (isLoading && !hasFetched) {
    return (
      <div className="p-3 md:p-6">
        <LoadingState size={LoadingStateSize.Lg} message="Loading CIT data..." />
      </div>
    );
  }

  if (error && !hasFetched) {
    return (
      <div className="p-3 md:p-6">
        <ErrorState
          title="Error Loading CIT Data"
          description={error}
          primaryAction={{
            label: "Try Again",
            onClick: handleRefresh,
          }}
        />
      </div>
    );
  }

  const filingDeadline = summary ? getFilingDeadline(selectedYear) : null;
  const isDeadlinePassed = filingDeadline ? new Date() > filingDeadline : false;

  return (
    <RouteGuard requireAccountType={AccountType.Company}>
      <div className="p-0 md:p-6 space-y-6">
        <UpgradePromptComponent />
        
        {/* Header */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Company Income Tax</h1>
              <p className="text-gray-600 mt-1">
                Track your company's tax payments
              </p>
            </div>
            <div className="flex items-center gap-2">
               <button
                  onClick={() => setIsGuideModalOpen(true)}
                  className="text-emerald-600 font-medium text-sm bg-emerald-50 px-4 py-2 rounded-full hover:bg-emerald-100 transition-colors flex items-center gap-2"
                >
                  <span>How does this work?</span>
                  <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 text-xs font-bold">?</div>
                </button>
              <Button
                variant={ButtonVariant.Outline}
                size={ButtonSize.Sm}
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Year Filter */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Tax Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Array.from({ length: maxTaxYear - minTaxYear + 1 }, (_, i) => {
                  const year = minTaxYear + i;
                  // CRITICAL: Validate year is within valid range - fail loudly if invalid
                  if (year < minTaxYear || year > maxTaxYear) {
                    console.error("[CIT_PAGE] CRITICAL ERROR: Invalid year generated in dropdown", {
                      year,
                      minTaxYear,
                      maxTaxYear,
                      currentYear,
                      index: i,
                    });
                    return null;
                  }
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </Card>
        </motion.div>



        {/* Summary Cards */}
        {summary && (() => {
          // CRITICAL: Log summary values when rendering - fail loudly if invalid
          console.log("===========================================");
          console.log("[CIT_PAGE] 🎨 RENDERING SUMMARY CARDS");
          console.log("===========================================");
          console.log("[CIT_PAGE] Summary from Redux State:", summary);
          console.log("[CIT_PAGE] Summary Values for Display:", {
            companyId,
            taxYear: selectedYear,
            totalRevenue: summary.totalRevenue,
            totalExpenses: summary.totalExpenses,
            taxableProfit: summary.taxableProfit,
            taxClassification: summary.taxClassification,
            citRate: summary.citRate,
            citRateType: typeof summary.citRate,
            citRateIsNaN: isNaN(summary.citRate),
            citRateIsFinite: isFinite(summary.citRate),
            citBeforeWHT: summary.citBeforeWHT,
            citAfterWHT: summary.citAfterWHT,
            totalCITRemitted: summary.totalCITRemitted,
            totalCITPending: summary.totalCITPending,
          });
          console.log("[CIT_PAGE] ⚠️ ZERO VALUE CHECK (Rendering):", {
            totalRevenueIsZero: summary.totalRevenue === 0,
            totalExpensesIsZero: summary.totalExpenses === 0,
            taxableProfitIsZero: summary.taxableProfit === 0,
            citAfterWHTIsZero: summary.citAfterWHT === 0,
            allCardsWillShowZero: summary.totalRevenue === 0 && summary.totalExpenses === 0 && summary.taxableProfit === 0 && summary.citAfterWHT === 0,
          });

          if (summary.citRate === undefined || summary.citRate === null) {
            console.error("[CIT_PAGE] CRITICAL ERROR: citRate is missing in summary when rendering", {
              companyId,
              taxYear: selectedYear,
              summary,
            });
            return (
              <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold">
                  CRITICAL ERROR: CIT rate is missing in summary. Please check server logs.
                </p>
              </div>
            );
          }

          if (typeof summary.citRate !== "number") {
            console.error("[CIT_PAGE] CRITICAL ERROR: citRate is not a number when rendering", {
              companyId,
              taxYear: selectedYear,
              citRate: summary.citRate,
              citRateType: typeof summary.citRate,
              summary,
            });
            return (
              <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold">
                  CRITICAL ERROR: CIT rate is not a number. Type: {typeof summary.citRate}, Value: {String(summary.citRate)}
                </p>
              </div>
            );
          }

          if (isNaN(summary.citRate)) {
            console.error("[CIT_PAGE] CRITICAL ERROR: citRate is NaN when rendering", {
              companyId,
              taxYear: selectedYear,
              citRate: summary.citRate,
              taxClassification: summary.taxClassification,
              summary,
            });
            return (
              <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold">
                  CRITICAL ERROR: CIT rate is NaN. Tax classification: {summary.taxClassification || "unknown"}
                </p>
                <p className="text-red-600 text-sm mt-2">
                  Check browser console and server logs for detailed error information.
                </p>
              </div>
            );
          }

          if (!isFinite(summary.citRate)) {
            console.error("[CIT_PAGE] CRITICAL ERROR: citRate is not finite when rendering", {
              companyId,
              taxYear: selectedYear,
              citRate: summary.citRate,
              summary,
            });
            return (
              <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold">
                  CRITICAL ERROR: CIT rate is not finite: {summary.citRate}
                </p>
              </div>
            );
          }

          return (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {/* Card 1: Revenue (Money In) */}
              <Card className="p-6 hover:shadow-md transition-shadow duration-200 border-emerald-100 bg-white group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <TrendingUp className="w-24 h-24 text-emerald-600" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Total Revenue</p>
                    <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
                      {(() => {
                        if (summary.totalRevenue === undefined || summary.totalRevenue === null || typeof summary.totalRevenue !== "number" || isNaN(summary.totalRevenue)) {
                          return "N/A";
                        }
                        return formatCurrency(summary.totalRevenue);
                      })()}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                     <p className="text-xs text-slate-500 font-medium">Money You Made</p>
                     <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                     </div>
                  </div>
                </div>
              </Card>

              {/* Card 2: Expenses (Money Out) */}
              <Card className="p-6 hover:shadow-md transition-shadow duration-200 border-rose-100 bg-white group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <TrendingDown className="w-24 h-24 text-rose-600" />
                </div>
                 <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-2">Total Expenses</p>
                    <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
                      {formatCurrency(summary.totalExpenses)}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                     <p className="text-xs text-slate-500 font-medium">Money You Spent</p>
                     <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center">
                        <TrendingDown className="w-4 h-4 text-rose-600" />
                     </div>
                  </div>
                </div>
              </Card>

              {/* Card 3: Taxable Profit */}
              <Card className="p-6 hover:shadow-md transition-shadow duration-200 border-blue-100 bg-white group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Wallet className="w-24 h-24 text-blue-600" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Taxable Profit</p>
                    <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
                      {formatCurrency(summary.taxableProfit)}
                    </p>
                  </div>
                   <div className="mt-4 flex items-center justify-between">
                     <p className="text-xs text-slate-500 font-medium">Net Income</p>
                     <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-blue-600" />
                     </div>
                  </div>
                </div>
              </Card>

              {/* Card 4: Tax You Owe (CIT Liability) */}
              <Card className="p-6 hover:shadow-md transition-shadow duration-200 border-amber-100 bg-white group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Building2 className="w-24 h-24 text-amber-600" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <p className="text-sm font-bold text-amber-600 uppercase tracking-widest">Tax You Owe</p>
                       <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">
                         Rate: {((summary.citRate * 100).toFixed(0))}%
                       </span>
                    </div>
                    <p className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight break-words">
                      {formatCurrency(summary.citAfterWHT)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Amount to pay</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                     <p className="text-sm text-slate-500 font-medium">
                        {summary.taxClassification === TaxClassification.SmallCompany ? "Small Company (0%)" : "Large Company (30%)"}
                     </p>
                     <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-amber-600" />
                     </div>
                  </div>
                </div>
              </Card>

              {/* Card 5: Tax Paid & Balance */}
              <Card className="p-6 hover:shadow-md transition-shadow duration-200 border-teal-100 bg-white group relative overflow-hidden md:col-span-2 lg:col-span-2">
                 <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <ShieldCheck className="w-24 h-24 text-teal-600" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row h-full justify-between gap-6">
                   <div className="flex-1">
                      <p className="text-sm font-bold text-teal-600 uppercase tracking-widest mb-2">Tax You Paid</p>
                      <p className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight break-words">
                        {formatCurrency((summary.totalCITRemitted || 0) + (summary.whtCredits || 0))}
                      </p>
                       <div className="flex flex-col">
                         <p className="text-xs text-slate-500 font-medium mt-1">Total payments made</p>
                         {(summary.whtCredits || 0) > 0 && (
                            <p className="text-[10px] text-teal-600 font-medium mt-0.5">
                              (Includes {formatCurrency(summary.whtCredits)} WHT Credit)
                            </p>
                         )}
                       </div>
                   </div>
                   
                   <div className="w-px bg-teal-100 hidden md:block"></div>
                   <div className="h-px bg-teal-100 md:hidden"></div>

                   <div className="flex-1">
                       <p className="text-sm font-bold text-rose-600 uppercase tracking-widest mb-2">Left To Pay</p>
                       <p className="text-3xl lg:text-4xl font-extrabold text-rose-600 tracking-tight break-words">
                         {formatCurrency(summary.totalCITPending)}
                       </p>
                       <p className="text-xs text-slate-500 font-medium mt-1">Outstanding balance</p>
                   </div>
                </div>
              </Card>

            </motion.div>
          );
        })()}

        {/* Explanation when Taxable Profit and CIT Liability are 0 */}
        {summary && summary.taxableProfit === 0 && summary.citAfterWHT === 0 && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="p-0 md:p-6 bg-blue-50 border-2 border-blue-200">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xl">💡</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-blue-900 mb-2">
                    Why is your Taxable Profit and CIT Liability ₦0?
                  </h3>
                  <div className="space-y-3 text-sm text-blue-800 leading-relaxed">
                    {summary.totalRevenue === 0 ? (
                      <div>
                        <p className="font-medium mb-1">📌 No Revenue Yet:</p>
                        <p>
                          Your company hasn't received any payments from customers this year. 
                          Once customers pay your invoices, that money will appear as revenue, 
                          and then we can calculate your tax.
                        </p>
                      </div>
                    ) : summary.totalExpenses >= summary.totalRevenue ? (
                      <div>
                        <p className="font-medium mb-1">📌 Expenses Equal or Exceed Revenue:</p>
                        <p>
                          Your company spent as much (or more) money on business expenses 
                          as it received from customers. This means there's no profit left to tax. 
                          In simple terms: <strong>Revenue - Expenses = ₦0 (or negative)</strong>
                        </p>
                        <p className="mt-2 text-blue-700">
                          <strong>Good news:</strong> You don't owe any CIT this year because 
                          you didn't make a profit. However, if your expenses are higher than 
                          your revenue, you may want to review your business operations.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium mb-1">📌 No Taxable Profit:</p>
                        <p>
                          Even though you have revenue, after subtracting your business expenses, 
                          there's no profit left to tax. This happens when your expenses 
                          completely offset your revenue.
                        </p>
                      </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-blue-300">
                      <p className="font-medium mb-1">💼 What This Means:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>You don't need to pay Company Income Tax (CIT) to NRS this year</li>
                        <li>This is normal if your business is just starting or had high expenses</li>
                        <li>Make sure all your business expenses are marked as "tax-deductible" 
                            so they can reduce your tax when you do make a profit</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Calculation Breakdown */}
        {summary && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="p-0 md:p-6">
              <button
                type="button"
                onClick={() => setIsCalculationBreakdownExpanded(!isCalculationBreakdownExpanded)}
                className="w-full flex items-center justify-between mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-lg hover:bg-gray-50 transition-colors p-2 -ml-2"
                aria-expanded={isCalculationBreakdownExpanded}
              >
                <h2 className="text-lg md:text-xl font-bold text-gray-900">Calculation Breakdown</h2>
                {isCalculationBreakdownExpanded ? (
                  <ChevronUp className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
                )}
              </button>
              {isCalculationBreakdownExpanded && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-200 gap-1 sm:gap-0">
                    <span className="text-sm md:text-base text-gray-700 font-medium">Total Revenue (from paid invoices)</span>
                    <span className="text-sm md:text-base font-semibold text-gray-900 bg-gray-50 sm:bg-transparent px-2 py-1 sm:p-0 rounded sm:rounded-none inline-block w-fit">
                      {formatCurrency(summary.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-200 gap-1 sm:gap-0">
                    <span className="text-sm md:text-base text-gray-700 font-medium">Total Tax-Deductible Expenses</span>
                    <span className="text-sm md:text-base font-semibold text-gray-900 bg-gray-50 sm:bg-transparent px-2 py-1 sm:p-0 rounded sm:rounded-none inline-block w-fit">
                      {formatCurrency(summary.totalExpenses)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-200 gap-1 sm:gap-0">
                    <span className="text-sm md:text-base text-gray-700 font-medium">Taxable Profit</span>
                    <span className="text-sm md:text-base font-semibold text-gray-900 bg-gray-50 sm:bg-transparent px-2 py-1 sm:p-0 rounded sm:rounded-none inline-block w-fit">
                      {formatCurrency(summary.taxableProfit)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start py-3 border-b border-gray-200 gap-2 sm:gap-4">
                    <div className="w-full sm:flex-1">
                      <span className="text-sm md:text-base text-gray-700 font-medium">
                        CIT Before WHT Credits ({(() => {
                          // CRITICAL: Validate citRate before displaying - fail loudly if invalid
                          if (summary.citRate === undefined || summary.citRate === null) {
                            console.error("[CIT_PAGE] CRITICAL: citRate is null/undefined when displaying CIT Before WHT");
                            return "ERROR";
                          }
                          if (typeof summary.citRate !== "number" || isNaN(summary.citRate) || !isFinite(summary.citRate)) {
                            console.error("[CIT_PAGE] CRITICAL: citRate is invalid when displaying CIT Before WHT", summary.citRate);
                            return "ERROR";
                          }
                          return ((summary.citRate * 100).toFixed(0));
                        })()}%)
                      </span>
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900 leading-relaxed mb-2">
                          <strong>💡 How this amount is calculated:</strong>
                        </p>
                        <p className="text-sm text-blue-800 leading-relaxed mb-2">
                          NRS (Nigeria Revenue Service) calculates your Company Income Tax by taking a percentage of your profit. 
                          Think of it like this: <strong>If you make profit, NRS takes a share of that profit as tax.</strong>
                        </p>
                        <div className="text-sm text-blue-900 font-mono bg-white p-2 rounded border border-blue-300 mt-2">
                          <div className="mb-1">
                            <span className="text-blue-700">Step 1:</span> Your Taxable Profit = {formatCurrency(summary.taxableProfit)}
                          </div>
                          <div className="mb-1">
                            <span className="text-blue-700">Step 2:</span> Your Tax Rate = {(() => {
                              if (summary.citRate === undefined || summary.citRate === null || typeof summary.citRate !== "number" || isNaN(summary.citRate) || !isFinite(summary.citRate)) {
                                return "ERROR";
                              }
                              return ((summary.citRate * 100).toFixed(0));
                            })()}% ({(() => {
                              if (summary.taxClassification === TaxClassification.SmallCompany) return "Small companies (Turnover ≤ ₦50M) are exempt from CIT (0%)";
                              return "Companies with Turnover > ₦50M pay 30% CIT + 4% Development Levy";
                            })()})
                          </div>
                          <div className="mb-1">
                            <span className="text-blue-700">Step 3:</span> Calculate: {formatCurrency(summary.taxableProfit)} × {(() => {
                              if (summary.citRate === undefined || summary.citRate === null || typeof summary.citRate !== "number" || isNaN(summary.citRate) || !isFinite(summary.citRate)) {
                                return "ERROR";
                              }
                              return ((summary.citRate * 100).toFixed(0));
                            })()}%
                          </div>
                          <div className="font-semibold text-blue-900 mt-2 pt-2 border-t border-blue-300">
                            <span className="text-blue-700">Result:</span> CIT Before WHT Credits = {formatCurrency(summary.citBeforeWHT)}
                          </div>
                        </div>
                        <p className="text-sm text-blue-800 leading-relaxed mt-2">
                          <strong>Note:</strong> This is your tax <em>before</em> we subtract any WHT credits (taxes you already paid when receiving payments). 
                          The final amount you owe will be less after we apply those credits below.
                        </p>
                      </div>
                    </div>
                    <span className="text-sm md:text-base font-semibold text-gray-900 bg-gray-50 sm:bg-transparent px-2 py-1 sm:p-0 rounded sm:rounded-none inline-block w-fit self-start sm:self-auto sm:ml-4 whitespace-nowrap">
                      {formatCurrency(summary.citBeforeWHT)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start py-3 border-b border-gray-200 gap-2 sm:gap-4">
                    <div className="w-full sm:flex-1">
                      <span className="text-sm md:text-base text-gray-700 font-medium">WHT Credits Applied</span>
                      <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-sm text-emerald-900 leading-relaxed mb-2">
                          <strong>💡 What are WHT Credits?</strong>
                        </p>
                        <p className="text-sm text-emerald-800 leading-relaxed mb-2">
                          When you paid suppliers/vendors (expenses) or when customers paid you (invoices), 
                          you deducted Withholding Tax (WHT) and sent it to NRS (Nigeria Revenue Service). 
                          <strong> These taxes you already paid become "credits" that reduce your CIT liability.</strong>
                        </p>
                        <div className="text-sm text-emerald-900 font-mono bg-white p-2 rounded border border-emerald-300 mt-2 mb-2">
                          <div className="mb-1">
                            <span className="text-emerald-700">Example:</span> You paid ₦100,000 to a supplier and deducted 10% WHT (₦10,000)
                          </div>
                          <div className="mb-1">
                            <span className="text-emerald-700">Result:</span> That ₦10,000 WHT you paid becomes a credit
                          </div>
                          <div className="font-semibold text-emerald-900 mt-2 pt-2 border-t border-emerald-300">
                            <span className="text-emerald-700">Total WHT Credits:</span> {formatCurrency(summary.whtCredits)}
                          </div>
                        </div>
                        <p className="text-sm text-emerald-800 leading-relaxed mt-2">
                          <strong>Formula:</strong> CIT After WHT = CIT Before WHT ({formatCurrency(summary.citBeforeWHT)}) - WHT Credits ({formatCurrency(summary.whtCredits)}) = {formatCurrency(summary.citAfterWHT)}
                        </p>
                        <p className="text-sm text-emerald-700 mt-2">
                          <Link href="/dashboard/wht" className="underline font-semibold hover:text-emerald-800">
                            View detailed WHT records →
                          </Link>
                        </p>
                      </div>
                    </div>
                    <span className="text-sm md:text-base font-semibold text-emerald-600 bg-emerald-50 sm:bg-transparent px-2 py-1 sm:p-0 rounded sm:rounded-none inline-block w-fit self-start sm:self-auto sm:ml-4 whitespace-nowrap">
                      -{(() => {
                        // CRITICAL: Validate whtCredits before displaying - fail loudly if invalid
                        if (summary.whtCredits === undefined || summary.whtCredits === null) {
                          console.error("[CIT_PAGE] CRITICAL: whtCredits is null/undefined when displaying WHT credits");
                          return "ERROR";
                        }
                        if (typeof summary.whtCredits !== "number" || isNaN(summary.whtCredits) || !isFinite(summary.whtCredits)) {
                          console.error("[CIT_PAGE] CRITICAL: whtCredits is invalid when displaying WHT credits", summary.whtCredits);
                          return "ERROR";
                        }
                        return formatCurrency(summary.whtCredits);
                      })()}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b-2 border-gray-300 gap-1 sm:gap-0">
                    <span className="text-base md:text-lg font-bold text-gray-900">CIT After WHT Credits</span>
                    <span className="text-base md:text-lg font-bold text-gray-900 bg-gray-100 sm:bg-transparent px-2 py-1 sm:p-0 rounded sm:rounded-none inline-block w-fit">
                      {formatCurrency(summary.citAfterWHT)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-200 gap-1 sm:gap-0">
                    <span className="text-sm md:text-base text-gray-700 font-medium">Total CIT Remitted</span>
                    <span className="text-sm md:text-base font-semibold text-emerald-600 bg-emerald-50 sm:bg-transparent px-2 py-1 sm:p-0 rounded sm:rounded-none inline-block w-fit">
                      {formatCurrency(summary.totalCITRemitted)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 gap-1 sm:gap-0">
                    <span className="text-base md:text-lg font-bold text-gray-900">CIT Pending</span>
                    <span className={`text-base md:text-lg font-bold bg-gray-50 sm:bg-transparent px-2 py-1 sm:p-0 rounded sm:rounded-none inline-block w-fit ${
                      summary.totalCITPending > 0 ? "text-red-600 bg-red-50 sm:bg-transparent" : "text-emerald-600 bg-emerald-50 sm:bg-transparent"
                    }`}>
                      {formatCurrency(summary.totalCITPending)}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Remittance Tracker */}
        {(() => {
          console.log("[CIT_PAGE] Rendering CITRemittanceTracker with props:", {
            remittances: remittances || [],
            remittancesLength: Array.isArray(remittances) ? remittances.length : 0,
            companyId: companyId!,
            taxYear: selectedYear,
            currentPlan,
          });
          return null;
        })()}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <CITRemittanceTracker
            remittances={remittances || []}
            companyId={companyId!}
            taxYear={selectedYear}
            onRemittanceUpdated={handleRemittanceUpdated}
            currentPlan={currentPlan}
          />
        </motion.div>

        {/* Compliance Disclaimer */}

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
            <div className="mt-8 pt-6 border-t border-slate-100">
           <p className="text-xs text-slate-400 italic text-center max-w-3xl mx-auto">
              ⚠️ Disclaimer: Tax laws and regulations may change, and this application only supports tax years 2026 and onward per Nigeria Tax Act 2025.
           </p>
        </div>
       
        </motion.div>

        {/* Next Step Navigation */}
        <NextStepCard
          title="Next Step: File Your Returns"
          description="You've reviewed your consolidated Company Income Tax. It's time to generate your official tax filings."
          href="/dashboard/tax-filing"
          actionLabel="Go to Tax Filing"
        />
      </div>
      <CitGuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
    </RouteGuard>
  );
}

