import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RemittanceStatus } from "@/lib/utils/remittance-status";
import { TaxClassification } from "@/lib/utils/tax-classification";

export interface CITSummary {
  companyId: string;
  taxYear: number;
  
  // Revenue (from paid invoices)
  totalRevenue: number;
  
  // Expenses (tax-deductible expenses)
  totalExpenses: number;
  
  // Taxable Profit
  taxableProfit: number;
  
  // Tax Classification
  taxClassification: TaxClassification;
  
  // CIT Rates (based on classification)
  citRate: number;
  
  // CIT Calculation
  citBeforeWHT: number;
  whtCredits: number;
  citAfterWHT: number;
  
  // Remittance Tracking
  totalCITRemitted: number;
  totalCITPending: number;
  
  // Status
  status: RemittanceStatus;
  
  // Filing Deadline
  filingDeadline: string;
}

export interface CITRemittance {
  _id: string;
  companyId: string;
  taxYear: number;
  remittanceDate: string;
  remittanceAmount: number;
  remittanceReference: string;
  remittanceReceipt?: string;
  status: RemittanceStatus;
}

export interface CITState {
  summary: CITSummary | null;
  remittances: CITRemittance[];
  taxYear: number;
  companyId: string | null;
  hasFetched: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: CITState = {
  summary: null,
  remittances: [],
  taxYear: new Date().getFullYear(),
  companyId: null,
  hasFetched: false,
  isLoading: false,
  error: null,
  lastFetch: null,
};

const citSlice = createSlice({
  name: "cit",
  initialState,
  reducers: {
    setCITSummary(
      state,
      action: PayloadAction<{
        summary: CITSummary | null;
        taxYear: number;
        companyId: string;
      }>
    ) {
      state.summary = action.payload.summary;
      state.taxYear = action.payload.taxYear;
      state.companyId = action.payload.companyId;
      state.hasFetched = true;
      state.isLoading = false;
      state.error = null;
      state.lastFetch = Date.now();
    },

    setCITRemittances(
      state,
      action: PayloadAction<{
        remittances: CITRemittance[];
        companyId: string;
      }>
    ) {
      state.remittances = action.payload.remittances;
      state.companyId = action.payload.companyId;
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

    clearCIT(state) {
      state.summary = null;
      state.remittances = [];
      state.hasFetched = false;
      state.error = null;
      state.lastFetch = null;
      state.companyId = null;
    },

    invalidateCache(state) {
      state.hasFetched = false;
      state.lastFetch = null;
    },
  },
});

export const citActions = citSlice.actions;
export default citSlice;



