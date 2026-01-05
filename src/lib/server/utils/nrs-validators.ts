import { NRS_VAT_TURNOVER_THRESHOLD_2026 } from "../../constants/nrs-constants";

/**
 * NRS (Nigeria Revenue Service) Validation Utilities
 * Reference: https://www.nrs.gov.ng/
 * 
 * NOTE: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 *
 * These validators ensure data conforms to NRS (Nigeria Revenue Service) requirements
 */

/**
 * Validate TIN (Tax Identification Number) format
 * NRS (Nigeria Revenue Service) TIN format: 10-12 digits (numeric)
 * 
 * @param tin - TIN to validate
 * @returns true if valid, false otherwise
 */
export function isValidTIN(tin: string): boolean {
  if (!tin || typeof tin !== "string") return false;
  
  // Remove spaces and dashes for validation
  const normalized = tin.trim().replace(/[\s-]/g, "");
  
  // TIN must be 10-12 digits
  return /^\d{10,12}$/.test(normalized);
}

/**
 * Normalize TIN (remove spaces and dashes)
 * 
 * @param tin - TIN to normalize
 * @returns normalized TIN
 */
export function normalizeTIN(tin: string): string {
  if (!tin || typeof tin !== "string") return "";
  return tin.trim().replace(/[\s-]/g, "");
}

/**
 * Validate CAC (Corporate Affairs Commission) Number format
 * CAC format: Prefix (RC/BN/IT) + 6-9 digits
 * Examples: RC123456, BN1234567, IT123456
 * 
 * @param cacNumber - CAC number to validate
 * @returns true if valid, false otherwise
 */
export function isValidCAC(cacNumber: string): boolean {
  if (!cacNumber || typeof cacNumber !== "string") return false;
  
  const normalized = cacNumber.trim().toUpperCase();
  
  // CAC must start with RC, BN, or IT followed by 6-9 digits
  return /^(RC|BN|IT)\d{6,9}$/.test(normalized);
}

/**
 * Normalize CAC number (uppercase, remove spaces)
 * 
 * @param cacNumber - CAC number to normalize
 * @returns normalized CAC number
 */
export function normalizeCAC(cacNumber: string): string {
  if (!cacNumber || typeof cacNumber !== "string") return "";
  return cacNumber.trim().toUpperCase().replace(/\s/g, "");
}

/**
 * Validate Nigerian phone number format
 * Formats accepted:
 * - 11 digits starting with 0: 08012345678
 * - 13 digits with country code: +2348012345678
 * - 10 digits without leading 0: 8012345678 (normalized)
 * 
 * @param phoneNumber - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidNigerianPhone(phoneNumber: string): boolean {
  if (!phoneNumber || typeof phoneNumber !== "string") return false;
  
  // Remove spaces, dashes, and parentheses
  const normalized = phoneNumber.trim().replace(/[\s\-()]/g, "");
  
  // Check for 11 digits starting with 0
  if (/^0[789]\d{9}$/.test(normalized)) return true;
  
  // Check for 13 digits with country code
  if (/^\+234[789]\d{9}$/.test(normalized)) return true;
  
  // Check for 10 digits (without leading 0, normalized)
  if (/^[789]\d{9}$/.test(normalized)) return true;
  
  return false;
}

/**
 * Normalize Nigerian phone number to standard format (0XXXXXXXXXX)
 * 
 * @param phoneNumber - Phone number to normalize
 * @returns normalized phone number
 */
export function normalizeNigerianPhone(phoneNumber: string): string {
  if (!phoneNumber || typeof phoneNumber !== "string") return "";
  
  // Remove spaces, dashes, and parentheses
  let normalized = phoneNumber.trim().replace(/[\s\-()]/g, "");
  
  // Convert +234 to 0
  if (normalized.startsWith("+234")) {
    normalized = "0" + normalized.substring(4);
  }
  
  // Ensure starts with 0
  if (!normalized.startsWith("0") && /^[789]\d{9}$/.test(normalized)) {
    normalized = "0" + normalized;
  }
  
  return normalized;
}

/**
 * Validate VAT Registration Number format
 * VRN format: Typically numeric, 8-12 digits
 * 
 * @param vrn - VAT Registration Number to validate
 * @returns true if valid, false otherwise
 */
export function isValidVRN(vrn: string): boolean {
  if (!vrn || typeof vrn !== "string") return false;
  
  const normalized = vrn.trim().replace(/[\s-]/g, "");
  
  // VRN must be 8-12 digits
  return /^\d{8,12}$/.test(normalized);
}

/**
 * Normalize VAT Registration Number
 * 
 * @param vrn - VRN to normalize
 * @returns normalized VRN
 */
export function normalizeVRN(vrn: string): string {
  if (!vrn || typeof vrn !== "string") return "";
  return vrn.trim().replace(/[\s-]/g, "");
}

/**
 * Check if company requires VAT registration based on turnover
 * NRS (Nigeria Revenue Service) requires VAT registration for companies with turnover ≥ ₦25M
 *
 * @param annualTurnover - Annual turnover amount
 * @returns true if VAT registration is required
 */
export function requiresVATRegistration(annualTurnover?: number): boolean {
  if (!annualTurnover || annualTurnover === 0) return false;
  return annualTurnover >= NRS_VAT_TURNOVER_THRESHOLD_2026; // ₦25M threshold (2026 Act for VAT Registration)
}

/**
 * Check if company requires TIN based on turnover
 * NRS (Nigeria Revenue Service) requires TIN for VAT-registered companies (turnover ≥ ₦25M)
 *
 * @param annualTurnover - Annual turnover amount
 * @returns true if TIN is required
 */
export function requiresTIN(annualTurnover?: number): boolean {
  return requiresVATRegistration(annualTurnover);
}








