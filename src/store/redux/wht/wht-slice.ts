import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TransactionType } from "@/lib/utils/transaction-type";
import { RemittanceStatus } from "@/lib/utils/remittance-status";

export interface WHTRecord {
  _id: string;
  payeeName: string;
  payeeTIN?: string;
  paymentAmount: number;
  whtType: string;
  whtRate: number;
  whtAmount: number;
  netAmount: number;
  paymentDate: string;
  month: number;
  year: number;
  description?: string;
  transactionType: TransactionType;
  transactionId?: string; // Reference to source invoice/expense (for navigation)
}

export interface WHTRemittance {
  _id: string;
  remittanceMonth: number;
  remittanceYear: number;
  totalWHTAmount: number;
  remittanceDate?: string;
  remittanceDeadline: string;
  remittanceReference?: string;
  remittanceReceipt?: string;
  status: RemittanceStatus;
}

export interface WHTSummary {
  month: number;
  year: number;
  totalWHTDeducted: number;
  totalWHTRemitted: number;
  totalWHTPending: number;
  whtRecordsCount: number;
  status: RemittanceStatus;
}

export interface WHTFilters {
  year: number;
  month: number | null; // null = all months
}

export interface WHTState {
  summary: WHTSummary | null;
  records: WHTRecord[];
  remittances: WHTRemittance[];
  filters: WHTFilters;
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

const initialState: WHTState = {
  summary: null,
  records: [],
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
const filtersChanged = (oldFilters: WHTFilters, newFilters: WHTFilters): boolean => {
  return (
    oldFilters.year !== newFilters.year ||
    oldFilters.month !== newFilters.month
  );
};

const whtSlice = createSlice({
  name: "wht",
  initialState,
  reducers: {
    // Set WHT data (replace existing)
    setWHTData(
      state,
      action: PayloadAction<{
        summary: WHTSummary | null;
        records: WHTRecord[];
        remittances: WHTRemittance[];
        filters: WHTFilters;
        companyId: string;
      }>
    ) {
      state.summary = action.payload.summary;
      state.records = action.payload.records;
      state.remittances = action.payload.remittances;
      state.filters = action.payload.filters;
      state.companyId = action.payload.companyId;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    // Set WHT summary only
    setWHTSummary(
      state,
      action: PayloadAction<{
        summary: WHTSummary | null;
        filters: WHTFilters;
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

    // Set WHT records only
    setWHTRecords(
      state,
      action: PayloadAction<{
        records: WHTRecord[];
        filters: WHTFilters;
        companyId: string;
      }>
    ) {
      state.records = action.payload.records;
      state.filters = action.payload.filters;
      state.companyId = action.payload.companyId;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    // Set WHT remittances only
    setWHTRemittances(
      state,
      action: PayloadAction<{
        remittances: WHTRemittance[];
        companyId: string;
      }>
    ) {
      state.remittances = action.payload.remittances;
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

    // Clear all WHT data
    clearWHT(state) {
      state.summary = null;
      state.records = [];
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
    setFilters(state, action: PayloadAction<WHTFilters>) {
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
        state.records = [];
        state.remittances = [];
        state.lastFetch = null;
      }
    },
  },
});

export const whtActions = whtSlice.actions;
export default whtSlice;




