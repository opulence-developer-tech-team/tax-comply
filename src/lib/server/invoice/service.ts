import { Types } from "mongoose";
import { createHash } from "crypto";
import Invoice from "./entity";
import { IInvoice, ICreateInvoice, IInvoiceItem } from "./interface";
import { InvoiceStatus, AccountType, TransactionType, TaxClassification } from "../utils/enum";
import { calculateVAT, calculateTotalWithVAT, getTaxYear, VATExemptionCategory, calculateWHT, calculateNetAfterWHT, getWHTRate, WHTType } from "../tax/calculator";
import { NRS_VAT_RATE, NRS_CIT_SMALL_COMPANY_THRESHOLD_2026, NRS_VAT_TURNOVER_THRESHOLD_2026, NRS_WHT_EXEMPTION_THRESHOLD_2026 } from "../../constants/nrs-constants";
// VATRecord import removed - VAT is now calculated on-the-fly from invoices/expenses
import { vatService } from "../vat/service";
import { logger } from "../utils/logger";
import { whtService } from "../wht/service";
import Company from "../company/entity";
import Business from "../business/entity";
import { pitService } from "../pit/service";

/**
 * Generate a deterministic ObjectId from company TIN for WHT credit tracking
 * This ensures WHT credits are properly aggregated for the company
 * CRITICAL: This is required for NRS compliance - WHT credits must be associated with the correct company
 */
function generateCompanyAccountId(companyTIN: string): Types.ObjectId {
  // TIN is required for WHT credit tracking (NRS compliance requirement)
  if (!companyTIN || !companyTIN.trim()) {
    throw new Error("Company TIN is required for WHT credit tracking (NRS compliance)");
  }
  const hash = createHash("sha256").update(companyTIN.trim()).digest("hex").substring(0, 24);
  return new Types.ObjectId(hash);
}

/**
 * Helper function to fetch entity (Company or Business) by ID based on account type
 * CRITICAL: Returns the entity with the same shape as Company for compatibility
 */
async function fetchEntity(entityId: Types.ObjectId, accountType?: AccountType): Promise<any> {
  if (accountType === AccountType.Business) {
    const business = await Business.findById(entityId).lean();
    if (!business) {
      throw new Error("Business not found");
    }
    return business;
  } else {
    const company = await Company.findById(entityId).lean();
    if (!company) {
      throw new Error("Company not found");
    }
    return company;
  }
}

class InvoiceService {
  async generateInvoiceNumber(companyId: Types.ObjectId): Promise<string> {
    const today = new Date();
    const datePrefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const lastInvoice = await Invoice.findOne({
      companyId,
      invoiceNumber: { $regex: `^${datePrefix}` },
    }).sort({ invoiceNumber: -1 });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    const sequenceStr = String(sequence).padStart(4, '0');
    return `${datePrefix}-${sequenceStr}`;
  }

