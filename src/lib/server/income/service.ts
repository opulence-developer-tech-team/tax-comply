import { Types } from "mongoose";
import Income from "./entity";
import { IIncome, IIncomeCreate, IIncomeUpdate } from "./interface";
import { logger } from "../utils/logger";
import { AccountType } from "../utils/enum";
import { SortOrder } from "../utils/sort-order";
import { IncomeSortField } from "../../utils/client-enums";

class IncomeService {
  async createIncome(incomeData: IIncomeCreate): Promise<IIncome> {
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (incomeData.taxYear < 2026) {
      throw new Error("Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.");
    }

    const income = new Income({
      accountId: new Types.ObjectId(incomeData.accountId),
      entityType: incomeData.entityType,
      taxYear: incomeData.taxYear,
      month: incomeData.month ?? null, // null for yearly income, 1-12 for monthly
      annualIncome: incomeData.annualIncome,
    });

    await income.save();

    // PIT summary update removed (Calculated on-the-fly)

    return income;
  }

  async updateIncome(
    accountId: string,
    entityType: AccountType,
    taxYear: number,
    month: number | null | undefined,
    updateData: IIncomeUpdate
  ): Promise<IIncome | null> {
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (taxYear < 2026) {
      throw new Error("Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.");
    }

    const monthValue = month ?? null;
    const query: any = {
      accountId: new Types.ObjectId(accountId),
      entityType,
      taxYear,
    };

    // Handle null month properly for Mongoose strict mode
    if (monthValue === null) {
      query.month = { $in: [null] };
    } else {
      query.month = monthValue;
    }

    const income = await Income.findOneAndUpdate(
      query,
      {
        annualIncome: updateData.annualIncome,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    // PIT summary update removed (Calculated on-the-fly)

    return income;
  }

  async getIncome(
    accountId: string,
    entityType: AccountType,
    taxYear: number,
    month?: number | null
  ): Promise<IIncome | null> {
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (taxYear < 2026) {
      throw new Error("Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.");
    }

    const monthValue = month ?? null;
    const query: any = {
      accountId: new Types.ObjectId(accountId),
      entityType,
      taxYear,
    };

    // Handle null month properly for Mongoose strict mode
    if (monthValue === null) {
      query.month = { $in: [null] };
    } else {
      query.month = monthValue;
    }

    const income = await Income.findOne(query);

    return income;
  }

  async getIncomesByAccount(
    accountId: string,
    entityType: AccountType
  ): Promise<IIncome[]> {
    const incomes = await Income.find({
      accountId: new Types.ObjectId(accountId),
      entityType,
    }).sort({ taxYear: -1 }); // Most recent first

    return incomes;
  }

  async getIncomesByAccountAndYear(
    accountId: string,
    entityType: AccountType,
    taxYear: number
  ): Promise<IIncome[]> {
    // CRITICAL: Database-level filtering for performance
    const incomes = await Income.find({
      accountId: new Types.ObjectId(accountId),
      entityType,
      taxYear,
    }).sort({ month: 1 });
    
    return incomes;
  }

  /**
   * Get incomes by account with server-side filtering, pagination, and search
   * CRITICAL: Highly optimized database queries with proper indexing
   * 
   * @param accountId - The account ID
   * @param entityType - "individual" or "company"
   * @param filters - Filter options including pagination, search, year, month
   * @returns Object with incomes array and total count
   */
  async getIncomesByAccountWithFilters(
    accountId: string,
    entityType: AccountType,
    filters?: {
      year?: number;
      month?: number | null;
      search?: string;
      limit?: number;
      skip?: number;
      sortField?: IncomeSortField;
      sortOrder?: SortOrder;
    }
  ): Promise<{ incomes: IIncome[]; total: number }> {
    // Year filter - CRITICAL: Default to current year if not specified (but enforce minimum 2026)
    // This ensures we only fetch current year data by default for performance
    // If year is explicitly null, don't filter by year (show all years)
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    const currentYear = new Date().getFullYear();
    const minTaxYear = 2026;
    const validCurrentYear = Math.max(minTaxYear, currentYear);
    const yearToFilter = filters?.year !== undefined ? filters.year : validCurrentYear;
    
    // CRITICAL: Validate year if provided - must be >= 2026
    if (yearToFilter !== null && yearToFilter < 2026) {
      throw new Error("Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.");
    }
    
    // Month filter - optional, can filter by specific month
    // Handle null month properly for Mongoose strict mode
    const monthFilter: any = {};
    if (filters?.month !== undefined && filters.month !== null) {
      monthFilter.month = filters.month;
    }

    // Build query conditions array for $and
    const queryConditions: any[] = [];

    // Always include accountId and entityType
    queryConditions.push({
      accountId: new Types.ObjectId(accountId),
      entityType,
    });

    // Year filter - only apply if year is not null (null = all years)
    if (yearToFilter !== null) {
      queryConditions.push({ taxYear: yearToFilter });
    }

    // Month filter - if specified
    if (Object.keys(monthFilter).length > 0) {
      queryConditions.push(monthFilter);
    }

    // Server-side search: Search across annualIncome, taxYear
    // CRITICAL: Efficient search using MongoDB operators
    // Note: taxYear is a number field, so we can't use regex on it directly
    const searchConditions: any[] = [];
    if (filters?.search && filters.search.trim().length > 0) {
      const searchTerm = filters.search.trim();
      
      // Try to parse as number for annualIncome and taxYear search
      const searchNumber = parseFloat(searchTerm);
      const isNumeric = !isNaN(searchNumber) && isFinite(searchNumber);
      
      if (isNumeric) {
        // If search is numeric, search in annualIncome (exact match) and taxYear
        // Note: If searching by year, it will override the year filter
        searchConditions.push(
          { annualIncome: searchNumber },
          { taxYear: searchNumber }
        );
      } else {
        // CRITICAL: For text search, we can only search annualIncome using regex
        // taxYear is a number field - we can't use regex on numbers in MongoDB
        // Convert annualIncome to string for regex search using $expr with $toString
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Search in annualIncome by converting to string using $expr
        // This allows regex search on a number field
        searchConditions.push({
          $expr: {
            $regexMatch: {
              input: { $toString: "$annualIncome" },
              regex: escapedSearchTerm,
              options: "i"
            }
          }
        });
      }
      
      logger.info("Applying search filter for incomes", {
        accountId,
        searchTerm,
        isNumeric,
        searchNumber: isNumeric ? searchNumber : undefined,
      });
    }

    // Combine all conditions
    // CRITICAL: Search conditions are separate from year/month filters
    // For text searches, we only search annualIncome (not taxYear) to avoid regex on number field
    if (searchConditions.length > 0) {
      // Add search as $or condition - this searches within the filtered results
      queryConditions.push({ $or: searchConditions });
    }

    // Build final query
    // CRITICAL: Single query variable declaration - no duplicates
    // All conditions are combined with $and to ensure proper filtering
    const finalQuery: any = queryConditions.length === 1 
      ? queryConditions[0]
      : { $and: queryConditions };

    // Get total count before pagination (for pagination metadata)
    const total = await Income.countDocuments(finalQuery);

    // Build sort object
    const sortField = filters?.sortField || IncomeSortField.TaxYear;
    const sortOrder = filters?.sortOrder === SortOrder.Asc ? 1 : -1;
    const sort: any = {};
    
    switch (sortField) {
      case IncomeSortField.TaxYear:
        sort.taxYear = sortOrder;
        sort.month = -1; // Secondary sort by month (desc) when sorting by year
        break;
      case IncomeSortField.AnnualIncome:
        sort.annualIncome = sortOrder;
        sort.taxYear = -1; // Secondary sort by year (desc)
        break;
      case IncomeSortField.Month:
        sort.month = sortOrder;
        sort.taxYear = -1; // Secondary sort by year (desc)
        break;
      default:
        sort.taxYear = -1; // Default to newest year first
        sort.month = -1; // Then by month
    }

    // Apply pagination
    const skip = filters?.skip || 0;
    const limit = filters?.limit || 20; // Default to 20 items per page
    
    // CRITICAL: Use lean() for better performance (returns plain JS objects)
    // Use select() to only fetch needed fields for even better performance
    const incomes = await Income.find(finalQuery)
      .select("_id accountId entityType taxYear month annualIncome createdAt updatedAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    logger.info("Fetched incomes with filters", {
      accountId,
      entityType,
      year: yearToFilter,
      month: filters?.month ?? undefined,
      search: filters?.search ? "yes" : "no",
      total,
      returned: incomes.length,
      page: Math.floor(skip / limit) + 1,
      limit,
    });

    return {
      incomes: incomes as IIncome[],
      total,
    };
  }

  async deleteIncome(
    accountId: string,
    entityType: AccountType,
    taxYear: number,
    month?: number | null
  ): Promise<boolean> {
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (taxYear < 2026) {
      throw new Error("Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.");
    }

    const monthValue = month ?? null;
    const query: any = {
      accountId: new Types.ObjectId(accountId),
      entityType,
      taxYear,
    };

    // Handle null month properly for Mongoose strict mode
    if (monthValue === null) {
      query.month = { $in: [null] };
    } else {
      query.month = monthValue;
    }

    const result = await Income.deleteOne(query);

    // PIT summary update removed (Calculated on-the-fly)

    return result.deletedCount > 0;
  }

  async upsertIncome(incomeData: IIncomeCreate): Promise<IIncome> {
    try {
      // Build query filter - handle null month properly for Mongoose strict mode
      const monthValue = incomeData.month ?? null;
      const queryFilter: any = {
        accountId: new Types.ObjectId(incomeData.accountId),
        entityType: incomeData.entityType,
        taxYear: incomeData.taxYear,
      };

      // For null month (yearly income), use $in: [null] to properly handle null in strict mode
      if (monthValue === null) {
        queryFilter.month = { $in: [null] };
      } else {
        // For monthly income (1-12), match exact month value
        queryFilter.month = monthValue;
      }

      // Build update object
      const updateData: any = {
        accountId: new Types.ObjectId(incomeData.accountId),
        entityType: incomeData.entityType,
        taxYear: incomeData.taxYear,
        month: monthValue, // Always set month (null for yearly, 1-12 for monthly)
        annualIncome: incomeData.annualIncome,
      };

      const income = await Income.findOneAndUpdate(
        queryFilter,
        updateData,
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      if (!income) {
        throw new Error("Failed to create or update income record");
      }

    // PIT summary update removed (Calculated on-the-fly)

      return income;
    } catch (error: any) {
      logger.error("Error in upsertIncome:", error);
      console.error("Upsert income error details:", {
        error: error?.message,
        stack: error?.stack,
        code: error?.code,
        name: error?.name,
        incomeData,
      });
      throw error;
    }
  }
}

export const incomeService = new IncomeService();

