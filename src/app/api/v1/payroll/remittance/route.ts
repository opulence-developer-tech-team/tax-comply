import { payrollService } from "@/lib/server/payroll/service";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { logger } from "@/lib/server/utils/logger";
import { AccountType, HttpMethod } from "@/lib/server/utils/enum";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { message: "error", description: "Authentication required", data: null },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can access payroll remittance
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to access payroll remittance", {
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
    const accountType = user.accountType as AccountType;

    // GET: Retrieve PAYE remittance records
    if (request.method === HttpMethod.GET) {
      const url = new URL(request.url);
      const entityIdParam = accountType === AccountType.Company
        ? url.searchParams.get("companyId")
        : url.searchParams.get("businessId");
      const month = url.searchParams.get("month");
      const year = url.searchParams.get("year");

      if (!entityIdParam) {
        const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
        return NextResponse.json(
          { message: "error", description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required. Please provide ${paramName}.`, data: null },
          { status: 400 }
        );
      }

      if (!Types.ObjectId.isValid(entityIdParam)) {
        return NextResponse.json(
          { message: "error", description: `Invalid ${accountType === AccountType.Company ? "company" : "business"} ID format`, data: null },
          { status: 400 }
        );
      }

      const entityId = new Types.ObjectId(entityIdParam);

      // SECURITY: Verify user is the owner of this entity (company or business)
      let isOwner = false;
      if (accountType === AccountType.Company) {
        isOwner = await requireOwner(auth.context.userId, entityId);
        if (!isOwner) {
          return NextResponse.json(
            { message: "error", description: "You don't have access to this company", data: null },
            { status: 403 }
          );
        }
      } else if (accountType === AccountType.Business) {
        isOwner = await requireBusinessOwner(auth.context.userId, entityId);
        if (!isOwner) {
          return NextResponse.json(
            { message: "error", description: "You don't have access to this business", data: null },
            { status: 403 }
          );
        }
      }

      // If month and year provided, get specific remittance
      if (month && year) {
        const remittanceMonth = parseInt(month, 10);
        const remittanceYear = parseInt(year, 10);

        if (isNaN(remittanceMonth) || remittanceMonth < 1 || remittanceMonth > 12) {
          return NextResponse.json(
            { message: "error", description: "Invalid month. Must be between 1 and 12", data: null },
            { status: 400 }
          );
        }

        // CRITICAL: This app only supports 2026+ tax laws per Nigeria Tax Act 2025
        if (isNaN(remittanceYear) || remittanceYear < 2026 || remittanceYear > 2100) {
          return NextResponse.json(
            { message: "error", description: "Invalid year. This application only supports tax years 2026 and later per Nigeria Tax Act 2025. Year must be between 2026 and 2100", data: null },
            { status: 400 }
          );
        }

        const remittance = await payrollService.getPAYERemittance(
          entityId,
          remittanceMonth,
          remittanceYear,
          accountType
        );

        if (!remittance) {
          return NextResponse.json(
            { message: "error", description: "PAYE remittance record not found", data: null },
            { status: 404 }
          );
        }

        return NextResponse.json({
          message: "success",
          description: "PAYE remittance retrieved successfully",
          data: remittance,
        });
      }

      // Get all remittances for the entity
      const remittances = await payrollService.getCompanyPAYERemittances(
        entityId,
        accountType,
        year ? parseInt(year, 10) : undefined
      );

      return NextResponse.json({
        message: "success",
        description: "PAYE remittances retrieved successfully",
        data: remittances,
      });
    }

    // PUT: Mark PAYE as remitted
    if (request.method === HttpMethod.PUT) {
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return NextResponse.json(
          { message: "error", description: "Invalid JSON in request body", data: null },
          { status: 400 }
        );
      }

      const entityIdParam = accountType === AccountType.Company ? body.companyId : body.businessId;
      const { month, year, remittanceReference, remittanceReceipt, notes } = body;

      if (!entityIdParam) {
        const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
        return NextResponse.json(
          { message: "error", description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required. Please provide ${paramName}.`, data: null },
          { status: 400 }
        );
      }

      if (!Types.ObjectId.isValid(entityIdParam)) {
        return NextResponse.json(
          { message: "error", description: `Invalid ${accountType === AccountType.Company ? "company" : "business"} ID format`, data: null },
          { status: 400 }
        );
      }

      const entityId = new Types.ObjectId(entityIdParam);

      // SECURITY: Verify user is the owner of this entity (company or business)
      let isOwner = false;
      if (accountType === AccountType.Company) {
        isOwner = await requireOwner(auth.context.userId, entityId);
      } else if (accountType === AccountType.Business) {
        isOwner = await requireBusinessOwner(auth.context.userId, entityId);
      }
      if (!isOwner) {
        const entityName = accountType === AccountType.Company ? "company" : "business";
        return NextResponse.json(
          { message: "error", description: `You don't have access to this ${entityName}`, data: null },
          { status: 403 }
        );
      }

      if (!month || typeof month !== "number" || month < 1 || month > 12) {
        return NextResponse.json(
          { message: "error", description: "Invalid month. Must be between 1 and 12", data: null },
          { status: 400 }
        );
      }

      // CRITICAL: This app only supports 2026+ tax laws per Nigeria Tax Act 2025
      if (!year || typeof year !== "number" || year < 2026 || year > 2100) {
        return NextResponse.json(
          { message: "error", description: "Invalid year. This application only supports tax years 2026 and later per Nigeria Tax Act 2025. Year must be between 2026 and 2100", data: null },
          { status: 400 }
        );
      }

      const remittanceDate = new Date();

      const remittance = await payrollService.markPAYERemitted(
        entityId,
        month,
        year,
        remittanceDate,
        accountType,
        remittanceReference,
        remittanceReceipt,
        notes
      );

      if (!remittance) {
        return NextResponse.json(
          { message: "error", description: "PAYE remittance record not found", data: null },
          { status: 404 }
        );
      }

      logger.info("PAYE remittance marked as remitted", {
        entityId: entityId.toString(),
        accountType,
        month,
        year,
        userId: auth.context.userId.toString(),
      });

      return NextResponse.json({
        message: "success",
        description: "PAYE remittance marked as remitted successfully",
        data: remittance,
      });
    }

    return NextResponse.json(
      { message: "error", description: "Method not allowed", data: null },
      { status: 405 }
    );
  } catch (error: any) {
    logger.error("Error in PAYE remittance route", error);
    return NextResponse.json(
      { message: "error", description: error.message || "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const PUT = handler;


