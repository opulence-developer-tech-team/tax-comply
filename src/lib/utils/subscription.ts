/**
 * Subscription utility functions for feature gating and upgrade prompts
 */

import { UpgradeReason } from "./upgrade-reason";
import { UsagePeriod } from "./usage-period";
import { SubscriptionPlan } from "./subscription-plan";

export interface FeatureRequirement {
  feature: string;
  requiredPlan: SubscriptionPlan;
  requiredPlanPrice: number;
  reason: UpgradeReason;
  usageInfo?: {
    current: number;
    limit: number;
    period: UsagePeriod;
  };
}

/**
 * Determines which plan is required to unlock a feature
 */
export function getRequiredPlanForFeature(feature: string): SubscriptionPlan {
  const featureMap: Record<string, SubscriptionPlan> = {
    // Company limits
    "multiple_companies": SubscriptionPlan.Standard,
    "unlimited_companies": SubscriptionPlan.Premium,
    
    // Invoice features
    "unlimited_invoices": SubscriptionPlan.Starter,
    
    // Expense features
    "unlimited_expenses": SubscriptionPlan.Standard,
    "more_expenses": SubscriptionPlan.Starter, // 500/month
    
    // Payroll
    "payroll": SubscriptionPlan.Standard,
    
    // Exports
    "pdf_exports": SubscriptionPlan.Starter,
    "exports_without_watermark": SubscriptionPlan.Starter,
    
    // Multi-user
    "multi_user": SubscriptionPlan.Standard,
    
    // Advanced features
    "white_label": SubscriptionPlan.Premium,
    "advanced_reporting": SubscriptionPlan.Premium,
  };

  return featureMap[feature.toLowerCase()] || SubscriptionPlan.Starter;
}

/**
 * Gets the monthly price for a plan
 */
export function getPlanPrice(plan: SubscriptionPlan): number {
  const prices: Record<SubscriptionPlan, number> = {
    [SubscriptionPlan.Free]: 0,
    [SubscriptionPlan.Starter]: 3500,
    [SubscriptionPlan.Standard]: 8500,
    [SubscriptionPlan.Premium]: 25000,
  };
  return prices[plan] || 0;
}

/**
 * Creates upgrade metadata for API responses
 */
export function createUpgradeMetadata(
  feature: string,
  currentPlan: SubscriptionPlan = SubscriptionPlan.Free,
  reason: UpgradeReason = UpgradeReason.PlanLimitation,
  usageInfo?: { current: number; limit: number; period: UsagePeriod }
): FeatureRequirement {
  const requiredPlan = getRequiredPlanForFeature(feature);
  const requiredPlanPrice = getPlanPrice(requiredPlan);

  return {
    feature,
    requiredPlan,
    requiredPlanPrice,
    reason,
    usageInfo,
  };
}

