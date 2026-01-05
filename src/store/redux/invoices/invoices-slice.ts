import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { InvoiceFilterStatus } from "@/lib/utils/invoice-filter-status";
import { FilterAll } from "@/lib/utils/client-enums";

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  issueDate: string;
  dueDate?: string;
  total: number;
  subtotal?: number;
  vatAmount?: number;
  whtType?: string;
  whtRate?: number;
  whtAmount?: number;
  netAmountAfterWHT?: number;
  status: string;
  createdAt?: string;
}

export interface InvoiceFilters {
  status: InvoiceFilterStatus;
  year: number;
  month: number | FilterAll;
  search: string;
  page: number;
  itemsPerPage: number;
}

export interface InvoicesState {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: InvoiceFilters;
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
// Default to 2026 or current year if later - invoices page shows current year invoices by default
// Users can still select past years (2026+) via the year filter dropdown
const getInitialTaxYear = () => {
  const currentYear = new Date().getFullYear();
  return Math.max(2026, currentYear);
};

const initialState: InvoicesState = {
  invoices: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  filters: {
    status: InvoiceFilterStatus.All,
    year: getInitialTaxYear(), // Default to 2026 or current year if later (app only supports 2026+)
    month: FilterAll.All,
    search: "",
    page: 1,
    itemsPerPage: 10,
  },
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

// Helper function to check if filters have changed
const filtersChanged = (oldFilters: InvoiceFilters, newFilters: InvoiceFilters): boolean => {
  return (
    oldFilters.status !== newFilters.status ||
    oldFilters.year !== newFilters.year ||
    oldFilters.month !== newFilters.month ||
    oldFilters.search !== newFilters.search ||
    oldFilters.page !== newFilters.page ||
    oldFilters.itemsPerPage !== newFilters.itemsPerPage
  );
};

const invoicesSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    // Set invoices (replace existing)
    setInvoices(
      state,
      action: PayloadAction<{
        invoices: Invoice[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>
    ) {
      state.invoices = action.payload.invoices;
      state.pagination = action.payload.pagination;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    // Update filters - reset cache when filters change (except page)
    setFilters(state, action: PayloadAction<Partial<InvoiceFilters>>) {
      const newFilters = { ...state.filters, ...action.payload };
      const filtersDidChange = filtersChanged(state.filters, newFilters);
      
      state.filters = newFilters;
      
      // Reset cache if filters changed (but not if only page changed)
      // If page is in the payload, it means we're changing page, so invalidate cache
      // If page is not in payload but other filters changed, also invalidate cache
      if (filtersDidChange) {
        state.hasFetched = false;
        // Only clear invoices if it's not just a page change
        if (!action.payload.page || Object.keys(action.payload).length > 1) {
          state.invoices = [];
          state.pagination = {
            page: newFilters.page,
            limit: newFilters.itemsPerPage,
            total: 0,
            pages: 0,
          };
        }
        state.lastFetch = null;
      }
    },

    // Set page - invalidate cache to fetch new page
    setPage(state, action: PayloadAction<number>) {
      state.filters.page = action.payload;
      // Invalidate cache to fetch new page data
      state.hasFetched = false;
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

    // Clear all invoices data
    clearInvoices(state) {
      state.invoices = [];
      state.pagination = {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      };
      state.hasFetched = false;
      state.error = null;
      state.lastFetch = null;
    },

    // Invalidate cache (force refetch on next load)
    invalidateCache(state) {
      state.hasFetched = false;
      state.lastFetch = null;
    },
  },
});

export const invoicesActions = invoicesSlice.actions;
export default invoicesSlice;











