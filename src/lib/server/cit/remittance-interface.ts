import { Types } from "mongoose";
import { RemittanceStatus } from "../utils/enum";

/**
 * CIT Remittance Record Interface
 * Stores user-entered CIT remittance records for companies.
 * These are actual payments made by the company to NRS for CIT liability.
 */
export interface ICITRemittance {
  _id?: Types.ObjectId;
  companyId: Types.ObjectId;
  taxYear: number; // Tax year for which CIT is being remitted (2026+)
  
  remittanceAmount: number; // Amount remitted (must be >= 0)
  remittanceDate: Date; // Date when remittance was made
  remittanceReference: string; // Unique reference number for the remittance
  remittanceReceipt?: string; // URL to the remittance receipt (optional)
  
  status: RemittanceStatus; // e.g., "remitted", "pending", "overdue"
  
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interface for creating a new CIT Remittance record.
 */
export interface ICreateCITRemittance {
  companyId: string;
  taxYear: number;
  remittanceAmount: number;
  remittanceDate: Date;
  remittanceReference: string;
  remittanceReceipt?: string;
}

/**
 * Interface for updating an existing CIT Remittance record.
 */
export interface IUpdateCITRemittance {
  remittanceDate?: Date;
  remittanceAmount?: number;
  remittanceReference?: string;
  remittanceReceipt?: string;
  status?: RemittanceStatus;
}



