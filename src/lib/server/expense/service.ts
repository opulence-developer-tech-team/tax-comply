import { Types } from "mongoose";
import { createHash } from "crypto";
import Expense from "./entity";
import { IExpense, IExpenseCreate, IExpenseSummary } from "./interface";
import { calculateTaxSavings, calculatePAYE, getAnnualTaxExemption, calculateCorporateIncomeTax, calculateTaxAfterWHTCredit, calculateWHT, calculateNetAfterWHT, getWHTRate, WHTType, getTaxYear, calculateCRA, calculateTaxableIncome } from "../tax/calculator";
import { NRS_VAT_RATE } from "../../constants/nrs-constants";
import { incomeService } from "../income/service";
import { logger } from "../utils/logger";
import { whtService } from "../wht/service";
import { vatService } from "../vat/service";
// VATRecord import removed - VAT is now calculated on-the-fly from invoices/expenses
import Company from "../company/entity";
import { AccountType, TaxClassification, ExpenseCategory, TransactionType } from "../utils/enum";
import { NRS_VAT_TURNOVER_THRESHOLD_2026 } from "../../constants/nrs-constants";
import { VATType } from "../utils/vat-type";
import { ExpenseSortField } from "../utils/expense-sort-field";
import { SortOrder } from "../utils/sort-order";
import { pitService } from "../pit/service";

/**
 * Generate a deterministic ObjectId from supplier TIN
 * This ensures WHT credits are properly tracked per supplier
 * CRITICAL: This is required for NRS compliance - WHT credits must be associated with the correct supplier
 * 
 * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 * NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 */
function generateSupplierAccountId(supplierTIN: string): Types.ObjectId {
  // TIN is required for WHT record tracking (NRS compliance requirement)
  if (!supplierTIN || !supplierTIN.trim()) {
    throw new Error("Supplier TIN is required for WHT record tracking (NRS compliance)");
  }
  const identifier = supplierTIN.trim();
  
  // Create deterministic hash (SHA-256, take first 24 hex chars for ObjectId)
  const hash = createHash("sha256").update(identifier).digest("hex").substring(0, 24);
  
  // Validate hash is valid hex (should always be, but safety check)
  if (!/^[0-9a-f]{24}$/i.test(hash)) {
    throw new Error("Failed to generate valid supplier account ID");
  }
  
  return new Types.ObjectId(hash);
}

