"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useHttp } from "@/hooks/useHttp";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { expensesActions } from "@/store/redux/expenses/expenses-slice";
import { ExpenseSortField, SortOrder, LoadingStateSize, ConfirmModalVariant, FilterAll } from "@/lib/utils/client-enums";
import { pitActions } from "@/store/redux/pit/pit-slice";
import { citActions } from "@/store/redux/cit/cit-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { createErrorStateProps } from "@/components/shared/errorUtils";
import { ExpensesHeader } from "@/components/dashboard/expenses/ExpensesHeader";
import { ExpenseTabs } from "@/components/dashboard/expenses/ExpenseTabs";
import { ExpenseTabContent } from "@/components/dashboard/expenses/ExpenseTabContent";
import { ExpenseFilters, ExpenseSortOrder } from "@/components/dashboard/expenses/ExpenseFilters";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { RefreshCw, AlertCircle } from "lucide-react";
import { HttpMethod } from "@/lib/utils/http-method";
import { AccountType } from "@/lib/utils/account-type";
import { ExpenseTabType } from "@/lib/utils/client-enums";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";
import { toast } from "sonner";

interface ExpensesContentProps {
  accountId: string;
  accountType: AccountType;
  currentPlan: SubscriptionPlan;
}

export function ExpensesContent({ accountId: accountIdProp, accountType: accountTypeProp, currentPlan: currentPlanProp }: ExpensesContentProps) {
  const dispatch = useAppDispatch();
  
  // CRITICAL: Validate props - fail loudly if missing
  if (!accountIdProp) {
    throw new Error("ExpensesContent: accountId prop is required.");
  }
  if (!accountTypeProp) {
    throw new Error("ExpensesContent: accountType prop is required.");
  }
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(accountTypeProp)) {
    throw new Error(`ExpensesContent: Invalid accountType "${accountTypeProp}". Valid values are: ${validAccountTypes.join(", ")}.`);
  }
  if (!currentPlanProp) {
    throw new Error("ExpensesContent: currentPlan prop is required.");
  }
  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentPlanProp)) {
    throw new Error(`ExpensesContent: Invalid currentPlan "${currentPlanProp}". Valid values are: ${validPlans.join(", ")}.`);
  }

  const accountId = accountIdProp;
  const accountType = accountTypeProp;
  const currentPlan = currentPlanProp;
  
  // Redux state
  const {
    expenses,
    pagination,
    filters,
    summaryFilters,
    yearlySummaryFilters,
    accountId: reduxAccountId,
    accountType: reduxAccountType,
    hasFetched,
    isLoading,
    error,
  } = useAppSelector((state) => state.expenses);

  // HTTP hooks for API calls (must be at top level, not inside callbacks)
  const { isLoading: isDeleting, sendHttpRequest: deleteExpenseReq } = useHttp();
  const { sendHttpRequest: fetchExpensesReq } = useHttp();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    expenseId: string | null;
  }>({
    isOpen: false,
    expenseId: null,
  });
  
  // Tab state
  const [activeTab, setActiveTab] = useState<ExpenseTabType>(ExpenseTabType.Expenses);
  
  // Search and sorting state (local for debouncing)
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [sortField, setSortField] = useState<ExpenseSortField>(filters.sortField);
  const [sortOrder, setSortOrder] = useState<ExpenseSortOrder>(filters.sortOrder);
  
  // Debounce search term to avoid excessive API calls (500ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const hasExportAccess = SUBSCRIPTION_PRICING[currentPlan]?.features?.exports === true;

  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();

  // Export state
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  // Set account in Redux when props change
  useEffect(() => {
    if (accountId && accountId !== reduxAccountId) {
      dispatch(
        expensesActions.setAccount({
          accountId: accountId,
          accountType: accountType,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, accountType]);

  // Sync local search term with Redux filters when debounced
  useEffect(() => {
    if (debouncedSearchTerm !== filters.search) {
      dispatch(expensesActions.setFilters({ search: debouncedSearchTerm, page: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  // Sync local sort state with Redux filters
  useEffect(() => {
    if (sortField !== filters.sortField || sortOrder !== filters.sortOrder) {
      dispatch(expensesActions.setFilters({ sortField, sortOrder }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField, sortOrder]);

  // Show searching indicator while debouncing
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  // Fetch expenses ONLY when "expenses" tab is active
  // Company is already fetched in DashboardLayout, so no need to check isLoadingCompany
  useEffect(() => {
    // Only fetch when expenses tab is active
    if (activeTab !== ExpenseTabType.Expenses) return;
    
    // Don't fetch if already loading or if we don't have a accountId yet
    if (isLoading || !accountId) return;
    
    // Fetch if data hasn't been fetched for current filters
    // (hasFetched is false when filters change, so this will trigger a refetch)
    if (!hasFetched) {
      fetchExpenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, accountId, filters.category, filters.year, filters.month, filters.search, filters.page, filters.itemsPerPage, filters.sortField, filters.sortOrder, hasFetched, isLoading]);

  // Summary fetching removed - only PDF export functionality remains

  // Companies are already fetched in DashboardLayout - no need to fetch here

  const fetchExpenses = useCallback(() => {
    // CRITICAL: Validate accountId and accountType - fail loudly if missing
    // accountId and accountType are validated at component level as props
    if (!accountId) {
      throw new Error(
        "ExpensesContent.fetchExpenses: accountId is required. " +
        "This should be validated at component level before calling fetchExpenses."
      );
    }

    if (!accountType) {
      throw new Error(
        "ExpensesContent.fetchExpenses: accountType is required. " +
        "This should be validated at component level before calling fetchExpenses."
      );
    }

    // CRITICAL: Validate accountType is a valid enum value
    const validAccountTypes = Object.values(AccountType);
    if (!validAccountTypes.includes(accountType)) {
      throw new Error(
        `ExpensesContent.fetchExpenses: Invalid accountType "${accountType}". ` +
        `Valid values are: ${validAccountTypes.join(", ")}. ` +
        "Use AccountType enum, not string literals."
      );
    }

    // Set loading state immediately to show UI feedback
    dispatch(expensesActions.setLoading(true));
    dispatch(expensesActions.setError(null));

    // Build query params similar to invoices page
    const params = new URLSearchParams({
      accountId: accountId,
      accountType: accountType,
      page: filters.page.toString(),
      limit: filters.itemsPerPage.toString(),
    });

    if (filters.category !== FilterAll.All) {
      params.append("category", filters.category);
    }
    // Year is always required - no "all" option
    if (filters.year) {
      params.append("year", filters.year.toString());
    }
    if (filters.month !== FilterAll.All) {
      params.append("month", filters.month.toString());
    }
    if (filters.search.trim()) {
      params.append("search", filters.search.trim());
    }
    
    // Server-side sorting
    if (filters.sortField) {
      params.append("sortField", filters.sortField);
      params.append("sortOrder", filters.sortOrder);
    }

    fetchExpensesReq({
      successRes: (response: any) => {
        const data = response?.data?.data;
        const expensesData = data?.expenses || [];
        const paginationData = data?.pagination || {
          page: filters.page,
          limit: filters.itemsPerPage,
          total: 0,
          pages: 0,
        };
        
        // Server-side filtering means we get already sorted/filtered data
        dispatch(expensesActions.setExpenses({
          expenses: expensesData,
          pagination: paginationData,
        }));
      },
      errorRes: (errorResponse: any) => {
        dispatch(
          expensesActions.setError(
            errorResponse?.data?.description || "Failed to load expenses"
          )
        );
        return true;
      },
      requestConfig: {
        url: `/expenses?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [accountId, accountType, filters, dispatch, fetchExpensesReq, isLoading]);

  // Summary fetching removed - PDF generation fetches data server-side internally

  const handleCreateClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    // Refetch expenses after successful create
    dispatch(expensesActions.invalidateCache());
    // CRITICAL: accountId is validated at component level, so it must exist here
    fetchExpenses();
  };

  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  const minTaxYear = 2026;

  /**
   * Handles exporting expense report as PDF
   * CRITICAL: This function should only be called when accountId and accountType are validated
   */
  const handleExportExpensePDF = async (year: number, month?: number) => {
    // CRITICAL: Validate inputs - fail loudly if invalid
    // accountId and accountType are validated at component level as props
    if (!accountId) {
      throw new Error(
        "ExpensesContent.handleExportExpensePDF: accountId is required. " +
        "This should be validated at component level before calling this function."
      );
    }
    if (!accountType) {
      throw new Error(
        "ExpensesContent.handleExportExpensePDF: accountType is required. " +
        "This should be validated at component level before calling this function."
      );
    }

    // CRITICAL: Validate accountType is a valid enum value
    const validAccountTypes = Object.values(AccountType);
    if (!validAccountTypes.includes(accountType)) {
      throw new Error(
        `ExpensesContent.handleExportExpensePDF: Invalid accountType "${accountType}". ` +
        `Valid values are: ${validAccountTypes.join(", ")}. ` +
        "Use AccountType enum, not string literals."
      );
    }
    if (year === undefined || year === null || isNaN(year) || !isFinite(year)) {
      toast.error("Export Failed", {
        description: "Invalid year specified.",
      });
      return;
    }
    if (year < minTaxYear || year > 2100) {
      toast.error("Invalid Tax Year", {
        description: `This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
      });
      return;
    }
    if (month !== undefined && month !== null) {
      if (isNaN(month) || !isFinite(month) || month < 1 || month > 12) {
        toast.error("Export Failed", {
          description: "Invalid month. Must be between 1 and 12.",
        });
        return;
      }
    }

    // Check if user has export access (Free plan doesn't have exports)
    if (!hasExportAccess) {
      showUpgradePrompt({
        feature: "Expense Report Downloads",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "starter",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
        message: "Expense report downloads are available on Starter plan (₦3,500/month) and above. Upgrade to download professional expense reports.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }

    const exportKey = month !== undefined && month !== null ? `expense-${year}-${month}` : `expense-${year}-yearly`;
    if (exportingKey === exportKey) {
      return; // Already exporting
    }
    setExportingKey(exportKey);

    try {
      // Build URL with query parameters
      const params = new URLSearchParams({
        accountId: accountId,
        accountType: accountType,
        year: year.toString(),
      });
      if (month !== undefined && month !== null) {
        params.append("month", month.toString());
      }

      const url = `/api/v1/expenses/export?${params.toString()}`;
      const response = await fetch(url, {
        method: HttpMethod.GET,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Check if this is an upgrade-required error
        if (response.status === 403 && errorData?.data?.upgradeRequired) {
          const upgradeData = errorData.data.upgradeRequired;
          showUpgradePrompt({
            feature: upgradeData.feature || "Expense Report Downloads",
            currentPlan: upgradeData.currentPlan,
            requiredPlan: upgradeData.requiredPlan,
            requiredPlanPrice: upgradeData.requiredPlanPrice,
            message: errorData.description || "Expense report downloads are available on Starter plan (₦3,500/month) and above. Upgrade to download professional expense reports.",
            reason: upgradeData.reason,
          });
          setExportingKey(null);
          return;
        }

        throw new Error(errorData.description || "Failed to generate expense report");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "expense-report.pdf";
      if (contentDisposition) {
        const quotedMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (quotedMatch) {
          filename = quotedMatch[1];
        } else {
          const unquotedMatch = contentDisposition.match(/filename=([^;]+)/);
          if (unquotedMatch) {
            filename = unquotedMatch[1].trim();
          }
        }
        if (!filename.endsWith(".pdf")) {
          filename = filename.replace(/\.[^.]*$/, "") + ".pdf";
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Report Generated", {
        description: "Your expense report has been downloaded successfully.",
      });

      setExportingKey(null);
    } catch (error: any) {
      console.error("Error generating expense report:", error);
      toast.error("Generation Failed", {
        description: error.message || "Failed to generate expense report. Please try again.",
      });
      setExportingKey(null);
    }
  };

  // Filter handlers
  const handleCategoryFilterChange = (category: string) => {
    dispatch(expensesActions.setFilters({ category, page: 1 }));
  };


  const handleYearFilterChange = (year: number) => {
    dispatch(expensesActions.setFilters({ year, page: 1 }));
  };

  const handleMonthFilterChange = (month: number | FilterAll) => {
    dispatch(expensesActions.setFilters({ month, page: 1 }));
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    dispatch(expensesActions.setFilters({ itemsPerPage: newItemsPerPage, page: 1 }));
  };

  const handleClearFilters = () => {
    // Clear all filters and reset to defaults
    // CRITICAL: Year is always required - default to current year or 2026 minimum
    const defaultYear = Math.max(2026, new Date().getFullYear());
    dispatch(expensesActions.setFilters({
      category: FilterAll.All,
      year: defaultYear,
      month: FilterAll.All,
      search: "",
      page: 1,
      itemsPerPage: filters.itemsPerPage, // Keep current items per page
      sortField: filters.sortField, // Keep current sort
      sortOrder: filters.sortOrder,
    }));
    // Clear search term
    setSearchTerm("");
  };

  const handleSort = (field: ExpenseSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === SortOrder.Asc ? SortOrder.Desc : SortOrder.Asc);
    } else {
      setSortField(field);
      setSortOrder(SortOrder.Desc);
    }
  };

  // Expenses are already sorted server-side, no need for client-side sorting
  // Use expenses directly from Redux (already sorted by backend)

  const handleDelete = (expenseId: string) => {
    setConfirmModal({
      isOpen: true,
      expenseId,
    });
  };

  const confirmDelete = async () => {
    if (!confirmModal.expenseId || isDeleting) return;

    const expenseId = confirmModal.expenseId;

    // CRITICAL: Get expense details from Redux BEFORE deletion to check if it's tax-deductible
    // This matches backend logic: only tax-deductible expenses affect PIT and CIT calculations
    // If expense not found in Redux (e.g., different page), we'll invalidate cache anyway
    // to be safe - backend will handle the actual recalculation correctly
    const expenseToDelete = expenses.find((e) => e._id === expenseId);
    const isTaxDeductible = expenseToDelete?.isTaxDeductible ?? false;
    
    // If expense not in Redux, we can't determine if it's tax-deductible
    // In this case, invalidate cache anyway - backend will recalculate correctly
    // This handles edge cases like expenses on different pages or filtered out
    const shouldInvalidatePIT = accountType === AccountType.Individual && 
      (expenseToDelete ? isTaxDeductible : true); // If not found, invalidate to be safe
    
    // CRITICAL: Invalidate CIT cache if this is a company tax-deductible expense
    // Company tax-deductible expenses reduce taxable profit, affecting CIT calculations
    const shouldInvalidateCIT = accountType === AccountType.Company && 
      (expenseToDelete ? isTaxDeductible : true); // If not found, invalidate to be safe

    // Don't close modal yet - keep it open during deletion
    // Don't do optimistic update - wait for server response

    deleteExpenseReq({
      successRes: () => {
        // Remove from Redux after successful deletion (no refetch needed)
        dispatch(expensesActions.removeExpense(expenseId));
        
        // CRITICAL: Invalidate PIT cache if this was a tax-deductible individual expense
        // This matches backend logic in expense/service.ts line 1281:
        // "if (expense.accountType === "individual" && expense.isTaxDeductible)"
        // Only tax-deductible expenses reduce taxable income (allowable deductions)
        // The backend already triggers PIT summary recalculation, but we need to invalidate frontend cache
        // so the PIT page refetches the updated summary
        if (shouldInvalidatePIT) {
          dispatch(pitActions.invalidateCache());
          console.log("[ExpensesContent] PIT cache invalidated - individual expense deleted", {
            expenseId,
            accountType,
            isTaxDeductible: expenseToDelete ? isTaxDeductible : "unknown (not in Redux)",
            amount: expenseToDelete?.amount,
            expenseFoundInRedux: !!expenseToDelete,
            timestamp: new Date().toISOString(),
          });
        }
        
        // CRITICAL: Invalidate CIT cache if this was a tax-deductible company expense
        // Company tax-deductible expenses reduce taxable profit, affecting CIT calculations
        // The backend already triggers CIT recalculation, but we need to invalidate frontend cache
        // so the CIT page refetches the updated summary
        if (shouldInvalidateCIT) {
          dispatch(citActions.invalidateCache());
          console.log("[ExpensesContent] CIT cache invalidated - company tax-deductible expense deleted", {
            expenseId,
            accountType,
            isTaxDeductible: expenseToDelete ? isTaxDeductible : "unknown (not in Redux)",
            amount: expenseToDelete?.amount,
            expenseYear: expenseToDelete?.year,
            expenseMonth: expenseToDelete?.month,
            expenseFoundInRedux: !!expenseToDelete,
            timestamp: new Date().toISOString(),
          });
        }
        
        // Summary fetching removed - only PDF export functionality remains
        
        // Close modal on success
        setConfirmModal({ isOpen: false, expenseId: null });
      },
      errorRes: (errorResponse: any) => {
        // On error, close modal and show error
        setConfirmModal({ isOpen: false, expenseId: null });
        
        // Refetch expenses to restore correct state on error
        dispatch(expensesActions.invalidateCache());
        fetchExpenses();
        
        // Show error toast
        const errorMessage = errorResponse?.data?.description || "Failed to delete expense. Please try again.";
        // Note: useHttp already shows error toast, but we can add custom handling here if needed
        return true;
      },
      requestConfig: {
        url: `/expenses/${expenseId}`,
        method: HttpMethod.DELETE,
      },
    });
  };

  // Calculate statistics from expenses
  const stats = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum: number, exp) => sum + (exp.amount || 0), 0),
    taxDeductibleAmount: expenses
      .filter((exp) => exp.isTaxDeductible)
      .reduce((sum: number, exp) => sum + (exp.amount || 0), 0),
    estimatedTaxSavings: 0, // Summary data not fetched for display anymore - only PDF generation remains
  };

  // Show loading state until data is fetched for the active tab
  // For expenses tab: show loading if data hasn't been fetched or is currently loading
  // Always show loading when isLoading is true, even if hasFetched is true (for refresh scenarios)
  if (activeTab === ExpenseTabType.Expenses && isLoading) {
    return <LoadingState message="Loading your expenses..." size={LoadingStateSize.Md} />;
  }
  
  // Show loading if we haven't fetched yet
  if (activeTab === ExpenseTabType.Expenses && !hasFetched && !isLoading) {
    return <LoadingState message="Loading your expenses..." size={LoadingStateSize.Md} />;
  }

  // Summary loading state removed - only PDF export functionality remains



  // Show error state if there's a critical error (only for expenses tab)
  if (activeTab === ExpenseTabType.Expenses && error && expenses.length === 0 && !isLoading && hasFetched) {
    const errorProps = createErrorStateProps(error);
    return (
      <ErrorState
        {...errorProps}
        title="Could Not Load Your Expenses"
        primaryAction={{
          label: "Try Again",
          onClick: fetchExpenses,
          icon: RefreshCw,
        }}
      />
    );
  }

  // CRITICAL: Validate accountId and accountType before rendering
  // These are validated as props, so they should always be defined
  if (!accountId) {
    throw new Error(
      "ExpensesContent: accountId prop is required. " +
      "This should be validated at component level."
    );
  }
  if (!accountType) {
    throw new Error(
      "ExpensesContent: accountType prop is required. " +
      "This should be validated at component level."
    );
  }

  return (
    <div className="space-y-8">
      {/* Header always visible */}
      <ExpensesHeader onCreateClick={handleCreateClick} currentYear={filters.year} accountType={accountType} />

      <ExpenseTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Error alerts */}
      {error && expenses.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">Error Loading Expenses</p>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Tab Content - Only this area remounts when switching tabs */}
      <ExpenseTabContent
        activeTab={activeTab}
        expenses={expenses}
        isLoading={isLoading}
        hasFetched={hasFetched}
        isDeleting={isDeleting}
        pagination={pagination}
        filters={filters}
        summaryFilters={summaryFilters}
        yearlySummaryFilters={yearlySummaryFilters}
        accountType={accountType}
        onDelete={handleDelete}
        stats={stats}
        isModalOpen={isModalOpen}
        onModalClose={handleModalClose}
        onModalSuccess={handleModalSuccess}
        searchTerm={searchTerm}
        debouncedSearchTerm={debouncedSearchTerm}
        isSearching={isSearching}
        onSearchChange={setSearchTerm}
        categoryFilter={filters.category}
        yearFilter={filters.year}
        monthFilter={filters.month}
        itemsPerPage={filters.itemsPerPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onCategoryFilterChange={handleCategoryFilterChange}
        onYearFilterChange={handleYearFilterChange}
        onMonthFilterChange={handleMonthFilterChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        onSort={handleSort}
        onClearFilters={handleClearFilters}
        onPageChange={(page) => dispatch(expensesActions.setPage(page))}
        currentPage={filters.page}
        onCreateClick={handleCreateClick}
        accountId={accountId}
        onExportMonthly={(year, month) => handleExportExpensePDF(year, month)}
        onExportYearly={(year) => handleExportExpensePDF(year)}
        isExportingMonthly={exportingKey !== null && exportingKey.startsWith("expense-") && !exportingKey.endsWith("-yearly") && exportingKey.split("-").length >= 3}
        isExportingYearly={exportingKey !== null && exportingKey.endsWith("-yearly")}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => {
          // Prevent closing during deletion
          if (!isDeleting) {
            setConfirmModal({ isOpen: false, expenseId: null });
          }
        }}
        onConfirm={confirmDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone and will affect your tax calculations."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant={ConfirmModalVariant.Danger}
        isLoading={isDeleting}
      />

      {/* Next Step Navigation */}
      <NextStepCard
        title="Next Step: File Your Taxes"
        description="Now that you've tracked your expenses, go to Tax Filing to see how much tax you actually need to pay."
        href={accountType === AccountType.Business ? "/dashboard/business/tax-filing" : "/dashboard/tax-filing"}
        actionLabel="Go to Tax Filing"
      />

      {/* Upgrade Prompt */}
      <UpgradePromptComponent />
    </div>
  );
}
