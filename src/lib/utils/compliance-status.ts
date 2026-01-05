/**
 * Client-Safe Compliance Status Enum
 * 
 * This enum matches the server-side ComplianceStatus enum
 * and can be safely used in client components.
 */

export enum ComplianceStatus {
  Compliant = "compliant",
  AtRisk = "at_risk",
  NonCompliant = "non_compliant"
}

