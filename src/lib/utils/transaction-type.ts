/**
 * Client-Safe Transaction Type Enum
 * 
 * This enum matches the server-side TransactionType enum
 * and can be safely used in client components.
 */

export enum TransactionType {
  Invoice = "invoice",
  Expense = "expense",
  Manual = "manual"
}

