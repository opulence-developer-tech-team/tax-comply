import { Types } from "mongoose";
import { IPITSummary, IPITRemittance, ICreatePITRemittance, IUpdatePITRemittance, IPITEmploymentDeductions, ICreatePITEmploymentDeductions, IUpdatePITEmploymentDeductions } from "./interface";
import { PITRemittance, PITEmploymentDeductions } from "./entity";
import { RemittanceStatus, FilingStatus, ExemptionReason, PITRemittanceStatus, AccountType } from "../utils/enum";
import {
  calculateAnnualPIT,
  calculateCRA,
  calculatePensionContribution,
  calculateNHFContribution,
  calculateNHISContribution,
  calculateTaxableIncome,
  calculateTaxAfterWHTCredit,
  getAnnualTaxExemption,
  getTaxYear,
} from "../tax/calculator";
import { incomeService } from "../income/service";
import { expenseService } from "../expense/service";
import { invoiceService } from "../invoice/service";
import { whtService } from "../wht/service";
import { logger } from "../utils/logger";
import Business from "../business/entity";

/**
 * PIT Service
 * Handles Personal Income Tax calculations, remittances, and compliance
 * Reference: NRS (Nigeria Revenue Service) - formerly NRS (https://www.firs.gov.ng/)
 * 
 * PIT Filing Deadline: March 31 of following year
 * PIT Remittance Deadline: March 31 of following year (same as filing)
 * 
 * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 * NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 */
class PITService {
  /**
   * Calculate PIT filing deadline
   * NRS: March 31 of the year following the tax year
   */
  private getFilingDeadline(taxYear: number): Date {
    const deadline = new Date(taxYear + 1, 2, 31); // March 31 (month is 0-indexed)
    deadline.setHours(23, 59, 59, 999); // End of day
    return deadline;
  }

