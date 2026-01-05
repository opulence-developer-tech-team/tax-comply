import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ComplianceStatus as ComplianceStatusEnum } from "@/lib/utils/compliance-status";
import { AlertSeverity } from "@/lib/utils/alert-severity";

export interface ComplianceStatus {
  status: ComplianceStatusEnum;
  score: number;
  alerts: Array<{
    type: string;
    severity: AlertSeverity;
    message: string;
    actionRequired: string;
  }>;
}

export interface DashboardData {
  complianceStatus: ComplianceStatus;
  currentMonthVAT: {
    inputVAT: number;
    outputVAT: number;
    netVAT: number;
    status: string;
  };
  currentMonthPayroll: {
    totalEmployees: number;
    totalPAYE: number;
    totalNetSalary: number;
  };
  totalInvoices: number;
  taxDeadlines: Array<{
    name: string;
    date: Date;
    action: string;
  }>;
}

export interface DashboardState {
  data: DashboardData | null;
  // Cache flags to prevent unnecessary refetches
  hasFetched: boolean;
  // Loading states
  isLoading: boolean;
  // Error states
  error: string | null;
  // Last fetch timestamp for cache invalidation
  lastFetch: number | null;
}

const initialState: DashboardState = {
  data: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    // Set dashboard data (replace existing)
    setDashboardData(state, action: PayloadAction<DashboardData>) {
      state.data = action.payload;
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
      // CRITICAL: Mark as fetched even on error so loading states know fetch attempt completed
      // This prevents infinite loading when errors occur
      state.hasFetched = true;
    },

    // Clear all dashboard data
    clearDashboard(state) {
      state.data = null;
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

export const dashboardActions = dashboardSlice.actions;
export default dashboardSlice;

















