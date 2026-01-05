import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EmployeeSortField, SortOrder } from "@/lib/utils/client-enums";

export interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  salary: number;
  isActive: boolean;
}

export interface EmployeeFilters {
  search: string;
  page: number;
  limit: number;
  sortBy: EmployeeSortField;
  sortOrder: SortOrder;
}

export interface EmployeesState {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: EmployeeFilters;
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

const initialState: EmployeesState = {
  employees: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  },
  filters: {
    search: "",
    page: 1,
    limit: 20,
    sortBy: EmployeeSortField.CreatedAt,
    sortOrder: SortOrder.Desc,
  },
  companyId: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

// Helper function to check if filters have changed
const filtersChanged = (oldFilters: EmployeeFilters, newFilters: EmployeeFilters): boolean => {
  return (
    oldFilters.search !== newFilters.search ||
    oldFilters.page !== newFilters.page ||
    oldFilters.limit !== newFilters.limit ||
    oldFilters.sortBy !== newFilters.sortBy ||
    oldFilters.sortOrder !== newFilters.sortOrder
  );
};

const employeesSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {
    // Set employees (replace existing)
    setEmployees(
      state,
      action: PayloadAction<{
        employees: Employee[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
        companyId: string;
      }>
    ) {
      state.employees = action.payload.employees;
      state.pagination = action.payload.pagination;
      state.companyId = action.payload.companyId;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    // Update filters - reset cache when filters change
    setFilters(state, action: PayloadAction<Partial<EmployeeFilters>>) {
      const newFilters = { ...state.filters, ...action.payload };
      const filtersDidChange = filtersChanged(state.filters, newFilters);
      
      state.filters = newFilters;
      
      // Reset cache if filters changed
      if (filtersDidChange) {
        state.hasFetched = false;
        // Only clear employees if it's not just a page change
        if (!action.payload.page || Object.keys(action.payload).length > 1) {
          state.employees = [];
          state.pagination = {
            page: newFilters.page,
            limit: newFilters.limit,
            total: 0,
            pages: 1,
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

    // Set search term - invalidate cache to fetch new results
    setSearch(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
      // Reset to page 1 when search changes
      state.filters.page = 1;
      // Invalidate cache to fetch new results
      state.hasFetched = false;
      state.employees = [];
      state.pagination = {
        page: 1,
        limit: state.filters.limit,
        total: 0,
        pages: 1,
      };
      state.lastFetch = null;
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

    // Remove a single employee (optimistic update after deletion)
    removeEmployee(state, action: PayloadAction<string>) {
      state.employees = state.employees.filter((emp) => emp._id !== action.payload);
      if (state.pagination.total > 0) {
        state.pagination.total -= 1;
        // Recalculate pages if needed
        state.pagination.pages = Math.ceil(state.pagination.total / state.pagination.limit) || 1;
      }
    },

    // Update a single employee (after edit)
    updateEmployee(state, action: PayloadAction<Employee>) {
      const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
      if (index !== -1) {
        state.employees[index] = action.payload;
      }
    },

    // Add a new employee (after creation)
    // Only adds if on page 1 and matches current filters
    addEmployee(
      state,
      action: PayloadAction<{
        employee: Employee;
        companyId: string;
      }>
    ) {
      const { employee, companyId: newCompanyId } = action.payload;

      // Only add if company ID matches
      if (state.companyId !== newCompanyId) {
        return;
      }

      // Increment total count
      state.pagination.total += 1;
      state.pagination.pages = Math.ceil(state.pagination.total / state.pagination.limit) || 1;

      // Only add to list if:
      // 1. We're on page 1
      // 2. Either no search filter OR employee matches search
      // 3. List hasn't exceeded limit (or we're okay with it being slightly over)
      if (state.filters.page === 1) {
        const searchTerm = state.filters.search?.toLowerCase().trim() || "";
        const matchesSearch =
          !searchTerm ||
          employee.firstName?.toLowerCase().includes(searchTerm) ||
          employee.lastName?.toLowerCase().includes(searchTerm) ||
          employee.employeeId?.toLowerCase().includes(searchTerm) ||
          employee.email?.toLowerCase().includes(searchTerm);

        if (matchesSearch) {
          // Add to beginning of list (newest first, since default sort is createdAt desc)
          state.employees.unshift(employee);

          // If list exceeds limit, remove the last item
          // This keeps the list at the correct size for the current page
          if (state.employees.length > state.pagination.limit) {
            state.employees.pop();
          }
        }
      }
    },

    // Clear all employees data
    clearEmployees(state) {
      state.employees = [];
      state.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        pages: 1,
      };
      state.filters = {
        search: "",
        page: 1,
        limit: 20,
        sortBy: EmployeeSortField.CreatedAt,
        sortOrder: SortOrder.Desc,
      };
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
        state.employees = [];
        state.pagination = {
          page: 1,
          limit: 20,
          total: 0,
          pages: 1,
        };
        state.filters = {
          search: "",
          page: 1,
          limit: 20,
          sortBy: EmployeeSortField.CreatedAt,
          sortOrder: SortOrder.Desc,
        };
        state.lastFetch = null;
      }
    },
  },
});

export const employeesActions = employeesSlice.actions;
export default employeesSlice;