  /**
   * Get PIT summary for a tax year (Calculated On-The-Fly)
   * Aggregates income, expenses, and calculates PIT liability instantly
   */
  async getPITSummary(
    accountId: Types.ObjectId,
    taxYear: number
  ): Promise<IPITSummary> {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (taxYear < 2026 || taxYear > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }
    // CRITICAL FIX: Get ALL income sources for this tax year (yearly + monthly)
    // 1. Individual Income: Fetched from manual income entries (e.g., "Other Personal Income")
    // 2. Business Income: CALCULATED from Paid Invoices (Revenue) for Sole Proprietors
    // We do NOT fetch 'business' income from manual entries anymore - manual entry is only for "Other"
    
    // Verify account existence (Individual/Sole Prop uses User ID as accountId)
    // Note: We don't strictly validate existence here as this might be called async
    
    // Fetch data in parallel for performance
    // 1. Get Individual Incomes (Manual)
    const individualIncomesPromise = incomeService.getIncomesByAccountAndYear(accountId.toString(), AccountType.Individual, taxYear);
    
    // 2. Get Business Revenue (Paid Invoices)
    // CRITICAL: PIT Service receives User ID (accountId), but Invoices are linked to Business ID.
    // We must find all businesses owned by this user and sum their revenue.
    const businessRevenuePromise = (async () => {
      try {
        const businesses = await Business.find({ ownerId: accountId }).lean();
        if (!businesses || businesses.length === 0) return 0;
        
        // CRITICAL: Use calculateAssessableIncome (Cash Basis) for Tax Liability
        // We use the new dedicated method to ensure we only tax PAID invoices.
        // Do NOT use calculateAnnualTurnover (Accrual) which includes Pending invoices.
        const { businessService } = await import("../business/service");
        
        const revenuePromises = businesses.map(business => 
          businessService.calculateAssessableIncome(business._id, taxYear)
        );
        
        const revenues = await Promise.all(revenuePromises);
        return revenues.reduce((sum: number, rev: number) => sum + rev, 0);
      } catch (error: any) {
        logger.error("Error calculating business revenue for PIT", error, { accountId });
        return 0;
      }
    })();

    // 3. Get Deductible Expenses
    // expenseService.calculateTotalDeductibleExpenses matches by userId if passed
    // CRITICAL FIX: Pass AccountTypes to ensure we ONLY get Business (Sole Prop) and Individual expenses
    // We MUST exclude AccountType.Company expenses as they are for CIT, not PIT
    const deductibleExpensesPromise = expenseService.calculateTotalDeductibleExpenses(
      accountId.toString(), 
      taxYear,
      [AccountType.Business, AccountType.Individual]
    );

    const [individualIncomes, businessRevenue, totalAllowableDeductions] = await Promise.all([
      individualIncomesPromise,
      businessRevenuePromise,
      deductibleExpensesPromise
    ]);
    
    // Merge incomes
    // Start with individual incomes (manual entries)
    // Then add business Revenue
    
    // Calculate total gross income from manual individual sources
    // CRITICAL FIX: Sum ACTUAL income entered, don't estimate by multiplying monthly income by 12
    let totalGrossIncome = 0;
    for (const inc of individualIncomes) {
      if (inc.month === null || inc.month === undefined) {
        // Yearly income - use as is
        totalGrossIncome += inc.annualIncome || 0;
      } else {
        // Monthly income - sum the actual monthly amount
        totalGrossIncome += inc.annualIncome || 0;
      }
    }

    // Add Business Revenue (computed from Invoices)
    // For Sole Proprietors, Business Revenue is part of Personal Income
    totalGrossIncome += businessRevenue;

    logger.info("PIT Income Calculation", {
      accountId: accountId.toString(),
      taxYear,
      manualPersonalIncome: totalGrossIncome - businessRevenue,
      businessRevenue,
      totalGrossIncome,
      totalAllowableDeductions
    });

    // Expenses are now fetched via calculateTotalDeductibleExpenses above
    // No need to query Expense model manually here

    // CRITICAL FIX: Handle zero income case explicitly
    // If no income is recorded, all tax values should be 0
    if (totalGrossIncome <= 0) {
      // No income - return empty summary on-the-fly
      const filingDeadline = this.getFilingDeadline(taxYear);
      return {
        accountId,
        taxYear,
        totalGrossIncome: 0,
        totalBusinessIncome: 0,
        totalPersonalIncome: 0,
        totalTaxableIncome: 0,
        totalCRA: 0,
        totalPension: 0,
        totalNHF: 0,
        totalNHIS: 0,
        totalHousingLoanInterest: 0,
        totalLifeInsurance: 0,
        totalRentRelief: 0,
        totalAllowableDeductions,
        annualExemption: getAnnualTaxExemption(taxYear, AccountType.Individual),
        pitBeforeWHT: 0,
        whtCredits: 0,
        pitAfterWHT: 0,
        pitRemitted: 0,
        pitPending: 0,
        isFullyExempt: false,
        exemptionReason: ExemptionReason.NoIncome,
        remittanceStatus: RemittanceStatus.Compliant,
        remittanceDeadline: filingDeadline,
        filingStatus: FilingStatus.NotFiled,
        filingDeadline,
        lastUpdated: new Date()
      };
    }

    // CRITICAL: Nigeria Tax Act 2025 Changes (Effective January 1, 2026)
    // Reference: https://www.nipc.gov.ng/wp-content/uploads/2025/07/Nigeria-Tax-Act-2025.pdf
    // Reference: Fiscal Reforms (https://fiscalreforms.ng/)
    //
    // 1. CRA (Consolidated Relief Allowance) has been REPLACED - no longer applicable for 2026+
    // 2. NHIS is now DEDUCTIBLE (reduces taxable income) for 2026+
    // 3. New allowable deductions: Housing loan interest, Life insurance, Rent relief
    // 4. Exemption threshold is ₦800,000 for 2026+ (full exemption for minimum wage earners)
    
    const monthlyIncome = totalGrossIncome / 12;
    
    // Calculate CRA (only for 2024, returns 0 for 2026+)
    const monthlyCRA = calculateCRA(monthlyIncome, taxYear);
    const totalCRA = monthlyCRA * 12;

    // Get user-provided employment deductions and new reliefs
    // If not provided, defaults to 0 (correct for self-employed individuals)
    const employmentDeductions = await this.getEmploymentDeductions(
      accountId,
      taxYear
    );

    const totalPension = employmentDeductions?.annualPension || 0;
    const totalNHF = employmentDeductions?.annualNHF || 0;
    const totalNHIS = employmentDeductions?.annualNHIS || 0;
    
    // New allowable deductions (2026+)
    const totalHousingLoanInterest = employmentDeductions?.annualHousingLoanInterest || 0;
    const totalLifeInsurance = employmentDeductions?.annualLifeInsurance || 0;
    // Rent relief: 20% of annual rent, capped at ₦500,000 per Nigeria Tax Act 2025
    // CRITICAL: Must calculate from annualRent, not use user-provided annualRentRelief directly
    const annualRent = employmentDeductions?.annualRent || 0;
    const calculatedRentRelief = taxYear >= 2026 && annualRent > 0 
      ? Math.min(annualRent * 0.20, 500000) 
      : 0;
    // Use calculated value (ignoring any user-provided annualRentRelief to ensure compliance)
    const totalRentRelief = calculatedRentRelief;

    // Convert annual to monthly for calculation functions
    // Note: This is an average monthly value, which is acceptable for PIT calculations
    const monthlyPension = totalPension / 12;
    const monthlyNHF = totalNHF / 12;
    const monthlyNHIS = totalNHIS / 12;

    // Calculate taxable income
    // CRITICAL FIX: Calculate using ANNUAL figures to avoid rounding errors from monthly conversion
    // 2024: Taxable Income = Gross - Pension - NHF - CRA (NHIS NOT deductible)
    // 2026+: Taxable Income = Gross - Pension - NHF - NHIS (CRA removed, NHIS deductible)
    
    let annualTaxableIncome = 0;
    
    if (taxYear >= 2026) {
        // 2026+ Formula: Direct annual calculation
        annualTaxableIncome = totalGrossIncome - totalPension - totalNHF - totalNHIS;
    } else {
        // 2024 Formula: Keep existing logic for backward compatibility if needed, 
        // but note the app focuses on 2026+
        const monthlyTaxableIncome = calculateTaxableIncome(
            monthlyIncome,
            monthlyPension,
            monthlyNHF,
            monthlyNHIS,
            taxYear
        );
        annualTaxableIncome = monthlyTaxableIncome * 12;
    }
    
    // Apply new allowable deductions (2026+)
    // These reduce taxable income AFTER statutory deductions
    if (taxYear >= 2026) {
      annualTaxableIncome = Math.max(0, annualTaxableIncome - totalHousingLoanInterest - totalLifeInsurance - totalRentRelief);
    }

    // Apply allowable deductions
    // CRITICAL FIX: Ensure taxable income is non-negative
    // Expenses can exceed income, resulting in negative taxable income (which should be 0)
    const taxableIncomeAfterDeductions = Math.max(
      0,
      annualTaxableIncome - totalAllowableDeductions
    );

    // Get annual exemption
    const annualExemption = getAnnualTaxExemption(taxYear, AccountType.Individual);

    // CRITICAL: Calculate PIT BEFORE determining exemption status
        // calculateAnnualPIT applies the annual exemption (₦800,000 for 2026+, ₦0 for 2024) internally
    // This ensures exemption is applied correctly per Nigeria Tax Act 2025
    const pitBeforeWHT = calculateAnnualPIT(taxableIncomeAfterDeductions, taxYear);

    // CRITICAL: Determine if individual is fully tax-exempt per Nigeria Tax Act 2025
    // Reference: https://www.nipc.gov.ng/wp-content/uploads/2025/07/Nigeria-Tax-Act-2025.pdf
    // Reference: Fiscal Reforms (https://fiscalreforms.ng/)
    //
    // Exemption Rules:
        // 1. Threshold Exemption (2026+): If taxable income <= ₦800,000, individual is fully exempt
    // 2. Deductions Exemption: If deductions reduce taxable income to 0, individual is fully exempt
    // 3. No Income: If no income, no tax (but not technically "exempt")
    //
    // NOTE: This implementation handles the standard exemption threshold.
    // Other exemption categories (diplomats, certain professions, etc.) are not currently handled.
    // These would require additional user data (exemption certificates, profession codes, etc.)
    let isFullyExempt = false;
    let exemptionReason: ExemptionReason | undefined = undefined;
    
    if (totalGrossIncome <= 0) {
      // No income = no tax (but not technically "exempt" - just no income)
      // Per Nigeria Tax Act: No income means no tax liability, but not an exemption
      isFullyExempt = false;
      exemptionReason = ExemptionReason.NoIncome;
    } else if (pitBeforeWHT <= 0.01) {
      // Tax calculated is zero (or negligible due to rounding) - fully exempt
      // This happens when taxableIncomeAfterDeductions <= annualExemption (2026+)
      // OR when taxableIncomeAfterDeductions <= 0 (deductions exceed income)
      if (annualExemption > 0 && taxableIncomeAfterDeductions > 0 && taxableIncomeAfterDeductions <= annualExemption) {
        // Taxable income is within exemption threshold (2026+)
        // Per Nigeria Tax Act 2025: Individuals with taxable income <= ₦800,000 are fully exempt from tax
        isFullyExempt = true;
        exemptionReason = ExemptionReason.Threshold;
      } else if (taxableIncomeAfterDeductions <= 0 && totalGrossIncome > 0) {
        // Has income but deductions reduce taxable income to 0 or negative
        // Per Nigeria Tax Act: If taxable income is 0 or negative, no tax is owed
        isFullyExempt = true;
        exemptionReason = ExemptionReason.DeductionsOnly;
      }
    }

    // Get WHT credits for this account
    let whtCredits = 0;
    try {
      whtCredits = await whtService.getTotalWHTCredits(accountId, taxYear);
    } catch (error: any) {
      logger.error("Error fetching WHT credits for PIT", error, {
        accountId: accountId.toString(),
        taxYear,
      });
      // Continue without WHT credits if service fails
    }

    // Calculate final PIT after WHT credits
    const pitAfterWHT = calculateTaxAfterWHTCredit(pitBeforeWHT, whtCredits);

    // Get existing remittances for this tax year
    const remittances = await PITRemittance.find({
      accountId,
      taxYear,
    }).lean();

    const pitRemitted = remittances.reduce(
      (sum, rem) => sum + (rem.remittanceAmount || 0),
      0
    );
    
    // CRITICAL FIX: Ensure pending amount is non-negative
    // If over-remitted (remittances > liability), pending should be 0, not negative
    const pitPending = Math.max(0, pitAfterWHT - pitRemitted);
    
    // Log warning if over-remitted (data integrity check)
    if (pitRemitted > pitAfterWHT + 0.01) {
      logger.warn("PIT over-remittance detected", {
        accountId: accountId.toString(),
        taxYear,
        pitAfterWHT,
        pitRemitted,
        overRemitted: pitRemitted - pitAfterWHT,
      });
    }

    // Determine remittance status
    const filingDeadline = this.getFilingDeadline(taxYear);
    const now = new Date();
    let remittanceStatus: RemittanceStatus;
    let filingStatus: FilingStatus;

    if (pitPending <= 0.01) {
      // Fully remitted (using tolerance for floating-point comparison)
      remittanceStatus = now > filingDeadline ? RemittanceStatus.Overdue : RemittanceStatus.Compliant;
      filingStatus = FilingStatus.Filed;
    } else if (now > filingDeadline) {
      remittanceStatus = RemittanceStatus.Overdue;
      filingStatus = FilingStatus.Overdue;
    } else {
      remittanceStatus = RemittanceStatus.Pending;
      filingStatus = FilingStatus.NotFiled;
    }

    // Construct the summary object directly (On-The-Fly)
    const summary: IPITSummary = {
      accountId,
      taxYear,
      totalGrossIncome,
      totalBusinessIncome: businessRevenue,
      totalPersonalIncome: totalGrossIncome - businessRevenue,
      totalTaxableIncome: taxableIncomeAfterDeductions,
      totalCRA, // 0 for 2026+ (CRA replaced)
      totalPension,
      totalNHF,
      totalNHIS,
      // New allowable deductions (2026+)
      totalHousingLoanInterest: taxYear >= 2026 ? totalHousingLoanInterest : 0,
      totalLifeInsurance: taxYear >= 2026 ? totalLifeInsurance : 0,
      totalRentRelief: taxYear >= 2026 ? totalRentRelief : 0,
      totalAllowableDeductions,
      annualExemption, // ₦800,000 for 2026+, ₦0 for 2024
      pitBeforeWHT,
      whtCredits,
      pitAfterWHT,
      pitRemitted,
      pitPending,
      isFullyExempt,
      exemptionReason,
      remittanceStatus,
      remittanceDeadline: filingDeadline,
      filingStatus,
      filingDeadline,
    };

    logger.info("PIT summary calculated", {
      accountId: accountId.toString(),
      taxYear,
      totalGrossIncome,
      pitAfterWHT,
      pitRemitted,
      pitPending,
      remittanceStatus,
    });

    return summary;
  }

