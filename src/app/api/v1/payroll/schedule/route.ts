import { payrollService } from "@/lib/server/payroll/service";
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
        { message: "error", description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only company and business accounts can access payroll schedule
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to access payroll schedule", {
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

    const url = new URL(request.url);
    const entityIdParam = accountType === AccountType.Company
      ? url.searchParams.get("companyId")
      : url.searchParams.get("businessId");

    // CRITICAL: Validate entityId is provided
    if (!entityIdParam) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { message: MessageResponse.Error, description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required. Please provide ${paramName} in the query parameters.`, data: null },
        { status: 400 }
      );
    }

    // CRITICAL: Validate entityId format
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
        logger.warn("User attempted to access company payroll schedules without permission", {
          userId: auth.context.userId.toString(),
          companyId: entityId.toString(),
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this company.", data: null },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, entityId);
      if (!isOwner) {
        logger.warn("User attempted to access business payroll schedules without permission", {
          userId: auth.context.userId.toString(),
          businessId: entityId.toString(),
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this business.", data: null },
          { status: 403 }
        );
      }
    }

    // Parse pagination parameters
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");

    // CRITICAL: Validate pagination parameters
    let page: number;
    if (pageParam) {
      const pageNum = parseInt(pageParam);
      if (isNaN(pageNum) || pageNum < 1) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid page parameter. Page must be a positive integer.", data: null },
          { status: 400 }
        );
      }
      page = pageNum;
    } else {
      page = 1;
    }

    let limit: number;
    if (limitParam) {
      const limitNum = parseInt(limitParam);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid limit parameter. Limit must be between 1 and 100.", data: null },
          { status: 400 }
        );
      }
      limit = limitNum;
    } else {
      limit = 10;
    }

    // Parse filter parameters
    const statusParam = url.searchParams.get("status");
    let status: string | undefined = undefined;
    if (statusParam) {
      // CRITICAL: Validate status is one of the allowed values
      const allowedStatuses = ["all", "draft", "approved", "submitted"];
      if (!allowedStatuses.includes(statusParam)) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: `Invalid status parameter. Allowed values: ${allowedStatuses.join(", ")}.`, data: null },
          { status: 400 }
        );
      }
      if (statusParam !== "all") {
        status = statusParam;
      }
    }

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

    // CRITICAL: Validate month if provided - must be 1-12
    let month: number | undefined = undefined;
    const monthParam = url.searchParams.get("month");
    if (monthParam) {
      const monthNum = parseInt(monthParam);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid month parameter. Month must be between 1 and 12.", data: null },
          { status: 400 }
        );
      }
      month = monthNum;
    }

    logger.info("Fetching payroll schedules", {
      entityId: entityId.toString(),
      accountType,
      page,
      limit,
      status,
      year,
      month,
    });

    try {
      const result = await payrollService.getCompanyPayrollSchedules(
        entityId,
        {
          status,
          year,
          month,
          page,
          limit,
        },
        accountType
      );

      return NextResponse.json({
        message: MessageResponse.Success,
        description: "Payroll schedules retrieved successfully",
        data: {
          schedules: result.schedules,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            pages: result.pages,
          },
        },
      });
    } catch (error: any) {
      logger.error("Error fetching payroll schedules", error, {
        entityId: entityId.toString(),
        accountType,
        page,
        limit,
        status,
        year,
        month,
      });
      
      // CRITICAL: Fail loudly - return the error message from the service
      const errorMessage = error instanceof Error ? error.message : "An error occurred while fetching payroll schedules";
      return NextResponse.json(
        { message: MessageResponse.Error, description: errorMessage, data: null },
        { status: 500 }
      );
    }
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Unexpected error in payroll schedule route", err, {
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





