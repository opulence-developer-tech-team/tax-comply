import { Types } from "mongoose";
import { citService } from "./service";
import { ICreateCITRemittance, IUpdateCITRemittance } from "./remittance-interface";
import { utils } from "../utils";
import { logger } from "../utils/logger";
import { MessageResponse } from "../utils/enum";

class CITController {
  /**
   * Get CIT summary for a tax year
   * Calculates CIT on-the-fly from invoices, expenses, and remittances
   */
  async getCITSummary(
    userId: Types.ObjectId,
    companyId: string,
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

      // CRITICAL: Validate companyId format
      if (!companyId || !Types.ObjectId.isValid(companyId)) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid company ID format",
          data: null,
        });
      }

      // Calculate CIT summary on-the-fly
      console.log("[CIT_CONTROLLER] Getting CIT summary", {
        userId: userId.toString(),
        companyId,
        taxYear,
      });
      
      const summary = await citService.getCITSummary(
        new Types.ObjectId(companyId),
        taxYear
      );

      console.log("[CIT_CONTROLLER] CIT summary calculated", {
        companyId,
        taxYear,
        summary: {
          companyId: summary.companyId?.toString(),
          taxYear: summary.taxYear,
          taxClassification: summary.taxClassification,
          citRate: summary.citRate,
          citRateType: typeof summary.citRate,
          citRateIsNaN: isNaN(summary.citRate as number),
          totalRevenue: summary.totalRevenue,
          totalExpenses: summary.totalExpenses,
          taxableProfit: summary.taxableProfit,
          citBeforeWHT: summary.citBeforeWHT,
          citAfterWHT: summary.citAfterWHT,
        },
      });

      // CRITICAL: Validate summary before returning - fail loudly if invalid
      if (!summary) {
        console.error("[CIT_CONTROLLER] CRITICAL ERROR: Summary is null/undefined", {
          companyId,
          taxYear,
        });
        throw new Error(`CRITICAL: CIT summary is null or undefined. Company ID: ${companyId}, Tax Year: ${taxYear}.`);
      }

      if (typeof summary.citRate !== "number" || isNaN(summary.citRate) || !isFinite(summary.citRate)) {
        console.error("[CIT_CONTROLLER] CRITICAL ERROR: Invalid citRate in summary", {
          companyId,
          taxYear,
          citRate: summary.citRate,
          citRateType: typeof summary.citRate,
          taxClassification: summary.taxClassification,
          summary,
        });
        throw new Error(
          `CRITICAL: Invalid citRate in CIT summary: ${summary.citRate}. ` +
          `Type: ${typeof summary.citRate}. ` +
          `Tax classification: ${summary.taxClassification}. ` +
          `Company ID: ${companyId}, Tax Year: ${taxYear}.`
        );
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "CIT summary retrieved successfully",
        data: summary,
      });
    } catch (error: any) {
      logger.error("Error getting CIT summary", error, {
        userId: userId.toString(),
        companyId,
        taxYear,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: error.message || "Failed to retrieve CIT summary",
        data: null,
      });
    }
  }

  /**
   * Create a new CIT remittance record
   */
  async createCITRemittance(
    userId: Types.ObjectId,
    companyId: string,
    data: ICreateCITRemittance
  ) {
    try {
      // CRITICAL: Validate companyId format
      if (!companyId || !Types.ObjectId.isValid(companyId)) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid company ID format",
          data: null,
        });
      }

      // CRITICAL: Validate required fields
      if (!data.remittanceAmount || data.remittanceAmount < 0) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Remittance amount is required and must be >= 0",
          data: null,
        });
      }

      if (!data.remittanceDate) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Remittance date is required",
          data: null,
        });
      }

      if (!data.remittanceReference || data.remittanceReference.trim() === "") {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Remittance reference is required",
          data: null,
        });
      }

      // Create remittance
      const remittance = await citService.createCITRemittance({
        ...data,
        companyId,
      });

      return utils.customResponse({
        status: 201,
        message: MessageResponse.Success,
        description: "CIT remittance created successfully",
        data: remittance,
      });
    } catch (error: any) {
      logger.error("Error creating CIT remittance", error, {
        userId: userId.toString(),
        companyId,
        data,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: error.message || "Failed to create CIT remittance",
        data: null,
      });
    }
  }

  /**
   * Get CIT remittances for a company
   */
  async getCITRemittances(
    userId: Types.ObjectId,
    companyId: string,
    taxYear?: number
  ) {
    try {
      // CRITICAL: Validate companyId format
      if (!companyId || !Types.ObjectId.isValid(companyId)) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid company ID format",
          data: null,
        });
      }

      // Get remittances
      const remittances = await citService.getCITRemittances(
        new Types.ObjectId(companyId),
        taxYear
      );

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "CIT remittances retrieved successfully",
        data: remittances,
      });
    } catch (error: any) {
      logger.error("Error getting CIT remittances", error, {
        userId: userId.toString(),
        companyId,
        taxYear,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: error.message || "Failed to retrieve CIT remittances",
        data: null,
      });
    }
  }

  /**
   * Update an existing CIT remittance record
   */
  async updateCITRemittance(
    userId: Types.ObjectId,
    companyId: string,
    remittanceId: string,
    data: IUpdateCITRemittance
  ) {
    try {
      // CRITICAL: Validate companyId format
      if (!companyId || !Types.ObjectId.isValid(companyId)) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid company ID format",
          data: null,
        });
      }

      // CRITICAL: Validate remittanceId format
      if (!remittanceId || !Types.ObjectId.isValid(remittanceId)) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid remittance ID format",
          data: null,
        });
      }

      // Update remittance
      const remittance = await citService.updateCITRemittance(
        remittanceId,
        new Types.ObjectId(companyId),
        data
      );

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "CIT remittance updated successfully",
        data: remittance,
      });
    } catch (error: any) {
      logger.error("Error updating CIT remittance", error, {
        userId: userId.toString(),
        companyId,
        remittanceId,
        data,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: error.message || "Failed to update CIT remittance",
        data: null,
      });
    }
  }

  /**
   * Delete a CIT remittance record
   */
  async deleteCITRemittance(
    userId: Types.ObjectId,
    companyId: string,
    remittanceId: string
  ) {
    try {
      // CRITICAL: Validate companyId format
      if (!companyId || !Types.ObjectId.isValid(companyId)) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid company ID format",
          data: null,
        });
      }

      // CRITICAL: Validate remittanceId format
      if (!remittanceId || !Types.ObjectId.isValid(remittanceId)) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: "Invalid remittance ID format",
          data: null,
        });
      }

      // Delete remittance
      await citService.deleteCITRemittance(
        remittanceId,
        new Types.ObjectId(companyId)
      );

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "CIT remittance deleted successfully",
        data: null,
      });
    } catch (error: any) {
      logger.error("Error deleting CIT remittance", error, {
        userId: userId.toString(),
        companyId,
        remittanceId,
      });
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: error.message || "Failed to delete CIT remittance",
        data: null,
      });
    }
  }
}

export const citController = new CITController();

