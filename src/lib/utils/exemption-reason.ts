/**
 * Client-Safe Exemption Reason Enum
 * 
 * This enum matches the server-side ExemptionReason enum
 * and can be safely used in client components.
 */

export enum ExemptionReason {
  Threshold = "threshold",
  NoIncome = "no_income",
  DeductionsOnly = "deductions_only"
}

