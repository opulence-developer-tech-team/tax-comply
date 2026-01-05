/**
 * Client-Safe Invoice Status Enum
 * 
 * This enum matches the server-side InvoiceStatus enum
 * and can be safely used in client components.
 */

export enum InvoiceStatus {
  Pending = "pending",
  Paid = "paid",
  Cancelled = "cancelled"
}

