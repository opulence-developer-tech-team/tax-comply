import { Types } from "mongoose";
import { ExemptionReason, FilingStatus, RemittanceStatus, PITRemittanceStatus, PITEmploymentSource } from "../utils/enum";

/**
 * Personal Income Tax (PIT) Summary
 * Aggregated PIT data for a tax year
 */
export interface IPITSummary {
  _id?: Types.ObjectId;
  accountId: Types.ObjectId; // User ID for individual accounts
  taxYear: number;
  
  // Income
  totalGrossIncome: number; // Total gross income from all sources
  totalBusinessIncome: number; // Income from business operations (Sole Proprietorship Revenue)
  totalPersonalIncome: number; // Other personal income (e.g., employment, manual entries)
  totalTaxableIncome: number; // After deductions (CRA removed for 2026+, NHIS deductible for 2026+)
  
  // Statutory Deductions
  totalCRA: number; // Consolidated Relief Allowance (0 for 2026+ as CRA has been replaced)
  totalPension: number; // Employee pension contributions
  totalNHF: number; // National Housing Fund
  totalNHIS: number; // National Health Insurance Scheme (deductible for 2026+)
  
  // New Allowable Deductions (2026+)
  totalHousingLoanInterest?: number; // Interest on loans for owner-occupied residential housing
  totalLifeInsurance?: number; // Life insurance or annuity premiums
  totalRentRelief?: number; // Rent relief up to 20% of annual rent (capped at ₦500,000)
  
  // Allowable Deductions
  totalAllowableDeductions: number; // Tax-deductible expenses (company expenses)
  
  // Tax Calculation
  annualExemption: number; // Personal income tax exemption (₦800,000 for 2026+, ₦0 for 2024)
  pitBeforeWHT: number; // PIT before WHT credits
  whtCredits: number; // Total WHT credits available
  pitAfterWHT: number; // Final PIT liability after WHT credits
  isFullyExempt: boolean; // True if taxable income <= annual exemption (fully exempt from tax)
  exemptionReason?: ExemptionReason; // Reason for exemption
  
  // Remittance
  pitRemitted: number; // Amount remitted to NRS (Nigeria Revenue Service)
  pitPending: number; // Amount pending remittance
  remittanceStatus: RemittanceStatus;
  remittanceDeadline: Date; // March 31 of following year
  
  // Filing
  filingStatus: FilingStatus;
  filingDeadline: Date; // March 31 of following year
  
  lastUpdated?: Date;
  
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * PIT Remittance Record
 * Tracks PIT remittance to NRS (Nigeria Revenue Service)
 */
export interface IPITRemittance {
  _id?: Types.ObjectId;
  accountId: Types.ObjectId; // User ID for individual accounts
  taxYear: number;
  
  remittanceDate: Date;
  remittanceAmount: number;
  remittanceReference: string; // NRS remittance reference
  receiptUrl?: string; // URL to remittance receipt
  
  status: PITRemittanceStatus;
  
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create PIT Summary
 */
export interface ICreatePITSummary {
  accountId: string;
  taxYear: number;
}

/**
 * Create PIT Remittance
 */
export interface ICreatePITRemittance {
  accountId: string;
  taxYear: number;
  remittanceDate: Date;
  remittanceAmount: number;
  remittanceReference: string;
  receiptUrl?: string;
}

/**
 * Update PIT Remittance
 */
export interface IUpdatePITRemittance {
  remittanceDate?: Date;
  remittanceAmount?: number;
  remittanceReference?: string;
  receiptUrl?: string;
  status?: PITRemittanceStatus;
}

/**
 * PIT Employment Deductions
 * User-provided statutory deductions and reliefs for a tax year
 * Used for accurate PIT calculations per Nigeria Tax Act 2025
 * Reference: https://www.nipc.gov.ng/wp-content/uploads/2025/07/Nigeria-Tax-Act-2025.pdf
 * Reference: Fiscal Reforms (https://fiscalreforms.ng/)
 */
export interface IPITEmploymentDeductions {
  _id?: Types.ObjectId;
  accountId: Types.ObjectId; // User ID for individual accounts
  taxYear: number;
  
  // Statutory Deductions (User-provided)
  annualPension: number; // Total annual pension contributions (typically 8% of gross income)
  annualNHF: number; // Total annual NHF contributions (typically 2.5% of gross income)
  annualNHIS: number; // Total annual NHIS contributions (typically 5% of basic salary)
  // CRITICAL: NHIS is now DEDUCTIBLE for 2026+ (reduces taxable income)
  
  // New Allowable Deductions (2026+)
  // Per Nigeria Tax Act 2025, these are now allowable deductions
  annualHousingLoanInterest?: number; // Interest on loans for owner-occupied residential housing
  annualLifeInsurance?: number; // Life insurance or annuity premiums
  annualRent?: number; // Annual rent paid (required to calculate rent relief)
  annualRentRelief?: number; // Rent relief: 20% of annual rent, capped at ₦500,000 (calculated from annualRent)
  
  // Metadata
  source: PITEmploymentSource; // Source of information
  sourceOther?: string; // Required if source is "other" - description of the other source
  notes?: string; // Optional notes from user
  
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create Employment Deductions
 */
export interface ICreatePITEmploymentDeductions {
  accountId: string;
  taxYear: number;
  annualPension: number;
  annualNHF: number;
  annualNHIS: number;
  // New deductions for 2026+
  annualHousingLoanInterest?: number;
  annualLifeInsurance?: number;
  annualRent?: number; // Annual rent paid (required to calculate rent relief)
  annualRentRelief?: number; // Will be calculated as 20% of annualRent, capped at ₦500,000
  source: PITEmploymentSource;
  sourceOther?: string; // Required if source is "other"
  notes?: string;
}

/**
 * Update Employment Deductions
 */
export interface IUpdatePITEmploymentDeductions {
  annualPension?: number;
  annualNHF?: number;
  annualNHIS?: number;
  // New deductions for 2026+
  annualHousingLoanInterest?: number;
  annualLifeInsurance?: number;
  annualRent?: number; // Annual rent paid (required to calculate rent relief)
  annualRentRelief?: number; // Will be calculated as 20% of annualRent, capped at ₦500,000
  source?: PITEmploymentSource;
  sourceOther?: string; // Required if source is "other"
  notes?: string;
}