  /**
   * Get PIT summary for a tax year
   * Creates/updates summary if it doesn't exist
   * 
   * CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
   */


  /**
   * Create PIT remittance record
   * CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
   */
  async createPITRemittance(
    data: ICreatePITRemittance
  ): Promise<IPITRemittance> {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (data.taxYear < 2026 || data.taxYear > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }
    
    const remittance = new PITRemittance({
      accountId: new Types.ObjectId(data.accountId),
      taxYear: data.taxYear,
      remittanceDate: data.remittanceDate,
      remittanceAmount: data.remittanceAmount,
      remittanceReference: data.remittanceReference,
      receiptUrl: data.receiptUrl,
      status: PITRemittanceStatus.Remitted,
    });

    await remittance.save();

    // Update PIT summary after remittance
    // No need to update PIT summary explicitly as it is calculated on-the-fly

    logger.info("PIT remittance created", {
      accountId: data.accountId,
      taxYear: data.taxYear,
      remittanceAmount: data.remittanceAmount,
      remittanceReference: data.remittanceReference,
    });

    return remittance;
  }

  /**
   * Get PIT remittances for a tax year
   */
  async getPITRemittances(
    accountId: Types.ObjectId,
    taxYear: number
  ): Promise<IPITRemittance[]> {
    const remittances = await PITRemittance.find({
      accountId,
      taxYear,
    })
      .sort({ remittanceDate: -1 })
      .lean();

    return remittances as IPITRemittance[];
  }

