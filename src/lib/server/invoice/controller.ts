import { Types } from "mongoose";
import { invoiceService } from "./service";
import { ICreateInvoice } from "./interface";
import { utils } from "../utils";
import { MessageResponse, InvoiceStatus, SubscriptionPlan, SubscriptionStatus, AccountType } from "../utils/enum";
import { logger } from "../utils/logger";
import { requireAuth } from "../middleware/auth";
import { Subscription, UsageLimit } from "../subscription/entity";
import { SUBSCRIPTION_PRICING } from "../subscription/service";

class InvoiceController {
  /**
   * Check invoice creation limit for a user
   * CRITICAL: Limits are user-based, not company-based, to match subscription model
   * This ensures users can't bypass limits by creating multiple companies
   * 
   * @param userId - User ID (subscriptions are user-based)
   * @param month - Month to check (1-12)
   * @param year - Year to check
   * @returns Limit check result with upgrade info if needed
   */
  private async checkInvoiceLimit(
    userId: Types.ObjectId,
    month: number,
    year: number
  ): Promise<{ 
    allowed: boolean; 
    message?: string;
    upgradeRequired?: {
      feature: string;
      currentPlan: string;
      requiredPlan: string;
      requiredPlanPrice: number;
      reason: "usage_limit_reached";
      usageInfo: {
        current: number;
        limit: number;
        period: "month";
      };
    };
  }> {
    // Get user's subscription (subscriptions are user-based, not company-based)
    // CRITICAL: Use subscriptionService.getSubscription() to handle edge cases:
    // - Creates free subscription if none exists
    // - Handles expired subscriptions correctly
    // - Works for both individual and company accounts
    const { subscriptionService } = await import("../subscription/service");
    const subscription = await subscriptionService.getSubscription(userId);

    // Accountant plan has unlimited invoices
    if (subscription?.plan === SubscriptionPlan.Premium) {
      return { allowed: true };
    }

    const freePlanLimit = SUBSCRIPTION_PRICING[SubscriptionPlan.Free].features.invoicesPerMonth;
    const currentPlan = subscription?.plan?.toLowerCase() || "free";

    // Check usage limit (user-based, aggregates across all companies)
    const usage = await UsageLimit.findOne({ userId, month, year });
    const currentCount = usage?.invoicesCreated || 0;

    // Check if user has active subscription with unlimited invoices
    const hasUnlimitedInvoices = subscription && 
                                 subscription.status === SubscriptionStatus.Active && 
                                 subscription.plan !== SubscriptionPlan.Free &&
                                 SUBSCRIPTION_PRICING[subscription.plan].features.invoicesPerMonth === -1;

    if (hasUnlimitedInvoices) {
      return { allowed: true };
    }

    // For Free plan or inactive subscription, check limit
    if (!subscription || subscription.status !== SubscriptionStatus.Active || subscription.plan === SubscriptionPlan.Free) {
      if (currentCount >= freePlanLimit) {
        return {
          allowed: false,
          message: `You've reached your monthly invoice limit (${freePlanLimit} invoices). Upgrade to Starter plan (₦3,500/month) for unlimited invoices.`,
          upgradeRequired: {
            feature: "unlimited_invoices",
            currentPlan,
            requiredPlan: "starter",
            requiredPlanPrice: 3500,
            reason: "usage_limit_reached",
            usageInfo: {
              current: currentCount,
              limit: freePlanLimit,
              period: "month",
            },
          },
        };
      }
    }

    return { allowed: true };
  }

