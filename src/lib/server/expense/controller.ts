import { Types } from "mongoose";
import { expenseService } from "./service";
import { IExpenseCreate } from "./interface";
import { utils } from "../utils";
import { MessageResponse, SubscriptionPlan, SubscriptionStatus, AccountType } from "../utils/enum";
import { ExpenseSortField, SortOrder } from "@/lib/utils/client-enums";
import { logger } from "../utils/logger";
import { Subscription } from "../subscription/entity";
import { SUBSCRIPTION_PRICING } from "../subscription/service";

class ExpenseController {
  /**
   * Check if the user can create an expense based on subscription limits.
   * 
   * CRITICAL: Subscription limits apply EQUALLY to both Company and Individual accounts.
   * No account type gets special privileges or bypasses subscription limits.
   * 
   * Limits are checked per month. Deleted expenses don't count toward the limit
   * since they are hard-deleted from the database.
   * 
   * Subscription plan limits (apply to BOTH Company and Individual accounts):
   * - Free: 30 expenses/month
   * - Starter: 500 expenses/month
   * - Company: Unlimited
   * - Accountant: Unlimited
   * 
   * @param userId - The user ID (subscriptions are user-based, not company-based)
   * @param accountId - The account ID (company ID for company accounts, user ID for individual accounts)
   * @param accountType - "company" or "individual" (for logging/context only, does NOT affect limits)
   * @param month - Month (1-12) of the expense date
   * @param year - Year of the expense date
   * @returns Object with allowed boolean and optional error message
   */
  private async checkExpenseLimit(
    userId: Types.ObjectId,
    accountId: Types.ObjectId,
    accountType: AccountType,
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
    // CRITICAL FIX: Subscriptions are user-based, NOT company-based
    // Use subscriptionService.getSubscription() to handle edge cases:
    // - Creates free subscription if none exists
    // - Handles expired subscriptions correctly
    // - Works for both Company and Individual accounts
    const { subscriptionService } = await import("../subscription/service");
    const subscription = await subscriptionService.getSubscription(userId);
    
    // Determine the limit based on subscription status
    let expenseLimit: number;
    let currentPlan: string;
    
    if (!subscription || subscription.status !== SubscriptionStatus.Active) {
      // No active subscription = Free plan limits
      expenseLimit = SUBSCRIPTION_PRICING[SubscriptionPlan.Free].features.expensesPerMonth;
      currentPlan = "free";
    } else {
      const pricing = SUBSCRIPTION_PRICING[subscription.plan];
      expenseLimit = pricing.features.expensesPerMonth;
      currentPlan = subscription.plan.toLowerCase();

      // Unlimited (-1) means no limit
      if (expenseLimit === -1) {
        return { allowed: true };
      }
    }

    // Count existing expenses for this month/year (deleted expenses are automatically excluded)
    // Using efficient countDocuments instead of fetching all expenses
    const currentCount = await expenseService.countExpensesByMonth(
      userId,
      accountId.toString(),
      month,
      year
    );

    // Check if limit has been reached
    if (currentCount >= expenseLimit) {
      const planName = !subscription || subscription.status !== SubscriptionStatus.Active 
        ? "Free" 
        : subscription.plan === SubscriptionPlan.Starter 
          ? "Starter" 
          : subscription.plan;
      
      // Determine required plan and price
      const isFreePlan = expenseLimit === SUBSCRIPTION_PRICING[SubscriptionPlan.Free].features.expensesPerMonth;
      const requiredPlan = isFreePlan ? "starter" : "company";
      const requiredPlanPrice = isFreePlan 
        ? SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly 
        : SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly;
      const feature = isFreePlan ? "more_expenses" : "unlimited_expenses";

      // Log limit reached for audit
      logger.warn("Expense limit reached", {
        userId: userId.toString(),
        accountId: accountId.toString(),
        accountType,
        month,
        year,
        currentCount,
        limit: expenseLimit,
        plan: currentPlan,
        requiredPlan,
      });

      return {
        allowed: false,
        message: `You've reached your monthly expense limit (${expenseLimit} expenses for ${planName} plan). ${isFreePlan ? "Upgrade to Starter plan (₦3,500/month) for 500 expenses/month." : "Upgrade to Company plan (₦8,500/month) for unlimited expenses."}`,
        upgradeRequired: {
          feature,
          currentPlan,
          requiredPlan,
          requiredPlanPrice,
          reason: "usage_limit_reached",
          usageInfo: {
            current: currentCount,
            limit: expenseLimit,
            period: "month",
          },
        },
      };
    }

    return { allowed: true };
  }

