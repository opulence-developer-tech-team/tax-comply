import { vatService } from "@/lib/server/vat/service";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { logger } from "@/lib/server/utils/logger";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { AccountType } from "@/lib/server/utils/enum";

async function handler(request: Request): Promise<NextResponse> {
  let entityId: string | null = null; // Can be companyId or businessId
  let month: number = 0;
  let year: number = 0;
  let accountType: AccountType | null = null;

  try {
    await connectDB();

    if (request.method !== "GET") {
      return NextResponse.json(
        { message: "error", description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only company and business accounts can access VAT summary
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to access VAT summary", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
    }

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("@/lib/server/user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { message: "error", description: "User account type not found", data: null },
        { status: 500 }
      );
    }
    accountType = user.accountType as AccountType;

    const userId = auth.context.userId;
    const url = new URL(request.url);
    
    // Accept both companyId and businessId query parameters based on account type
    if (accountType === AccountType.Company) {
      entityId = url.searchParams.get("companyId");
    } else if (accountType === AccountType.Business) {
      entityId = url.searchParams.get("businessId");
    } else {
      return NextResponse.json(
        { message: "error", description: "Invalid account type for VAT access", data: null },
        { status: 403 }
      );
    }
    
    // Month is optional - if not provided, return yearly aggregation
    const monthParam = url.searchParams.get("month");
    const yearParam = url.searchParams.get("year");
    
    const now = new Date();
    year = yearParam ? parseInt(yearParam) : now.getFullYear();
    // Only parse month if provided, otherwise leave as 0 (indicates yearly aggregation)
    month = monthParam ? parseInt(monthParam) : 0;

    if (!entityId) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { message: "error", description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required. Please provide ${paramName} in the query parameters.`, data: null },
        { status: 400 }
      );
    }

    // Validate entityId format BEFORE using it
    if (!Types.ObjectId.isValid(entityId)) {
      return NextResponse.json(
        { message: "error", description: `Invalid ${accountType === AccountType.Company ? "company" : "business"} ID format.`, data: null },
        { status: 400 }
      );
    }

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    // Validate year
    if (isNaN(year) || year < 2026 || year > 2100) {
      return NextResponse.json(
        { 
          message: "error", 
          description: `Invalid year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null 
        },
        { status: 400 }
      );
    }

    // Validate month if provided (0 indicates yearly aggregation, which is valid)
    if (month !== 0 && (isNaN(month) || month < 1 || month > 12)) {
      return NextResponse.json(
        { message: "error", description: "Invalid month. Must be between 1 and 12, or omit for yearly aggregation.", data: null },
        { status: 400 }
      );
    }

    // Verify user is the owner of this entity (company or business)
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(new Types.ObjectId(userId), new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { message: "error", description: "You don't have access to this company.", data: null },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(new Types.ObjectId(userId), new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { message: "error", description: "You don't have access to this business.", data: null },
          { status: 403 }
        );
      }
    }

    // DEBUG: Log request parameters
    logger.info("VAT summary API request", {
      entityId,
      accountType,
      month,
      year,
      isYearlyAggregation: month === 0,
      userId: userId.toString(),
      timestamp: new Date().toISOString(),
    });

    // VAT is now calculated on-the-fly from invoices/expenses
    // Pass accountType for proper expense querying (Business uses accountId, Company uses companyId)
    // If month is 0 (not provided), return yearly aggregation
    // Otherwise, return monthly summary
    const summary = month === 0
      ? await vatService.getYearlyVATSummary(
          new Types.ObjectId(entityId),
          year,
          accountType
        )
      : await vatService.getVATSummary(
          new Types.ObjectId(entityId),
          month,
          year,
          accountType
        );

    // DEBUG: Log summary result
    logger.info("VAT summary retrieved", {
      entityId,
      accountType,
      month,
      year,
      hasSummary: !!summary,
      summary: summary ? {
        inputVAT: summary.inputVAT,
        outputVAT: summary.outputVAT,
        netVAT: summary.netVAT,
        status: summary.status,
      } : null,
      timestamp: new Date().toISOString(),
    });

    // Handle null summary (no VAT data for this period)
    if (!summary) {
      logger.info("No VAT summary found for period", {
        entityId,
        accountType,
        month,
        year,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        message: "success",
        description: "No VAT data found for this period",
        data: null,
      });
    }

    // Get VAT records for diagnostic information (generated on-the-fly from invoices/expenses)
    const vatRecords = await vatService.getVATRecords(
      new Types.ObjectId(entityId),
      accountType, // CRITICAL: Pass accountType for proper expense querying
      month === 0 ? { year } : { month, year }
    );

    // DEBUG: Log VAT records details
    logger.info("VAT records retrieved for diagnostic", {
      entityId,
      accountType,
      month,
      year,
      totalRecords: vatRecords.total,
      recordsCount: vatRecords.records.length,
      inputVATRecords: vatRecords.records.filter(r => r.type === "input").length,
      outputVATRecords: vatRecords.records.filter(r => r.type === "output").length,
      recordsWithExpenses: vatRecords.records.filter(r => r.expenseId).length,
      recordsWithInvoices: vatRecords.records.filter(r => r.invoiceId).length,
      expenseVATRecords: vatRecords.records
        .filter(r => r.type === "input" && r.expenseId)
        .map(r => ({
          id: r._id?.toString(),
          expenseId: r.expenseId?.toString(),
          amount: r.amount,
          month: r.month,
          year: r.year,
          description: r.description,
        })),
      timestamp: new Date().toISOString(),
    });

    // Add diagnostic information to help users understand the calculation
    const diagnosticInfo = {
      totalVATRecords: vatRecords.total,
      outputVATRecords: vatRecords.records.filter(r => r.type === "output").length,
      inputVATRecords: vatRecords.records.filter(r => r.type === "input").length,
      recordsWithInvoices: vatRecords.records.filter(r => r.invoiceId).length,
      recordsWithExpenses: vatRecords.records.filter(r => r.expenseId).length,
      recordsWithoutInvoices: vatRecords.records.filter(r => !r.invoiceId && !r.expenseId).length,
    };

    // CRITICAL FIX: Convert Mongoose document to plain object
    // Mongoose documents have $__, $isNew, _doc properties that break JSON serialization
    // The actual data is in _doc or we can use toObject() if available
    let summaryPlain: any;
    if (summary && typeof summary === 'object') {
      // Check if it's a Mongoose document (has toObject method or _doc property)
      if ((summary as any).toObject && typeof (summary as any).toObject === 'function') {
        try {
          summaryPlain = (summary as any).toObject();
        } catch (e) {
          // If toObject fails, try _doc
          summaryPlain = (summary as any)._doc ? { ...(summary as any)._doc } : summary;
        }
      } else if ((summary as any)._doc) {
        // Extract from _doc if toObject is not available
        summaryPlain = { ...(summary as any)._doc };
      } else {
        // Already a plain object, but remove any Mongoose internal properties
        summaryPlain = { ...summary };
        delete (summaryPlain as any).$__;
        delete (summaryPlain as any).$isNew;
        delete (summaryPlain as any)._doc;
      }
    } else {
      summaryPlain = summary;
    }
    
    // Build the response data with plain object
    const responseData = {
      ...summaryPlain,
      _diagnostic: diagnosticInfo, // Include diagnostic info for debugging
    };

    const fullResponse = {
      message: "success",
      description: "VAT summary retrieved successfully",
      data: responseData,
    };

    // DEBUG: Log the exact response being sent to frontend
    logger.info("VAT summary API - Sending response to frontend", {
      entityId,
      accountType,
      month,
      year,
      responseStatus: 200,
      responseMessage: fullResponse.message,
      responseDescription: fullResponse.description,
      responseData: {
        month: responseData.month,
        year: responseData.year,
        inputVAT: responseData.inputVAT,
        outputVAT: responseData.outputVAT,
        netVAT: responseData.netVAT,
        status: responseData.status,
        diagnostic: responseData._diagnostic,
      },
      fullResponseJSON: JSON.stringify(fullResponse),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(fullResponse);
  } catch (error: any) {
    // Log the actual error for debugging
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching VAT summary", err, {
      entityId,
      accountType,
      month,
      year,
    });

    // Return detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === "development"
      ? error.message || "An error occurred while fetching VAT summary"
      : "An error occurred while fetching VAT summary. Please try again.";

    return NextResponse.json(
      { 
        message: "error", 
        description: errorMessage, 
        data: null 
      },
      { status: 500 }
    );
  }
}

export const GET = handler;





