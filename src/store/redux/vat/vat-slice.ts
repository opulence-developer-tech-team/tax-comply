import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface VATSummary {
  month: number;
  year: number;
  inputVAT: number;
  outputVAT: number;
  netVAT: number;
  status: string;
  annualTurnover?: number;
  isVATExempt?: boolean;
}

export interface VATRemittance {
  _id: string;
  companyId?: string;
  businessId?: string;
  month: number;
  year: number;
  remittanceAmount: number;
  remittanceDate: string;
  remittanceReference: string;
  remittanceReceipt?: string;
  status: string;
}

export interface VATFilters {
  year: number;
  month: number | null; // null = yearly aggregation
}

export interface VATState {
  summary: VATSummary | null;
  remittances: VATRemittance[];
  filters: VATFilters;
  companyId: string | null;
  // Cache flags to prevent unnecessary refetches
  hasFetched: boolean;
  // Loading states
  isLoading: boolean;
  // Error states
  error: string | null;
  // Last fetch timestamp for cache invalidation
  lastFetch: number | null;
}

const initialState: VATState = {
  summary: null,
  remittances: [],
  filters: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  },
  companyId: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

// Helper function to check if filters have changed
const filtersChanged = (oldFilters: VATFilters, newFilters: VATFilters): boolean => {
  return (
    oldFilters.year !== newFilters.year ||
    oldFilters.month !== newFilters.month
  );
};

const vatSlice = createSlice({
  name: "vat",
  initialState,
  reducers: {
    // Set VAT summary (replace existing)
    setVATSummary(
      state,
      action: PayloadAction<{
        summary: VATSummary | null;
        filters: VATFilters;
        companyId: string;
      }>
    ) {
      state.summary = action.payload.summary;
      state.filters = action.payload.filters;
      state.companyId = action.payload.companyId;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
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

    // Clear all VAT data
    clearVAT(state) {
      state.summary = null;
      state.remittances = [];
      state.hasFetched = false;
      state.error = null;
      state.lastFetch = null;
      state.companyId = null;
    },

    // Invalidate cache (force refetch on next load)
    invalidateCache(state) {
      state.hasFetched = false;
      state.lastFetch = null;
    },

    // Set filters (without fetching)
    setFilters(state, action: PayloadAction<VATFilters>) {
      // Check if filters changed before updating
      const filtersDidChange = filtersChanged(state.filters, action.payload);
      state.filters = action.payload;
      // If filters changed, mark as not fetched to trigger refetch
      if (filtersDidChange) {
        state.hasFetched = false;
      }
    },

    // Set company ID
    setCompanyId(state, action: PayloadAction<string | null>) {
      // If company ID changed, clear cache
      if (state.companyId !== action.payload) {
        state.companyId = action.payload;
        state.hasFetched = false;
        state.summary = null;
        state.remittances = [];
        state.lastFetch = null;
      }
    },

    // Set VAT remittances
    setVATRemittances(
      state,
      action: PayloadAction<{
        remittances: VATRemittance[];
        companyId: string;
      }>
    ) {
      state.remittances = action.payload.remittances;
      state.companyId = action.payload.companyId;
    },
  },
});

export const vatActions = vatSlice.actions;
export default vatSlice;

