import { Types } from "mongoose";
import { TaxClassification, ComplianceStatus } from "../utils/enum";

export interface IBusiness {
  _id?: Types.ObjectId;
  ownerId: Types.ObjectId; 
  name: string;
  businessRegistrationNumber?: string; // Business registration number (if registered)
  tin?: string; 
  vatRegistrationNumber?: string; // VAT Registration Number (VRN)
  isRegistered?: boolean; // Whether business is registered with appropriate authorities
  address?: string;
  city?: string;
  state?: string;
  country: string; 
  phoneNumber?: string;
  email?: string;
  website?: string;
  businessType?: string; // Type of sole proprietorship business
  annualTurnover?: number; // Computed from invoices
  fixedAssets?: number;
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

export interface IBusinessOnboarding {
  name: string;
  businessRegistrationNumber?: string;
  tin?: string;
  vatRegistrationNumber?: string; // VAT Registration Number (VRN) - required for VAT-registered businesses
  isRegistered?: boolean; // Whether business is registered
  address?: string;
  city?: string;
  state?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  businessType?: string;
  fixedAssets?: number;
  // Privacy consent (required for legal compliance)
  privacyConsentGiven?: boolean;
  privacyPolicyVersion?: string;
}
