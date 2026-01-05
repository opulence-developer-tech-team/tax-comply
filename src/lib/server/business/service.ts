import { Types } from "mongoose";
import { NRS_CIT_SMALL_COMPANY_THRESHOLD_2026, NRS_VAT_TURNOVER_THRESHOLD_2026 } from "../../constants/nrs-constants";
import Business from "./entity";
import Invoice from "../invoice/entity";
import { IBusiness, IBusinessOnboarding } from "./interface";
import { TaxClassification, ComplianceStatus, InvoiceStatus } from "../utils/enum";

class BusinessService {
  /**
   * Calculate tax classification based on turnover and fixed assets
   * Reference: Nigeria Tax Act 2025, NRS (Nigeria Revenue Service) regulations
   * 
   * CRITICAL: Business accounts (sole proprietorships) use PIT (Personal Income Tax), NOT CIT (Company Income Tax).
   * This classification is stored for reference/compliance tracking but is NOT used for tax calculations.
   * PIT uses graduated brackets (0-25% based on income), not CIT rates (0%, 20%, 30% based on classification).
   * 
   * This method is kept for backward compatibility and potential future use (e.g., VAT thresholds, WHT rates),
   * but Business accounts should use PIT brackets for tax calculations, not this classification.
   * 
   * @param turnover - Annual turnover (in Naira)
   * @param fixedAssets - Total fixed assets (in Naira)
   * @param taxYear - Tax year for calculation
   * @returns Tax classification (SmallCompany, Medium, or Large) - NOTE: Not used for PIT calculations
   */
  calculateTaxClassification(
    turnover?: number,
    fixedAssets?: number,
    taxYear?: number
  ): TaxClassification {
    if (!turnover || turnover === 0) {
      return TaxClassification.SmallCompany;
    }

    const year = taxYear || new Date().getFullYear();
    
    if (year >= 2026) {
      // CRITICAL UPDATE: Strictly align with Finance Act / Tax Act 2025 for TAX purposes.
      // Small Company (CIT Exempt): Turnover <= 50M.
      // Medium Company (CIT 30%): Turnover > 50M but <= 500M.
      // Large Company (CIT 30%): Turnover > 500M.
      // Note: VAT Registration threshold is different (25M).
      
      // 2026 compliant logic using centralized constants
      if (turnover <= NRS_CIT_SMALL_COMPANY_THRESHOLD_2026) {
        return TaxClassification.SmallCompany;
      } else if (turnover <= 500_000_000) {
        return TaxClassification.Medium;
      } else {
        return TaxClassification.Large;
      }
    } else {
      // Legacy thresholds (Pre-2026/Act 2025)
      if (turnover < 25_000_000) {
        return TaxClassification.SmallCompany;
      } else if (turnover < 100_000_000) {
        return TaxClassification.Medium;
      } else {
        return TaxClassification.Large;
      }
    }
  }

  /**
   * Compute annual turnover from paid invoices for the specified tax year.
   * Turnover = Sum of Subtotals (excluding VAT) for Paid invoices.
   * 
   * CRITICAL: Using verified invoice data for all tax calculations (fail loud approach).
   */
  async calculateAnnualTurnover(businessId: Types.ObjectId, taxYear?: number): Promise<number> {
    const year = taxYear || new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const result = await Invoice.aggregate([
      {
        $match: {
          companyId: businessId, // Invoice uses 'companyId' field for business link
          status: { $in: [InvoiceStatus.Paid, InvoiceStatus.Pending] }, // Accrual Basis: Paid + Accounts Receivable
          issueDate: { $gte: startOfYear, $lte: endOfYear } // Use Issue Date for revenue recognition
        }
      },
      {
        $group: {
          _id: null,
          totalTurnover: { $sum: "$subtotal" } // Sum subtotal (Excl VAT)
        }
      }
    ]);

    return result.length > 0 ? result[0].totalTurnover : 0;
  }

  /**
   * Compute assessable income for Personal Income Tax (PIT) liability.
   * Basis: Cash Basis (Actual Receipts)
   * 
   * CRITICAL: For Sole Proprietorships/Business Names under Nigeria Tax Act,
   * PIT is generally assessed on income "derived from" or "received in" Nigeria.
   * For individuals, this typically implies a Cash Basis (actual money received),
   * ensuring users don't pay tax on money they haven't collected yet.
   * 
   * Difference from Annual Turnover:
   * - Turnover (Accrual): Includes Pending invoices. Used for Thresholds (VAT, Micro Business status).
   * - Assessable Income (Cash): Excludes Pending invoices. Used for Tax Liability (How much to pay).
   */
  async calculateAssessableIncome(businessId: Types.ObjectId, taxYear?: number): Promise<number> {
    const year = taxYear || new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const result = await Invoice.aggregate([
      {
        $match: {
          companyId: businessId,
          status: InvoiceStatus.Paid, // CASH BASIS: Only Paid invoices count for liability
          issueDate: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$subtotal" } // Sum subtotal (Excl VAT)
        }
      }
    ]);

    return result.length > 0 ? result[0].totalIncome : 0;
  }