class ExpenseService {
  async createExpense(userId: Types.ObjectId, expenseData: IExpenseCreate): Promise<IExpense> {
    const date = new Date(expenseData.date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (year < 2026) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // Calculate VAT if applicable (per NRS standard rate for company/business expenses)
    // NRS Rule: Input VAT is claimable on company purchases/expenses ONLY if Registered
    
    // Determine VAT Registration Status NRST
    let vatAmount = 0;
    
    // Only verify registration if it's a deductible business expense
    if ((expenseData.accountType === AccountType.Company || expenseData.accountType === AccountType.Business) && expenseData.isTaxDeductible) {
        let isVatRegistered = false;
        
        // We need to check entity status
        // Note: We might re-fetch entity later for WHT, but VAT check is independent and critical for correctness
        let vatEntity: any = null;
        if (expenseData.accountType === AccountType.Company) {
             vatEntity = await Company.findById(expenseData.accountId).lean();
        } else {
             vatEntity = await import("../business/entity").then(m => m.default.findById(expenseData.accountId).lean());
        }

        if (vatEntity) {
             if (vatEntity.vatRegistrationNumber) {
                 isVatRegistered = true;
             } else {
                 // Check Turnover for mandatory registration
                 try {
                    const { companyService } = await import("../company/service");
                    // Re-use calculation service
                    const annualTurnover = await companyService.calculateAnnualTurnover(new Types.ObjectId(expenseData.accountId), year);
                    if (annualTurnover >= NRS_VAT_TURNOVER_THRESHOLD_2026) isVatRegistered = true;
                 } catch (e) { 
                     // Ignore calc error - assume not registered if fails
                 }
             }
        }
        
        // Only calculate VAT if registered
        if (isVatRegistered) {
           vatAmount = expenseData.amount * (NRS_VAT_RATE / 100);
        }
    }

    // Calculate WHT if applicable (for company/business expenses with WHT deducted)
    let whtAmount = 0;
    let whtRate = 0;
    if ((expenseData.accountType === AccountType.Company || expenseData.accountType === AccountType.Business) && expenseData.whtDeducted && expenseData.whtType) {
      // Fetch entity (Company or Business) to check classification
      let entity: any = null;
      if (expenseData.accountType === AccountType.Company) {
        entity = await Company.findById(expenseData.accountId).lean();
      } else {
        entity = await import("../business/entity").then(m => m.default.findById(expenseData.accountId).lean());
      }

      const taxYear = getTaxYear();
      
      // CRITICAL: WHT Exemption logic applies to the SUPPLIER (Payee), not the Payer.
      // Since we don't know the supplier's turnover/status from the Expense form,
      // we CANNOT assume they are exempt.
      // Default to "Not Exempt" (false) to ensure we deduct WHT unless the user manually opts out
      // (by setting whtDeducted: false in the UI).
      // Failing to deduct WHT from a liable supplier makes the Payer liable.
      const isSupplierSmallCompany = false;
      
      const isServicePayment = [
        WHTType.ProfessionalServices,
        WHTType.TechnicalServices,
        WHTType.ManagementServices,
        WHTType.OtherServices,
        WHTType.Commission,
      ].includes(expenseData.whtType);
      
      whtAmount = calculateWHT(
        expenseData.amount,
        expenseData.whtType,
        taxYear,
        isSupplierSmallCompany,
        isServicePayment,
        expenseData.isNonResident ?? false, // New Field: Non-Resident Status
        expenseData.supplierType // New Field: Supplier Type for correct rate selection
      );
      whtRate = getWHTRate(expenseData.whtType);
    }

    // NRS Compliance: Validate supplier information when WHT is deducted
    if ((expenseData.accountType === AccountType.Company || expenseData.accountType === AccountType.Business) && expenseData.whtDeducted && expenseData.whtType) {
      if (!expenseData.supplierName || expenseData.supplierName.trim() === "") {
        throw new Error("Supplier name is required when WHT is deducted (NRS compliance requirement)");
      }
      // Note: TIN is strongly recommended but not always available for small suppliers
      // We'll allow expenses without TIN but log a warning
      if (!expenseData.supplierTIN || expenseData.supplierTIN.trim() === "") {
        logger.warn("Expense with WHT deducted missing supplier TIN - NRS compliance risk", {
          expenseDescription: expenseData.description,
          supplierName: expenseData.supplierName,
        });
      }
      if (!expenseData.supplierType) {
        throw new Error("Supplier type (company/individual) is required when WHT is deducted");
      }
    }

    const expense = new Expense({
      userId,
      // CRITICAL: Populate companyId for Business accounts too (using accountId)
      // WHT Service expects companyId to be present for both Company and Business entities
      companyId: (expenseData.accountType === AccountType.Company || expenseData.accountType === AccountType.Business) 
        ? new Types.ObjectId(expenseData.accountId) 
        : undefined,
      accountId: new Types.ObjectId(expenseData.accountId),
      accountType: expenseData.accountType,
      description: expenseData.description,
      amount: expenseData.amount,
      category: expenseData.category,
      date,
      month,
      year,
      isTaxDeductible: expenseData.isTaxDeductible,
      vatAmount: Math.round(vatAmount * 100) / 100,
      whtType: expenseData.whtType,
      whtAmount: Math.round(whtAmount * 100) / 100,
      whtDeducted: expenseData.whtDeducted,
      // Supplier information (optional fields - only required when WHT is deducted, validated above)
      // Schema alignment: converting undefined to schema defaults ("" for strings, null for enums)
      supplierName: expenseData.supplierName ?? "",
      supplierTIN: expenseData.supplierTIN ?? "",
      supplierType: expenseData.supplierType ?? null,
      isNonResident: expenseData.isNonResident ?? false,
    });

    await expense.save();

    // ============================================
    // VAT HANDLING (Input VAT from Expenses)
    // ============================================
    // NRS Rule: Input VAT is claimable on company purchases/expenses
    // Create Input VAT record for company expenses with VAT
    
    // Debug logging to help diagnose issues
    logger.info("Expense VAT record creation check", {
      expenseId: expense._id?.toString(),
      accountType: expense.accountType,
      companyId: expense.companyId?.toString(),
      vatAmount: expense.vatAmount,
      isTaxDeductible: expense.isTaxDeductible,
      month,
      year,
      willCreateVAT: (expense.accountType === AccountType.Company || expense.accountType === AccountType.Business) && 
                     expense.companyId && 
                     expense.vatAmount && 
                     expense.vatAmount > 0 && 
                     expense.isTaxDeductible,
    });

    // NHS Compliance: Input VAT is ONLY claimable if the Business/Company is VAT Registered.
    // We already enforced this during `vatAmount` calculation above.
    // If `expense.vatAmount` > 0, it means they are eligible and it was calculated.
    if ((expense.accountType === AccountType.Company || expense.accountType === AccountType.Business) && expense.accountId && expense.vatAmount && expense.vatAmount > 0 && expense.isTaxDeductible) {
      try {
            // Update VAT summary (calculates on-the-fly from invoices/expenses)
            await vatService.updateVATSummary(
              expense.accountId, 
              month,
              year,
              expense.accountType
            );

            logger.info("VAT summary updated for expense", {
              expenseId: expense._id!.toString(),
              entityId: expense.accountId.toString(),
              vatAmount: expense.vatAmount,
            });
      } catch (error: any) {
        logger.error("Error updating VAT summary for expense", error, {
           expenseId: expense._id?.toString(),
           errorMessage: error?.message,
        });
      }
    } else {
        // Just log if it was expected but missing
       if (expense.isTaxDeductible && (expense.accountType === AccountType.Company || expense.accountType === AccountType.Business)) {
           // It's fine, just means not registered
       }
    }


    // ============================================
    // WHT HANDLING (Withholding Tax from Expenses)
    // ============================================
    // NRS Rule: WHT must be deducted and remitted when making payments to suppliers/contractors
    // Create WHT record for company/business expenses with WHT deducted
    if ((expense.accountType === AccountType.Company || expense.accountType === AccountType.Business) && expense.companyId && expense.whtDeducted && expense.whtType && expense.whtAmount && expense.whtAmount > 0) {
      try {
        // Check if WHT record already exists (prevent duplicates)
        const existingWHTRecord = await whtService.findWHTRecordByTransaction(
          expense._id!,
          TransactionType.Expense,
          expense.companyId
        );

        if (existingWHTRecord) {
          logger.warn("WHT record already exists for expense, skipping creation", {
            expenseId: expense._id!.toString(),
            companyId: expense.companyId.toString(),
            existingWHTRecordId: existingWHTRecord._id?.toString(),
          });
        } else {
          // NRS Compliance: Get supplier/vendor info from expense (REQUIRED for WHT records)
              if (!expense.supplierName || expense.supplierName.trim() === "") {
                throw new Error("Supplier name is required for WHT record (NRS compliance)");
              }
              const payeeName = expense.supplierName;
              if (!expense.supplierTIN || !expense.supplierTIN.trim()) {
                throw new Error("Supplier TIN is required for WHT record (NRS compliance)");
              }
              const payeeTIN = expense.supplierTIN;
              if (!expense.supplierType) {
                throw new Error("Supplier type is required for WHT record (NRS compliance)");
              }
              const supplierType: AccountType = expense.supplierType;

          // Validate supplier information (NRS requirement)
          if (!payeeName || payeeName.trim() === "") {
            logger.error("WHT record creation failed - missing supplier name", undefined, {
              expenseId: expense._id!.toString(),
              companyId: expense.companyId.toString(),
            });
            throw new Error("Supplier name is required for WHT record (NRS compliance)");
          }

          // Generate deterministic accountId from supplier TIN/name for WHT credit tracking
          // CRITICAL: This ensures WHT credits are properly associated with the correct supplier
          let supplierAccountId: Types.ObjectId;
          try {
            supplierAccountId = generateSupplierAccountId(payeeTIN);
          } catch (error: any) {
            logger.error("Failed to generate supplier account ID", error, {
              expenseId: expense._id!.toString(),
              supplierTIN: payeeTIN,
              supplierName: payeeName,
            });
            throw new Error(`Failed to generate supplier account ID: ${error.message}`);
          }

          // Create WHT record with proper supplier information
          await whtService.createWHTRecord({
            companyId: expense.companyId,
            accountId: supplierAccountId, // CRITICAL: Use supplier account ID, not expense ID
            accountType: supplierType, // Use normalized supplier type
            transactionType: TransactionType.Expense,
            transactionId: expense._id!,
            payeeName: payeeName.trim(),
            payeeTIN: payeeTIN.trim(),
            paymentAmount: expense.amount,
            whtType: expense.whtType,
            paymentDate: date,
            description: `WHT deducted from expense: ${expense.description}`,
            notes: `Expense payment - ${expense.category} | Supplier: ${payeeName}`,
          });

          logger.info("WHT record created successfully for expense", {
            expenseId: expense._id!.toString(),
            companyId: expense.companyId.toString(),
            whtAmount: expense.whtAmount,
            whtType: expense.whtType,
            month,
            year,
          });
        }
      } catch (error: any) {
        // Log error but don't fail expense creation
        // WHT record creation is important but shouldn't block expense creation
        logger.error("Error creating WHT record for expense", error, {
          expenseId: expense._id?.toString(),
          companyId: expense.companyId?.toString(),
          whtAmount: expense.whtAmount,
          whtType: expense.whtType,
          month,
          year,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
      }
    } else {
      logger.info("WHT record not created for expense - conditions not met", {
        expenseId: expense._id?.toString(),
        accountType: expense.accountType,
        hasCompanyId: !!expense.companyId,
        whtDeducted: expense.whtDeducted,
        whtType: expense.whtType,
        whtAmount: expense.whtAmount,
        reason: !expense.accountType || expense.accountType !== "company" 
          ? "Not a company expense"
          : !expense.companyId 
          ? "No company ID"
          : !expense.whtDeducted
          ? "WHT not deducted"
          : !expense.whtType
          ? "No WHT type"
          : !expense.whtAmount || expense.whtAmount <= 0
          ? "No WHT amount"
          : "Unknown",
      });
    }

    // ============================================
    // PIT SUMMARY UPDATE (Individual and Business Accounts) - REMOVED
    // ============================================
    // Refactored to On-The-Fly calculation. No need to persist state.

    return expense;
  }

  /**
   * Get a single expense by ID
   * Verifies user ownership before returning
   */
  async getExpenseById(
    userId: Types.ObjectId,
    expenseId: Types.ObjectId
  ): Promise<IExpense | null> {
    const expense = await Expense.findOne({
      _id: expenseId,
      userId,
    }).lean();

    if (!expense) {
      return null;
    }

    return expense as IExpense;
  }

  async getExpensesByAccount(
    userId: Types.ObjectId,
    accountId: string,
    filters?: {
      category?: string;
      year?: number;
      month?: number;
      search?: string;
      limit?: number;
      skip?: number;
      sortField?: ExpenseSortField;
      sortOrder?: SortOrder;
    }
  ): Promise<{ expenses: IExpense[]; total: number }> {
    const query: any = {
      userId,
      accountId: new Types.ObjectId(accountId),
    };

    // Category filter
    if (filters?.category && filters.category !== "all") {
      query.category = filters.category;
    }

    // Server-side search: Search across description and category
    // Use case-insensitive regex for partial matching
    const searchOr: any[] = [];
    if (filters?.search && filters.search.trim().length > 0) {
      const searchRegex = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      searchOr.push(
        { description: { $regex: searchRegex } },
        { category: { $regex: searchRegex } }
      );
      
      logger.info("Applying search filter for expenses", {
        accountId,
        searchTerm: filters.search,
        searchRegex: searchRegex.toString(),
      });
    }

    // Use MongoDB's $expr with $year and $month operators for more reliable filtering
    // This extracts the year/month from the stored date regardless of timezone
    const exprConditions: any[] = [];
    
    if (filters?.year) {
      // Filter by year using MongoDB's $year operator
      exprConditions.push({ $eq: [{ $year: "$date" }, filters.year] });
    }
    
    // Allow month filtering independently (can filter across all years)
    if (filters?.month && filters.month >= 1 && filters.month <= 12) {
      exprConditions.push({ $eq: [{ $month: "$date" }, filters.month] });
    }
    
    // Build query conditions - need to handle combination of search and date filters
    const queryConditions: any[] = [];
    
    if (searchOr.length > 0) {
      queryConditions.push({ $or: searchOr });
    }
    
    if (exprConditions.length > 0) {
      const dateExpr = exprConditions.length === 1 ? exprConditions[0] : { $and: exprConditions };
      queryConditions.push({ $expr: dateExpr });
      
      logger.info("Using $year/$month operator for expense filtering", {
        year: filters?.year ?? undefined,
        month: filters?.month ?? undefined,
        queryExpr: JSON.stringify(dateExpr),
      });
    }
    
    // Combine all conditions with $and if we have multiple conditions
    if (queryConditions.length > 1) {
      query.$and = queryConditions;
    } else if (queryConditions.length === 1) {
      // Merge single condition into query
      Object.assign(query, queryConditions[0]);
    }

    // Get total count before pagination
    const total = await Expense.countDocuments(query);

    // Build sort object
    const sortField = filters?.sortField || "date";
    const sortOrder = filters?.sortOrder === "asc" ? 1 : -1;
    const sort: any = {};
    
    switch (sortField) {
      case "date":
        sort.date = sortOrder;
        break;
      case "amount":
        sort.amount = sortOrder;
        break;
      case "description":
        sort.description = sortOrder;
        break;
      case "category":
        sort.category = sortOrder;
        break;
      default:
        sort.date = -1; // Default to newest first
    }

    // Apply pagination
    const skip = filters?.skip || 0;
    const limit = filters?.limit || 50;
    
    const expenses = await Expense.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      expenses: expenses as IExpense[],
      total,
    };
  }

  /**
   * Efficiently count expenses for a given account and time period.
   * Used for subscription limit checks.
   * 
   * Note: This counts only existing (non-deleted) expenses.
   * Since expenses use hard deletes, deleted expenses are automatically excluded.
   * 
   * @param userId - The user ID
   * @param accountId - The account ID (company ID or user ID for individuals)
   * @param month - Month (1-12)
   * @param year - Year
   * @returns The count of expenses for the specified month/year
   */
  async countExpensesByMonth(
    userId: Types.ObjectId,
    accountId: string,
    month: number,
    year: number
  ): Promise<number> {
    // Build query matching getExpensesByAccount logic for month/year filtering
    // Use MongoDB's $expr with $year and $month operators for reliable date filtering
    const query: any = {
      userId,
      accountId: new Types.ObjectId(accountId),
      $expr: {
        $and: [
          { $eq: [{ $year: "$date" }, year] },
          { $eq: [{ $month: "$date" }, month] },
        ],
      },
    };

    // Use countDocuments for efficient counting (no data fetching)
    // Deleted expenses are automatically excluded (hard deletes)
    const count = await Expense.countDocuments(query);
    
    return count;
  }

  async getExpenseSummary(
    userId: Types.ObjectId,
    accountId: string,
    year: number,
    month?: number // Optional: if not provided, returns yearly summary (aggregates all months)
  ): Promise<IExpenseSummary> {
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (year < 2026) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }
    const query: any = {
      userId,
      accountId: new Types.ObjectId(accountId),
      year,
    };

    // If month is provided, filter by specific month (monthly summary)
    // If month is not provided, aggregate all months for the year (yearly summary)
    if (month !== undefined && month !== null) {
      query.month = month;
    }

    const expenses = await Expense.find(query);

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const taxDeductibleExpenses = expenses
      .filter((exp) => exp.isTaxDeductible)
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Determine account type from expenses (should all be same type for an account)
    const accountType = expenses.length > 0 
      ? (expenses[0].accountType as AccountType)
      : AccountType.Individual;

    // For tax calculations, we use the tax year (which is the same as the expense year)
    const taxYear = year;

    // Get income for this entity and tax year (REQUIRED for accurate calculation)
    // For monthly summaries, fetch monthly income; for yearly summaries, fetch yearly income
    const income = await incomeService.getIncome(accountId, accountType, taxYear, month ?? null);

    // If income is missing, return blocking state
    if (!income || income.annualIncome === undefined || income.annualIncome === null) {
      return {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        taxDeductibleExpenses: Math.round(taxDeductibleExpenses * 100) / 100,
        taxableIncome: 0, // Cannot calculate without income
        taxSavings: null, // Blocking state - no calculation possible
        month: month || 0, // 0 indicates yearly summary (all months)
        year,
        requiresIncome: true,
        incomeRequiredFor: {
          accountId: accountId,
          entityType: accountType,
          taxYear,
          month: month ?? null, // Include month in incomeRequiredFor so frontend knows which income to request
        },
      };
    }

    // Calculate actual tax savings using real income data
    // Formula: Tax(Income) - Tax(Income - DeductibleExpenses)
    // For monthly summaries: income.annualIncome contains monthly income, need to annualize
    // For yearly summaries: income.annualIncome contains annual income, use directly
    const annualIncome = month !== undefined && month !== null
      ? income.annualIncome * 12 // Monthly: annualize monthly income for tax calculation
      : income.annualIncome; // Yearly: already annual income
    const annualDeductibleExpenses = month !== undefined && month !== null
      ? taxDeductibleExpenses * 12 // Monthly: annualize deductible expenses
      : taxDeductibleExpenses; // Yearly: already annual

    // Get tax exemption for this tax year (only applies to individuals)
    const annualTaxExemption = getAnnualTaxExemption(taxYear, accountType);
    
    let annualTaxOnIncome: number;
    let annualTaxOnReducedIncome: number;
    let taxableIncomeAfterExemption: number;
    let taxableIncomeAfterDeductionsAndExemption: number;
    
    // Get WHT credits for this account (if any)
    // WHT credits offset final tax liability per NRS regulations
    const whtCredits = await whtService.getTotalWHTCredits(
      new Types.ObjectId(accountId),
      taxYear
    );

    if (accountType === AccountType.Company) {
      // For companies: Use Company Income Tax (CIT) - 30% flat rate per NRS regulations
      // No personal exemption for companies per NRS regulations
      annualTaxOnIncome = calculateCorporateIncomeTax(annualIncome, taxYear);
      const taxableIncomeAfterDeductions = Math.max(0, annualIncome - annualDeductibleExpenses);
      annualTaxOnReducedIncome = calculateCorporateIncomeTax(taxableIncomeAfterDeductions, taxYear);
      
      // Apply WHT credits to reduce CIT liability per NRS regulations
      annualTaxOnIncome = calculateTaxAfterWHTCredit(annualTaxOnIncome, whtCredits);
      annualTaxOnReducedIncome = calculateTaxAfterWHTCredit(annualTaxOnReducedIncome, whtCredits);
      
      taxableIncomeAfterExemption = annualIncome; // No exemption for companies
      taxableIncomeAfterDeductionsAndExemption = taxableIncomeAfterDeductions; // For companies, same as after deductions
    } else {
      // For individuals: Use PAYE (Personal Income Tax) per NRS regulations
      // CRITICAL: PIT calculation must use taxable income (after Pension, NHF, NHIS, and new 2026+ deductions)
      // For expense summary, we assume no employment deductions (Pension, NHF, NHIS = 0)
      // This is for self-employed individuals or those tracking expenses separately
      // 
      // CRITICAL: CRA (Consolidated Relief Allowance) was REMOVED per Nigeria Tax Act 2025 (effective 2026+)
      // calculateCRA returns 0 for taxYear >= 2026
      
      const monthlyIncome = annualIncome / 12;
      const monthlyDeductibleExpenses = annualDeductibleExpenses / 12;
      
      // Calculate CRA (Consolidated Relief Allowance) - Returns 0 for taxYear >= 2026
      // CRITICAL: CRA was removed per Nigeria Tax Act 2025 (effective 2026+)
      // This function returns 0 for 2026+ tax years
      const monthlyCRA = calculateCRA(monthlyIncome, taxYear);
      
      // For expense summary: Assume no employment deductions (Pension, NHF, NHIS = 0)
      // These would be tracked separately for employed individuals
      const monthlyPension = 0;
      const monthlyNHF = 0;
      const monthlyNHIS = 0;
      
      // Calculate taxable income using proper NRS formula (2026+)
      // Taxable Income = Gross - Pension - NHF - NHIS (NHIS is deductible for 2026+)
      // CRA is NOT applicable for 2026+ (calculateCRA returns 0)
      const monthlyTaxableIncome = calculateTaxableIncome(
        monthlyIncome,
        monthlyPension,
        monthlyNHF,
        monthlyNHIS,
        taxYear
      );
      
      // Calculate taxable income after allowable deductions (expenses)
      const monthlyReducedTaxableIncome = Math.max(0, monthlyTaxableIncome - monthlyDeductibleExpenses);
      
      // Calculate tax on original income (annual)
      // calculatePAYE expects taxable income (CRA already removed for 2026+)
      const monthlyTaxOnIncome = calculatePAYE(monthlyTaxableIncome, monthlyIncome, taxYear);
      annualTaxOnIncome = monthlyTaxOnIncome * 12;

      // Calculate tax on reduced income (annual)
      const monthlyTaxOnReducedIncome = calculatePAYE(monthlyReducedTaxableIncome, monthlyIncome, taxYear);
      annualTaxOnReducedIncome = monthlyTaxOnReducedIncome * 12;
      
      // Calculate taxable income after exemption (for display - original income)
      // This shows: Gross Income → Taxable (after exemption) → Tax
      // CRITICAL: CRA is 0 for 2026+, so we don't subtract it
      taxableIncomeAfterExemption = Math.max(0, annualIncome - (monthlyCRA * 12) - annualTaxExemption);
      
      // Calculate taxable income after deductions AND exemption (for display - after deductions)
      // This shows: After Deductions → Taxable (after deductions and exemption) → Tax
      // CRITICAL: CRA is 0 for 2026+, so we don't subtract it
      const incomeAfterDeductions = Math.max(0, annualIncome - annualDeductibleExpenses);
      taxableIncomeAfterDeductionsAndExemption = Math.max(0, incomeAfterDeductions - (monthlyCRA * 12) - annualTaxExemption);
      
      // Apply WHT credits to reduce PIT liability per NRS regulations
      // WHT credits are annual, so apply directly to annual tax
      annualTaxOnIncome = calculateTaxAfterWHTCredit(annualTaxOnIncome, whtCredits);
      annualTaxOnReducedIncome = calculateTaxAfterWHTCredit(annualTaxOnReducedIncome, whtCredits);
    }
    
    const displayTaxableIncomeAfterExemption = month !== undefined && month !== null
      ? taxableIncomeAfterExemption / 12
      : taxableIncomeAfterExemption;

    // Calculate actual tax savings
    const annualTaxSavings = annualTaxOnIncome - annualTaxOnReducedIncome;

    // For monthly summaries, calculate monthly values
    // Note: We calculate annual first, then divide by 12 for monthly display
    const taxSavings = month !== undefined && month !== null
      ? annualTaxSavings / 12
      : annualTaxSavings;

    const taxOnIncome = month !== undefined && month !== null
      ? annualTaxOnIncome / 12
      : annualTaxOnIncome;

    const taxOnReducedIncome = month !== undefined && month !== null
      ? annualTaxOnReducedIncome / 12
      : annualTaxOnReducedIncome;

    // Calculate taxable income after deductions (for main display)
    // For individuals: this shows income - expenses - exemption (to match the format)
    // For companies: this shows income - expenses (no exemption)
    const taxableIncome = accountType === AccountType.Individual 
      ? taxableIncomeAfterDeductionsAndExemption
      : Math.max(0, annualIncome - annualDeductibleExpenses);
    // For monthly display, show monthly portion
    const displayTaxableIncome = month !== undefined && month !== null
      ? taxableIncome / 12
      : taxableIncome;

    // For display: monthly summaries show monthly income, yearly summaries show annual income
    // Note: annualIncome at this point is already annualized for calculations
    // For monthly: show the original monthly income (income.annualIncome which stores monthly value)
    // For yearly: show the annual income (which equals income.annualIncome since it stores annual value)
    const displayAnnualIncome = month !== undefined && month !== null
      ? income.annualIncome // Original monthly income value stored in DB
      : annualIncome; // Already annual income (equals income.annualIncome for yearly summaries)

    return {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      taxDeductibleExpenses: Math.round(taxDeductibleExpenses * 100) / 100,
      taxableIncome: Math.round(displayTaxableIncome * 100) / 100,
      taxSavings: Math.round(taxSavings * 100) / 100,
      month: month || 0, // 0 indicates yearly summary (all months)
      year,
      requiresIncome: false,
      incomeRequiredFor: null,
      annualIncome: Math.round(displayAnnualIncome * 100) / 100,
      annualTaxExemption: Math.round((month !== undefined && month !== null ? annualTaxExemption / 12 : annualTaxExemption) * 100) / 100,
      taxableIncomeAmount: Math.round(displayTaxableIncomeAfterExemption * 100) / 100,
      taxOnIncome: Math.round(taxOnIncome * 100) / 100,
      taxOnReducedIncome: Math.round(taxOnReducedIncome * 100) / 100,
    };
  }

  async updateExpense(
    userId: Types.ObjectId,
    expenseId: string,
    updateData: Partial<IExpenseCreate>
  ): Promise<IExpense | null> {
    const expense = await Expense.findOne({
      _id: new Types.ObjectId(expenseId),
      userId,
    });

    if (!expense) {
      return null;
    }

    // Store old values BEFORE updating (for VAT and WHT record update logic)
    const oldVatAmount = expense.vatAmount ?? 0;
    const oldMonth = expense.month;
    const oldYear = expense.year;
    const oldIsTaxDeductible = expense.isTaxDeductible;
    const oldWhtDeducted = expense.whtDeducted ?? false;
    const oldWhtType = expense.whtType;
    const oldWhtAmount = expense.whtAmount ?? 0;
    // Store old values for change detection (convert undefined to "" for comparison)
    const oldSupplierName = expense.supplierName ?? "";
    const oldSupplierTIN = expense.supplierTIN ?? "";
    const oldSupplierType = expense.supplierType ?? null;
    const oldIsNonResident = expense.isNonResident ?? false;

    if (updateData.date) {
      const date = new Date(updateData.date);
      expense.month = date.getMonth() + 1;
      expense.year = date.getFullYear();
      expense.date = date;
    }

    if (updateData.amount !== undefined) {
      expense.amount = updateData.amount;
    }

    if (updateData.description) {
      expense.description = updateData.description;
    }

    if (updateData.category) {
      expense.category = updateData.category;
    }

    if (updateData.isTaxDeductible !== undefined) {
      expense.isTaxDeductible = updateData.isTaxDeductible;
    }

    // Update WHT fields if provided
    if (updateData.whtDeducted !== undefined) {
      expense.whtDeducted = updateData.whtDeducted;
    }
    if (updateData.whtType !== undefined) {
      expense.whtType = updateData.whtType;
    }
    
    // Update supplier information if provided (REQUIRED for WHT compliance)
    // Schema alignment: converting undefined to schema defaults ("" for strings)
    if (updateData.supplierName !== undefined) {
      expense.supplierName = updateData.supplierName ?? "";
    }
    if (updateData.supplierTIN !== undefined) {
      expense.supplierTIN = updateData.supplierTIN ?? "";
    }
    if (updateData.supplierType !== undefined) {
      expense.supplierType = updateData.supplierType;
    }
    
    if (updateData.isNonResident !== undefined) {
      expense.isNonResident = updateData.isNonResident;
    }

    // NRS Compliance: Validate supplier information when WHT is deducted
    if ((expense.accountType === AccountType.Company || expense.accountType === AccountType.Business) && expense.whtDeducted && expense.whtType) {
      if (!expense.supplierName || expense.supplierName.trim() === "") {
        throw new Error("Supplier name is required when WHT is deducted (NRS compliance requirement)");
      }
      if (!expense.supplierType) {
        throw new Error("Supplier type (company/individual) is required when WHT is deducted");
      }
      // TIN is strongly recommended but not always available
      if (!expense.supplierTIN || expense.supplierTIN.trim() === "") {
        logger.warn("Expense with WHT deducted missing supplier TIN - NRS compliance risk", {
          expenseId: expense._id?.toString(),
          expenseDescription: expense.description,
          supplierName: expense.supplierName,
        });
      }
    }

    // Recalculate VAT if applicable
    // NHS Compliance Check: Only if Registered
    if ((expense.accountType === AccountType.Company || expense.accountType === AccountType.Business) && expense.isTaxDeductible) {
        let isVatRegistered = false;
        let vatEntity: any = null;
        
        // Check entity registration status
        if (expense.accountType === AccountType.Company) {
             vatEntity = await Company.findById(expense.companyId).lean();
        } else {
             vatEntity = await import("../business/entity").then(m => m.default.findById(expense.companyId).lean());
        }

        if (vatEntity) {
             if (vatEntity.vatRegistrationNumber) {
                 isVatRegistered = true;
             } else {
                 try {
                    const { companyService } = await import("../company/service");
                    // companyId stores accountId for Business too
                    const annualTurnover = await companyService.calculateAnnualTurnover(expense.companyId!, expense.year);
                    if (annualTurnover >= NRS_VAT_TURNOVER_THRESHOLD_2026) isVatRegistered = true;
                 } catch (e) { /* ignore */ }
             }
        }
        
        if (isVatRegistered) {
            expense.vatAmount = Math.round(expense.amount * (NRS_VAT_RATE / 100) * 100) / 100;
        } else {
            expense.vatAmount = 0;
        }
    } else {
      expense.vatAmount = 0;
    }

    // Recalculate WHT if applicable (for company/business expenses with WHT deducted)
    if ((expense.accountType === AccountType.Company || expense.accountType === AccountType.Business) && expense.whtDeducted && expense.whtType) {
      // Determine entity type to fetch
      let entity: any = null;
      if (expense.accountType === AccountType.Company) {
        entity = await Company.findById(expense.companyId).lean();
      } else {
        entity = await import("../business/entity").then(m => m.default.findById(expense.companyId).lean());
      }
      
      const taxYear = getTaxYear();
      
      // CRITICAL: WHT Exemption logic applies to the SUPPLIER (Payee), not the Payer.
      // Since we don't know the supplier's turnover/status from the Expense form,
      // we CANNOT assume they are exempt.
      // Default to "Not Exempt" (false) to ensure we deduct WHT unless the user manually opts out.
      const isSupplierSmallCompany = false;

      const isServicePayment = [
        WHTType.ProfessionalServices,
        WHTType.TechnicalServices,
        WHTType.ManagementServices,
        WHTType.OtherServices,
        WHTType.Commission,
      ].includes(expense.whtType as WHTType);
      
      expense.whtAmount = Math.round(calculateWHT(
        expense.amount,
        expense.whtType as WHTType,
        taxYear,
        isSupplierSmallCompany,
        isServicePayment,
        expense.isNonResident ?? false, // New Field: Non-Resident Status
        expense.supplierType // New Field: Supplier Type for correct rate selection
      ) * 100) / 100;
    } else {
      expense.whtAmount = 0;
      if (!expense.whtDeducted) {
        expense.whtType = undefined;
      }
    }

    await expense.save();

    // ============================================
    // VAT HANDLING (Input VAT from Expenses)
    // ============================================
    // Only process VAT records for company/business expenses
    if ((expense.accountType === AccountType.Company || expense.accountType === AccountType.Business) && expense.companyId) {
      // Update VAT summary for affected periods (calculates on-the-fly)
      // No need to create/update/delete VATRecords - we calculate directly from source data
      try {
        const newMonth = expense.month;
        const newYear = expense.year;
        const monthChanged = oldMonth !== newMonth || oldYear !== newYear;

        // If month/year changed, update summaries for both old and new periods
        if (monthChanged && expense.companyId) {
          await vatService.updateVATSummary(expense.companyId, oldMonth, oldYear, expense.accountType);
        }
        if (expense.companyId) {
          await vatService.updateVATSummary(expense.companyId, newMonth, newYear, expense.accountType);
        }

        logger.info("VAT summary updated for expense (on-the-fly calculation)", {
          expenseId: expense._id!.toString(),
          companyId: expense.companyId?.toString(),
          oldVatAmount,
          newVatAmount: expense.vatAmount ?? 0,
          oldMonth,
          oldYear,
          newMonth,
          newYear,
          isTaxDeductible: expense.isTaxDeductible,
        });
      } catch (error: any) {
        logger.error("Error updating VAT summary for expense", error, {
          expenseId: expense._id!.toString(),
          companyId: expense.companyId?.toString(),
        });
      }
    }

    // ============================================
    // WHT HANDLING (Withholding Tax from Expenses)
    // ============================================
    // Only process WHT records for company/business expenses
    if ((expense.accountType === AccountType.Company || expense.accountType === AccountType.Business) && expense.companyId) {
      const existingWHTRecord = await whtService.findWHTRecordByTransaction(
        expense._id!,
        TransactionType.Expense,
        expense.companyId
      );

      const newWhtAmount = expense.whtAmount ?? 0;
      const newMonth = expense.month;
      const newYear = expense.year;
      const monthChanged = oldMonth !== newMonth || oldYear !== newYear;
      const whtDeductedChanged = oldWhtDeducted !== expense.whtDeducted;
      const whtTypeChanged = oldWhtType !== expense.whtType;
      const whtAmountChanged = oldWhtAmount !== newWhtAmount;

      // Case 1: WHT is no longer deducted OR WHT amount is now 0
      // Delete WHT record - no WHT to remit
      if ((!expense.whtDeducted || !expense.whtType || newWhtAmount === 0) && existingWHTRecord) {
        try {
          await whtService.deleteWHTRecordByTransaction(
            expense._id!,
            TransactionType.Expense,
            expense.companyId
          );
          logger.info("WHT record deleted - expense no longer has WHT deducted", {
            expenseId: expense._id!.toString(),
            companyId: expense.companyId.toString(),
            previousWhtAmount: oldWhtAmount,
            newWhtAmount,
            whtDeducted: expense.whtDeducted,
          });
        } catch (error: any) {
          logger.error("Error deleting WHT record when expense WHT was removed", error, {
            expenseId: expense._id!.toString(),
            companyId: expense.companyId.toString(),
          });
        }
      }
      // Case 2: Expense has WHT deducted AND has WHT amount
      else if (expense.whtDeducted && expense.whtType && newWhtAmount > 0) {
        if (existingWHTRecord) {
          // Update existing WHT record if amount/type/date changed
          if (whtAmountChanged || whtTypeChanged || monthChanged) {
            try {
              // Delete old record and create new one (WHT service doesn't have update method)
              await whtService.deleteWHTRecordByTransaction(
                expense._id!,
                TransactionType.Expense,
                expense.companyId
              );

              // NRS Compliance: Get supplier/vendor info from expense (REQUIRED for WHT records)
              if (!expense.supplierName || expense.supplierName.trim() === "") {
                throw new Error("Supplier name is required for WHT record update (NRS compliance)");
              }
              const payeeName = expense.supplierName;
              if (!expense.supplierTIN || !expense.supplierTIN.trim()) {
                throw new Error("Supplier TIN is required for WHT record update (NRS compliance)");
              }
              const payeeTIN = expense.supplierTIN;
              if (!expense.supplierType) {
                throw new Error("Supplier type is required for WHT record update (NRS compliance)");
              }
              const supplierType = expense.supplierType;

              // Validate supplier information (NRS requirement)
              if (!payeeName || payeeName.trim() === "") {
              logger.error("WHT record update failed - missing supplier name", undefined, {
                expenseId: expense._id!.toString(),
                companyId: expense.companyId.toString(),
              });
                throw new Error("Supplier name is required for WHT record (NRS compliance)");
              }

              // Generate deterministic accountId from supplier TIN/name for WHT credit tracking
              let supplierAccountId: Types.ObjectId;
              try {
                supplierAccountId = generateSupplierAccountId(payeeTIN);
              } catch (error: any) {
                logger.error("Failed to generate supplier account ID during update", error, {
                  expenseId: expense._id!.toString(),
                  supplierTIN: payeeTIN,
                  supplierName: payeeName,
                });
                throw new Error(`Failed to generate supplier account ID: ${error.message}`);
              }

              await whtService.createWHTRecord({
                companyId: expense.companyId,
                accountId: supplierAccountId, // CRITICAL: Use supplier account ID, not expense ID
                accountType: supplierType, // Use actual supplier type
                transactionType: TransactionType.Expense,
                transactionId: expense._id!,
                payeeName: payeeName.trim(),
                payeeTIN: payeeTIN.trim(),
                paymentAmount: expense.amount,
                whtType: expense.whtType,
                paymentDate: expense.date,
                description: `WHT deducted from expense: ${expense.description}`,
                notes: `Expense payment - ${expense.category} | Supplier: ${payeeName}`,
              });

              // Update summaries for both old and new periods if month/year changed
              if (monthChanged) {
                await whtService.updateWHTSummary(expense.companyId, oldMonth, oldYear);
              }
              await whtService.updateWHTSummary(expense.companyId, newMonth, newYear);

              logger.info("WHT record updated for expense", {
                expenseId: expense._id!.toString(),
                companyId: expense.companyId.toString(),
                oldWhtAmount,
                newWhtAmount,
                oldWhtType,
                newWhtType: expense.whtType,
                oldMonth,
                oldYear,
                newMonth,
                newYear,
              });
            } catch (error: any) {
              logger.error("Error updating WHT record for expense", error, {
                expenseId: expense._id!.toString(),
                companyId: expense.companyId.toString(),
              });
            }
          }
        } else {
          // Create new WHT record (expense now has WHT deducted)
          try {
            // NRS Compliance: Get supplier/vendor info from expense (REQUIRED for WHT records)
            if (!expense.supplierName || expense.supplierName.trim() === "") {
              logger.error("WHT record creation failed - missing supplier name", undefined, {
                expenseId: expense._id!.toString(),
                companyId: expense.companyId.toString(),
              });
              throw new Error("Supplier name is required for WHT record creation (NRS compliance)");
            }
            const payeeName = expense.supplierName;
            if (!expense.supplierTIN || !expense.supplierTIN.trim()) {
              throw new Error("Supplier TIN is required for WHT record creation (NRS compliance)");
            }
            const payeeTIN = expense.supplierTIN;
            if (!expense.supplierType) {
              throw new Error("Supplier type is required for WHT record creation (NRS compliance)");
            }
            const supplierType = expense.supplierType;

            // Generate deterministic accountId from supplier TIN/name for WHT credit tracking
            let supplierAccountId: Types.ObjectId;
            try {
              supplierAccountId = generateSupplierAccountId(payeeTIN);
            } catch (error: any) {
              logger.error("Failed to generate supplier account ID during creation", error, {
                expenseId: expense._id!.toString(),
                supplierTIN: payeeTIN,
                supplierName: payeeName,
              });
              throw new Error(`Failed to generate supplier account ID: ${error.message}`);
            }

            await whtService.createWHTRecord({
              companyId: expense.companyId,
              accountId: supplierAccountId, // CRITICAL: Use supplier account ID, not expense ID
              accountType: supplierType, // Use actual supplier type
              transactionType: TransactionType.Expense,
              transactionId: expense._id!,
              payeeName: payeeName.trim(),
              payeeTIN: payeeTIN.trim(),
              paymentAmount: expense.amount,
              whtType: expense.whtType,
              paymentDate: expense.date,
              description: `WHT deducted from expense: ${expense.description}`,
              notes: `Expense payment - ${expense.category} | Supplier: ${payeeName}`,
            });

            logger.info("WHT record created for updated expense", {
              expenseId: expense._id!.toString(),
              companyId: expense.companyId.toString(),
              whtAmount: newWhtAmount,
              whtType: expense.whtType,
              month: newMonth,
              year: newYear,
            });
          } catch (error: any) {
            logger.error("Error creating WHT record for updated expense", error, {
              expenseId: expense._id!.toString(),
              companyId: expense.companyId.toString(),
            });
          }
        }
      }
    }

    // PIT summary update removed (Calculated on-the-fly)

    return expense;
  }

  async deleteExpense(userId: Types.ObjectId, expenseId: string): Promise<boolean> {
    // First, fetch the expense to verify it exists and check accountType
    const expense = await Expense.findById(expenseId);
    
    if (!expense) {
      return false;
    }

    // Verify userId matches (expense must belong to this user)
    if (expense.userId.toString() !== userId.toString()) {
      return false;
    }

    // For company expenses, verify user is the owner of the company account
    if (expense.accountType === AccountType.Company) {
      const { requireOwner } = await import("../middleware/auth");
      const isOwner = await requireOwner(userId, expense.accountId);
      if (!isOwner) {
        // User is not the owner of this company account
        return false;
      }
    } else if (expense.accountType === AccountType.Business) {
      // For business expenses, verify user is the owner of the business account
      const { requireBusinessOwner } = await import("../middleware/auth");
      const isOwner = await requireBusinessOwner(userId, expense.accountId);
      if (!isOwner) {
        // User is not the owner of this business account
        return false;
      }
    } else {
      // For individual expenses, verify accountId matches userId
      if (expense.accountId.toString() !== userId.toString()) {
        return false;
      }
    }

    // ============================================
    // VAT HANDLING (Delete Input VAT Record)
    // ============================================
    // CRITICAL: Delete associated Input VAT record when expense is deleted
    // This ensures VAT summary only includes active expenses
    // 
    // NOTE: Currently only Company expenses create VAT records (see createExpense method).
    // Business expenses don't currently create VAT records, so there's nothing to clean up for Business accounts.
    // If Business VAT support is added in the future, this cleanup logic would need to be extended
    // to handle Business accounts (would require VAT service to support businessId parameter).
    if ((expense.accountType === AccountType.Company || expense.accountType === AccountType.Business) && expense.companyId) {
      try {
        // Update VAT summary for the affected period (calculates on-the-fly)
        // No need to delete VATRecord - we calculate directly from source data
        // CRITICAL: Pass AccountType.Company for proper expense querying
        if (expense.companyId) {
          await vatService.updateVATSummary(
            expense.companyId,
            expense.month,
            expense.year,
            AccountType.Company
          );

          logger.info("VAT summary updated for deleted expense (on-the-fly calculation)", {
            expenseId: expenseId.toString(),
            companyId: expense.companyId.toString(),
            month: expense.month,
            year: expense.year,
            vatAmount: expense.vatAmount ?? 0,
          });
        }
      } catch (error: any) {
        // Log error but don't fail expense deletion
        // VAT record deletion is important but shouldn't block expense deletion
        logger.error("Error deleting Input VAT record for deleted expense", error, {
          expenseId: expenseId.toString(),
          companyId: expense.companyId?.toString(),
        });
      }
    }

    // ============================================
    // WHT HANDLING (Delete WHT Record)
    // ============================================
    // CRITICAL: Delete associated WHT record when expense is deleted
    // This ensures WHT summary only includes active expenses
    //
    // NOTE: Currently only Company expenses create WHT records (see createExpense method).
    // Business expenses don't currently create WHT records, so there's nothing to clean up for Business accounts.
    // If Business WHT support is added in the future, this cleanup logic would need to be extended
    // to handle Business accounts (would require WHT service to support businessId parameter).
    if ((expense.accountType === AccountType.Company || expense.accountType === AccountType.Business) && expense.companyId) {
      try {
        const whtRecord = await whtService.findWHTRecordByTransaction(
          expense._id!,
          TransactionType.Expense,
          expense.companyId
        );

        if (whtRecord) {
          await whtService.deleteWHTRecordByTransaction(
            expense._id!,
            TransactionType.Expense,
            expense.companyId
          );

          logger.info("WHT record deleted for deleted expense", {
            expenseId: expenseId.toString(),
            companyId: expense.companyId.toString(),
            month: whtRecord.month,
            year: whtRecord.year,
            whtAmount: whtRecord.whtAmount,
          });
        }
      } catch (error: any) {
        // Log error but don't fail expense deletion
        // WHT record deletion is important but shouldn't block expense deletion
        logger.error("Error deleting WHT record for deleted expense", error, {
          expenseId: expenseId.toString(),
          companyId: expense.companyId?.toString(),
        });
      }
    }

    // PIT summary update removed (Calculated on-the-fly)

    // All checks passed, delete the expense
    const result = await Expense.deleteOne({
      _id: new Types.ObjectId(expenseId),
    });

    return result.deletedCount > 0;
  }


  /**
   * Calculate total deductible expenses for a business account for a specific tax year.
   * This aggregates all expenses marked as `isTaxDeductible: true` for the given year.
   * 
   * @param accountId - The account ID (userId for sole proprietorships/businesses)
   * @param year - The tax year to calculate for
   * @returns Total deductible expenses amount
   */
  async calculateTotalDeductibleExpenses(
    accountId: string,
    year: number,
    allowedAccountTypes?: AccountType[]
  ): Promise<number> {
    try {
      // Aggregate all deductible expenses for the account and year
    // CRITICAL FIX: Match by userId OR accountId
    // PITService passes User ID (as accountId), so we must check userId field
    // Companies pass Company ID, so we check companyId/accountId field
    const matchId = new Types.ObjectId(accountId);
      const result = await Expense.aggregate([
    {
      $match: {
        $or: [
          { userId: matchId },
          { accountId: matchId },
          { companyId: matchId }
        ],
        year: year,
        isTaxDeductible: true,
        // CRITICAL FIX: Allow filtering by AccountType to prevent mixing CIT and PIT expenses
        ...(allowedAccountTypes && allowedAccountTypes.length > 0 ? { accountType: { $in: allowedAccountTypes } } : {})
      }
    },
    {
      $group: {
        _id: null,
        // CRITICAL FIX: Prevent double-dipping.
        // If VAT is calculated/claimed (vatAmount exists), it is an Asset (Input VAT), not an Expense.
        // Deductible Expense = Gross Amount - Reclaimable VAT.
        totalDeductible: { 
          $sum: { 
            $subtract: [ "$amount", { $ifNull: ["$vatAmount", 0] } ] 
          } 
        }
      }
    }
  ]);

      const total = result.length > 0 ? result[0].totalDeductible : 0;
      
      logger.info(`Calculated total deductible expenses for ${accountId} in ${year}: ${total}`);
      
      return total;
    } catch (error: any) {
      logger.error("Error calculating total deductible expenses", error, {
        accountId,
        year
      });
      throw error;
    }
  }

  async getMonthlyProfit(
    userId: Types.ObjectId,
    accountId: string,
    month: number,
    year: number
  ): Promise<{ profit: number; expenses: number; income: number }> {
    // This would ideally fetch income data too
    // For now, we'll return expenses as negative profit
    const result = await this.getExpensesByAccount(userId, accountId, { month, year });
    const totalExpenses = result.expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // In a real implementation, you'd fetch income from invoices or income records
    return {
      profit: -totalExpenses, // Negative because we only have expenses
      expenses: totalExpenses,
      income: 0, // Would be fetched from income records
    };
  }
}

export const expenseService = new ExpenseService();





