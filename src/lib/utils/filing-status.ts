/**
 * Client-Safe Filing Status Enum
 * 
 * This enum matches the server-side FilingStatus enum
 * and can be safely used in client components.
 */

export enum FilingStatus {
  NotFiled = "not_filed",
  Filed = "filed",
  Overdue = "overdue"
}

