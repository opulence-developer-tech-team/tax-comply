import { Types } from "mongoose";
import { AccountType } from "../utils/enum";

export interface IIncome {
  _id?: Types.ObjectId;
  accountId: Types.ObjectId; // User ID for individual, Company ID for company (renamed from entityId for consistency)
  entityType: AccountType;
  taxYear: number; // The tax year this income applies to
  month?: number | null; // Optional: 1-12 for monthly income, null/undefined for yearly/annual income
  annualIncome: number; // For yearly: gross annual income. For monthly: gross monthly income (will be annualized in calculations)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IIncomeCreate {
  accountId: string; // Renamed from entityId for consistency with expense model
  entityType: AccountType;
  taxYear: number;
  month?: number | null; // Optional: 1-12 for monthly income, null/undefined for yearly income
  annualIncome: number; // For yearly: gross annual income. For monthly: gross monthly income
}

export interface IIncomeUpdate {
  annualIncome: number;
}

