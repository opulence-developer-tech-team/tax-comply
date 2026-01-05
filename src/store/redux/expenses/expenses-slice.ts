import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AccountType } from "@/lib/utils/account-type";
import { ExpenseSortField, SortOrder, FilterAll } from "@/lib/utils/client-enums";

export interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  month: number; // Month of expense (1-12)
  year: number; // Year of expense (2026+)
  isTaxDeductible: boolean;
  vatAmount?: number;
  // WHT (Withholding Tax) fields - for company expenses with WHT deducted
  whtDeducted?: boolean; // Whether WHT was deducted from this expense
  whtType?: string; // Type of WHT (determines rate)
  whtAmount?: number; // WHT amount deducted (if applicable)
  // Supplier/Vendor information (REQUIRED for WHT compliance per NRS)
  supplierName?: string; // Name of supplier/vendor who received payment
  supplierTIN?: string; // TIN of supplier/vendor (required for WHT compliance)
  supplierType?: AccountType; // Type of supplier (required when WHT deducted)
  accountId?: string;
  accountType?: AccountType;
  // Non-Resident status (for WHT rate determination - 10% vs 5%)
  isNonResident?: boolean;
}

export interface ExpenseSummary {
  totalExpenses: number;
  taxDeductibleExpenses: number;
  taxableIncome: number;
  taxSavings: number | null;
  month: number;
  year: number;
  requiresIncome: boolean;
  incomeRequiredFor: {
    entityId: string;
    entityType: AccountType;
    taxYear: number;
  } | null;
  // Breakdown values for display (only present if income is available)
  annualIncome?: number;
  annualTaxExemption?: number; // Tax exemption threshold (e.g., ₦800,000 for 2026+)
  taxableIncomeAmount?: number; // Income amount after exemption
  taxOnIncome?: number;
  taxOnReducedIncome?: number;
}


export interface ExpenseFilters {
  category: FilterAll | string;
  year: number; // CRITICAL: Year is always required - no "all" option
  month: number | FilterAll;
  search: string;
  page: number;
  itemsPerPage: number;
  sortField: ExpenseSortField;
  sortOrder: SortOrder;
}

export interface ExpensesState {
  expenses: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: ExpenseFilters;
  summary: ExpenseSummary | null;
  yearlySummary: ExpenseSummary | null;
  summaryFilters: {
    month: number;
    year: number;
  };
  yearlySummaryFilters: {
    year: number;
  };
  accountId: string | null;
  accountType: AccountType;
  // Cache flags to prevent unnecessary refetches
  hasFetched: boolean;
  hasFetchedSummary: boolean;
  hasFetchedYearlySummary: boolean;
  // Loading states
  isLoading: boolean;
  isLoadingSummary: boolean;
  isLoadingYearlySummary: boolean;
  // Error states
  error: string | null;
  summaryError: string | null;
  yearlySummaryError: string | null;
  // Last fetch timestamps for cache invalidation
  lastFetch: number | null;
  lastSummaryFetch: number | null;
  lastYearlySummaryFetch: number | null;
}

const initialState: ExpensesState = {
  expenses: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  filters: {
    category: FilterAll.All,
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    // Year is always required - default to current year or 2026 minimum
    year: Math.max(2026, new Date().getFullYear()),
    month: FilterAll.All,
    search: "",
    page: 1,
    itemsPerPage: 10,
    sortField: ExpenseSortField.Date,
    sortOrder: SortOrder.Desc,
  },
  summary: null,
  yearlySummary: null,
  summaryFilters: {
    month: new Date().getMonth() + 1,
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    // Enforce minimum year 2026 (when Nigeria Tax Act 2025 takes effect)
    year: Math.max(2026, new Date().getFullYear()),
  },
  yearlySummaryFilters: {
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    // Enforce minimum year 2026 (when Nigeria Tax Act 2025 takes effect)
    year: Math.max(2026, new Date().getFullYear()),
  },
  accountId: null,
  accountType: AccountType.Company,
  hasFetched: false,
  hasFetchedSummary: false,
  hasFetchedYearlySummary: false,
  isLoading: false,
  isLoadingSummary: false,
  isLoadingYearlySummary: false,
  error: null,
  summaryError: null,
  yearlySummaryError: null,
  lastFetch: null,
  lastSummaryFetch: null,
  lastYearlySummaryFetch: null,
};

