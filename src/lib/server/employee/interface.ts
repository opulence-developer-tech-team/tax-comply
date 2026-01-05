import { Types } from "mongoose";

/**
 * Employee - Individual employee record
 * CRITICAL: Supports both Company and Business accounts
 * - companyId is used for Company accounts
 * - businessId is used for Business accounts (sole proprietorships)
 * At least one must be provided, but not both.
 */
export interface IEmployee {
  _id?: Types.ObjectId;
  companyId?: Types.ObjectId; // Optional - used for Company accounts
  businessId?: Types.ObjectId; // Optional - used for Business accounts
  employeeId: string; 
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  dateOfEmployment: Date;
  salary: number; 
  taxIdentificationNumber?: string; 
  bankCode?: string; // Bank code from our Bank entity (e.g., "058" for GTBank)
  bankName?: string; // Bank name (derived from bankCode, used for display and validation)
  accountNumber?: string;
  accountName?: string;
  isActive: boolean;
  // CRITICAL: Benefit flags - indicates if company provides these statutory benefits for this employee
  // Must be explicitly provided - no defaults
  hasPension: boolean; // Pension (8% employee, 10% employer) - Pension Reform Act 2014
  hasNHF: boolean; // National Housing Fund (2.5%) - National Housing Fund Act
  hasNHIS: boolean; // National Health Insurance Scheme (5%) - NHIS Act
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateEmployee {
  companyId?: Types.ObjectId; // Optional - used for Company accounts
  businessId?: Types.ObjectId; // Optional - used for Business accounts
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  dateOfEmployment: Date;
  salary: number;
  taxIdentificationNumber?: string;
  bankCode?: string; // Bank code from our Bank entity (e.g., "058" for GTBank)
  bankName?: string; // Bank name (derived from bankCode, used for display and validation)
  accountNumber?: string;
  accountName?: string;
  isActive: boolean; // Employee status - must be explicitly provided
  // CRITICAL: Benefit flags - indicates if company provides these statutory benefits for this employee
  // Must be explicitly provided - no defaults
  hasPension: boolean; // Pension (8% employee, 10% employer) - Pension Reform Act 2014
  hasNHF: boolean; // National Housing Fund (2.5%) - National Housing Fund Act
  hasNHIS: boolean; // National Health Insurance Scheme (5%) - NHIS Act
}









