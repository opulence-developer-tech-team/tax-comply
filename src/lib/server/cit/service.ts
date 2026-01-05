import { Types } from "mongoose";
import {
  ICITRemittance,
  ICreateCITRemittance,
  IUpdateCITRemittance,
} from "./remittance-interface";
import { CITRemittance } from "./remittance-entity";
import { RemittanceStatus } from "../utils/enum";
import { logger } from "../utils/logger";
import { calculateCITSummary } from "./calculation";

/**
 * CIT Service
 * Handles Company Income Tax calculations, remittances, and compliance
 * Reference: NRS (Nigeria Revenue Service) - formerly NRS (https://www.firs.gov.ng/)
 * 
 * CIT Filing Deadline: June 30 of the following year
 * CIT Remittance Deadline: June 30 of the following year (same as filing)
 * 
 * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 * NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 */
class CITService {
  /**
   * Get CIT summary (calculated on-the-fly)
   * 
   * @param companyId - Company ID
   * @param taxYear - Tax year (2026+)
   * @returns Calculated CIT summary
   */
  async getCITSummary(
    companyId: Types.ObjectId,
    taxYear: number
  ) {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (taxYear < 2026 || taxYear > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // CRITICAL: Validate companyId
    if (companyId === null || companyId === undefined) {
      throw new Error("Company ID is required but is null or undefined");
    }

    // Calculate CIT summary on-the-fly
    return await calculateCITSummary(companyId, taxYear);
  }

  /**
   * Create a new CIT remittance record
   * 
   * @param data - CIT remittance data
   * @returns Created remittance record
   */
  async createCITRemittance(
    data: ICreateCITRemittance
  ): Promise<ICITRemittance> {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (data.taxYear < 2026 || data.taxYear > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // CRITICAL: Validate required fields
    if (!data.companyId) {
      throw new Error("Company ID is required");
    }
    if (!Types.ObjectId.isValid(data.companyId)) {
      throw new Error("Invalid company ID format");
    }
    if (data.remittanceAmount === null || data.remittanceAmount === undefined) {
      throw new Error("Remittance amount is required");
    }
    if (typeof data.remittanceAmount !== "number" || isNaN(data.remittanceAmount) || !isFinite(data.remittanceAmount)) {
      throw new Error(`Invalid remittance amount: ${data.remittanceAmount}`);
    }
    if (data.remittanceAmount < 0) {
      throw new Error(`Remittance amount cannot be negative: ${data.remittanceAmount}`);
    }
    if (!data.remittanceDate) {
      throw new Error("Remittance date is required");
    }
    if (!(data.remittanceDate instanceof Date) && typeof data.remittanceDate !== "string") {
      throw new Error("Invalid remittance date format");
    }
    if (!data.remittanceReference || data.remittanceReference.trim() === "") {
      throw new Error("Remittance reference is required");
    }

    const companyId = new Types.ObjectId(data.companyId);
    const remittanceDate = data.remittanceDate instanceof Date 
      ? data.remittanceDate 
      : new Date(data.remittanceDate);

    // CRITICAL: Validate remittance date is within reasonable bounds
    // Allow dates from the start of the tax year up to the filing deadline (June 30 of the following year)
    const now = new Date();
    const taxYearStart = new Date(data.taxYear, 0, 1); // January 1 of tax year
    const filingDeadline = new Date(data.taxYear + 1, 5, 30, 23, 59, 59); // June 30 of following year
    
    // CRITICAL: Remittance date cannot be before the tax year starts
    if (remittanceDate < taxYearStart) {
      throw new Error(
        `Remittance date cannot be before the tax year starts. ` +
        `Tax year: ${data.taxYear}, Date: ${remittanceDate.toISOString()}, Tax year start: ${taxYearStart.toISOString()}`
      );
    }
    
    // CRITICAL: Remittance date cannot be more than 18 months after the tax year ends
    // (This allows up to the filing deadline + some buffer)
    if (remittanceDate > filingDeadline) {
      throw new Error(
        `Remittance date cannot be after the filing deadline. ` +
        `Tax year: ${data.taxYear}, Date: ${remittanceDate.toISOString()}, Filing deadline: ${filingDeadline.toISOString()}`
      );
    }

    // CRITICAL: For user-entered remittance records, status should be "Remitted" by default
    // This is because if a user is manually entering a remittance record, it means they have
    // already made the payment to NRS. The status indicates the payment has been remitted.
    // Individual remittance status is separate from the overall CIT compliance status
    // (which is calculated in calculateCITSummary based on total remittances vs liability).
    const remittanceStatus = RemittanceStatus.Remitted;

    // CRITICAL: Validate remittance status enum value - fail loudly if invalid
    // This should never fail for RemittanceStatus.Remitted, but we validate to be bulletproof
    if (remittanceStatus === undefined || remittanceStatus === null) {
      throw new Error(
        `CRITICAL: remittanceStatus is null or undefined. ` +
        `This should never happen. Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
      );
    }

    if (typeof remittanceStatus !== "string") {
      throw new Error(
        `CRITICAL: remittanceStatus must be a string. Received type: ${typeof remittanceStatus}, value: ${remittanceStatus}. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
      );
    }

    if (!Object.values(RemittanceStatus).includes(remittanceStatus as RemittanceStatus)) {
      throw new Error(
        `CRITICAL: Invalid remittance status: ${remittanceStatus}. ` +
        `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
      );
    }

    // Create remittance record
    const remittance = new CITRemittance({
      companyId,
      taxYear: data.taxYear,
      remittanceAmount: data.remittanceAmount,
      remittanceDate,
      remittanceReference: data.remittanceReference.trim(),
      remittanceReceipt: data.remittanceReceipt?.trim(),
      status: remittanceStatus as RemittanceStatus,
    });

    // CRITICAL: Validate the remittance object was created correctly
    if (!remittance) {
      throw new Error(
        `CRITICAL: Failed to create remittance object. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
      );
    }

    if (remittance.status === undefined || remittance.status === null) {
      throw new Error(
        `CRITICAL: Remittance object created but status is null or undefined. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
      );
    }

    if (!Object.values(RemittanceStatus).includes(remittance.status as RemittanceStatus)) {
      throw new Error(
        `CRITICAL: Remittance object created with invalid status: ${remittance.status}. ` +
        `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
      );
    }

    try {
      const savedRemittance = await remittance.save();

      // CRITICAL: Validate saved remittance has valid status
      if (!savedRemittance) {
        throw new Error(
          `CRITICAL: Remittance save returned null or undefined. ` +
          `Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
        );
      }

      if (savedRemittance.status === undefined || savedRemittance.status === null) {
        throw new Error(
          `CRITICAL: Saved remittance status is null or undefined. ` +
          `Remittance ID: ${savedRemittance._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
        );
      }

      if (!Object.values(RemittanceStatus).includes(savedRemittance.status as RemittanceStatus)) {
        throw new Error(
          `CRITICAL: Saved remittance has invalid status: ${savedRemittance.status}. ` +
          `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
          `Remittance ID: ${savedRemittance._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
        );
      }
      
      const savedRemittanceObject = savedRemittance.toObject();

      // CRITICAL: Validate toObject() returned valid data
      if (!savedRemittanceObject) {
        throw new Error(
          `CRITICAL: Remittance toObject() returned null or undefined. ` +
          `Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
        );
      }

      if (savedRemittanceObject.status === undefined || savedRemittanceObject.status === null) {
        throw new Error(
          `CRITICAL: Saved remittance object status is null or undefined. ` +
          `Remittance ID: ${savedRemittanceObject._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
        );
      }

      if (!Object.values(RemittanceStatus).includes(savedRemittanceObject.status as RemittanceStatus)) {
        throw new Error(
          `CRITICAL: Saved remittance object has invalid status: ${savedRemittanceObject.status}. ` +
          `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
          `Remittance ID: ${savedRemittanceObject._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${data.taxYear}.`
        );
      }

      logger.info("CIT remittance created", {
        companyId: companyId.toString(),
        taxYear: data.taxYear,
        remittanceId: savedRemittanceObject._id?.toString(),
        remittanceAmount: data.remittanceAmount,
        remittanceReference: data.remittanceReference,
        status: savedRemittanceObject.status,
      });

      return savedRemittanceObject;
    } catch (error: any) {
      // Handle duplicate key error (unique index violation)
      if (error.code === 11000 || error.code === 11001) {
        throw new Error(
          `A CIT remittance with this reference already exists for this company and tax year. ` +
          `Reference: ${data.remittanceReference}`
        );
      }
      throw error;
    }
  }

  /**
   * Get CIT remittances for a company
   * 
   * @param companyId - Company ID
   * @param taxYear - Tax year (optional - if not provided, returns all remittances)
   * @returns Array of remittance records
   */
  async getCITRemittances(
    companyId: Types.ObjectId,
    taxYear?: number
  ): Promise<ICITRemittance[]> {
    // CRITICAL: Validate companyId
    if (companyId === null || companyId === undefined) {
      throw new Error("Company ID is required but is null or undefined");
    }

    const query: any = { companyId };
    if (taxYear !== undefined && taxYear !== null) {
      // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (taxYear < 2026 || taxYear > 2100) {
        throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
      }
      query.taxYear = taxYear;
    }

    const remittances = await CITRemittance.find(query)
      .sort({ taxYear: -1, remittanceDate: -1 })
      .lean();

    return remittances;
  }

  /**
   * Update an existing CIT remittance record
   * 
   * @param remittanceId - Remittance record ID
   * @param companyId - Company ID (for authorization)
   * @param data - Update data
   * @returns Updated remittance record
   */
  async updateCITRemittance(
    remittanceId: string,
    companyId: Types.ObjectId,
    data: IUpdateCITRemittance
  ): Promise<ICITRemittance> {
    // CRITICAL: Validate remittanceId
    if (!remittanceId || !Types.ObjectId.isValid(remittanceId)) {
      throw new Error("Invalid remittance ID format");
    }

    // CRITICAL: Validate companyId
    if (companyId === null || companyId === undefined) {
      throw new Error("Company ID is required but is null or undefined");
    }

    // Find remittance and verify it belongs to the company
    const remittance = await CITRemittance.findOne({
      _id: new Types.ObjectId(remittanceId),
      companyId: companyId,
    });

    if (!remittance) {
      throw new Error("CIT remittance not found or does not belong to this company");
    }

    // Update fields
    if (data.remittanceDate !== undefined) {
      const remittanceDate = data.remittanceDate instanceof Date 
        ? data.remittanceDate 
        : new Date(data.remittanceDate);
      
      // CRITICAL: Validate remittance date is within reasonable bounds
      // Allow dates from the start of the tax year up to the filing deadline (June 30 of the following year)
      const taxYearStart = new Date(remittance.taxYear, 0, 1); // January 1 of tax year
      const filingDeadline = new Date(remittance.taxYear + 1, 5, 30, 23, 59, 59); // June 30 of following year
      
      // CRITICAL: Remittance date cannot be before the tax year starts
      if (remittanceDate < taxYearStart) {
        throw new Error(
          `Remittance date cannot be before the tax year starts. ` +
          `Tax year: ${remittance.taxYear}, Date: ${remittanceDate.toISOString()}, Tax year start: ${taxYearStart.toISOString()}`
        );
      }
      
      // CRITICAL: Remittance date cannot be more than 18 months after the tax year ends
      // (This allows up to the filing deadline + some buffer)
      if (remittanceDate > filingDeadline) {
        throw new Error(
          `Remittance date cannot be after the filing deadline. ` +
          `Tax year: ${remittance.taxYear}, Date: ${remittanceDate.toISOString()}, Filing deadline: ${filingDeadline.toISOString()}`
        );
      }
      
      remittance.remittanceDate = remittanceDate;
    }

    if (data.remittanceAmount !== undefined) {
      if (typeof data.remittanceAmount !== "number" || isNaN(data.remittanceAmount) || !isFinite(data.remittanceAmount)) {
        throw new Error(`Invalid remittance amount: ${data.remittanceAmount}`);
      }
      if (data.remittanceAmount < 0) {
        throw new Error(`Remittance amount cannot be negative: ${data.remittanceAmount}`);
      }
      remittance.remittanceAmount = data.remittanceAmount;
    }

    if (data.remittanceReference !== undefined) {
      if (!data.remittanceReference || data.remittanceReference.trim() === "") {
        throw new Error("Remittance reference cannot be empty");
      }
      remittance.remittanceReference = data.remittanceReference.trim();
    }

    if (data.remittanceReceipt !== undefined) {
      remittance.remittanceReceipt = data.remittanceReceipt?.trim();
    }

    if (data.status !== undefined) {
      // CRITICAL: Validate status enum value - fail loudly if invalid
      if (data.status === null) {
        throw new Error(
          `CRITICAL: Status cannot be null. Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }

      if (typeof data.status !== "string") {
        throw new Error(
          `CRITICAL: Status must be a string. Received type: ${typeof data.status}, value: ${data.status}. ` +
          `Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }

      if (data.status.trim() === "") {
        throw new Error(
          `CRITICAL: Status cannot be an empty string. Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }

      if (!Object.values(RemittanceStatus).includes(data.status as RemittanceStatus)) {
        throw new Error(
          `CRITICAL: Invalid remittance status: "${data.status}". ` +
          `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
          `Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }

      remittance.status = data.status as RemittanceStatus;

      // CRITICAL: Validate status was set correctly
      if (remittance.status === undefined || remittance.status === null) {
        throw new Error(
          `CRITICAL: Failed to set remittance status. Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }

      if (!Object.values(RemittanceStatus).includes(remittance.status as RemittanceStatus)) {
        throw new Error(
          `CRITICAL: Remittance status set to invalid value: ${remittance.status}. ` +
          `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
          `Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }
    }

    try {
      const updatedRemittance = await remittance.save();

      // CRITICAL: Validate updated remittance has valid status
      if (!updatedRemittance) {
        throw new Error(
          `CRITICAL: Remittance update save returned null or undefined. ` +
          `Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }

      if (updatedRemittance.status === undefined || updatedRemittance.status === null) {
        throw new Error(
          `CRITICAL: Updated remittance status is null or undefined. ` +
          `Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }

      if (!Object.values(RemittanceStatus).includes(updatedRemittance.status as RemittanceStatus)) {
        throw new Error(
          `CRITICAL: Updated remittance has invalid status: ${updatedRemittance.status}. ` +
          `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
          `Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }

      const updatedRemittanceObject = updatedRemittance.toObject();

      // CRITICAL: Validate toObject() returned valid data
      if (!updatedRemittanceObject) {
        throw new Error(
          `CRITICAL: Remittance toObject() returned null or undefined. ` +
          `Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }

      if (updatedRemittanceObject.status === undefined || updatedRemittanceObject.status === null) {
        throw new Error(
          `CRITICAL: Updated remittance object status is null or undefined. ` +
          `Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }

      if (!Object.values(RemittanceStatus).includes(updatedRemittanceObject.status as RemittanceStatus)) {
        throw new Error(
          `CRITICAL: Updated remittance object has invalid status: ${updatedRemittanceObject.status}. ` +
          `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
          `Remittance ID: ${remittanceId}, Company ID: ${companyId.toString()}.`
        );
      }
      
      logger.info("CIT remittance updated", {
        remittanceId: remittanceId,
        companyId: companyId.toString(),
        updatedFields: Object.keys(data),
        status: updatedRemittanceObject.status,
      });

      return updatedRemittanceObject;
    } catch (error: any) {
      // Handle duplicate key error (unique index violation)
      if (error.code === 11000 || error.code === 11001) {
        throw new Error(
          `A CIT remittance with this reference already exists for this company and tax year. ` +
          `Reference: ${data.remittanceReference || remittance.remittanceReference}`
        );
      }
      throw error;
    }
  }

  /**
   * Delete a CIT remittance record
   * 
   * @param remittanceId - Remittance record ID
   * @param companyId - Company ID (for authorization)
   */
  async deleteCITRemittance(
    remittanceId: string,
    companyId: Types.ObjectId
  ): Promise<void> {
    // CRITICAL: Validate remittanceId
    if (!remittanceId || !Types.ObjectId.isValid(remittanceId)) {
      throw new Error("Invalid remittance ID format");
    }

    // CRITICAL: Validate companyId
    if (companyId === null || companyId === undefined) {
      throw new Error("Company ID is required but is null or undefined");
    }

    // Find remittance and verify it belongs to the company
    const remittance = await CITRemittance.findOne({
      _id: new Types.ObjectId(remittanceId),
      companyId: companyId,
    });

    if (!remittance) {
      throw new Error("CIT remittance not found or does not belong to this company");
    }

    await CITRemittance.deleteOne({ _id: remittance._id });
    
    logger.info("CIT remittance deleted", {
      remittanceId: remittanceId,
      companyId: companyId.toString(),
    });
  }
}

export const citService = new CITService();