  /**
   * Calculate invoice totals (subtotal, VAT, total)
   * 
   * CRITICAL WHT COMPLIANCE: WHT is NOT included in invoice totals.
   * WHT is deducted upon payment/settlement, not when invoice is created.
   * Invoice total = Subtotal + VAT (WHT is separate and shown only on payment).
   * 
   * Reference: NRS - Federal Inland Revenue Service (https://www.firs.gov.ng/)
   */
  calculateInvoiceTotals(
    items: IInvoiceItem[],
    vatRate: number = NRS_VAT_RATE,
    category?: string,
    whtType?: WHTType,
    companyId?: Types.ObjectId
  ) {
    const subtotal = items.reduce((sum, item) => {
      const itemAmount = item.quantity * item.unitPrice;
      return sum + itemAmount;
    }, 0);

    const taxYear = getTaxYear();
    const vatAmount = calculateVAT(subtotal, vatRate, category, taxYear);
    const total = subtotal + vatAmount; // Total = Subtotal + VAT (WHT excluded)

    // WHT is NOT included in invoice totals per NRS regulations
    // WHT is calculated separately when payment is received
    // This function returns commercial invoice totals only

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round(total * 100) / 100, // Total = Subtotal + VAT (WHT excluded)
    };
  }

  async createInvoice(invoiceData: ICreateInvoice, accountType?: AccountType): Promise<IInvoice> {
    const itemsWithAmounts: IInvoiceItem[] = invoiceData.items.map(item => ({
      ...item,
      amount: item.quantity * item.unitPrice,
    }));

    const taxYear = getTaxYear();

    // CRITICAL: Fetch entity (Company or Business) based on account type
    // For Business accounts, fetch from Business model; for Company accounts, fetch from Company model
    const company = await fetchEntity(invoiceData.companyId, accountType);

    // CRITICAL: Check if company is small for WHT exemption (turnover <= 25M)
    // Annual turnover is now computed from invoices
    let annualTurnover = 0;
    let isSmallCompanyForWHT = false;
    let isSmallCompanyForVAT = false;

    if (accountType === AccountType.Company) {
      // Calculate turnover from invoices for Company accounts
      try {
        const { companyService } = await import("../company/service");
        annualTurnover = await companyService.calculateAnnualTurnover(invoiceData.companyId, taxYear);
        
        // CRITICAL: Deduction of Tax at Source (Withholding) Regulations 2024
        // Small Company Definition for WHT Exemption is turnover <= 25M
        isSmallCompanyForWHT = annualTurnover <= NRS_WHT_EXEMPTION_THRESHOLD_2026;
        
        // CRITICAL: Nigeria Tax Act 2025 - VAT Registration Threshold is 25M (Unified)
        isSmallCompanyForVAT = annualTurnover < NRS_VAT_TURNOVER_THRESHOLD_2026;
      } catch (error) {
        // If calculation fails, assume not small company (safer assumption)
        logger.warn("Failed to calculate annual turnover for WHT/VAT exemption check (invoice creation)", {
          companyId: invoiceData.companyId.toString(),
          error: error instanceof Error ? error.message : String(error),
        });
        isSmallCompanyForWHT = false;
        isSmallCompanyForVAT = false;
      }
    } else if (accountType === AccountType.Business) {
      // Calculate turnover from invoices for Business accounts (Sole Proprietorships)
      try {
        const startOfYear = new Date(taxYear, 0, 1);
        const endOfYear = new Date(taxYear, 11, 31, 23, 59, 59, 999);
        
        // CRITICAL: Compute turnover dynamically from PAID invoices
        // "Annual Turnover" is strictly defined as sum of Subtotals (Excl. VAT) of Paid Invoices
        const result = await Invoice.aggregate([
          { 
            $match: { 
              companyId: new Types.ObjectId(invoiceData.companyId), // For Business, companyId field holds businessId
              status: InvoiceStatus.Paid,
              issueDate: { $gte: startOfYear, $lte: endOfYear }
            } 
          },
          {
            $group: {
              _id: null,
              totalTurnover: { $sum: "$subtotal" } // Turnover is Net of VAT
            }
          }
        ]);
        
        annualTurnover = result.length > 0 ? result[0].totalTurnover : 0;
        
        // CRITICAL: Unincorporated Entities (Sole Props) WHT Exemption Threshold is ₦25M
        // Unlike Companies, Unincorporated entities have a lower threshold for WHT compliance/exemption
        isSmallCompanyForWHT = annualTurnover <= NRS_WHT_EXEMPTION_THRESHOLD_2026;
        
        // CRITICAL: Nigeria Tax Act 2025 - VAT Registration Threshold is 25M (Unified)
        isSmallCompanyForVAT = annualTurnover < NRS_VAT_TURNOVER_THRESHOLD_2026;
        
        logger.info("Computed annual turnover for Business Tax checks", {
          businessId: invoiceData.companyId.toString(),
          annualTurnover,
          isSmallCompanyForWHT, // Threshold 25M
          isSmallCompanyForVAT, // Threshold 25M
        });
      } catch (error) {
        logger.warn("Failed to calculate annual turnover for Business Tax check", {
          businessId: invoiceData.companyId.toString(),
          error: error instanceof Error ? error.message : String(error),
        });
        isSmallCompanyForWHT = false; // Fail safe: Assume liable if calculation fails
        isSmallCompanyForVAT = false;
      }
      
      // Legacy compatibility: If taxClassification is stored, it might override (but we prioritize computed)
      if (company.taxClassification === TaxClassification.SmallCompany) {
         // Only rely on this if we couldn't compute turnover? No, computed is safer.
         // Keeping existing logic flow but ensuring computed values are primary.
      }
    }

    // Initialize isSmallCompany legacy variable for WHT calculation later (uses 25M threshold)
    let isSmallCompany = isSmallCompanyForWHT;

    // Calculate totals (including WHT if applicable)
    const subtotal = itemsWithAmounts.reduce((sum, item) => sum + item.amount, 0);
    
    // CRITICAL: VAT exemption validation and backend contract enforcement
    // BACKEND CONTRACT: 
    // - If isVATExempted is true: VAT amount MUST be 0, NO VAT record created
    // - If isVATExempted is false: VAT amount MUST be calculated, VAT record created if status is Paid
    // - If isVATExempted is undefined/null: Default to false (charge VAT)
    
    // Verify VAT Eligibility (Business Rule: Can only charge VAT if eligible)
    // VAT Eligibility: Turnover >= 25M (Nigeria Tax Act 2025) OR has VAT Registration Number
    const vatRegistrationNumber = company.vatRegistrationNumber;
    // CRITICAL: Turnover check for VAT is strict >= 25M (Act 2025)
    // Note: WHT exemption is usually <= 25M. These are distinct thresholds.
    const isVatEligible = (vatRegistrationNumber && vatRegistrationNumber.trim() !== "") || !isSmallCompanyForVAT;

    // CRITICAL: Explicit boolean conversion - no defaults, no fallbacks
    // If not eligible, MUST be exempted.
    let isVATExempted = invoiceData.isVATExempted === true;

    if (!isVatEligible && !isVATExempted) {
      // User is trying to charge VAT but is not eligible
      logger.warn("Non-eligible business attempting to charge VAT", {
         companyId: invoiceData.companyId.toString(),
         vatRegistrationNumber,
         annualTurnover,
         isSmallCompanyForVAT
      });
      // CRITICAL FAIL LOUDLY: Prevent illegal VAT charging
      // We throw an error instead of silently fixing it, to educate the user
      throw new Error(`VAT Compliance Error: Your business is not eligible to charge VAT (Annual Turnover < ₦25M and no VAT Registration Number). Please check 'VAT Exempt' or register for VAT. Computed Turnover: ₦${annualTurnover.toLocaleString()}`);
    }

    // Force exemption if not eligible (defensive programming in case we change the throw above)
    if (!isVatEligible) {
      isVATExempted = true;
    }
    
    // CRITICAL: Backend contract - Calculate VAT amount based on exemption status
    // If exempted: VAT MUST be 0 (no VAT payload)
    // If not exempted: VAT MUST be calculated and present (fail loudly if calculation fails)
    let vatAmount = 0;
    if (!isVATExempted) {
      // CRITICAL: Calculate VAT - fail loudly if calculation fails
      // No category parameter needed - VAT is calculated based on exemption checkbox only
      const calculatedVAT = calculateVAT(subtotal, NRS_VAT_RATE, undefined, taxYear);
      if (calculatedVAT === undefined || calculatedVAT === null || isNaN(calculatedVAT)) {
        throw new Error(
          `VAT calculation failed for invoice. ` +
          `Subtotal: ${subtotal}, VAT Rate: ${NRS_VAT_RATE}. ` +
          `This is a critical calculation error.`
        );
      }
      if (calculatedVAT < 0) {
        throw new Error(
          `Invalid VAT amount calculated: ${calculatedVAT}. VAT amount cannot be negative. ` +
          `This is a critical calculation error.`
        );
      }
      vatAmount = calculatedVAT;
    }
    
    const totalBeforeWHT = subtotal + vatAmount;

    // Calculate WHT if applicable
    let whtAmount = 0;
    let whtRate = 0;
    let netAmountAfterWHT = totalBeforeWHT;

    if (invoiceData.whtType) {
      // CRITICAL: User explicitly selected a WHT type - WHT must be calculated and applied
      // Do NOT apply exemptions when user makes an explicit choice
      // If user selected a WHT type, they want WHT applied regardless of company size/exemptions
      // Always calculate WHT without exemptions for user-selected WHT types
      
      // DEBUG: Log WHT calculation inputs for invoice creation
      logger.info("🔍 [DEBUG] WHT Calculation (Create Invoice) - Starting", {
        whtType: invoiceData.whtType,
        totalBeforeWHT,
        taxYear,
        isSmallCompany,
        companyTaxClassification: company.taxClassification,
        companyAnnualTurnover: "computed from invoices", // Annual turnover is now computed, not stored
        exemptionNote: "User explicitly selected WHT type - exemptions NOT applied",
      });
      
      whtAmount = calculateWHT(
        subtotal, // CRITICAL: WHT is calculated on Subtotal (Net of VAT)
        invoiceData.whtType,
        taxYear,
        false, // isSmallCompany = false (do not apply exemptions)
        false  // isServicePayment = false (do not apply exemptions)
      );
      whtRate = getWHTRate(invoiceData.whtType);
      
      // CRITICAL: Net Amount = Total (Inc VAT) - WHT
      // This is the amount the customer actually pays
      netAmountAfterWHT = totalBeforeWHT - whtAmount;
      
      // DEBUG: Log WHT calculation results for invoice creation
      logger.info("✅ [DEBUG] WHT Calculation (Create Invoice) - Results", {
        whtType: invoiceData.whtType,
        whtAmount,
        whtRate,
        totalBeforeWHT,
        netAmountAfterWHT,
      });
    }

    const invoiceNumber = await this.generateInvoiceNumber(invoiceData.companyId);

    const invoice = new Invoice({
      ...invoiceData,
      items: itemsWithAmounts,
      invoiceNumber,
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round(totalBeforeWHT * 100) / 100, // Total before WHT
      vatRate: isVATExempted ? 0 : NRS_VAT_RATE, // Set VAT rate to 0 if exempted
      isVATExempted: isVATExempted,
      whtType: invoiceData.whtType,
      whtRate: whtRate,
      whtAmount: Math.round(whtAmount * 100) / 100,
      netAmountAfterWHT: Math.round(netAmountAfterWHT * 100) / 100,
      // Use status from invoiceData if provided, otherwise default to Pending
      // This allows creating invoices as "Paid" for cash sales, immediate payments, or historical data
      status: invoiceData.status || InvoiceStatus.Pending,
    });

    await invoice.save();

    // ============================================
    // WHT HANDLING (WHT-Type-Based)
    // ============================================
    // CRITICAL: WHT records are ONLY created when invoice status is "Paid" AND WHT type is not empty
    // - If whtType is empty string "" → No WHT record created
    // - If whtType has a value AND status is "Paid" → WHT record is created
    // - If status is NOT "Paid" → No WHT record created (regardless of WHT type)
    
    const whtTypeValue = invoice.whtType;
    const hasWHTType = whtTypeValue && whtTypeValue.trim() !== "";
    const isPaid = invoice.status === InvoiceStatus.Paid;
    
    logger.info("Invoice created - checking WHT record creation", {
      invoiceId: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      whtType: whtTypeValue || "none",
      whtAmount: invoice.whtAmount ?? 0,
      whtRate: invoice.whtRate ?? 0,
      total: invoice.total,
      hasWHTType,
      isPaid,
      willCreateWHT: hasWHTType && isPaid && invoice.whtAmount && invoice.whtAmount > 0,
    });

    // CRITICAL: Validate WHT type if provided AND invoice is Paid
    // WHT records are only created when status is Paid AND WHT type is not empty
    if (hasWHTType && isPaid) {
      // Validate whtType is a valid WHTType enum value
      if (!Object.values(WHTType).includes(whtTypeValue as WHTType)) {
        throw new Error(`Invalid WHT type: ${whtTypeValue}. Must be one of: ${Object.values(WHTType).join(", ")}`);
      }

      // DEBUG: Log validation inputs for invoice creation
      logger.info("🔍 [DEBUG] WHT Validation (Create Invoice) - Starting", {
        invoiceNumber: invoice.invoiceNumber,
        whtType: whtTypeValue,
        whtAmount: invoice.whtAmount,
        whtRate: invoice.whtRate,
        status: invoice.status,
        userExplicitlySelected: "YES - exemptions should NOT apply",
      });
      
      // CRITICAL: Validate whtAmount exists and is valid
      if (invoice.whtAmount === undefined || invoice.whtAmount === null || isNaN(invoice.whtAmount)) {
        logger.warn("❌ [DEBUG] WHT Validation Failed (Create Invoice)", {
          invoiceNumber: invoice.invoiceNumber,
          whtType: whtTypeValue,
          whtAmount: invoice.whtAmount,
          error: "WHT amount is undefined, null, or NaN",
          expected: "WHT amount must be a valid number when WHT type is selected",
        });
        throw new Error(`Invalid WHT amount for invoice ${invoice.invoiceNumber}. WHT amount is required when WHT type is selected.`);
      }
      if (invoice.whtAmount <= 0) {
        logger.warn("❌ [DEBUG] WHT Validation Failed (Create Invoice)", {
          invoiceNumber: invoice.invoiceNumber,
          whtType: whtTypeValue,
          whtAmount: invoice.whtAmount,
          error: "WHT amount is 0 or negative but WHT type is selected",
          expected: "WHT amount must be > 0 when user explicitly selects a WHT type",
        });
        throw new Error(`Invalid WHT amount for invoice ${invoice.invoiceNumber}. WHT amount must be greater than 0 when WHT type is selected. User explicitly selected "${whtTypeValue}" - WHT must be applied regardless of exemptions.`);
      }
      
      logger.info("✅ [DEBUG] WHT Validation (Create Invoice) - Passed", {
        invoiceNumber: invoice.invoiceNumber,
        whtType: whtTypeValue,
        whtAmount: invoice.whtAmount,
        whtRate: invoice.whtRate,
      });

      // CRITICAL: Validate whtRate exists and is valid
      if (invoice.whtRate === undefined || invoice.whtRate === null || isNaN(invoice.whtRate)) {
        throw new Error(`Invalid WHT rate for invoice ${invoice.invoiceNumber}. WHT rate is required when WHT type is selected.`);
      }
      if (invoice.whtRate < 0 || invoice.whtRate > 100) {
        throw new Error(`Invalid WHT rate for invoice ${invoice.invoiceNumber}. WHT rate must be between 0 and 100.`);
      }

      // Create WHT record - WHT type is selected
      try {
        // CRITICAL: For invoices, the customer pays YOU (your company/business)
        // The customer deducts WHT from YOU (your company/business)
        // Therefore, YOUR COMPANY/BUSINESS is the payee (receives WHT credit), NOT the customer
        // CRITICAL: Fetch entity (Company or Business) based on accountType parameter
        let entity: any = null;
        let entityAccountType: AccountType;
        
        // Use accountType parameter if available, otherwise determine from entity lookup
        if (accountType) {
          entityAccountType = accountType;
          if (accountType === AccountType.Business) {
            entity = await Business.findById(invoice.companyId).lean();
            if (!entity) {
              throw new Error(`Business not found for WHT record creation. ID: ${invoice.companyId.toString()}`);
            }
          } else {
            entity = await Company.findById(invoice.companyId).lean();
            if (!entity) {
              throw new Error(`Company not found for WHT record creation. ID: ${invoice.companyId.toString()}`);
            }
          }
        } else {
          // Fallback: Try Company first, then Business (backward compatibility)
          entity = await Company.findById(invoice.companyId).lean();
          if (entity) {
            entityAccountType = AccountType.Company;
          } else {
            entity = await Business.findById(invoice.companyId).lean();
            if (!entity) {
              throw new Error(`Entity (Company or Business) not found for WHT record creation. ID: ${invoice.companyId.toString()}`);
            }
            entityAccountType = AccountType.Business;
          }
        }

        // Company/Business TIN is required for WHT credit tracking (NRS compliance)
        if (!entity.tin || !entity.tin.trim()) {
          throw new Error(`TIN is required for WHT record creation (NRS compliance). Entity ID: ${invoice.companyId.toString()}`);
        }

        const payeeName = entity.name;
        const payeeTIN = entity.tin;
        const companyAccountId = generateCompanyAccountId(payeeTIN);

        // Use issue date as payment date
        const paymentDate = invoice.issueDate instanceof Date 
          ? invoice.issueDate 
          : new Date(invoice.issueDate);

        if (isNaN(paymentDate.getTime())) {
          throw new Error(`Invalid issue date for invoice ${invoice.invoiceNumber}. Cannot create WHT record.`);
        }

        await whtService.createWHTRecord({
          companyId: invoice.companyId,
          accountId: companyAccountId,
          accountType: entityAccountType,
          transactionType: TransactionType.Invoice,
          transactionId: invoice._id,
          payeeName,
          payeeTIN,
          paymentAmount: invoice.total,
          whtType: whtTypeValue as WHTType,
          paymentDate: paymentDate,
          description: `WHT deducted from invoice ${invoice.invoiceNumber} by customer`,
          notes: `Invoice ${invoice.invoiceNumber} - Customer will deduct WHT when invoice is paid`,
          // CRITICAL: Pass pre-calculated WHT amounts (calculated without exemptions - user's explicit choice)
          whtAmount: invoice.whtAmount,
          whtRate: invoice.whtRate,
          netAmount: invoice.netAmountAfterWHT,
        });

        logger.info("✅ WHT record created for invoice", {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          whtAmount: invoice.whtAmount,
          whtType: whtTypeValue,
          whtRate: invoice.whtRate,
          paymentAmount: invoice.total,
          payeeName,
          payeeTIN,
          accountType,
        });
      } catch (error: any) {
        // CRITICAL: Fail loudly - WHT record creation failure aborts invoice creation
        logger.error("CRITICAL: Failed to create WHT record for invoice", error, {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          whtAmount: invoice.whtAmount,
          whtType: whtTypeValue,
          whtRate: invoice.whtRate,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        throw new Error(`Failed to create WHT record for invoice ${invoice.invoiceNumber}. Invoice creation aborted. Error: ${error?.message || "Unknown error"}`);
      }
    } else {
      // No WHT record created - either no WHT type selected OR invoice status is not Paid
      const reason = !hasWHTType 
        ? "WHT type is empty or not provided"
        : !isPaid
        ? "Invoice status is not Paid (WHT records are only created when status is Paid)"
        : "Unknown reason";
      logger.info("Invoice created - no WHT record created", {
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        whtType: whtTypeValue || "none",
        isPaid,
        reason,
      });
    }

    // Ensure issueDate is a Date object (defensive programming)
    const issueDate = invoiceData.issueDate instanceof Date 
      ? invoiceData.issueDate 
      : new Date(invoiceData.issueDate);
    
    if (isNaN(issueDate.getTime())) {
      throw new Error("Invalid issue date provided");
    }

    // CRITICAL: VAT records are ONLY created when invoice status is "Paid" AND VAT is NOT exempted
    // VAT record is deleted when status changes to anything other than "Paid" OR when VAT is exempted
    // This is a business requirement - note that this differs from standard tax compliance
    // (Standard compliance: VAT is due on supply/invoice issued, not on payment)
    if (invoice.status === InvoiceStatus.Paid && !isVATExempted) {
      // CRITICAL: Validate invoice status is exactly "Paid" (enum validation)
      if (!Object.values(InvoiceStatus).includes(invoice.status)) {
        throw new Error(`Invalid invoice status: ${invoice.status}. Must be one of: ${Object.values(InvoiceStatus).join(", ")}`);
      }

      // CRITICAL: Validate VAT amount exists and is valid
      if (vatAmount === undefined || vatAmount === null || isNaN(vatAmount)) {
        throw new Error(`Invalid VAT amount for invoice ${invoiceNumber}. VAT amount is required when status is Paid and VAT is not exempted.`);
      }
      if (vatAmount < 0) {
        throw new Error(`Invalid VAT amount for invoice ${invoiceNumber}. VAT amount cannot be negative.`);
      }

      try {
        const vatYear = issueDate.getFullYear();
        const vatMonth = issueDate.getMonth() + 1;

        // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
        if (vatYear < 2026 || vatYear > 2100) {
          throw new Error(`Invalid tax year: ${vatYear}. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
        }

        // CRITICAL: Validate month is valid (1-12)
        if (vatMonth < 1 || vatMonth > 12) {
          throw new Error(`Invalid month: ${vatMonth}. Month must be between 1 and 12.`);
        }

        // CRITICAL: Validate companyId exists
        if (!invoiceData.companyId || !Types.ObjectId.isValid(invoiceData.companyId)) {
          throw new Error(`Invalid company ID for invoice ${invoiceNumber}. Company ID is required.`);
        }

        // CRITICAL: Update VAT summary for the period (calculates on-the-fly from invoices/expenses)
        // No need to create VATRecord - we calculate directly from source data
        // CRITICAL: Pass accountType for proper expense querying (Business uses accountId, Company uses companyId)
        await vatService.updateVATSummary(
          invoiceData.companyId,
          vatMonth,
          vatYear,
          accountType
        );

        logger.info("VAT summary updated for paid invoice (on-the-fly calculation)", {
          invoiceId: invoice._id.toString(),
          invoiceNumber,
          status: invoice.status,
          vatAmount,
          isVATExempted: false,
          month: vatMonth,
          year: vatYear,
          accountType: accountType || "not provided",
        });
      } catch (error: any) {
        // CRITICAL: Fail loudly - VAT summary update failure aborts invoice creation
        logger.error("CRITICAL: Failed to update VAT summary for paid invoice", error, {
          invoiceId: invoice._id?.toString(),
          invoiceNumber,
          status: invoice.status,
          vatAmount,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        throw new Error(`Failed to update VAT summary for invoice ${invoiceNumber}. Invoice creation aborted. Error: ${error?.message || "Unknown error"}`);
      }
    } else {
      // Invoice status is NOT "Paid" OR VAT is exempted - no VAT record created
      // CRITICAL: Validate status is a valid enum value
      if (!Object.values(InvoiceStatus).includes(invoice.status)) {
        throw new Error(`Invalid invoice status: ${invoice.status}. Must be one of: ${Object.values(InvoiceStatus).join(", ")}`);
      }
      const reason = isVATExempted 
        ? "VAT is exempted for this invoice (VAT-exempt goods/services)"
        : "VAT records are only created when invoice status is Paid";
      logger.info("Invoice created - no VAT record created", {
        invoiceId: invoice._id.toString(),
        invoiceNumber,
        status: invoice.status,
        isVATExempted,
        reason,
      });
    }

    logger.info("Invoice created", {
      invoiceId: invoice._id.toString(),
      companyId: invoiceData.companyId.toString(),
      invoiceNumber,
    });

    // ============================================
    // PIT SUMMARY UPDATE (Business Accounts Only) - REMOVED
    // ============================================
    // Refactored to On-The-Fly calculation. No need to persist state.
    return invoice;
  }

  async getInvoiceById(invoiceId: Types.ObjectId): Promise<IInvoice | null> {
    return await Invoice.findById(invoiceId);
  }

  /**
   * Get invoice with company details for public/guest viewing
   * SECURITY: Only returns invoice if it exists and is not cancelled
   */
  async getPublicInvoice(invoiceId: Types.ObjectId): Promise<{
    invoice: IInvoice | null;
    company: any | null;
  }> {
    const invoice = await Invoice.findById(invoiceId).lean();
    
    if (!invoice) {
      return { invoice: null, company: null };
    }

    // SECURITY: Don't allow viewing cancelled invoices publicly
    if (invoice.status === InvoiceStatus.Cancelled) {
      logger.warn("Attempt to view cancelled invoice publicly", {
        invoiceId: invoiceId.toString(),
      });
      return { invoice: null, company: null };
    }

    // CRITICAL: Get entity details (Company or Business)
    // Since this is a public endpoint, we don't have accountType, so try both
    let company: any = null;
    try {
      company = await Company.findById(invoice.companyId).lean();
      if (!company) {
        company = await Business.findById(invoice.companyId).lean();
      }
    } catch (error) {
      company = await Business.findById(invoice.companyId).lean();
    }

    return {
      invoice: invoice as IInvoice,
      company,
    };
  }

  async getCompanyInvoices(
    companyId: Types.ObjectId,
    filters?: {
      status?: InvoiceStatus;
      startDate?: Date;
      endDate?: Date;
      year?: number;
      month?: number;
      search?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ invoices: IInvoice[]; total: number }> {
    const query: any = { companyId };

    if (filters?.status) {
      query.status = filters.status;
    }

    // Server-side search: Search across customerName, invoiceNumber, and customerEmail
    // Use case-insensitive regex for partial matching
    const searchOr: any[] = [];
    if (filters?.search && filters.search.trim().length > 0) {
      const searchRegex = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      searchOr.push(
        { customerName: { $regex: searchRegex } },
        { invoiceNumber: { $regex: searchRegex } },
        { customerEmail: { $regex: searchRegex } }
      );
      
      logger.info("Applying search filter", {
        companyId: companyId.toString(),
        searchTerm: filters.search,
        searchRegex: searchRegex.toString(),
      });
    }

    // Use MongoDB's $expr with $year and $month operators for more reliable filtering
    // This extracts the year/month from the stored date regardless of timezone
    const exprConditions: any[] = [];
    
    if (filters?.year) {
      // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      if (filters.year < 2026) {
        throw new Error("Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.");
      }
      // Filter by year using MongoDB's $year operator
      exprConditions.push({ $eq: [{ $year: "$issueDate" }, filters.year] });
    }
    
    // Allow month filtering independently (can filter across all years)
    if (filters?.month && filters.month >= 1 && filters.month <= 12) {
      exprConditions.push({ $eq: [{ $month: "$issueDate" }, filters.month] });
    }
    
    // Build query conditions - need to handle combination of search and date filters
    const queryConditions: any[] = [];
    
    if (searchOr.length > 0) {
      queryConditions.push({ $or: searchOr });
    }
    
    if (exprConditions.length > 0) {
      const dateExpr = exprConditions.length === 1 ? exprConditions[0] : { $and: exprConditions };
      queryConditions.push({ $expr: dateExpr });
      
      logger.info("Using $year/$month operator for filtering", {
        year: filters?.year ?? undefined,
        month: filters?.month ?? undefined,
        queryExpr: JSON.stringify(dateExpr),
      });
    } else if (filters?.startDate || filters?.endDate) {
      // Fallback to date range for custom date ranges
      const dateRange: any = {};
      if (filters.startDate) {
        dateRange.$gte = filters.startDate;
      }
      if (filters.endDate) {
        dateRange.$lte = filters.endDate;
      }
      queryConditions.push({ issueDate: dateRange });
      
      logger.info("Date filter applied to query", {
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString(),
      });
    }
    
    // Combine all conditions with $and if we have multiple conditions
    if (queryConditions.length > 1) {
      query.$and = queryConditions;
    } else if (queryConditions.length === 1) {
      // Merge single condition into query
      Object.assign(query, queryConditions[0]);
    }

    // First, check total invoices without date filter for debugging
    const totalWithoutDateFilter = await Invoice.countDocuments({ companyId });
    
    // DIAGNOSTIC: Check if ANY invoices exist in the database (for debugging)
    const totalInvoicesAnywhere = await Invoice.countDocuments({});
    const sampleInvoicesAnywhere = await Invoice.find({})
      .sort({ issueDate: -1 })
      .limit(5)
      .select("companyId issueDate invoiceNumber status")
      .lean();
    
    // ALWAYS get sample invoices to see what exists (for debugging)
    const sampleInvoices = await Invoice.find({ companyId })
      .sort({ issueDate: -1 })
      .limit(10)
      .select("issueDate invoiceNumber status")
      .lean();
    
    // Extract years from sample invoices for debugging
    const yearsInDatabase = sampleInvoices.map((inv: any) => {
      if (!inv.issueDate) return null;
      const date = new Date(inv.issueDate);
      return {
        invoiceNumber: inv.invoiceNumber,
        year: date.getFullYear(),
        utcYear: date.getUTCFullYear(),
        month: date.getMonth() + 1,
        utcMonth: date.getUTCMonth() + 1,
        fullDate: inv.issueDate?.toISOString(),
      };
    }).filter(Boolean);
    
    // Log diagnostic info if no invoices found for this company
    if (totalWithoutDateFilter === 0) {
      logger.warn("⚠️ No invoices found for this company", {
        companyId: companyId.toString(),
        totalInvoicesForThisCompany: totalWithoutDateFilter,
        totalInvoicesInEntireDatabase: totalInvoicesAnywhere,
        sampleInvoicesFromOtherCompanies: sampleInvoicesAnywhere.map((inv: any) => ({
          companyId: inv.companyId?.toString(),
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate?.toISOString(),
        })),
      });
    }
    
    // Log the query for debugging
    const queryForLog: any = {
      companyId: query.companyId?.toString(),
      status: query.status,
    };
    
    if (query.$expr) {
      queryForLog.$expr = query.$expr;
    }
    
    if (query.issueDate) {
      queryForLog.issueDate = {
        $gte: query.issueDate.$gte?.toISOString(),
        $lte: query.issueDate.$lte?.toISOString(),
        $lt: query.issueDate.$lt?.toISOString(),
      };
    }

    logger.info("Invoice query", {
      companyId: companyId.toString(),
      totalInvoicesForCompany: totalWithoutDateFilter,
      sampleInvoicesCount: sampleInvoices.length,
      yearsInDatabase: yearsInDatabase,
      uniqueYears: [...new Set(yearsInDatabase.map((y: any) => y.year))],
      query: queryForLog,
      filters: {
        status: filters?.status,
        year: filters?.year,
        month: filters?.month,
        startDate: filters?.startDate?.toISOString(),
        endDate: filters?.endDate?.toISOString(),
        limit: filters?.limit,
        skip: filters?.skip,
      },
    });

    // Log the exact query being executed
    logger.info("Executing MongoDB query", {
      companyId: companyId.toString(),
      query: JSON.stringify(query, null, 2),
    });

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .sort({ issueDate: -1 })
      .limit(filters?.limit || 50)
      .skip(filters?.skip || 0);

    // Log results
    logger.info("Query results", {
      companyId: companyId.toString(),
      totalMatches: total,
      invoicesReturned: invoices.length,
      hasYearFilter: !!filters?.year,
      filterYear: filters?.year,
      totalInvoicesInDB: totalWithoutDateFilter,
    });

    // Log sample invoice dates for debugging
    if (invoices.length > 0) {
      logger.info("Sample invoice dates from results", {
        companyId: companyId.toString(),
        firstInvoiceDate: invoices[0].issueDate?.toISOString(),
        lastInvoiceDate: invoices[invoices.length - 1].issueDate?.toISOString(),
      });
    } else if (totalWithoutDateFilter > 0 && (filters?.year || filters?.startDate || filters?.endDate)) {
      // If there are invoices but none match the filter, analyze why
      logger.warn("⚠️ No invoices match date filter, but invoices exist", {
        companyId: companyId.toString(),
        totalInvoices: totalWithoutDateFilter,
        sampleInvoiceDates: sampleInvoices.map((inv: any) => {
          const invDate = new Date(inv.issueDate);
          return {
            invoiceNumber: inv.invoiceNumber,
            issueDate: inv.issueDate?.toISOString(),
            issueDateYear: invDate.getFullYear(),
            issueDateUTCYear: invDate.getUTCFullYear(),
            issueDateUTC: invDate.getTime(),
          };
        }),
        filterStartDate: filters?.startDate?.toISOString(),
        filterEndDate: filters?.endDate?.toISOString(),
        filterStartUTC: filters?.startDate?.getTime(),
        filterEndUTC: filters?.endDate?.getTime(),
        filterStartYear: filters?.startDate?.getUTCFullYear(),
        filterEndYear: filters?.endDate?.getUTCFullYear(),
        dateComparison: sampleInvoices.map((inv: any) => {
          const invDate = new Date(inv.issueDate);
          const startDate = filters?.startDate;
          const endDate = filters?.endDate;
          return {
            invoiceNumber: inv.invoiceNumber,
            isAfterStart: startDate ? invDate >= startDate : true,
            isBeforeEnd: endDate ? invDate <= endDate : true,
            matchesFilter: (!startDate || invDate >= startDate) && (!endDate || invDate <= endDate),
          };
        }),
      });
    }

    logger.info("Invoice query results", {
      companyId: companyId.toString(),
      total,
      found: invoices.length,
      queryHadDateFilter: !!query.issueDate,
      totalWithoutDateFilter,
    });

    return { invoices, total };
  }

  /**
   * Get aggregated totals (subtotal, VAT, total) for invoices matching filters
   * 
   * CRITICAL COMPANY RULE: Only PAID invoices are included in financial calculations.
   * This ensures accurate revenue reporting - only money actually received counts.
   * 
   * Uses MongoDB aggregation pipeline for efficient calculation.
   * This is critical for accurate totals across all matching invoices, not just current page.
   * 
   * @param companyId - Company ID to filter invoices
   * @param filters - Optional filters (year, month, search, etc.)
   * @param includeOnlyPaid - If true (default), only calculate paid invoices. If false, calculate all statuses.
   *                          Set to false only for special reporting needs, not for financial summaries.
   */
  async getInvoiceTotals(
    companyId: Types.ObjectId,
    filters?: {
      status?: InvoiceStatus;
      startDate?: Date;
      endDate?: Date;
      year?: number;
      month?: number;
      search?: string;
    },
    includeOnlyPaid: boolean = true
  ): Promise<{ subtotal: number; vatAmount: number; total: number; count: number }> {
    // Build the same query as getCompanyInvoices for consistency
    const query: any = { companyId };

    // CRITICAL COMPANY RULE: For financial summaries, ONLY count paid invoices
    // Only money actually received should be in financial calculations
    // This prevents inflating revenue with unpaid invoices (pending/cancelled)
    if (includeOnlyPaid) {
      query.status = InvoiceStatus.Paid;
      // Explicitly ignore any status filter when includeOnlyPaid is true
      // This prevents accidentally including non-paid invoices in financial calculations
      logger.info("Financial totals calculation: Only including PAID invoices", {
        companyId: companyId.toString(),
        year: filters?.year,
        month: filters?.month,
      });
    } else if (filters?.status) {
      // If explicitly requesting a specific status (and includeOnlyPaid is false), use it
      // This is for special reporting cases, not financial summaries
      query.status = filters.status;
      logger.warn("Financial totals calculation: Including non-paid invoices", {
        companyId: companyId.toString(),
        status: filters.status,
        note: "This should only be used for special reporting, not financial summaries",
      });
    }
    // If includeOnlyPaid is false and no status filter, include all statuses (for special cases)

    // Server-side search: Search across customerName, invoiceNumber, and customerEmail
    if (filters?.search && filters.search.trim().length > 0) {
      const searchRegex = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { customerName: { $regex: searchRegex } },
        { invoiceNumber: { $regex: searchRegex } },
        { customerEmail: { $regex: searchRegex } },
      ];
    }

    // Use MongoDB's $expr with $year and $month operators for date filtering
    const exprConditions: any[] = [];
    
    if (filters?.year) {
      exprConditions.push({ $eq: [{ $year: "$issueDate" }, filters.year] });
    }
    
    if (filters?.month && filters.month >= 1 && filters.month <= 12) {
      exprConditions.push({ $eq: [{ $month: "$issueDate" }, filters.month] });
    }
    
    // Handle date filtering - need to combine with $or if search is present
    if (exprConditions.length > 0) {
      const dateExpr = exprConditions.length === 1 ? exprConditions[0] : { $and: exprConditions };
      
      // If we have both search ($or) and date filter ($expr), combine them with $and
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $expr: dateExpr },
        ];
        delete query.$or; // Remove $or from top level, it's now in $and
      } else {
        query.$expr = dateExpr;
      }
    } else if (filters?.startDate || filters?.endDate) {
      query.issueDate = {};
      if (filters.startDate) {
        query.issueDate.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.issueDate.$lte = filters.endDate;
      }
      
      // If we have both search ($or) and date range, combine them
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { issueDate: query.issueDate },
        ];
        delete query.$or;
        delete query.issueDate;
      }
    }

    // Use MongoDB aggregation pipeline for efficient calculation
    const aggregationResult = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          subtotal: { $sum: "$subtotal" },
          vatAmount: { $sum: "$vatAmount" },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
    ]);

    // If no invoices match, return zeros
    if (!aggregationResult || aggregationResult.length === 0) {
      return {
        subtotal: 0,
        vatAmount: 0,
        total: 0,
        count: 0,
      };
    }

    const result = aggregationResult[0];
    
    // Round to 2 decimal places to avoid floating point precision issues
    return {
      subtotal: Math.round(result.subtotal * 100) / 100,
      vatAmount: Math.round(result.vatAmount * 100) / 100,
      total: Math.round(result.total * 100) / 100,
      count: result.count,
    };
  }

  /**
   * Update invoice status
   * 
   * CRITICAL NRS COMPLIANCE RULES:
   * 1. VAT: Due on supply (invoice issued), NOT payment-dependent
   *    - VAT record created on invoice creation (supply occurred)
   *    - VAT record deleted ONLY when invoice is cancelled (no supply occurred)
   *    - VAT record recreated when invoice uncancelled (supply occurred again)
   *    - Payment status (Pending/Paid) does NOT affect VAT liability
   * 
   * 2. WHT: Due on payment/settlement, IS payment-dependent
   *    - WHT record created ONLY when status changes to "Paid"
   *    - WHT record NOT created for Pending invoices
   * 
   * Reference: NRS - Federal Inland Revenue Service (https://www.firs.gov.ng/)
   * VAT Act: VAT is due when goods/services are supplied (invoice issued)
   * WHT Act: WHT is deducted upon payment/settlement
   */
  async updateInvoiceStatus(
    invoiceId: Types.ObjectId,
    status: InvoiceStatus,
    accountType?: AccountType
  ): Promise<IInvoice | null> {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return null;
    }

    const previousStatus = invoice.status;
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      { status },
      { new: true }
    );

    if (!updatedInvoice) {
      return null;
    }

    // ============================================
    // VAT HANDLING (Payment-Based - Business Requirement)
    // ============================================
    // CRITICAL: VAT records are ONLY created when invoice status is "Paid"
    // VAT record is deleted when status changes to anything other than "Paid"
    // This is a business requirement - note that this differs from standard tax compliance
    // (Standard compliance: VAT is due on supply/invoice issued, not on payment)
    
    // CRITICAL: Validate status is a valid enum value
    if (!Object.values(InvoiceStatus).includes(status)) {
      throw new Error(`Invalid invoice status: ${status}. Must be one of: ${Object.values(InvoiceStatus).join(", ")}`);
    }
    if (!Object.values(InvoiceStatus).includes(previousStatus)) {
      throw new Error(`Invalid previous invoice status: ${previousStatus}. Must be one of: ${Object.values(InvoiceStatus).join(", ")}`);
    }

    // CRITICAL: Get VAT exemption status from invoice
    const isVATExempted = invoice.isVATExempted === true;

    // Case 1: Status changed TO "Paid" - Update VAT summary (payment received)
    // CRITICAL: VAT is calculated on-the-fly, so we just refresh the summary
    if (status === InvoiceStatus.Paid && previousStatus !== InvoiceStatus.Paid && !isVATExempted) {
      // CRITICAL: Validate VAT amount exists and is valid
      if (updatedInvoice.vatAmount === undefined || updatedInvoice.vatAmount === null || isNaN(updatedInvoice.vatAmount)) {
        throw new Error(`Invalid VAT amount for invoice ${updatedInvoice.invoiceNumber}. VAT amount is required when status is Paid.`);
      }
      if (updatedInvoice.vatAmount < 0) {
        throw new Error(`Invalid VAT amount for invoice ${updatedInvoice.invoiceNumber}. VAT amount cannot be negative.`);
      }

      const issueDate = updatedInvoice.issueDate instanceof Date 
        ? updatedInvoice.issueDate 
        : new Date(updatedInvoice.issueDate);
      
      if (isNaN(issueDate.getTime())) {
        throw new Error(`Invalid issue date for invoice ${updatedInvoice.invoiceNumber}. Cannot update VAT summary.`);
      }
      
      try {
        const vatYear = issueDate.getFullYear();
        const vatMonth = issueDate.getMonth() + 1;

        // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
        if (vatYear < 2026 || vatYear > 2100) {
          throw new Error(`Invalid tax year: ${vatYear}. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
        }

        // CRITICAL: Validate month is valid (1-12)
        if (vatMonth < 1 || vatMonth > 12) {
          throw new Error(`Invalid month: ${vatMonth}. Month must be between 1 and 12.`);
        }

        // CRITICAL: Validate companyId exists
        if (!updatedInvoice.companyId || !Types.ObjectId.isValid(updatedInvoice.companyId)) {
          throw new Error(`Invalid company ID for invoice ${updatedInvoice.invoiceNumber}. Company ID is required.`);
        }

        // Update VAT summary (calculates on-the-fly from invoices/expenses)
        await vatService.updateVATSummary(
          updatedInvoice.companyId,
          vatMonth,
          vatYear,
          accountType // Pass accountType for proper expense querying
        );
        
        logger.info("VAT summary updated - invoice status changed to Paid (on-the-fly calculation)", {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          month: vatMonth,
          year: vatYear,
          vatAmount: updatedInvoice.vatAmount,
          previousStatus,
          newStatus: status,
          accountType: accountType || "not provided",
        });
      } catch (error: any) {
        // CRITICAL: Fail loudly - VAT summary update failure aborts status update
        logger.error("CRITICAL: Failed to update VAT summary when invoice status changed to Paid", error, {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          vatAmount: updatedInvoice.vatAmount,
          previousStatus,
          newStatus: status,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        throw new Error(`Failed to update VAT summary for invoice ${updatedInvoice.invoiceNumber}. Status update aborted. Error: ${error?.message || "Unknown error"}`);
      }
    }
    
    // Case 2: Status changed FROM "Paid" to anything else - Update VAT summary (payment reversed/refunded)
    // CRITICAL: VAT is calculated on-the-fly, so we just refresh the summary
    if (previousStatus === InvoiceStatus.Paid && status !== InvoiceStatus.Paid && !isVATExempted) {
      const issueDate = invoice.issueDate instanceof Date 
        ? invoice.issueDate 
        : new Date(invoice.issueDate);
      
      if (!isNaN(issueDate.getTime())) {
        try {
          const month = issueDate.getMonth() + 1;
          const year = issueDate.getFullYear();

          // Recalculate VAT summary for the affected period (removes invoice from calculation)
          await vatService.updateVATSummary(invoice.companyId, month, year, accountType);
          
          logger.info("VAT summary updated - invoice status changed from Paid (on-the-fly calculation)", {
            invoiceId: invoiceId.toString(),
            invoiceNumber: invoice.invoiceNumber,
            month,
            year,
            previousStatus,
            newStatus: status,
            accountType: accountType || "not provided",
          });
        } catch (error: any) {
          // CRITICAL: Fail loudly - VAT summary update failure aborts status update
          logger.error("CRITICAL: Failed to update VAT summary when invoice status changed from Paid", error, {
            invoiceId: invoiceId.toString(),
            invoiceNumber: invoice.invoiceNumber,
            previousStatus,
            newStatus: status,
            errorMessage: error?.message,
            errorStack: error?.stack,
          });
          throw new Error(`Failed to update VAT summary for invoice ${invoice.invoiceNumber}. Status update aborted. Error: ${error?.message || "Unknown error"}`);
        }
      }
    }

    // ============================================
    // WHT HANDLING (Payment-Based)
    // ============================================
    // NRS Rule: WHT is deducted upon payment/settlement, not when invoice is created
    // Therefore: WHT records should exist ONLY for paid invoices
    
    // Find existing WHT record (if any)
    const existingWHTRecord = await whtService.findWHTRecordByTransaction(
      invoiceId,
      TransactionType.Invoice,
      invoice.companyId
    );
    
    // Case 1: Status changed FROM "Paid" to something else (Pending/Cancelled)
    // Delete WHT record - payment was reversed/refunded
    if (
      previousStatus === InvoiceStatus.Paid &&
      status !== InvoiceStatus.Paid &&
      existingWHTRecord
    ) {
      try {
        await whtService.deleteWHTRecordByTransaction(
          invoiceId,
          TransactionType.Invoice,
          invoice.companyId
        );
        logger.info("WHT record deleted - invoice status changed from Paid", {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          oldStatus: previousStatus,
          newStatus: status,
          whtAmount: existingWHTRecord.whtAmount,
        });
      } catch (error: any) {
        logger.error("Error deleting WHT record when invoice status changed from Paid", error, {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
        });
      }
    }
    
    // Case 2: Status changed TO "Paid" - Create WHT record (payment received)
    // CRITICAL WHT COMPLIANCE: Create WHT record when invoice is marked as Paid
    // WHT is deducted upon payment/settlement per NRS regulations
    // Only create WHT record if:
    // 1. Status changed to "Paid" (not if it was already paid)
    // 2. Invoice has WHT type specified (not empty string)
    // 3. WHT amount > 0
    
    // CRITICAL: Check if WHT type is empty string "" (user selected "No WHT")
    const whtTypeValue = updatedInvoice.whtType;
    const hasWHTType = whtTypeValue && whtTypeValue.trim() !== "";
    
    // CRITICAL: If WHT type is empty, delete WHT record if it exists (similar to VAT exemption)
    if (!hasWHTType && existingWHTRecord) {
      try {
        await whtService.deleteWHTRecordByTransaction(
          invoiceId,
          TransactionType.Invoice,
          invoice.companyId
        );
        logger.info("WHT record deleted - WHT type is empty (No WHT selected)", {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          whtAmount: existingWHTRecord.whtAmount,
        });
      } catch (error: any) {
        logger.error("Error deleting WHT record when WHT type is empty", error, {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
        });
      }
    }
    
    // Only create WHT record if status is Paid, WHT type is not empty, and WHT amount > 0
    if (
      status === InvoiceStatus.Paid &&
      previousStatus !== InvoiceStatus.Paid &&
      hasWHTType &&
      updatedInvoice.whtAmount &&
      updatedInvoice.whtAmount > 0
    ) {
      try {
        // CRITICAL: Fetch entity (Company or Business) based on accountType parameter
        let entity: any = null;
        let entityAccountType: AccountType;
        
        // Use accountType parameter if available, otherwise determine from entity lookup
        if (accountType) {
          entityAccountType = accountType;
          if (accountType === AccountType.Business) {
            entity = await Business.findById(updatedInvoice.companyId).lean();
            if (!entity) {
              throw new Error(`Business not found for WHT record creation. ID: ${updatedInvoice.companyId.toString()}`);
            }
          } else {
            entity = await Company.findById(updatedInvoice.companyId).lean();
            if (!entity) {
              throw new Error(`Company not found for WHT record creation. ID: ${updatedInvoice.companyId.toString()}`);
            }
          }
        } else {
          // Fallback: Try Company first, then Business (backward compatibility)
          entity = await Company.findById(updatedInvoice.companyId).lean();
          if (entity) {
            entityAccountType = AccountType.Company;
          } else {
            entity = await Business.findById(updatedInvoice.companyId).lean();
            if (!entity) {
              throw new Error(`Entity (Company or Business) not found for WHT record creation. ID: ${updatedInvoice.companyId.toString()}`);
            }
            entityAccountType = AccountType.Business;
          }
        }

        // CRITICAL: For invoices, the customer pays YOU (your company/business)
        // The customer deducts WHT from YOU (your company/business)
        // Therefore, YOUR COMPANY/BUSINESS is the payee (receives WHT credit), NOT the customer
        // Company/Business TIN is required for WHT credit tracking (NRS compliance)
        if (!entity.tin || !entity.tin.trim()) {
          throw new Error(`TIN is required for WHT record creation (NRS compliance). Entity ID: ${updatedInvoice.companyId.toString()}`);
        }
        const payeeName = entity.name;
        const payeeTIN = entity.tin;
        const companyAccountId = generateCompanyAccountId(payeeTIN);

        // Validate issue date
        const issueDate = updatedInvoice.issueDate instanceof Date 
          ? updatedInvoice.issueDate 
          : new Date(updatedInvoice.issueDate);
        if (isNaN(issueDate.getTime())) {
          throw new Error(`Invalid issue date for invoice ${updatedInvoice.invoiceNumber}. Cannot create WHT record.`);
        }

        await whtService.createWHTRecord({
          companyId: updatedInvoice.companyId,
          accountId: companyAccountId,
          accountType: entityAccountType,
          transactionType: TransactionType.Invoice,
          transactionId: invoiceId,
          payeeName,
          payeeTIN,
          paymentAmount: updatedInvoice.total, // Total before WHT
          whtType: whtTypeValue as WHTType,
          paymentDate: issueDate,
          description: `WHT deducted from invoice ${updatedInvoice.invoiceNumber} by customer`,
          notes: `Invoice ${updatedInvoice.invoiceNumber} - Customer will deduct WHT when invoice is paid`,
          // CRITICAL: Pass pre-calculated WHT amounts (calculated without exemptions - user's explicit choice)
          whtAmount: updatedInvoice.whtAmount,
          whtRate: updatedInvoice.whtRate,
          netAmount: updatedInvoice.netAmountAfterWHT,
        });

        logger.info("WHT record created for paid invoice", {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          whtAmount: updatedInvoice.whtAmount,
          whtType: whtTypeValue,
          accountType: entityAccountType,
        });
      } catch (error: any) {
        // Log error but don't fail the status update
        // WHT record creation failure shouldn't prevent invoice status update
        logger.error("Error creating WHT record for paid invoice", error, {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
        });
      }
    }

    return updatedInvoice;
  }

  async updateInvoice(
    invoiceId: Types.ObjectId,
    updateData: Partial<ICreateInvoice>,
    accountType?: AccountType
  ): Promise<IInvoice | null> {
    // Verify the invoice exists
    const existingInvoice = await Invoice.findById(invoiceId);
    if (!existingInvoice) {
      return null;
    }

    // All invoices can be edited (removed pending-only restriction)
    // Note: Editing paid/cancelled invoices is allowed for corrections and data updates

    // Calculate new totals if items are being updated
    // CRITICAL: Handle VAT exemption - if isVATExempted is true, VAT amount must be 0
    let isVATExempted = updateData.isVATExempted !== undefined 
      ? updateData.isVATExempted 
      : existingInvoice.isVATExempted || false;
    
    // CRITICAL: Verify VAT Eligibility if charging VAT (Turnover >= 25M OR has VAT Registration Number)
    if (!isVATExempted) {
      const company = await fetchEntity(existingInvoice.companyId, accountType);
      const vatRegistrationNumber = company.vatRegistrationNumber;
      
      // Calculate turnover to check eligibility if no VRN
      // Logic duplicated from WHT check effectively
      let isSmallCompany = false;
      let annualTurnover = 0;
      const taxYear = getTaxYear();
      
      // CRITICAL: Always calculate turnover dynamically to check for VAT eligibility.
      // Do NOT rely on stored company.taxClassification as it may be stale (e.g. user just crossed threshold).
      // We need strictly current turnover to determine if they are exempt from VAT registration.
      
      if (accountType === AccountType.Company) {
        try {
          const { companyService } = await import("../company/service");
          // Calculate annualized turnover based on actual paid invoices
          annualTurnover = await companyService.calculateAnnualTurnover(existingInvoice.companyId, taxYear);
          
          // Check if turnover is below the VAT/WHT exemption threshold (25M)
          isSmallCompany = annualTurnover <= NRS_WHT_EXEMPTION_THRESHOLD_2026;
          
          console.log("[INVOICE_UPDATE] VAT Eligibility Check (Company):", {
             companyId: existingInvoice.companyId,
             annualTurnover, 
             threshold: NRS_WHT_EXEMPTION_THRESHOLD_2026,
             isSmallCompany,
             isVatEligible: !isSmallCompany || (vatRegistrationNumber && vatRegistrationNumber.trim() !== "")
          });
        } catch (e) { 
           console.error("[INVOICE_UPDATE] Failed to calculate company turnover", e);
           // Fallback to strict check - if we can't verify turnover, assume not small if unsure, 
           // BUT for safety/compliance we might assume small to force compliance. 
           // Better to fail safe.
           isSmallCompany = false; 
        }
      } else if (accountType === AccountType.Business) {
         try {
          const startOfYear = new Date(taxYear, 0, 1);
          const endOfYear = new Date(taxYear, 11, 31, 23, 59, 59, 999);
          const result = await Invoice.aggregate([
            { $match: { companyId: new Types.ObjectId(existingInvoice.companyId), status: InvoiceStatus.Paid, issueDate: { $gte: startOfYear, $lte: endOfYear } } },
            { $group: { _id: null, totalTurnover: { $sum: "$subtotal" } } }
          ]);
          annualTurnover = result.length > 0 ? result[0].totalTurnover : 0;
          isSmallCompany = annualTurnover <= NRS_WHT_EXEMPTION_THRESHOLD_2026;
        } catch (e) { isSmallCompany = false; } // Fail safe
      }

      const isVatEligible = (vatRegistrationNumber && vatRegistrationNumber.trim() !== "") || !isSmallCompany;
      
      if (!isVatEligible) {
        // CRITICAL: Only block if the user is explicitly asserting VAT eligibility (by setting/keeping isVATExempted=false)
        // AND they are modifying financial data or explicitly toggling the checkbox.
        
        const isFinancialUpdate = updateData.items !== undefined || updateData.isVATExempted !== undefined;
        
        if (isFinancialUpdate) {
          throw new Error(`Compliance Notice: You cannot charge VAT yet. Your business earns less than ₦25 Million a year. Please check the 'VAT Exempt' box to continue. (Current Turnover: ₦${annualTurnover.toLocaleString()})`);
        } else {
          // Warning only - allow update but log the compliance issue
          logger.warn("Allowing update of non-eligible VAT invoice (Legacy/Compliance mismatch)", {
             invoiceId: existingInvoice._id.toString(),
             reason: "Non-financial update",
             annualTurnover
          });
        }
      }
    }

    // CRITICAL: Fetch entity (Company or Business) based on account type
    // Note: Entity fetching is done when needed for WHT/VAT checks
    
    let totals = {
      subtotal: existingInvoice.subtotal,
      vatAmount: existingInvoice.vatAmount,
      total: existingInvoice.total,
    };

    if (updateData.items && updateData.items.length > 0) {
      const itemsWithAmounts: IInvoiceItem[] = updateData.items.map(item => ({
        ...item,
        amount: item.quantity * item.unitPrice,
      }));

      const calculatedTotals = this.calculateInvoiceTotals(
        itemsWithAmounts,
        NRS_VAT_RATE,
        undefined // No category needed - VAT exemption is controlled by checkbox only
      );
      
      // CRITICAL: Backend contract - enforce VAT exemption rules
      // If exempted: VAT MUST be 0 (no VAT payload)
      // If not exempted: VAT MUST be calculated and present (fail loudly if invalid)
      let finalVATAmount = 0;
      if (!isVATExempted) {
        // CRITICAL: Validate calculated VAT - fail loudly if invalid
        if (calculatedTotals.vatAmount === undefined || calculatedTotals.vatAmount === null || isNaN(calculatedTotals.vatAmount)) {
          throw new Error(
            `VAT calculation failed during invoice update. ` +
            `Subtotal: ${calculatedTotals.subtotal}, VAT Rate: ${NRS_VAT_RATE}. ` +
            `This is a critical calculation error.`
          );
        }
        if (calculatedTotals.vatAmount < 0) {
          throw new Error(
            `Invalid VAT amount calculated: ${calculatedTotals.vatAmount}. VAT amount cannot be negative. ` +
            `This is a critical calculation error.`
          );
        }
        finalVATAmount = calculatedTotals.vatAmount;
      }
      
      totals = {
        subtotal: calculatedTotals.subtotal,
        vatAmount: finalVATAmount,
        total: calculatedTotals.subtotal + finalVATAmount,
      };
    } else if (isVATExempted !== (existingInvoice.isVATExempted || false)) {
      // VAT exemption status changed but items didn't - recalculate VAT
      const subtotal = existingInvoice.subtotal;
      const taxYear = getTaxYear();
      
      // CRITICAL: Backend contract - enforce VAT exemption rules when exemption status changes
      // If exemption was removed (was exempted, now not exempted): Recalculate VAT properly
      // If exemption was added (was not exempted, now exempted): Set VAT to 0
      let recalculatedVATAmount = 0;
      if (!isVATExempted) {
        // Exemption removed - calculate VAT based on subtotal (no category needed)
        // CRITICAL: Fail loudly if calculation fails
        const calculatedVAT = calculateVAT(subtotal, NRS_VAT_RATE, undefined, taxYear);
        if (calculatedVAT === undefined || calculatedVAT === null || isNaN(calculatedVAT)) {
          throw new Error(
            `VAT calculation failed when removing exemption. ` +
            `Subtotal: ${subtotal}, VAT Rate: ${NRS_VAT_RATE}. ` +
            `This is a critical calculation error.`
          );
        }
        if (calculatedVAT < 0) {
          throw new Error(
            `Invalid VAT amount calculated when removing exemption: ${calculatedVAT}. VAT amount cannot be negative. ` +
            `This is a critical calculation error.`
          );
        }
        recalculatedVATAmount = calculatedVAT;
      }
      // else: VAT remains 0 (exemption was added)
      
      totals = {
        subtotal,
        vatAmount: recalculatedVATAmount,
        total: subtotal + recalculatedVATAmount,
      };
    }

    // CRITICAL WHT COMPLIANCE: Recalculate WHT if invoice total or WHT type changes
    // WHT must be recalculated when invoice is edited to ensure WHT amount matches current total
    let whtType = updateData.whtType !== undefined ? updateData.whtType : existingInvoice.whtType;
    let whtAmount = existingInvoice.whtAmount ?? 0;
    let whtRate = existingInvoice.whtRate ?? 0;
    let netAmountAfterWHT = totals.total;

    // Check if total or WHT type changed (must be declared before logger)
    const totalChanged = totals.total !== existingInvoice.total;
    const whtTypeChanged = updateData.whtType !== undefined && updateData.whtType !== existingInvoice.whtType;

    // DEBUG: Log WHT calculation state
    logger.info("WHT calculation state before recalculation", {
      invoiceId: invoiceId.toString(),
      invoiceNumber: existingInvoice.invoiceNumber,
      whtType: whtType || "none",
      existingWhtAmount: existingInvoice.whtAmount ?? 0,
      existingWhtRate: existingInvoice.whtRate ?? 0,
      totalChanged,
      whtTypeChanged,
      willRecalculate: whtType && (totalChanged || whtTypeChanged),
    });
    
    if (whtType && (totalChanged || whtTypeChanged)) {
      // CRITICAL: Fetch entity (Company or Business) based on account type
      const company = await fetchEntity(existingInvoice.companyId, accountType);
      
      const taxYear = getTaxYear();

      // CRITICAL: Check if company is small for WHT exemption (turnover <= 25M)
      // Annual turnover is now computed from invoices
      let isSmallCompany = false;
      if (company.taxClassification === TaxClassification.SmallCompany) {
        isSmallCompany = true;
      } else if (accountType === AccountType.Company) {
        // Calculate turnover from invoices for Company accounts
        try {
          const { companyService } = await import("../company/service");
          const annualTurnover = await companyService.calculateAnnualTurnover(existingInvoice.companyId, taxYear);
          
          // CRITICAL: CIT Small Company Definition is <= 50M (Act 2025)
          // We keep this for classification purposes if needed
          // isSmallCompany = annualTurnover <= 50_000_000;
          
          // CRITICAL: WHT Exemption Threshold is strictly <= 25M (WHT Regs 2024)
          // We MUST use the 25M threshold for the WHT calculation flag
          isSmallCompany = annualTurnover <= NRS_WHT_EXEMPTION_THRESHOLD_2026;
        } catch (error) {
          // If calculation fails, assume not small company (safer assumption)
          logger.warn("Failed to calculate annual turnover for WHT exemption check (invoice update)", {
            companyId: existingInvoice.companyId.toString(),
            error: error instanceof Error ? error.message : String(error),
          });
          isSmallCompany = false;
        }
      } else if (accountType === AccountType.Business) {
        // Calculate turnover for Business accounts
        try {
          const startOfYear = new Date(taxYear, 0, 1);
          const endOfYear = new Date(taxYear, 11, 31, 23, 59, 59, 999);
          
          const result = await Invoice.aggregate([
            { 
              $match: { 
                companyId: new Types.ObjectId(existingInvoice.companyId),
                status: InvoiceStatus.Paid,
                issueDate: { $gte: startOfYear, $lte: endOfYear }
              } 
            },
            {
              $group: {
                _id: null,
                totalTurnover: { $sum: "$subtotal" } // Turnover is Net of VAT
              }
            }
          ]);
          
          const annualTurnover = result.length > 0 ? result[0].totalTurnover : 0;
          
          // CRITICAL: Unincorporated Entities (Sole Props) WHT Exemption Threshold is ₦25M
          isSmallCompany = annualTurnover <= NRS_WHT_EXEMPTION_THRESHOLD_2026;
          
          logger.info("Computed annual turnover for Business WHT check (Update)", {
            businessId: existingInvoice.companyId.toString(),
            annualTurnover,
            isSmallBusiness: isSmallCompany,
            threshold: NRS_WHT_EXEMPTION_THRESHOLD_2026
          });
        } catch (error) {
          logger.warn("Failed to calculate annual turnover for Business WHT check (Update)", {
            businessId: existingInvoice.companyId.toString(),
            error: error instanceof Error ? error.message : String(error),
          });
          isSmallCompany = false;
        }
      }
      // For Business accounts, small company check is based on taxClassification only

      const isServicePayment = [
        WHTType.ProfessionalServices,
        WHTType.TechnicalServices,
        WHTType.ManagementServices,
        WHTType.OtherServices,
        WHTType.Commission,
      ].includes(whtType as WHTType);


      
      // CRITICAL: When user explicitly selects a WHT type (whtTypeChanged), 
      // respect their choice and calculate WHT WITHOUT exemptions.
      // Exemptions only apply during auto-calculation, not when user makes an explicit choice.
      // If user selects a WHT type, they want WHT applied regardless of company size/exemptions.
      const shouldApplyExemptions = !whtTypeChanged; // Only apply exemptions if user didn't explicitly change WHT type
      const effectiveIsSmallCompany = shouldApplyExemptions ? isSmallCompany : false;
      const effectiveIsServicePayment = shouldApplyExemptions ? isServicePayment : false;
      
      // DEBUG: Log WHT calculation inputs before calculation
      logger.info("🔍 [DEBUG] WHT Calculation - Starting", {
        invoiceId: invoiceId.toString(),
        invoiceNumber: existingInvoice.invoiceNumber,
        whtType,
        total: totals.total,
        whtTypeChanged,
        totalChanged,
        isSmallCompany,
        isServicePayment,
        taxYear,
        shouldApplyExemptions,
        effectiveIsSmallCompany,
        effectiveIsServicePayment,
        companyTaxClassification: company.taxClassification,
        companyAnnualTurnover: "computed from invoices", // Annual turnover is now computed, not stored
      });
      
      whtAmount = calculateWHT(
        totals.subtotal, // CRITICAL: WHT is calculated on Subtotal (Net of VAT)
        whtType as WHTType,
        taxYear,
        effectiveIsSmallCompany,
        effectiveIsServicePayment
      );

      // CRITICAL FIX: If WHT amount is 0 (e.g. due to Small Company Exemption), 
      // we MUST clear the whtType.
      // The validation logic strictly requires (whtType present => whtAmount > 0).
      // So if exemption results in 0 amount, we clear the type to satisfy validation 
      // and correctly reflect "no WHT applied".
      if (whtAmount <= 0) {
        logger.info("ℹ️ [DEBUG] WHT amount is 0 (exemption applied) - Clearing WHT type to prevent validation error", {
          originalWhtType: whtType,
          isSmallCompany: effectiveIsSmallCompany,
          invoiceId: invoiceId.toString()
        });
        whtType = "" as any; 
        whtRate = 0;
        whtAmount = 0;
        netAmountAfterWHT = totals.total; // No WHT means net equals total
      } else {
        whtRate = getWHTRate(whtType as WHTType);
        // CRITICAL: Net Amount = Total (Inc VAT) - WHT
        netAmountAfterWHT = totals.total - whtAmount;
      }

      // DEBUG: Log WHT calculation results
      logger.info("✅ [DEBUG] WHT Calculation - Results", {
        invoiceId: invoiceId.toString(),
        invoiceNumber: existingInvoice.invoiceNumber,
        whtType,
        whtAmount,
        whtRate,
        total: totals.total,
        netAmountAfterWHT,
        reason: totalChanged ? "total changed" : "whtType changed",
        userExplicitlySelected: whtTypeChanged,
      });
    } else if (whtType && !totalChanged && !whtTypeChanged) {
      // If WHT type exists but total didn't change, keep existing WHT values
      // But recalculate netAmountAfterWHT based on current total (defensive)
      netAmountAfterWHT = totals.total - (existingInvoice.whtAmount ?? 0);
    } else if (!whtType) {
      // If WHT type is removed, clear WHT fields
      whtAmount = 0;
      whtRate = 0;
      netAmountAfterWHT = totals.total;
    }

    // Prepare update object
    const updateFields: any = {
      ...updateData,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total, // Total before WHT
      vatRate: isVATExempted ? 0 : NRS_VAT_RATE, // Set VAT rate to 0 if exempted
      isVATExempted: isVATExempted,
      whtType: whtType ?? "",
      whtRate: whtRate,
      whtAmount: Math.round(whtAmount * 100) / 100,
      netAmountAfterWHT: Math.round(netAmountAfterWHT * 100) / 100,
    };

    // If items are updated, include them with calculated amounts
    if (updateData.items) {
      updateFields.items = updateData.items.map(item => ({
        ...item,
        amount: item.quantity * item.unitPrice,
      }));
    }

    // DEBUG: Log invoice update request
    logger.info("Invoice update requested", {
      invoiceId: invoiceId.toString(),
      statusInUpdate: updateData.status || "not changed",
      whtTypeInUpdate: updateData.whtType ?? "not changed",
      hasStatusChange: updateData.status !== undefined,
    });

    // Update the invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedInvoice) {
      logger.warn("Invoice update failed - invoice not found", {
        invoiceId: invoiceId.toString(),
      });
      return null;
    }

    // DEBUG: Log invoice after update
    logger.info("Invoice updated - checking status and WHT", {
      invoiceId: invoiceId.toString(),
      invoiceNumber: updatedInvoice.invoiceNumber,
      oldStatus: existingInvoice.status,
      newStatus: updatedInvoice.status,
      statusChanged: updateData.status !== undefined && updateData.status !== existingInvoice.status,
      oldWhtType: existingInvoice.whtType ?? "none",
      newWhtType: updatedInvoice.whtType ?? "none",
      oldWhtAmount: existingInvoice.whtAmount ?? 0,
      newWhtAmount: updatedInvoice.whtAmount ?? 0,
    });

    // Update VAT record if amounts changed
    const issueDate = updateData.issueDate instanceof Date 
      ? updateData.issueDate 
      : (updateData.issueDate ? new Date(updateData.issueDate) : existingInvoice.issueDate);
    
    if (isNaN(issueDate.getTime())) {
      throw new Error("Invalid issue date");
    }

    // ============================================
    // VAT HANDLING (Payment-Based - Business Requirement)
    // ============================================
    // CRITICAL: VAT records are ONLY created when invoice status is "Paid"
    // VAT record is deleted when status changes to anything other than "Paid"
    // This is a business requirement - note that this differs from standard tax compliance
    // (Standard compliance: VAT is due on supply/invoice issued, not on payment)
    
    const newStatus = updateData.status !== undefined ? updateData.status : existingInvoice.status;
    const statusChanged = newStatus !== existingInvoice.status;
    const wasPaid = existingInvoice.status === InvoiceStatus.Paid;
    const isNowPaid = newStatus === InvoiceStatus.Paid;
    const isNowCancelled = newStatus === InvoiceStatus.Cancelled;
    
    // CRITICAL: Validate status is a valid enum value
    if (!Object.values(InvoiceStatus).includes(newStatus)) {
      throw new Error(`Invalid invoice status: ${newStatus}. Must be one of: ${Object.values(InvoiceStatus).join(", ")}`);
    }
    if (!Object.values(InvoiceStatus).includes(existingInvoice.status)) {
      throw new Error(`Invalid previous invoice status: ${existingInvoice.status}. Must be one of: ${Object.values(InvoiceStatus).join(", ")}`);
    }
    
    // Case 1: Status changed TO "Paid" - Create VAT record (payment received) ONLY if VAT is not exempted
    if (statusChanged && !wasPaid && isNowPaid && !isVATExempted) {
      // CRITICAL: Validate VAT amount exists and is valid
      if (totals.vatAmount === undefined || totals.vatAmount === null || isNaN(totals.vatAmount)) {
        throw new Error(`Invalid VAT amount for invoice ${updatedInvoice.invoiceNumber}. VAT amount is required when status is Paid and VAT is not exempted.`);
      }
      if (totals.vatAmount < 0) {
        throw new Error(`Invalid VAT amount for invoice ${updatedInvoice.invoiceNumber}. VAT amount cannot be negative.`);
      }

      // Update VAT summary (calculates on-the-fly from invoices/expenses)
      const newMonth = issueDate.getMonth() + 1;
      const newYear = issueDate.getFullYear();
      
      // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (newYear < 2026 || newYear > 2100) {
        throw new Error(`Invalid tax year: ${newYear}. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
      }

      // CRITICAL: Validate month is valid (1-12)
      if (newMonth < 1 || newMonth > 12) {
        throw new Error(`Invalid month: ${newMonth}. Month must be between 1 and 12.`);
      }

      // CRITICAL: Validate companyId exists
      if (!existingInvoice.companyId || !Types.ObjectId.isValid(existingInvoice.companyId)) {
        throw new Error(`Invalid company ID for invoice ${updatedInvoice.invoiceNumber}. Company ID is required.`);
      }
      
      try {
        await vatService.updateVATSummary(existingInvoice.companyId, newMonth, newYear, accountType);
        
        logger.info("VAT summary updated - invoice status changed to Paid via updateInvoice (on-the-fly calculation)", {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          month: newMonth,
          year: newYear,
          vatAmount: totals.vatAmount,
          previousStatus: existingInvoice.status,
          newStatus,
          accountType: accountType || "not provided",
        });
      } catch (error: any) {
        // CRITICAL: Fail loudly - VAT summary update failure aborts update
        logger.error("CRITICAL: Failed to update VAT summary when invoice status changed to Paid", error, {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          vatAmount: totals.vatAmount,
          previousStatus: existingInvoice.status,
          newStatus,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        throw new Error(`Failed to update VAT summary for invoice ${updatedInvoice.invoiceNumber}. Update aborted. Error: ${error?.message || "Unknown error"}`);
      }
    }
    
    // Case 2: VAT exemption changed - Update VAT summary (calculates on-the-fly)
    const vatExemptionChanged = updateData.isVATExempted !== undefined && updateData.isVATExempted !== (existingInvoice.isVATExempted || false);
    if (vatExemptionChanged) {
      const existingMonth = existingInvoice.issueDate ? (new Date(existingInvoice.issueDate).getMonth() + 1) : null;
      const existingYear = existingInvoice.issueDate ? new Date(existingInvoice.issueDate).getFullYear() : null;
      
      if (existingMonth && existingYear && existingInvoice.companyId) {
        try {
          await vatService.updateVATSummary(existingInvoice.companyId, existingMonth, existingYear, accountType);
          
          logger.info("VAT summary updated - VAT exemption changed via updateInvoice (on-the-fly calculation)", {
            invoiceId: invoiceId.toString(),
            invoiceNumber: updatedInvoice.invoiceNumber,
            month: existingMonth,
            year: existingYear,
            wasExempted: existingInvoice.isVATExempted || false,
            isNowExempted: isVATExempted,
            accountType: accountType || "not provided",
          });
        } catch (error: any) {
          logger.error("Error updating VAT summary when VAT exemption changed", error, {
            invoiceId: invoiceId.toString(),
            invoiceNumber: updatedInvoice.invoiceNumber,
            month: existingMonth,
            year: existingYear,
            errorMessage: error?.message,
            errorStack: error?.stack,
          });
          // Don't abort update for VAT summary errors - log and continue
        }
      }
    }
    
    // Case 2c: Status changed FROM "Paid" to anything else - Update VAT summary (calculates on-the-fly)
    // CRITICAL: Only update if VAT was not exempted when it was Paid
    const wasVATExempted = existingInvoice.isVATExempted || false;
    if (statusChanged && wasPaid && !isNowPaid && !wasVATExempted) {
      const existingMonth = existingInvoice.issueDate ? (new Date(existingInvoice.issueDate).getMonth() + 1) : null;
      const existingYear = existingInvoice.issueDate ? new Date(existingInvoice.issueDate).getFullYear() : null;
      
      if (existingMonth && existingYear && existingInvoice.companyId) {
        try {
          await vatService.updateVATSummary(existingInvoice.companyId, existingMonth, existingYear, accountType);
          
          logger.info("VAT summary updated - invoice status changed from Paid via updateInvoice (on-the-fly calculation)", {
            invoiceId: invoiceId.toString(),
            invoiceNumber: updatedInvoice.invoiceNumber,
            month: existingMonth,
            year: existingYear,
            previousStatus: existingInvoice.status,
            newStatus,
            wasVATExempted: false,
            accountType: accountType || "not provided",
          });
        } catch (error: any) {
          logger.error("Error updating VAT summary when invoice status changed from Paid", error, {
            invoiceId: invoiceId.toString(),
            invoiceNumber: updatedInvoice.invoiceNumber,
            month: existingMonth,
            year: existingYear,
            previousStatus: existingInvoice.status,
            newStatus,
            errorMessage: error?.message,
            errorStack: error?.stack,
          });
          // Don't abort update for VAT summary errors - log and continue
        }
      }
    }
    
    // Case 3: Update VAT record if amounts/date changed (only if invoice status is "Paid" AND VAT is not exempted)
    // If invoice is not Paid OR VAT is exempted, VAT record should not exist
    if (isNowPaid && !isVATExempted) {
      // Update VAT summary (calculates on-the-fly) - no need to check for existing records
      const newMonth = issueDate.getMonth() + 1;
      const newYear = issueDate.getFullYear();
      const oldMonth = existingInvoice.issueDate ? (new Date(existingInvoice.issueDate).getMonth() + 1) : null;
      const oldYear = existingInvoice.issueDate ? new Date(existingInvoice.issueDate).getFullYear() : null;
      const monthChanged = oldMonth && oldYear && (oldMonth !== newMonth || oldYear !== newYear);
      
      try {
        // If month/year changed, update summaries for both old and new periods
        if (monthChanged && oldMonth && oldYear && existingInvoice.companyId) {
          await vatService.updateVATSummary(existingInvoice.companyId, oldMonth, oldYear, accountType);
        }
        if (existingInvoice.companyId) {
          await vatService.updateVATSummary(existingInvoice.companyId, newMonth, newYear, accountType);
        }
        
        logger.info("VAT summary updated - invoice amounts or date changed (on-the-fly calculation)", {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          oldMonth,
          oldYear,
          newMonth,
          newYear,
          vatAmount: totals.vatAmount,
          accountType: accountType || "not provided",
        });
      } catch (error: any) {
        logger.error("Error updating VAT summary when invoice amounts/date changed", error, {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          oldMonth,
          oldYear,
          newMonth,
          newYear,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        // Don't abort update for VAT summary errors - log and continue
      }
    }

    // ============================================
    // WHT HANDLING (Payment-Based)
    // ============================================
    // CRITICAL: WHT records are ONLY created when invoice status is "Paid" AND WHT type is not empty
    // - If whtType is empty string "" → Delete WHT record if it exists
    // - If whtType has a value AND status is "Paid" → Create/update WHT record
    // - If status is NOT "Paid" → Delete WHT record (handled earlier when status changes from Paid)
    
    // Get whtType from updated invoice (from updateData or existingInvoice)
    const whtTypeValue = updatedInvoice.whtType;
    const hasWHTType = whtTypeValue && whtTypeValue.trim() !== "";
    const oldWhtType = existingInvoice.whtType;
    // Note: whtTypeChanged is already declared above (line 1191) for WHT recalculation logic
    // It checks: updateData.whtType !== undefined && updateData.whtType !== existingInvoice.whtType
    // This is sufficient for WHT record handling as well
    
    // Find existing WHT record (if any)
    const existingWHTRecord = await whtService.findWHTRecordByTransaction(
      invoiceId,
      TransactionType.Invoice,
      existingInvoice.companyId
    );
    
    logger.info("Invoice update - checking WHT record creation/deletion", {
      invoiceId: invoiceId.toString(),
      invoiceNumber: updatedInvoice.invoiceNumber,
      oldWhtType: oldWhtType || "none",
      newWhtType: whtTypeValue || "none",
      whtTypeChanged,
      hasWHTType,
      existingWHTRecord: !!existingWHTRecord,
      whtAmount: updatedInvoice.whtAmount ?? 0,
      whtRate: updatedInvoice.whtRate ?? 0,
    });

    // Case 1: WHT type is empty string "" → Delete WHT record if it exists
    if (!hasWHTType) {
      if (existingWHTRecord) {
        try {
          await whtService.deleteWHTRecordByTransaction(
            invoiceId,
            TransactionType.Invoice,
            existingInvoice.companyId
          );
          
          logger.info("✅ WHT record deleted - WHT type removed (empty string)", {
            invoiceId: invoiceId.toString(),
            invoiceNumber: updatedInvoice.invoiceNumber,
            oldWhtType: oldWhtType || "none",
            whtAmount: existingWHTRecord.whtAmount,
            whtType: existingWHTRecord.whtType,
          });
        } catch (error: any) {
          // CRITICAL: Fail loudly - WHT deletion failure aborts update
          logger.error("CRITICAL: Failed to delete WHT record when WHT type removed", error, {
            invoiceId: invoiceId.toString(),
            invoiceNumber: updatedInvoice.invoiceNumber,
            oldWhtType: oldWhtType || "none",
            whtAmount: existingWHTRecord.whtAmount,
            errorMessage: error?.message,
            errorStack: error?.stack,
          });
          throw new Error(`Failed to delete WHT record for invoice ${updatedInvoice.invoiceNumber}. Update aborted. Error: ${error?.message || "Unknown error"}`);
        }
      } else {
        logger.info("No WHT record to delete - WHT type is empty and no existing record", {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          oldWhtType: oldWhtType || "none",
        });
      }
    } else {
      // Case 2: WHT type has a value → Validate and create/update WHT record ONLY if status is "Paid"
      
      // CRITICAL: Validate whtType is a valid WHTType enum value
      if (!Object.values(WHTType).includes(whtTypeValue as WHTType)) {
        throw new Error(`Invalid WHT type: ${whtTypeValue}. Must be one of: ${Object.values(WHTType).join(", ")}`);
      }

      // CRITICAL: WHT records are ONLY created when status is "Paid"
      if (!isNowPaid) {
        // WHT type is set but invoice status is not Paid - delete WHT record if it exists
        if (existingWHTRecord) {
          try {
            await whtService.deleteWHTRecordByTransaction(
              invoiceId,
              TransactionType.Invoice,
              existingInvoice.companyId
            );
            logger.info("✅ WHT record deleted - invoice status is not Paid (WHT type exists but status changed to non-Paid)", {
              invoiceId: invoiceId.toString(),
              invoiceNumber: updatedInvoice.invoiceNumber,
              whtType: whtTypeValue,
              status: newStatus,
              whtAmount: existingWHTRecord.whtAmount,
            });
          } catch (error: any) {
            logger.error("CRITICAL: Failed to delete WHT record when status is not Paid", error, {
              invoiceId: invoiceId.toString(),
              invoiceNumber: updatedInvoice.invoiceNumber,
              errorMessage: error?.message,
              errorStack: error?.stack,
            });
            throw new Error(`Failed to delete WHT record for invoice ${updatedInvoice.invoiceNumber}. Update aborted. Error: ${error?.message || "Unknown error"}`);
          }
        } else {
          logger.info("No WHT record to delete - invoice status is not Paid (WHT type exists but status is not Paid)", {
            invoiceId: invoiceId.toString(),
            invoiceNumber: updatedInvoice.invoiceNumber,
            whtType: whtTypeValue,
            status: newStatus,
          });
        }
        // Exit early - don't create WHT record when status is not Paid
        // Note: Don't throw error here, just skip WHT creation
      } else {
        // Status is "Paid" - proceed with WHT record creation/update
        
        // CRITICAL: Validate whtAmount exists and is valid
        if (updatedInvoice.whtAmount === undefined || updatedInvoice.whtAmount === null || isNaN(updatedInvoice.whtAmount)) {
          throw new Error(`Invalid WHT amount for invoice ${updatedInvoice.invoiceNumber}. WHT amount is required when WHT type is selected and status is Paid.`);
        }

        // CRITICAL: User explicitly selected a WHT type - WHT must be calculated and applied
        // Do NOT apply exemptions when user makes an explicit choice
        // If user selected a WHT type, they want WHT applied regardless of company size/exemptions
        
        // DEBUG: Log validation inputs
        logger.info("🔍 [DEBUG] WHT Validation (Update Invoice) - Starting", {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          whtType: whtTypeValue,
          whtAmount: updatedInvoice.whtAmount,
          whtRate: updatedInvoice.whtRate,
          status: newStatus,
          whtTypeChanged,
          userExplicitlySelected: "YES - exemptions should NOT apply",
        });
        
        // Validate WHT amount is > 0 when user explicitly selects a WHT type
        if (updatedInvoice.whtAmount <= 0) {
          logger.warn("❌ [DEBUG] WHT Validation Failed", {
            invoiceId: invoiceId.toString(),
            invoiceNumber: updatedInvoice.invoiceNumber,
            whtType: whtTypeValue,
            whtAmount: updatedInvoice.whtAmount,
            error: "WHT amount is 0 or negative but WHT type is selected",
            expected: "WHT amount must be > 0 when user explicitly selects a WHT type",
          });
          throw new Error(`Invalid WHT amount for invoice ${updatedInvoice.invoiceNumber}. WHT amount must be greater than 0 when WHT type is selected and status is Paid. User explicitly selected "${whtTypeValue}" - WHT must be applied regardless of exemptions.`);
        }
        
        logger.info("✅ [DEBUG] WHT Validation (Update Invoice) - Passed", {
          invoiceId: invoiceId.toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          whtType: whtTypeValue,
          whtAmount: updatedInvoice.whtAmount,
          whtRate: updatedInvoice.whtRate,
        });

        // CRITICAL: Validate whtRate exists and is valid
        if (updatedInvoice.whtRate === undefined || updatedInvoice.whtRate === null || isNaN(updatedInvoice.whtRate)) {
          throw new Error(`Invalid WHT rate for invoice ${updatedInvoice.invoiceNumber}. WHT rate is required when WHT type is selected and status is Paid.`);
        }
        if (updatedInvoice.whtRate < 0 || updatedInvoice.whtRate > 100) {
          throw new Error(`Invalid WHT rate for invoice ${updatedInvoice.invoiceNumber}. WHT rate must be between 0 and 100.`);
        }

        // If WHT record exists and amount/type changed, delete old and create new
        const needsUpdate = existingWHTRecord && (
          existingWHTRecord.whtAmount !== updatedInvoice.whtAmount ||
          existingWHTRecord.whtType !== whtTypeValue ||
          totalChanged ||
          whtTypeChanged
        );

        if (needsUpdate && existingWHTRecord) {
          // Delete old WHT record
          try {
            await whtService.deleteWHTRecordByTransaction(
              invoiceId,
              TransactionType.Invoice,
              existingInvoice.companyId
            );
            logger.info("Old WHT record deleted - will create new one with updated values", {
              invoiceId: invoiceId.toString(),
              invoiceNumber: updatedInvoice.invoiceNumber,
              oldWhtAmount: existingWHTRecord.whtAmount,
              newWhtAmount: updatedInvoice.whtAmount,
              oldWhtType: existingWHTRecord.whtType,
              newWhtType: whtTypeValue,
            });
          } catch (error: any) {
            logger.error("CRITICAL: Failed to delete old WHT record before update", error, {
              invoiceId: invoiceId.toString(),
              invoiceNumber: updatedInvoice.invoiceNumber,
              errorMessage: error?.message,
              errorStack: error?.stack,
            });
            throw new Error(`Failed to delete old WHT record for invoice ${updatedInvoice.invoiceNumber}. Update aborted. Error: ${error?.message || "Unknown error"}`);
          }
        }

        // Create or recreate WHT record (status is Paid)
        try {
            // CRITICAL: For invoices, the customer pays YOU (your company/business)
            // The customer deducts WHT from YOU (your company/business)
            // Therefore, YOUR COMPANY/BUSINESS is the payee (receives WHT credit), NOT the customer
            // CRITICAL: Fetch entity (Company or Business) based on accountType parameter
            let entity: any = null;
            let entityAccountType: AccountType;
            
            // Use accountType parameter if available, otherwise determine from entity lookup
            if (accountType) {
              entityAccountType = accountType;
              if (accountType === AccountType.Business) {
                entity = await Business.findById(updatedInvoice.companyId).lean();
                if (!entity) {
                  throw new Error(`Business not found for WHT record creation. ID: ${updatedInvoice.companyId.toString()}`);
                }
              } else {
                entity = await Company.findById(updatedInvoice.companyId).lean();
                if (!entity) {
                  throw new Error(`Company not found for WHT record creation. ID: ${updatedInvoice.companyId.toString()}`);
                }
              }
            } else {
              // Fallback: Try Company first, then Business (backward compatibility)
              entity = await Company.findById(updatedInvoice.companyId).lean();
              if (entity) {
                entityAccountType = AccountType.Company;
              } else {
                entity = await Business.findById(updatedInvoice.companyId).lean();
                if (!entity) {
                  throw new Error(`Entity (Company or Business) not found for WHT record creation. ID: ${updatedInvoice.companyId.toString()}`);
                }
                entityAccountType = AccountType.Business;
              }
            }

            // Company/Business TIN is required for WHT credit tracking (NRS compliance)
            if (!entity.tin || !entity.tin.trim()) {
              throw new Error(`TIN is required for WHT record creation (NRS compliance). Entity ID: ${updatedInvoice.companyId.toString()}`);
            }

            const payeeName = entity.name;
            const payeeTIN = entity.tin;
            const companyAccountId = generateCompanyAccountId(payeeTIN);

            // Validate issue date
            if (isNaN(issueDate.getTime())) {
              throw new Error(`Invalid issue date for invoice ${updatedInvoice.invoiceNumber}. Cannot create WHT record.`);
            }

            await whtService.createWHTRecord({
              companyId: updatedInvoice.companyId,
              accountId: companyAccountId,
              accountType: entityAccountType,
              transactionType: TransactionType.Invoice,
              transactionId: invoiceId,
              payeeName,
              payeeTIN,
              paymentAmount: updatedInvoice.total,
              whtType: whtTypeValue as WHTType,
              paymentDate: issueDate,
              description: `WHT deducted from invoice ${updatedInvoice.invoiceNumber} by customer`,
              notes: `Invoice ${updatedInvoice.invoiceNumber} - Customer will deduct WHT when invoice is paid`,
              // CRITICAL: Pass pre-calculated WHT amounts (calculated without exemptions - user's explicit choice)
              whtAmount: updatedInvoice.whtAmount,
              whtRate: updatedInvoice.whtRate,
              netAmount: updatedInvoice.netAmountAfterWHT,
            });

            logger.info("✅ WHT record created/updated for invoice", {
              invoiceId: invoiceId.toString(),
              invoiceNumber: updatedInvoice.invoiceNumber,
              whtAmount: updatedInvoice.whtAmount,
              whtType: whtTypeValue,
              whtRate: updatedInvoice.whtRate,
              paymentAmount: updatedInvoice.total,
              payeeName,
              payeeTIN,
              accountType: entityAccountType,
              wasUpdate: needsUpdate,
            });
          } catch (error: any) {
            // CRITICAL: Fail loudly - WHT record creation failure aborts update
            logger.error("CRITICAL: Failed to create/update WHT record for invoice", error, {
              invoiceId: invoiceId.toString(),
              invoiceNumber: updatedInvoice.invoiceNumber,
              whtAmount: updatedInvoice.whtAmount,
              whtType: whtTypeValue,
              whtRate: updatedInvoice.whtRate,
              errorMessage: error?.message,
              errorStack: error?.stack,
            });
            throw new Error(`Failed to create/update WHT record for invoice ${updatedInvoice.invoiceNumber}. Update aborted. Error: ${error?.message || "Unknown error"}`);
          }
      } // End of else block for isNowPaid
    } // End of else block for hasWHTType

    logger.info("Invoice updated", {
      invoiceId: invoiceId.toString(),
      invoiceNumber: updatedInvoice.invoiceNumber,
    });

    return updatedInvoice;
  }

  /**
   * Calculate total revenue (paid invoices) for a given account and tax year
   * Used for Business PIT calculation
   * 
   * @param companyId - Account ID (Business ID for Sole Props or Company ID)
   * @param taxYear - The tax year to calculate revenue for
   * @returns Total revenue (subtotal of paid invoices)
   */
  async calculateTotalRevenue(companyId: Types.ObjectId, taxYear: number): Promise<number> {
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (taxYear < 2026) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // Match conditions:
    // 1. Company ID (Business ID)
    // 2. Status is Paid
    // 3. Tax Year matches issueDate
    
    // We use aggregation for efficiency
    const result = await Invoice.aggregate([
      {
        $match: {
          companyId: companyId,
          status: InvoiceStatus.Paid,
          $expr: { $eq: [{ $year: "$issueDate" }, taxYear] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$subtotal" } // Revenue = Subtotal (excluding VAT)
        }
      }
    ]);

    return result.length > 0 ? result[0].totalRevenue : 0;
  }

  /**
   * Delete/Cancel invoice
   * CRITICAL: Removes associated VAT record to prevent orphaned data
   * This ensures VAT summary accuracy - cancelled invoices shouldn't contribute to VAT
   * 
   * NOTE: This method uses updateInvoiceStatus internally to ensure consistent VAT handling
   * This prevents code duplication and ensures all status change logic is centralized
   */
  async deleteInvoice(invoiceId: Types.ObjectId, accountType?: AccountType): Promise<boolean> {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return false;
    }

    // If already cancelled, nothing to do
    if (invoice.status === InvoiceStatus.Cancelled) {
      logger.info("Invoice already cancelled - no action needed", {
        invoiceId: invoiceId.toString(),
        invoiceNumber: invoice.invoiceNumber,
      });
      return true;
    }

    // Use updateInvoiceStatus to ensure consistent VAT/WHT handling
    // This centralizes all status change logic and prevents code duplication
    const result = await this.updateInvoiceStatus(invoiceId, InvoiceStatus.Cancelled, accountType);

    if (!result) {
      logger.error("Failed to cancel invoice via updateInvoiceStatus", undefined, {
        invoiceId: invoiceId.toString(),
        invoiceNumber: invoice.invoiceNumber,
      });
      return false;
    }

    logger.info("Invoice cancelled via deleteInvoice", {
      invoiceId: invoiceId.toString(),
      invoiceNumber: invoice.invoiceNumber,
      previousStatus: invoice.status,
      newStatus: InvoiceStatus.Cancelled,
    });

    return true;
  }
}

export const invoiceService = new InvoiceService();