  /**
   * Get all PIT remittances for an account
   */
  async getAllPITRemittances(
    accountId: Types.ObjectId
  ): Promise<IPITRemittance[]> {
    const remittances = await PITRemittance.find({ accountId })
      .sort({ taxYear: -1, remittanceDate: -1 })
      .lean();

    return remittances as IPITRemittance[];
  }

  /**
   * Update PIT remittance record
   * CRITICAL: Only updates remittances belonging to the specified accountId
   */
  async updatePITRemittance(
    remittanceId: Types.ObjectId,
    accountId: Types.ObjectId,
    updateData: {
      remittanceDate?: Date;
      remittanceAmount?: number;
      remittanceReference?: string;
      receiptUrl?: string;
      status?: PITRemittanceStatus;
    }
  ): Promise<IPITRemittance | null> {
    // CRITICAL: Verify remittance belongs to this account before updating
    const remittance = await PITRemittance.findOne({
      _id: remittanceId,
      accountId, // Ensure remittance belongs to this account
    });

    if (!remittance) {
      logger.warn("Remittance not found or access denied", {
        remittanceId: remittanceId.toString(),
        accountId: accountId.toString(),
      });
      return null;
    }

    // Update fields
    if (updateData.remittanceDate !== undefined) {
      remittance.remittanceDate = updateData.remittanceDate;
    }
    if (updateData.remittanceAmount !== undefined) {
      remittance.remittanceAmount = updateData.remittanceAmount;
    }
    if (updateData.remittanceReference !== undefined) {
      remittance.remittanceReference = updateData.remittanceReference;
    }
    if (updateData.receiptUrl !== undefined) {
      remittance.receiptUrl = updateData.receiptUrl;
    }
    if (updateData.status !== undefined) {
      remittance.status = updateData.status as PITRemittanceStatus;
    }

    await remittance.save();

    // Update PIT summary after remittance update
    // No need to update PIT summary explicitly as it is calculated on-the-fly

    logger.info("PIT remittance updated", {
      remittanceId: remittanceId.toString(),
      accountId: accountId.toString(),
      taxYear: remittance.taxYear,
    });

    return remittance;
  }

