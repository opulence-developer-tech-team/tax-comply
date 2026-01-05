import { Types } from "mongoose";

import { WHTType } from "../tax/calculator";
import { AccountType } from "../utils/enum";

export interface IExpense {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  companyId?: Types.ObjectId; // Optional, only for company accounts
  accountId: Types.ObjectId; // Reference to the account (company or individual)
  accountType: AccountType;
  description: string;
  amount: number;
  category: string;
  date: Date;
  month: number;
  year: number;
  isTaxDeductible: boolean;
  vatAmount?: number; // If applicable
  // WHT (Withholding Tax) fields - for tracking WHT deducted from expense payments
  whtType?: WHTType; // Type of payment (determines WHT rate)
  whtAmount?: number; // WHT amount deducted (if applicable)
  whtDeducted?: boolean; // Whether WHT was deducted from this expense
  // Supplier/Vendor information (REQUIRED for WHT compliance per NRS (Nigeria Revenue Service))
  supplierName?: string; // Name of supplier/vendor who received payment (required when WHT deducted)
  supplierTIN?: string; // TIN of supplier/vendor (required for WHT compliance)
  supplierType?: AccountType; // Type of supplier (required when WHT deducted)
  isNonResident?: boolean; // Whether supplier is non-resident (affects WHT rate)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IExpenseCreate {
  accountId: string;
  accountType: AccountType;
  description: string;
  amount: number;
  category: string;
  date: string | Date;
  isTaxDeductible: boolean;
  // WHT (Withholding Tax) fields - optional
  whtType?: WHTType;
  whtDeducted?: boolean;
  // Supplier/Vendor information (REQUIRED when WHT is deducted per NRS (Nigeria Revenue Service))
  supplierName?: string; // Name of supplier/vendor (required if whtDeducted is true)
  supplierTIN?: string; // TIN of supplier/vendor (required for WHT compliance)
  supplierType?: AccountType; // Type of supplier (required if whtDeducted is true)
  isNonResident?: boolean; // Whether supplier is non-resident (affects WHT rate)
}

export interface IExpenseSummary {
  totalExpenses: number;
  taxDeductibleExpenses: number;
  taxableIncome: number;
  taxSavings: number | null; // null if income is missing (blocking state)
  month: number;
  year: number;
  requiresIncome: boolean; // true if income data is missing
  incomeRequiredFor: {
    accountId: string; // Renamed from entityId for consistency
    entityType: AccountType;
    taxYear: number;
    month?: number | null; // Optional: 1-12 for monthly income, null/undefined for yearly income
  } | null;
  // Breakdown values for display (only present if income is available)
  annualIncome?: number; // Annual income amount
  annualTaxExemption?: number; // Tax exemption threshold (e.g., ₦800,000 for 2026+)
  taxableIncomeAmount?: number; // Income amount after exemption (income - exemption)
  taxOnIncome?: number; // Tax on original income
  taxOnReducedIncome?: number; // Tax on (income - deductible expenses)
}





