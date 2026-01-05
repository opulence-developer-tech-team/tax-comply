import { Types } from "mongoose";
import { incomeService } from "./service";
import { IIncomeCreate, IIncomeUpdate } from "./interface";
import { utils } from "../utils";
import { logger } from "../utils/logger";
import { MessageResponse, AccountType } from "../utils/enum";
import { SortOrder } from "../utils/sort-order";
import { IncomeSortField } from "../../utils/client-enums";

class IncomeController {
  async createIncome(userId: Types.ObjectId, incomeData: IIncomeCreate) {
    try {
      // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      if (incomeData.taxYear < 2026) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }

      // Validate accountId matches userId for individual/business, or user has access to company
      // CRITICAL: Sole Proprietorships (Business) and Individuals use User ID as Account ID
      if (incomeData.entityType === "individual" || incomeData.entityType === "business") {
        if (incomeData.accountId !== userId.toString()) {
          return utils.customResponse({
            status: 403,
            message: MessageResponse.Error,
            description: "You can only create income for your own account",
            data: null,
          });
        }
      } else {
        // For company, verify user is the owner
        const { requireOwner } = await import("../middleware/auth");
        const isOwner = await requireOwner(userId, new Types.ObjectId(incomeData.accountId));
        if (!isOwner) {
          return utils.customResponse({
            status: 403,
            message: MessageResponse.Error,
            description: "You don't have access to this company",
            data: null,
          });
        }
      }

      // Ensure month is properly set (null for yearly, 1-12 for monthly)
      const incomeDataWithMonth = {
        ...incomeData,
        month: incomeData.month ?? null,
      };
      
      const income = await incomeService.upsertIncome(incomeDataWithMonth);

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Income saved successfully",
        data: income,
      });
    } catch (error: any) {
      logger.error("Error creating income:", error);
      console.error("Income controller error details:", {
        error: error?.message,
        stack: error?.stack,
        code: error?.code,
        name: error?.name,
      });
      
      if (error.code === 11000) {
        // Duplicate key error - income already exists for this account/tax year
        // Update it instead
        try {
          const updatedIncome = await incomeService.updateIncome(
            incomeData.accountId,
            incomeData.entityType,
            incomeData.taxYear,
            incomeData.month ?? null,
            { annualIncome: incomeData.annualIncome }
          );

          if (updatedIncome) {
            return utils.customResponse({
              status: 200,
              message: MessageResponse.Success,
              description: "Income updated successfully",
              data: updatedIncome,
            });
          }
        } catch (updateError: any) {
          logger.error("Error updating income after duplicate key error:", updateError);
          console.error("Update error:", updateError);
        }
      }

      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: error?.message || "Failed to save income",
        data: null,
      });
    }
  }

  async getIncome(
    userId: Types.ObjectId,
    accountId: string,
    entityType: AccountType,
    taxYear: number,
    month?: number | null
  ) {
    try {
      // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      if (taxYear < 2026) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }

      // Validate access
      // CRITICAL: Sole Proprietorships (Business) and Individuals use User ID as Account ID
      if (entityType === "individual" || entityType === "business") {
        if (accountId !== userId.toString()) {
          return utils.customResponse({
            status: 403,
            message: MessageResponse.Error,
            description: "You can only view your own income",
            data: null,
          });
        }
      } else {
        const { requireOwner } = await import("../middleware/auth");
        const isOwner = await requireOwner(userId, new Types.ObjectId(accountId));
        if (!isOwner) {
          return utils.customResponse({
            status: 403,
            message: MessageResponse.Error,
            description: "You don't have access to this company",
            data: null,
          });
        }
      }

      const income = await incomeService.getIncome(accountId, entityType, taxYear, month ?? null);

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Income retrieved successfully",
        data: income,
      });
    } catch (error: any) {
      logger.error("Error getting income:", error);
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve income",
        data: null,
      });
    }
  }

  async getIncomesByAccount(
    userId: Types.ObjectId,
    accountId: string,
    entityType: AccountType
  ) {
    try {
      // Validate access
      if (entityType === "individual" || entityType === "business") {
        if (accountId !== userId.toString()) {
          return utils.customResponse({
            status: 403,
            message: MessageResponse.Error,
            description: "You can only view your own income records",
            data: null,
          });
        }
      } else {
        const { requireOwner } = await import("../middleware/auth");
        const isOwner = await requireOwner(userId, new Types.ObjectId(accountId));
        if (!isOwner) {
          return utils.customResponse({
            status: 403,
            message: MessageResponse.Error,
            description: "You don't have access to this company",
            data: null,
          });
        }
      }

      const incomes = await incomeService.getIncomesByAccount(accountId, entityType);

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Income records retrieved successfully",
        data: incomes,
      });
    } catch (error: any) {
      logger.error("Error getting incomes:", error);
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve income records",
        data: null,
      });
    }
  }

  /**
   * Get incomes by account with server-side filtering, pagination, and search
   * CRITICAL: Defaults to current year for optimal performance
   * 
   * @param userId - The authenticated user ID
   * @param accountId - The account ID
   * @param entityType - "individual" or "company"
   * @param filters - Filter options including pagination, search, year, month
   */
  async getIncomesByAccountWithFilters(
    userId: Types.ObjectId,
    accountId: string,
    entityType: AccountType,
    filters?: {
      year?: number;
      month?: number | null;
      search?: string;
      page?: number;
      limit?: number;
      sortField?: IncomeSortField;
      sortOrder?: SortOrder;
    }
  ) {
    try {
      // CRITICAL: Validate year if provided - this app only supports tax years 2026 and onward
      if (filters?.year !== undefined && filters.year !== null && filters.year < 2026) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }

      // Validate access
      if (entityType === "individual" || entityType === "business") {
        if (accountId !== userId.toString()) {
          return utils.customResponse({
            status: 403,
            message: MessageResponse.Error,
            description: "You can only view your own income records",
            data: null,
          });
        }
      } else {
        const { requireOwner } = await import("../middleware/auth");
        const isOwner = await requireOwner(userId, new Types.ObjectId(accountId));
        if (!isOwner) {
          return utils.customResponse({
            status: 403,
            message: MessageResponse.Error,
            description: "You don't have access to this company",
            data: null,
          });
        }
      }

      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const result = await incomeService.getIncomesByAccountWithFilters(accountId, entityType, {
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
        description: "Income records retrieved successfully",
        data: {
          incomes: result.incomes,
          pagination,
        },
      });
    } catch (error: any) {
      logger.error("Error getting incomes with filters:", error);
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve income records",
        data: null,
      });
    }
  }

  async deleteIncome(
    userId: Types.ObjectId,
    accountId: string,
    entityType: AccountType,
    taxYear: number,
    month?: number | null
  ) {
    try {
      // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      if (taxYear < 2026) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }

      // Validate access
      // CRITICAL: Sole Proprietorships (Business) and Individuals use User ID as Account ID
      // PIT (Personal Income Tax) applies to both Individual and Business (Sole Prop) accounts
      if (entityType === "individual" || entityType === "business") {
        if (accountId !== userId.toString()) {
          return utils.customResponse({
            status: 403,
            message: MessageResponse.Error,
            description: "You can only view your own income records",
            data: null,
          });
        }
      } else {
        const { requireOwner } = await import("../middleware/auth");
        const isOwner = await requireOwner(userId, new Types.ObjectId(accountId));
        if (!isOwner) {
          return utils.customResponse({
            status: 403,
            message: MessageResponse.Error,
            description: "You don't have access to this company",
            data: null,
          });
        }
      }

      // Attempt to delete the income record
      const deleted = await incomeService.deleteIncome(
        accountId,
        entityType,
        taxYear,
        month ?? null
      );

      if (!deleted) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Income record not found",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Income deleted successfully",
        data: null,
      });
    } catch (error: any) {
      logger.error("Error deleting income:", error);
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to delete income record",
        data: null,
      });
    }
  }
}

export const incomeController = new IncomeController();

