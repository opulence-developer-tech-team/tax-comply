import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SubscriptionStatus } from "@/lib/utils/subscription-status";
import { BillingCycle } from "@/lib/utils/billing-cycle";

/**
 * Subscription Interface
 * 
 * Represents a user's subscription (user-based, not company-based)
 * Works for both individual and company accounts
 */
export interface Subscription {
  _id?: string;
  userId: string;
  plan: string;
  billingCycle: BillingCycle;
  amount: number;
  status: SubscriptionStatus;
  startDate: string | Date;
  endDate: string | Date;
  previousPlan?: string;
  [key: string]: any; // Allow additional fields from API
}

/**
 * Subscription State
 * 
 * Manages subscription data for the current authenticated user.
 * This is user-based, not company-based, so it works for both
 * individual and company accounts.
 */
export interface SubscriptionState {
  currentSubscription: Subscription | null;
  // Cache flags to prevent unnecessary refetches
  hasFetched: boolean;
  // Loading states
  isLoading: boolean;
  // Error states
  error: string | null;
  // Last fetch timestamp for cache invalidation
  lastFetch: number | null;
}

const initialState: SubscriptionState = {
  currentSubscription: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {
    // Set current subscription
    setCurrentSubscription(state, action: PayloadAction<Subscription | null>) {
      state.currentSubscription = action.payload;
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

    // Clear subscription data (e.g., on logout)
    clearSubscription(state) {
      state.currentSubscription = null;
      state.hasFetched = false;
      state.isLoading = false;
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

export const subscriptionActions = subscriptionSlice.actions;
export default subscriptionSlice;





