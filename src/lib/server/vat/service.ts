import { Types } from "mongoose";
import { VATSummary, VATRemittance } from "./entity";
import { IVATRecord, IVATSummary, IVATRemittance, ICreateVATRemittance, IUpdateVATRemittance } from "./interface";
import { logger } from "../utils/logger";
import { VATStatus } from "../utils/vat-status";
import { VATType } from "../utils/vat-type";
import { RemittanceStatus, InvoiceStatus, AccountType } from "../utils/enum";
// CRITICAL: Import 2026 thresholds
import { NRS_VAT_TURNOVER_THRESHOLD_2026 } from "../../constants/nrs-constants";

class VATService {
  /**
   * Calculate VAT summary on-the-fly from invoices and expenses
   * CRITICAL: This eliminates VATRecord duplication - calculates directly from source data
   * 
   * @param companyId - Entity ID (Company ID or Business ID - both use companyId field in invoices)
   * @param month - Month (1-12)
   * @param year - Year (2026+)
   * @param accountType - Account type (Company or Business) - used for expense queries
   * @returns Calculated VAT summary
   */
  async updateVATSummary(
    companyId: Types.ObjectId,
    month: number,
    year: number,
    accountType?: AccountType
  ): Promise<IVATSummary> {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (year < 2026 || year > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // CRITICAL: Validate month
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
    }

    // CRITICAL: Validate entityId (companyId parameter name, but can be companyId or businessId)
    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      throw new Error(`Invalid entityId. Must be a valid ObjectId.`);
    }

    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    logger.info("Calculating VAT summary on-the-fly from invoices and expenses", {
      entityId: companyId.toString(),
      accountType,
      month,
      year,
      timestamp: new Date().toISOString(),
    });

    // Calculate month date range
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // CRITICAL: Validate date range
    if (isNaN(monthStart.getTime()) || isNaN(monthEnd.getTime())) {
      throw new Error(
        `CRITICAL: Invalid date range calculated. month: ${month}, year: ${year}, ` +
        `monthStart: ${monthStart.toISOString()}, monthEnd: ${monthEnd.toISOString()}`
      );
    }

    // Dynamically import Invoice and Expense models
    const { default: Invoice } = await import("../invoice/entity");
    const { default: Expense } = await import("../expense/entity");

    // Calculate Output VAT from paid invoices (invoices where customer pays you VAT)
    // CRITICAL: Only include paid invoices that are NOT VAT exempted
    const outputVATInvoices = await Invoice.find({
      companyId,
      status: InvoiceStatus.Paid,
      issueDate: { $gte: monthStart, $lte: monthEnd },
      isVATExempted: { $ne: true }, // NOT exempted = VAT applies
    }).lean();

    const outputVAT = outputVATInvoices.reduce((sum, inv) => {
      const vatAmount = inv.vatAmount || 0;
      if (vatAmount < 0) {
        logger.warn("Invoice has negative VAT amount, using 0", {
          invoiceId: inv._id?.toString(),
          invoiceNumber: inv.invoiceNumber,
          vatAmount,
        });
        return sum;
      }
      return sum + vatAmount;
    }, 0);

    logger.info("Output VAT calculated from invoices", {
      companyId: companyId.toString(),
      month,
      year,
      invoiceCount: outputVATInvoices.length,
      outputVAT,
      invoices: outputVATInvoices.map(inv => ({
        invoiceId: inv._id?.toString(),
        invoiceNumber: inv.invoiceNumber,
        vatAmount: inv.vatAmount,
        isVATExempted: inv.isVATExempted,
      })),
      timestamp: new Date().toISOString(),
    });

    // Calculate Input VAT from expenses (expenses where you paid VAT)
    // CRITICAL: Only include company expenses that are tax-deductible and have VAT
    // For Company accounts: query by companyId
    // For Business accounts: query by accountId (since companyId is null for Business expenses)
    let inputVATExpenses: any[] = [];
    
    if (accountType === AccountType.Business) {
      // Business accounts: expenses use accountId field
      inputVATExpenses = await Expense.find({
        accountId: companyId,
        accountType: AccountType.Business,
        isTaxDeductible: true,
        date: { $gte: monthStart, $lte: monthEnd },
        vatAmount: { $gt: 0 }, // Only expenses with VAT
      }).lean();
    } else {
      // Company accounts: expenses use companyId field
      inputVATExpenses = await Expense.find({
        companyId,
        accountType: AccountType.Company,
        isTaxDeductible: true,
        date: { $gte: monthStart, $lte: monthEnd },
        vatAmount: { $gt: 0 }, // Only expenses with VAT
      }).lean();
    }

