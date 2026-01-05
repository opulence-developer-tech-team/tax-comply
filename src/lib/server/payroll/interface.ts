import { Types } from "mongoose";
import { PayrollStatus } from "../utils/payroll-status";
import { RemittanceStatus } from "../utils/enum";

export interface IPayrollCalculation {
  grossSalary: number;
  employeePensionContribution: number; // 8% employee contribution
  employerPensionContribution: number; // 10% employer contribution
  nhfContribution: number; // 2.5% NHF contribution
  nhisContribution: number; // 5% NHIS contribution
  cra: number; // Consolidated Relief Allowance - Not applicable for 2026+, always 0 for taxYear >= 2026
  taxableIncome: number; // After pension, NHF, NHIS deductions (for 2026+). CRA not applicable (returns 0).
  paye: number; // PAYE tax calculated on taxable income
  netSalary: number; // Gross - Employee Pension - NHF - NHIS - PAYE
}

/**
 * Payroll - Individual employee payroll record
 * CRITICAL: Supports both Company and Business accounts
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
export interface IPayroll {
  _id?: Types.ObjectId;
  companyId?: Types.ObjectId; // Optional - used for Company accounts
  businessId?: Types.ObjectId; // Optional - used for Business accounts
  employeeId: Types.ObjectId;
  payrollMonth: number; 
  payrollYear: number;
  grossSalary: number;
  employeePensionContribution: number; // 8% employee
  employerPensionContribution: number; // 10% employer
  nhfContribution: number; // 2.5% NHF
  nhisContribution: number; // 5% NHIS
  cra: number; // Consolidated Relief Allowance - Not applicable for 2026+, always 0 for taxYear >= 2026
  taxableIncome: number;
  paye: number;
  netSalary: number;
  status: PayrollStatus;
  paymentDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * PayrollSchedule - Calculated on-the-fly from Payroll records
 * CRITICAL: Totals are calculated from Payroll records, not stored
 * Only workflow status (draft/approved/submitted) is stored
 * CRITICAL: Supports both Company and Business accounts
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
export interface IPayrollSchedule {
  _id?: Types.ObjectId;
  companyId?: Types.ObjectId; // Optional - used for Company accounts
  businessId?: Types.ObjectId; // Optional - used for Business accounts
  month: number;
  year: number;
  status: PayrollStatus; // Workflow status only - totals are calculated on-the-fly
  createdAt?: Date;
  updatedAt?: Date;
  // Calculated fields (not stored in DB, computed on-the-fly):
  totalEmployees?: number;
  totalGrossSalary?: number;
  totalEmployeePension?: number;
  totalEmployerPension?: number;
  totalNHF?: number;
  totalNHIS?: number;
  totalPAYE?: number;
  totalNetSalary?: number;
  totalITF?: number; // Industrial Training Fund (1% of Gross Payroll if applicable)
}

/**
 * PayrollScheduleCalculation - Totals calculated from Payroll records
 */
export interface IPayrollScheduleCalculation {
  totalEmployees: number;
  totalGrossSalary: number;
  totalEmployeePension: number;
  totalEmployerPension: number;
  totalNHF: number;
  totalNHIS: number;
  totalPAYE: number;
  totalNetSalary: number;
  totalITF: number;
}

/**
 * PAYE Remittance tracking per NRS (Nigeria Revenue Service) regulations
 * PAYE must be remitted by the 10th day of the month following salary payment
 * Source: NRS (Nigeria Revenue Service) - formerly NRS (https://www.firs.gov.ng/)
 * 
 * NOTE: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 * CRITICAL: Supports both Company and Business accounts
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
export interface IPAYERemittance {
  _id?: Types.ObjectId;
  companyId?: Types.ObjectId; // Optional - used for Company accounts
  businessId?: Types.ObjectId; // Optional - used for Business accounts
  remittanceMonth: number; // Month for which PAYE is being remitted
  remittanceYear: number; // Year for which PAYE is being remitted
  totalPAYE: number; // Total PAYE amount to remit
  remittanceDate?: Date; // Actual date remittance was made
  remittanceDeadline: Date; // NRS deadline (10th of following month)
  status: RemittanceStatus;
  remittanceReference?: string; // NRS remittance reference number
  remittanceReceipt?: string; // Receipt/document reference
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}