  async createExpense(userId: Types.ObjectId, body: IExpenseCreate) {
    try {
      const date = new Date(body.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // DEBUG: Log expense creation request
      logger.info("Expense creation request received", {
        userId: userId.toString(),
        accountId: body.accountId,
        accountType: body.accountType,
        amount: body.amount,
        isTaxDeductible: body.isTaxDeductible,
        date: body.date,
        month,
        year,
        description: body.description,
        category: body.category,
        timestamp: new Date().toISOString(),
      });

      // Check expense limit
      const limitCheck = await this.checkExpenseLimit(
        userId,
        new Types.ObjectId(body.accountId),
        body.accountType,
        month,
        year
      );

      if (!limitCheck.allowed) {
        logger.warn("Expense creation blocked - limit reached", {
          userId: userId.toString(),
          accountId: body.accountId,
          accountType: body.accountType,
          month,
          year,
          upgradeRequired: limitCheck.upgradeRequired,
        });
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: limitCheck.message || "Expense limit reached",
          data: {
            upgradeRequired: limitCheck.upgradeRequired,
            usageInfo: limitCheck.upgradeRequired?.usageInfo,
          },
        });
      }

      const expense = await expenseService.createExpense(userId, body);

      // DEBUG: Log successful expense creation
      logger.info("Expense created successfully", {
        expenseId: expense._id?.toString(),
        userId: userId.toString(),
        accountId: body.accountId,
        accountType: body.accountType,
        companyId: expense.companyId?.toString(),
        amount: expense.amount,
        vatAmount: expense.vatAmount,
        isTaxDeductible: expense.isTaxDeductible,
        month: expense.month,
        year: expense.year,
        timestamp: new Date().toISOString(),
      });

      return utils.customResponse({
        status: 201,
        message: MessageResponse.Success,
        description: "Expense created successfully",
        data: expense,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error creating expense", err, {
        userId: userId.toString(),
        accountId: body.accountId,
        accountType: body.accountType,
        amount: body.amount,
        timestamp: new Date().toISOString(),
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to create expense",
        data: null,
      });
    }
  }

  async getExpenses(
    userId: Types.ObjectId,
    accountId: string,
    filters?: {
      category?: string;
      year?: number;
      month?: number;
      search?: string;
      page?: number;
      limit?: number;
      sortField?: ExpenseSortField;
      sortOrder?: SortOrder;
    }
  ) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const result = await expenseService.getExpensesByAccount(userId, accountId, {
        category: filters?.category,
        year: filters?.year,
        month: filters?.month,
        search: filters?.search,
        limit,
        skip,
        sortField: filters?.sortField,
        sortOrder: filters?.sortOrder,
      });

      const pagination = {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit) || 1,
      };

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Expenses retrieved successfully",
        data: {
          expenses: result.expenses,
          pagination,
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error fetching expenses", err, { userId: userId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to fetch expenses",
        data: null,
      });
    }
  }

  async getExpenseById(userId: Types.ObjectId, expenseId: string) {
    try {
      // Validate expense ID format
      if (!Types.ObjectId.isValid(expenseId)) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid expense ID format",
          data: null,
        });
      }

      const expense = await expenseService.getExpenseById(
        userId,
        new Types.ObjectId(expenseId)
      );

      if (!expense) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Expense not found",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Expense retrieved successfully",
        data: expense,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error fetching expense by ID", err, {
        userId: userId.toString(),
        expenseId,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to fetch expense",
        data: null,
      });
    }
  }

  async getExpenseSummary(userId: Types.ObjectId, accountId: string, year: number, month?: number) {
    try {
      // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      if (year < 2026) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: `Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null,
        });
      }

      const summary = await expenseService.getExpenseSummary(userId, accountId, year, month);

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Expense summary retrieved successfully",
        data: summary,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error fetching expense summary", err, { userId: userId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to fetch expense summary",
        data: null,
      });
    }
  }

  async updateExpense(userId: Types.ObjectId, expenseId: string, body: Partial<IExpenseCreate>) {
    try {
      const expense = await expenseService.updateExpense(userId, expenseId, body);

      if (!expense) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Expense not found",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Expense updated successfully",
        data: expense,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error updating expense", err, { userId: userId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to update expense",
        data: null,
      });
    }
  }

  async deleteExpense(userId: Types.ObjectId, expenseId: string) {
    try {
      const deleted = await expenseService.deleteExpense(userId, expenseId);

      if (!deleted) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Expense not found",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Expense deleted successfully",
        data: null,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error deleting expense", err, { userId: userId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to delete expense",
        data: null,
      });
    }
  }

  async getMonthlyProfit(userId: Types.ObjectId, accountId: string, month: number, year: number) {
    try {
      const profit = await expenseService.getMonthlyProfit(userId, accountId, month, year);

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Monthly profit retrieved successfully",
        data: profit,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error fetching monthly profit", err, { userId: userId.toString() });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to fetch monthly profit",
        data: null,
      });
    }
  }
}

export const expenseController = new ExpenseController();





