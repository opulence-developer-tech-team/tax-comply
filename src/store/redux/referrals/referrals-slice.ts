import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ReferralStatus } from "@/lib/utils/referral-status";
import { WithdrawalStatus } from "@/lib/utils/withdrawal-status";

export interface Referral {
  id: string;
  referredUser: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface Earning {
  id: string;
  referredUser: {
    id: string;
    name: string;
    email: string;
  };
  subscriptionPlan: string;
  subscriptionAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  status: ReferralStatus;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralSummary {
  totalReferrals: number;
  totalEarnings: number;
  availableBalance: number;
  totalWithdrawn: number;
  pendingEarnings: number;
}

export interface ReferralPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ReferralsState {
  referralId: string | null;
  referralLink: string | null;
  referrals: Referral[];
  earnings: {
    data: Earning[];
    pagination: ReferralPagination;
  };
  withdrawals: {
    data: Withdrawal[];
    pagination: ReferralPagination;
  };
  summary: ReferralSummary | null;
  // Pagination state
  earningsPage: number;
  earningsLimit: number;
  withdrawalsPage: number;
  withdrawalsLimit: number;
  // Cache flags to prevent unnecessary refetches
  hasFetched: boolean;
  // Loading states
  isLoading: boolean;
  // Error states
  error: string | null;
  // Last fetch timestamp for cache invalidation
  lastFetch: number | null;
}

const initialState: ReferralsState = {
  referralId: null,
  referralLink: null,
  referrals: [],
  earnings: {
    data: [],
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      pages: 0,
    },
  },
  withdrawals: {
    data: [],
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      pages: 0,
    },
  },
  summary: null,
  earningsPage: 1,
  earningsLimit: 50,
  withdrawalsPage: 1,
  withdrawalsLimit: 50,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

const referralsSlice = createSlice({
  name: "referrals",
  initialState,
  reducers: {
    // Set referral dashboard data (replace existing)
    setReferralData(
      state,
      action: PayloadAction<{
        referralId: string | null;
        referralLink: string | null;
        referrals: Referral[];
        earnings: {
          data: Earning[];
          pagination: ReferralPagination;
        };
        withdrawals: {
          data: Withdrawal[];
          pagination: ReferralPagination;
        };
        summary: ReferralSummary;
      }>
    ) {
      state.referralId = action.payload.referralId;
      state.referralLink = action.payload.referralLink;
      state.referrals = action.payload.referrals;
      state.earnings = action.payload.earnings;
      state.withdrawals = action.payload.withdrawals;
      state.summary = action.payload.summary;
      // CRITICAL: Don't update earningsPage/withdrawalsPage from response
      // These should only be updated by user action (setEarningsPage/setWithdrawalsPage)
      // The response pagination reflects what was requested, which matches our state
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },
    // Set pagination for earnings
    setEarningsPage(state, action: PayloadAction<number>) {
      state.earningsPage = action.payload;
      // Reset hasFetched when page changes to trigger refetch
      state.hasFetched = false;
    },
    // Set pagination for withdrawals
    setWithdrawalsPage(state, action: PayloadAction<number>) {
      state.withdrawalsPage = action.payload;
      // Reset hasFetched when page changes to trigger refetch
      state.hasFetched = false;
    },
    // Set loading state
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    // Set error state
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    // Clear referral data (on logout or reset)
    clearReferralData(state) {
      state.referralId = null;
      state.referralLink = null;
      state.referrals = [];
      state.earnings = {
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
        },
      };
      state.withdrawals = {
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
        },
      };
      state.summary = null;
      state.earningsPage = 1;
      state.withdrawalsPage = 1;
      state.hasFetched = false;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = null;
    },
    // Invalidate cache (force refetch on next load)
    invalidateCache(state) {
      state.hasFetched = false;
    },
  },
});

export const referralsActions = referralsSlice.actions;
export default referralsSlice.reducer;

