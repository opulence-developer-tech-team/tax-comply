import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { generateWHTRemittancePDF } from "@/lib/server/export/tax-filing-pdf";
import { logger } from "@/lib/server/utils/logger";
import { subscriptionService, SUBSCRIPTION_PRICING } from "@/lib/server/subscription/service";
import { SubscriptionPlan, AccountType } from "@/lib/server/utils/enum";

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
      return NextResponse.json(
        { message: "error", description: "Authentication required", data: null },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can generate tax filing documents
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to generate WHT remittance", {
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

    const url = new URL(request.url);
    const entityIdParam = accountType === AccountType.Company
      ? url.searchParams.get("companyId")
      : url.searchParams.get("businessId");
    const monthParam = url.searchParams.get("month");
    const yearParam = url.searchParams.get("year");

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

    // Verify user is the owner of this entity (company or business)
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

    // Check if user's subscription plan includes export feature
    // Subscriptions are user-based - authenticated user IS the company owner
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    // If plan doesn't include exports, we add a watermark instead of blocking
    const isWatermarked = !planFeatures?.exports;

    // Validate month and year parameters
    if (!monthParam || !yearParam) {
      return NextResponse.json(
        { message: "error", description: "Month and year are required", data: null },
        { status: 400 }
      );
    }

    const month = parseInt(monthParam);
    const year = parseInt(yearParam);

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { message: "error", description: "Invalid month. Must be between 1 and 12", data: null },
        { status: 400 }
      );
    }

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
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

    // Generate PDF
    logger.info("Generating WHT remittance PDF", {
      entityId: entityId.toString(),
      accountType,
      month,
      year,
      userId: auth.context.userId.toString(),
    });

    const pdfBuffer = await generateWHTRemittancePDF(entityId, month, year, accountType, isWatermarked);

    // Generate filename
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[month - 1];
    const filename = `WHT-Remittance-${monthName}-${year}.pdf`;

    // Return PDF as response
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    logger.error("Error generating WHT remittance PDF", error, {
      errorMessage: error?.message,
      errorStack: error?.stack,
    });

    return NextResponse.json(
      { 
        message: "error", 
        description: error?.message || "Failed to generate WHT remittance document",
        data: null,
      },
      { status: 500 }
    );
  }
}

export { handler as GET };




