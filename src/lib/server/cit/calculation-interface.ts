import { Types } from "mongoose";
import { TaxClassification, RemittanceStatus } from "../utils/enum";

/**
 * CIT Calculation Interface
 * Defines the structure for on-the-fly calculated CIT values.
 */
export interface ICITCalculation {
  companyId: Types.ObjectId;
  taxYear: number;
  
  // Revenue (from paid invoices)
  totalRevenue: number; // Sum of subtotals from paid invoices (excludes VAT)
  
  // Expenses (tax-deductible expenses)
  totalExpenses: number; // Sum of tax-deductible expenses for the tax year
  
  // Taxable Profit
  taxableProfit: number; // Revenue - Expenses (cannot be negative)
  
  // Tax Classification
  taxClassification: TaxClassification; // Small, Medium, or Large Company
  
  // CIT Rates (based on classification)
  citRate: number; // 0% (Small), 20% (Medium), or 30% (Large)
  
  // CIT Calculation
  citBeforeWHT: number; // Taxable Profit × CIT Rate
  whtCredits: number; // Total WHT credits available (from WHT deducted)
  citAfterWHT: number; // CIT After WHT Credits (final liability)
  
  // Remittance Tracking
  totalCITRemitted: number; // Total CIT remitted by the company (user-entered)
  totalCITPending: number; // CIT After WHT - Total CIT Remitted
  
  // Status
  status: RemittanceStatus; // Compliant, Pending, or Overdue
  
  // Filing Deadline
  filingDeadline: Date; // June 30 of the following year
}

/**
 * CIT Summary Response Interface
 * Response structure for CIT summary API endpoints.
 */
export interface ICITSummaryResponse extends ICITCalculation {
  _diagnostic?: {
    totalInvoices: number;
    paidInvoices: number;
    totalExpenses: number;
    taxDeductibleExpenses: number;
    invoiceRecordsCount: number;
    expenseRecordsCount: number;
  };
}



