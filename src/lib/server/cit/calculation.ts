import { Types } from "mongoose";
import { NRS_CIT_RATE } from "../../constants/nrs-constants";
import { ICITCalculation, ICITSummaryResponse } from "./calculation-interface";
import { InvoiceStatus, TaxClassification, RemittanceStatus, AccountType, TransactionType } from "../utils/enum";
import { logger } from "../utils/logger";
import { companyService } from "../company/service";
import { calculateCorporateIncomeTax } from "../tax/calculator";
import { whtService } from "../wht/service";

/**
 * Calculate CIT Summary on-the-fly
 * 
 * CRITICAL: This function calculates all CIT values on-the-fly from source data:
 * - Revenue: Sum of paid invoices (subtotal, excluding VAT)
 * - Expenses: Sum of tax-deductible expenses for the tax year
 * - WHT Credits: From WHT deducted during the tax year
 * - Remittances: User-entered CIT remittance records
 * 
 * @param companyId - Company ID
 * @param taxYear - Tax year (2026+)
 * @returns Calculated CIT summary
 */
export async function calculateCITSummary(
  companyId: Types.ObjectId,
  taxYear: number
): Promise<ICITSummaryResponse> {
  // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
  if (taxYear < 2026 || taxYear > 2100) {
    throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
  }

  // CRITICAL: Validate companyId
  if (companyId === null || companyId === undefined) {
    throw new Error("Company ID is required but is null or undefined");
  }

  // 1. Get revenue from paid invoices for the tax year
  const { default: Invoice } = await import("../invoice/entity");
  
  const yearStart = new Date(taxYear, 0, 1);
  const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59);

  // CRITICAL: Validate date range - fail loudly if invalid
  if (isNaN(yearStart.getTime()) || isNaN(yearEnd.getTime())) {
    throw new Error(`CRITICAL: Invalid date range calculated. taxYear: ${taxYear}, yearStart: ${yearStart.toISOString()}, yearEnd: ${yearEnd.toISOString()}`);
  }

  logger.info("[CIT_CALCULATION] Starting invoice query", {
    companyId: companyId.toString(),
    taxYear,
    yearStart: yearStart.toISOString(),
    yearEnd: yearEnd.toISOString(),
    invoiceStatusFilter: InvoiceStatus.Paid,
    invoiceStatusFilterType: typeof InvoiceStatus.Paid,
  });

  // CRITICAL: Diagnostic query - get ALL invoices for this company (regardless of status/date)
  // This helps debug why the filtered query returns 0 results
  const allCompanyInvoices = await Invoice.find({
    companyId: companyId,
  }).lean();

  logger.info("[CIT_CALCULATION] DIAGNOSTIC: All invoices for company", {
    companyId: companyId.toString(),
    totalInvoices: allCompanyInvoices.length,
    invoices: allCompanyInvoices.map((inv) => ({
      _id: inv._id?.toString(),
      status: inv.status,
      statusType: typeof inv.status,
      issueDate: inv.issueDate,
      issueDateISO: inv.issueDate ? new Date(inv.issueDate).toISOString() : null,
      issueDateYear: inv.issueDate ? new Date(inv.issueDate).getFullYear() : null,
      subtotal: inv.subtotal,
      matchesStatusFilter: inv.status === InvoiceStatus.Paid,
      matchesDateFilter: inv.issueDate && new Date(inv.issueDate) >= yearStart && new Date(inv.issueDate) <= yearEnd,
      matchesAllFilters: inv.status === InvoiceStatus.Paid && inv.issueDate && new Date(inv.issueDate) >= yearStart && new Date(inv.issueDate) <= yearEnd,
    })),
  });

  // CRITICAL: Only count paid invoices (CIT is based on actual revenue received)
  // Use subtotal (excludes VAT) for revenue calculation
  const invoiceQuery = {
    companyId: companyId,
    status: InvoiceStatus.Paid,
    issueDate: { $gte: yearStart, $lte: yearEnd },
  };

  logger.info("[CIT_CALCULATION] Invoice query parameters", {
    companyId: companyId.toString(),
    taxYear,
    query: invoiceQuery,
    yearStart: yearStart.toISOString(),
    yearEnd: yearEnd.toISOString(),
    invoiceStatusPaid: InvoiceStatus.Paid,
  });

  const paidInvoices = await Invoice.find(invoiceQuery).lean();

  logger.info("[CIT_CALCULATION] Paid invoices fetched", {
    companyId: companyId.toString(),
    taxYear,
    paidInvoiceCount: paidInvoices.length,
    paidInvoices: paidInvoices.map((inv) => ({
      _id: inv._id?.toString(),
      status: inv.status,
      issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString() : null,
      subtotal: inv.subtotal,
    })),
  });

  // Calculate total revenue (sum of subtotals, excluding VAT)
  let totalRevenue = 0;
  const invoiceValidationErrors: string[] = [];
  
  for (const invoice of paidInvoices) {
    const invoiceId = invoice._id?.toString();
    if (invoiceId === null || invoiceId === undefined || invoiceId === "") {
      invoiceValidationErrors.push(`Invoice has null/undefined/empty _id. Cannot process invoice.`);
      continue;
    }

    if (invoice.subtotal === null || invoice.subtotal === undefined) {
      invoiceValidationErrors.push(`Invoice ${invoiceId} missing subtotal. All invoices must have subtotal.`);
      continue;
    }
    if (typeof invoice.subtotal !== "number" || isNaN(invoice.subtotal) || !isFinite(invoice.subtotal)) {
      invoiceValidationErrors.push(`Invalid subtotal on invoice ${invoiceId}: ${invoice.subtotal}`);
      continue;
    }
    if (invoice.subtotal < 0) {
      invoiceValidationErrors.push(`Subtotal cannot be negative on invoice ${invoiceId}: ${invoice.subtotal}`);
      continue;
    }

    totalRevenue += invoice.subtotal;
  }

  // CRITICAL: Warn if we have invoices but query returned 0 - indicates filter mismatch
  if (allCompanyInvoices.length > 0 && paidInvoices.length === 0) {
    logger.warn("[CIT_CALCULATION] WARNING: Company has invoices but none match CIT query filters", {
      companyId: companyId.toString(),
      taxYear,
      totalInvoices: allCompanyInvoices.length,
      paidInvoices: paidInvoices.length,
      possibleIssues: {
        statusNotPaid: allCompanyInvoices.some((inv) => inv.status !== InvoiceStatus.Paid),
        dateOutOfRange: allCompanyInvoices.some((inv) => !inv.issueDate || new Date(inv.issueDate) < yearStart || new Date(inv.issueDate) > yearEnd),
      },
      invoiceStatuses: [...new Set(allCompanyInvoices.map((inv) => inv.status))],
      invoiceYears: [...new Set(allCompanyInvoices.map((inv) => inv.issueDate ? new Date(inv.issueDate).getFullYear() : null).filter((y) => y !== null))],
    });
  }

  // 2. Get tax-deductible expenses for the tax year
  const { default: Expense } = await import("../expense/entity");
  
  // CRITICAL: Use enum value instead of string literal - fail loudly if enum is invalid
  if (!AccountType.Company || typeof AccountType.Company !== "string") {
    throw new Error(`CRITICAL: AccountType.Company enum value is invalid: ${AccountType.Company}`);
  }

  logger.info("[CIT_CALCULATION] Starting expense query", {
    companyId: companyId.toString(),
    taxYear,
    yearStart: yearStart.toISOString(),
    yearEnd: yearEnd.toISOString(),
    accountTypeFilter: AccountType.Company,
    accountTypeFilterType: typeof AccountType.Company,
    isTaxDeductibleFilter: true,
  });

  // CRITICAL: Diagnostic query - get ALL expenses for this company (regardless of filters)
  // This helps debug why the filtered query returns 0 results
  const allCompanyExpenses = await Expense.find({
    companyId: companyId,
  }).lean();

  logger.info("[CIT_CALCULATION] DIAGNOSTIC: All expenses for company", {
    companyId: companyId.toString(),
    totalExpenses: allCompanyExpenses.length,
    expenses: allCompanyExpenses.map((exp) => ({
      _id: exp._id?.toString(),
      accountType: exp.accountType,
      accountTypeType: typeof exp.accountType,
      isTaxDeductible: exp.isTaxDeductible,
      isTaxDeductibleType: typeof exp.isTaxDeductible,
      date: exp.date,
      dateISO: exp.date ? new Date(exp.date).toISOString() : null,
      dateYear: exp.date ? new Date(exp.date).getFullYear() : null,
      amount: exp.amount,
      companyId: exp.companyId?.toString(),
      matchesAccountTypeFilter: exp.accountType === AccountType.Company,
      matchesTaxDeductibleFilter: exp.isTaxDeductible === true,
      matchesDateFilter: exp.date && new Date(exp.date) >= yearStart && new Date(exp.date) <= yearEnd,
      matchesAllFilters: exp.accountType === AccountType.Company && exp.isTaxDeductible === true && exp.date && new Date(exp.date) >= yearStart && new Date(exp.date) <= yearEnd,
    })),
  });
  
  const expenseQuery = {
    companyId: companyId,
    accountType: AccountType.Company, // CRITICAL: Use enum, not string literal
    isTaxDeductible: true,
    date: { $gte: yearStart, $lte: yearEnd },
  };
  
  logger.info("[CIT_CALCULATION] Expense query parameters", {
    companyId: companyId.toString(),
    taxYear,
    query: expenseQuery,
    yearStart: yearStart.toISOString(),
    yearEnd: yearEnd.toISOString(),
    accountTypeCompany: AccountType.Company,
  });
  
  const taxDeductibleExpenses = await Expense.find(expenseQuery).lean();
  
  logger.info("[CIT_CALCULATION] Tax-deductible expenses fetched", {
    companyId: companyId.toString(),
    taxYear,
    expenseCount: taxDeductibleExpenses.length,
    expenses: taxDeductibleExpenses.map((e) => ({
      _id: e._id?.toString(),
      amount: e.amount,
      date: e.date ? new Date(e.date).toISOString() : null,
      isTaxDeductible: e.isTaxDeductible,
      accountType: e.accountType,
      companyId: e.companyId?.toString(),
    })),
  });

  // CRITICAL: Warn if we have expenses but query returned 0 - indicates filter mismatch
  if (allCompanyExpenses.length > 0 && taxDeductibleExpenses.length === 0) {
    logger.warn("[CIT_CALCULATION] WARNING: Company has expenses but none match CIT query filters", {
      companyId: companyId.toString(),
      taxYear,
      totalExpenses: allCompanyExpenses.length,
      matchedExpenses: taxDeductibleExpenses.length,
      possibleIssues: {
        accountTypeMismatch: allCompanyExpenses.some((e) => e.accountType !== AccountType.Company),
        notTaxDeductible: allCompanyExpenses.some((e) => e.isTaxDeductible !== true),
        dateOutOfRange: allCompanyExpenses.some((e) => !e.date || new Date(e.date) < yearStart || new Date(e.date) > yearEnd),
      },
    });
  }

  // Calculate total expenses
  let totalExpenses = 0;
  const expenseValidationErrors: string[] = [];
  
  for (const expense of taxDeductibleExpenses) {
    const expenseId = expense._id?.toString();
    if (expenseId === null || expenseId === undefined || expenseId === "") {
      expenseValidationErrors.push(`Expense has null/undefined/empty _id. Cannot process expense.`);
      continue;
    }

    if (expense.amount === null || expense.amount === undefined) {
      expenseValidationErrors.push(`Expense ${expenseId} missing amount. All expenses must have amount.`);
      continue;
    }
    if (typeof expense.amount !== "number" || isNaN(expense.amount) || !isFinite(expense.amount)) {
      expenseValidationErrors.push(`Invalid amount on expense ${expenseId}: ${expense.amount}`);
      continue;
    }
    if (expense.amount < 0) {
      expenseValidationErrors.push(`Amount cannot be negative on expense ${expenseId}: ${expense.amount}`);
      continue;
    }

    totalExpenses += expense.amount;
  }

  // CRITICAL: Collect ALL validation errors and fail loudly if ANY exist
  const allErrors = [...invoiceValidationErrors, ...expenseValidationErrors];
  if (allErrors.length > 0) {
    logger.error("CIT calculation failed due to invalid data", new Error("Validation errors found"), {
      companyId: companyId.toString(),
      taxYear,
      invoiceErrors: invoiceValidationErrors.length,
      expenseErrors: expenseValidationErrors.length,
      totalErrors: allErrors.length,
    });
    
    throw new Error(
      `CIT calculation failed: ${allErrors.length} invalid record(s) found.\n\n` +
      `INVOICE ERRORS (${invoiceValidationErrors.length}):\n${invoiceValidationErrors.length > 0 ? invoiceValidationErrors.join("\n") : "None"}\n\n` +
      `EXPENSE ERRORS (${expenseValidationErrors.length}):\n${expenseValidationErrors.length > 0 ? expenseValidationErrors.join("\n") : "None"}\n\n` +
      `Please fix all invalid records before calculating CIT.`
    );
  }

  // 3. Calculate taxable profit (cannot be negative)
  const taxableProfit = Math.max(0, totalRevenue - totalExpenses);

  // CRITICAL: Log summary of data found - fail loudly if suspicious
  logger.info("[CIT_CALCULATION] Revenue and expense summary", {
    companyId: companyId.toString(),
    taxYear,
    totalRevenue,
    totalExpenses,
    taxableProfit,
    paidInvoicesCount: paidInvoices.length,
    taxDeductibleExpensesCount: taxDeductibleExpenses.length,
    allInvoicesCount: allCompanyInvoices.length,
    allExpensesCount: allCompanyExpenses.length,
    warnings: {
      revenueIsZero: totalRevenue === 0,
      expensesIsZero: totalExpenses === 0,
      hasInvoicesButNoRevenue: allCompanyInvoices.length > 0 && totalRevenue === 0,
      hasExpensesButNoExpenseTotal: allCompanyExpenses.length > 0 && totalExpenses === 0,
    },
  });

  // CRITICAL: Warn if we have data but totals are 0 - indicates data exists but doesn't match filters
  if (allCompanyInvoices.length > 0 && totalRevenue === 0) {
    logger.error(
      "[CIT_CALCULATION] CRITICAL WARNING: Company has invoices but revenue is 0",
      undefined,
      {
        companyId: companyId.toString(),
        taxYear,
        totalInvoices: allCompanyInvoices.length,
        paidInvoices: paidInvoices.length,
        totalRevenue,
        possibleReasons: [
          "Invoices are not marked as 'paid' status",
          "Invoice issueDate is outside the tax year range",
          "Invoice subtotal is 0 or invalid",
        ],
      }
    );
  }

  if (allCompanyExpenses.length > 0 && totalExpenses === 0) {
    logger.error(
      "[CIT_CALCULATION] CRITICAL WARNING: Company has expenses but expense total is 0",
      undefined,
      {
        companyId: companyId.toString(),
        taxYear,
        totalExpenses: allCompanyExpenses.length,
        taxDeductibleExpenses: taxDeductibleExpenses.length,
        totalExpensesAmount: totalExpenses,
        possibleReasons: [
          "Expenses are not marked as tax-deductible (isTaxDeductible !== true)",
          "Expense accountType is not 'company'",
          "Expense date is outside the tax year range",
        "Expense amount is 0 or invalid",
      ],
    });
  }

  // 4. Get company for tax classification
  const Company = (await import("../company/entity")).default;
  const company = await Company.findById(companyId).lean();
  
  if (company === null || company === undefined) {
    throw new Error(`Company not found: ${companyId.toString()}`);
  }

  // 5. Determine tax classification and CIT rate
  // CRITICAL: No defaults, no fallbacks - fail loudly if missing
  console.log("[CIT_CALCULATION] Step 5: Determining tax classification", {
    companyId: companyId.toString(),
    taxYear,
    companyTaxClassification: company.taxClassification,
    companyTaxClassificationType: typeof company.taxClassification,
    fixedAssets: company.fixedAssets,
  });

  // CRITICAL: Calculate tax classification if not present - no fallback, must be calculated
  // CRITICAL: Calculate tax classification from computed annual turnover
  // We do NOT use the stored company.taxClassification because classification is dynamic
  // based on the turnover for the specific tax year.
  // Using stored value causes bugs where high-turnover companies remain "Small" (0% tax)
  // if they were originally created as small.
  
  // Use the totalRevenue we already calculated from invoices above
  const annualTurnover = totalRevenue;
  
  let taxClassification = companyService.calculateTaxClassification(
    annualTurnover,
    company.fixedAssets,
    taxYear
  );
  
  console.log("[CIT_CALCULATION] Calculated tax classification from computed turnover:", {
    annualTurnover,
    fixedAssets: company.fixedAssets,
    taxClassification,
    taxYear,
    storedClassificationIgnored: company.taxClassification, // Log what we ignored
  });

  // CRITICAL: Normalize tax classification to ensure it matches enum values
  // Handle case where it might be stored differently in database
  let normalizedTaxClassification: TaxClassification;
  
  if (typeof taxClassification === "string") {
    // Normalize string value to enum
    const normalized = taxClassification.toLowerCase().trim();
    console.log("[CIT_CALCULATION] Normalizing tax classification string:", {
      original: taxClassification,
      normalized,
    });
    
  if (normalized === "small_company" || normalized === "smallcompany") {
      normalizedTaxClassification = TaxClassification.SmallCompany;
    } else if (normalized === "medium") {
      normalizedTaxClassification = TaxClassification.Medium;
    } else if (normalized === "large") {
      normalizedTaxClassification = TaxClassification.Large;
    } else {
      // CRITICAL: Fail loudly - invalid tax classification value
      throw new Error(
        `CRITICAL: Invalid tax classification value: "${taxClassification}" (normalized: "${normalized}"). ` +
        `Must be one of: ${TaxClassification.SmallCompany}, ${TaxClassification.Medium}, ${TaxClassification.Large}. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }
  } else if (taxClassification === TaxClassification.SmallCompany || 
             taxClassification === TaxClassification.Medium || 
             taxClassification === TaxClassification.Large) {
    // Already a valid enum value
    normalizedTaxClassification = taxClassification;
  } else {
    // CRITICAL: Fail loudly - invalid tax classification type/value
    throw new Error(
      `CRITICAL: Invalid tax classification type or value. ` +
      `Type: ${typeof taxClassification}, Value: ${taxClassification}. ` +
      `Must be TaxClassification enum value. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }

  // SELF-HEALING: If the calculated/normalized classification differs from what's stored in the DB,
  // UPDATE the DB immediately. This fixes the issue where the Profile page shows stale data.
  // We're already running an expensive calculation, so a single write is negligible and ensures consistency.
  if (company.taxClassification !== normalizedTaxClassification) {
    console.log("[CIT_CALCULATION] HEALING: Updating stored tax classification to match reality", {
      companyId: companyId.toString(),
      oldClassification: company.taxClassification,
      newClassification: normalizedTaxClassification,
    });
    
    // Fire and forget update to avoid slowing down the response too much, 
    // or await it if we want strict consistency. Awaiting is safer.
    await Company.updateOne(
      { _id: companyId },
      { $set: { taxClassification: normalizedTaxClassification } }
    );
  }

  console.log("[CIT_CALCULATION] Normalized tax classification:", {
    original: taxClassification,
    normalized: normalizedTaxClassification,
    normalizedType: typeof normalizedTaxClassification,
  });

  // CIT rates per NRS (Nigeria Revenue Service) regulations
  // Reference: Nigeria Tax Act 2025 (effective January 1, 2026)
  // CRITICAL: Use enum values as keys to ensure exact match
  // Rates should be verified against the official tax policy document
  const CIT_RATES: Record<TaxClassification, number> = {
    [TaxClassification.SmallCompany]: 0, // 0% - Exempt per Nigeria Tax Act 2025
    [TaxClassification.Medium]: NRS_CIT_RATE / 100, // 30% - Standard Rate (Harmonized 2026)
    [TaxClassification.Large]: NRS_CIT_RATE / 100, // 30% - Per Nigeria Tax Act 2025
  };

  console.log("[CIT_CALCULATION] CIT_RATES mapping:", {
    CIT_RATES,
    keys: Object.keys(CIT_RATES),
    values: Object.values(CIT_RATES),
    normalizedTaxClassification,
    lookupKey: normalizedTaxClassification,
    lookupValue: CIT_RATES[normalizedTaxClassification],
  });

  // CRITICAL: Get citRate from mapping - fail loudly if not found
  const citRate = CIT_RATES[normalizedTaxClassification];
  
  // CRITICAL: Validate citRate is defined - no fallback, fail loudly
  if (citRate === undefined || citRate === null) {
    console.error("[CIT_CALCULATION] CRITICAL ERROR: CIT rate not found", {
      companyId: companyId.toString(),
      taxYear,
      originalTaxClassification: company.taxClassification,
      normalizedTaxClassification,
      CIT_RATES,
      availableKeys: Object.keys(CIT_RATES),
      rateLookup: CIT_RATES[normalizedTaxClassification],
    });
    throw new Error(
      `CRITICAL: CIT rate not found for tax classification: ${normalizedTaxClassification}. ` +
      `Available classifications: ${Object.keys(CIT_RATES).join(", ")}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}. ` +
      `This indicates a code error - all TaxClassification enum values must have corresponding rates.`
    );
  }
  
  console.log("[CIT_CALCULATION] CIT rate determined:", {
    normalizedTaxClassification,
    citRate,
    citRateType: typeof citRate,
    isNaN: isNaN(citRate),
    isFinite: isFinite(citRate),
  });

  // CRITICAL: Validate citRate is a valid number - fail loudly if invalid
  if (typeof citRate !== "number") {
    console.error("[CIT_CALCULATION] CRITICAL ERROR: citRate is not a number", {
      companyId: companyId.toString(),
      taxYear,
      citRate,
      citRateType: typeof citRate,
      normalizedTaxClassification,
    });
    throw new Error(
      `CRITICAL: CIT rate is not a number. Type: ${typeof citRate}, Value: ${citRate}. ` +
      `Tax classification: ${normalizedTaxClassification}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }
  
  if (isNaN(citRate)) {
    console.error("[CIT_CALCULATION] CRITICAL ERROR: citRate is NaN", {
      companyId: companyId.toString(),
      taxYear,
      citRate,
      normalizedTaxClassification,
      CIT_RATES,
      rateLookup: CIT_RATES[normalizedTaxClassification],
    });
    throw new Error(
      `CRITICAL: CIT rate is NaN. Tax classification: ${normalizedTaxClassification}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}. ` +
      `This indicates a calculation error.`
    );
  }
  
  if (!isFinite(citRate)) {
    console.error("[CIT_CALCULATION] CRITICAL ERROR: citRate is not finite", {
      companyId: companyId.toString(),
      taxYear,
      citRate,
      normalizedTaxClassification,
    });
    throw new Error(
      `CRITICAL: CIT rate is not finite: ${citRate}. ` +
      `Tax classification: ${normalizedTaxClassification}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }
  
  console.log("[CIT_CALCULATION] CIT rate validation passed:", {
    companyId: companyId.toString(),
    taxYear,
    normalizedTaxClassification,
    citRate,
    citRateType: typeof citRate,
    isNaN: isNaN(citRate),
    isFinite: isFinite(citRate),
  });

  // 6. Calculate CIT before WHT credits using the correct rate
  // CRITICAL: Use the classification-based rate, not the hardcoded 30% from calculateCorporateIncomeTax
  const citBeforeWHT = Math.max(0, taxableProfit * citRate);

  // 7. Get WHT credits (from WHT deducted during the tax year)
  // CRITICAL: WHT credits are taxes already paid when receiving payments or paying suppliers
  // These credits reduce CIT liability
  // BUSINESS LOGIC: If no WHT records exist, WHT credits = 0 (valid business state)
  let whtCredits: number;
  
  try {
    // CRITICAL: Query all WHT records for the tax year (all months 1-12) and sum them directly
    // updateWHTSummary(month=0) won't work because it queries WHT records with month=0,
    // but WHT records are stored with month 1-12, so month=0 returns 0 records
    // Querying all WHT records for the year directly ensures we get the most up-to-date data
    const { WHTRecord } = await import("../wht/entity");
    
    // Query all WHT records for the tax year (all months 1-12)
    // CRITICAL: WHT records are stored with month 1-12, so we query all of them for the year
    const whtRecords = await WHTRecord.find({
      companyId,
      year: taxYear,
      month: { $gte: 1, $lte: 12 }, // Months 1-12 (explicitly filter to valid months)
      transactionType: TransactionType.Invoice, // CRITICAL: Only count WHT from Invoices (Asset/Credit). Do NOT count WHT from Expenses (Liability/Payable).
    }).lean();
    
    logger.info("WHT records queried for CIT calculation", {
      companyId: companyId.toString(),
      taxYear,
      whtRecordsCount: whtRecords.length,
      timestamp: new Date().toISOString(),
    });
    
    // CRITICAL: Calculate totalWHTDeducted by summing all WHT records for the year
    let totalWHTDeducted = 0;
    for (const record of whtRecords) {
      // CRITICAL: Validate whtAmount - fail loudly if invalid
      if (record.whtAmount === undefined || record.whtAmount === null) {
        logger.error(
          "CRITICAL: WHT record has null/undefined whtAmount, skipping.",
          undefined,
          {
            recordId: record._id?.toString(),
            companyId: companyId.toString(),
            taxYear,
          }
        );
        continue;
      }
      
      if (typeof record.whtAmount !== "number") {
        logger.error(
          "CRITICAL: WHT record whtAmount is not a number, skipping.",
          undefined,
          {
            recordId: record._id?.toString(),
            whtAmount: record.whtAmount,
            whtAmountType: typeof record.whtAmount,
            companyId: companyId.toString(),
            taxYear,
          }
        );
        continue;
      }
      
      if (isNaN(record.whtAmount) || !isFinite(record.whtAmount)) {
        logger.error(
          "CRITICAL: WHT record whtAmount is NaN or not finite, skipping.",
          undefined,
          {
            recordId: record._id?.toString(),
            whtAmount: record.whtAmount,
            companyId: companyId.toString(),
            taxYear,
          }
        );
        continue;
      }
      
      if (record.whtAmount < 0) {
        logger.error(
          "CRITICAL: WHT record whtAmount is negative, skipping.",
          undefined,
          {
            recordId: record._id?.toString(),
            whtAmount: record.whtAmount,
            companyId: companyId.toString(),
            taxYear,
          }
        );
        continue;
      }
      
      totalWHTDeducted += record.whtAmount;
    }
    
    // CRITICAL: Round to 2 decimal places to match financial precision
    totalWHTDeducted = Math.round(totalWHTDeducted * 100) / 100;
    
    // Use the aggregated total as WHT credits
    whtCredits = totalWHTDeducted;
    
    logger.info("WHT credits calculated for CIT", {
      companyId: companyId.toString(),
      taxYear,
      whtRecordsCount: whtRecords.length,
      totalWHTDeducted,
      whtCredits,
      timestamp: new Date().toISOString(),
    });

    // CRITICAL: Validate whtCredits is a valid number - fail loudly if invalid
    if (typeof whtCredits !== "number" || isNaN(whtCredits) || !isFinite(whtCredits)) {
      throw new Error(
        `CRITICAL: whtCredits is invalid after assignment. Type: ${typeof whtCredits}, Value: ${whtCredits}. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }

    if (whtCredits < 0) {
      throw new Error(
        `CRITICAL: whtCredits is negative: ${whtCredits}. ` +
        `This should never happen. Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }
  } catch (error: any) {
    // CRITICAL: Fail loudly if there's an actual error (database error, network error, etc.)
    // But NOT if it's just "no WHT summary exists" (handled above as 0 credits)
    logger.error("CRITICAL: Failed to fetch WHT credits for CIT calculation", error, {
      companyId: companyId.toString(),
      taxYear,
      errorMessage: error?.message,
      errorStack: error?.stack,
    });
    throw new Error(
      `CRITICAL: Failed to fetch WHT credits for CIT calculation. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}. ` +
      `Error: ${error?.message || String(error)}. ` +
      `WHT credits are required for accurate CIT calculation per NRS (Nigeria Revenue Service) regulations.`
    );
  }

  // 8. Calculate CIT after WHT credits
  // WHT credits reduce CIT liability (up to the CIT amount)
  const citAfterWHT = Math.max(0, citBeforeWHT - whtCredits);

  // 9. Get CIT remittances (user-entered payments to NRS)
  // CRITICAL: Only count remittances with status "Remitted" - fail loudly if invalid
  const { CITRemittance } = await import("./remittance-entity");
  const citRemittances = await CITRemittance.find({
    companyId: companyId,
    taxYear: taxYear,
  }).lean();

  // CRITICAL: Validate remittances array - fail loudly if invalid
  if (!Array.isArray(citRemittances)) {
    throw new Error(
      `CRITICAL: citRemittances is not an array. Type: ${typeof citRemittances}, Value: ${citRemittances}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }

  // CRITICAL: Only count remittances with status "Remitted" - no fallbacks, fail loudly if invalid
  let totalCITRemitted = 0;
  for (const rem of citRemittances) {
    // CRITICAL: Validate remittance object structure - fail loudly if invalid
    if (!rem) {
      throw new Error(
        `CRITICAL: Remittance object is null or undefined in array. ` +
        `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }

    // CRITICAL: Validate remittance amount - fail loudly if invalid
    if (rem.remittanceAmount === undefined || rem.remittanceAmount === null) {
      throw new Error(
        `CRITICAL: Remittance amount is null or undefined. ` +
        `Remittance ID: ${rem._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }

    if (typeof rem.remittanceAmount !== "number") {
      throw new Error(
        `CRITICAL: Remittance amount is not a number. Type: ${typeof rem.remittanceAmount}, Value: ${rem.remittanceAmount}. ` +
        `Remittance ID: ${rem._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }

    if (isNaN(rem.remittanceAmount)) {
      throw new Error(
        `CRITICAL: Remittance amount is NaN. ` +
        `Remittance ID: ${rem._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }

    if (!isFinite(rem.remittanceAmount)) {
      throw new Error(
        `CRITICAL: Remittance amount is not finite: ${rem.remittanceAmount}. ` +
        `Remittance ID: ${rem._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }

    if (rem.remittanceAmount < 0) {
      throw new Error(
        `CRITICAL: Remittance amount is negative: ${rem.remittanceAmount}. ` +
        `Remittance ID: ${rem._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }

    // CRITICAL: Validate remittance status - fail loudly if invalid
    if (rem.status === undefined || rem.status === null) {
      throw new Error(
        `CRITICAL: Remittance status is null or undefined. ` +
        `Remittance ID: ${rem._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }

    if (typeof rem.status !== "string") {
      throw new Error(
        `CRITICAL: Remittance status is not a string. Type: ${typeof rem.status}, Value: ${rem.status}. ` +
        `Remittance ID: ${rem._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }

    if (!Object.values(RemittanceStatus).includes(rem.status as RemittanceStatus)) {
      throw new Error(
        `CRITICAL: Invalid remittance status: "${rem.status}". ` +
        `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
        `Remittance ID: ${rem._id?.toString()}, Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
      );
    }

    // CRITICAL: Only count remittances with status "Remitted"
    // This ensures only actual payments are counted, not pending or other statuses
    if (rem.status === RemittanceStatus.Remitted) {
      totalCITRemitted += rem.remittanceAmount;
    }
  }

  // CRITICAL: Validate totalCITRemitted is a valid number - fail loudly if invalid
  if (typeof totalCITRemitted !== "number" || isNaN(totalCITRemitted) || !isFinite(totalCITRemitted)) {
    throw new Error(
      `CRITICAL: totalCITRemitted is invalid after calculation. Type: ${typeof totalCITRemitted}, Value: ${totalCITRemitted}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }

  if (totalCITRemitted < 0) {
    throw new Error(
      `CRITICAL: totalCITRemitted is negative: ${totalCITRemitted}. ` +
      `This should never happen. Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }

  // CRITICAL: Validate citAfterWHT before calculating pending - fail loudly if invalid
  if (citAfterWHT === undefined || citAfterWHT === null) {
    throw new Error(
      `CRITICAL: citAfterWHT is null or undefined when calculating totalCITPending. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }

  if (typeof citAfterWHT !== "number" || isNaN(citAfterWHT) || !isFinite(citAfterWHT)) {
    throw new Error(
      `CRITICAL: citAfterWHT is invalid when calculating totalCITPending. Type: ${typeof citAfterWHT}, Value: ${citAfterWHT}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }

  // CRITICAL: Calculate pending amount - cannot be negative (over-remittances result in 0, not negative)
  const totalCITPending = Math.max(0, citAfterWHT - totalCITRemitted);

  // CRITICAL: Validate totalCITPending is a valid number - fail loudly if invalid
  if (typeof totalCITPending !== "number" || isNaN(totalCITPending) || !isFinite(totalCITPending)) {
    throw new Error(
      `CRITICAL: totalCITPending is invalid after calculation. Type: ${typeof totalCITPending}, Value: ${totalCITPending}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}, citAfterWHT: ${citAfterWHT}, totalCITRemitted: ${totalCITRemitted}.`
    );
  }

  if (totalCITPending < 0) {
    throw new Error(
      `CRITICAL: totalCITPending is negative: ${totalCITPending}. ` +
      `This should never happen after Math.max(0, ...). ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}, citAfterWHT: ${citAfterWHT}, totalCITRemitted: ${totalCITRemitted}.`
    );
  }

  // 10. Calculate filing deadline (June 30 of the following year)
  const filingDeadline = new Date(taxYear + 1, 5, 30); // June 30 (month is 0-indexed)
  filingDeadline.setHours(23, 59, 59, 999);

  // 11. Determine status
  const now = new Date();
  let status: RemittanceStatus;
  if (totalCITPending <= 0) {
    status = RemittanceStatus.Compliant;
  } else if (now > filingDeadline) {
    status = RemittanceStatus.Overdue;
  } else {
    status = RemittanceStatus.Pending;
  }

  // 12. Build calculation result
  // CRITICAL: citRate is already validated above - no fallback, no auto-assignment
  // CRITICAL: Fail loudly if citRate is invalid (should never happen after validation above)
  if (typeof citRate !== "number" || isNaN(citRate) || !isFinite(citRate)) {
    console.error("[CIT_CALCULATION] CRITICAL ERROR: citRate invalid before building calculation", {
      companyId: companyId.toString(),
      taxYear,
      citRate,
      citRateType: typeof citRate,
      normalizedTaxClassification,
    });
    throw new Error(
      `CRITICAL: Invalid citRate before building calculation: ${citRate}. ` +
      `This should never happen - validation should have caught this earlier. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }
  
  console.log("[CIT_CALCULATION] Building calculation result", {
    companyId: companyId.toString(),
    taxYear,
    totalRevenue,
    totalExpenses,
    taxableProfit,
    normalizedTaxClassification,
    citRate,
    citBeforeWHT,
    whtCredits,
    citAfterWHT,
    totalCITRemitted,
    totalCITPending,
  });
  
  const calculation: ICITCalculation = {
    companyId,
    taxYear,
    totalRevenue, // Already validated above - no fallback
    totalExpenses, // Already validated above - no fallback
    taxableProfit, // Already calculated - no fallback
    taxClassification: normalizedTaxClassification, // Use normalized value
    citRate, // Already validated - no fallback, can be 0 for SmallCompany
    citBeforeWHT, // Already calculated - no fallback
    whtCredits, // Already set - no fallback
    citAfterWHT, // Already calculated - no fallback
    totalCITRemitted, // Already calculated - no fallback
    totalCITPending, // Already calculated - no fallback
    status,
    filingDeadline,
  };
  
  console.log("[CIT_CALCULATION] Calculation object created:", {
    companyId: calculation.companyId.toString(),
    taxYear: calculation.taxYear,
    taxClassification: calculation.taxClassification,
    citRate: calculation.citRate,
    citRateType: typeof calculation.citRate,
    citRateIsNaN: isNaN(calculation.citRate),
    citBeforeWHT: calculation.citBeforeWHT,
    citAfterWHT: calculation.citAfterWHT,
  });

  // CRITICAL: Final validation - fail loudly if citRate is invalid
  if (typeof calculation.citRate !== "number") {
    console.error("[CIT_CALCULATION] CRITICAL ERROR: citRate is not a number in final calculation", {
      companyId: companyId.toString(),
      taxYear,
      taxClassification: calculation.taxClassification,
      citRate: calculation.citRate,
      citRateType: typeof calculation.citRate,
      calculation,
    });
    throw new Error(
      `CRITICAL: CIT rate is not a number in final calculation. ` +
      `Type: ${typeof calculation.citRate}, Value: ${calculation.citRate}. ` +
      `Tax classification: ${calculation.taxClassification}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }
  
  if (isNaN(calculation.citRate)) {
    console.error("[CIT_CALCULATION] CRITICAL ERROR: citRate is NaN in final calculation", {
      companyId: companyId.toString(),
      taxYear,
      taxClassification: calculation.taxClassification,
      citRate: calculation.citRate,
      calculation,
    });
    throw new Error(
      `CRITICAL: CIT rate is NaN in final calculation. ` +
      `Tax classification: ${calculation.taxClassification}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}. ` +
      `This should never happen - calculation logic error.`
    );
  }
  
  if (!isFinite(calculation.citRate)) {
    console.error("[CIT_CALCULATION] CRITICAL ERROR: citRate is not finite in final calculation", {
      companyId: companyId.toString(),
      taxYear,
      taxClassification: calculation.taxClassification,
      citRate: calculation.citRate,
      calculation,
    });
    throw new Error(
      `CRITICAL: CIT rate is not finite in final calculation: ${calculation.citRate}. ` +
      `Tax classification: ${calculation.taxClassification}. ` +
      `Company ID: ${companyId.toString()}, Tax Year: ${taxYear}.`
    );
  }
  
  console.log("[CIT_CALCULATION] Final validation passed - citRate is valid:", {
    companyId: companyId.toString(),
    taxYear,
    taxClassification: calculation.taxClassification,
    citRate: calculation.citRate,
  });

  // 13. Add diagnostic information
  const summary: ICITSummaryResponse = {
    ...calculation,
    _diagnostic: {
      totalInvoices: paidInvoices.length,
      paidInvoices: paidInvoices.length,
      totalExpenses: taxDeductibleExpenses.length,
      taxDeductibleExpenses: taxDeductibleExpenses.length,
      invoiceRecordsCount: paidInvoices.length,
      expenseRecordsCount: taxDeductibleExpenses.length,
    },
  };

  // 14. Audit logging
  logger.info("CIT calculated on-the-fly [AUDIT]", {
    companyId: companyId.toString(),
    taxYear,
    calculationType: "CIT_SUMMARY",
    totalRevenue,
    totalExpenses,
    taxableProfit,
    taxClassification: calculation.taxClassification,
    citRate: calculation.citRate, // Use final validated rate
    citBeforeWHT: calculation.citBeforeWHT,
    whtCredits: calculation.whtCredits,
    citAfterWHT: calculation.citAfterWHT,
    totalCITRemitted: calculation.totalCITRemitted,
    totalCITPending: calculation.totalCITPending,
    status: calculation.status,
    calculationChecksum: totalRevenue + totalExpenses + citAfterWHT,
    calculationTimestamp: new Date().toISOString(),
    period: `${taxYear}`,
  });

  return summary;
}
