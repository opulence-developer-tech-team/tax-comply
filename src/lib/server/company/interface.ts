import { Types } from "mongoose";
import { TaxClassification, ComplianceStatus } from "../utils/enum";

export interface ICompany {
  _id?: Types.ObjectId;
  ownerId: Types.ObjectId; 
  name: string;
  cacNumber?: string; 
  tin?: string; 
  vatRegistrationNumber?: string; // VAT Registration Number (VRN)
  isCACRegistered?: boolean; // Whether company is registered with CAC
  address?: string;
  city?: string;
  state?: string;
  country: string; 
  phoneNumber?: string;
  email?: string;
  website?: string;
  companyType?: string; 
  fixedAssets?: number;
  annualTurnover?: number; // Computed field, not stored
  taxClassification?: TaxClassification; 
  complianceStatus?: ComplianceStatus;
  lastComplianceCheck?: Date;
  // Privacy consent tracking for legal compliance
  privacyConsentGiven?: boolean;
  privacyConsentDate?: Date;
  privacyPolicyVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICompanyOnboarding {
  name: string;
  cacNumber?: string;
  tin?: string;
  vatRegistrationNumber?: string; // VAT Registration Number (VRN) - required for VAT-registered companies
  isCACRegistered?: boolean; // Whether company is registered with CAC
  address?: string;
  city?: string;
  state?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  companyType?: string;
  fixedAssets?: number;
  // Privacy consent (required for legal compliance)
  privacyConsentGiven?: boolean;
  privacyPolicyVersion?: string;
}
