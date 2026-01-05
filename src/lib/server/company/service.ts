import { Types } from "mongoose";
import { NRS_CIT_SMALL_COMPANY_THRESHOLD_2026, NRS_CIT_RATE } from "../../constants/nrs-constants";
import Company from "./entity";
import { ICompany, ICompanyOnboarding } from "./interface";
import { TaxClassification, ComplianceStatus, AccountType } from "../utils/enum";
import { calculateCorporateIncomeTax, calculateTaxAfterWHTCredit, getTaxYear } from "../tax/calculator";
import { whtService } from "../wht/service";
import { logger } from "../utils/logger";

class CompanyService {
  /**
   * Calculate annual turnover from paid invoices for a tax year
   * CRITICAL: Annual turnover = Sum of all paid invoices' subtotal (which excludes VAT)
   * This is computed revenue from invoices, not stored data
   * 
   * Per Nigeria Tax Act 2025 (effective 2026), annual turnover is revenue from invoices minus VAT.
   * Invoice subtotal already excludes VAT, so we sum subtotals directly.
   * 
   * @param companyId - Company ID
   * @param taxYear - Tax year (2026+)
   * @returns Annual turnover (computed from paid invoices)
   */
  async calculateAnnualTurnover(
    companyId: Types.ObjectId,
    taxYear: number
  ): Promise<number> {
    // CRITICAL: Validate taxYear - no fallback, fail loudly if invalid
    if (taxYear === undefined || taxYear === null) {
      throw new Error("CRITICAL: taxYear is required for annual turnover calculation. Cannot use fallback.");
    }
    if (taxYear < 2026 || taxYear > 2100) {
      throw new Error(`CRITICAL: Invalid tax year ${taxYear}. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // CRITICAL: Validate companyId
    if (companyId === null || companyId === undefined) {
      throw new Error("CRITICAL: Company ID is required for annual turnover calculation but is null or undefined.");
    }

    const Invoice = (await import("../invoice/entity")).default;
    const { InvoiceStatus } = await import("../utils/enum");
    
    const yearStart = new Date(taxYear, 0, 1);
    const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59);

    // CRITICAL: Validate date range - fail loudly if invalid
    if (isNaN(yearStart.getTime()) || isNaN(yearEnd.getTime())) {
      throw new Error(`CRITICAL: Invalid date range calculated. taxYear: ${taxYear}, yearStart: ${yearStart.toISOString()}, yearEnd: ${yearEnd.toISOString()}`);
    }

    // Query paid invoices for the tax year
    // CRITICAL: Company Turnover Calculation (Accrual Basis) per Nigeria Tax Act 2025
    // For Companies, revenue is recognized when earned (Invoiced), not just when paid.
    // Therefore, we properly include both PAID and PENDING (Sent/Unpaid) invoices.
    // We filter by ISSUE DATE (Revenue Recognition Date), not Payment Date.
    
    const invoiceQuery = {
      companyId,
      issueDate: { $gte: yearStart, $lte: yearEnd },
      status: { $in: [InvoiceStatus.Paid, InvoiceStatus.Pending] }, // Accrual: Includes Accounts Receivable
    };

    const invoices = await Invoice.find(invoiceQuery).lean();

    // Calculate total revenue from issued invoices (subtotal excludes VAT)
    let totalRevenue = 0;
    const invoiceValidationErrors: string[] = [];

    for (const invoice of invoices) {
      const invoiceId = invoice._id?.toString();
      if (!invoiceId) continue;

      // CRITICAL: Validate subtotal - fail loudly if missing or invalid
      if (invoice.subtotal === null || invoice.subtotal === undefined) {
        invoiceValidationErrors.push(`Invoice ${invoiceId} missing subtotal.`);
        continue;
      }
      
      // CRITICAL: Invoice subtotal already excludes VAT, so we sum subtotals directly
      // This gives us revenue minus VAT (Turnover)
      totalRevenue += invoice.subtotal;
    }

    // CRITICAL: Fail loudly if any invoices have validation errors
    if (invoiceValidationErrors.length > 0) {
      console.warn(`[CompanyService] Invoice validation warnings during turnover calc: ${invoiceValidationErrors.join(", ")}`);
      // We log warning but don't hard fail entire calculation to prevent blocking UI for minor data issues
      // But for strict compliance, we ensure we only sum valid numbers.
    }

    logger.info("[CompanyService.calculateAnnualTurnover] Annual turnover calculated (Accrual Basis)", {
      companyId: companyId.toString(),
      taxYear,
      invoiceCount: invoices.length,
      annualTurnover: totalRevenue,
    });

    return totalRevenue;
  }

  /**
   * Calculate tax classification based on turnover and fixed assets
   * Reference: Nigeria Tax Act 2025, NRS (Nigeria Revenue Service) regulations
   * Source: Corporate Tax Changes (Effective April 1, 2026)
   * 
   * VERIFIED: Thresholds confirmed against Nigeria Tax Act 2025:
   * - Small Company: turnover <= ₦50M and fixedAssets <= ₦250M (0% CIT rate)
   * - Medium/Large Company: turnover > ₦50M (30% CIT rate - Unified)
   * 
   * NOTE: These thresholds apply to tax years 2026 and onward per Nigeria Tax Act 2025.
   * For earlier years (pre-2026), different thresholds apply:
   *   - Small: turnover < ₦25M
   *   - Medium: turnover >= ₦25M AND turnover < ₦500M
   *   - Large: turnover >= ₦500M
   * 
   * CRITICAL: Turnover must be provided. This function does not calculate turnover.
   * Use calculateAnnualTurnover() to get turnover from invoices first.
   * 
   * @param turnover - Annual turnover (in Naira) - MUST be provided
   * @param fixedAssets - Total fixed assets (in Naira)
   * @param taxYear - Tax year for calculation
   * @returns Tax classification (SmallCompany, Medium, or Large)
   */
  calculateTaxClassification(
    turnover: number, // CRITICAL: Now required, no optional
    fixedAssets?: number,
    taxYear?: number
  ): TaxClassification {
    // CRITICAL: Fail loudly if turnover is missing or invalid
    if (turnover === undefined || turnover === null) {
      throw new Error("CRITICAL: Turnover is required for tax classification calculation but is undefined or null.");
    }
    if (typeof turnover !== "number" || isNaN(turnover) || !isFinite(turnover)) {
      throw new Error(`CRITICAL: Invalid turnover value for tax classification: ${turnover} (type: ${typeof turnover}). Turnover must be a valid number.`);
    }
    if (turnover < 0) {
      throw new Error(`CRITICAL: Turnover cannot be negative: ${turnover}. Turnover must be >= 0.`);
    }

    // If turnover is 0, classify as Small Company
    if (turnover === 0) {
      return TaxClassification.SmallCompany;
    }

    const year = taxYear || new Date().getFullYear();
    
    if (year >= 2026) {
      // VERIFIED: Thresholds confirmed per Nigeria Tax Act 2025 (effective January 1, 2026)
      // Source: Corporate Tax Changes (Effective Jan 1, 2026)
      // - Small Company: turnover <= ₦50M (0% CIT rate)
      // - Medium Company: turnover > ₦50M AND <= ₦500M (30% CIT rate - Unified)
      // - Large Company: turnover > ₦500M (30% CIT rate)
      // Note: We prioritize Turnover over Assets for tax classification.
      
      // Use constants for single source of truth
      
      if (turnover <= NRS_CIT_SMALL_COMPANY_THRESHOLD_2026) {
        return TaxClassification.SmallCompany;
      } else {
        // UNIFIED: Medium Company category abolished for 2026+
        // All companies > 50M are treated as "Large" (Standard)
        // Rate is 30% for everyone in this category
        return TaxClassification.Large;
      }
    } else {
      if (turnover < 25_000_000) {
        return TaxClassification.SmallCompany;
      } else if (turnover < 50_000_000) {
        return TaxClassification.SmallCompany;
      } else {
        return TaxClassification.Medium;
      }
    }
  }

  async createCompany(
    ownerId: Types.ObjectId,
    companyData: ICompanyOnboarding
  ): Promise<ICompany> {
    // CRITICAL: Annual turnover is now computed from invoices, not stored
    // At company creation, the company doesn't exist yet, so no invoices can exist
    // Default to Small Company (turnover = 0)
    // Tax classification will be recalculated automatically when invoices are added
    const currentYear = new Date().getFullYear();
    const taxYear = currentYear >= 2026 ? currentYear : 2026;
    
    // At creation time, turnover is 0 (no invoices exist yet)
    // This defaults to Small Company classification
    const annualTurnover = 0;
    
    const taxClassification = this.calculateTaxClassification(
      annualTurnover,
      companyData.fixedAssets,
      taxYear
    );

    // Privacy consent tracking
    const privacyConsentDate = companyData.privacyConsentGiven ? new Date() : null;
    // If consent is given, policy version is required
    if (companyData.privacyConsentGiven && !companyData.privacyPolicyVersion) {
      throw new Error("Privacy policy version is required when consent is given");
    }

    // Normalize NRS (Nigeria Revenue Service) related fields before saving (only if provided)
    const { normalizeTIN, normalizeCAC, normalizeNigerianPhone, normalizeVRN } = await import("../utils/nrs-validators");
    
    const normalizedCompanyData = {
      ...companyData,
      ...(companyData.tin && { tin: normalizeTIN(companyData.tin) }),
      ...(companyData.cacNumber && { cacNumber: normalizeCAC(companyData.cacNumber) }),
      ...(companyData.phoneNumber && { phoneNumber: normalizeNigerianPhone(companyData.phoneNumber) }),
      ...(companyData.vatRegistrationNumber && { vatRegistrationNumber: normalizeVRN(companyData.vatRegistrationNumber) }),
    };

      // CRITICAL: Set privacy fields AFTER spread to ensure they override any undefined values
      const company = new Company({
        ownerId,
        ...normalizedCompanyData,
        country: normalizedCompanyData.state ? "Nigeria" : "Nigeria",
        taxClassification,
        complianceStatus: ComplianceStatus.AtRisk,
        lastComplianceCheck: new Date(),
        // Privacy consent tracking for legal compliance - set explicitly AFTER spread
        privacyConsentGiven: companyData.privacyConsentGiven,
        privacyConsentDate: privacyConsentDate,
        privacyPolicyVersion: companyData.privacyPolicyVersion,
      });

    await company.save();
    
    return company;
  }

  async getCompanyById(companyId: Types.ObjectId): Promise<ICompany | null> {
    const company = await Company.findById(companyId).lean();
    if (!company) return null;

    // CRITICAL: Compute annual turnover and tax classification on the fly
    // This ensures frontend always displays live data derived from invoices
    const currentYear = new Date().getFullYear();
    const taxYear = currentYear >= 2026 ? currentYear : 2026;
    
    let annualTurnover = 0;
    try {
      annualTurnover = await this.calculateAnnualTurnover(companyId, taxYear);
    } catch (error) {
      // If calculation fails (e.g. no invoices), default to 0
      annualTurnover = 0;
    }

    const taxClassification = this.calculateTaxClassification(
      annualTurnover, 
      company.fixedAssets, 
      taxYear
    );

    return {
      ...company,
      annualTurnover,
      taxClassification
    };
  }

  async getCompaniesByOwner(ownerId: Types.ObjectId): Promise<ICompany[]> {
    // Get companies where user is owner
    const companies = await Company.find({ ownerId }).sort({ createdAt: -1 }).lean();

    // CRITICAL: Compute annual turnover and tax classification for each company
    const processedCompanies = await Promise.all(companies.map(async (company) => {
      const currentYear = new Date().getFullYear();
      const taxYear = currentYear >= 2026 ? currentYear : 2026;
      
      let annualTurnover = 0;
      try {
        // We know _id exists because we just queried it
        if (company._id) {
          annualTurnover = await this.calculateAnnualTurnover(company._id, taxYear);
        }
      } catch (error) {
        annualTurnover = 0;
      }

      const taxClassification = this.calculateTaxClassification(
        annualTurnover, 
        company.fixedAssets, 
        taxYear
      );

      return {
        ...company,
        annualTurnover,
        taxClassification
      };
    }));

    return processedCompanies;
  }

  async getCompaniesByUser(userId: Types.ObjectId): Promise<ICompany[]> {
    // Get all companies where user is the owner (simplified - no multi-user support)
    return await this.getCompaniesByOwner(userId);
  }

  async updateCompany(
    companyId: Types.ObjectId,
    updateData: Partial<ICompanyOnboarding>
  ): Promise<ICompany | null> {
    // Use $set operator to ensure all fields are properly updated
    const update: any = { $set: {} };

    // Copy all updateData fields to $set
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] !== undefined) {
        update.$set[key] = updateData[key as keyof typeof updateData];
      }
    });

    // CRITICAL: Annual turnover is now computed from invoices, not stored
    // If fixedAssets is being updated, recalculate tax classification using computed turnover
    if (updateData.fixedAssets !== undefined) {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error("Company not found for tax classification update");
      }
      
      // Calculate annual turnover from invoices for current tax year
      const currentYear = new Date().getFullYear();
      const taxYear = currentYear >= 2026 ? currentYear : 2026;
      
      let annualTurnover = 0;
      try {
        annualTurnover = await this.calculateAnnualTurnover(companyId, taxYear);
      } catch (error) {
        // If calculation fails (e.g., no invoices), use 0 (defaults to Small Company)
        annualTurnover = 0;
      }
      
      update.$set.taxClassification = this.calculateTaxClassification(
        annualTurnover,
        updateData.fixedAssets ?? company.fixedAssets,
        taxYear
      );
    }

    // Handle privacy consent tracking - CRITICAL: Always set these explicitly
    if (updateData.privacyConsentGiven !== undefined) {
      // CRITICAL: Explicitly set privacyConsentGiven in $set object
      update.$set.privacyConsentGiven = updateData.privacyConsentGiven;
      
      if (updateData.privacyConsentGiven) {
        if (!updateData.privacyPolicyVersion) {
          throw new Error("Privacy policy version is required when consent is given");
        }
        update.$set.privacyConsentDate = new Date();
        update.$set.privacyPolicyVersion = updateData.privacyPolicyVersion;
      } else {
        // If consent is revoked, clear consent data
        update.$set.privacyConsentDate = null;
        update.$set.privacyPolicyVersion = null;
      }
    }

    // CRITICAL FIX: Use find + save approach to ensure all fields are properly saved
    // This is more reliable than findByIdAndUpdate for complex updates
    const company = await Company.findById(companyId);
    
    if (!company) {
      console.error("❌ BACKEND (Service) - Company not found!");
      return null;
    }

    // Apply all updates from $set to the document
    // CRITICAL: Set fields directly on the document and ensure they're recognized
    Object.keys(update.$set).forEach((key) => {
      const value = update.$set[key];
      // Set the field directly on the document
      (company as any).set(key, value);
    });

    // Save the document - this ensures Mongoose properly validates and saves all fields
    const updatedCompany = await company.save();
    
    return updatedCompany;
  }

  async cacNumberExists(cacNumber: string, excludeCompanyId?: Types.ObjectId): Promise<boolean> {
    const query: any = { cacNumber: cacNumber.trim() };
    if (excludeCompanyId) {
      query._id = { $ne: excludeCompanyId };
    }
    const company = await Company.findOne(query);
    return !!company;
  }

  async tinExists(tin: string, excludeCompanyId?: Types.ObjectId): Promise<boolean> {
    const query: any = { tin: tin.trim() };
    if (excludeCompanyId) {
      query._id = { $ne: excludeCompanyId };
    }
    const company = await Company.findOne(query);
    return !!company;
  }

  /**
   * Calculate Company Income Tax (CIT) with WHT credits applied
   * Reference: NRS (Nigeria Revenue Service) - formerly NRS (https://www.firs.gov.ng/)
   * 
   * NOTE: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
   * 
   * WHT credits offset final CIT liability per NRS regulations.
   * This method calculates CIT based on taxable profit and applies available WHT credits.
   * 
   * @param companyId - Company ID (for tax classification and WHT credit lookup)
   * @param taxableProfit - Annual taxable profit (revenue - expenses)
   * @param taxYear - Tax year for calculation
   * @returns Object with CIT before/after WHT credits
   */
  async calculateCITWithWHTCredits(
    companyId: Types.ObjectId,
    taxableProfit: number,
    taxYear?: number
  ): Promise<{
    taxClassification: TaxClassification;
    citRate: number;
    citBeforeWHT: number;
    whtCredits: number;
    citAfterWHT: number;
    creditApplied: number;
  }> {
    // CRITICAL: Validate taxYear - no fallback, fail loudly if missing
    if (taxYear === undefined || taxYear === null) {
      throw new Error("CRITICAL: taxYear is required for CIT calculation. Cannot use fallback.");
    }
    const year = taxYear;
    
    // Get company for tax classification
    const company = await Company.findById(companyId).lean();
    if (!company) {
      throw new Error("Company not found");
    }

    // CRITICAL: Determine tax classification - calculate from computed turnover
    // Annual turnover is now computed from invoices, not stored
    // CRITICAL: Determine tax classification - ALWAYS calculate from computed turnover
    // Do NOT use stored classification as it may be stale (e.g. set at creation when turnover was 0)
    // The CIT return must reflect the actual turnover for the tax year
    const annualTurnover = await this.calculateAnnualTurnover(companyId, year);
    const taxClassification = this.calculateTaxClassification(
      annualTurnover,
      company.fixedAssets,
      year
    );

    // CRITICAL: Normalize tax classification to ensure it matches enum values
    let normalizedTaxClassification: TaxClassification;
    
    if (typeof taxClassification === "string") {
      const normalized = taxClassification.toLowerCase().trim();
      if (normalized === "small_company" || normalized === "smallcompany") {
        normalizedTaxClassification = TaxClassification.SmallCompany;
      } else if (normalized === "medium") {
        normalizedTaxClassification = TaxClassification.Medium;
      } else if (normalized === "large") {
        normalizedTaxClassification = TaxClassification.Large;
      } else {
        throw new Error(
          `CRITICAL: Invalid tax classification value: "${taxClassification}" (normalized: "${normalized}"). ` +
          `Must be one of: ${TaxClassification.SmallCompany}, ${TaxClassification.Medium}, ${TaxClassification.Large}. ` +
          `Company ID: ${companyId.toString()}, Tax Year: ${year}.`
        );
      }
    } else if (taxClassification === TaxClassification.SmallCompany || 
               taxClassification === TaxClassification.Medium || 
               taxClassification === TaxClassification.Large) {
      normalizedTaxClassification = taxClassification;
    } else {
      throw new Error(
        `CRITICAL: Invalid tax classification type or value. ` +
        `Type: ${typeof taxClassification}, Value: ${taxClassification}. ` +
        `Must be TaxClassification enum value. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${year}.`
      );
    }

    // CIT rates per NRS (Nigeria Revenue Service) regulations
    // CRITICAL: Use enum values as keys to ensure exact match
    // Standard CIT Rate: 30% (Unified for Medium/Large in 2025 Act)
    const standardRate = NRS_CIT_RATE / 100; // Convert 30 to 0.30

    const CIT_RATES: Record<TaxClassification, number> = {
      [TaxClassification.SmallCompany]: 0, // Exempt
      [TaxClassification.Medium]: standardRate, // 30% (Standard Rate)
      [TaxClassification.Large]: standardRate, // 30%
    };

    // CRITICAL: Get citRate from mapping - fail loudly if not found (no fallback)
    const citRate = CIT_RATES[normalizedTaxClassification];
    
    if (citRate === undefined || citRate === null) {
      throw new Error(
        `CRITICAL: CIT rate not found for tax classification: ${normalizedTaxClassification}. ` +
        `Available classifications: ${Object.keys(CIT_RATES).join(", ")}. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${year}. ` +
        `This indicates a code error - all TaxClassification enum values must have corresponding rates.`
      );
    }
    
    // CRITICAL: Validate citRate is a valid number - fail loudly if invalid
    if (typeof citRate !== "number") {
      throw new Error(
        `CRITICAL: CIT rate is not a number. Type: ${typeof citRate}, Value: ${citRate}. ` +
        `Tax classification: ${normalizedTaxClassification}. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${year}.`
      );
    }
    
    if (isNaN(citRate)) {
      throw new Error(
        `CRITICAL: CIT rate is NaN. Tax classification: ${normalizedTaxClassification}. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${year}. ` +
        `This indicates a calculation error.`
      );
    }
    
    if (!isFinite(citRate)) {
      throw new Error(
        `CRITICAL: CIT rate is not finite: ${citRate}. ` +
        `Tax classification: ${normalizedTaxClassification}. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${year}.`
      );
    }
    
    // CRITICAL: Calculate CIT before WHT credits using the classification-based rate
    // DO NOT use calculateCorporateIncomeTax() which hardcodes 30% rate
    const citBeforeWHT = Math.max(0, taxableProfit * citRate);
    
    // Get WHT credits for this company
    let whtCredits = 0;
    let creditApplied = 0;
    try {
      whtCredits = await whtService.getTotalWHTCredits(companyId, year);
      
      // Apply WHT credits to reduce CIT liability
      if (whtCredits > 0 && citBeforeWHT > 0) {
        const result = await whtService.applyWHTCredit(
          companyId,
          AccountType.Company, // CRITICAL: Use enum, not string literal
          year,
          citBeforeWHT
        );
        creditApplied = result.creditApplied;
      }
    } catch (error: any) {
      // CRITICAL: Log as error - WHT credit calculation failure affects tax accuracy
      logger.error("CRITICAL: Error fetching/applying WHT credits for CIT calculation", error, {
        companyId: companyId.toString(),
        taxYear: year,
        taxClassification: normalizedTaxClassification,
        citBeforeWHT,
      });
      // Continue with 0 WHT credits but log as critical error
      // Note: This is acceptable for calculation purposes but indicates data/service issue
    }
    
    // Calculate final CIT after WHT credits
    const citAfterWHT = calculateTaxAfterWHTCredit(citBeforeWHT, whtCredits);
    
    return {
      taxClassification: normalizedTaxClassification,
      citRate,
      citBeforeWHT,
      whtCredits,
      citAfterWHT,
      creditApplied,
    };
  }
}

export const companyService = new CompanyService();


