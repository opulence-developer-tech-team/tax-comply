import { Types } from "mongoose";
import {
  IWHTRecord,
  IWHTRemittance,
  IWHTCredit,
  IWHTSummary,
  ICreateWHTRecord,
  ICreateWHTRemittance,
  IUpdateWHTRemittance,
} from "./interface";
import { WHTRecord, WHTRemittance, WHTCredit, WHTSummary } from "./entity";
import {
  calculateWHT,
  calculateNetAfterWHT,
  getWHTRate,
  WHTType,
  getTaxYear,
} from "../tax/calculator";
import { NRS_WHT_DEADLINE_DAY } from "../../constants/nrs-constants";
import { logger } from "../utils/logger";
import Company from "../company/entity";
import Business from "../business/entity";
import { AccountType, RemittanceStatus, WHTCreditStatus, TaxClassification } from "../utils/enum";
import { TransactionType } from "../utils/enum";

/**
 * WHT Service
 * Handles Withholding Tax calculations, remittances, and credits
 * Reference: NRS (Nigeria Revenue Service) - formerly NRS (https://www.nrs.gov.ng/)
 * 
 * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 * NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 */
class WHTService {
  /**
   * Create a WHT record from a payment
   * Automatically calculates WHT based on payment type and company classification
   */
  async createWHTRecord(data: ICreateWHTRecord): Promise<IWHTRecord> {
    // Parse payment date to validate year
    const paymentDate =
      typeof data.paymentDate === "string"
        ? new Date(data.paymentDate)
        : data.paymentDate;
    const year = paymentDate.getFullYear();

    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (year < 2026 || year > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // CRITICAL: Prevent duplicate WHT records for the same transaction
    // If transactionId is provided (e.g., for invoices), check if WHT record already exists
    // NOTE: We also have a unique compound index at the database level to prevent race conditions
    if (data.transactionId && data.transactionType) {
      const existingRecord = await WHTRecord.findOne({
        transactionId: data.transactionId,
        transactionType: data.transactionType,
        companyId: data.companyId,
      }).lean();

      if (existingRecord) {
        logger.warn("WHT record already exists for transaction, returning existing record", {
          transactionId: data.transactionId.toString(),
          transactionType: data.transactionType,
          companyId: data.companyId.toString(),
          existingRecordId: existingRecord._id?.toString(),
        });
        
        // CRITICAL: WHT remittances are now manually created by users, not auto-created
        // Only update summary (remittances are manually created by users)
        const month = paymentDate.getMonth() + 1;
        await this.updateWHTSummary(data.companyId, month, year);
        
        return existingRecord as IWHTRecord;
      }
    }

    // CRITICAL: Get entity (Company or Business) to determine if it's a small company (for exemption)
    // Support both Company and Business accounts for WHT record creation.
    // NOTE: We attempt to find the entity in both collections because data.accountType might refer to the Payee (Supplier)
    // while data.companyId refers to the User (Payer), so types might not match.
    let entity: any = null;
    
    // Try finding in Company collection first
    entity = await Company.findById(data.companyId).lean();
    
    // If not found, try Business collection
    if (!entity) {
      entity = await Business.findById(data.companyId).lean();
    }

    // If still not found, throw error
    if (!entity) {
      throw new Error("Company or Business not found for WHT record creation");
    }

    const taxYear = getTaxYear();
    // CRITICAL: Small company exemption applies to both Company and Business entities
    // Annual turnover is now computed from invoices, not stored
    // For classification, check taxClassification (which should be calculated from computed turnover)
    let isSmallCompany = Boolean(
      entity.taxClassification && entity.taxClassification === TaxClassification.SmallCompany
    );
    
    // CRITICAL: If taxClassification is not set, calculate it from computed turnover
    // For Company accounts, calculate from invoices
    // For Business accounts, this may require income calculation (future enhancement)
    // We check purely based on entity type found, not accountType arg which might be ambiguous
    // Check if entity has 'cacNumber' (Company) or just 'ownerId' (Business)
    const isCompanyEntity = !!entity.cacNumber;
    
    // Check turnover for BOTH Company and Business entities
    // The "Small Business" exemption (turnover <= 25M) applies to agents of collection generally under the new Act
    if (!isSmallCompany) {
      try {
        // dynamic imports to avoid circular dependencies
        const { companyService } = await import("../company/service");
        const { businessService } = await import("../business/service");
        // Import exemption threshold constant
        const { NRS_WHT_EXEMPTION_THRESHOLD_2026 } = await import("../../constants/nrs-constants");
        
        let annualTurnover = 0;

        // If we found a Company entity, use companyService
        if (isCompanyEntity) {
          annualTurnover = await companyService.calculateAnnualTurnover(data.companyId, taxYear);
        } else {
          // If Business entity, use businessService
          // NOTE: businessService.calculateAnnualTurnover expects the businessId (which is data.companyId here)
          annualTurnover = await businessService.calculateAnnualTurnover(data.companyId, taxYear);
        }

        // CRITICAL: Updated threshold to ₦25,000,000 per Deduction of Tax at Source (Withholding) Regulations 2024
        // Uses the centralized turnover calculation (Cash vs Accrual is handled by the services)
        if (annualTurnover <= NRS_WHT_EXEMPTION_THRESHOLD_2026) {
          logger.info("Entity (Company/Business) has computed turnover <= 25M, applying small business WHT exemption", {
            entityId: data.companyId.toString(),
            type: isCompanyEntity ? "Company" : "Business",
            annualTurnover,
            threshold: NRS_WHT_EXEMPTION_THRESHOLD_2026
          });
          isSmallCompany = true;
        }
      } catch (error) {
        logger.warn("Failed to calculate annual turnover for WHT exemption check", {
          entityId: data.companyId.toString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // CRITICAL: If whtAmount, whtRate, and netAmount are provided, use them directly
    // This allows callers (like invoice service) to pass pre-calculated amounts
    // that respect user's explicit choices (e.g., no exemptions when user selects WHT type)
    let whtAmount: number;
    let whtRate: number;
    let netAmount: number;
    
    if (data.whtAmount !== undefined && data.whtRate !== undefined && data.netAmount !== undefined) {
      // Use pre-calculated values (user's explicit choice - no exemptions applied)
      whtAmount = data.whtAmount;
      whtRate = data.whtRate;
      netAmount = data.netAmount;
      
      logger.info("Using pre-calculated WHT amounts (user's explicit choice - exemptions not applied)", {
        companyId: data.companyId.toString(),
        whtType: data.whtType,
        whtAmount,
        whtRate,
        netAmount,
        paymentAmount: data.paymentAmount,
      });
    } else {
      // Calculate WHT using standard logic (with exemptions)
      const isServicePayment = [
        WHTType.ProfessionalServices,
        WHTType.TechnicalServices,
        WHTType.ManagementServices,
        WHTType.OtherServices,
        WHTType.Commission,
      ].includes(data.whtType);

      // CRITICAL EXEMPTION LOGIC:
      // - If TransactionType is EXPENSE (Outgoing), 'isSmallCompany' refers to US (Payer).
      //   We CANNOT claim Supplier Exemption based on OUR status.
      //   We must assume Supplier is NOT exempt (false) unless we explicitly know otherwise.
      // - If TransactionType is INVOICE/CREDIT (Incoming), 'isSmallCompany' refers to US (Payee/Supplier).
      //   We CAN claim exemption if We are Small.
      const isExpense = data.transactionType === TransactionType.Expense;
      const isSupplierSmallCompany = isExpense ? false : isSmallCompany;

      // CRITICAL: Pass accountType (Payee Type) to calculator functions
      // This ensures correct rates (e.g. 5% vs 10%) are applied based on beneficiary type
      whtAmount = calculateWHT(
        data.paymentAmount,
        data.whtType,
        taxYear,
        isSupplierSmallCompany, // PASS CORRECTED FLAG
        isServicePayment,
        data.isNonResident,
        data.accountType // Pass payee type
      );

      whtRate = getWHTRate(data.whtType, data.isNonResident, data.accountType);
      
      netAmount = calculateNetAfterWHT(
        data.paymentAmount,
        data.whtType,
        taxYear,
        isSmallCompany,
        isServicePayment,
        data.isNonResident,
        data.accountType // Pass payee type
      );
    }

    const month = paymentDate.getMonth() + 1;

    // Create WHT record
    const whtRecord = new WHTRecord({
      companyId: data.companyId,
      accountId: data.accountId,
      accountType: data.accountType,
      transactionType: data.transactionType,
      transactionId: data.transactionId,
      payeeName: data.payeeName,
      payeeTIN: data.payeeTIN,
      paymentAmount: data.paymentAmount,
      whtType: data.whtType,
      whtRate: whtRate,
      whtAmount: whtAmount,
      netAmount: netAmount,
      paymentDate: paymentDate,
      month: month,
      year: year,
      description: data.description || "",
      notes: data.notes || "",
    });

    let savedRecord: IWHTRecord;
    try {
      await whtRecord.save();
      savedRecord = whtRecord.toObject();
    } catch (error: any) {
      // CRITICAL: Handle duplicate key error (race condition)
      // If two requests try to create the same WHT record simultaneously,
      // MongoDB will throw a duplicate key error due to the unique index
      if (error.code === 11000 || error.code === 11001) {
        // Duplicate key error - fetch the existing record
        const existingRecord = await WHTRecord.findOne({
          companyId: data.companyId,
          transactionId: data.transactionId,
          transactionType: data.transactionType,
        }).lean();

        if (existingRecord) {
          logger.warn("WHT record duplicate key error - using existing record (race condition handled)", {
            transactionId: data.transactionId?.toString(),
            transactionType: data.transactionType,
            companyId: data.companyId.toString(),
            existingRecordId: existingRecord._id?.toString(),
          });
          savedRecord = existingRecord as IWHTRecord;
          
          // CRITICAL: WHT remittances are now manually created by users, not auto-created
          // Only update summary (remittances are manually created by users)
          const paymentDate = new Date(data.paymentDate);
          const month = paymentDate.getMonth() + 1;
          const year = paymentDate.getFullYear();
          await this.updateWHTSummary(data.companyId, month, year);
          
          return savedRecord;
        }
      }
      // Re-throw if it's not a duplicate key error or if existing record not found
      throw error;
    }

    // Create WHT credit for payee (if WHT was deducted)
    // CRITICAL: The unique index on whtRecordId in WHTCredit prevents duplicate credits
    // Handle race conditions where credit might already exist
    if (whtAmount > 0 && savedRecord._id) {
      try {
        await this.createWHTCredit({
          accountId: data.accountId,
          accountType: data.accountType,
          whtRecordId: savedRecord._id,
          whtAmount: whtAmount,
          taxYear: year,
        });
      } catch (creditError: any) {
        // CRITICAL: If credit already exists (duplicate key error), log and continue
        // This can happen in race conditions - the credit was already created by another request
        if (creditError.code === 11000 || creditError.code === 11001) {
          logger.warn("WHT credit already exists for record (race condition handled)", {
            whtRecordId: savedRecord._id.toString(),
            accountId: data.accountId.toString(),
          });
        } else {
          // CRITICAL: Non-duplicate error during credit creation
          // WHT record is already saved, but credit creation failed
          // Log as critical error for manual intervention or background reconciliation
          logger.error("CRITICAL: WHT record created but credit creation failed", creditError, {
            whtRecordId: savedRecord._id.toString(),
            accountId: data.accountId.toString(),
            companyId: data.companyId.toString(),
            whtAmount,
            errorCode: creditError.code,
            actionRequired: "Manual intervention or background reconciliation needed",
          });
          // Re-throw to notify caller of partial failure
          // The WHT record exists but credit is missing - this needs to be fixed
          throw new Error(
            `WHT record created but credit creation failed: ${creditError.message}. ` +
            `WHT record ID: ${savedRecord._id}. Manual intervention required.`
          );
        }
      }
    }

    // CRITICAL: WHT remittances are now manually created by users, not auto-created
    // Removed auto-creation of remittance records - users must manually create remittances via UI
    // This gives users control over when and how they track remittances (similar to CIT remittances)
    
    // Update WHT summary (this still needs to run to calculate pending amounts)
    await this.updateWHTSummary(data.companyId, month, year);

    logger.info("WHT record created", {
      companyId: data.companyId.toString(),
      whtAmount,
      whtType: data.whtType,
      month,
      year,
    });

    // CRITICAL: Return savedRecord (from database) instead of whtRecord (in-memory)
    // This ensures we return the actual persisted record with all database-generated fields
    return savedRecord;
  }

  /**
   * Create WHT remittance record manually (user-initiated)
   * CRITICAL: Users manually create remittances with the amount they're remitting
   * Similar to CIT remittances - user has control over when and how much to remit
   * 
   * @param data - Remittance creation data
   * @returns Created remittance record
   */
  async createWHTRemittance(data: ICreateWHTRemittance): Promise<IWHTRemittance> {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (data.remittanceYear < 2026 || data.remittanceYear > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // CRITICAL: Validate month
    if (data.remittanceMonth < 1 || data.remittanceMonth > 12) {
      throw new Error(`Invalid remittance month. Month must be between 1 and 12.`);
    }

    // CRITICAL: Validate remittance amount
    if (!data.remittanceAmount || data.remittanceAmount < 0) {
      throw new Error(`Remittance amount is required and must be >= 0.`);
    }

    // CRITICAL: Validate remittance reference
    if (!data.remittanceReference || data.remittanceReference.trim() === "") {
      throw new Error(`Remittance reference is required.`);
    }

    // CRITICAL: Validate remittance date
    if (!data.remittanceDate) {
      throw new Error(`Remittance date is required.`);
    }

    const companyId = new Types.ObjectId(data.companyId);

    // Calculate remittance deadline (21st of following month)
    let deadlineYear = data.remittanceYear;
    let deadlineMonth = data.remittanceMonth + 1;
    if (deadlineMonth > 12) {
      deadlineMonth = 1;
      deadlineYear += 1;
    }
    const deadlineDate = new Date(deadlineYear, deadlineMonth - 1, NRS_WHT_DEADLINE_DAY);

    // Check if remittance already exists (one per month per company)
    const existing = await WHTRemittance.findOne({
      companyId,
      remittanceMonth: data.remittanceMonth,
      remittanceYear: data.remittanceYear,
    });

    if (existing) {
      throw new Error(
        `WHT remittance already exists for ${data.remittanceMonth}/${data.remittanceYear}. ` +
        `Only one remittance per month is allowed. Use update to modify existing remittance.`
      );
    }

    // Check if deadline has passed
    const now = new Date();
    const isOverdue = now > deadlineDate;
    const status = isOverdue ? RemittanceStatus.Overdue : RemittanceStatus.Remitted;

    // Create remittance record
    const remittance = new WHTRemittance({
      companyId,
      remittanceMonth: data.remittanceMonth,
      remittanceYear: data.remittanceYear,
      totalWHTAmount: data.remittanceAmount,
      remittanceDeadline: deadlineDate,
      remittanceDate: data.remittanceDate,
      remittanceReference: data.remittanceReference.trim(),
      remittanceReceipt: data.remittanceReceipt?.trim() || "",
      status,
    });

    const savedRemittance = await remittance.save();

    // Update summary to reflect the new remittance
    await this.updateWHTSummary(companyId, data.remittanceMonth, data.remittanceYear);

    logger.info("WHT remittance created manually", {
      companyId: companyId.toString(),
      remittanceMonth: data.remittanceMonth,
      remittanceYear: data.remittanceYear,
      remittanceAmount: data.remittanceAmount,
      status,
    });

    return savedRemittance.toObject();
  }

  /**
   * @deprecated - WHT remittances are now manually created by users
   * This method is kept for backward compatibility but should not be used
   * Use createWHTRemittance for manual creation instead
   */
  async createOrUpdateWHTRemittance(
    companyId: Types.ObjectId,
    remittanceMonth: number,
    remittanceYear: number
  ): Promise<IWHTRemittance> {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (remittanceYear < 2026 || remittanceYear > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // Calculate total WHT for the period
    const whtRecords = await WHTRecord.find({
      companyId,
      month: remittanceMonth,
      year: remittanceYear,
    }).lean();

    // CRITICAL: Calculate totalWHTAmount with null safety
    const totalWHTAmount = whtRecords.reduce(
      (sum, record) => sum + (record.whtAmount ?? 0),
      0
    );

    // Calculate remittance deadline (21st of following month)
    let deadlineYear = remittanceYear;
    let deadlineMonth = remittanceMonth + 1;
    if (deadlineMonth > 12) {
      deadlineMonth = 1;
      deadlineYear += 1;
    }
    const deadlineDate = new Date(deadlineYear, deadlineMonth - 1, NRS_WHT_DEADLINE_DAY);

    // Check if remittance is overdue
    const now = new Date();
    const isOverdue = now > deadlineDate && totalWHTAmount > 0;

    // Check if remittance already exists
    const existing = await WHTRemittance.findOne({
      companyId,
      remittanceMonth,
      remittanceYear,
    });

    let status: RemittanceStatus = RemittanceStatus.Pending;
    if (existing && existing.status === RemittanceStatus.Remitted) {
      // CRITICAL: If remittance was already marked as "remitted", preserve that status
      // Do NOT update totalWHTAmount - it represents the amount that was actually remitted
      status = RemittanceStatus.Remitted;
    } else if (isOverdue) {
      status = RemittanceStatus.Overdue;
    }

    // CRITICAL: If remittance was already marked as "remitted", preserve the original totalWHTAmount
    // This ensures we track the actual remitted amount, not the current total (which may include new records)
    // Only update totalWHTAmount if remittance is NOT already remitted
    const updateData: any = {
      remittanceDeadline: deadlineDate,
      status,
    };
    
    // Only update totalWHTAmount if remittance is NOT already remitted
    // This preserves the original remitted amount even if new WHT records are added later
    if (!existing || existing.status !== RemittanceStatus.Remitted) {
      updateData.totalWHTAmount = totalWHTAmount;
    } else {
      // Remittance already remitted - preserve original totalWHTAmount
      // Log warning if current total differs from remitted amount (new records added)
      // CRITICAL: Add null safety check for existing.totalWHTAmount
      const existingRemittedAmount = existing.totalWHTAmount || 0;
      if (Math.abs(totalWHTAmount - existingRemittedAmount) > 0.01) {
        // Use Math.abs with tolerance (0.01) to handle floating point precision issues
        logger.warn("New WHT records added after remittance was marked as remitted", {
          companyId: companyId.toString(),
          remittanceMonth,
          remittanceYear,
          originalRemittedAmount: existingRemittedAmount,
          currentTotalWHTAmount: totalWHTAmount,
          newRecordsAmount: totalWHTAmount - existingRemittedAmount,
        });
      }
    }

    // Create or update remittance record
    const remittance = await WHTRemittance.findOneAndUpdate(
      { companyId, remittanceMonth, remittanceYear },
      updateData,
      { upsert: true, new: true }
    );

    return remittance.toObject();
  }

  /**
   * Mark WHT remittance as remitted
   * CRITICAL: This method does NOT update totalWHTAmount - it preserves the amount that was calculated
   * when the remittance record was created. This ensures accurate tracking of what was actually remitted.
   */
  async markWHTRemitted(
    companyId: Types.ObjectId,
    remittanceMonth: number,
    remittanceYear: number,
    updateData: IUpdateWHTRemittance
  ): Promise<IWHTRemittance | null> {
    // CRITICAL: Get existing remittance to verify it exists and has totalWHTAmount
    const existing = await WHTRemittance.findOne({
      companyId,
      remittanceMonth,
      remittanceYear,
    });

    if (!existing) {
      logger.error("Cannot mark remittance as remitted - remittance record not found", undefined, {
        companyId: companyId.toString(),
        remittanceMonth,
        remittanceYear,
      });
      throw new Error("WHT remittance record not found. Please create remittance record first.");
    }

    // CRITICAL: Verify totalWHTAmount exists before marking as remitted
    if (!existing.totalWHTAmount || existing.totalWHTAmount <= 0) {
      logger.error("Cannot mark remittance as remitted - totalWHTAmount is invalid", undefined, {
        companyId: companyId.toString(),
        remittanceMonth,
        remittanceYear,
        totalWHTAmount: existing.totalWHTAmount,
      });
      throw new Error("Invalid WHT remittance amount. Please update remittance record with valid amount first.");
    }

    // CRITICAL: If remittanceAmount is provided, validate it
    let updatedAmount = existing.totalWHTAmount;
    if (updateData.remittanceAmount !== undefined && updateData.remittanceAmount !== null) {
      // CRITICAL: Validate remittanceAmount is a valid number
      if (typeof updateData.remittanceAmount !== "number" || isNaN(updateData.remittanceAmount) || !isFinite(updateData.remittanceAmount)) {
        throw new Error(`Invalid remittanceAmount. Must be a valid number. Received: ${updateData.remittanceAmount}`);
      }

      // CRITICAL: Validate remittanceAmount is >= 0
      if (updateData.remittanceAmount < 0) {
        throw new Error(`Invalid remittanceAmount. Must be >= 0. Received: ${updateData.remittanceAmount}`);
      }

      // CRITICAL: Allow users to reduce remittance amount (corrections allowed)
      updatedAmount = updateData.remittanceAmount;
    }

    // CRITICAL: Update remittance metadata and optionally update totalWHTAmount
    // If remittanceAmount is provided, update it (allows users to add to existing remittances)
    const updateFields: any = {
      remittanceDate: updateData.remittanceDate,
      remittanceReference: updateData.remittanceReference || "",
      remittanceReceipt: updateData.remittanceReceipt || "",
      status: RemittanceStatus.Remitted,
    };

    // Only update totalWHTAmount if a new amount was provided
    if (updateData.remittanceAmount !== undefined && updateData.remittanceAmount !== null) {
      updateFields.totalWHTAmount = updatedAmount;
    }

    const remittance = await WHTRemittance.findOneAndUpdate(
      { companyId, remittanceMonth, remittanceYear },
      updateFields,
      { new: true }
    );

    if (remittance) {
      logger.info("WHT remittance updated", {
        companyId: companyId.toString(),
        remittanceMonth,
        remittanceYear,
        oldAmount: existing.totalWHTAmount,
        newAmount: updatedAmount,
        amountChanged: updatedAmount !== existing.totalWHTAmount,
        remittanceReference: updateData.remittanceReference,
      });

      // CRITICAL: Update WHT summary after updating remittance to reflect new amount/status
      await this.updateWHTSummary(companyId, remittanceMonth, remittanceYear);
    }

    return remittance ? remittance.toObject() : null;
  }

  /**
   * Get WHT remittance record
   */
  async getWHTRemittance(
    companyId: Types.ObjectId,
    remittanceMonth: number,
    remittanceYear: number
  ): Promise<IWHTRemittance | null> {
    const remittance = await WHTRemittance.findOne({
      companyId,
      remittanceMonth,
      remittanceYear,
    }).lean();

    return remittance;
  }

  /**
   * Get all WHT remittances for a company
   */
  async getCompanyWHTRemittances(
    companyId: Types.ObjectId,
    year?: number
  ): Promise<IWHTRemittance[]> {
    const query: any = { companyId };
    if (year) {
      query.remittanceYear = year;
    }
    return await WHTRemittance.find(query)
      .sort({ remittanceYear: -1, remittanceMonth: -1 })
      .lean();
  }

  /**
   * Create WHT credit for payee
   * WHT deducted from payments becomes a tax credit for the payee
   */
  async createWHTCredit(data: {
    accountId: Types.ObjectId;
    accountType: AccountType;
    whtRecordId: Types.ObjectId;
    whtAmount: number;
    taxYear: number;
  }): Promise<IWHTCredit> {
    // Check if credit already exists (idempotency)
    const existing = await WHTCredit.findOne({
      whtRecordId: data.whtRecordId,
    });

    if (existing) {
      return existing.toObject();
    }

    const credit = new WHTCredit({
      accountId: data.accountId,
      accountType: data.accountType,
      whtRecordId: data.whtRecordId,
      whtAmount: data.whtAmount,
      taxYear: data.taxYear,
      appliedToPIT: 0,
      appliedToCIT: 0,
      remainingCredit: data.whtAmount,
      status: WHTCreditStatus.Available,
    });

    await credit.save();

    return credit.toObject();
  }

  /**
   * Get total WHT credits available for an account
   * CRITICAL: Only remitted WHT can be used as credit per Nigeria Tax Act 2025
   * Pending WHT cannot reduce tax liability
   * 
   * Used to offset PIT (individuals) or CIT (companies)
   */
  async getTotalWHTCredits(
    accountId: Types.ObjectId,
    taxYear: number
  ): Promise<number> {
    // CRITICAL: Get all available credits first
    const credits = await WHTCredit.find({
      accountId,
      taxYear,
      status: { $in: [WHTCreditStatus.Available, WHTCreditStatus.CarriedForward] },
    }).lean();

    // CRITICAL: Filter to only include credits from remitted WHT remittances
    // Only WHT that has been remitted to NRS can be used as tax credit
    let totalRemittedCredits = 0;
    
    for (const credit of credits) {
      // Get the WHT record associated with this credit
      const whtRecord = await WHTRecord.findById(credit.whtRecordId).lean();
      if (!whtRecord) {
        logger.warn("WHT credit references non-existent WHT record", {
          creditId: credit._id?.toString(),
          whtRecordId: credit.whtRecordId?.toString(),
          accountId: accountId.toString(),
          taxYear,
        });
        continue;
      }

      // Check if remittance for this WHT record's month/year is remitted
      const remittance = await WHTRemittance.findOne({
        companyId: whtRecord.companyId,
        remittanceMonth: whtRecord.month,
        remittanceYear: whtRecord.year,
        status: RemittanceStatus.Remitted,
      }).lean();

      // CRITICAL: Only count credit if remittance is remitted
      if (remittance && remittance.status === RemittanceStatus.Remitted) {
        totalRemittedCredits += credit.remainingCredit || 0;
      }
    }

    return totalRemittedCredits;
  }

  /**
   * Apply WHT credit to PIT or CIT
   * Reduces tax liability by the amount of WHT credit available
   */
  async applyWHTCredit(
    accountId: Types.ObjectId,
    accountType: AccountType,
    taxYear: number,
    taxLiability: number
  ): Promise<{
    taxLiabilityAfterCredit: number;
    creditApplied: number;
    remainingCredit: number;
  }> {
    const credits = await WHTCredit.find({
      accountId,
      taxYear,
      status: { $in: [WHTCreditStatus.Available, WHTCreditStatus.CarriedForward] },
    })
      .sort({ createdAt: 1 }) // FIFO - apply oldest credits first
      .lean();

    let remainingTaxLiability = taxLiability;
    let totalCreditApplied = 0;
    let totalOriginalRemainingCredit = 0; // Track original total for accurate calculation

    // CRITICAL: Calculate total original remaining credit BEFORE applying any credits
    // This ensures accurate calculation of remaining credit after application
    totalOriginalRemainingCredit = credits.reduce(
      (sum, credit) => sum + (credit.remainingCredit || 0),
      0
    );

    for (const credit of credits) {
      if (remainingTaxLiability <= 0) break;

      // CRITICAL: Add null safety check for remainingCredit
      const originalRemainingCredit = credit.remainingCredit || 0;
      const creditToApply = Math.min(originalRemainingCredit, remainingTaxLiability);
      remainingTaxLiability -= creditToApply;
      totalCreditApplied += creditToApply;

      const newRemainingCredit = originalRemainingCredit - creditToApply;
      const newAppliedToPIT =
        accountType === AccountType.Individual
          ? (credit.appliedToPIT || 0) + creditToApply
          : credit.appliedToPIT || 0;
      const newAppliedToCIT =
        accountType === AccountType.Company
          ? (credit.appliedToCIT || 0) + creditToApply
          : credit.appliedToCIT || 0;

      const newStatus =
        newRemainingCredit > 0
          ? credit.status
          : WHTCreditStatus.Applied;

      await WHTCredit.findByIdAndUpdate(credit._id, {
        remainingCredit: newRemainingCredit,
        appliedToPIT: newAppliedToPIT,
        appliedToCIT: newAppliedToCIT,
        status: newStatus,
      });
    }

    // CRITICAL FIX: Calculate remaining credit using original total minus applied amount
    // This is more accurate than summing the array (which has stale values after updates)
    // Formula: Total Original Remaining - Total Applied = Total Remaining After Application
    const totalRemainingCredit = totalOriginalRemainingCredit - totalCreditApplied;

    return {
      taxLiabilityAfterCredit: Math.max(0, remainingTaxLiability),
      creditApplied: totalCreditApplied,
      remainingCredit: Math.max(0, totalRemainingCredit),
    };
  }

  /**
   * Get WHT records for a company
   */
  async getWHTRecords(
    companyId: Types.ObjectId,
    filters?: {
      month?: number;
      year?: number;
      whtType?: WHTType;
    }
  ): Promise<IWHTRecord[]> {
    const query: any = { companyId };
    if (filters?.month) query.month = filters.month;
    if (filters?.year) query.year = filters.year;
    if (filters?.whtType) query.whtType = filters.whtType;

    return await WHTRecord.find(query)
      .sort({ paymentDate: -1 })
      .lean();
  }

  /**
   * Get WHT records for an account (payee)
   */
  async getWHTRecordsForAccount(
    accountId: Types.ObjectId,
    taxYear?: number
  ): Promise<IWHTRecord[]> {
    const query: any = { accountId };
    if (taxYear) query.year = taxYear;

    return await WHTRecord.find(query)
      .sort({ paymentDate: -1 })
      .lean();
  }

  /**
   * Update WHT summary
   */
  async updateWHTSummary(
    companyId: Types.ObjectId,
    month: number,
    year: number
  ): Promise<IWHTSummary> {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (year < 2026 || year > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // Get all WHT records for the period
    const whtRecords = await WHTRecord.find({
      companyId,
      month,
      year,
    }).lean();

    // CRITICAL: Calculate totalWHTDeducted with null safety
    const totalWHTDeducted = whtRecords.reduce(
      (sum, record) => sum + (record.whtAmount ?? 0),
      0
    );

    // Get remittance status
    const remittance = await WHTRemittance.findOne({
      companyId,
      remittanceMonth: month,
      remittanceYear: year,
    }).lean();

    // CRITICAL: Calculate totalWHTRemitted from manually created remittance records
    // Since remittances are now manually created by users, they represent actual payments made
    // Remitted status = paid on time, Overdue status = paid but late, Pending = not paid yet
    // Both Remitted and Overdue statuses indicate payment was made, so count both
    let totalWHTRemitted = 0;
    if (remittance && (remittance.status === RemittanceStatus.Remitted || remittance.status === RemittanceStatus.Overdue)) {
      // Use the actual remitted amount from remittance record
      // This is the amount that was manually entered by the user when creating the remittance
      totalWHTRemitted = remittance.totalWHTAmount || 0;
      
      // CRITICAL: If new WHT records were added after remittance, they are still pending
      // Example: Remitted NGN 10,000, but new records added later bring total to NGN 15,000
      // Remitted: NGN 10,000, Pending: NGN 5,000
    } else {
      // No remittance created yet, or status is Pending (not yet paid)
      totalWHTRemitted = 0;
    }
    
    // CRITICAL: Calculate pending amount (current total minus what was actually remitted)
    // This correctly handles cases where new WHT was added after remittance
    const totalWHTPending = Math.max(0, totalWHTDeducted - totalWHTRemitted);
    
    // CRITICAL: Detect over-remittance (records deleted after remittance)
    // If totalWHTRemitted > totalWHTDeducted, it means records were deleted after remittance
    // This is still compliant (we remitted what was required), but should be logged for audit
    if (remittance && (remittance.status === RemittanceStatus.Remitted || remittance.status === RemittanceStatus.Overdue) && totalWHTRemitted > totalWHTDeducted + 0.01) {
      const overRemittedAmount = totalWHTRemitted - totalWHTDeducted;
      logger.warn("WHT records were deleted after remittance was marked as remitted (over-remittance detected)", {
        companyId: companyId.toString(),
        month,
        year,
        remittedAmount: totalWHTRemitted,
        currentTotal: totalWHTDeducted,
        overRemittedAmount,
        note: "Status remains compliant as remittance was made, but records were deleted after remittance",
      });
    }

    // Determine status
    // CRITICAL: Status should reflect current state, not just remittance status
    // If remittance was made but new WHT was added, status should be "pending" (not "compliant")
    let status: RemittanceStatus = RemittanceStatus.Pending;
    if (remittance && (remittance.status === RemittanceStatus.Remitted || remittance.status === RemittanceStatus.Overdue)) {
      // CRITICAL: Use tolerance check (0.01) for floating point comparison
      // If remittance was made AND no new WHT was added (totalWHTPending <= 0.01), then compliant
      // Otherwise, there's new pending WHT that needs to be remitted
      if (totalWHTPending <= 0.01) {
        // Pending amount is effectively zero (within rounding tolerance)
        // This covers both: exact match and over-remittance (records deleted after remittance)
        // Preserve the original remittance status (Remitted or Overdue) for compliance tracking
        status = remittance.status === RemittanceStatus.Overdue ? RemittanceStatus.Overdue : RemittanceStatus.Compliant;
      } else {
        // Remittance was made, but new WHT records were added after remittance
        // This means there's additional WHT that needs to be remitted
        status = RemittanceStatus.Pending;
        logger.warn("WHT remittance was made, but new WHT records were added after remittance", {
          companyId: companyId.toString(),
          month,
          year,
          remittedAmount: totalWHTRemitted,
          currentTotal: totalWHTDeducted,
          pendingAmount: totalWHTPending,
        });
      }
    } else {
      // No remittance record exists, or status is "pending"
      // Check if deadline has passed
      if (remittance?.remittanceDeadline) {
        const now = new Date();
        const deadline = new Date(remittance.remittanceDeadline);
        if (now > deadline && totalWHTDeducted > 0) {
          status = RemittanceStatus.Overdue;
        } else {
          status = RemittanceStatus.Pending;
        }
      } else {
        status = RemittanceStatus.Pending;
      }
    }

    // Create or update summary
    const summary = await WHTSummary.findOneAndUpdate(
      { companyId, month, year },
      {
        totalWHTDeducted,
        totalWHTRemitted,
        totalWHTPending,
        whtRecordsCount: whtRecords.length,
        status,
      },
      { upsert: true, new: true }
    );

    return summary.toObject();
  }

  /**
   * Get WHT summary for a company
   */
  async getWHTSummary(
    companyId: Types.ObjectId,
    month: number,
    year: number
  ): Promise<IWHTSummary | null> {
    return await WHTSummary.findOne({
      companyId,
      month,
      year,
    }).lean();
  }

  /**
   * Get yearly WHT summary
   */
  async getYearlyWHTSummary(
    companyId: Types.ObjectId,
    year: number
  ): Promise<IWHTSummary | null> {
    return await WHTSummary.findOne({
      companyId,
      month: 0, // 0 = yearly summary
      year,
    }).lean();
  }

  /**
   * Find WHT record by transaction ID and type
   * Used to locate WHT records linked to invoices/expenses
   */
  async findWHTRecordByTransaction(
    transactionId: Types.ObjectId,
    transactionType: TransactionType,
    companyId: Types.ObjectId
  ): Promise<IWHTRecord | null> {
    const whtRecord = await WHTRecord.findOne({
      transactionId,
      transactionType,
      companyId,
    }).lean();

    return whtRecord as IWHTRecord | null;
  }

  /**
   * Delete WHT record (and associated credit)
   */
  async deleteWHTRecord(whtRecordId: Types.ObjectId): Promise<boolean> {
    const whtRecord = await WHTRecord.findById(whtRecordId);
    if (!whtRecord) {
      return false;
    }

    // Delete associated credit
    await WHTCredit.deleteOne({ whtRecordId: whtRecord._id });

    // Delete WHT record
    await WHTRecord.deleteOne({ _id: whtRecord._id });

    // CRITICAL: WHT remittances are now manually created by users, not auto-created
    // Only update summary (remittances are manually created by users)
    await this.updateWHTSummary(
      whtRecord.companyId,
      whtRecord.month,
      whtRecord.year
    );

    return true;
  }

  /**
   * Delete WHT record by transaction ID and type
   * Used when invoices/expenses are cancelled or payment is reversed
   */
  async deleteWHTRecordByTransaction(
    transactionId: Types.ObjectId,
    transactionType: TransactionType,
    companyId: Types.ObjectId
  ): Promise<boolean> {
    const whtRecord = await WHTRecord.findOne({
      transactionId,
      transactionType,
      companyId,
    });

    if (!whtRecord) {
      return false;
    }

    // Delete associated credit
    await WHTCredit.deleteOne({ whtRecordId: whtRecord._id });

    const month = whtRecord.month;
    const year = whtRecord.year;

    // Delete WHT record
    await WHTRecord.deleteOne({ _id: whtRecord._id });

    // CRITICAL: WHT remittances are now manually created by users, not auto-created
    // Only update summary (remittances are manually created by users)
    await this.updateWHTSummary(companyId, month, year);

    return true;
  }
}

export const whtService = new WHTService();