  /**
   * Delete PIT remittance record
   * CRITICAL: Only deletes remittances belonging to the specified accountId
   */
  async deletePITRemittance(
    remittanceId: Types.ObjectId,
    accountId: Types.ObjectId
  ): Promise<boolean> {
    // CRITICAL: Verify remittance belongs to this account before deleting
    const remittance = await PITRemittance.findOne({
      _id: remittanceId,
      accountId, // Ensure remittance belongs to this account
    });

    if (!remittance) {
      logger.warn("Remittance not found or access denied", {
        remittanceId: remittanceId.toString(),
        accountId: accountId.toString(),
      });
      return false;
    }

    const taxYear = remittance.taxYear;

    await PITRemittance.deleteOne({ _id: remittanceId });

    // No need to update PIT summary explicitly as it is calculated on-the-fly

    logger.info("PIT remittance deleted", {
      remittanceId: remittanceId.toString(),
      accountId: accountId.toString(),
      taxYear,
    });

    return true;
  }

  /**
   * Get employment deductions for a tax year
   * Returns null if not set (defaults to 0)
   */
  async getEmploymentDeductions(
    accountId: Types.ObjectId,
    taxYear: number
  ): Promise<IPITEmploymentDeductions | null> {
    const deductions = await PITEmploymentDeductions.findOne({
      accountId,
      taxYear,
    }).lean();

    return deductions as IPITEmploymentDeductions | null;
  }