  async createBusiness(
    ownerId: Types.ObjectId,
    businessData: IBusinessOnboarding
  ): Promise<IBusiness> {
    const taxClassification = this.calculateTaxClassification(
      0, // New business starts with 0 turnover until invoices are created
      businessData.fixedAssets
    );

    // Privacy consent tracking
    const privacyConsentDate = businessData.privacyConsentGiven ? new Date() : null;
    if (businessData.privacyConsentGiven && !businessData.privacyPolicyVersion) {
      throw new Error("Privacy policy version is required when consent is given");
    }

    // Normalize NRS (Nigeria Revenue Service) related fields before saving
    const { normalizeTIN, normalizeNigerianPhone, normalizeVRN } = await import("../utils/nrs-validators");
    
    const normalizedBusinessData = {
      ...businessData,
      ...(businessData.tin && { tin: normalizeTIN(businessData.tin) }),
      ...(businessData.phoneNumber && { phoneNumber: normalizeNigerianPhone(businessData.phoneNumber) }),
      ...(businessData.vatRegistrationNumber && { vatRegistrationNumber: normalizeVRN(businessData.vatRegistrationNumber) }),
    };

    const business = new Business({
      ownerId,
      ...normalizedBusinessData,
      country: normalizedBusinessData.state ? "Nigeria" : "Nigeria",
      taxClassification,
      complianceStatus: ComplianceStatus.AtRisk,
      lastComplianceCheck: new Date(),
      privacyConsentGiven: businessData.privacyConsentGiven,
      privacyConsentDate: privacyConsentDate,
      privacyPolicyVersion: businessData.privacyPolicyVersion,
    });

    await business.save();
    
    return business;
  }

  async getBusinessById(businessId: Types.ObjectId): Promise<IBusiness | null> {
    const business = await Business.findById(businessId);
    if (!business) return null;

    const annualTurnover = await this.calculateAnnualTurnover(business._id as Types.ObjectId);
    const businessObj = business.toObject();
    
    // Update tax classification based on real turnover
    const taxClassification = this.calculateTaxClassification(annualTurnover, businessObj.fixedAssets);

    return {
      ...businessObj,
      annualTurnover,
      taxClassification // Return updated classification logic
    };
  }

  async getBusinessesByOwner(ownerId: Types.ObjectId): Promise<IBusiness[]> {
    const businesses = await Business.find({ ownerId }).sort({ createdAt: -1 });
    
    // Enrich with computed turnover
    const enrichedBusinesses = await Promise.all(businesses.map(async (business) => {
      const annualTurnover = await this.calculateAnnualTurnover(business._id as Types.ObjectId);
      const businessObj = business.toObject();
      const taxClassification = this.calculateTaxClassification(annualTurnover, businessObj.fixedAssets);
      return {
        ...businessObj,
        annualTurnover,
        taxClassification
      };
    }));

    return enrichedBusinesses;
  }

  async getBusinessesByUser(userId: Types.ObjectId): Promise<IBusiness[]> {
    return await this.getBusinessesByOwner(userId);
  }

  async updateBusiness(
    businessId: Types.ObjectId,
    updateData: Partial<IBusinessOnboarding>
  ): Promise<IBusiness | null> {
    const update: any = { $set: {} };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] !== undefined) {
        update.$set[key] = updateData[key as keyof typeof updateData];
      }
    });

    // Only re-calculate based on Fixed Assets update (Turnover is computed from invoices)
    if (updateData.fixedAssets !== undefined) {
      const business = await Business.findById(businessId);
      // We will re-calc full classification at the end with computed turnover
    }

    // Handle privacy consent tracking
    if (updateData.privacyConsentGiven !== undefined) {
      update.$set.privacyConsentGiven = updateData.privacyConsentGiven;
      
      if (updateData.privacyConsentGiven) {
        if (!updateData.privacyPolicyVersion) {
          throw new Error("Privacy policy version is required when consent is given");
        }
        update.$set.privacyConsentDate = new Date();
        update.$set.privacyPolicyVersion = updateData.privacyPolicyVersion;
      } else {
        update.$set.privacyConsentDate = null;
        update.$set.privacyPolicyVersion = null;
      }
    }

    const business = await Business.findById(businessId);
    
    if (!business) {
      return null;
    }

    Object.keys(update.$set).forEach((key) => {
      const value = update.$set[key];
      (business as any).set(key, value);
    });

    const updatedBusiness = await business.save();
    
    // Calculate turnover again to return complete object
    const annualTurnover = await this.calculateAnnualTurnover(updatedBusiness._id as Types.ObjectId);
    const businessObj = updatedBusiness.toObject();
    
    // Re-calculate classification on the fly
    const taxClassification = this.calculateTaxClassification(annualTurnover, businessObj.fixedAssets);

    return {
      ...businessObj,
      annualTurnover,
      taxClassification
    };
  }

  async businessRegistrationNumberExists(businessRegistrationNumber: string, excludeBusinessId?: Types.ObjectId): Promise<boolean> {
    const query: any = { businessRegistrationNumber: businessRegistrationNumber.trim() };
    if (excludeBusinessId) {
      query._id = { $ne: excludeBusinessId };
    }
    const business = await Business.findOne(query);
    return !!business;
  }

  async tinExists(tin: string, excludeBusinessId?: Types.ObjectId): Promise<boolean> {
    const query: any = { tin: tin.trim() };
    if (excludeBusinessId) {
      query._id = { $ne: excludeBusinessId };
    }
    const business = await Business.findOne(query);
    return !!business;
  }
}

export const businessService = new BusinessService();

