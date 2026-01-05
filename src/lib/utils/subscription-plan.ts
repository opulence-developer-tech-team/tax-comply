/**
 * Client-Safe Subscription Plan Enum
 * 
 * This enum matches the server-side SubscriptionPlan enum
 * and can be safely used in client components.
 */

export enum SubscriptionPlan {
  Free = "free",
  Starter = "starter",
  Standard = "standard",
  Premium = "premium"
}
