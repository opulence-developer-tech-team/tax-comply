import { NRS_VAT_TURNOVER_THRESHOLD_2026, NRS_WHT_EXEMPTION_THRESHOLD_2026 } from "@/lib/constants/nrs-constants";

/**
 * NRS (Nigeria Revenue Service) Validation Utilities (Client-side)
 * These are client-side versions of NRS validators for frontend validation
 * 
 * NOTE: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 */

/**
 * Validate TIN format (client-side)
 */
export function isValidTIN(tin: string): boolean {
  if (!tin || typeof tin !== "string") return false;
  const normalized = tin.trim().replace(/[\s-]/g, "");
  return /^\d{10,12}$/.test(normalized);
}

/**
 * Validate CAC format (client-side)
 */
export function isValidCAC(cacNumber: string): boolean {
  if (!cacNumber || typeof cacNumber !== "string") return false;
  const normalized = cacNumber.trim().toUpperCase();
  return /^(RC|BN|IT)\d{6,9}$/.test(normalized);
}

/**
 * Validate Nigerian phone format (client-side)
 */
export function isValidNigerianPhone(phoneNumber: string): boolean {
  if (!phoneNumber || typeof phoneNumber !== "string") return false;
  const normalized = phoneNumber.trim().replace(/[\s\-()]/g, "");
  if (/^0[789]\d{9}$/.test(normalized)) return true;
  if (/^\+234[789]\d{9}$/.test(normalized)) return true;
  if (/^[789]\d{9}$/.test(normalized)) return true;
  return false;
}

/**
 * Validate VRN format (client-side)
 */
export function isValidVRN(vrn: string): boolean {
  if (!vrn || typeof vrn !== "string") return false;
  const normalized = vrn.trim().replace(/[\s-]/g, "");
  return /^\d{8,12}$/.test(normalized);
}

/**
 * Check if VAT registration is required
 */
export function requiresVATRegistration(annualTurnover?: number | string): boolean {
  if (!annualTurnover) return false;
  const turnover = typeof annualTurnover === "string" ? parseFloat(annualTurnover) : annualTurnover;
  if (isNaN(turnover) || turnover === 0) return false;
  return turnover >= NRS_VAT_TURNOVER_THRESHOLD_2026; // ₦25M threshold (Verified NTA 2025: Matches NRS_VAT_TURNOVER_THRESHOLD_2026)
}

/**
 * Check if TIN is required
 */
export function requiresTIN(annualTurnover?: number | string): boolean {
  if (!annualTurnover) return false;
  const turnover = typeof annualTurnover === "string" ? parseFloat(annualTurnover) : annualTurnover;
  if (isNaN(turnover) || turnover === 0) return false;
  // TIN required if > 25M (WHT Remittance becomes mandatory) OR > 25M (VAT)
  // Since 25M = 25M, we just check 25M.
  return turnover >= NRS_WHT_EXEMPTION_THRESHOLD_2026; // ₦25M threshold (Verified NTA 2025: Matches NRS_WHT_EXEMPTION_THRESHOLD_2026)
}








