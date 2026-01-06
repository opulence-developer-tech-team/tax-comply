"use client";

/**
 * VATContent Component
 * 
 * Shared component for VAT management that works with both Company and Business accounts.
 * Contains ALL VAT logic and UI - completely extracted from page-level concerns.
 * 
 * CRITICAL REQUIREMENTS (Ruthless Mentor Standards):
 * - entityId: REQUIRED - must be a non-empty string (companyId or businessId)
 * - accountType: REQUIRED - must be AccountType.Company or AccountType.Business (not Individual)
 * - All validation must fail loudly (throw errors) - no defaults, no fallbacks, no auto-assignment
 * - Uses enums, not string literals
 * - Production-ready, bulletproof code
 * 
 * @param entityId - The company ID or business ID (MUST be provided, validated at page level)
 * @param accountType - The account type (MUST be Company or Business, validated at page level)
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { vatActions } from "@/store/redux/vat/vat-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, Calendar, ChevronDown, Info, Calculator } from "lucide-react";
import { HttpMethod } from "@/lib/utils/http-method";
import { AccountType } from "@/lib/utils/account-type";
import { ButtonVariant, ButtonSize, LoadingStateSize } from "@/lib/utils/client-enums";
import { VATRemittanceTracker } from "./VATRemittanceTracker";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { VatGuideModal } from "./VatGuideModal";
import { HelpCircle } from "lucide-react";

// NRS (Nigeria Revenue Service) VAT Deadline: VAT must be remitted by the 21st of the following month
// Reference: https://www.nrs.gov.ng/ (Note: NRS was rebranded as NRS effective January 1, 2026)
// This constant matches the server-side constant in @/lib/constants/nrs-constants (NRS_VAT_DEADLINE_DAY)
const NRS_VAT_DEADLINE_DAY = 21;

interface VATContentProps {
  entityId: string;
  accountType: AccountType.Company | AccountType.Business;
}

interface VATSummary {
  month: number;
  year: number;
  inputVAT?: number;
  outputVAT?: number;
  netVAT?: number;
  status?: string;
  _diagnostic?: {
    totalVATRecords: number;
    outputVATRecords: number;
    inputVATRecords: number;
    recordsWithInvoices: number;
    recordsWithExpenses: number;
    recordsWithoutInvoices: number;
  };
}

// Tooltip component that uses fixed positioning to escape overflow containers
function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isVisible, updatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => {
          updatePosition();
          setIsVisible(true);
        }}
        onMouseLeave={() => setIsVisible(false)}
        className="relative inline-block"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 w-64 shadow-xl pointer-events-auto">
            {content}
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900"></div>
          </div>
        </div>
      )}
    </>
  );
}

export function VATContent({ entityId, accountType }: VATContentProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // CRITICAL: Validate props - fail loudly if invalid
  if (!entityId || typeof entityId !== "string" || entityId.trim() === "") {
    throw new Error(
      "VATContent: entityId prop is required and must be a non-empty string. " +
      "This is a critical prop validation error. Page component must validate and provide entityId."
    );
  }

  const validAccountTypes = [AccountType.Company, AccountType.Business];
  if (!validAccountTypes.includes(accountType)) {
    throw new Error(
      `VATContent: accountType prop must be AccountType.Company or AccountType.Business. ` +
      `Received: "${accountType}". ` +
      "Use AccountType enum, not string literals. Individual accounts do not have VAT management. " +
      "Page component must validate accountType before rendering VATContent."
    );
  }

  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;

  // Get VAT state from Redux
  const {
    summary,
    remittances,
    filters,
    hasFetched,
    isLoading,
    error,
    companyId: vatCompanyId,
  } = useAppSelector((state: any) => state.vat);
  
  // Get subscription from Redux
  const { currentSubscription } = useAppSelector((state: any) => state.subscription);
  const currentPlan = (currentSubscription?.plan || SubscriptionPlan.Free) as SubscriptionPlan;
  
  const { sendHttpRequest: fetchVATReq } = useHttp();

  // Filter state - year is required, month is optional (null = yearly aggregation)
  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  const minTaxYear = 2026;
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // CRITICAL: Normalize filters.year to ensure it's at least minTaxYear before using it
  const normalizedFiltersYear = filters.year ? Math.max(minTaxYear, filters.year) : Math.max(minTaxYear, currentYear);
  
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return normalizedFiltersYear;
  });
  
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => {
    if (filters.month !== undefined && filters.month !== null) return filters.month;
    return now.getMonth() + 1;
  });
  
  const [isFilterExpanded, setIsFilterExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("taxcomply_vat_filters_expanded");
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Persist filter expansion state
  useEffect(() => {
    try {
      localStorage.setItem("taxcomply_vat_filters_expanded", JSON.stringify(isFilterExpanded));
    } catch {
      // Non-critical - continue execution
    }
  }, [isFilterExpanded]);

  // Sync entityId in Redux when it changes
  // CRITICAL: VAT Redux slice uses companyId field name, but it stores entityId (companyId or businessId)
  useEffect(() => {
    if (entityId && entityId !== vatCompanyId) {
      dispatch(vatActions.setCompanyId(entityId));
    }
  }, [entityId, vatCompanyId, dispatch]);

  // Update filters in Redux when they change
  // CRITICAL: Also fix invalid years in Redux immediately (enforce minTaxYear)
  useEffect(() => {
    // Normalize filters.year to ensure it's at least minTaxYear
    const normalizedYear = filters.year ? Math.max(minTaxYear, filters.year) : Math.max(minTaxYear, currentYear);
    
    // If Redux has an invalid year, fix it immediately
    if (filters.year && filters.year < minTaxYear) {
      dispatch(vatActions.setFilters({
        year: normalizedYear,
        month: filters.month,
      }));
      return; // Wait for next render after fixing Redux
    }
    
    const newFilters = {
      year: selectedYear,
      month: selectedMonth,
    };
    
    if (filters.year !== newFilters.year || filters.month !== newFilters.month) {
      dispatch(vatActions.setFilters(newFilters));
    }
  }, [selectedYear, selectedMonth, filters, dispatch, minTaxYear, currentYear]);

  // Fetch VAT summary when entityId is available AND data hasn't been fetched for current filters
  // CRITICAL: Use normalized year to ensure we never request invalid years
  useEffect(() => {
    if (isLoading || !entityId) return;
    
    // Ensure filters.year is valid before fetching
    const yearToFetch = Math.max(minTaxYear, filters.year || currentYear);
    if (filters.year && filters.year < minTaxYear) {
      // Year is invalid, wait for Redux to be fixed by the previous useEffect
      return;
    }
    
    if (!hasFetched) {
      fetchVATSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, filters.year, filters.month, hasFetched, isLoading, minTaxYear, currentYear]);

  const fetchVATSummary = useCallback(() => {
    // CRITICAL: Validate entityId - fail loudly if missing
    if (!entityId) {
      throw new Error(
        "VATContent.fetchVATSummary: entityId is required. " +
        "This should never happen - entityId is validated at component level."
      );
    }

    dispatch(vatActions.setLoading(true));
    
    // Build query params - month is optional (omit for yearly aggregation)
    // CRITICAL: Use companyId or businessId query parameter based on account type
    // CRITICAL: Ensure year is at least minTaxYear (2026) before sending to API
    const yearToUse = Math.max(minTaxYear, filters.year || currentYear);
    const params = new URLSearchParams({
      year: yearToUse.toString(),
    });

    if (isCompanyAccount) {
      params.append("companyId", entityId);
    } else if (isBusinessAccount) {
      params.append("businessId", entityId);
    } else {
      throw new Error(
        `VATContent.fetchVATSummary: Cannot determine query parameter for account type "${accountType}". ` +
        "This is a critical logic error."
      );
    }
    
    // Only add month if selected (otherwise API returns yearly aggregation)
    if (filters.month !== null && filters.month > 0) {
      params.append("month", filters.month.toString());
    }

    console.log("[VAT Content] Fetching VAT summary", {
      entityId,
      accountType,
      year: filters.year,
      month: filters.month,
      url: `/vat/summary?${params.toString()}`,
      timestamp: new Date().toISOString(),
    });

    fetchVATReq({
      successRes: (response: any) => {
        console.log("[VAT Content] Raw HTTP response received", {
          entityId,
          accountType,
          year: filters.year,
          month: filters.month,
          fullResponse: response,
          responseData: response?.data,
          timestamp: new Date().toISOString(),
        });

        const summaryData = response?.data?.data;
        
        console.log("[VAT Content] VAT summary response processed", {
          entityId,
          accountType,
          year: filters.year,
          month: filters.month,
          hasResponseData: !!response?.data,
          hasSummaryData: !!summaryData,
          summary: summaryData ? {
            inputVAT: summaryData.inputVAT,
            outputVAT: summaryData.outputVAT,
            netVAT: summaryData.netVAT,
            status: summaryData.status,
            month: summaryData.month,
            year: summaryData.year,
            diagnostic: summaryData._diagnostic,
          } : null,
          timestamp: new Date().toISOString(),
        });

        if (!summaryData) {
          throw new Error(
            "VATContent.fetchVATSummary: Invalid response format. " +
            "Response data is missing or malformed."
          );
        }

        // CRITICAL: Validate required fields exist
        if (typeof summaryData.month !== "number" || typeof summaryData.year !== "number") {
          throw new Error(
            "VATContent.fetchVATSummary: Invalid response format. " +
            "Response must include month and year as numbers."
          );
        }

        // CRITICAL: VAT Redux slice uses companyId field name, but it stores entityId (companyId or businessId)
        dispatch(vatActions.setVATSummary({
          summary: summaryData,
          filters: {
            year: filters.year,
            month: filters.month,
          },
          companyId: entityId, // Redux slice field name is companyId, but it stores entityId
        }));
      },
      errorRes: (errorResponse: any) => {
        // COMPREHENSIVE LOGGING FOR DEBUGGING - Log everything we can to help diagnose the issue
        console.error("=".repeat(80));
        console.error("[VAT Content] VAT SUMMARY FETCH ERROR - FULL DEBUG INFO");
        console.error("=".repeat(80));
        
        // Log request context
        console.error("REQUEST CONTEXT:", {
          entityId,
          accountType,
          year: filters.year,
          month: filters.month,
          requestURL: `/vat/summary?${isCompanyAccount ? `companyId=${entityId}` : `businessId=${entityId}`}&year=${filters.year}${filters.month ? `&month=${filters.month}` : ""}`,
          timestamp: new Date().toISOString(),
        });
        
        // Log error response structure
        console.error("ERROR RESPONSE TYPE:", typeof errorResponse);
        console.error("ERROR RESPONSE IS NULL/UNDEFINED:", errorResponse === null || errorResponse === undefined);
        
        if (errorResponse && typeof errorResponse === "object") {
          console.error("ERROR RESPONSE KEYS:", Object.keys(errorResponse));
          console.error("ERROR RESPONSE FULL OBJECT:", JSON.stringify(errorResponse, null, 2));
          
          // Try to extract all possible error information
          console.error("ERROR RESPONSE PROPERTIES:", {
            status: errorResponse.status,
            statusCode: errorResponse.statusCode,
            code: errorResponse.code,
            message: errorResponse.message,
            data: errorResponse.data,
            response: errorResponse.response,
            config: errorResponse.config ? {
              url: errorResponse.config.url,
              method: errorResponse.config.method,
              params: errorResponse.config.params,
            } : undefined,
          });
          
          // Check nested response object
          if (errorResponse.response) {
            console.error("ERROR RESPONSE.NESTED RESPONSE:", {
              status: errorResponse.response.status,
              statusText: errorResponse.response.statusText,
              data: errorResponse.response.data,
              headers: errorResponse.response.headers,
            });
          }
          
          // Check nested data object
          if (errorResponse.data) {
            console.error("ERROR RESPONSE.DATA:", JSON.stringify(errorResponse.data, null, 2));
          }
        } else {
          console.error("ERROR RESPONSE VALUE:", errorResponse);
        }
        
        // Handle different error response structures
        if (!errorResponse || typeof errorResponse !== "object") {
          console.error("[VAT Content] Invalid error response structure - stopping");
          dispatch(vatActions.setError("Failed to fetch VAT summary. Please try again."));
          console.error("=".repeat(80));
          return true;
        }

        const errorResponseKeys = Object.keys(errorResponse);
        const isEmptyObject = errorResponseKeys.length === 0;
        
        // Handle empty objects or network errors (no status property)
        const status = errorResponse?.status || errorResponse?.response?.status;
        if (isEmptyObject || (!status && !errorResponse?.response)) {
          console.error("[VAT Content] Network error or empty response - allowing retry");
          dispatch(vatActions.setError("Network error. Please check your connection and try again."));
          console.error("=".repeat(80));
          return true; // Allow retry for network errors
        }

        // Extract status and error data
        const httpStatus = status || errorResponse?.response?.status;
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        const errorMessage = errorData?.description || errorData?.message || errorData?.error || errorResponse?.message || "Failed to fetch VAT summary";

        console.error("EXTRACTED ERROR INFO:", {
          httpStatus,
          errorMessage,
          errorData: JSON.stringify(errorData, null, 2),
        });
        
        console.error("=".repeat(80));
        
        // Handle specific error cases
        if (httpStatus === 404) {
          dispatch(vatActions.setError("No VAT data found for the selected period"));
          // CRITICAL: VAT Redux slice uses companyId field name, but it stores entityId
          dispatch(vatActions.setVATSummary({
            summary: null,
            filters: {
              year: filters.year,
              month: filters.month,
            },
            companyId: entityId,
          }));
          return false; // Don't retry 404 errors
        }
        
        if (httpStatus === 400) {
          dispatch(vatActions.setError(errorMessage || "Invalid filter parameters"));
          return false; // Don't retry 400 errors (bad request)
        }
        
        // CRITICAL: Don't retry 403 errors (authorization/permission errors)
        // These indicate the user doesn't have access, not a transient error
        if (httpStatus === 403) {
          dispatch(vatActions.setError(errorMessage || "You don't have permission to access VAT data"));
          return false; // Don't retry 403 errors - permission issues won't resolve by retrying
        }
        
        // For other errors (500, network errors, etc.), allow retry
        dispatch(vatActions.setError(errorMessage || "Failed to load VAT summary. Please try again."));
        return true;
      },
      requestConfig: {
        url: `/vat/summary?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [entityId, accountType, isCompanyAccount, isBusinessAccount, filters, dispatch, fetchVATReq]);

  // Fetch VAT remittances
  const fetchRemittances = useCallback(() => {
    // CRITICAL: Only fetch remittances when month is selected (not yearly aggregation)
    if (!filters.month || filters.month === 0) {
      // Clear remittances when switching to yearly view (no month selected)
      if (entityId) {
        dispatch(vatActions.setVATRemittances({
          remittances: [],
          companyId: entityId,
        }));
      }
      return;
    }

    if (!entityId) {
      return;
    }

    // Build query params
    const yearToUse = Math.max(minTaxYear, filters.year || currentYear);
    const params = new URLSearchParams({
      year: yearToUse.toString(),
      month: filters.month.toString(),
    });

    if (isCompanyAccount) {
      params.append("companyId", entityId);
    } else if (isBusinessAccount) {
      params.append("businessId", entityId);
    } else {
      throw new Error(
        `VATContent.fetchRemittances: Cannot determine query parameter for account type "${accountType}". ` +
        "This is a critical logic error."
      );
    }

    // Check if user has access to VAT remittance feature
    const hasVatRemittanceFeature = SUBSCRIPTION_PRICING[currentPlan]?.features?.vatRemittance;
    if (!hasVatRemittanceFeature) {
      // User doesn't have access, don't fetch and ensure list is empty
      dispatch(vatActions.setVATRemittances({
        remittances: [],
        companyId: entityId,
      }));
      return;
    }

    fetchVATReq({
      successRes: (response: any) => {
        const remittancesArray = Array.isArray(response?.data?.data) 
          ? response.data.data 
          : Array.isArray(response?.data) 
            ? response.data 
            : [];
        
        dispatch(vatActions.setVATRemittances({
          remittances: remittancesArray,
          companyId: entityId, // Redux slice field name is companyId, but it stores entityId
        }));
      },
      errorRes: (errorResponse: any) => {
        // Ignore 403 (Forbidden) errors, as they likely indicate plan limitations (e.g. Free plan)
        // We don't want to log these as console errors to avoid confusing users
        if (errorResponse?.status === 403) {
          dispatch(vatActions.setVATRemittances({
            remittances: [],
            companyId: entityId,
          }));
          return false; // Don't show toast
        }

        console.error("[VAT Content] Error fetching remittances:", errorResponse);
        // Don't show error toast for remittances - it's a secondary feature
        // Just log it and continue
        dispatch(vatActions.setVATRemittances({
          remittances: [],
          companyId: entityId,
        }));
      },
      requestConfig: {
        url: `/vat/remittance?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [entityId, accountType, isCompanyAccount, isBusinessAccount, filters, dispatch, fetchVATReq, minTaxYear, currentYear]);

  // Fetch remittances when filters change (only if month is selected)
  useEffect(() => {
    if (entityId) {
      fetchRemittances();
    }
  }, [filters.month, filters.year, entityId, fetchRemittances]);

  const handleRemittanceUpdated = useCallback(() => {
    // Refresh remittances after update
    if (filters.month && filters.month > 0) {
      fetchRemittances();
    }
  }, [filters.month, fetchRemittances]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Generate year options (last 11 years from current year, but only from 2026 onward)
  const startYear = Math.max(currentYear, minTaxYear);
  const yearOptions = Array.from({ length: 11 }, (_, i) => {
    const year = startYear - i;
    if (year >= minTaxYear) {
      return { value: year, label: year.toString() };
    }
    return null;
  }).filter((option): option is { value: number; label: string } => option !== null);
  
  // CRITICAL: Validate that yearOptions is not empty (fail loudly if it is)
  if (yearOptions.length === 0) {
    throw new Error(
      `VATContent: No valid year options generated. ` +
      `currentYear: ${currentYear}, minTaxYear: ${minTaxYear}, startYear: ${startYear}. ` +
      `This is a configuration error.`
    );
  }

  const monthOptions = monthNames.map((name, index) => ({
    value: index + 1,
    label: name,
  }));

  const getSummaryTitle = () => {
    if (!summary) return "";
    if (summary.month === 0) {
      return `VAT Summary - ${summary.year} (Yearly Aggregation)`;
    }
    return `VAT Summary - ${monthNames[summary.month - 1]} ${summary.year}`;
  };

  const getVATDeadline = (periodMonth: number, periodYear: number): { date: Date; formatted: string; relative: string } | null => {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (periodYear < minTaxYear || periodYear > 2100) {
      return null;
    }

    // CRITICAL: Yearly aggregation has no single deadline
    if (periodMonth === 0) {
      return null;
    }
    
    let deadlineMonth = periodMonth + 1;
    let deadlineYear = periodYear;
    
    if (deadlineMonth > 12) {
      deadlineMonth = 1;
      deadlineYear += 1;
    }
    
    const deadlineDate = new Date(deadlineYear, deadlineMonth - 1, NRS_VAT_DEADLINE_DAY);
    const formatted = formatDate(deadlineDate);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let relative: string;
    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      relative = daysOverdue === 1 ? "overdue by 1 day" : `overdue by ${daysOverdue} days`;
    } else if (diffDays === 0) {
      relative = "due today";
    } else if (diffDays === 1) {
      relative = "due tomorrow";
    } else if (diffDays <= 7) {
      relative = `due in ${diffDays} days`;
    } else {
      relative = `due on ${formatted}`;
    }
    
    return { date: deadlineDate, formatted, relative };
  };

  const handleResetFilters = () => {
    setSelectedYear(Math.max(minTaxYear, currentYear));
    setSelectedMonth(now.getMonth() + 1);
  };

  const handleRefresh = () => {
    dispatch(vatActions.invalidateCache());
    fetchVATSummary();
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    dispatch(vatActions.invalidateCache());
  };

  const handleMonthChange = (month: number | null) => {
    setSelectedMonth(month);
    dispatch(vatActions.invalidateCache());
  };

  // Only show loading if we're actually fetching AND don't have data yet
  const shouldShowLoading = isLoading && !hasFetched;

  if (shouldShowLoading) {
    return <LoadingState message="Loading VAT summary..." size={LoadingStateSize.Md} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">VAT Management</h1>
          <p className="text-slate-600 text-lg">See exactly what you owe the government.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Sm}
              onClick={() => setIsGuideOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
            >
              <HelpCircle className="w-4 h-4 mr-1.5 md:mr-2" />
              <span className="hidden md:inline">How does this work?</span>
              <span className="md:hidden">Guide</span>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={ButtonVariant.Outline}
              size={ButtonSize.Sm}
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed px-3 md:px-4"
            >
              <RefreshCw className={`w-4 h-4 md:mr-2 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <VatGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Filters Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          className="bg-gradient-to-br from-white to-emerald-50/20 border-2 border-emerald-100 shadow-xl shadow-emerald-500/10 overflow-hidden rounded-xl"
          disableAnimation
        >
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsFilterExpanded(!isFilterExpanded);
              }
            }}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-emerald-50/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer rounded-t-xl active:bg-emerald-100/50"
            aria-expanded={isFilterExpanded}
            aria-controls="vat-filters-content"
            aria-label={isFilterExpanded ? "Collapse filters" : "Expand filters"}
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-slate-900">Date Filters</h3>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                  {selectedMonth ? `${monthNames[selectedMonth - 1]} ${selectedYear}` : `${selectedYear} (Yearly)`}
                </p>
              </div>
            </div>
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
                id="vat-filters-content"
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
                <div className="px-6 py-6 space-y-4 border-t border-emerald-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Year <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          const year = parseInt(e.target.value);
                          setSelectedYear(Math.max(minTaxYear, year));
                        }}
                        className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm transition-colors hover:border-emerald-200"
                        aria-required="true"
                      >
                        {yearOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Month <span className="text-slate-400 text-xs">(Optional - leave empty for yearly)</span>
                      </label>
                      <select
                        value={selectedMonth || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedMonth(value === "" ? null : parseInt(value));
                        }}
                        className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm transition-colors hover:border-emerald-200"
                      >
                        <option value="">All Months (Yearly Summary)</option>
                        {monthOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-emerald-100">
                    <Button
                      variant={ButtonVariant.Outline}
                      size={ButtonSize.Sm}
                      onClick={handleResetFilters}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm"
                    >
                      Reset to Current
                    </Button>
                    <p className="text-xs text-slate-500">
                      {selectedMonth 
                        ? `Showing data for ${monthNames[selectedMonth - 1]} ${selectedYear}`
                        : `Showing yearly summary for ${selectedYear}`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-red-50 border-2 border-red-200">
            <div className="p-4">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Compliance Alert - Nigeria Tax Reform 2025 */}
      {summary && summary.annualTurnover !== undefined && summary.isVATExempt && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-6"
        >
          <div className={`p-4 rounded-xl border-2 ${
            (summary.outputVAT || 0) > 0 
              ? "bg-amber-50 border-amber-200 text-amber-900" // Exempt but charged VAT -> Warning
              : "bg-blue-50 border-blue-200 text-blue-900" // Exempt and no VAT -> Info
          }`}>
            <div className="flex items-start gap-3">
              <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                (summary.outputVAT || 0) > 0 ? "text-amber-600" : "text-blue-600"
              }`} />
              <div>
                <p className="font-bold text-sm mb-1">
                  {(summary.outputVAT || 0) > 0 
                    ? "VAT Compliance Notice: Below Threshold but Charging VAT" 
                    : "VAT Exemption Status: Active"}
                </p>
                <div className="text-sm opacity-90 space-y-2">
                  <p>
                    Your annual turnover for {selectedYear} is <strong>{formatCurrency(summary.annualTurnover)}</strong>, which is below the <strong>₦25,000,000</strong> threshold for mandatory VAT registration (Nigeria Tax Reform Acts 2025).
                  </p>
                  {(summary.outputVAT || 0) > 0 ? (
                    <p className="font-medium">
                      However, since you have charged VAT (Output VAT: {formatCurrency(summary.outputVAT)}) on your invoices, 
                      <strong> you are required by law to remit it to NRS.</strong>
                    </p>
                  ) : (
                    <p>
                      You are <strong>exempt</strong> from charging VAT. You do not need to file returns unless you choose to register voluntarily.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary Content */}
      {summary ? (
        <>
          <motion.div
            key={`summary-${selectedYear}-${selectedMonth || 'yearly'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card
              title={getSummaryTitle()}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative p-8 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200 overflow-hidden group hover:shadow-lg transition-shadow"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl"></div>
                  <div className="relative overflow-visible">
                    <div className="flex items-center justify-between mb-3">
                      <DollarSign className="w-6 h-6 text-emerald-600" />
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-slate-600">VAT You Collected</p>
                      <Tooltip
                        content={
                          <p>Money you collected from customers (7.5% on sales). This belongs to the government.</p>
                        }
                      >
                        <Info className="w-4 h-4 text-emerald-600 cursor-help" />
                      </Tooltip>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-bold text-emerald-700 mb-1"
                    >
                      {formatCurrency(summary.outputVAT ?? 0)}
                    </motion.p>
                    <p className="text-xs text-slate-500">Total VAT added to your invoices</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="relative p-8 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl border border-green-200 overflow-hidden group hover:shadow-lg transition-shadow"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/20 rounded-full blur-2xl"></div>
                  <div className="relative overflow-visible">
                    <div className="flex items-center justify-between mb-3">
                      <DollarSign className="w-6 h-6 text-green-600" />
                      <TrendingDown className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-slate-600">VAT You Paid</p>
                      <Tooltip
                        content={
                          <p>VAT you paid to suppliers for business expenses. You can subtract this.</p>
                        }
                      >
                        <Info className="w-4 h-4 text-green-600 cursor-help" />
                      </Tooltip>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-3xl font-bold text-green-700 mb-1"
                    >
                      {formatCurrency(summary.inputVAT ?? 0)}
                    </motion.p>
                    <p className="text-xs text-slate-500">VAT included in your expenses</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`relative p-8 rounded-xl border overflow-hidden group hover:shadow-lg transition-shadow ${
                    (summary.netVAT ?? 0) >= 0
                      ? "bg-gradient-to-br from-red-50 to-red-100/50 border-red-200"
                      : "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200"
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl ${
                    (summary.netVAT ?? 0) >= 0 ? "bg-red-200/20" : "bg-emerald-200/20"
                  }`}></div>
                  <div className="relative overflow-visible">
                    <div className="flex items-center justify-between mb-3">
                      <DollarSign className={`w-6 h-6 ${(summary.netVAT ?? 0) >= 0 ? "text-red-600" : "text-emerald-600"}`} />
                      {(summary.netVAT ?? 0) >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-red-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-slate-600">Your VAT Balance</p>
                      <Tooltip
                        content={
                          <>
                            <p className="font-semibold mb-1">How we got this:</p>
                            <p>(VAT Collected) - (VAT Paid)</p>
                            <p className="mt-1 font-bold">This is what you owe the government.</p>
                          </>
                        }
                      >
                        <Info className={`w-4 h-4 cursor-help ${(summary.netVAT ?? 0) >= 0 ? "text-red-600" : "text-emerald-600"}`} />
                      </Tooltip>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className={`text-3xl font-bold mb-1 ${
                        (summary.netVAT ?? 0) >= 0 ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(summary.netVAT ?? 0)}
                    </motion.p>
                    <p className="text-xs text-slate-500">
                      {(summary.status || "zero") === "payable"
                        ? "Amount to pay to government"
                        : (summary.status || "zero") === "refundable"
                          ? (summary.isVATExempt && (summary.outputVAT || 0) === 0)
                            ? "No payment needed (Exempt)"
                            : "Government owes you this"
                        : (summary.isVATExempt && (summary.inputVAT || 0) > 0)
                          ? "Input VAT not claimable (Exempt)"
                          : "Nothing to pay"}
                    </p>
                  </div>
                </motion.div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card title="VAT Status">
              <div className="flex items-center space-x-6">
                <motion.span
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`px-6 py-3 rounded-xl font-bold text-sm ${
                    (summary.status || "zero") === "payable"
                      ? "bg-red-100 text-red-800 border-2 border-red-200"
                      : (summary.status || "zero") === "refundable"
                        ? (summary.isVATExempt && (summary.outputVAT || 0) === 0)
                          ? "bg-slate-100 text-slate-800 border-2 border-slate-200" // Refundable but exempt -> Gray
                          : "bg-emerald-100 text-emerald-800 border-2 border-emerald-200" // Truly refundable -> Green
                        : "bg-slate-100 text-slate-800 border-2 border-slate-200"
                  }`}
                >
                  {(summary.status === "refundable" && summary.isVATExempt && (summary.outputVAT || 0) === 0) 
                    ? "EXEMPT (INPUT VAT ONLY)" 
                    : (summary.status || "zero").toUpperCase()}
                </motion.span>
                <p className="text-sm text-slate-600 flex-1">
                  {(summary.status || "zero") === "payable" ? (() => {
                    const deadline = getVATDeadline(summary.month, summary.year);
                    if (!deadline) {
                      return (
                        <span>
                          VAT is filed monthly. Each month's return is due by the 21st of the following month. 
                          Review individual months to see specific deadlines.
                        </span>
                      );
                    }
                    const isOverdue = deadline.date < new Date();
                    return (
                      <span>
                        You need to file and remit your VAT return to NRS (Nigeria Revenue Service) by{" "}
                        <span className={`font-semibold ${isOverdue ? "text-red-600" : "text-emerald-600"}`}>
                          {deadline.formatted}
                        </span>
                        {" "}({deadline.relative})
                      </span>
                    );
                  })()
                    : (summary.status || "zero") === "refundable"
                      ? (summary.isVATExempt && (summary.outputVAT || 0) === 0)
                        ? "Since you are exempt and not charging Output VAT, you cannot claim a refund for Input VAT. Treat this amount as a business expense."
                        : "You can claim a VAT refund from NRS (Nigeria Revenue Service). File your VAT return to process the refund."
                    : "No VAT payable for this period"}
                </p>
              </div>
            </Card>
          </motion.div>

          {/* VAT Remittances Section - Only show when month is selected (not yearly aggregation) */}
          {summary && summary.month > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <VATRemittanceTracker
                remittances={remittances || []}
                entityId={entityId}
                accountType={accountType}
                month={summary.month}
                year={summary.year}
                onRemittanceUpdated={handleRemittanceUpdated}
                currentPlan={currentPlan}
              />
            </motion.div>
          )}
        </>
      ) : (
        <motion.div
          key={`empty-${selectedYear}-${selectedMonth || 'yearly'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="text-6xl mb-6"
              >
                💰
              </motion.div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                No VAT data for {selectedMonth ? `${monthNames[selectedMonth - 1]} ${selectedYear}` : `${selectedYear}`}
              </h3>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                {selectedMonth 
                  ? "No VAT data found for the selected month. Create invoices to start tracking VAT automatically."
                  : "No VAT data found for the selected year. Create invoices to start tracking VAT automatically."}
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={() => router.push("/dashboard/invoices/create")}>
                  Create Invoice
                </Button>
              </motion.div>
            </motion.div>
          </Card>
        </motion.div>
      )}

      {/* Next Step Navigation */}
      <NextStepCard
        title="Next Step: File Your Taxes"
        description="Once your VAT summary is reviewed, proceed to Tax Filing to submit your returns."
        href="/dashboard/tax-filing"
        actionLabel="Go to Tax Filing"
      />
    </motion.div>
  );
}

