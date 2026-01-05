import { citController } from "@/lib/server/cit/controller";
import { requireAuth } from "@/lib/server/middleware/auth";
import { requireAccountType } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, SubscriptionPlan, AccountType } from "@/lib/server/utils/enum";
import { subscriptionService } from "@/lib/server/subscription/service";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";

/**
 * GET /api/v1/cit/summary
 * Get CIT summary for a tax year
 * 
 * Query params:
 * - companyId: Company ID
 * - taxYear: Tax year (required)
 * 
 * Subscription: Requires citTracking feature (available on all plans)
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only company accounts can access CIT features
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      AccountType.Company
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);

    const companyId = searchParams.get("companyId");
    const taxYearParam = searchParams.get("taxYear");

    if (!companyId || !taxYearParam) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "companyId and taxYear are required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate companyId format
    if (!Types.ObjectId.isValid(companyId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid company ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate taxYear
    const taxYear = parseInt(taxYearParam);
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (isNaN(taxYear) || taxYear < 2026 || taxYear > 2100) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Check subscription plan for citTracking feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.citTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "CIT tracking is not available on your current plan. Please contact support.",
          data: {
            upgradeRequired: {
              feature: "CIT Tracking",
              currentPlan,
              requiredPlan: "free", // citTracking is available on all plans
              requiredPlanPrice: 0,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    // Get CIT summary
    const response = await citController.getCITSummary(
      userId,
      companyId,
      taxYear
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: "Failed to retrieve CIT summary",
        data: null,
      },
      { status: 500 }
    );
  }
}