// Helper function to check if filters have changed
const filtersChanged = (oldFilters: ExpenseFilters, newFilters: ExpenseFilters): boolean => {
  return (
    oldFilters.category !== newFilters.category ||
    oldFilters.year !== newFilters.year ||
    oldFilters.month !== newFilters.month ||
    oldFilters.search !== newFilters.search ||
    oldFilters.page !== newFilters.page ||
    oldFilters.itemsPerPage !== newFilters.itemsPerPage ||
    oldFilters.sortField !== newFilters.sortField ||
    oldFilters.sortOrder !== newFilters.sortOrder
  );
};

const expensesSlice = createSlice({
  name: "expenses",
  initialState,
  reducers: {
    // Set account information
    setAccount(
      state,
      action: PayloadAction<{ accountId: string; accountType: AccountType }>
    ) {
      // Only reset if account actually changed
      if (state.accountId === action.payload.accountId && state.accountType === action.payload.accountType) {
        return; // No change, skip reset
      }
      
      state.accountId = action.payload.accountId;
      state.accountType = action.payload.accountType;
      // Reset cache when account changes
      state.hasFetched = false;
      state.hasFetchedSummary = false;
      state.expenses = [];
      state.summary = null;
      state.lastFetch = null;
      state.lastSummaryFetch = null;
      // Reset pagination when account changes
      state.pagination = {
        page: 1,
        limit: state.filters.itemsPerPage,
        total: 0,
        pages: 0,
      };
    },

    // Set expenses (replace existing) - with pagination
    setExpenses(
      state,
      action: PayloadAction<{
        expenses: Expense[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>
    ) {
      state.expenses = action.payload.expenses;
      state.pagination = action.payload.pagination;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    // Update filters - reset cache when filters change (except page)
    setFilters(state, action: PayloadAction<Partial<ExpenseFilters>>) {
      const newFilters = { ...state.filters, ...action.payload };
      const filtersDidChange = filtersChanged(state.filters, newFilters);
      
      state.filters = newFilters;
      
      // Reset cache if filters changed (but not if only page changed)
      if (filtersDidChange) {
        state.hasFetched = false;
        state.lastFetch = null;
        
        // Only clear expenses if it's not just a page change
        const isPageOnlyChange = action.payload.page !== undefined && 
                                 Object.keys(action.payload).length === 1;
        
        if (!isPageOnlyChange) {
          // When filters change (not just page), DON'T clear expenses immediately
          // This ensures proper tab behavior - expenses persist when switching tabs
          // Expenses will be replaced when setExpenses is called with new data
          // Only update pagination page/limit, keep existing expenses visible
          state.pagination.page = newFilters.page;
          state.pagination.limit = newFilters.itemsPerPage;
        }
      }
    },

    // Set page - invalidate cache to fetch new page
    setPage(state, action: PayloadAction<number>) {
      state.filters.page = action.payload;
      // Invalidate cache to fetch new page data
      state.hasFetched = false;
    },

    // Set summary filters (separate from list filters)
    setSummaryFilters(
      state,
      action: PayloadAction<{ month: number; year: number }>
    ) {
      const monthChanged = state.summaryFilters.month !== action.payload.month;
      const yearChanged = state.summaryFilters.year !== action.payload.year;
      
      state.summaryFilters = action.payload;
      
      // Reset cache if date filter changed
      if (monthChanged || yearChanged) {
        state.hasFetchedSummary = false;
        state.summary = null;
        state.lastSummaryFetch = null;
      }
    },


    // Add a new expense
    addExpense(state, action: PayloadAction<Expense>) {
      state.expenses.push(action.payload);
      // Update summary if it exists (optimistic update)
      if (state.summary) {
        state.summary.totalExpenses += action.payload.amount;
        if (action.payload.isTaxDeductible) {
          state.summary.taxDeductibleExpenses += action.payload.amount;
        }
      }
    },

    // Update an existing expense
    updateExpense(
      state,
      action: PayloadAction<{ _id: string; updated: Partial<Expense> }>
    ) {
      const index = state.expenses.findIndex(
        (e) => e._id === action.payload._id
      );

      if (index !== -1) {
        const oldExpense = state.expenses[index];
        state.expenses[index] = {
          ...state.expenses[index],
          ...action.payload.updated,
        };
        
        // Update summary if it exists
        if (state.summary) {
          const newExpense = state.expenses[index];
          // Remove old values
          state.summary.totalExpenses -= oldExpense.amount;
          if (oldExpense.isTaxDeductible) {
            state.summary.taxDeductibleExpenses -= oldExpense.amount;
          }
          // Add new values
          state.summary.totalExpenses += newExpense.amount;
          if (newExpense.isTaxDeductible) {
            state.summary.taxDeductibleExpenses += newExpense.amount;
          }
        }
      }
    },

    // Remove an expense
    removeExpense(state, action: PayloadAction<string>) {
      const index = state.expenses.findIndex((e) => e._id === action.payload);
      
      if (index !== -1) {
        const expense = state.expenses[index];
        state.expenses = state.expenses.filter((e) => e._id !== action.payload);
        
        // Update pagination total
        if (state.pagination.total > 0) {
          state.pagination.total -= 1;
        }
        
        // Update summary if it exists
        if (state.summary) {
          state.summary.totalExpenses -= expense.amount;
          if (expense.isTaxDeductible) {
            state.summary.taxDeductibleExpenses -= expense.amount;
          }
        }
      }
    },

    // Set summary (monthly)
    setSummary(state, action: PayloadAction<ExpenseSummary>) {
      state.summary = action.payload;
      state.hasFetchedSummary = true;
      state.isLoadingSummary = false;
      state.summaryError = null;
      state.lastSummaryFetch = Date.now();
    },

    // Set yearly summary
    setYearlySummary(state, action: PayloadAction<ExpenseSummary>) {
      state.yearlySummary = action.payload;
      state.hasFetchedYearlySummary = true;
      state.isLoadingYearlySummary = false;
      state.yearlySummaryError = null;
      state.lastYearlySummaryFetch = Date.now();
    },

    // Set yearly summary filters
    setYearlySummaryFilters(
      state,
      action: PayloadAction<{ year: number }>
    ) {
      const yearChanged = state.yearlySummaryFilters.year !== action.payload.year;
      state.yearlySummaryFilters = action.payload;
      
      // Reset cache if filters changed
      if (yearChanged) {
        state.hasFetchedYearlySummary = false;
        state.lastYearlySummaryFetch = null;
      }
    },

    // Set loading states
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    setLoadingSummary(state, action: PayloadAction<boolean>) {
      state.isLoadingSummary = action.payload;
      if (action.payload) {
        state.summaryError = null;
      }
    },

    setLoadingYearlySummary(state, action: PayloadAction<boolean>) {
      state.isLoadingYearlySummary = action.payload;
      if (action.payload) {
        state.yearlySummaryError = null;
      }
    },

    // Set error states
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },

    setSummaryError(state, action: PayloadAction<string | null>) {
      state.summaryError = action.payload;
      state.isLoadingSummary = false;
    },

    setYearlySummaryError(state, action: PayloadAction<string | null>) {
      state.yearlySummaryError = action.payload;
      state.isLoadingYearlySummary = false;
    },

    // Clear all expenses data
    clearExpenses(state) {
      state.expenses = [];
      state.summary = null;
      state.yearlySummary = null;
      state.hasFetched = false;
      state.hasFetchedSummary = false;
      state.hasFetchedYearlySummary = false;
      state.error = null;
      state.summaryError = null;
      state.yearlySummaryError = null;
      state.lastFetch = null;
      state.lastSummaryFetch = null;
      state.lastYearlySummaryFetch = null;
    },

    // Invalidate cache (force refetch on next load)
    invalidateCache(state) {
      state.hasFetched = false;
      state.hasFetchedSummary = false;
      state.lastFetch = null;
      state.lastSummaryFetch = null;
    },
  },
});

export const expensesActions = expensesSlice.actions;
export default expensesSlice;

