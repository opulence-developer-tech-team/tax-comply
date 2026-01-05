import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AccountType } from "@/lib/utils/client-enums";

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  accountType: AccountType; // IMMUTABLE - determined at signup, never changes
  isEmailVerified: boolean;
  companyId?: string | null;
  role?: string;
}

export interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  hasFetched: boolean; // Dashboard fetch flag
  hasFetchedHeader: boolean; // Header fetch flag (separate from dashboard)
  isLoading: boolean;
  isLoadingHeader: boolean; // Separate loading state for header fetch
  error: string | null;
}

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  hasFetched: false,
  hasFetchedHeader: false, // Track header fetch separately
  isLoading: false,
  isLoadingHeader: false,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // Set user data (called after successful sign-in)
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
    },

    // Update user data
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
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
    },

    // Clear user data (logout)
    clearUser(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.hasFetched = false;
      state.hasFetchedHeader = false; // Reset header fetch on logout
      state.isLoadingHeader = false;
      state.error = null;
    },

    // Fetch user data from server (dashboard)
    fetchUser(state) {
      state.isLoading = true;
      state.error = null;
    },

    // Fetch user data from header (separate from dashboard)
    fetchUserHeader(state) {
      state.isLoadingHeader = true;
      state.error = null;
    },

    // Set user data from header fetch
    setUserFromHeader(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.hasFetchedHeader = true;
      state.isLoadingHeader = false;
      state.error = null;
    },

    // Set header fetch error (token invalid/expired)
    setHeaderFetchError(state, action: PayloadAction<string | null>) {
      state.isLoadingHeader = false;
      state.hasFetchedHeader = true; // Mark as fetched even on error to prevent retries
      
      // CRITICAL: If header fetch fails with 401, token is invalid/expired
      // Clear auth state to show sign in/sign up buttons
      // This is correct behavior - if token is invalid, user should be logged out
      state.isAuthenticated = false;
      state.user = null;
      // Note: hasFetched remains true to prevent dashboard from refetching unnecessarily
      // Don't set error state for header - it's expected for guests
    },

    // Set user fetched state
    setUserFetched(state, action: PayloadAction<boolean>) {
      state.hasFetched = action.payload;
    },
  },
});

export const userActions = userSlice.actions;
export default userSlice;

