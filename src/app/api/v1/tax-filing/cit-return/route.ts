import { requireAuth, requireOwner, requireAccountType } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { generateCITReturnPDF } from "@/lib/server/export/tax-filing-pdf";
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
      return auth.response || NextResponse.json(
        { message: "error", description: "Authentication required", data: null },
        { status: 401 }
      );
    }

    // SECURITY: Only company accounts can generate tax filing documents
    const accountTypeCheck = await requireAccountType(auth.context.userId, AccountType.Company);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to generate CIT return", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
    }

    const url = new URL(request.url);
    const companyIdParam = url.searchParams.get("companyId");
    const yearParam = url.searchParams.get("year");

    if (!companyIdParam) {
      return NextResponse.json(
        { message: "error", description: "Company ID is required", data: null },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(companyIdParam)) {
      return NextResponse.json(
        { message: "error", description: "Invalid company ID format", data: null },
        { status: 400 }
      );
    }

    const companyId = new Types.ObjectId(companyIdParam);

    // Verify user is the owner of this company
    const isOwner = await requireOwner(auth.context.userId, companyId);
    if (!isOwner) {
      return NextResponse.json(
        { message: "error", description: "You don't have access to this company", data: null },
        { status: 403 }
      );
    }

    // Check if user's subscription plan includes export feature
    // Subscriptions are user-based - authenticated user IS the company owner
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    if (!planFeatures?.exports) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        { 
          message: "error", 
          description: "Tax filing document downloads are available on Starter plan (₦3,500/month) and above. Upgrade to download tax filing documents formatted per NRS (Nigeria Revenue Service) requirements.",
          data: {
            upgradeRequired: {
              feature: "Tax Filing Document Downloads",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation" as const,
            },
          },
        },
        { status: 403 }
      );
    }

    // Parse year
    const now = new Date();
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    // STRICT COMPLIANCE MODE: For testing/demo purposes, if year < 2026, default to 2026
    // This allows generating "future" returns without errors
    let validYear = year;
    if (year < 2026) {
      logger.warn(`Year ${year} is pre-2026. Defaulting to 2026 for Nigeria Tax Act 2025 compliance.`);
      validYear = 2026;
    }

    if (isNaN(validYear) || validYear > 2100) {
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
    const pdfBuffer = await generateCITReturnPDF(companyId, validYear);
    const filename = `CIT-Return-${validYear}.pdf`;

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
    logger.error("Error generating CIT return PDF", error);
    return NextResponse.json(
      { 
        message: "error", 
        description: error.message || "An error occurred while generating the CIT return document", 
        data: null 
      },
      { status: 500 }
    );
  }
}

export const GET = handler;


