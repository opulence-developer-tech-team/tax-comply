/**
 * Client-side Invoice Status utilities
 * 
 * This file provides a client-side representation of the InvoiceStatus enum
 * that matches the server-side enum in @/lib/server/utils/enum
 * 
 * CRITICAL: Keep this in sync with the server-side enum!
 * 
 * IMPORTANT APPLICATION RULE:
 * Invoice status represents PAYMENT STATUS, not just workflow state.
 * - Only "Paid" invoices are included in financial calculations (revenue, VAT, totals)
 * - All statuses are shown in invoice lists for complete visibility
 * - This ensures accurate financial reporting - only money actually received counts
 */

/**
 * Invoice Status Enum (client-side)
 * Represents the PAYMENT STATUS of an invoice
 * Must match server-side enum exactly
 */
export enum InvoiceStatus {
  Pending = "pending",    // Invoice created, payment pending
  Paid = "paid",          // Payment received - ONLY this status counts in financial totals
  Cancelled = "cancelled", // Invoice cancelled, no payment expected
}

/**
 * Invoice Status Option with metadata
 */
export interface InvoiceStatusOption {
  value: InvoiceStatus;
  label: string;
  description: string;
  /**
   * Whether this status can be set during invoice creation
   */
  allowedOnCreate: boolean;
  /**
   * Whether this status is immutable once set
   */
  immutable: boolean;
}

/**
 * All invoice status options with metadata
 */
export const INVOICE_STATUS_OPTIONS: Record<InvoiceStatus, InvoiceStatusOption> = {
  [InvoiceStatus.Pending]: {
    value: InvoiceStatus.Pending,
    label: "Pending",
    description: "Invoice created, awaiting payment. Can be edited or cancelled.",
    allowedOnCreate: true,
    immutable: false,
  },
  [InvoiceStatus.Paid]: {
    value: InvoiceStatus.Paid,
    label: "Paid",
    description: "Payment received. Only paid invoices are included in financial totals. Use this for cash sales, immediate payments, or historical data entry.",
    allowedOnCreate: true, // ✅ ALLOWED: For cash sales, immediate payments, historical data entry
    immutable: false, // All invoices can be edited (removed immutability restriction)
  },
  [InvoiceStatus.Cancelled]: {
    value: InvoiceStatus.Cancelled,
    label: "Cancelled",
    description: "Invoice has been cancelled. No payment expected.",
    allowedOnCreate: false, // Cannot create invoice as cancelled - must create first, then cancel if needed
    immutable: false, // All invoices can be edited (removed immutability restriction)
  },
};

/**
 * Get human-readable label for a status
 */
export function getInvoiceStatusLabel(status: InvoiceStatus | string): string {
  const normalizedStatus = status.toLowerCase() as InvoiceStatus;
  return INVOICE_STATUS_OPTIONS[normalizedStatus]?.label || status;
}

/**
 * Get description for a status
 */
export function getInvoiceStatusDescription(status: InvoiceStatus | string): string {
  const normalizedStatus = status.toLowerCase() as InvoiceStatus;
  return INVOICE_STATUS_OPTIONS[normalizedStatus]?.description || "";
}

/**
 * Get all status options
 */
export function getInvoiceStatusOptions(): InvoiceStatusOption[] {
  return Object.values(INVOICE_STATUS_OPTIONS);
}

/**
 * Get status options allowed during creation
 */
export function getCreateStatusOptions(): InvoiceStatusOption[] {
  return getInvoiceStatusOptions().filter((option) => option.allowedOnCreate);
}

/**
 * Check if a status is immutable
 */
export function isStatusImmutable(status: InvoiceStatus | string): boolean {
  const normalizedStatus = status.toLowerCase() as InvoiceStatus;
  return INVOICE_STATUS_OPTIONS[normalizedStatus]?.immutable || false;
}

/**
 * Validate status transition
 * Returns true if transition from oldStatus to newStatus is allowed
 */
export function isValidStatusTransition(
  oldStatus: InvoiceStatus | string,
  newStatus: InvoiceStatus | string
): boolean {
  const old = oldStatus.toLowerCase() as InvoiceStatus;
  const new_ = newStatus.toLowerCase() as InvoiceStatus;

  // Same status is always valid (no change)
  if (old === new_) {
    return true;
  }

  // All status transitions are now allowed (removed immutability restriction)
  // This allows corrections and data updates for all invoice statuses
  return true;
}

/**
 * Get default status for new invoices
 */
export function getDefaultInvoiceStatus(): InvoiceStatus {
  return InvoiceStatus.Pending;
}

