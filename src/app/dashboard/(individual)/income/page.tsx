"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { incomeActions, type IncomeSource } from "@/store/redux/income/income-slice";
import { pitActions } from "@/store/redux/pit/pit-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { createErrorStateProps, getErrorMessage, getErrorType } from "@/components/shared/errorUtils";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { RefreshCw } from "lucide-react";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { toast } from "sonner";
import { LoadingStateSize, ConfirmModalVariant } from "@/lib/utils/client-enums";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency } from "@/lib/utils";
import {
  IncomeHeader,
  IncomeFilters,
  IncomeSourcesList,
  IncomeSummary,
  IncomeSourceModal,
} from "@/components/dashboard/income";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { IncomeGuideModal } from "@/components/dashboard/income/IncomeGuideModal";

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

// ============================================================================
// Main Income Page Component
// ============================================================================
export default function IncomePage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const accountId = user?._id?.toString() || null;
  const currentPlan = useAppSelector((state) => (state.subscription.currentSubscription?.plan || SubscriptionPlan.Free) as SubscriptionPlan);
  
  // Get income state from Redux
  const {
    incomeSources,
    pagination,
    filters,
    accountId: incomeAccountId,
    hasFetched,
    isLoading,
    error,
  } = useAppSelector((state) => state.income);

  const { sendHttpRequest: incomeReq } = useHttp();

  // Local UI state for search (will be debounced)
  // CRITICAL: Initialize from Redux filters to stay in sync
  const [searchInput, setSearchInput] = useState(() => filters.search);
  const [selectedYear, setSelectedYear] = useState<number | null>(() => filters.year);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => filters.month);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    income: IncomeSource | null;
  }>({
    isOpen: false,
    income: null,
  });
  
  // CRITICAL: Store all income sources for summary calculation (not just paginated ones)
  // This ensures summary updates when list is mutated, regardless of pagination
  const [allIncomeSourcesForSummary, setAllIncomeSourcesForSummary] = useState<IncomeSource[]>([]);

  // Debounce search input (500ms delay)
  const debouncedSearch = useDebounce(searchInput, 500);

  // ============================================================================
  // Data Fetching with Server-Side Filtering
  // ============================================================================
  /**
   * Fetch income sources from API with server-side filtering and pagination
   * CRITICAL: Defaults to current year for optimal performance
   * Only fetches if filters changed or data not fetched
   */
  const fetchIncomeSources = useCallback(() => {
    if (!accountId) {
      console.warn("[IncomePage] fetchIncomeSources: accountId missing");
      return;
    }

    // CRITICAL: Don't fetch if already loading to prevent duplicate requests
    if (isLoading) {
      console.log("[IncomePage] fetchIncomeSources: Already loading, skipping");
      return;
    }

    // Set account ID in Redux (will clear cache if changed)
    dispatch(incomeActions.setAccountId(accountId));
    dispatch(incomeActions.setLoading(true));
    dispatch(incomeActions.setError(null)); // Clear previous errors

    // Build query params with server-side filtering
    const params = new URLSearchParams({
      accountId: accountId,
      entityType: "individual",
      page: filters.page.toString(),
      limit: filters.limit.toString(),
    });

    // CRITICAL: Send year filter if specified (null = all years, number = specific year)
    // Backend defaults to current year if not provided, but we explicitly send it for clarity
    if (filters.year !== null && filters.year !== undefined) {
      params.append("year", filters.year.toString());
    }

    // Month filter (optional) - only send if explicitly set (not null)
    // CRITICAL: Don't send month parameter if null (backend will handle "all months")
    if (filters.month !== null && filters.month !== undefined) {
      params.append("month", filters.month.toString());
    }

    // Server-side search (debounced)
    if (filters.search.trim()) {
      params.append("search", filters.search.trim());
    }

    // Sort parameters
    params.append("sortField", filters.sortField);
    params.append("sortOrder", filters.sortOrder);

    incomeReq({
      successRes: (response: any) => {
        const data = response?.data?.data;
        const incomesData = data?.incomes || [];
        const incomeList = Array.isArray(incomesData) ? incomesData : [];
        const paginationData = data?.pagination || {
          page: filters.page,
          limit: filters.limit,
          total: 0,
          pages: 0,
        };
        
        // Update Redux state with paginated data
        dispatch(incomeActions.setIncomeSources({
          incomeSources: incomeList,
          pagination: paginationData,
          accountId,
        }));
        
        // CRITICAL: Fetch ALL income sources matching filters (without pagination) for summary
        // This ensures summary reflects all matching income sources, not just current page
        fetchAllIncomeSourcesForSummary();
      },
      errorRes: (errorResponse: any) => {
        // Use standardized error handling
        const errorType = getErrorType(errorResponse);
        const errorMessage = getErrorMessage(errorResponse, "Failed to load income sources");
        const status = errorResponse?.status || errorResponse?.response?.status;
        
        console.error("[IncomePage] ❌ Error fetching income sources:", {
          status,
          errorType,
          error: errorMessage,
        });
        
        // CRITICAL: Set error and mark as fetched to prevent infinite retry loops
        // Only retry on network errors, not 400/500 errors
        dispatch(incomeActions.setError(errorMessage));
        dispatch(incomeActions.setLoading(false));
        
        // CRITICAL: Mark as fetched even on error to prevent infinite retry loops
        // This ensures the useEffect won't trigger another fetch
        // User can manually retry via refresh button if needed
        if (status !== 401 && status !== 403) {
          // Don't mark as fetched for auth errors (they trigger logout)
          // For other errors (400, 500, etc.), mark as fetched to stop the loop
          dispatch(incomeActions.setIncomeSources({
            incomeSources: [],
            pagination: {
              page: filters.page,
              limit: filters.limit,
              total: 0,
              pages: 0,
            },
            accountId,
          }));
        } else {
          // For auth errors, don't mark as fetched - let logout handle it
          // But still set loading to false
          dispatch(incomeActions.setLoading(false));
        }
        
        return true; // Show error toast
      },
      requestConfig: {
        url: `/income?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [accountId, incomeReq, dispatch, filters, isLoading]);

  /**
   * Fetch ALL income sources matching current filters (without pagination) for summary
   * CRITICAL: This ensures summary reflects all matching income sources, not just current page
   * This is called after paginated fetch to keep summary in sync
   */
  const fetchAllIncomeSourcesForSummary = useCallback(() => {
    if (!accountId) return;

    // Build query params with same filters but NO pagination (limit = 10000 to get all)
    const params = new URLSearchParams({
      accountId: accountId,
      entityType: "individual",
      page: "1",
      limit: "10000", // Large limit to get all matching records
    });

    // Apply same filters as paginated fetch
    if (filters.year !== null && filters.year !== undefined) {
      params.append("year", filters.year.toString());
    }
    if (filters.month !== null) {
      params.append("month", filters.month.toString());
    }
    if (filters.search.trim()) {
      params.append("search", filters.search.trim());
    }
    // Don't include sort - not needed for summary calculation

    incomeReq({
      successRes: (response: any) => {
        const data = response?.data?.data;
        const incomesData = data?.incomes || [];
        const allIncomeList = Array.isArray(incomesData) ? incomesData : [];
        
        // Update all income sources for summary calculation
        setAllIncomeSourcesForSummary(allIncomeList);
      },
      errorRes: () => {
        // Silently fail - summary will just use paginated data
        // Don't show error toast for summary fetch
        return false;
      },
      requestConfig: {
        url: `/income?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [accountId, incomeReq, filters, setAllIncomeSourcesForSummary]);

  // Sync debounced search with Redux filters
  // CRITICAL: Only update if actually changed to prevent loops
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      dispatch(incomeActions.setFilters({ 
        search: debouncedSearch,
        page: 1, // Reset to first page on search
      }));
    }
  }, [debouncedSearch, filters.search, dispatch]);

  // Sync year/month changes with Redux filters
  // CRITICAL: Only update if actually changed to prevent loops
  useEffect(() => {
    const yearChanged = selectedYear !== filters.year;
    const monthChanged = selectedMonth !== filters.month;
    
    if (yearChanged || monthChanged) {
      dispatch(incomeActions.setFilters({ 
        year: selectedYear,
        month: selectedMonth,
        page: 1, // Reset to first page on filter change
      }));
    }
  }, [selectedYear, selectedMonth, filters.year, filters.month, dispatch]);

  // Fetch data when filters change or accountId changes
  // CRITICAL: Follow the pattern from invoices page - check individual filter properties
  // This prevents infinite loops from object reference changes
  useEffect(() => {
    // Don't fetch if already loading or if we don't have an accountId yet
    if (isLoading || !accountId) return;
    
    // Fetch if data hasn't been fetched for current filters
    // (hasFetched is false when filters change, so this will trigger a refetch)
    if (!hasFetched || incomeAccountId !== accountId) {
      fetchIncomeSources();
    }
    
    // CRITICAL: When filters change, clear summary cache to prevent showing stale data
    // The summary will be refetched when fetchIncomeSources completes (via fetchAllIncomeSourcesForSummary)
    // This ensures summary always matches current filters
    setAllIncomeSourcesForSummary([]);
    
    // CRITICAL: Use individual filter properties in deps, not the whole filters object
    // This matches the pattern from invoices page and prevents infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accountId,
    incomeAccountId,
    hasFetched,
    isLoading,
    filters.year,
    filters.month,
    filters.search,
    filters.page,
    filters.limit,
    filters.sortField,
    filters.sortOrder,
  ]);

  // ============================================================================
  // Delete Handler
  // ============================================================================
  /**
   * Delete an income source
   * Opens confirmation modal instead of browser alert
   */
  const handleDelete = useCallback((income: IncomeSource) => {
    setConfirmDeleteModal({
      isOpen: true,
      income,
    });
  }, []);

  /**
   * Confirm delete action - actually performs the deletion
   * CRITICAL: After successful delete, invalidate cache to refetch fresh data
   */
  const confirmDelete = useCallback(async () => {
    const income = confirmDeleteModal.income;
    if (!income || !accountId || isDeleting) return;

    setIsDeleting(income._id);

    const params = new URLSearchParams({
      accountId: accountId,
      entityType: "individual",
      taxYear: income.taxYear.toString(),
    });
    if (income.month) params.append("month", income.month.toString());

    incomeReq({
      successRes: () => {
        // Close confirmation modal
        setConfirmDeleteModal({ isOpen: false, income: null });
        
        // CRITICAL: Remove from Redux optimistically (no refetch needed)
        // The Redux reducer handles removing the item and updating pagination
        dispatch(incomeActions.removeIncomeSource(income._id));
        
        // CRITICAL: Remove from summary data immediately (optimistic update)
        setAllIncomeSourcesForSummary((prev) =>
          prev.filter((s) => String(s._id) !== income._id)
        );
        
        // CRITICAL: Invalidate PIT cache when income is deleted
        // Income affects PIT calculations (gross income is the base for tax calculations)
        // The backend already triggers PIT summary recalculation, but we need to invalidate frontend cache
        // so the PIT page refetches the updated summary
        dispatch(pitActions.invalidateCache());
        console.log("[IncomePage] PIT cache invalidated - income source deleted", {
          incomeId: income._id,
          taxYear: income.taxYear,
          timestamp: new Date().toISOString(),
        });
        
        toast.success("Income source deleted successfully");
        
        // Reset deleting state
        setIsDeleting(null);
        
        // CRITICAL: Refetch summary in background to ensure accuracy
        // Optimistic update provides immediate feedback, but we need to ensure data is correct
        // This handles edge cases where delete might affect other records or server-side calculations
        setTimeout(() => {
          fetchAllIncomeSourcesForSummary();
        }, 300); // Shorter delay for delete (faster than create/update)
      },
      errorRes: (errorResponse: any) => {
        // Use standardized error handling
        const errorMessage = getErrorMessage(errorResponse, "Failed to delete income source");
        toast.error(errorMessage);
        setIsDeleting(null);
        return true; // Show error toast
      },
      requestConfig: {
        url: `/income?${params.toString()}`,
        method: HttpMethod.DELETE,
      },
    });
  }, [accountId, incomeReq, dispatch, confirmDeleteModal.income, isDeleting]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  // Get available years from income sources (for filter dropdown)
  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  // Note: This is a simplified version - in production, you might want to fetch
  // available years from a separate endpoint for better performance
  const minTaxYear = 2026; // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  const availableYears = Array.from(
    new Set(incomeSources.map((income) => income.taxYear).filter((year) => year >= minTaxYear))
  ).sort((a, b) => b - a);

  // Add current year if not in list (but only if >= 2026)
  const currentYear = new Date().getFullYear();
  const validCurrentYear = Math.max(minTaxYear, currentYear);
  if (!availableYears.includes(validCurrentYear)) {
    availableYears.unshift(validCurrentYear);
  }

  // ============================================================================
  // Pagination Handlers
  // ============================================================================
  const handlePageChange = useCallback((newPage: number) => {
    dispatch(incomeActions.setFilters({ page: newPage }));
  }, [dispatch]);

  // ============================================================================
  // Loading & Error States
  // ============================================================================
  // Loading state
  if (isLoading && incomeSources.length === 0) {
    return (
      <RouteGuard requireAccountType={AccountType.Individual} redirectTo="/dashboard/expenses" loadingMessage="Loading income management...">
        <LoadingState message="Loading income sources..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  // Error state
  if (error && incomeSources.length === 0) {
    const errorProps = createErrorStateProps(error);
    return (
      <RouteGuard requireAccountType={AccountType.Individual} redirectTo="/dashboard/expenses" loadingMessage="Loading income management...">
        <ErrorState
          {...errorProps}
          title="Could Not Load Income Sources"
          primaryAction={{
            label: "Try Again",
            onClick: fetchIncomeSources,
            icon: RefreshCw,
          }}
        />
      </RouteGuard>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <RouteGuard requireAccountType={AccountType.Individual} redirectTo="/dashboard/expenses" loadingMessage="Loading income management...">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <IncomeHeader
          onAddClick={() => {
            setEditingIncome(null);
            setShowIncomeModal(true);
          }}
          onGuideClick={() => setShowGuideModal(true)}
        />

        {/* Summary Card - Show overview before list for better UX */}
        {/* CRITICAL: Use allIncomeSourcesForSummary to reflect ALL matching income sources, not just current page */}
        <IncomeSummary 
          filteredIncome={allIncomeSourcesForSummary.length > 0 ? allIncomeSourcesForSummary : incomeSources}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
        />

        {/* Filters and Search */}
        <IncomeFilters
          searchQuery={searchInput}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          availableYears={availableYears}
          onSearchChange={setSearchInput}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />

        {/* Income Sources List */}
        <IncomeSourcesList
          filteredIncome={incomeSources}
          allIncomeSources={incomeSources}
          isLoading={isLoading}
          hasFetched={hasFetched}
          isDeleting={isDeleting}
          pagination={pagination}
          onPageChange={handlePageChange}
          onRefresh={() => {
            dispatch(incomeActions.invalidateCache());
            fetchIncomeSources();
          }}
          onAddClick={() => {
            setEditingIncome(null);
            setShowIncomeModal(true);
          }}
          onEdit={(income) => {
            setEditingIncome(income);
            setShowIncomeModal(true);
          }}
          onDelete={handleDelete}
        />

        {/* Income Source Modal */}
        <IncomeSourceModal
          isOpen={showIncomeModal}
          onClose={() => {
            setShowIncomeModal(false);
            setEditingIncome(null);
          }}
          income={editingIncome}
          onSuccess={(updatedIncome) => {
            // CRITICAL: Modal already handles Redux updates, but we need to update summary state
            // Update allIncomeSourcesForSummary to reflect the change immediately (optimistic update)
            if (updatedIncome) {
              // Check if updated income matches current filters
              const matchesFilters = 
                (filters.year === null || updatedIncome.taxYear === filters.year) &&
                (filters.month === null || updatedIncome.month === filters.month);
              
              // CRITICAL: Always update allIncomeSourcesForSummary optimistically
              // This ensures the summary updates immediately, even if allIncomeSourcesForSummary was empty
              setAllIncomeSourcesForSummary((prev) => {
                const index = prev.findIndex((s) => String(s._id) === String(updatedIncome._id));
                
                if (matchesFilters) {
                  // Income matches current filters - add or update it
                  if (index !== -1) {
                    // Update existing income source
                    const updated = [...prev];
                    updated[index] = updatedIncome;
                    return updated;
                  } else {
                    // Add new income source
                    return [...prev, updatedIncome];
                  }
                } else {
                  // Income doesn't match current filters - remove it if it exists
                  if (index !== -1) {
                    return prev.filter((s) => String(s._id) !== String(updatedIncome._id));
                  }
                  // If it doesn't exist and doesn't match filters, don't add it
                  return prev;
                }
              });
              
              // CRITICAL: Always refetch summary in background to ensure accuracy
              // This handles edge cases like duplicate keys, server-side updates, etc.
              // The optimistic update above provides immediate feedback, this ensures correctness
              // Small delay to let server process the update
              setTimeout(() => {
                fetchAllIncomeSourcesForSummary();
              }, 500);
            } else {
              // If no income returned, refetch summary to get latest data
              fetchAllIncomeSourcesForSummary();
            }
          }}
          currentPlan={currentPlan}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmDeleteModal.isOpen}
          onClose={() => {
            // Prevent closing during deletion
            if (!isDeleting) {
              setConfirmDeleteModal({ isOpen: false, income: null });
            }
          }}
          onConfirm={confirmDelete}
          title="Delete Income Source"
          message={
            confirmDeleteModal.income
              ? `Are you sure you want to delete this income source (${formatCurrency(confirmDeleteModal.income.annualIncome)} for tax year ${confirmDeleteModal.income.taxYear}${confirmDeleteModal.income.month ? ` - ${new Date(2000, confirmDeleteModal.income.month - 1).toLocaleString("default", { month: "long" })}` : ""})? This action cannot be undone and will affect your PIT calculations.`
              : "Are you sure you want to delete this income source? This action cannot be undone."
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant={ConfirmModalVariant.Danger}
          isLoading={isDeleting !== null}
        />

        {/* Next Step Navigation */}
        <NextStepCard
          title="Next Step: Record Expenses"
          description="Log your tax-deductible expenses to reduce your taxable income and save on PIT."
          href="/dashboard/expenses"
          actionLabel="Go to Expenses"
        />

        {/* Guide Modal */}
        <IncomeGuideModal 
            isOpen={showGuideModal} 
            onClose={() => setShowGuideModal(false)} 
        />
      </motion.div>
    </RouteGuard>
  );
}
