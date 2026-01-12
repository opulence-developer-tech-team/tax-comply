/**
 * Central Referral Configuration
 * 
 * This is the SINGLE SOURCE OF TRUTH for referral commission percentage.
 * To change the commission rate, update ONLY this file.
 * 
 * IMPORTANT: This percentage is applied to subscription payments to calculate
 * referral bonuses. Changes here affect all future referral earnings.
 */

export const REFERRAL_CONFIG = {
  /**
   * Referral commission percentage (as decimal)
   * Example: 0.15 = 15% commission
   * 
   * Recommended range for startups: 10-20%
   */
  COMMISSION_PERCENTAGE: 0.15, // 15%

  /**
   * Minimum withdrawal amount (in Naira)
   * Users must accumulate at least this amount before withdrawing
   */
  MIN_WITHDRAWAL_AMOUNT: 1000, // ₦1,000

  /**
   * Maximum withdrawal amount per transaction (in Naira)
   * Set to null for unlimited
   */
  MAX_WITHDRAWAL_AMOUNT: null as number | null,

  /**
   * Pagination limits for referral data
   * CRITICAL: Prevents abuse and ensures performance
   */
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MIN_LIMIT: 1,
    MAX_LIMIT: 100, // Maximum records per page to prevent abuse
    MIN_PAGE: 1,
  },
} as const;

/**
 * Get the current referral commission percentage
 */
export function getReferralCommissionPercentage(): number {
  return REFERRAL_CONFIG.COMMISSION_PERCENTAGE;
}

/**
 * Calculate referral commission from subscription amount
 * @param subscriptionAmount - The subscription payment amount
 * @returns The commission amount
 */
export function calculateReferralCommission(subscriptionAmount: number): number {
  return Math.round(subscriptionAmount * REFERRAL_CONFIG.COMMISSION_PERCENTAGE);
}