  public async createInvoice(
    userId: Types.ObjectId,
    companyId: Types.ObjectId,
    invoiceData: ICreateInvoice,
    accountType?: AccountType
  ) {
    try {
      if (invoiceData.companyId.toString() !== companyId.toString()) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Company ID mismatch.",
          data: null,
        });
      }

      const now = new Date();
      // CRITICAL: Pass userId, not companyId - limits are user-based
      const limitCheck = await this.checkInvoiceLimit(
        userId,
        now.getMonth() + 1,
        now.getFullYear()
      );

      if (!limitCheck.allowed) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: limitCheck.message || "Invoice limit reached",
          data: {
            upgradeRequired: limitCheck.upgradeRequired,
            usageInfo: limitCheck.upgradeRequired?.usageInfo,
          },
        });
      }

      const invoice = await invoiceService.createInvoice(invoiceData, accountType);

      // Determine invoice limit based on user's subscription (user-based, not company-based)
      // CRITICAL: Use subscriptionService.getSubscription() for consistency
      const { subscriptionService } = await import("../subscription/service");
      const subscription = await subscriptionService.getSubscription(userId);
      const freePlanLimit = SUBSCRIPTION_PRICING[SubscriptionPlan.Free].features.invoicesPerMonth;
      let invoiceLimit: number = freePlanLimit;
      
      if (subscription && subscription.status === SubscriptionStatus.Active) {
        const pricing = SUBSCRIPTION_PRICING[subscription.plan];
        invoiceLimit = pricing.features.invoicesPerMonth === -1 ? 999999 : pricing.features.invoicesPerMonth;
      }

      // CRITICAL: Update user's usage limit (not company-specific)
      // This ensures limits apply across all companies owned by the user
      const usage = await UsageLimit.findOneAndUpdate(
        {
          userId, // User-based, not company-based
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        {
          $inc: { invoicesCreated: 1 },
          $setOnInsert: {
            invoicesLimit: invoiceLimit, 
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      return utils.customResponse({
        status: 201,
        message: MessageResponse.Success,
        description: "Invoice created successfully.",
        data: invoice,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // CRITICAL: specific error handling for user-facing validation/compliance errors
      const errorMessage = err.message;
      const isUserError = 
        errorMessage.includes("VAT Compliance Error") || 
        errorMessage.includes("Compliance Notice") || 
        errorMessage.includes("Invalid VAT amount") ||
        errorMessage.includes("Invalid WHT") ||
        errorMessage.includes("WHT amount is required") ||
        errorMessage.includes("This application only supports tax years");

      if (isUserError) {
        logger.warn("User validation error in createInvoice", { error: errorMessage });
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: errorMessage,
          data: null,
        });
      }

      logger.error("Error creating invoice", err, {
        userId: userId.toString(),
        companyId: companyId.toString(),
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to create invoice. Please try again.",
        data: null,
      });
    }
  }

  /**
   * Get public invoice for guest viewing (no auth required)
   * SECURITY: Validates invoice exists and is not cancelled
   */
  public async getPublicInvoice(invoiceId: Types.ObjectId) {
    try {
      const result = await invoiceService.getPublicInvoice(invoiceId);

      if (!result.invoice || !result.company) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Invoice not found or not available for viewing.",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Invoice retrieved successfully.",
        data: {
          invoice: result.invoice,
          company: result.company,
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error getting public invoice", err, { invoiceId: invoiceId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve invoice.",
        data: null,
      });
    }
  }

  public async getInvoice(invoiceId: Types.ObjectId) {
    try {
      const invoice = await invoiceService.getInvoiceById(invoiceId);

      if (!invoice) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Invoice not found.",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Invoice retrieved successfully.",
        data: invoice,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error getting invoice", err, { invoiceId: invoiceId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve invoice.",
        data: null,
      });
    }
  }

  public async getCompanyInvoices(
    companyId: Types.ObjectId,
    filters?: {
      status?: InvoiceStatus;
      startDate?: Date;
      endDate?: Date;
      year?: number;
      month?: number;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const result = await invoiceService.getCompanyInvoices(companyId, {
        status: filters?.status,
        year: filters?.year,
        month: filters?.month,
        search: filters?.search,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        limit,
        skip,
      });

      // Get aggregated totals for all matching invoices (not just current page)
      // CRITICAL: Only calculate totals for PAID invoices (financial summaries should only include revenue received)
      // The invoice list above returns ALL statuses, but totals only count paid invoices
      const totals = await invoiceService.getInvoiceTotals(
        companyId,
        {
          // Don't pass status filter - we want to filter to paid only for financial calculations
          year: filters?.year,
          month: filters?.month,
          search: filters?.search,
          startDate: filters?.startDate,
          endDate: filters?.endDate,
        },
        true // includeOnlyPaid = true (default, but explicit for clarity)
      );

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Invoices retrieved successfully.",
        data: {
          invoices: result.invoices,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit),
          },
          totals: {
            subtotal: totals.subtotal,
            vatAmount: totals.vatAmount,
            total: totals.total,
            count: totals.count,
          },
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error getting company invoices", err, {
        companyId: companyId.toString(),
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve invoices.",
        data: null,
      });
    }
  }

  public async updateInvoice(
    userId: Types.ObjectId,
    invoiceId: Types.ObjectId,
    updateData: Partial<ICreateInvoice>,
    accountType?: AccountType
  ) {
    try {
      // Verify invoice exists and user has permission (check ownership via company)
      const existingInvoice = await invoiceService.getInvoiceById(invoiceId);
      if (!existingInvoice) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Invoice not found.",
          data: null,
        });
      }

      // All invoices can be edited (removed pending-only restriction)
      // Note: Editing paid/cancelled invoices is allowed for corrections and data updates

      // Ensure companyId matches (security check)
      if (updateData.companyId && updateData.companyId.toString() !== existingInvoice.companyId.toString()) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Cannot change the company associated with an invoice.",
          data: null,
        });
      }

      // Preserve companyId from existing invoice
      const invoiceData: Partial<ICreateInvoice> = {
        ...updateData,
        companyId: existingInvoice.companyId,
      };

      const updatedInvoice = await invoiceService.updateInvoice(invoiceId, invoiceData, accountType);

      if (!updatedInvoice) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Invoice not found.",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Invoice updated successfully.",
        data: updatedInvoice,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // CRITICAL: specific error handling for user-facing validation/compliance errors
      const errorMessage = err.message;
      const isUserError = 
        errorMessage.includes("VAT Compliance Error") || 
        errorMessage.includes("Compliance Notice") || 
        errorMessage.includes("Invalid VAT amount") ||
        errorMessage.includes("Invalid WHT") ||
        errorMessage.includes("WHT amount is required") ||
        errorMessage.includes("This application only supports tax years");

      if (isUserError) {
        logger.warn("User validation error in updateInvoice", { error: errorMessage });
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: errorMessage,
          data: null,
        });
      }

      logger.error("Error updating invoice", err, {
        userId: userId.toString(),
        invoiceId: invoiceId.toString(),
      });

      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to update invoice. Please try again.",
        data: null,
      });
    }
  }

  public async updateInvoiceStatus(
    invoiceId: Types.ObjectId,
    status: InvoiceStatus
  ) {
    try {
      const invoice = await invoiceService.updateInvoiceStatus(invoiceId, status);

      if (!invoice) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Invoice not found.",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Invoice status updated successfully.",
        data: invoice,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error updating invoice status", err, {
        invoiceId: invoiceId.toString(),
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to update invoice status.",
        data: null,
      });
    }
  }
}

export const invoiceController = new InvoiceController();

