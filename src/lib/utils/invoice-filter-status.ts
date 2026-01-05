/**
 * Invoice Filter Status Enum
 * Used for filtering invoices by status
 */

export enum InvoiceFilterStatus {
  All = "all",
  Pending = "pending",
  Paid = "paid",
  Cancelled = "cancelled"
}

// Type alias for backward compatibility (can be removed later if not needed)
// Note: "all" is now part of InvoiceFilterStatus enum, so this type is redundant
export type InvoiceFilterStatusType = InvoiceFilterStatus;