  /**
   * Create or update employment deductions for a tax year
   * Uses upsert pattern: creates if doesn't exist, updates if exists
   */
  async upsertEmploymentDeductions(
    data: ICreatePITEmploymentDeductions
  ): Promise<IPITEmploymentDeductions> {
    const accountId = new Types.ObjectId(data.accountId);

    const deductions = await PITEmploymentDeductions.findOneAndUpdate(
      {
        accountId,
        taxYear: data.taxYear,
      },
      {
        $set: {
          annualPension: data.annualPension,
          annualNHF: data.annualNHF,
          annualNHIS: data.annualNHIS,
          // New allowable deductions (2026+)
          annualHousingLoanInterest: data.annualHousingLoanInterest || 0,
          annualLifeInsurance: data.annualLifeInsurance || 0,
          annualRent: data.annualRent || 0,
          // CRITICAL: Rent relief is calculated from annualRent (20% capped at ₦500,000)
          // Store calculated value for reference, but service will recalculate to ensure compliance
          annualRentRelief: data.taxYear >= 2026 && data.annualRent ? Math.min(data.annualRent * 0.20, 500000) : 0,
          source: data.source,
          sourceOther: data.sourceOther || "",
          notes: data.notes || "",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    // Update PIT summary after employment deductions change
    // No need to update PIT summary explicitly as it is calculated on-the-fly

    logger.info("Employment deductions upserted", {
      accountId: accountId.toString(),
      taxYear: data.taxYear,
    });

    return deductions;
  }

  /**
   * Update employment deductions for a tax year
   */
  async updateEmploymentDeductions(
    accountId: Types.ObjectId,
    taxYear: number,
    updateData: IUpdatePITEmploymentDeductions
  ): Promise<IPITEmploymentDeductions | null> {
    const deductions = await PITEmploymentDeductions.findOne({
      accountId,
      taxYear,
    });

    if (!deductions) {
      logger.warn("Employment deductions not found", {
        accountId: accountId.toString(),
        taxYear,
      });
      return null;
    }

    // Update fields
    if (updateData.annualPension !== undefined) {
      deductions.annualPension = updateData.annualPension;
    }
    if (updateData.annualNHF !== undefined) {
      deductions.annualNHF = updateData.annualNHF;
    }
    if (updateData.annualNHIS !== undefined) {
      deductions.annualNHIS = updateData.annualNHIS;
    }
    // New allowable deductions (2026+)
    if (updateData.annualHousingLoanInterest !== undefined) {
      deductions.annualHousingLoanInterest = updateData.annualHousingLoanInterest;
    }
    if (updateData.annualLifeInsurance !== undefined) {
      deductions.annualLifeInsurance = updateData.annualLifeInsurance;
    }
    if (updateData.annualRentRelief !== undefined) {
      deductions.annualRentRelief = updateData.annualRentRelief;
    }
    if (updateData.source !== undefined) {
      deductions.source = updateData.source;
    }
    if (updateData.sourceOther !== undefined) {
      deductions.sourceOther = updateData.sourceOther;
    }
    if (updateData.notes !== undefined) {
      deductions.notes = updateData.notes;
    }

    await deductions.save();

    // Update PIT summary after employment deductions change
    // No need to update PIT summary explicitly as it is calculated on-the-fly

    logger.info("Employment deductions updated", {
      accountId: accountId.toString(),
      taxYear,
    });

    return deductions;
  }

  /**
   * Delete employment deductions for a tax year
   */
  async deleteEmploymentDeductions(
    accountId: Types.ObjectId,
    taxYear: number
  ): Promise<boolean> {
    const result = await PITEmploymentDeductions.deleteOne({
      accountId,
      taxYear,
    });

    if (result.deletedCount === 0) {
      logger.warn("Employment deductions not found for deletion", {
        accountId: accountId.toString(),
        taxYear,
      });
      return false;
    }

    // Update PIT summary after employment deductions deletion (will use 0 values)
    // No need to update PIT summary explicitly as it is calculated on-the-fly

    logger.info("Employment deductions deleted", {
      accountId: accountId.toString(),
      taxYear,
    });

    return true;
  }
}

export const pitService = new PITService();

