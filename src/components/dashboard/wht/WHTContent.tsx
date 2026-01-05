"use client";

/**
 * WHTContent Component
 * 
 * Shared component for WHT (Withholding Tax) management that works with both Company and Business accounts.
 * Contains ALL WHT logic and UI - completely extracted from page-level concerns.
 * 
 * CRITICAL REQUIREMENTS (Ruthless Mentor Standards):
 * - entityId: REQUIRED - must be a non-empty string (companyId or businessId)
 * - accountType: REQUIRED - must be AccountType.Company or AccountType.Business (not Individual)
 * - currentPlan: REQUIRED - must be a valid SubscriptionPlan enum value
 * - All validation must fail loudly (throw errors) - no defaults, no fallbacks, no auto-assignment
 * - Uses enums, not string literals
 * - Production-ready, bulletproof code
 * 
 * @param entityId - The company ID or business ID (MUST be provided, validated at page level)
 * @param accountType - The account type (MUST be Company or Business, validated at page level)
 * @param currentPlan - The user's subscription plan (MUST be provided, validated at page level)
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { whtActions, type WHTRecord, type WHTRemittance, type WHTSummary } from "@/store/redux/wht/wht-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { createErrorStateProps } from "@/components/shared/errorUtils";
import { 
  Receipt, 
  RefreshCw, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Info,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { WHTRemittanceTracker } from "@/components/dashboard/wht/WHTRemittanceTracker";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { WhtGuideModal } from "@/components/dashboard/wht/WhtGuideModal";
import { HelpCircle } from "lucide-react";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { HttpMethod } from "@/lib/utils/http-method";
import { AccountType } from "@/lib/utils/account-type";
import { ButtonVariant, ButtonSize, LoadingStateSize } from "@/lib/utils/client-enums";

// NRS (Nigeria Revenue Service) WHT Deadline: WHT must be remitted within 21 days of deduction (by 21st of following month)
const NRS_WHT_DEADLINE_DAY = 21;

interface WHTContentProps {
  entityId: string;
  accountType: AccountType.Company | AccountType.Business;
  currentPlan: SubscriptionPlan;
}

export function WHTContent({ entityId, accountType, currentPlan }: WHTContentProps) {
  const dispatch = useAppDispatch();

  // CRITICAL: Validate props - fail loudly if invalid
  if (!entityId || typeof entityId !== "string" || entityId.trim() === "") {
    throw new Error(
      "WHTContent: entityId prop is required and must be a non-empty string. " +
      "This is a critical prop validation error. Page component must validate and provide entityId."
    );
  }

  const validAccountTypes = [AccountType.Company, AccountType.Business];
  if (!validAccountTypes.includes(accountType)) {
    throw new Error(
      `WHTContent: accountType prop must be AccountType.Company or AccountType.Business. ` +
      `Received: "${accountType}". ` +
      "Use AccountType enum, not string literals. Individual accounts do not have WHT management. " +
      "Page component must validate accountType before rendering WHTContent."
    );
  }

  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentPlan)) {
    throw new Error(
      `WHTContent: currentPlan prop must be a valid SubscriptionPlan enum value. ` +
      `Received: "${currentPlan}". ` +
      `Valid values are: ${validPlans.join(", ")}. ` +
      "Use SubscriptionPlan enum, not string literals. Page component must validate currentPlan before rendering WHTContent."
    );
  }

  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;

  const hasWHTAccess = SUBSCRIPTION_PRICING[currentPlan]?.features?.whtTracking === true;

  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  
  // Get WHT state from Redux
  const {
    summary,
    records,
    remittances,
    filters,
    hasFetched,
    isLoading,
    error,
    companyId: whtCompanyId,
  } = useAppSelector((state: any) => state.wht);
  
  const { sendHttpRequest: fetchWHTReq } = useHttp();
  
  // Filter state - initialize from Redux state if available
  const minTaxYear = 2026;
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (filters.year) return Math.max(minTaxYear, filters.year);
    return Math.max(minTaxYear, currentYear);
  });
  
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => {
    if (filters.month !== undefined && filters.month !== null) return filters.month;
    return now.getMonth() + 1;
  });
  
  const [isFilterExpanded, setIsFilterExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("taxcomply_wht_filters_expanded");
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  

  const [isGuideOpen, setIsGuideOpen] = useState(false);


  // Persist filter expansion state
  useEffect(() => {
    try {
      localStorage.setItem("taxcomply_wht_filters_expanded", JSON.stringify(isFilterExpanded));
    } catch {
      // Non-critical - continue execution
    }
  }, [isFilterExpanded]);

  // Sync entityId in Redux when it changes
  useEffect(() => {
    if (entityId && entityId !== whtCompanyId) {
      dispatch(whtActions.setCompanyId(entityId));
    }
  }, [entityId, whtCompanyId, dispatch]);

  // Update filters in Redux when they change
  useEffect(() => {
    const newFilters = {
      year: selectedYear,
      month: selectedMonth,
    };
    
    if (filters.year !== newFilters.year || filters.month !== newFilters.month) {
      dispatch(whtActions.setFilters(newFilters));
    }
  }, [selectedYear, selectedMonth, filters.year, filters.month, dispatch]);

  // Fetch WHT data when entityId is available AND data hasn't been fetched for current filters
  useEffect(() => {
    if (isLoading || !entityId) return;
    
    if (!hasFetched) {
      fetchAllWHTData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, filters.year, filters.month, hasFetched, isLoading]);

  // Fetch WHT summary
  const fetchSummary = useCallback(() => {
    if (!entityId) {
      throw new Error(
        "WHTContent.fetchSummary: entityId is required. " +
        "This should never happen - entityId is validated at component level."
      );
    }

    if (!selectedMonth || !selectedYear) {
      throw new Error(
        "WHTContent.fetchSummary: selectedMonth and selectedYear are required. " +
        "This should be validated before calling fetchSummary."
      );
    }

    const params = new URLSearchParams({
      month: selectedMonth.toString(),
      year: selectedYear.toString(),
    });

    if (isCompanyAccount) {
      params.append("companyId", entityId);
    } else if (isBusinessAccount) {
      params.append("businessId", entityId);
    } else {
      throw new Error(
        `WHTContent.fetchSummary: Cannot determine query parameter for account type "${accountType}". ` +
        "This is a critical logic error."
      );
    }

    fetchWHTReq({
      successRes: (response: any) => {
        const summaryData = response?.data?.data;
        dispatch(whtActions.setWHTSummary({
          summary: summaryData || null,
          filters: {
            year: selectedYear,
            month: selectedMonth,
          },
          companyId: entityId,
        }));
      },
      errorRes: (errorResponse: any) => {
        const errorData = errorResponse?.data;
        const upgradeRequired = errorData?.upgradeRequired;
        const status = errorResponse?.status;
        
        // Handle 403 errors - prevent infinite retries
        if (status === 403) {
          if (upgradeRequired) {
            // Subscription limitation - show upgrade prompt
            showUpgradePrompt({
              feature: upgradeRequired.feature || "WHT Management",
              currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
              requiredPlan: upgradeRequired.requiredPlan || "starter",
              requiredPlanPrice: upgradeRequired.requiredPlanPrice || SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              message: errorData?.description || "WHT management is available on Starter plan (₦3,500/month) and above. Upgrade to track WHT deductions, remittances, and credits.",
              reason: upgradeRequired.reason || "plan_limitation",
            });
            dispatch(whtActions.setError(null));
          } else {
            // Authorization/permission error - stop retrying
            dispatch(whtActions.setError(errorData?.description || "Unauthorized: You don't have access to this resource"));
          }
          return false; // Stop retrying on 403 errors
        } else if (status === 404) {
          dispatch(whtActions.setWHTSummary({
            summary: null,
            filters: {
              year: selectedYear,
              month: selectedMonth,
            },
            companyId: entityId,
          }));
          return false;
        } else {
          dispatch(whtActions.setError(errorData?.description || "Failed to load WHT summary"));
          return true;
        }
      },
      requestConfig: {
        url: `/wht/summary?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [entityId, accountType, isCompanyAccount, isBusinessAccount, selectedMonth, selectedYear, fetchWHTReq, dispatch, currentPlan, showUpgradePrompt]);

  // Fetch WHT records
  const fetchRecords = useCallback(() => {
    if (!entityId) {
      throw new Error(
        "WHTContent.fetchRecords: entityId is required. " +
        "This should never happen - entityId is validated at component level."
      );
    }

    const params = new URLSearchParams();

    if (isCompanyAccount) {
      params.append("companyId", entityId);
    } else if (isBusinessAccount) {
      params.append("businessId", entityId);
    } else {
      throw new Error(
        `WHTContent.fetchRecords: Cannot determine query parameter for account type "${accountType}". ` +
        "This is a critical logic error."
      );
    }
    if (selectedMonth) params.append("month", selectedMonth.toString());
    if (selectedYear) params.append("year", selectedYear.toString());

    console.log("[WHT Content] Fetching WHT records:", {
      entityId,
      accountType,
      month: selectedMonth || "all",
      year: selectedYear,
      url: `/wht/records?${params.toString()}`,
    });

    fetchWHTReq({
      successRes: (response: any) => {
        // CRITICAL: Debug API response structure
        console.log("[WHT Content] 🔍 Raw API Response:", {
          response,
          responseData: response?.data,
          responseDataData: response?.data?.data,
          responseDataType: typeof response?.data,
          responseDataIsArray: Array.isArray(response?.data),
        });
        
        const recordsData = response?.data?.data || response?.data || [];
        
        // CRITICAL: Validate and log each record's whtAmount
        if (Array.isArray(recordsData) && recordsData.length > 0) {
          console.log("[WHT Content] 🔍 Sample WHT Record Structure:", {
            firstRecord: recordsData[0],
            firstRecordKeys: Object.keys(recordsData[0] || {}),
            firstRecordWHTAmount: recordsData[0]?.whtAmount,
            firstRecordWHTAmountType: typeof recordsData[0]?.whtAmount,
            firstRecordPaymentAmount: recordsData[0]?.paymentAmount,
            firstRecordNetAmount: recordsData[0]?.netAmount,
          });
          
          // CRITICAL: Fail loudly if whtAmount is missing or invalid
          recordsData.forEach((record: any, index: number) => {
            if (record.whtAmount === undefined || record.whtAmount === null) {
              console.error(`[WHT Content] ❌ CRITICAL: Record ${index} has missing whtAmount:`, record);
            }
            if (typeof record.whtAmount !== "number" || isNaN(record.whtAmount)) {
              console.error(`[WHT Content] ❌ CRITICAL: Record ${index} has invalid whtAmount:`, {
                record,
                whtAmount: record.whtAmount,
                whtAmountType: typeof record.whtAmount,
              });
            }
          });
        }
        
        console.log("[WHT Content] ✅ WHT records received:", {
          entityId,
          accountType,
          month: selectedMonth || "all",
          year: selectedYear,
          recordCount: recordsData.length,
          totalWHTAmount: recordsData.reduce((sum: number, r: any) => sum + (r.whtAmount || 0), 0),
        });
        
        dispatch(whtActions.setWHTRecords({
          records: Array.isArray(recordsData) ? recordsData : [],
          filters: {
            year: selectedYear,
            month: selectedMonth,
          },
          companyId: entityId,
        }));
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status || errorResponse?.response?.status;
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        const upgradeRequired = errorData?.upgradeRequired || errorData?.data?.upgradeRequired;
        
        console.error("[WHT Content] ❌ Error fetching WHT records:", {
          status,
          error: errorData?.description || errorData?.message || errorData?.error || "Unknown error",
          upgradeRequired: !!upgradeRequired,
        });
        
        // Handle 403 errors - prevent infinite retries
        if (status === 403) {
          if (upgradeRequired) {
            // Subscription limitation - show upgrade prompt
            showUpgradePrompt({
              feature: upgradeRequired.feature || "WHT Management",
              currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
              requiredPlan: upgradeRequired.requiredPlan || "starter",
              requiredPlanPrice: upgradeRequired.requiredPlanPrice || SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              message: errorData?.description || "WHT management is available on Starter plan (₦3,500/month) and above.",
              reason: upgradeRequired.reason || "plan_limitation",
            });
            dispatch(whtActions.setError(null));
          } else {
            // Authorization/permission error - stop retrying
            const errorMessage = errorData?.description || errorData?.message || errorData?.error || "Unauthorized: You don't have access to this resource";
            console.error("[WHT Content] ❌ Authorization error (403):", errorMessage);
            dispatch(whtActions.setError(errorMessage));
          }
          dispatch(whtActions.setWHTRecords({
            records: [],
            filters: {
              year: selectedYear,
              month: selectedMonth,
            },
            companyId: entityId,
          }));
          return false; // Stop retrying on 403 errors
        } else if (status === 404) {
          console.log("[WHT Content] ℹ️ No WHT records found (404) - this is valid");
          dispatch(whtActions.setWHTRecords({
            records: [],
            filters: {
              year: selectedYear,
              month: selectedMonth,
            },
            companyId: entityId,
          }));
          return false;
        } else {
          const errorMessage = errorData?.description || errorData?.message || errorData?.error || "Failed to load WHT records";
          console.error("[WHT Content] ❌ Failed to load WHT records:", {
            status,
            errorMessage,
          });
          dispatch(whtActions.setError(errorMessage));
          dispatch(whtActions.setWHTRecords({
            records: [],
            filters: {
              year: selectedYear,
              month: selectedMonth,
            },
            companyId: entityId,
          }));
          return true;
        }
      },
      requestConfig: {
        url: `/wht/record?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [entityId, accountType, isCompanyAccount, isBusinessAccount, selectedMonth, selectedYear, fetchWHTReq, dispatch, currentPlan, showUpgradePrompt]);

  // Fetch WHT remittances
  const fetchRemittances = useCallback(() => {
    if (!entityId) {
      throw new Error(
        "WHTContent.fetchRemittances: entityId is required. " +
        "This should never happen - entityId is validated at component level."
      );
    }

    const params = new URLSearchParams();

    if (isCompanyAccount) {
      params.append("companyId", entityId);
    } else if (isBusinessAccount) {
      params.append("businessId", entityId);
    } else {
      throw new Error(
        `WHTContent.fetchRemittances: Cannot determine query parameter for account type "${accountType}". ` +
        "This is a critical logic error."
      );
    }
    if (selectedYear) params.append("year", selectedYear.toString());

    fetchWHTReq({
      successRes: (response: any) => {
        const remittancesData = response?.data?.data || [];
        dispatch(whtActions.setWHTRemittances({
          remittances: remittancesData,
          companyId: entityId,
        }));
      },
      errorRes: (errorResponse: any) => {
        const errorData = errorResponse?.data;
        const upgradeRequired = errorData?.upgradeRequired;
        const status = errorResponse?.status;
        
        // Handle 403 errors - prevent infinite retries
        if (status === 403) {
          if (upgradeRequired) {
            // Subscription limitation - show upgrade prompt
            showUpgradePrompt({
              feature: upgradeRequired.feature || "WHT Management",
              currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
              requiredPlan: upgradeRequired.requiredPlan || "starter",
              requiredPlanPrice: upgradeRequired.requiredPlanPrice || SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              message: errorData?.description || "WHT management is available on Starter plan (₦3,500/month) and above.",
              reason: upgradeRequired.reason || "plan_limitation",
            });
            dispatch(whtActions.setError(null));
          } else {
            // Authorization/permission error - stop retrying
            dispatch(whtActions.setError(errorData?.description || "Unauthorized: You don't have access to this resource"));
          }
          dispatch(whtActions.setWHTRemittances({
            remittances: [],
            companyId: entityId,
          }));
          return false; // Stop retrying on 403 errors
        } else if (status === 404) {
          dispatch(whtActions.setWHTRemittances({
            remittances: [],
            companyId: entityId,
          }));
          return false;
        } else {
          dispatch(whtActions.setError(errorData?.description || "Failed to load WHT remittances"));
          return true;
        }
      },
      requestConfig: {
        url: `/wht/remittance?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [entityId, accountType, isCompanyAccount, isBusinessAccount, selectedYear, fetchWHTReq, dispatch, currentPlan, showUpgradePrompt]);

  // Fetch all data
  const fetchAllWHTData = useCallback(() => {
    if (!entityId) {
      throw new Error(
        "WHTContent.fetchAllWHTData: entityId is required. " +
        "This should never happen - entityId is validated at component level."
      );
    }

    if (isLoading) {
      console.log("[WHT Content] fetchAllWHTData: Already loading, skipping");
      return;
    }
    
    if (hasFetched && entityId === whtCompanyId) {
      console.log("[WHT Content] fetchAllWHTData: Data already fetched for current filters, skipping");
      return;
    }
    
    console.log("[WHT Content] 🚀 Fetching all WHT data:", {
      entityId,
      accountType,
      month: selectedMonth || "all",
      year: selectedYear,
      hasFetched,
      whtCompanyId,
    });
    
    dispatch(whtActions.setLoading(true));
    
    fetchSummary();
    fetchRecords();
    fetchRemittances();
  }, [entityId, isLoading, hasFetched, whtCompanyId, selectedMonth, selectedYear, dispatch, fetchSummary, fetchRecords, fetchRemittances]);

  // Calculate remittance deadline
  const getRemittanceDeadline = (month: number, year: number): Date | null => {
    if (year < minTaxYear || year > 2100) {
      return null;
    }

    let deadlineYear = year;
    let deadlineMonth = month + 1;
    if (deadlineMonth > 12) {
      deadlineMonth = 1;
      deadlineYear += 1;
    }
    return new Date(deadlineYear, deadlineMonth - 1, NRS_WHT_DEADLINE_DAY);
  };

  const currentRemittance = remittances.find(
    (r: WHTRemittance) => r.remittanceMonth === selectedMonth && r.remittanceYear === selectedYear
  );

  const deadline = selectedMonth && selectedYear 
    ? getRemittanceDeadline(selectedMonth, selectedYear)
    : null;

  // Show loading state
  if (isLoading && !hasFetched) {
    return <LoadingState message="Loading WHT information..." size={LoadingStateSize.Md} />;
  }

  // Show error state
  if (error && !summary && !records.length && hasFetched && error !== "WHT management is available on Starter plan") {
    const errorProps = createErrorStateProps(error);
    return (
      <ErrorState
        {...errorProps}
        title="Could Not Load WHT Information"
        primaryAction={{
          label: "Try Again",
          onClick: fetchAllWHTData,
          icon: RefreshCw,
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-4 md:p-6 lg:p-8">
      <WhtGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        {/* Header - Ruthless Simplicity for Non-Experts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Withholding Tax (WHT)
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl">
              Manage the tax you collected from others. 
              <span className="hidden md:inline"> Sending it to the government avoids penalties.</span>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <Button
              onClick={() => setIsGuideOpen(true)}
              variant={ButtonVariant.Primary}
              size={ButtonSize.Md} 
              className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-200/50 shadow-lg border border-emerald-600 w-full sm:w-auto justify-center whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 mr-2 text-emerald-200" />
              Explain WHT to me
            </Button>

            <Button
              onClick={() => {
                dispatch(whtActions.invalidateCache());
                fetchAllWHTData();
              }}
              disabled={isLoading}
              variant={ButtonVariant.Outline}
              size={ButtonSize.Md}
              className="w-full sm:w-auto justify-center border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : "text-slate-500"}`} />
              Refresh Data
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <div>
          <Card>
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsFilterExpanded(!isFilterExpanded);
                }
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer rounded-t-xl active:bg-slate-100/50"
              aria-expanded={isFilterExpanded}
              aria-controls="wht-filters-content"
              aria-label={isFilterExpanded ? "Collapse filters" : "Expand filters"}
              type="button"
            >
              <span className="font-semibold text-slate-900">Filters</span>
              <motion.div
                animate={{ rotate: isFilterExpanded ? 180 : 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <ChevronDown className="w-5 h-5 text-slate-600" />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isFilterExpanded && (
                <motion.div
                  id="wht-filters-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                    opacity: { duration: 0.2 }
                  }}
                  style={{ overflow: "hidden" }}
                  className="rounded-b-xl"
                >
                  <div className="px-4 pb-4 space-y-4 border-t border-slate-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Year
                        </label>
                        <select
                          value={selectedYear}
                          onChange={(e) => {
                            const year = parseInt(e.target.value);
                            if (isNaN(year)) {
                              console.error("[WHT Content] Invalid year value in select onChange:", e.target.value);
                              return;
                            }
                            setSelectedYear(Math.max(minTaxYear, year));
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {(() => {
                            const startYear = Math.max(currentYear, minTaxYear);
                            const yearOptions = Array.from({ length: 11 }, (_, i) => {
                              const year = startYear - i;
                              if (year >= minTaxYear) {
                                return { value: year, label: year.toString() };
                              }
                              return null;
                            }).filter((option): option is { value: number; label: string } => option !== null);
                            
                            if (yearOptions.length === 0) {
                              console.error(
                                `[WHT Content] No valid year options generated. ` +
                                `currentYear: ${currentYear}, minTaxYear: ${minTaxYear}, startYear: ${startYear}. ` +
                                `This is a configuration error.`
                              );
                              return (
                                <option key={minTaxYear} value={minTaxYear}>
                                  {minTaxYear}
                                </option>
                              );
                            }
                            
                            return yearOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Month
                        </label>
                        <select
                          value={selectedMonth || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSelectedMonth(value ? parseInt(value) : null);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">All Months</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <option key={month} value={month}>
                              {new Date(2000, month - 1).toLocaleString("default", { month: "long" })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* Summary Cards */}
        {summary && (() => {
          // CRITICAL: Validate summary data - fail loudly if invalid
          if (summary.totalWHTDeducted === undefined || summary.totalWHTDeducted === null) {
            console.error("[WHT Content] ❌ CRITICAL: summary.totalWHTDeducted is null/undefined:", summary);
          }
          if (typeof summary.totalWHTDeducted !== "number" || isNaN(summary.totalWHTDeducted) || !isFinite(summary.totalWHTDeducted)) {
            console.error("[WHT Content] ❌ CRITICAL: summary.totalWHTDeducted is invalid:", {
              summary,
              totalWHTDeducted: summary.totalWHTDeducted,
              totalWHTDeductedType: typeof summary.totalWHTDeducted,
            });
          }
          if (summary.totalWHTRemitted === undefined || summary.totalWHTRemitted === null) {
            console.error("[WHT Content] ❌ CRITICAL: summary.totalWHTRemitted is null/undefined:", summary);
          }
          if (typeof summary.totalWHTRemitted !== "number" || isNaN(summary.totalWHTRemitted) || !isFinite(summary.totalWHTRemitted)) {
            console.error("[WHT Content] ❌ CRITICAL: summary.totalWHTRemitted is invalid:", {
              summary,
              totalWHTRemitted: summary.totalWHTRemitted,
              totalWHTRemittedType: typeof summary.totalWHTRemitted,
            });
          }
          if (summary.totalWHTPending === undefined || summary.totalWHTPending === null) {
            console.error("[WHT Content] ❌ CRITICAL: summary.totalWHTPending is null/undefined:", summary);
          }
          if (typeof summary.totalWHTPending !== "number" || isNaN(summary.totalWHTPending) || !isFinite(summary.totalWHTPending)) {
            console.error("[WHT Content] ❌ CRITICAL: summary.totalWHTPending is invalid:", {
              summary,
              totalWHTPending: summary.totalWHTPending,
              totalWHTPendingType: typeof summary.totalWHTPending,
            });
          }
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-100 rounded-xl">
                      <DollarSign className="w-6 h-6 text-emerald-600" />
                    </div>
                    {summary.status === "compliant" && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                    {summary.status === "pending" && (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                    {summary.status === "overdue" && (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <h3 className="text-base font-medium text-slate-600 mb-1">Tax You Withheld</h3>
                  <p className="text-3xl font-bold text-slate-900">
                    {(() => {
                      if (summary.totalWHTDeducted === undefined || summary.totalWHTDeducted === null) {
                        return "ERROR";
                      }
                      if (typeof summary.totalWHTDeducted !== "number" || isNaN(summary.totalWHTDeducted) || !isFinite(summary.totalWHTDeducted)) {
                        return "ERROR";
                      }
                      return formatCurrency(summary.totalWHTDeducted);
                    })()}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">{summary.whtRecordsCount || 0} record(s)</p>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-base font-medium text-slate-600 mb-1">You Sent</h3>
                  <p className="text-3xl font-bold text-slate-900">
                    {(() => {
                      if (summary.totalWHTRemitted === undefined || summary.totalWHTRemitted === null) {
                        return "ERROR";
                      }
                      if (typeof summary.totalWHTRemitted !== "number" || isNaN(summary.totalWHTRemitted) || !isFinite(summary.totalWHTRemitted)) {
                        return "ERROR";
                      }
                      return formatCurrency(summary.totalWHTRemitted);
                    })()}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">To NRS (Nigeria Revenue Service)</p>
                </div>
              </Card>

              <Card className={`bg-gradient-to-br ${
                summary.totalWHTPending > 0 
                  ? "from-amber-50 to-amber-100/50 border-2 border-amber-200"
                  : "from-slate-50 to-slate-100/50 border-2 border-slate-200"
              }`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${
                      summary.totalWHTPending > 0 ? "bg-amber-100" : "bg-slate-100"
                    }`}>
                      <Clock className={`w-6 h-6 ${
                        summary.totalWHTPending > 0 ? "text-amber-600" : "text-slate-600"
                      }`} />
                    </div>
                  </div>
                  <h3 className="text-base font-medium text-slate-600 mb-1">Pending (Left to Pay)</h3>
                  <p className="text-3xl font-bold text-slate-900">
                    {(() => {
                      if (summary.totalWHTPending === undefined || summary.totalWHTPending === null) {
                        return "ERROR";
                      }
                      if (typeof summary.totalWHTPending !== "number" || isNaN(summary.totalWHTPending) || !isFinite(summary.totalWHTPending)) {
                        return "ERROR";
                      }
                      return formatCurrency(summary.totalWHTPending);
                    })()}
                  </p>
                  {deadline && (
                    <p className="text-sm text-slate-500 mt-2">
                      Due: {formatDate(deadline)} (NRS)
                      <span className="block text-xs text-amber-600 font-semibold mt-1">
                        *State IRS due 10th
                      </span>
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })()}

        {/* Remittance Tracker - Only show if there are remittances OR if we can add new ones */}
        {selectedMonth && selectedYear && (remittances.length > 0 || hasWHTAccess) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <WHTRemittanceTracker
              remittances={remittances}
              companyId={entityId}
              remittanceMonth={selectedMonth}
              remittanceYear={selectedYear}
              accountType={accountType}
              currentPlan={currentPlan}
              onRemittanceUpdated={() => {
                dispatch(whtActions.invalidateCache());
                fetchAllWHTData();
              }}
            />
          </motion.div>
        )}

        {/* WHT Records - Only show if there are records */}
        {records.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">WHT Records</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Includes WHT from invoices, expenses, and manual entries
                    </p>
                  </div>
                  <span className="text-sm text-slate-600">{records.length} record(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">From</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Payment To</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Total Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">WHT Rate</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">WHT Deducted</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount After WHT</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Payment Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record: WHTRecord) => {
                        const getSourceBadge = () => {
                          const source = record.transactionType || "manual";
                          const badges = {
                            invoice: { label: "Invoice", color: "bg-blue-100 text-blue-700" },
                            expense: { label: "Expense", color: "bg-purple-100 text-purple-700" },
                            manual: { label: "Manual", color: "bg-slate-100 text-slate-700" },
                          };
                          return badges[source as keyof typeof badges] || badges.manual;
                        };
                        const sourceBadge = getSourceBadge();

                        const getSourceLink = () => {
                          if (!record.transactionId) return null;
                          if (record.transactionType === "invoice") {
                            return `/dashboard/invoices/${record.transactionId}`;
                          }
                          return null;
                        };
                        
                        const sourceLink = getSourceLink();

                        return (
                          <tr key={record._id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 ${sourceBadge.color} rounded text-xs font-medium`}>
                                  {sourceBadge.label}
                                </span>
                                {sourceLink && (
                                  <Link
                                    href={sourceLink}
                                    className="text-slate-500 hover:text-emerald-600 transition-colors"
                                    title={`View ${sourceBadge.label.toLowerCase()}`}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-slate-900">{record.payeeName}</p>
                                {record.payeeTIN && (
                                  <p className="text-xs text-slate-500">TIN: {record.payeeTIN}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-900">
                              {(() => {
                                // CRITICAL: Validate paymentAmount - fail loudly if invalid
                                if (record.paymentAmount === undefined || record.paymentAmount === null) {
                                  console.error("[WHT Content] ❌ CRITICAL: Record has missing paymentAmount:", record);
                                  return "ERROR";
                                }
                                if (typeof record.paymentAmount !== "number" || isNaN(record.paymentAmount) || !isFinite(record.paymentAmount)) {
                                  console.error("[WHT Content] ❌ CRITICAL: Record has invalid paymentAmount:", {
                                    record,
                                    paymentAmount: record.paymentAmount,
                                    paymentAmountType: typeof record.paymentAmount,
                                  });
                                  return "ERROR";
                                }
                                return formatCurrency(record.paymentAmount);
                              })()}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                                {record.whtType.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-900">
                              {(() => {
                                // CRITICAL: Validate whtRate - fail loudly if invalid
                                if (record.whtRate === undefined || record.whtRate === null) {
                                  console.error("[WHT Content] ❌ CRITICAL: Record has missing whtRate:", record);
                                  return "ERROR";
                                }
                                if (typeof record.whtRate !== "number" || isNaN(record.whtRate) || !isFinite(record.whtRate)) {
                                  console.error("[WHT Content] ❌ CRITICAL: Record has invalid whtRate:", {
                                    record,
                                    whtRate: record.whtRate,
                                    whtRateType: typeof record.whtRate,
                                  });
                                  return "ERROR";
                                }
                                return `${record.whtRate}%`;
                              })()}
                            </td>
                            <td className="py-3 px-4 font-semibold text-emerald-600">
                              {(() => {
                                // CRITICAL: Validate whtAmount - fail loudly if invalid
                                if (record.whtAmount === undefined || record.whtAmount === null) {
                                  console.error("[WHT Content] ❌ CRITICAL: Record has missing whtAmount:", record);
                                  return "ERROR";
                                }
                                if (typeof record.whtAmount !== "number" || isNaN(record.whtAmount) || !isFinite(record.whtAmount)) {
                                  console.error("[WHT Content] ❌ CRITICAL: Record has invalid whtAmount:", {
                                    record,
                                    whtAmount: record.whtAmount,
                                    whtAmountType: typeof record.whtAmount,
                                    paymentAmount: record.paymentAmount,
                                    whtRate: record.whtRate,
                                  });
                                  return "ERROR";
                                }
                                if (record.whtAmount < 0) {
                                  console.error("[WHT Content] ❌ CRITICAL: Record has negative whtAmount:", {
                                    record,
                                    whtAmount: record.whtAmount,
                                  });
                                  return "ERROR";
                                }
                                return formatCurrency(record.whtAmount);
                              })()}
                            </td>
                            <td className="py-3 px-4 font-semibold text-blue-600">
                              {(() => {
                                // CRITICAL: Calculate and validate netAmount - fail loudly if invalid
                                const netAmount = record.netAmount !== undefined && record.netAmount !== null
                                  ? record.netAmount
                                  : (record.paymentAmount - (record.whtAmount || 0));
                                
                                if (typeof netAmount !== "number" || isNaN(netAmount) || !isFinite(netAmount)) {
                                  console.error("[WHT Content] ❌ CRITICAL: Record has invalid netAmount:", {
                                    record,
                                    netAmount,
                                    netAmountType: typeof netAmount,
                                    paymentAmount: record.paymentAmount,
                                    whtAmount: record.whtAmount,
                                    calculatedNetAmount: record.paymentAmount - (record.whtAmount || 0),
                                  });
                                  return "ERROR";
                                }
                                if (netAmount < 0) {
                                  console.error("[WHT Content] ❌ CRITICAL: Record has negative netAmount:", {
                                    record,
                                    netAmount,
                                    paymentAmount: record.paymentAmount,
                                    whtAmount: record.whtAmount,
                                  });
                                  return "ERROR";
                                }
                                return formatCurrency(netAmount);
                              })()}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{formatDate(new Date(record.paymentDate))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
        

        
        {/* Next Step Navigation */}
        <NextStepCard
          title="Next Step: File Your Returns"
          description="You've tracked your WHT deductions and credits. Now proceed to Tax Filing to manage your returns."
          href="/dashboard/tax-filing"
          actionLabel="Go to Tax Filing"
        />
        
        <UpgradePromptComponent />
      </motion.div>
    </div>
  );
}



