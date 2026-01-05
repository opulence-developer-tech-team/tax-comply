import { Types } from "mongoose";
import { VATType } from "../utils/vat-type";
import { VATStatus } from "../utils/vat-status";

export interface IVATRecord {
  _id?: Types.ObjectId;
  companyId: Types.ObjectId;
  invoiceId?: Types.ObjectId; // Optional - for output VAT from invoices
  expenseId?: Types.ObjectId; // Optional - for input VAT from expenses
  type: VATType; 
  amount: number;
  description: string;
  transactionDate: Date;
  month: number; 
  year: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * VATSummary - Calculated on-the-fly from invoices and expenses, cached for performance
 * CRITICAL: Supports both Company and Business accounts
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
export interface IVATSummary {
  _id?: Types.ObjectId;
  companyId?: Types.ObjectId; // Optional - used for Company accounts
  businessId?: Types.ObjectId; // Optional - used for Business accounts
  month: number;
  year: number;
  inputVAT: number; 
  outputVAT: number; 
  netVAT: number; 
  status: VATStatus; 
  annualTurnover?: number; // Calculated annual turnover for the tax year
  isVATExempt?: boolean; // Whether the entity is exempt from VAT based on turnover threshold (e.g. < ₦25M) 
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * VAT Remittance Record Interface
 * Stores user-entered VAT remittance records for companies and businesses.
 * These are actual payments made to NRS for VAT liability.
 * 
 * CRITICAL: VAT remittances are monthly/quarterly, not annual like CIT.
 * Multiple remittances per year are allowed (one per month/quarter).
 */
export interface IVATRemittance {
  _id?: Types.ObjectId;
  companyId?: Types.ObjectId; // For Company accounts
  businessId?: Types.ObjectId; // For Business accounts (sole proprietorships)
  month: number; // Month for which VAT is being remitted (1-12)
  year: number; // Year for which VAT is being remitted (2026+)
  
  remittanceAmount: number; // Amount remitted (must be >= 0)
  remittanceDate: Date; // Date when remittance was made
  remittanceReference: string; // Unique reference number for the remittance
  remittanceReceipt?: string; // URL to the remittance receipt (optional)
  
  status: string; // RemittanceStatus enum: "remitted", "pending", "overdue"
  
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interface for creating a new VAT Remittance record.
 */
export interface ICreateVATRemittance {
  entityId: string; // Can be companyId or businessId
  accountType: string; // AccountType enum: "company" or "business"
  month: number;
  year: number;
  remittanceAmount: number;
  remittanceDate: Date;
  remittanceReference: string;
  remittanceReceipt?: string;
}

/**
 * Interface for updating an existing VAT Remittance record.
 */
export interface IUpdateVATRemittance {
  remittanceDate?: Date;
  remittanceAmount?: number;
  remittanceReference?: string;
  remittanceReceipt?: string;
  status?: string; // RemittanceStatus enum
}












