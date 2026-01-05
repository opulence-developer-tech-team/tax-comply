/**
 * Client-Safe User Role Enum
 * 
 * This enum matches the server-side UserRole enum
 * and can be safely used in client components.
 */

export enum UserRole {
  Owner = "owner",
  Accountant = "accountant",
  Staff = "staff",
  Admin = "admin",
  User = "user"
}

