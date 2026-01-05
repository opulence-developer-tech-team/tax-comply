import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AccountType, ExemptionReason, FilingStatus, PITRemittanceStatus, RemittanceStatus } from "@/lib/utils/client-enums";

export interface PITSummary {
  _id?: string;
  accountId: string;
  taxYear: number;
  totalGrossIncome: number;
  totalBusinessIncome: number; // Income from business operations (Sole Proprietorship Revenue)
  totalPersonalIncome: number; // Other personal income (e.g., employment, manual entries)
  totalTaxableIncome: number;
  totalCRA: number;
  totalPension: number;
  totalNHF: number;
  totalNHIS: number;
  // New Allowable Deductions (2026+)
  totalHousingLoanInterest?: number; // Interest on loans for owner-occupied residential housing
  totalLifeInsurance?: number; // Life insurance or annuity premiums
  totalRentRelief?: number; // Rent relief up to 20% of annual rent (capped at ₦500,000)
  totalAllowableDeductions: number;
  annualExemption: number;
  pitBeforeWHT: number;
  whtCredits: number;
  pitAfterWHT: number;
  pitRemitted: number;
  pitPending: number;
  isFullyExempt: boolean; // True if taxable income <= annual exemption (fully exempt from tax)
  exemptionReason?: ExemptionReason; // Reason for exemption
  remittanceStatus: RemittanceStatus;
  remittanceDeadline: string;
  filingStatus: FilingStatus;
  filingDeadline: string;
}

export interface PITRemittance {
  _id: string;
  accountId: string;
  taxYear: number;
  remittanceDate: string;
  remittanceAmount: number;
  remittanceReference: string;
  receiptUrl?: string;
  status: PITRemittanceStatus;
}

export interface IncomeSource {
  _id: string;
  accountId: string;
  entityType: AccountType;
  taxYear: number;
  month?: number | null;
  annualIncome: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PITState {
  summary: PITSummary | null;
  remittances: PITRemittance[];
  incomeSources: IncomeSource[];
  taxYear: number;
  accountId: string | null;
  hasFetched: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: PITState = {
  summary: null,
  remittances: [],
  incomeSources: [],
  taxYear: new Date().getFullYear(),
  accountId: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

const pitSlice = createSlice({
  name: "pit",
  initialState,
  reducers: {
    setPITSummary(
      state,
      action: PayloadAction<{
        summary: PITSummary | null;
        taxYear: number;
        accountId: string;
      }>
    ) {
      state.summary = action.payload.summary;
      state.taxYear = action.payload.taxYear;
      state.accountId = action.payload.accountId;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    setPITRemittances(
      state,
      action: PayloadAction<{
        remittances: PITRemittance[];
        accountId: string;
      }>
    ) {
      state.remittances = action.payload.remittances;
      state.accountId = action.payload.accountId;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    setIncomeSources(
      state,
      action: PayloadAction<{
        incomeSources: IncomeSource[];
        accountId: string;
      }>
    ) {
      state.incomeSources = action.payload.incomeSources;
      state.accountId = action.payload.accountId;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    setTaxYear(state, action: PayloadAction<number>) {
      if (state.taxYear !== action.payload) {
        state.taxYear = action.payload;
        state.hasFetched = false; // Invalidate cache when tax year changes
      }
    },

    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },

    clearPIT(state) {
      state.summary = null;
      state.remittances = [];
      state.incomeSources = [];
      state.hasFetched = false;
      state.error = null;
      state.lastFetch = null;
      state.accountId = null;
    },

    invalidateCache(state) {
      state.hasFetched = false;
      state.lastFetch = null;
    },
  },
});

export const pitActions = pitSlice.actions;
export default pitSlice;