    const inputVAT = inputVATExpenses.reduce((sum, exp) => {
      const vatAmount = exp.vatAmount || 0;
      if (vatAmount < 0) {
        logger.warn("Expense has negative VAT amount, using 0", {
          expenseId: exp._id?.toString(),
          description: exp.description,
          vatAmount,
        });
        return sum;
      }
      return sum + vatAmount;
    }, 0);

    logger.info("Input VAT calculated from expenses", {
      companyId: companyId.toString(),
      month,
      year,
      accountType: accountType || "not provided",
      expenseCount: inputVATExpenses.length,
      inputVAT,
      expenses: inputVATExpenses.map(exp => ({
        expenseId: exp._id?.toString(),
        description: exp.description,
        vatAmount: exp.vatAmount,
        isTaxDeductible: exp.isTaxDeductible,
      })),
      timestamp: new Date().toISOString(),
    });

    // CRITICAL: VAT Exemption Logic (Act 2025)
    // Small Companies/Businesses (< ₦25M) are exempt from VAT registration.
    // Rule 1: If Exempt, they should not charge Output VAT.
    // Rule 2: If Exempt, they CANNOT claim Input VAT refunds (unless they voluntarily register).
    // Logic: If Turnonver < 25M AND OutputVAT == 0 => They are acting as Exempt. Force InputVAT to 0 for Net/Status calculation.
    
    // We calculate turnover for the FULL YEAR up to the current moment to determine status
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    
    // Unified Turnover Definition (Act 2025)
    // Both Company and Business (Sole Prop) now use Accrual Basis (Total Invoiced) for Threshold determination
    // This strictly aligns with "Gross Turnover" definition preventing evasion via non-collection.
    const turnoverQuery: any = {
      companyId, // Shared ID field for both Company and Business
      issueDate: { $gte: yearStart, $lte: yearEnd },
      status: { $in: [InvoiceStatus.Paid, InvoiceStatus.Pending] }
    };

    const annualInvoices = await Invoice.find(turnoverQuery).lean();

    // Calculate annual turnover (sum of subtotal - amounts exclusive of VAT)
    const annualTurnover = annualInvoices.reduce((sum, inv) => {
      const turnoverAmount = inv.subtotal !== undefined 
        ? inv.subtotal 
        : (inv.total || 0) - (inv.vatAmount || 0);
      return sum + turnoverAmount; 
    }, 0);

    const isVATExempt = annualTurnover < NRS_VAT_TURNOVER_THRESHOLD_2026;
    
    // Safety Adjustment for Small Companies:
    // If they are Exempt (<100M) AND have NOT charged Output VAT (Checking if they are voluntarily registered),
    // Then they cannot claim Input VAT. We strictly zero it out for the "Net" calculation to prevent misleading "Refundable" status.
    let effectiveInputVAT = inputVAT;
    if (isVATExempt && outputVAT === 0) {
      effectiveInputVAT = 0;
      logger.info("Small Company (Exempt) with 0 Output VAT - Suppressing Input VAT for Net Calculation (Cannot claim refund)", {
        companyId: companyId.toString(),
        turnover: annualTurnover,
        originalInputVAT: inputVAT
      });
    }

    // Calculate net VAT using effective input VAT
    const netVAT = outputVAT - effectiveInputVAT;
    let status = netVAT > 0 ? VATStatus.Payable : netVAT < 0 ? VATStatus.Refundable : VATStatus.Zero;
    
    // Explicit Override: If Exempt and 0 Net, status is "Exempt" (handled by Zero/frontend context, or custom enum if mapped)
    // We will stick to standard enums but the frontend will use isVATExempt flag to clarify.

    // Round to 2 decimal places
    const roundedInputVAT = Math.round(inputVAT * 100) / 100; // Store actual expenses VAT for record keeping
    const roundedOutputVAT = Math.round(outputVAT * 100) / 100;
    const roundedNetVAT = Math.round(netVAT * 100) / 100; // Net reflects compliance reality
    const roundedTurnover = Math.round(annualTurnover * 100) / 100;

    // DEBUG: Log calculated values
    logger.info("VAT summary calculated on-the-fly", {
      companyId: companyId.toString(),
      month,
      year,
      accountType: accountType || "not provided",
      inputVAT: roundedInputVAT,
      outputVAT: roundedOutputVAT,
      netVAT: roundedNetVAT,
      annualTurnover: roundedTurnover,
      isVATExempt,
      status,
      invoiceCount: outputVATInvoices.length,
      expenseCount: inputVATExpenses.length,
      timestamp: new Date().toISOString(),
    });

    // Build query filter based on accountType (companyId or businessId)
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    const queryFilter: any = {
      month,
      year,
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }

    // Build update object based on accountType
    const updateData: any = {
      inputVAT: roundedInputVAT,
      outputVAT: roundedOutputVAT,
      netVAT: roundedNetVAT,
      status,
      annualTurnover: roundedTurnover,
      isVATExempt,
    };
    if (accountType === AccountType.Company) {
      updateData.companyId = companyId;
      updateData.businessId = null;
    } else if (accountType === AccountType.Business) {
      updateData.businessId = companyId;
      updateData.companyId = null;
    }

