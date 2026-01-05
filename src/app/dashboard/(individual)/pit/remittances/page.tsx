"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { pitActions, type PITRemittance } from "@/store/redux/pit/pit-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { createErrorStateProps } from "@/components/shared/errorUtils";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { ButtonVariant, ButtonSize, LoadingStateSize } from "@/lib/utils/client-enums";
import { RefreshCw, Receipt, Plus, Calendar, Filter, Search, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PITRemittanceTracker } from "@/components/dashboard/pit/PITRemittanceTracker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { RemittanceGuideModal } from "@/components/dashboard/pit/RemittanceGuideModal";

// ============================================================================
// Animation Variants
// ============================================================================
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

// ============================================================================
// Main Remittances Page Component
// ============================================================================
export default function RemittancesPage() {
  const dispatch = useAppDispatch();
  
  // Get user from Redux
  const { user } = useAppSelector((state: any) => state.user);
  
  // CRITICAL: This page is exclusively for Individual accounts
  const accountType = user?.accountType;
  const isIndividualAccount = accountType === AccountType.Individual;
  
  // CRITICAL: accountId must be the user's ID
  const accountId = isIndividualAccount ? (user?._id?.toString() || null) : null;
  
  // Get subscription from Redux subscription slice
  const { currentSubscription } = useAppSelector((state: any) => state.subscription);
  
  // Get PIT state from Redux
  const {
    summary,
    remittances,
    accountId: pitAccountId,
    hasFetched,
    isLoading,
    error,
  } = useAppSelector((state: any) => state.pit);
  
  const { sendHttpRequest: fetchPITReq } = useHttp();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  
  const currentPlan = (currentSubscription?.plan || SubscriptionPlan.Free) as SubscriptionPlan;
  
  // Filter state
  const now = new Date();
  const minTaxYear = 2026;
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const currentYear = now.getFullYear();
    return Math.max(minTaxYear, currentYear);
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // CRITICAL FIX: Memoize currentYear to prevent infinite loops
  const currentYear = now.getFullYear();
  
  // Available years (current year and 4 previous years, but only from 2026 onward)
  const availableYears = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - i;
    return year >= minTaxYear ? year : null;
  }).filter((year): year is number => year !== null);
  
  // CRITICAL FIX: Use ref to track summary to prevent infinite loops
  const summaryRef = useRef(summary);
  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);
  
  // Fetch PIT summary to check exemption status
  const isFetchingSummaryRef = useRef(false);
  const fetchPITSummary = useCallback(() => {
    if (!isIndividualAccount) return;
    if (!accountId) return;
    if (isFetchingSummaryRef.current) return;

    const targetTaxYear = selectedYear;
    const currentSummary = summaryRef.current;
    
    // Skip if we already have data for this year
    if (currentSummary && currentSummary.taxYear === targetTaxYear && currentSummary.accountId === accountId) {
      return;
    }

    isFetchingSummaryRef.current = true;
    const params = new URLSearchParams({
      accountId: accountId,
      taxYear: targetTaxYear.toString(),
    });

    fetchPITReq({
      successRes: (response: any) => {
        isFetchingSummaryRef.current = false;
        const summaryData = response?.data?.data || response?.data;
        dispatch(pitActions.setPITSummary({
          summary: summaryData || null,
          taxYear: targetTaxYear,
          accountId,
        }));
      },
      errorRes: () => {
        isFetchingSummaryRef.current = false;
        // Silently fail - summary is optional for remittances page
      },
      requestConfig: {
        url: `/pit/summary?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [accountId, selectedYear, fetchPITReq, dispatch, isIndividualAccount]);

  // Fetch all remittances
  const fetchRemittances = useCallback(() => {
    if (!isIndividualAccount) return;
    if (!accountId) return;

    const params = new URLSearchParams({
      accountId: accountId,
    });
    params.append("taxYear", selectedYear.toString());

    fetchPITReq({
      successRes: (response: any) => {
        const remittancesData = response?.data?.data || response?.data || [];
        dispatch(pitActions.setPITRemittances({
          remittances: Array.isArray(remittancesData) ? remittancesData : [],
          accountId,
        }));
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

  // Initial data fetch
  useEffect(() => {
    if (isIndividualAccount && accountId && (!hasFetched || pitAccountId !== accountId)) {
      fetchRemittances();
      const targetTaxYear = selectedYear;
      const currentSummary = summaryRef.current;
      if (!currentSummary || currentSummary.taxYear !== targetTaxYear || currentSummary.accountId !== accountId) {
        fetchPITSummary();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIndividualAccount, accountId, hasFetched, pitAccountId, selectedYear, currentYear]);

  // Refetch summary when tax year changes
  useEffect(() => {
    if (isIndividualAccount && accountId) {
      const targetTaxYear = selectedYear;
      const currentSummary = summaryRef.current;
      if (!currentSummary || currentSummary.taxYear !== targetTaxYear || currentSummary.accountId !== accountId) {
        fetchPITSummary();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, isIndividualAccount, accountId]);

  // Filter remittances
  const filteredRemittances = remittances.filter((rem: PITRemittance) => {
    if (rem.taxYear !== selectedYear) return false;
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        rem.remittanceReference?.toLowerCase().includes(searchLower) ||
        formatCurrency(rem.remittanceAmount).toLowerCase().includes(searchLower) ||
        formatDate(rem.remittanceDate).toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Calculate summary statistics
  const totalRemitted = filteredRemittances.reduce((sum: number, rem: PITRemittance) => sum + (rem.remittanceAmount || 0), 0);
  const remittancesByYear = filteredRemittances.reduce((acc: Record<number, number>, rem: PITRemittance) => {
    acc[rem.taxYear] = (acc[rem.taxYear] || 0) + (rem.remittanceAmount || 0);
    return acc;
  }, {} as Record<number, number>);

  const handleRefresh = () => {
    dispatch(pitActions.invalidateCache());
    fetchRemittances();
  };

  if (isLoading && !hasFetched) {
    return (
      <RouteGuard requireAccountType={AccountType.Individual} redirectTo="/dashboard/expenses" loadingMessage="Loading remittances...">
        <LoadingState message="Loading remittances..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  if (error && !remittances.length && hasFetched) {
    const errorProps = createErrorStateProps(error);
    return (
      <RouteGuard requireAccountType={AccountType.Individual} redirectTo="/dashboard/expenses" loadingMessage="Loading remittances...">
        <ErrorState
          {...errorProps}
          title="Could Not Load Remittances"
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
    <RouteGuard requireAccountType={AccountType.Individual} redirectTo="/dashboard/expenses" loadingMessage="Loading remittances...">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <UpgradePromptComponent />

        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Link href="/dashboard/pit">
                <Button
                  variant={ButtonVariant.Outline}
                  size={ButtonSize.Sm}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center space-x-3 mt-3">
               <div className="bg-emerald-100 p-2 rounded-lg">
                  <Receipt className="w-6 h-6 text-emerald-600" />
               </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Your Tax Payments</h1>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold border border-emerald-200">
                  {selectedYear}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 ml-0 sm:ml-12 mt-1">
                <p className="text-slate-600 text-base">Keep track of money you've paid to the government.</p>
                <button 
                    onClick={() => setIsGuideOpen(true)}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 underline decoration-dashed underline-offset-4 bg-transparent border-none p-0 cursor-pointer self-start sm:self-auto"
                >
                    What is this?
                </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant={ButtonVariant.Outline}
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 w-full md:w-auto"
              aria-label="Refresh remittances"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        {filteredRemittances.length > 0 && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-1">Total Remittances</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRemitted)}</p>
              <p className="text-xs text-slate-500 mt-1">{filteredRemittances.length} record{filteredRemittances.length !== 1 ? "s" : ""}</p>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-1">Tax Years Covered</p>
              <p className="text-2xl font-bold text-slate-900">{Object.keys(remittancesByYear).length}</p>
              <p className="text-xs text-slate-500 mt-1">Unique tax years</p>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-1">Average Payment</p>
              <p className="text-2xl font-bold text-slate-900">
                {filteredRemittances.length > 0 
                  ? formatCurrency(totalRemitted / filteredRemittances.length)
                  : formatCurrency(0)
                }
              </p>
              <p className="text-xs text-slate-500 mt-1">Per transaction</p>
            </Card>
          </motion.div>
        )}

        <RemittanceGuideModal 
            isOpen={isGuideOpen} 
            onClose={() => setIsGuideOpen(false)} 
        />

        {/* Filters */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
              </div>
              <Button
                variant={ButtonVariant.Outline}
                size={ButtonSize.Sm}
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                {isFilterExpanded ? "Collapse" : "Expand"} Filters
              </Button>
            </div>
            
            {isFilterExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <label htmlFor="tax-year-filter" className="block text-sm font-medium text-slate-700 mb-2">
                    Tax Year
                  </label>
                  <select
                    id="tax-year-filter"
                    value={selectedYear}
                    onChange={(e) => {
                      const year = parseInt(e.target.value);
                      if (isNaN(year) || year < minTaxYear) {
                        setSelectedYear(minTaxYear);
                      } else {
                        setSelectedYear(year);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="search-filter" className="block text-sm font-medium text-slate-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="search-filter"
                      type="text"
                      placeholder="Search by reference, amount, or date..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Remittances List */}
        <motion.div variants={itemVariants}>
          {accountId && (
            <Card title="All Remittances">
              <PITRemittanceTracker
                remittances={filteredRemittances}
                accountId={accountId}
                taxYear={selectedYear}
                onRemittanceUpdated={() => {
                  dispatch(pitActions.invalidateCache());
                  fetchRemittances();
                  setTimeout(() => {
                    fetchPITSummary();
                  }, 500);
                }}
                currentPlan={currentPlan}
                isFullyExempt={summary?.isFullyExempt === true}
                exemptionReason={summary?.exemptionReason}
                pitAfterWHT={summary?.pitAfterWHT || 0}
              />
            </Card>
          )}
        </motion.div>
      </motion.div>
    </RouteGuard>
  );
}
