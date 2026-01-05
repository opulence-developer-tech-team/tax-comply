import { invoiceController } from "@/lib/server/invoice/controller";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, AccountType } from "@/lib/server/utils/enum";
import { logger } from "@/lib/server/utils/logger";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "GET") {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only company and business accounts can access invoices
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to access invoices", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
    }

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("@/lib/server/user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "User account type not found", data: null },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    // Get entityId from query parameter (sent from client)
    const url = new URL(request.url);
    const entityIdParam = accountType === AccountType.Company
      ? url.searchParams.get("companyId")
      : url.searchParams.get("businessId");
    
    if (!entityIdParam) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { message: MessageResponse.Error, description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required. Please provide ${paramName} in the query parameters.`, data: null },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(entityIdParam)) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: `Invalid ${accountType === AccountType.Company ? "company" : "business"} ID format.`, data: null },
        { status: 400 }
      );
    }

    const entityId = new Types.ObjectId(entityIdParam);

    // SECURITY: Verify user is the owner of this entity (company or business)
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(auth.context.userId, entityId);
      if (!isOwner) {
        logger.warn("User attempted to access company without permission", {
          userId: auth.context.userId.toString(),
          companyId: entityId.toString(),
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have permission to access this company", data: null },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, entityId);
      if (!isOwner) {
        logger.warn("User attempted to access business without permission", {
          userId: auth.context.userId.toString(),
          businessId: entityId.toString(),
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have permission to access this business", data: null },
          { status: 403 }
        );
      }
    }

    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const status = url.searchParams.get("status") || undefined;
    
    // CRITICAL: Validate year if provided - this app only supports tax years 2026 and onward
    let year: number | undefined = undefined;
    const yearParam = url.searchParams.get("year");
    if (yearParam) {
      const yearNum = parseInt(yearParam);
      if (isNaN(yearNum) || yearNum < 2026) {
        return NextResponse.json(
          { 
            message: MessageResponse.Error, 
            description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.", 
            data: null 
          },
          { status: 400 }
        );
      }
      year = yearNum;
    }
    
    const month = url.searchParams.get("month") ? parseInt(url.searchParams.get("month")!) : undefined;
    const search = url.searchParams.get("search")?.trim() || undefined;

    // Pass year and month directly to service - it will use MongoDB's $year/$month operators
    // This is more reliable than date ranges because it extracts the year/month from the stored date
    // regardless of timezone or time components

    logger.info("Fetching invoices", {
      entityId: entityId.toString(),
      accountType,
      page,
      limit,
      status,
      year,
      month,
      hasSearch: !!search,
      searchLength: search?.length || 0,
    });

    const result = await invoiceController.getCompanyInvoices(
      entityId,
      {
        status: status as any,
        page,
        limit,
        year,
        month,
        search,
      }
    );

    // Clone the response to log without consuming the body
    if (result.status === 200) {
      const clonedResponse = result.clone();
      clonedResponse.json().then((resultJson: any) => {
        logger.info("Invoices fetched successfully", {
          entityId: entityId.toString(),
          accountType,
          invoiceCount: resultJson?.data?.invoices?.length || 0,
          total: resultJson?.data?.pagination?.total || 0,
        });
      }).catch(() => {
        // Ignore errors in logging
      });
    }

    return result;
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Unexpected error in invoices route", err, {
      error: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { message: MessageResponse.Error, description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;





