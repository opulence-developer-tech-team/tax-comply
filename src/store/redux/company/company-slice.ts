import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Company {
  _id: string;
  name: string;
  cacNumber?: string;
  tin?: string;
  address?: string;
  city?: string;
  state?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  companyType?: string;
  // annualTurnover removed - computed on backend
  taxClassification?: string;
  complianceStatus?: string;
  [key: string]: any; // Allow additional fields from API
}

export interface CompanyState {
  companies: Company[];
  selectedCompanyId: string | null;
  // CRITICAL: Subscription moved to its own slice (subscription-slice.ts)
  // Subscriptions are user-based, not company-based
  // Cache flags to prevent unnecessary refetches
  hasFetched: boolean;
  // Loading states
  isLoading: boolean;
  // Error states
  error: string | null;
  // Last fetch timestamp for cache invalidation
  lastFetch: number | null;
}

const initialState: CompanyState = {
  companies: [],
  selectedCompanyId: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    // Set companies list (replace existing)
    setCompanies(state, action: PayloadAction<Company[]>) {
      state.companies = action.payload;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
      
      // Auto-select first company if none selected and companies exist
      if (state.companies.length > 0 && !state.selectedCompanyId) {
        state.selectedCompanyId = state.companies[0]._id;
      }
    },

    // Add a single company (optimistic update)
    addCompany(state, action: PayloadAction<Company>) {
      // Check if it already exists (by _id)
      const exists = state.companies.some(
        (company) => company._id === action.payload._id
      );
      if (!exists) {
        state.companies.push(action.payload);
        // Auto-select if no company is selected
        if (!state.selectedCompanyId) {
          state.selectedCompanyId = action.payload._id;
        }
      }
    },

    // Update a single company
    updateCompany(state, action: PayloadAction<Company>) {
      const index = state.companies.findIndex(
        (company) => company._id === action.payload._id
      );
      if (index !== -1) {
        state.companies[index] = action.payload;
      }
    },

    // Remove a single company
    removeCompany(state, action: PayloadAction<string>) {
      state.companies = state.companies.filter(
        (company) => company._id !== action.payload
      );
      
      // If removed company was selected, select first remaining or null
      if (state.selectedCompanyId === action.payload) {
        state.selectedCompanyId = state.companies.length > 0 ? state.companies[0]._id : null;
      }
    },

    // Set selected company ID
    setSelectedCompanyId(state, action: PayloadAction<string | null>) {
      state.selectedCompanyId = action.payload;
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

    // Clear all company data
    clearCompanies(state) {
      state.companies = [];
      state.selectedCompanyId = null;
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

export const companyActions = companySlice.actions;
export default companySlice;
