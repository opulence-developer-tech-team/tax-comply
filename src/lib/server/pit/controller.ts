import { Types } from "mongoose";
import { pitService } from "./service";
import { ICreatePITRemittance, IUpdatePITRemittance, ICreatePITEmploymentDeductions, IUpdatePITEmploymentDeductions } from "./interface";
import { utils } from "../utils";
import { logger } from "../utils/logger";
import { MessageResponse } from "../utils/enum";

class PITController {
  /**
   * Get PIT summary for a tax year
   * Creates/updates summary if it doesn't exist
   */
  async getPITSummary(
    userId: Types.ObjectId,
    accountId: string,
    taxYear: number
  ) {
    try {
      // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (taxYear < 2026 || taxYear > 2100) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }
      
      // Validate accountId matches userId for individual accounts
      if (accountId !== userId.toString()) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: "You can only view your own PIT summary",
          data: null,
        });
      }

      // CRITICAL FIX: getPITSummary always creates/returns a summary if missing,
      // so it should never return null. However, we keep this check for safety
      // in case updatePITSummary throws an error or fails unexpectedly.
      const summary = await pitService.getPITSummary(
        new Types.ObjectId(accountId),
        taxYear
      );

      if (!summary) {
        // This should never happen, but handle it gracefully
        logger.error("PIT summary is null after getPITSummary", new Error("PIT summary returned null"), {
          accountId,
          taxYear,
        });
        return utils.customResponse({
          status: 500,
          message: MessageResponse.Error,
          description: "Failed to create PIT summary. Please try again.",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "PIT summary retrieved successfully",
        data: summary,
      });
    } catch (error: any) {
      logger.error("Error getting PIT summary", error, {
        userId: userId.toString(),
        accountId,
        taxYear,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve PIT summary",
        data: null,
      });
    }
  }

  /**
   * Update PIT summary for a tax year
   * Recalculates all PIT values
   */
  async updatePITSummary(
    userId: Types.ObjectId,
    accountId: string,
    taxYear: number
  ) {
    try {
      // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (taxYear < 2026 || taxYear > 2100) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }
      
      // CRITICAL: On-the-fly calculation
      // Re-use getPITSummary as it now calculates fresh data every time
      return await this.getPITSummary(userId, accountId, taxYear);
    } catch (error: any) {
      logger.error("Error updating PIT summary", error, {
        userId: userId.toString(),
        accountId,
        taxYear,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to update PIT summary",
        data: null,
      });
    }
  }

  /**
   * Create PIT remittance record
   */
  async createPITRemittance(
    userId: Types.ObjectId,
    data: ICreatePITRemittance
  ) {
    try {
      // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (data.taxYear < 2026 || data.taxYear > 2100) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }
      
      // Validate accountId matches userId for individual accounts
      if (data.accountId !== userId.toString()) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: "You can only create remittances for your own account",
          data: null,
        });
      }

      const remittance = await pitService.createPITRemittance(data);

      return utils.customResponse({
        status: 201,
        message: MessageResponse.Success,
        description: "PIT remittance created successfully",
        data: remittance,
      });
    } catch (error: any) {
      logger.error("Error creating PIT remittance", error, {
        userId: userId.toString(),
        accountId: data.accountId,
        taxYear: data.taxYear,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to create PIT remittance",
        data: null,
      });
    }
  }

  /**
   * Get PIT remittances for a tax year
   */
  async getPITRemittances(
    userId: Types.ObjectId,
    accountId: string,
    taxYear: number
  ) {
    try {
      // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (taxYear < 2026 || taxYear > 2100) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }
      
      // Validate accountId matches userId for individual accounts
      if (accountId !== userId.toString()) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: "You can only view your own PIT remittances",
          data: null,
        });
      }

      const remittances = await pitService.getPITRemittances(
        new Types.ObjectId(accountId),
        taxYear
      );

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "PIT remittances retrieved successfully",
        data: remittances,
      });
    } catch (error: any) {
      logger.error("Error getting PIT remittances", error, {
        userId: userId.toString(),
        accountId,
        taxYear,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve PIT remittances",
        data: null,
      });
    }
  }

  /**
   * Get all PIT remittances for an account
   */
  async getAllPITRemittances(userId: Types.ObjectId, accountId: string) {
    try {
      // Validate accountId matches userId for individual accounts
      if (accountId !== userId.toString()) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: "You can only view your own PIT remittances",
          data: null,
        });
      }

      const remittances = await pitService.getAllPITRemittances(
        new Types.ObjectId(accountId)
      );

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "PIT remittances retrieved successfully",
        data: remittances,
      });
    } catch (error: any) {
      logger.error("Error getting all PIT remittances", error, {
        userId: userId.toString(),
        accountId,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve PIT remittances",
        data: null,
      });
    }
  }

  /**
   * Update PIT remittance record
   */
  async updatePITRemittance(
    userId: Types.ObjectId,
    remittanceId: string,
    accountId: string,
    updateData: IUpdatePITRemittance
  ) {
    try {
      // Validate accountId matches userId for individual accounts
      if (accountId !== userId.toString()) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: "You can only update remittances for your own account",
          data: null,
        });
      }

      // Validate remittanceId format
      if (!Types.ObjectId.isValid(remittanceId)) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid remittance ID format",
          data: null,
        });
      }

      const remittance = await pitService.updatePITRemittance(
        new Types.ObjectId(remittanceId),
        new Types.ObjectId(accountId),
        updateData
      );

      if (!remittance) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Remittance not found or you don't have permission to update it",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "PIT remittance updated successfully",
        data: remittance,
      });
    } catch (error: any) {
      logger.error("Error updating PIT remittance", error, {
        userId: userId.toString(),
        remittanceId,
        accountId,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to update PIT remittance",
        data: null,
      });
    }
  }

  /**
   * Delete PIT remittance record
   */
  async deletePITRemittance(
    userId: Types.ObjectId,
    remittanceId: string,
    accountId: string
  ) {
    try {
      // Validate accountId matches userId for individual accounts
      if (accountId !== userId.toString()) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: "You can only delete remittances for your own account",
          data: null,
        });
      }

      // Validate remittanceId format
      if (!Types.ObjectId.isValid(remittanceId)) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid remittance ID format",
          data: null,
        });
      }

      const deleted = await pitService.deletePITRemittance(
        new Types.ObjectId(remittanceId),
        new Types.ObjectId(accountId)
      );

      if (!deleted) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Remittance not found or you don't have permission to delete it",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "PIT remittance deleted successfully",
        data: null,
      });
    } catch (error: any) {
      logger.error("Error deleting PIT remittance", error, {
        userId: userId.toString(),
        remittanceId,
        accountId,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to delete PIT remittance",
        data: null,
      });
    }
  }

  /**
   * Get employment deductions for a tax year
   */
  async getEmploymentDeductions(
    userId: Types.ObjectId,
    accountId: string,
    taxYear: number
  ) {
    try {
      // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (taxYear < 2026 || taxYear > 2100) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }
      
      // Validate accountId matches userId for individual accounts
      if (accountId !== userId.toString()) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: "You can only view your own employment deductions",
          data: null,
        });
      }

      const deductions = await pitService.getEmploymentDeductions(
        new Types.ObjectId(accountId),
        taxYear
      );

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Employment deductions retrieved successfully",
        data: deductions,
      });
    } catch (error: any) {
      logger.error("Error getting employment deductions", error, {
        userId: userId.toString(),
        accountId,
        taxYear,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve employment deductions",
        data: null,
      });
    }
  }

  /**
   * Create or update employment deductions for a tax year
   */
  async upsertEmploymentDeductions(
    userId: Types.ObjectId,
    data: ICreatePITEmploymentDeductions
  ) {
    try {
      // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (data.taxYear < 2026 || data.taxYear > 2100) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }
      
      // Validate accountId matches userId for individual accounts
      if (data.accountId !== userId.toString()) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: "You can only create/update employment deductions for your own account",
          data: null,
        });
      }

      // Validate values are non-negative
      if (
        data.annualPension < 0 ||
        data.annualNHF < 0 ||
        data.annualNHIS < 0 ||
        (data.annualHousingLoanInterest !== undefined && data.annualHousingLoanInterest < 0) ||
        (data.annualLifeInsurance !== undefined && data.annualLifeInsurance < 0) ||
        (data.annualRentRelief !== undefined && data.annualRentRelief < 0)
      ) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Deduction amounts cannot be negative",
          data: null,
        });
      }
      
      // CRITICAL: Validate rent relief calculation (2026+)
      // Rent relief = 20% of annual rent, capped at ₦500,000 per Nigeria Tax Act 2025
      if (data.taxYear >= 2026) {
        if (data.annualRent !== undefined && data.annualRent < 0) {
          return utils.customResponse({
            status: 400,
            message: MessageResponse.Error,
            description: "Annual rent cannot be negative",
            data: null,
          });
        }
        // If annualRent is provided, calculate and validate rent relief
        if (data.annualRent !== undefined && data.annualRent > 0) {
          const calculatedRentRelief = Math.min(data.annualRent * 0.20, 500000);
          // If annualRentRelief is also provided, ensure it matches the calculated value
          if (data.annualRentRelief !== undefined && Math.abs(data.annualRentRelief - calculatedRentRelief) > 0.01) {
            return utils.customResponse({
              status: 400,
              message: MessageResponse.Error,
              description: `Rent relief must be 20% of annual rent (₦${(data.annualRent * 0.20).toLocaleString()}), capped at ₦500,000. Calculated relief: ₦${calculatedRentRelief.toLocaleString()}`,
              data: null,
            });
          }
        }
        // If annualRentRelief is provided without annualRent, reject it
        if (data.annualRentRelief !== undefined && data.annualRentRelief > 0 && (data.annualRent === undefined || data.annualRent === 0)) {
          return utils.customResponse({
            status: 400,
            message: MessageResponse.Error,
            description: "Annual rent is required to calculate rent relief. Please provide annualRent.",
            data: null,
          });
        }
      }

      // Validate: if source is "other", sourceOther must be provided
      if (data.source === "other" && (!data.sourceOther || data.sourceOther.trim() === "")) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Please specify the source when selecting 'Other'",
          data: null,
        });
      }

      const deductions = await pitService.upsertEmploymentDeductions(data);

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Employment deductions saved successfully",
        data: deductions,
      });
    } catch (error: any) {
      logger.error("Error upserting employment deductions", error, {
        userId: userId.toString(),
        accountId: data.accountId,
        taxYear: data.taxYear,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to save employment deductions",
        data: null,
      });
    }
  }

  /**
   * Update employment deductions for a tax year
   */
  async updateEmploymentDeductions(
    userId: Types.ObjectId,
    accountId: string,
    taxYear: number,
    updateData: IUpdatePITEmploymentDeductions
  ) {
    try {
      // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (taxYear < 2026 || taxYear > 2100) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }
      
      // Validate accountId matches userId for individual accounts
      if (accountId !== userId.toString()) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: "You can only update employment deductions for your own account",
          data: null,
        });
      }

      // Validate values are non-negative if provided
      if (
        (updateData.annualPension !== undefined && updateData.annualPension < 0) ||
        (updateData.annualNHF !== undefined && updateData.annualNHF < 0) ||
        (updateData.annualNHIS !== undefined && updateData.annualNHIS < 0) ||
        (updateData.annualHousingLoanInterest !== undefined && updateData.annualHousingLoanInterest < 0) ||
        (updateData.annualLifeInsurance !== undefined && updateData.annualLifeInsurance < 0) ||
        (updateData.annualRentRelief !== undefined && updateData.annualRentRelief < 0)
      ) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Deduction amounts cannot be negative",
          data: null,
        });
      }
      
      // CRITICAL: Validate rent relief calculation (2026+)
      // Rent relief = 20% of annual rent, capped at ₦500,000 per Nigeria Tax Act 2025
      if (taxYear >= 2026) {
        // If annualRent is being updated, validate it
        if (updateData.annualRent !== undefined && updateData.annualRent < 0) {
          return utils.customResponse({
            status: 400,
            message: MessageResponse.Error,
            description: "Annual rent cannot be negative",
            data: null,
          });
        }
        // If annualRent is provided, calculate rent relief
        if (updateData.annualRent !== undefined && updateData.annualRent > 0) {
          const calculatedRentRelief = Math.min(updateData.annualRent * 0.20, 500000);
          // If annualRentRelief is also provided, ensure it matches
          if (updateData.annualRentRelief !== undefined && Math.abs(updateData.annualRentRelief - calculatedRentRelief) > 0.01) {
            return utils.customResponse({
              status: 400,
              message: MessageResponse.Error,
              description: `Rent relief must be 20% of annual rent (₦${(updateData.annualRent * 0.20).toLocaleString()}), capped at ₦500,000. Calculated relief: ₦${calculatedRentRelief.toLocaleString()}`,
              data: null,
            });
          }
        }
        // Reject direct annualRentRelief updates without annualRent
        if (updateData.annualRentRelief !== undefined && updateData.annualRentRelief > 0 && (updateData.annualRent === undefined || updateData.annualRent === 0)) {
          return utils.customResponse({
            status: 400,
            message: MessageResponse.Error,
            description: "Annual rent is required to calculate rent relief. Please provide annualRent.",
            data: null,
          });
        }
      }

      // Validate: if source is being updated to "other" or is already "other", sourceOther must be provided
      const finalSource = updateData.source !== undefined ? updateData.source : null;
      if (finalSource === "other") {
        // Source is being set to "other"
        if (!updateData.sourceOther || updateData.sourceOther.trim() === "") {
          return utils.customResponse({
            status: 400,
            message: MessageResponse.Error,
            description: "Please specify the source when selecting 'Other'",
            data: null,
          });
        }
      } else if (finalSource === null) {
        // Source is not being updated - check if existing source is "other"
        const existingDeductions = await pitService.getEmploymentDeductions(
          new Types.ObjectId(accountId),
          taxYear
        );
        if (existingDeductions?.source === "other") {
          // Existing source is "other" - ensure sourceOther is not being removed
          if (updateData.sourceOther !== undefined && (!updateData.sourceOther || updateData.sourceOther.trim() === "")) {
            return utils.customResponse({
              status: 400,
              message: MessageResponse.Error,
              description: "Cannot remove source description when source is 'Other'. Please provide a description.",
              data: null,
            });
          }
        }
      }

      const deductions = await pitService.updateEmploymentDeductions(
        new Types.ObjectId(accountId),
        taxYear,
        updateData
      );

      if (!deductions) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Employment deductions not found",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Employment deductions updated successfully",
        data: deductions,
      });
    } catch (error: any) {
      logger.error("Error updating employment deductions", error, {
        userId: userId.toString(),
        accountId,
        taxYear,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to update employment deductions",
        data: null,
      });
    }
  }

  /**
   * Delete employment deductions for a tax year
   */
  async deleteEmploymentDeductions(
    userId: Types.ObjectId,
    accountId: string,
    taxYear: number
  ) {
    try {
      // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (taxYear < 2026 || taxYear > 2100) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          data: null,
        });
      }
      
      // Validate accountId matches userId for individual accounts
      if (accountId !== userId.toString()) {
        return utils.customResponse({
          status: 403,
          message: MessageResponse.Error,
          description: "You can only delete employment deductions for your own account",
          data: null,
        });
      }

      const deleted = await pitService.deleteEmploymentDeductions(
        new Types.ObjectId(accountId),
        taxYear
      );

      if (!deleted) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Employment deductions not found",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Employment deductions deleted successfully",
        data: null,
      });
    } catch (error: any) {
      logger.error("Error deleting employment deductions", error, {
        userId: userId.toString(),
        accountId,
        taxYear,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to delete employment deductions",
        data: null,
      });
    }
  }
}

export const pitController = new PITController();

