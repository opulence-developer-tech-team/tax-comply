import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PayrollScheduleFilterStatus } from "@/lib/utils/payroll-schedule-filter-status";
import { FilterAll } from "@/lib/utils/client-enums";

export interface PayrollSchedule {
  _id: string;
  month: number;
  year: number;
  totalEmployees: number;
  totalGrossSalary: number;
  totalEmployeePension?: number;
  totalEmployerPension?: number;
  totalNHF?: number;
  totalNHIS?: number;
  totalPAYE: number;
  totalNetSalary: number;
  totalITF?: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollScheduleFilters {
  status: PayrollScheduleFilterStatus;
  year: number;
  month: number | FilterAll;
  page: number;
  itemsPerPage: number;
}

export interface PayrollSchedulesState {
  schedules: PayrollSchedule[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: PayrollScheduleFilters;
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

// CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
// Enforce minimum year 2026 (when Nigeria Tax Act 2025 takes effect)
// Default to 2026 or current year if later
const getInitialTaxYear = (): number => {
  const currentYear = new Date().getFullYear();
  return Math.max(2026, currentYear);
};

const initialState: PayrollSchedulesState = {
  schedules: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  filters: {
    status: PayrollScheduleFilterStatus.All,
    year: getInitialTaxYear(), // Default to 2026 or current year if later (app only supports 2026+)
    month: FilterAll.All,
    page: 1,
    itemsPerPage: 10,
  },
  companyId: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

// Helper function to check if filters have changed
const filtersChanged = (
  oldFilters: PayrollScheduleFilters,
  newFilters: PayrollScheduleFilters
): boolean => {
  return (
    oldFilters.status !== newFilters.status ||
    oldFilters.year !== newFilters.year ||
    oldFilters.month !== newFilters.month ||
    oldFilters.page !== newFilters.page ||
    oldFilters.itemsPerPage !== newFilters.itemsPerPage
  );
};

const payrollSlice = createSlice({
  name: "payroll",
  initialState,
  reducers: {
    // Set payroll schedules (replace existing)
    setPayrollSchedules(
      state,
      action: PayloadAction<{
        schedules: PayrollSchedule[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
        companyId: string;
      }>
    ) {
      state.schedules = action.payload.schedules;
      state.pagination = action.payload.pagination;
      state.companyId = action.payload.companyId;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    // Update filters - reset cache when filters change (except page)
    setFilters(state, action: PayloadAction<Partial<PayrollScheduleFilters>>) {
      const newFilters = { ...state.filters, ...action.payload };
      const filtersDidChange = filtersChanged(state.filters, newFilters);

      state.filters = newFilters;

      // Reset cache if filters changed (but not if only page changed)
      // If page is in the payload, it means we're changing page, so invalidate cache
      // If page is not in payload but other filters changed, also invalidate cache
      if (filtersDidChange) {
        state.hasFetched = false;
        // Only clear schedules if it's not just a page change
        if (!action.payload.page || Object.keys(action.payload).length > 1) {
          state.schedules = [];
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

    // Set company ID
    setCompanyId(state, action: PayloadAction<string>) {
      if (state.companyId !== action.payload) {
        state.companyId = action.payload;
        // Invalidate cache when company changes
        state.hasFetched = false;
        state.schedules = [];
        state.pagination = {
          page: 1,
          limit: state.filters.itemsPerPage,
          total: 0,
          pages: 0,
        };
        state.lastFetch = null;
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
      // CRITICAL: Mark as fetched even on error so loading states know fetch attempt completed
      // This prevents infinite loading when errors occur
      state.hasFetched = true;
    },

    // Clear all payroll schedules data
    clearPayrollSchedules(state) {
      state.schedules = [];
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

    // Update a single payroll schedule (e.g., when status changes)
    updateSchedule(state, action: PayloadAction<PayrollSchedule>) {
      const index = state.schedules.findIndex((s) => s._id === action.payload._id);
      if (index !== -1) {
        state.schedules[index] = action.payload;
      }
    },

    // Remove a payroll schedule (e.g., when deleted)
    removeSchedule(state, action: PayloadAction<string>) {
      state.schedules = state.schedules.filter((s) => s._id !== action.payload);
      // Update pagination total
      state.pagination.total = Math.max(0, state.pagination.total - 1);
      // Recalculate pages
      state.pagination.pages = Math.ceil(state.pagination.total / state.pagination.limit) || 1;
    },
  },
});

export const payrollActions = payrollSlice.actions;
export default payrollSlice;

