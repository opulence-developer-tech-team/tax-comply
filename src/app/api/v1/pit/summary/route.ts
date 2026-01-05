import { pitController } from "@/lib/server/pit/controller";
import { requireAuth } from "@/lib/server/middleware/auth";
import { requireAccountType } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, SubscriptionPlan, AccountType } from "@/lib/server/utils/enum";
import { subscriptionService } from "@/lib/server/subscription/service";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";

/**
 * GET /api/v1/pit/summary
 * Get PIT summary for a tax year
 * 
 * Query params:
 * - accountId: User ID (for individual accounts)
 * - taxYear: Tax year (required)
 * 
 * Subscription: Requires pitTracking feature (available on all plans)
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only individual and business accounts (sole proprietorships) can access PIT features
    // Business accounts use PIT, NOT CIT (Company Income Tax)
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      [AccountType.Individual, AccountType.Business]
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);

    const accountId = searchParams.get("accountId");
    const taxYearParam = searchParams.get("taxYear");

    // OBSERVABILITY: Log PIT summary request
    console.log(`📝 [API] PIT Summary Request: AccountId=${accountId}, TaxYear=${taxYearParam}`);

    if (!accountId || !taxYearParam) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "accountId and taxYear are required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate accountId format
    if (!Types.ObjectId.isValid(accountId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid account ID format",
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

    // Check subscription plan for pitTracking feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.pitTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "PIT tracking is not available on your current plan. Please contact support.",
          data: {
            upgradeRequired: {
              feature: "PIT Tracking",
              currentPlan,
              requiredPlan: "free", // pitTracking is available on all plans
              requiredPlanPrice: 0,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    return await pitController.getPITSummary(userId, accountId, taxYear);
  } catch (error: any) {
    console.error("PIT summary API error:", error);
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: error?.message || "An error occurred while processing your request",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/pit/summary
 * Update/recalculate PIT summary for a tax year
 * 
 * Query params:
 * - accountId: User ID (for individual accounts)
 * - taxYear: Tax year (required)
 * 
 * Subscription: Requires pitTracking feature (available on all plans)
 */
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only individual and business accounts (sole proprietorships) can access PIT features
    // Business accounts use PIT, NOT CIT (Company Income Tax)
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      [AccountType.Individual, AccountType.Business]
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);

    const accountId = searchParams.get("accountId");
    const taxYearParam = searchParams.get("taxYear");

    if (!accountId || !taxYearParam) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "accountId and taxYear are required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate accountId format
    if (!Types.ObjectId.isValid(accountId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid account ID format",
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

    // Check subscription plan for pitTracking feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.pitTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "PIT tracking is not available on your current plan. Please contact support.",
          data: {
            upgradeRequired: {
              feature: "PIT Tracking",
              currentPlan,
              requiredPlan: "free",
              requiredPlanPrice: 0,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    return await pitController.updatePITSummary(userId, accountId, taxYear);
  } catch (error: any) {
    console.error("PIT summary update API error:", error);
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: error?.message || "An error occurred while processing your request",
        data: null,
      },
      { status: 500 }
    );
  }
}




