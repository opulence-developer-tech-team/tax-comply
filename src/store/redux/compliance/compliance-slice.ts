import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ComplianceStatus as ComplianceStatusEnum } from "@/lib/utils/compliance-status";
import { AlertSeverity } from "@/lib/utils/alert-severity";

export interface ComplianceAlert {
  type: string;
  severity: AlertSeverity;
  message: string;
  actionRequired: string;
}

export interface ComplianceStatus {
  status: ComplianceStatusEnum;
  score: number;
  alerts: ComplianceAlert[];
  lastChecked: Date | string;
}

export interface TaxDeadline {
  name: string;
  date: Date | string;
  action: string;
}

export interface ComplianceData {
  complianceStatus: ComplianceStatus;
  taxDeadlines: TaxDeadline[];
}

export interface ComplianceState {
  data: ComplianceData | null;
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

const initialState: ComplianceState = {
  data: null,
  companyId: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

const complianceSlice = createSlice({
  name: "compliance",
  initialState,
  reducers: {
    // Set compliance data (replace existing)
    setComplianceData(
      state,
      action: PayloadAction<{
        data: ComplianceData;
        companyId: string;
      }>
    ) {
      state.data = action.payload.data;
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

    // Clear all compliance data
    clearCompliance(state) {
      state.data = null;
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

    // Set company ID
    setCompanyId(state, action: PayloadAction<string | null>) {
      // If company ID changed, clear cache
      if (state.companyId !== action.payload) {
        state.companyId = action.payload;
        state.hasFetched = false;
        state.data = null;
        state.lastFetch = null;
      }
    },
  },
});

export const complianceActions = complianceSlice.actions;
export default complianceSlice;













