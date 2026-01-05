/**
 * Client-Safe Remittance Status Enum
 * 
 * This enum matches the server-side RemittanceStatus enum
 * and can be safely used in client components.
 */

export enum RemittanceStatus {
  Pending = "pending",
  Remitted = "remitted",
  Overdue = "overdue",
  Compliant = "compliant"
}

