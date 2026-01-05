/**
 * Client-Safe Subscription Status Enum
 * 
 * This enum matches the server-side SubscriptionStatus enum
 * and can be safely used in client components.
 */

export enum SubscriptionStatus {
  Active = "active",
  Cancelled = "cancelled",
  Expired = "expired",
  Trial = "trial"
}

