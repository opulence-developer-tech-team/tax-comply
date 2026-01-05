import { Types } from "mongoose";
import { Subscription, Payment, UsageLimit } from "./entity";
import { ISubscription, IPayment } from "./interface";
import { SubscriptionPlan, PaymentStatus, PaymentMethod, SubscriptionStatus, BillingCycle } from "../utils/enum";
import { logger } from "../utils/logger";
import { companyService } from "../company/service";
import { businessService } from "../business/service";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
export { SUBSCRIPTION_PRICING };

// export const SUBSCRIPTION_PRICING = {
//   [SubscriptionPlan.Free]: {
//     monthly: 0,
//     yearly: 0,
//     features: {
//       invoicesPerMonth: 5, // Reduced from 10 - create urgency to upgrade
//       vatTracking: true,
//       whtTracking: false, // WHT management requires Starter+ plan
//       payroll: false,
//       multiUser: false,
//       exports: false,
//       watermark: true,
//       expenseTracking: true,
//       expensesPerMonth: 30, // Reduced from 50 - ~1 expense/day, enough to test but not enough to run a company
//       realTimeTaxCalculation: true,
//       monthlyProfitTracking: true,
//       individualAccounts: true,
//       multipleAccounts: false,
//       maxCompanies: 1, // Only 1 company allowed on free plan
//       maxBusinesses: 1, // Only 1 business allowed on free plan
//       // Individual PIT (Personal Income Tax) features
//       pitTracking: true, // Basic PIT tracking (view liability) - available on all plans
//       pitReturns: false, // PIT return generation requires Starter+ plan
//       pitRemittance: false, // PIT remittance tracking requires Starter+ plan
//       incomeSources: 3, // Free plan: 3 income sources (employment, company, other)
//       // Company CIT (Company Income Tax) features
//       citTracking: true, // Basic CIT tracking (view liability) - available on all plans
//       citRemittance: false, // CIT remittance tracking requires Starter+ plan
//       // VAT (Value Added Tax) features
//       vatRemittance: false, // VAT remittance tracking requires Starter+ plan
//     },
//   },
//   [SubscriptionPlan.Starter]: {
//     monthly: 3500, // Reduced from 4000 - psychological pricing (₦3,500 feels cheaper than ₦4,000)
//     yearly: 35000, // 17% discount (was 40000, now better value perception)
//     features: {
//       invoicesPerMonth: -1, 
//       vatTracking: true,
//       whtTracking: true, // WHT management and remittance tracking
//       payroll: false,
//       multiUser: false,
//       exports: true,
//       watermark: false,
//       expenseTracking: true,
//       expensesPerMonth: 500, // Increased from 200 - ~16/day, better for growing companies
//       realTimeTaxCalculation: true,
//       monthlyProfitTracking: true,
//       individualAccounts: true,
//       multipleAccounts: false,
//       maxCompanies: 1, // Only 1 company allowed on starter plan - upgrade incentive
//       maxBusinesses: 1, // Only 1 business allowed on starter plan - upgrade incentive
//       // Individual PIT (Personal Income Tax) features
//       pitTracking: true, // PIT tracking and compliance dashboard
//       pitReturns: true, // PIT return PDF generation
//       pitRemittance: true, // PIT remittance tracking
//       incomeSources: 10, // Starter plan: 10 income sources
//       // Company CIT (Company Income Tax) features
//       citTracking: true, // CIT tracking and compliance dashboard
//       citRemittance: true, // CIT remittance tracking
//       // VAT (Value Added Tax) features
//       vatRemittance: true, // VAT remittance tracking
//     },
//   },
//   [SubscriptionPlan.Standard]: {
//     monthly: 8500, // Reduced from 12000 - fills the gap, 2.4x Starter instead of 3x
//     yearly: 85000, // 17% discount - better value
//     features: {
//       invoicesPerMonth: -1,
//       vatTracking: true,
//       whtTracking: true, // WHT management and remittance tracking
//       payroll: true,
//       multiUser: false, // Multi-user not yet implemented - removed from pricing
//       exports: true,
//       watermark: false,
//       expenseTracking: true,
//       expensesPerMonth: -1, // Unlimited expenses
//       realTimeTaxCalculation: true,
//       monthlyProfitTracking: true,
//       individualAccounts: true,
//       multipleAccounts: true, // Can manage multiple company accounts
//       maxCompanies: 3, // Limit to 3 companies - creates upgrade incentive
//       maxBusinesses: 3, // Limit to 3 businesses - creates upgrade incentive
//       // Individual PIT (Personal Income Tax) features
//       pitTracking: true, // PIT tracking and compliance dashboard
//       pitReturns: true, // PIT return PDF generation
//       pitRemittance: true, // PIT remittance tracking
//       incomeSources: -1, // Company plan: Unlimited income sources
//       // Company CIT (Company Income Tax) features
//       citTracking: true, // CIT tracking and compliance dashboard
//       citRemittance: true, // CIT remittance tracking
//       // VAT (Value Added Tax) features
//       vatRemittance: true, // VAT remittance tracking
//     },
//   },
//   [SubscriptionPlan.Premium]: {
//     monthly: 25000, // Reduced from 50000 - more realistic for Nigerian market, still premium
//     yearly: 250000, // 17% discount - better value proposition
//     features: {
//       invoicesPerMonth: -1,
//       vatTracking: true,
//       whtTracking: true, // WHT management and remittance tracking
//       payroll: true,
//       multiUser: false, // Multi-user not yet implemented - removed from pricing
//       exports: true,
//       watermark: false,
//       multipleCompanies: true,
//       whiteLabel: false, // White-label not yet implemented - removed from pricing
//       allFeatures: true,
//       allPages: true,
//       expenseTracking: true,
//       expensesPerMonth: -1, // Unlimited expenses
//       realTimeTaxCalculation: true,
//       monthlyProfitTracking: true,
//       individualAccounts: true,
//       multipleAccounts: true,
//       maxCompanies: -1, // Unlimited companies for accountants/agencies
//       maxBusinesses: -1, // Unlimited businesses for accountants/agencies
//       advancedReporting: false, // Advanced reporting not yet implemented - removed from pricing
//       expenseCategories: -1, // Unlimited categories
//       // Individual PIT (Personal Income Tax) features
//       pitTracking: true, // PIT tracking and compliance dashboard
//       pitReturns: true, // PIT return PDF generation
//       pitRemittance: true, // PIT remittance tracking
//       incomeSources: -1, // Accountant plan: Unlimited income sources
//       // Company CIT (Company Income Tax) features
//       citTracking: true, // CIT tracking and compliance dashboard
//       citRemittance: true, // CIT remittance tracking
//       // VAT (Value Added Tax) features
//       vatRemittance: true, // VAT remittance tracking
//     },
//   },
// };

