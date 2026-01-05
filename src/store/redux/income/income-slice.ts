import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IncomeSortField, SortOrder } from "@/lib/utils/client-enums";
import { AccountType } from "@/lib/utils/account-type";

export interface IncomeSource {
  _id: string;
  accountId: string;
  entityType: AccountType;
  taxYear: number;
  month?: number | null;
  annualIncome: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncomeFilters {
  year: number | null; // null = all years, number = specific year (defaults to current year)
  month: number | null; // null = all months/yearly, number = specific month
  search: string; // Debounced search term
  page: number;
  limit: number;
  sortField: IncomeSortField;
  sortOrder: SortOrder;
}

export interface IncomeState {
  incomeSources: IncomeSource[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: IncomeFilters;
  accountId: string | null;
  // Cache flags to prevent unnecessary refetches
  hasFetched: boolean;
  // Loading states
  isLoading: boolean;
  // Error states
  error: string | null;
  // Last fetch timestamp for cache invalidation
  lastFetch: number | null;
}

// CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
// Enforce minimum year 2026 (when Nigeria Tax Act 2025 takes effect)
const getInitialTaxYear = () => {
  const currentYear = new Date().getFullYear();
  return Math.max(2026, currentYear);
};

const initialState: IncomeState = {
  incomeSources: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  filters: {
    year: getInitialTaxYear(), // CRITICAL: Default to 2026 or current year if later (app only supports 2026+)
    month: null,
    search: "",
    page: 1,
    limit: 20,
    sortField: IncomeSortField.TaxYear,
    sortOrder: SortOrder.Desc,
  },
  accountId: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

// Helper function to check if filters have changed
const filtersChanged = (oldFilters: IncomeFilters, newFilters: IncomeFilters): boolean => {
  return (
    oldFilters.year !== newFilters.year ||
    oldFilters.month !== newFilters.month ||
    oldFilters.search !== newFilters.search ||
    oldFilters.page !== newFilters.page ||
    oldFilters.limit !== newFilters.limit ||
    oldFilters.sortField !== newFilters.sortField ||
    oldFilters.sortOrder !== newFilters.sortOrder
  );
};

const incomeSlice = createSlice({
  name: "income",
  initialState,
  reducers: {
    // Set income sources with pagination
    setIncomeSources(
      state,
      action: PayloadAction<{
        incomeSources: IncomeSource[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
        accountId: string;
      }>
    ) {
      state.incomeSources = action.payload.incomeSources;
      state.pagination = action.payload.pagination;
      state.accountId = action.payload.accountId;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    // Add a single income source (for optimistic updates)
    addIncomeSource(state, action: PayloadAction<IncomeSource>) {
      // Check if it already exists (by _id)
      const exists = state.incomeSources.some(
        (source) => source._id === action.payload._id
      );
      if (!exists) {
        state.incomeSources.push(action.payload);
        // Sort by taxYear descending, then by month if applicable
        state.incomeSources.sort((a, b) => {
          if (a.taxYear !== b.taxYear) {
            return b.taxYear - a.taxYear;
          }
          const aMonth = a.month || 0;
          const bMonth = b.month || 0;
          return bMonth - aMonth;
        });
      }
    },

    // Update a single income source
    updateIncomeSource(state, action: PayloadAction<IncomeSource>) {
      const index = state.incomeSources.findIndex(
        (source) => source._id === action.payload._id
      );
      if (index !== -1) {
        state.incomeSources[index] = action.payload;
        // Re-sort after update
        state.incomeSources.sort((a, b) => {
          if (a.taxYear !== b.taxYear) {
            return b.taxYear - a.taxYear;
          }
          const aMonth = a.month || 0;
          const bMonth = b.month || 0;
          return bMonth - aMonth;
        });
      }
    },

    // Remove a single income source
    removeIncomeSource(state, action: PayloadAction<string>) {
      const index = state.incomeSources.findIndex(
        (source) => source._id === action.payload
      );
      
      if (index !== -1) {
        // Remove from list
        state.incomeSources = state.incomeSources.filter(
          (source) => source._id !== action.payload
        );
        
        // Update pagination total optimistically
        if (state.pagination.total > 0) {
          state.pagination.total -= 1;
        }
        
        // Recalculate pages
        state.pagination.pages = Math.ceil(state.pagination.total / state.pagination.limit) || 1;
      }
    },

    // Set loading state
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    // Set error state
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Clear all income data
    clearIncome(state) {
      state.incomeSources = [];
      state.pagination = {
        page: 1,
        limit: state.filters.limit,
        total: 0,
        pages: 0,
      };
      state.hasFetched = false;
      state.error = null;
      state.lastFetch = null;
      state.accountId = null;
    },

    // Invalidate cache (force refetch on next load)
    invalidateCache(state) {
      state.hasFetched = false;
      state.lastFetch = null;
    },

    // Set account ID (clears cache if changed)
    setAccountId(state, action: PayloadAction<string | null>) {
      // If account ID changed, clear cache and data
      if (state.accountId !== action.payload) {
        state.accountId = action.payload;
        state.hasFetched = false;
        state.incomeSources = [];
        state.pagination = {
          page: 1,
          limit: state.filters.limit,
          total: 0,
          pages: 0,
        };
        state.lastFetch = null;
      }
    },

    // Set filters (invalidates cache if filters changed)
    setFilters(state, action: PayloadAction<Partial<IncomeFilters>>) {
      const newFilters = { ...state.filters, ...action.payload };
      const filtersDidChange = filtersChanged(state.filters, newFilters);
      state.filters = newFilters;
      
      // If filters changed, mark as not fetched to trigger refetch
      if (filtersDidChange) {
        state.hasFetched = false;
      }
    },

    // Reset filters to defaults
    resetFilters(state) {
      state.filters = {
        year: getInitialTaxYear(), // CRITICAL: Default to 2026 or current year if later (app only supports 2026+)
        month: null,
        search: "",
        page: 1,
        limit: 20,
        sortField: IncomeSortField.TaxYear,
        sortOrder: SortOrder.Desc,
      };
      state.hasFetched = false;
    },
  },
});

export const incomeActions = incomeSlice.actions;
export default incomeSlice;

