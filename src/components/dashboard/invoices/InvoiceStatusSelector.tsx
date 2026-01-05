"use client";

import { InvoiceStatus, getInvoiceStatusLabel, getCreateStatusOptions } from "./statusUtils";
import { ModalMode } from "@/lib/utils/client-enums";

export interface InvoiceStatusSelectorProps {
  value: InvoiceStatus;
  onChange: (value: InvoiceStatus) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  /**
   * Context: ModalMode.Create | ModalMode.Edit
   * Determines which statuses are available based on application rules
   */
  context: ModalMode;
  /**
   * Current status (required for edit context to enforce transition rules)
   */
  currentStatus?: InvoiceStatus;
  /**
   * Label for the field
   */
  label?: string;
  /**
   * Whether the field is required
   */
  required?: boolean;
}

/**
 * Production-ready Invoice Status Selector Component
 * 
 * Application Rules:
 * - On CREATE: "pending" or "paid" allowed (default: "pending")
 * - On EDIT: All statuses can be changed (removed immutability restriction)
 *   - Allows corrections and data updates for all invoice statuses
 */
export function InvoiceStatusSelector({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  context,
  currentStatus,
  label = "Invoice Status",
  required = false,
}: InvoiceStatusSelectorProps) {
  // Get available statuses based on context and application rules
  const getAvailableStatuses = (): InvoiceStatus[] => {
    if (context === ModalMode.Create) {
      // Use the centralized allowedOnCreate flag from statusUtils
      // This ensures consistency and makes it easy to change application rules
      const createOptions = getCreateStatusOptions();
      return createOptions.map(option => option.value);
    }

    // Edit context - enforce status transition rules
    if (!currentStatus) {
      // Fallback: if current status unknown, allow all except invalid transitions
      return Object.values(InvoiceStatus);
    }

    // Normalize currentStatus to handle both enum values and string values
    const normalizedStatus = typeof currentStatus === 'string' 
      ? currentStatus.toLowerCase() as InvoiceStatus
      : currentStatus;

    // All invoices can have their status changed (removed immutability restriction)
    // This allows corrections and data updates for all invoice statuses
    return Object.values(InvoiceStatus);
  };

  const availableStatuses = getAvailableStatuses();
  // All invoices can be edited (removed immutability restriction)
  const isImmutable = false;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {isImmutable && (
          <span className="ml-2 text-xs text-slate-500 italic">
            (Cannot be changed)
          </span>
        )}
      </label>
      
      <select
        value={value}
        onChange={(e) => {
          const newValue = e.target.value as InvoiceStatus;
          // Validate the transition is allowed
          if (availableStatuses.includes(newValue)) {
            onChange(newValue);
          }
        }}
        onBlur={onBlur}
        disabled={disabled || isImmutable}
        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium transition-all ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-emerald-100"
        } ${
          disabled || isImmutable
            ? "opacity-60 cursor-not-allowed bg-slate-50"
            : "cursor-pointer hover:border-emerald-200"
        }`}
        aria-label={label}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? "status-error" : undefined}
      >
        {availableStatuses.map((status) => (
          <option key={status} value={status}>
            {getInvoiceStatusLabel(status)}
          </option>
        ))}
      </select>

      {error && (
        <p id="status-error" className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Help text for application rules */}
      {context === ModalMode.Create && (
        <p className="mt-1 text-xs text-slate-500">
          💡 Choose "Pending" for invoices awaiting payment, or "Paid" for cash sales, immediate payments, or historical data entry.
        </p>
      )}
      
      {context === ModalMode.Edit && (
        <p className="mt-1 text-xs text-slate-500">
          💡 You can change the invoice status to reflect the current payment state.
        </p>
      )}
    </div>
  );
}