class SubscriptionService {
  async getOrCreateFreeSubscription(userId: Types.ObjectId) {
    let subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      const now = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); 

      subscription = new Subscription({
        userId,
        plan: SubscriptionPlan.Free,
        billingCycle: BillingCycle.Monthly,
        amount: 0,
        status: SubscriptionStatus.Active,
        startDate: now,
        endDate,
      });

      await subscription.save();
    }

    return subscription;
  }

  /**
   * Calculate bonus days from remaining time in current subscription
   * Returns 0 if no active subscription or if subscription has expired
   * 
   * Edge cases handled:
   * - Expired subscriptions: 0 bonus
   * - Cancelled subscriptions: 0 bonus
   * - Same day upgrade: 0 bonus (no time remaining)
   * - Last day upgrade: 0 bonus (endDate is same as upgradeDate)
   * - Negative time: 0 bonus (safety check)
   */
  private calculateBonusDays(
    currentSubscription: ISubscription | null,
    upgradeDate: Date
  ): number {
    // No current subscription = new user, no bonus
    if (!currentSubscription) {
      return 0;
    }

    // Subscription expired, cancelled, or not active = no bonus
    if (
      currentSubscription.status !== SubscriptionStatus.Active ||
      currentSubscription.endDate <= upgradeDate
    ) {
      return 0;
    }

    // Calculate remaining time in milliseconds
    const remainingTime = currentSubscription.endDate.getTime() - upgradeDate.getTime();
    
    // Safety check: negative time means subscription already expired
    if (remainingTime <= 0) {
      return 0;
    }

    // Calculate remaining days (rounded up to include partial day)
    // Using Math.ceil ensures even 1 hour remaining = 1 day bonus
    const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

    // Only give bonus if there are remaining days (should always be > 0 at this point, but safety check)
    return remainingDays > 0 ? remainingDays : 0;
  }

  /**
   * Check if this is an upgrade (moving to a higher tier plan)
   * Plan hierarchy: Free < Starter < Company < Accountant
   * 
   * Returns true only if newPlan is higher than currentPlan
   * Returns false for:
   * - Same plan (no upgrade)
   * - Downgrade (lower plan)
   * - Invalid plans
   */
  private isUpgrade(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan): boolean {
    const planHierarchy: Record<SubscriptionPlan, number> = {
      [SubscriptionPlan.Free]: 0,
      [SubscriptionPlan.Starter]: 1,
      [SubscriptionPlan.Standard]: 2,
      [SubscriptionPlan.Premium]: 3,
    };

    // Safety check: ensure both plans are valid
    if (
      !(currentPlan in planHierarchy) ||
      !(newPlan in planHierarchy)
    ) {
      logger.warn("Invalid plan comparison", {
        currentPlan,
        newPlan,
      });
      return false;
    }

    // Only return true if new plan is strictly higher
    return planHierarchy[newPlan] > planHierarchy[currentPlan];
  }

  async createSubscription(
    userId: Types.ObjectId,
    plan: SubscriptionPlan,
    billingCycle: BillingCycle
  ): Promise<ISubscription> {
    const pricing = SUBSCRIPTION_PRICING[plan];
    const amount = billingCycle === BillingCycle.Monthly ? pricing.monthly : pricing.yearly;

    const now = new Date();
    
    // Get current subscription to calculate bonus days
    const currentSubscription = await Subscription.findOne({ userId });
    
    // Calculate bonus days for mid-cycle upgrades
    let bonusDays = 0;
    let previousPlan: SubscriptionPlan | undefined = undefined;
    
    if (
      currentSubscription &&
      currentSubscription.status === SubscriptionStatus.Active &&
      currentSubscription.endDate > now &&
      this.isUpgrade(currentSubscription.plan, plan)
    ) {
      // This is a mid-cycle upgrade - calculate bonus days
      bonusDays = this.calculateBonusDays(currentSubscription, now);
      previousPlan = currentSubscription.plan;
      
      logger.info("Mid-cycle upgrade detected", {
        userId: userId.toString(),
        previousPlan: currentSubscription.plan,
        newPlan: plan,
        bonusDays,
        remainingDays: Math.ceil(
          (currentSubscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      });
    }

    // Calculate base end date (standard billing cycle)
    const endDate = new Date(now);
    if (billingCycle === BillingCycle.Monthly) {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Add bonus days to end date (extend subscription)
    // CRITICAL: Only extend if bonusDays > 0 to avoid date manipulation errors
    if (bonusDays > 0) {
      endDate.setDate(endDate.getDate() + bonusDays);
      
      // Safety check: ensure endDate is valid after manipulation
      if (isNaN(endDate.getTime())) {
        logger.error("Invalid endDate after bonus days calculation", new Error("Invalid endDate"), {
          userId: userId.toString(),
          plan,
          billingCycle,
          bonusDays,
          originalEndDate: endDate.toISOString(),
        });
        // Fallback: recalculate without bonus days
        const fallbackEndDate = new Date(now);
        if (billingCycle === BillingCycle.Monthly) {
          fallbackEndDate.setMonth(fallbackEndDate.getMonth() + 1);
        } else {
          fallbackEndDate.setFullYear(fallbackEndDate.getFullYear() + 1);
        }
        endDate.setTime(fallbackEndDate.getTime());
      }
    }

    const subscription = await Subscription.findOneAndUpdate(
      { userId },
      {
        plan,
        billingCycle,
        amount,
        status: SubscriptionStatus.Active,
        startDate: now,
        endDate,
        nextBillingDate: endDate,
        bonusDays: bonusDays > 0 ? bonusDays : undefined,
        previousPlan: previousPlan || undefined,
      },
      {
        upsert: true,
        new: true,
      }
    );

    logger.info("Subscription created/updated", {
      userId: userId.toString(),
      plan,
      billingCycle,
      bonusDays: bonusDays > 0 ? bonusDays : undefined,
      previousPlan: previousPlan || undefined,
      endDate: endDate.toISOString(),
    });

    return subscription;
  }

  /**
   * Calculate upgrade information before payment
   * Returns bonus days and messaging for frontend display
   */
  async calculateUpgradeInfo(
    userId: Types.ObjectId,
    newPlan: SubscriptionPlan,
    billingCycle: BillingCycle
  ): Promise<{
    hasBonus: boolean;
    bonusDays: number;
    previousPlan?: SubscriptionPlan;
    newEndDate: Date;
    standardEndDate: Date;
    message: string;
  }> {
    const currentSubscription = await Subscription.findOne({ userId });
    const now = new Date();

    // Calculate standard end date (without bonus)
    const standardEndDate = new Date(now);
    if (billingCycle === BillingCycle.Monthly) {
      standardEndDate.setMonth(standardEndDate.getMonth() + 1);
    } else {
      standardEndDate.setFullYear(standardEndDate.getFullYear() + 1);
    }

    // Check if this is a mid-cycle upgrade
    if (
      !currentSubscription ||
      currentSubscription.status !== SubscriptionStatus.Active ||
      currentSubscription.endDate <= now ||
      !this.isUpgrade(currentSubscription.plan, newPlan)
    ) {
      // No bonus - new subscription or not an upgrade
      return {
        hasBonus: false,
        bonusDays: 0,
        newEndDate: standardEndDate,
        standardEndDate,
        message: "",
      };
    }

    // Calculate bonus days
    const bonusDays = this.calculateBonusDays(currentSubscription, now);
    
    if (bonusDays === 0) {
      return {
        hasBonus: false,
        bonusDays: 0,
        newEndDate: standardEndDate,
        standardEndDate,
        message: "",
      };
    }

    // Calculate new end date with bonus
    const newEndDate = new Date(standardEndDate);
    newEndDate.setDate(newEndDate.getDate() + bonusDays);
    
    // Safety check: ensure newEndDate is valid
    if (isNaN(newEndDate.getTime())) {
      logger.error("Invalid newEndDate after bonus calculation", new Error("Invalid newEndDate"), {
        userId: userId.toString(),
        newPlan,
        billingCycle,
        bonusDays,
        standardEndDate: standardEndDate.toISOString(),
      });
      // Fallback: use standard end date
      newEndDate.setTime(standardEndDate.getTime());
    }

    // Create user-friendly message
    const planNames = {
      [SubscriptionPlan.Free]: "Free",
      [SubscriptionPlan.Starter]: "Starter",
      [SubscriptionPlan.Standard]: "Company",
      [SubscriptionPlan.Premium]: "Accountant",
    };

    const message = `🎉 Bonus! You have ${bonusDays} day${bonusDays > 1 ? "s" : ""} remaining on your ${planNames[currentSubscription.plan]} plan. We're adding ${bonusDays} extra day${bonusDays > 1 ? "s" : ""} to your new ${planNames[newPlan]} subscription as a bonus!`;

    return {
      hasBonus: true,
      bonusDays,
      previousPlan: currentSubscription.plan,
      newEndDate,
      standardEndDate,
      message,
    };
  }

  async getSubscription(userId: Types.ObjectId) {
    let subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      subscription = await this.getOrCreateFreeSubscription(userId);
      return subscription;
    } else {
      if (subscription.endDate < new Date() && subscription.status === SubscriptionStatus.Active) {
        subscription.status = SubscriptionStatus.Expired;
        await subscription.save();

        subscription = await this.getOrCreateFreeSubscription(userId);
        return subscription;
      }
    }

    return subscription;
  }

  async hasFeatureAccess(
    userId: Types.ObjectId,
    feature: keyof typeof SUBSCRIPTION_PRICING[SubscriptionPlan.Free]["features"]
  ): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    if (!subscription) return false;

    if (subscription.plan === SubscriptionPlan.Premium) {
      return true;
    }

    const pricing = SUBSCRIPTION_PRICING[subscription.plan];
    return pricing.features[feature] === true || pricing.features[feature] === -1;
  }

  async createPayment(
    userId: Types.ObjectId,
    subscriptionId: Types.ObjectId,
    amount: number,
    paymentMethod: PaymentMethod,
    companyId?: Types.ObjectId, // Optional: for tracking which company the payment was for
    paystackReference?: string,
    paystackTransactionId?: string,
    monnifyTransactionReference?: string,
    monnifyPaymentReference?: string
  ): Promise<IPayment> {
    const payment = new Payment({
      userId,
      companyId: companyId || null,
      subscriptionId,
      amount,
      currency: "NGN",
      paymentMethod,
      paystackReference: paystackReference || "",
      paystackTransactionId: paystackTransactionId || "",
      monnifyTransactionReference: monnifyTransactionReference || "",
      monnifyPaymentReference: monnifyPaymentReference || "",
      status: PaymentStatus.Pending,
    });

    await payment.save();
    return payment;
  }

  async updatePaymentStatus(
    paymentId: Types.ObjectId,
    status: PaymentStatus,
    paystackTransactionId?: string,
    monnifyTransactionReference?: string
  ): Promise<IPayment | null> {
    const update: any = { status };
    if (paystackTransactionId) {
      update.paystackTransactionId = paystackTransactionId;
    }
    if (monnifyTransactionReference) {
      update.monnifyTransactionReference = monnifyTransactionReference;
    }
    if (status === PaymentStatus.Completed) {
      update.paidAt = new Date();
    }

    return await Payment.findByIdAndUpdate(paymentId, update, { new: true });
  }

  async cancelSubscription(userId: Types.ObjectId): Promise<ISubscription | null> {
    const subscription = await Subscription.findOneAndUpdate(
      { userId },
      { status: SubscriptionStatus.Cancelled },
      { new: true }
    );

    if (subscription) {
      await this.getOrCreateFreeSubscription(userId);
    }

    return subscription;
  }

  async checkCompanyLimit(userId: Types.ObjectId): Promise<{ allowed: boolean; message?: string; currentCount?: number; limit?: number }> {
    // Get all companies owned by this user
    const userCompanies = await companyService.getCompaniesByOwner(userId);
    const currentCount = userCompanies.length;

    // Get the user's subscription (subscriptions are now per-user, not per-company)
    const subscription = await this.getSubscription(userId);
    const userPlan = subscription?.plan || SubscriptionPlan.Free;

    const pricing = SUBSCRIPTION_PRICING[userPlan];
    const limit = pricing.features.maxCompanies as number | undefined;

    // If no limit specified or limit is -1 (unlimited), allow
    if (limit === undefined || limit === -1) {
      return { allowed: true, currentCount, limit: -1 };
    }

    // Check if user has reached the limit
    if (currentCount >= limit) {
      let upgradeMessage = '';
      if (userPlan === SubscriptionPlan.Free || userPlan === SubscriptionPlan.Starter) {
        upgradeMessage = 'Upgrade to Company plan (₦8,500/month) to manage up to 3 companies.';
      } else if (userPlan === SubscriptionPlan.Standard) {
        upgradeMessage = 'Upgrade to Accountant plan (₦25,000/month) for unlimited companies.';
      }
      
      return {
        allowed: false,
        message: `You've reached your company limit (${limit} ${limit === 1 ? 'company' : 'companies'}). ${upgradeMessage}`,
        currentCount,
        limit,
      };
    }

    return { allowed: true, currentCount, limit };
  }

  async checkBusinessLimit(userId: Types.ObjectId): Promise<{ allowed: boolean; message?: string; currentCount?: number; limit?: number }> {
    // Get all businesses owned by this user
    const userBusinesses = await businessService.getBusinessesByOwner(userId);
    const currentCount = userBusinesses.length;

    // Get the user's subscription (subscriptions are now per-user, not per-business)
    const subscription = await this.getSubscription(userId);
    const userPlan = subscription?.plan || SubscriptionPlan.Free;

    const pricing = SUBSCRIPTION_PRICING[userPlan];
    const limit = pricing.features.maxBusinesses as number | undefined;

    // If no limit specified or limit is -1 (unlimited), allow
    if (limit === undefined || limit === -1) {
      return { allowed: true, currentCount, limit: -1 };
    }

    // Check if user has reached the limit
    if (currentCount >= limit) {
      let upgradeMessage = '';
      if (userPlan === SubscriptionPlan.Free || userPlan === SubscriptionPlan.Starter) {
        upgradeMessage = 'Upgrade to Company plan (₦8,500/month) to manage up to 3 businesses.';
      } else if (userPlan === SubscriptionPlan.Standard) {
        upgradeMessage = 'Upgrade to Accountant plan (₦25,000/month) for unlimited businesses.';
      }
      
      return {
        allowed: false,
        message: `You've reached your business limit (${limit} ${limit === 1 ? 'business' : 'businesses'}). ${upgradeMessage}`,
        currentCount,
        limit,
      };
    }

    return { allowed: true, currentCount, limit };
  }
}

export const subscriptionService = new SubscriptionService();

