/**
 * Client-Safe PIT Remittance Status Enum
 * 
 * This enum matches the server-side PITRemittanceStatus enum
 * and can be safely used in client components.
 */

export enum PITRemittanceStatus {
  Pending = "pending",
  Remitted = "remitted",
  Verified = "verified"
}

