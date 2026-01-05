import { Types } from "mongoose";
import { WHTType } from "../tax/calculator";
import { AccountType, RemittanceStatus, WHTCreditStatus, TransactionType } from "../utils/enum";

export interface IWHTRecord {
  _id?: Types.ObjectId;
  companyId: Types.ObjectId;
  accountId: Types.ObjectId; // Payee account (individual or company)
  accountType: AccountType; // Payee account type
  transactionType: TransactionType; // Source transaction type (invoice, expense, manual)
  transactionId?: Types.ObjectId; // Reference to source invoice/expense (optional for manual entries)
  payeeName: string;
  payeeTIN?: string;
  paymentAmount: number;
  whtType: WHTType;
  whtRate: number;
  whtAmount: number;
  netAmount: number;
  paymentDate: Date;
  month: number; // 1-12
  year: number; // 2026+
  description: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IWHTRemittance {
  _id?: Types.ObjectId;
  companyId: Types.ObjectId;
  remittanceMonth: number; // 1-12
  remittanceYear: number; // 2026+
  totalWHTAmount: number;
  remittanceDeadline: Date;
  remittanceDate?: Date;
  remittanceReference?: string;
  remittanceReceipt?: string;
  status: RemittanceStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IWHTCredit {
  _id?: Types.ObjectId;
  accountId: Types.ObjectId; // Payee account (individual or company)
  accountType: AccountType;
  whtRecordId: Types.ObjectId; // Reference to WHT record
  whtAmount: number; // Original WHT amount
  taxYear: number; // 2026+
  appliedToPIT: number; // Amount applied to Personal Income Tax
  appliedToCIT: number; // Amount applied to Company Income Tax
  remainingCredit: number; // Remaining credit available
  status: WHTCreditStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IWHTSummary {
  _id?: Types.ObjectId;
  companyId: Types.ObjectId;
  month: number; // 1-12 (0 = yearly summary)
  year: number; // 2026+
  totalWHTDeducted: number;
  totalWHTRemitted: number;
  totalWHTPending: number;
  whtRecordsCount: number;
  status: RemittanceStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateWHTRecord {
  companyId: Types.ObjectId;
  accountId: Types.ObjectId;
  accountType: AccountType;
  transactionType: TransactionType;
  transactionId?: Types.ObjectId;
  payeeName: string;
  payeeTIN?: string;
  paymentAmount: number;
  whtType: WHTType;
  paymentDate: Date | string;
  description?: string;
  notes?: string;
  // CRITICAL: Optional pre-calculated WHT amount and rate
  // When provided, these values are used instead of recalculating
  // This allows callers (like invoice service) to pass amounts calculated without exemptions
  // (e.g., when user explicitly selects a WHT type, exemptions should NOT apply)
  whtAmount?: number;
  whtRate?: number;
  netAmount?: number;
  isNonResident?: boolean;
}

export interface ICreateWHTRemittance {
  companyId: string;
  remittanceMonth: number;
  remittanceYear: number;
  remittanceAmount: number;
  remittanceDate: Date;
  remittanceReference: string;
  remittanceReceipt?: string;
}

export interface IUpdateWHTRemittance {
  remittanceDate: Date;
  remittanceReference?: string;
  remittanceReceipt?: string;
  remittanceAmount?: number; // Optional: If provided, must be >= current amount (can only increase, not decrease)
}



