import { complianceService } from "@/lib/server/compliance/service";
import { requireAuth, requireOwner, requireBusinessOwner, requireAccountType } from "@/lib/server/middleware/auth";
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

    // SECURITY: Only company and business accounts can access compliance dashboard
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Invalid account type attempted to access compliance dashboard", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
    }

    // Get companyId or businessId from query parameter (sent from client)
    const url = new URL(request.url);
    const companyIdParam = url.searchParams.get("companyId");
    const businessIdParam = url.searchParams.get("businessId");
    
    // Must provide either companyId or businessId, but not both
    if (!companyIdParam && !businessIdParam) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Company ID or Business ID is required. Please provide companyId or businessId in the query parameters.", data: null },
        { status: 400 }
      );
    }

    if (companyIdParam && businessIdParam) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Please provide either companyId or businessId, not both.", data: null },
        { status: 400 }
      );
    }

    let dashboard;
    if (companyIdParam) {
      if (!Types.ObjectId.isValid(companyIdParam)) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid company ID format.", data: null },
          { status: 400 }
        );
      }

      const companyId = new Types.ObjectId(companyIdParam);

      // SECURITY: Verify user is the owner of this company
      const isOwner = await requireOwner(auth.context.userId, companyId);
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this company.", data: null },
          { status: 403 }
        );
      }

      // Pass userId to service - authenticated user IS the company owner
      dashboard = await complianceService.getComplianceDashboard(companyId, auth.context.userId);
    } else if (businessIdParam) {
      if (!Types.ObjectId.isValid(businessIdParam)) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid business ID format.", data: null },
          { status: 400 }
        );
      }

      const businessId = new Types.ObjectId(businessIdParam);

      // SECURITY: Verify user is the owner of this business
      const isOwner = await requireBusinessOwner(auth.context.userId, businessId);
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this business.", data: null },
          { status: 403 }
        );
      }

      // Pass userId to service - authenticated user IS the business owner
      dashboard = await complianceService.getComplianceDashboardForBusiness(businessId, auth.context.userId);
    }

    return NextResponse.json({
      message: MessageResponse.Success,
      description: "Compliance dashboard retrieved successfully",
      data: dashboard,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: "error", description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;





