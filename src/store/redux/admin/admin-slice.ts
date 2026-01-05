import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AdminUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: "admin";
}

export interface AdminDashboardData {
  totalUsers: number;
  totalCompanies: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  users: any[];
  companies: any[];
  subscriptions: any[];
}

export interface AdminState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  dashboard: AdminDashboardData | null;
  // Cache flags to prevent unnecessary refetches
  hasFetched: boolean;
  hasFetchedDashboard: boolean;
  // Loading states
  isLoading: boolean;
  isLoadingDashboard: boolean;
  // Error states
  error: string | null;
  dashboardError: string | null;
  // Last fetch timestamp for cache invalidation
  lastFetch: number | null;
  lastDashboardFetch: number | null;
}

const initialState: AdminState = {
  user: null,
  isAuthenticated: false,
  dashboard: null,
  hasFetched: false,
  hasFetchedDashboard: false,
  isLoading: false,
  isLoadingDashboard: false,
  error: null,
  dashboardError: null,
  lastFetch: null,
  lastDashboardFetch: null,
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    // Set admin user data (called after successful login)
    setAdminUser(state, action: PayloadAction<AdminUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
    },

    // Set dashboard data
    setDashboardData(state, action: PayloadAction<AdminDashboardData>) {
      state.dashboard = action.payload;
      state.hasFetchedDashboard = true;
      state.isLoadingDashboard = false;
      state.dashboardError = null;
      state.lastDashboardFetch = Date.now();
    },

    // Set loading state
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    // Set dashboard loading state
    setDashboardLoading(state, action: PayloadAction<boolean>) {
      state.isLoadingDashboard = action.payload;
      if (action.payload) {
        state.dashboardError = null;
      }
    },

    // Set error state
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Set dashboard error state
    setDashboardError(state, action: PayloadAction<string | null>) {
      state.dashboardError = action.payload;
      state.isLoadingDashboard = false;
    },

    // Clear admin data (logout)
    clearAdmin(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.dashboard = null;
      state.hasFetched = false;
      state.hasFetchedDashboard = false;
      state.isLoadingDashboard = false;
      state.error = null;
      state.dashboardError = null;
      state.lastFetch = null;
      state.lastDashboardFetch = null;
    },

    // Invalidate cache (force refetch on next load)
    invalidateCache(state) {
      state.hasFetchedDashboard = false;
      state.lastDashboardFetch = null;
    },
  },
});

export const adminActions = adminSlice.actions;
export default adminSlice;












