import { requireAuth, requireAccountType } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { generatePITReturnPDF } from "@/lib/server/export/tax-filing-pdf";
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

    // SECURITY: Only individual and business accounts (sole proprietorships) can generate PIT return documents
    // Business accounts use PIT, NOT CIT (Company Income Tax)
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Individual, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Company account attempted to generate PIT return", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
    }

    const url = new URL(request.url);
    const accountIdParam = url.searchParams.get("accountId");
    const yearParam = url.searchParams.get("year");

    if (!accountIdParam) {
      return NextResponse.json(
        { message: "error", description: "Account ID is required", data: null },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(accountIdParam)) {
      return NextResponse.json(
        { message: "error", description: "Invalid account ID format", data: null },
        { status: 400 }
      );
    }

    const accountId = new Types.ObjectId(accountIdParam);

    // Verify accountId matches userId (individual accounts can only access their own data)
    if (accountId.toString() !== auth.context.userId.toString()) {
      return NextResponse.json(
        { message: "error", description: "You can only generate PIT returns for your own account", data: null },
        { status: 403 }
      );
    }

    // Check if user's subscription plan includes PIT return feature
    // Subscriptions are user-based
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    if (!planFeatures?.pitReturns) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        { 
          message: "error", 
          description: "PIT return document downloads are available on Starter plan (₦3,500/month) and above. Upgrade to download PIT return documents formatted per NRS (Nigeria Revenue Service) requirements.",
          data: {
            upgradeRequired: {
              feature: "PIT Return Document Downloads",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    // Validate year parameter
    if (!yearParam) {
      return NextResponse.json(
        { message: "error", description: "Tax year is required", data: null },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam);

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (isNaN(year) || year < 2026 || year > 2100) {
      return NextResponse.json(
        { 
          message: "error", 
          description: `Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null 
        },
        { status: 400 }
      );
    }

    // Generate PDF
    logger.info("Generating PIT return PDF", {
      accountId: accountId.toString(),
      taxYear: year,
      userId: auth.context.userId.toString(),
    });

    const pdfBuffer = await generatePITReturnPDF(accountId, year);

    // Generate filename
    const filename = `PIT-Return-${year}.pdf`;

    // Return PDF as response
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    logger.error("Error generating PIT return PDF", error, {
      errorMessage: error?.message,
      errorStack: error?.stack,
    });

    return NextResponse.json(
      { 
        message: "error", 
        description: error?.message || "Failed to generate PIT return document",
        data: null,
      },
      { status: 500 }
    );
  }
}

export { handler as GET };