    // Save summary to cache (materialized view for performance)
    const summary = await VATSummary.findOneAndUpdate(
      queryFilter,
      updateData,
      {
        upsert: true,
        new: true,
        lean: true,
      }
    );

    if (!summary) {
      throw new Error(
        `CRITICAL: Failed to save VAT summary. entityId: ${companyId.toString()}, accountType: ${accountType}, month: ${month}, year: ${year}`
      );
    }

    return summary as IVATSummary;
  }

  async getVATSummary(
    companyId: Types.ObjectId,
    month: number,
    year: number,
    accountType?: AccountType
  ): Promise<IVATSummary | null> {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (year < 2026 || year > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // CRITICAL: Validate month
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
    }

    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    logger.info("Getting VAT summary", {
      entityId: companyId.toString(),
      accountType,
      month,
      year,
      timestamp: new Date().toISOString(),
    });

    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    const queryFilter: any = {
      month,
      year,
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }

    let summary: IVATSummary | null = await VATSummary.findOne(queryFilter).lean();

    if (!summary) {
      logger.info("VAT summary not found in cache, calculating on-the-fly from invoices and expenses", {
        entityId: companyId.toString(),
        accountType,
        month,
        year,
        timestamp: new Date().toISOString(),
      });
      summary = await this.updateVATSummary(companyId, month, year, accountType);
    } else {
      logger.info("VAT summary found in cache", {
        entityId: companyId.toString(),
        accountType,
        month,
        year,
        inputVAT: summary.inputVAT,
        outputVAT: summary.outputVAT,
        netVAT: summary.netVAT,
        timestamp: new Date().toISOString(),
      });
    }

    return summary;
  }

  async getVATSummariesForYear(
    companyId: Types.ObjectId,
    year: number,
    accountType?: AccountType
  ): Promise<IVATSummary[]> {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (year < 2026 || year > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    const queryFilter: any = {
      year,
      month: { $gte: 1, $lte: 12 },
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }

    // Get cached summaries for all months
    const summaries = await VATSummary.find(queryFilter).sort({ month: 1 }).lean();

    // Calculate any missing months on-the-fly
    const existingMonths = new Set(summaries.map(s => s.month));
    const missingMonths: number[] = [];
    
    for (let m = 1; m <= 12; m++) {
      if (!existingMonths.has(m)) {
        missingMonths.push(m);
      }
    }

    if (missingMonths.length > 0) {
      logger.info("Calculating missing VAT summaries for year", {
        entityId: companyId.toString(),
        accountType,
        year,
        missingMonths,
        timestamp: new Date().toISOString(),
      });

      // Calculate missing months in parallel
      const missingSummaries = await Promise.all(
        missingMonths.map(month => this.updateVATSummary(companyId, month, year, accountType))
      );

      // Combine existing and calculated summaries
      return [...summaries, ...missingSummaries].sort((a, b) => a.month - b.month) as IVATSummary[];
    }

    return summaries as IVATSummary[];
  }

  /**
   * Get aggregated VAT summary for a year (sums all months)
   * This is optimized for server-side filtering when only year is provided
   */
  async getYearlyVATSummary(
    companyId: Types.ObjectId,
    year: number,
    accountType?: AccountType
  ): Promise<IVATSummary | null> {
    // CRITICAL: Validate tax year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (year < 2026 || year > 2100) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    logger.info("Getting yearly VAT summary", {
      entityId: companyId.toString(),
      accountType,
      year,
      timestamp: new Date().toISOString(),
    });

    // Get all monthly summaries for the year (calculates missing ones on-the-fly)
    const monthlySummaries = await this.getVATSummariesForYear(companyId, year, accountType);

    logger.info("Yearly VAT summary - monthly summaries found", {
      entityId: companyId.toString(),
      accountType,
      year,
      monthlySummariesCount: monthlySummaries.length,
      monthlySummaries: monthlySummaries.map(s => ({
        month: s.month,
        inputVAT: s.inputVAT,
        outputVAT: s.outputVAT,
        netVAT: s.netVAT,
      })),
      timestamp: new Date().toISOString(),
    });

    if (monthlySummaries.length === 0) {
      logger.info("No monthly summaries found for year", {
        entityId: companyId.toString(),
        accountType,
        year,
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    // Aggregate all months
    const aggregated = monthlySummaries.reduce(
      (acc, summary) => {
        acc.inputVAT += summary.inputVAT;
        acc.outputVAT += summary.outputVAT;
        acc.netVAT += summary.netVAT;
        return acc;
      },
      { inputVAT: 0, outputVAT: 0, netVAT: 0 }
    );

    // Round to 2 decimal places
    const inputVAT = Math.round(aggregated.inputVAT * 100) / 100;
    const outputVAT = Math.round(aggregated.outputVAT * 100) / 100;
    const netVAT = Math.round(aggregated.netVAT * 100) / 100;

    // Determine status based on net VAT
    const status = netVAT > 0 ? VATStatus.Payable : netVAT < 0 ? VATStatus.Refundable : VATStatus.Zero;

    logger.info("Yearly VAT summary calculated", {
      companyId: companyId.toString(),
      year,
      accountType: accountType || "not provided",
      inputVAT,
      outputVAT,
      netVAT,
      status,
      timestamp: new Date().toISOString(),
    });

    // Return aggregated summary (month is 0 to indicate yearly aggregation)
    return {
      companyId,
      month: 0, // 0 indicates yearly aggregation
      year,
      inputVAT,
      outputVAT,
      netVAT,
      status,
    } as IVATSummary;
  }

  /**
   * Get VAT records (virtual records generated on-the-fly from invoices and expenses)
   * CRITICAL: This eliminates VATRecord duplication - generates records directly from source data
   * 
   * @param companyId - Entity ID (Company ID or Business ID)
   * @param accountType - Account type (Company or Business) - used for expense queries
   * @param filters - Filter options
   * @returns Virtual VAT records and total count
   */
  async getVATRecords(
    companyId: Types.ObjectId,
    accountType: AccountType,
    filters?: {
      type?: VATType;
      month?: number;
      year?: number;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ records: IVATRecord[]; total: number }> {
    // CRITICAL: Validate account type
    const validAccountTypes = [AccountType.Company, AccountType.Business];
    if (!validAccountTypes.includes(accountType)) {
      throw new Error(
        `Invalid account type: ${accountType}. ` +
        `Must be ${AccountType.Company} or ${AccountType.Business}. ` +
        `Individual accounts do not have VAT records.`
      );
    }

    // CRITICAL: Validate tax year if provided - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (filters?.year !== undefined && (filters.year < 2026 || filters.year > 2100)) {
      throw new Error(`Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    logger.info("Generating VAT records on-the-fly from invoices and expenses", {
      companyId: companyId.toString(),
      accountType,
      filters,
      timestamp: new Date().toISOString(),
    });

    // Dynamically import Invoice and Expense models
    const { default: Invoice } = await import("../invoice/entity");
    const { default: Expense } = await import("../expense/entity");

    const virtualRecords: IVATRecord[] = [];

    // Generate Output VAT records from invoices
    if (!filters?.type || filters.type === VATType.Output) {
      const invoiceQuery: any = {
        companyId,
        status: InvoiceStatus.Paid,
        isVATExempted: { $ne: true }, // NOT exempted = VAT applies
      };

      // Apply date filters
      if (filters?.startDate || filters?.endDate) {
        invoiceQuery.issueDate = {};
        if (filters.startDate) {
          invoiceQuery.issueDate.$gte = filters.startDate;
        }
        if (filters.endDate) {
          invoiceQuery.issueDate.$lte = filters.endDate;
        }
      } else if (filters?.month && filters?.year) {
        // Use month/year filter if no date range provided
        const monthStart = new Date(filters.year, filters.month - 1, 1);
        const monthEnd = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);
        invoiceQuery.issueDate = { $gte: monthStart, $lte: monthEnd };
      } else if (filters?.year) {
        // Use year filter
        const yearStart = new Date(filters.year, 0, 1);
        const yearEnd = new Date(filters.year, 11, 31, 23, 59, 59, 999);
        invoiceQuery.issueDate = { $gte: yearStart, $lte: yearEnd };
      }

      const invoices = await Invoice.find(invoiceQuery).lean();

      for (const invoice of invoices) {
        if (invoice.vatAmount && invoice.vatAmount > 0 && invoice.issueDate && invoice._id) {
          const issueDate = new Date(invoice.issueDate);
          const month = issueDate.getMonth() + 1;
          const year = issueDate.getFullYear();

          // Apply month/year filter if provided
          if (filters?.month && month !== filters.month) continue;
          if (filters?.year && year !== filters.year) continue;

          virtualRecords.push({
            _id: invoice._id, // Use invoice ID as record ID for uniqueness
            companyId,
            invoiceId: invoice._id,
            type: VATType.Output,
            amount: invoice.vatAmount,
            description: `Output VAT from invoice ${invoice.invoiceNumber}`,
            transactionDate: issueDate,
            month,
            year,
          } as IVATRecord);
        }
      }
    }

    // Generate Input VAT records from expenses
    if (!filters?.type || filters.type === VATType.Input) {
      const expenseQuery: any = {
        isTaxDeductible: true,
        vatAmount: { $gt: 0 }, // Only expenses with VAT
      };

      // Apply account type specific query
      if (accountType === AccountType.Business) {
        expenseQuery.accountId = companyId;
        expenseQuery.accountType = AccountType.Business;
      } else {
        expenseQuery.companyId = companyId;
        expenseQuery.accountType = AccountType.Company;
      }

      // Apply date filters
    if (filters?.startDate || filters?.endDate) {
        expenseQuery.date = {};
      if (filters.startDate) {
          expenseQuery.date.$gte = filters.startDate;
        }
        if (filters.endDate) {
          expenseQuery.date.$lte = filters.endDate;
        }
      } else if (filters?.month && filters?.year) {
        // Use month/year filter if no date range provided
        const monthStart = new Date(filters.year, filters.month - 1, 1);
        const monthEnd = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);
        expenseQuery.date = { $gte: monthStart, $lte: monthEnd };
      } else if (filters?.year) {
        // Use year filter
        const yearStart = new Date(filters.year, 0, 1);
        const yearEnd = new Date(filters.year, 11, 31, 23, 59, 59, 999);
        expenseQuery.date = { $gte: yearStart, $lte: yearEnd };
      }

      const expenses = await Expense.find(expenseQuery).lean();

      for (const expense of expenses) {
        if (expense.vatAmount && expense.vatAmount > 0 && expense.date && expense._id) {
          const expenseDate = new Date(expense.date);
          const month = expenseDate.getMonth() + 1;
          const year = expenseDate.getFullYear();

          // Apply month/year filter if provided
          if (filters?.month && month !== filters.month) continue;
          if (filters?.year && year !== filters.year) continue;

          virtualRecords.push({
            _id: expense._id, // Use expense ID as record ID for uniqueness
            companyId,
            expenseId: expense._id,
            type: VATType.Input,
            amount: expense.vatAmount,
            description: `Input VAT from expense: ${expense.description}`,
            transactionDate: expenseDate,
            month,
            year,
          } as IVATRecord);
        }
      }
    }

    // Sort by transaction date (descending)
    virtualRecords.sort((a, b) => {
      const dateA = new Date(a.transactionDate).getTime();
      const dateB = new Date(b.transactionDate).getTime();
      return dateB - dateA;
    });

    const total = virtualRecords.length;

    // Apply pagination
    const skip = filters?.skip || 0;
    const limit = filters?.limit || 50;
    const paginatedRecords = virtualRecords.slice(skip, skip + limit);

    logger.info("VAT records generated on-the-fly", {
      companyId: companyId.toString(),
      accountType,
      total,
      returned: paginatedRecords.length,
      filters,
      outputRecords: paginatedRecords.filter(r => r.type === VATType.Output).length,
      inputRecords: paginatedRecords.filter(r => r.type === VATType.Input).length,
      timestamp: new Date().toISOString(),
    });

    return { records: paginatedRecords, total };
  }

  async getCurrentMonthVATSummary(companyId: Types.ObjectId, accountType?: AccountType): Promise<IVATSummary | null> {
    const now = new Date();
    return await this.getVATSummary(companyId, now.getMonth() + 1, now.getFullYear(), accountType);
  }

  // NOTE: findVATRecordByExpense and deleteVATRecordByExpense methods removed
  // VAT is now calculated on-the-fly from invoices/expenses, so these methods are no longer needed

  /**
   * Create a new VAT remittance record
   * 
   * CRITICAL: VAT remittances are monthly/quarterly, not annual like CIT.
   * Multiple remittances per month/year are allowed (user can make multiple payments).
   * 
   * @param data - VAT remittance data
   * @returns Created remittance record
   */
  async createVATRemittance(
    data: ICreateVATRemittance
  ): Promise<IVATRemittance> {
    // CRITICAL: Validate year - this app only supports 2026 and onward per Nigeria Tax Act 2025
    if (data.year < 2026 || data.year > 2100) {
      throw new Error(`Invalid year. This application only supports years 2026 and onward per Nigeria Tax Act 2025.`);
    }

    // CRITICAL: Validate month
    if (data.month < 1 || data.month > 12) {
      throw new Error(`Invalid month: ${data.month}. Month must be between 1 and 12.`);
    }

    // CRITICAL: Validate account type
    const validAccountTypes = [AccountType.Company, AccountType.Business];
    if (!validAccountTypes.includes(data.accountType as AccountType)) {
      throw new Error(
        `Invalid account type: ${data.accountType}. ` +
        `Must be ${AccountType.Company} or ${AccountType.Business}. ` +
        `Individual accounts do not have VAT remittances.`
      );
    }

    // CRITICAL: Validate entityId
    if (!data.entityId) {
      throw new Error("Entity ID is required");
    }
    if (!Types.ObjectId.isValid(data.entityId)) {
      throw new Error("Invalid entity ID format");
    }

    // CRITICAL: Validate required fields
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

    const entityId = new Types.ObjectId(data.entityId);
    const remittanceDate = data.remittanceDate instanceof Date 
      ? data.remittanceDate 
      : new Date(data.remittanceDate);

    // CRITICAL: Validate remittance date is within reasonable bounds
    // Allow dates from the start of the month/year up to 2 months after the month ends
    const monthStart = new Date(data.year, data.month - 1, 1); // First day of the month
    const maxDate = new Date(data.year, data.month, 21, 23, 59, 59); // 21st of following month (VAT deadline)
    
    // CRITICAL: Remittance date cannot be before the month starts
    if (remittanceDate < monthStart) {
      throw new Error(
        `Remittance date cannot be before the month starts. ` +
        `Month: ${data.month}/${data.year}, Date: ${remittanceDate.toISOString()}, Month start: ${monthStart.toISOString()}`
      );
    }
    
    // CRITICAL: Remittance date cannot be more than 2 months after the month ends
    // (This allows up to the VAT deadline + buffer)
    if (remittanceDate > maxDate) {
      throw new Error(
        `Remittance date cannot be after the VAT deadline. ` +
        `Month: ${data.month}/${data.year}, Date: ${remittanceDate.toISOString()}, Deadline: ${maxDate.toISOString()}`
      );
    }

    // CRITICAL: For user-entered remittance records, status should be "Remitted" by default
    // This is because if a user is manually entering a remittance record, it means they have
    // already made the payment to NRS. The status indicates the payment has been remitted.
    const remittanceStatus = RemittanceStatus.Remitted;

    // CRITICAL: Validate remittance status enum value - fail loudly if invalid
    if (remittanceStatus === undefined || remittanceStatus === null) {
      throw new Error(
        `CRITICAL: remittanceStatus is null or undefined. ` +
        `This should never happen. Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
      );
    }

    if (typeof remittanceStatus !== "string") {
      throw new Error(
        `CRITICAL: remittanceStatus must be a string. Received type: ${typeof remittanceStatus}, value: ${remittanceStatus}. ` +
        `Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
      );
    }

    if (!Object.values(RemittanceStatus).includes(remittanceStatus as RemittanceStatus)) {
      throw new Error(
        `CRITICAL: Invalid remittance status: ${remittanceStatus}. ` +
        `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
        `Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
      );
    }

    // CRITICAL: Set companyId or businessId based on account type
    const remittanceData: any = {
      month: data.month,
      year: data.year,
      remittanceAmount: data.remittanceAmount,
      remittanceDate,
      remittanceReference: data.remittanceReference.trim(),
      remittanceReceipt: data.remittanceReceipt?.trim(),
      status: remittanceStatus as RemittanceStatus,
    };

    if (data.accountType === AccountType.Company) {
      remittanceData.companyId = entityId;
      remittanceData.businessId = null;
    } else if (data.accountType === AccountType.Business) {
      remittanceData.businessId = entityId;
      remittanceData.companyId = null;
    } else {
      throw new Error(
        `CRITICAL: Cannot determine entity field for account type: ${data.accountType}. ` +
        `Must be ${AccountType.Company} or ${AccountType.Business}.`
      );
    }

    // Create remittance record
    const remittance = new VATRemittance(remittanceData);

    // CRITICAL: Validate the remittance object was created correctly
    if (!remittance) {
      throw new Error(
        `CRITICAL: Failed to create remittance object. ` +
        `Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
      );
    }

    if (remittance.status === undefined || remittance.status === null) {
      throw new Error(
        `CRITICAL: Remittance object created but status is null or undefined. ` +
        `Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
      );
    }

    if (!Object.values(RemittanceStatus).includes(remittance.status as RemittanceStatus)) {
      throw new Error(
        `CRITICAL: Remittance object created with invalid status: ${remittance.status}. ` +
        `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
        `Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
      );
    }

    try {
      const savedRemittance = await remittance.save();

      // CRITICAL: Validate saved remittance has valid status
      if (!savedRemittance) {
        throw new Error(
          `CRITICAL: Remittance save returned null or undefined. ` +
          `Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
        );
      }

      if (savedRemittance.status === undefined || savedRemittance.status === null) {
        throw new Error(
          `CRITICAL: Saved remittance status is null or undefined. ` +
          `Remittance ID: ${savedRemittance._id?.toString()}, Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
        );
      }

      if (!Object.values(RemittanceStatus).includes(savedRemittance.status as RemittanceStatus)) {
        throw new Error(
          `CRITICAL: Saved remittance has invalid status: ${savedRemittance.status}. ` +
          `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
          `Remittance ID: ${savedRemittance._id?.toString()}, Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
        );
      }
      
      const savedRemittanceObject = savedRemittance.toObject();

      // CRITICAL: Validate toObject() returned valid data
      if (!savedRemittanceObject) {
        throw new Error(
          `CRITICAL: Remittance toObject() returned null or undefined. ` +
          `Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
        );
      }

      if (savedRemittanceObject.status === undefined || savedRemittanceObject.status === null) {
        throw new Error(
          `CRITICAL: Saved remittance object status is null or undefined. ` +
          `Remittance ID: ${savedRemittanceObject._id?.toString()}, Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
        );
      }

      if (!Object.values(RemittanceStatus).includes(savedRemittanceObject.status as RemittanceStatus)) {
        throw new Error(
          `CRITICAL: Saved remittance object has invalid status: ${savedRemittanceObject.status}. ` +
          `Must be one of: ${Object.values(RemittanceStatus).join(", ")}. ` +
          `Remittance ID: ${savedRemittanceObject._id?.toString()}, Entity ID: ${entityId.toString()}, Month: ${data.month}, Year: ${data.year}.`
        );
      }

      logger.info("VAT remittance created", {
        entityId: entityId.toString(),
        accountType: data.accountType,
        month: data.month,
        year: data.year,
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
          `A VAT remittance with this reference already exists for this entity and month/year. ` +
          `Reference: ${data.remittanceReference}`
        );
      }
      throw error;
    }
  }

  /**
   * Get VAT remittances for an entity
   * 
   * @param entityId - Company ID or Business ID
   * @param accountType - Account type (Company or Business)
   * @param month - Month (optional - if not provided, returns all months)
   * @param year - Year (optional - if not provided, returns all years)
   * @returns Array of remittance records
   */
  async getVATRemittances(
    entityId: Types.ObjectId,
    accountType: AccountType,
    month?: number,
    year?: number
  ): Promise<IVATRemittance[]> {
    // CRITICAL: Validate entityId
    if (entityId === null || entityId === undefined) {
      throw new Error("Entity ID is required but is null or undefined");
    }

    // CRITICAL: Validate account type
    const validAccountTypes = [AccountType.Company, AccountType.Business];
    if (!validAccountTypes.includes(accountType)) {
      throw new Error(
        `Invalid account type: ${accountType}. ` +
        `Must be ${AccountType.Company} or ${AccountType.Business}. ` +
        `Individual accounts do not have VAT remittances.`
      );
    }

    const query: any = {};
    if (accountType === AccountType.Company) {
      query.companyId = entityId;
      query.businessId = null;
    } else {
      query.businessId = entityId;
      query.companyId = null;
    }

    if (month !== undefined && month !== null) {
      // CRITICAL: Validate month
      if (month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
      }
      query.month = month;
    }

    if (year !== undefined && year !== null) {
      // CRITICAL: Validate year - this app only supports 2026 and onward per Nigeria Tax Act 2025
      if (year < 2026 || year > 2100) {
        throw new Error(`Invalid year. This application only supports years 2026 and onward per Nigeria Tax Act 2025.`);
      }
      query.year = year;
    }

    const remittances = await VATRemittance.find(query)
      .sort({ year: -1, month: -1, remittanceDate: -1 })
      .lean();

    return remittances;
  }

  /**
   * Update an existing VAT remittance record
   * 
   * @param remittanceId - Remittance record ID
   * @param entityId - Entity ID (Company or Business ID for authorization)
   * @param accountType - Account type (Company or Business)
   * @param data - Update data
   * @returns Updated remittance record
   */
  async updateVATRemittance(
    remittanceId: string,
    entityId: Types.ObjectId,
    accountType: AccountType,
    data: IUpdateVATRemittance
  ): Promise<IVATRemittance> {
    // CRITICAL: Validate remittanceId
    if (!remittanceId || !Types.ObjectId.isValid(remittanceId)) {
      throw new Error("Invalid remittance ID format");
    }

    // CRITICAL: Validate entityId
    if (entityId === null || entityId === undefined) {
      throw new Error("Entity ID is required but is null or undefined");
    }

    // CRITICAL: Validate account type
    const validAccountTypes = [AccountType.Company, AccountType.Business];
    if (!validAccountTypes.includes(accountType)) {
      throw new Error(
        `Invalid account type: ${accountType}. ` +
        `Must be ${AccountType.Company} or ${AccountType.Business}.`
      );
    }

    // Find the remittance record
    const remittance = await VATRemittance.findById(remittanceId);
    if (!remittance) {
      throw new Error("VAT remittance record not found");
    }

    // CRITICAL: Verify ownership - remittance must belong to the entity
    if (accountType === AccountType.Company) {
      if (!remittance.companyId || !remittance.companyId.equals(entityId)) {
        throw new Error("Unauthorized: This remittance does not belong to the specified company");
      }
    } else {
      if (!remittance.businessId || !remittance.businessId.equals(entityId)) {
        throw new Error("Unauthorized: This remittance does not belong to the specified business");
      }
    }

    // Update fields
    const updateData: any = {};
    if (data.remittanceDate !== undefined) {
      const remittanceDate = data.remittanceDate instanceof Date 
        ? data.remittanceDate 
        : new Date(data.remittanceDate);
      
      // CRITICAL: Validate remittance date is within reasonable bounds
      const monthStart = new Date(remittance.year, remittance.month - 1, 1);
      const maxDate = new Date(remittance.year, remittance.month, 21, 23, 59, 59);
      
      if (remittanceDate < monthStart) {
        throw new Error(
          `Remittance date cannot be before the month starts. ` +
          `Month: ${remittance.month}/${remittance.year}, Date: ${remittanceDate.toISOString()}`
        );
      }
      
      if (remittanceDate > maxDate) {
        throw new Error(
          `Remittance date cannot be after the VAT deadline. ` +
          `Month: ${remittance.month}/${remittance.year}, Date: ${remittanceDate.toISOString()}`
        );
      }
      
      updateData.remittanceDate = remittanceDate;
    }

    if (data.remittanceAmount !== undefined) {
      if (typeof data.remittanceAmount !== "number" || isNaN(data.remittanceAmount) || !isFinite(data.remittanceAmount)) {
        throw new Error(`Invalid remittance amount: ${data.remittanceAmount}`);
      }
      if (data.remittanceAmount < 0) {
        throw new Error(`Remittance amount cannot be negative: ${data.remittanceAmount}`);
      }
      updateData.remittanceAmount = data.remittanceAmount;
    }

    if (data.remittanceReference !== undefined) {
      if (!data.remittanceReference || data.remittanceReference.trim() === "") {
        throw new Error("Remittance reference cannot be empty");
      }
      updateData.remittanceReference = data.remittanceReference.trim();
    }

    if (data.remittanceReceipt !== undefined) {
      updateData.remittanceReceipt = data.remittanceReceipt?.trim();
    }

    if (data.status !== undefined) {
      // CRITICAL: Validate status enum value
      if (!Object.values(RemittanceStatus).includes(data.status as RemittanceStatus)) {
        throw new Error(
          `Invalid remittance status: ${data.status}. ` +
          `Must be one of: ${Object.values(RemittanceStatus).join(", ")}.`
        );
      }
      updateData.status = data.status;
    }

    // Update the record
    const updatedRemittance = await VATRemittance.findByIdAndUpdate(
      remittanceId,
      { $set: updateData },
      { new: true, lean: true }
    );

    if (!updatedRemittance) {
      throw new Error("Failed to update VAT remittance record");
    }

    logger.info("VAT remittance updated", {
      remittanceId: updatedRemittance._id?.toString(),
      entityId: entityId.toString(),
      accountType,
      month: updatedRemittance.month,
      year: updatedRemittance.year,
    });

    return updatedRemittance;
  }

  /**
   * Delete a VAT remittance record
   * 
   * @param remittanceId - Remittance record ID
   * @param entityId - Entity ID (Company or Business ID for authorization)
   * @param accountType - Account type (Company or Business)
   * @returns True if deleted, false if not found
   */
  async deleteVATRemittance(
    remittanceId: string,
    entityId: Types.ObjectId,
    accountType: AccountType
  ): Promise<boolean> {
    // CRITICAL: Validate remittanceId
    if (!remittanceId || !Types.ObjectId.isValid(remittanceId)) {
      throw new Error("Invalid remittance ID format");
    }

    // CRITICAL: Validate entityId
    if (entityId === null || entityId === undefined) {
      throw new Error("Entity ID is required but is null or undefined");
    }

    // CRITICAL: Validate account type
    const validAccountTypes = [AccountType.Company, AccountType.Business];
    if (!validAccountTypes.includes(accountType)) {
      throw new Error(
        `Invalid account type: ${accountType}. ` +
        `Must be ${AccountType.Company} or ${AccountType.Business}.`
      );
    }

    // Find the remittance record
    const remittance = await VATRemittance.findById(remittanceId);
    if (!remittance) {
      return false;
    }

    // CRITICAL: Verify ownership - remittance must belong to the entity
    if (accountType === AccountType.Company) {
      if (!remittance.companyId || !remittance.companyId.equals(entityId)) {
        throw new Error("Unauthorized: This remittance does not belong to the specified company");
      }
    } else {
      if (!remittance.businessId || !remittance.businessId.equals(entityId)) {
        throw new Error("Unauthorized: This remittance does not belong to the specified business");
      }
    }

    // Delete the record
    const result = await VATRemittance.deleteOne({ _id: remittanceId });

    if (result.deletedCount > 0) {
      logger.info("VAT remittance deleted", {
        remittanceId,
        entityId: entityId.toString(),
        accountType,
        month: remittance.month,
        year: remittance.year,
      });
      return true;
    }

    return false;
  }
}

export const vatService = new VATService();









