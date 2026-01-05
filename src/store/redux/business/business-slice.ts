import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppError } from "@/types/http";

export interface Business {
  _id: string;
  name: string;
  businessRegistrationNumber?: string;
  tin?: string;
  address?: string;
  city?: string;
  state?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  businessType?: string;
  // annualTurnover removed - computed on backend
  taxClassification?: string;
  complianceStatus?: string;
  [key: string]: any; // Allow additional fields from API
}

export interface BusinessState {
  businesses: Business[];
  selectedBusinessId: string | null;
  hasFetched: boolean;
  isLoading: boolean;
  error: AppError | null;
  lastFetch: number | null;
}

const initialState: BusinessState = {
  businesses: [],
  selectedBusinessId: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

const businessSlice = createSlice({
  name: "business",
  initialState,
  reducers: {
    // Set businesses list (replace existing)
    setBusinesses(state, action: PayloadAction<Business[]>) {
      state.businesses = action.payload;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
      
      // Auto-select first business if none selected and businesses exist
      if (state.businesses.length > 0 && !state.selectedBusinessId) {
        state.selectedBusinessId = state.businesses[0]._id;
      }
    },

    // Add a single business (optimistic update)
    addBusiness(state, action: PayloadAction<Business>) {
      const exists = state.businesses.some(
        (business) => business._id === action.payload._id
      );
      if (!exists) {
        state.businesses.push(action.payload);
        // Auto-select if no business is selected
        if (!state.selectedBusinessId) {
          state.selectedBusinessId = action.payload._id;
        }
      }
    },

    // Update a single business
    updateBusiness(state, action: PayloadAction<Business>) {
      const index = state.businesses.findIndex(
        (business) => business._id === action.payload._id
      );
      if (index !== -1) {
        state.businesses[index] = action.payload;
      }
    },

    // Remove a single business
    removeBusiness(state, action: PayloadAction<string>) {
      state.businesses = state.businesses.filter(
        (business) => business._id !== action.payload
      );
      
      // If removed business was selected, select first remaining or null
      if (state.selectedBusinessId === action.payload) {
        state.selectedBusinessId = state.businesses.length > 0 ? state.businesses[0]._id : null;
      }
    },

    // Set selected business ID
    setSelectedBusinessId(state, action: PayloadAction<string | null>) {
      state.selectedBusinessId = action.payload;
    },

    // Set loading state
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    // Set error state
    setError(state, action: PayloadAction<AppError | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Clear all business data
    clearBusinesses(state) {
      state.businesses = [];
      state.selectedBusinessId = null;
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

export const businessActions = businessSlice.actions;
export default businessSlice;
