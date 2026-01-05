import { pitController } from "@/lib/server/pit/controller";
import { requireAuth } from "@/lib/server/middleware/auth";
import { requireAccountType } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, SubscriptionPlan, PITRemittanceStatus, AccountType } from "@/lib/server/utils/enum";
import { subscriptionService } from "@/lib/server/subscription/service";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";

/**
 * GET /api/v1/pit/remittance
 * Get PIT remittances for a tax year or all remittances
 * 
 * Query params:
 * - accountId: User ID (for individual accounts)
 * - taxYear: Tax year (optional - if not provided, returns all remittances)
 * 
 * Subscription: Requires pitRemittance feature (Starter+ plan)
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

    if (!accountId) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "accountId is required",
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

    // Check subscription plan for pitRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.pitRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "PIT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your PIT remittances.",
          data: {
            upgradeRequired: {
              feature: "PIT Remittance Tracking",
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

    // If taxYear is provided, get remittances for that year
    if (taxYearParam) {
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

      return await pitController.getPITRemittances(userId, accountId, taxYear);
    }

    // Otherwise, get all remittances
    return await pitController.getAllPITRemittances(userId, accountId);
  } catch (error: any) {
    console.error("PIT remittance API error:", error);
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
 * POST /api/v1/pit/remittance
 * Create PIT remittance record
 * 
 * Body:
 * - accountId: User ID (for individual accounts)
 * - taxYear: Tax year (required)
 * - remittanceDate: Date of remittance (required)
 * - remittanceAmount: Amount remitted (required)
 * - remittanceReference: NRS remittance reference (required)
 * - receiptUrl: URL to remittance receipt (optional)
 * 
 * Subscription: Requires pitRemittance feature (Starter+ plan)
 */
export async function POST(request: Request): Promise<NextResponse> {
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

    // Parse request body
    let body;
    try {
      const bodyText = await request.text();
      if (!bodyText || bodyText.trim().length === 0) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Request body is required",
            data: null,
          },
          { status: 400 }
        );
      }
      body = JSON.parse(bodyText);
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid JSON in request body",
          data: null,
        },
        { status: 400 }
      );
    }

    const {
      accountId,
      taxYear,
      remittanceDate,
      remittanceAmount,
      remittanceReference,
      receiptUrl,
    } = body;

    // Validate required fields
    if (!accountId || !taxYear || !remittanceDate || !remittanceAmount || !remittanceReference) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "accountId, taxYear, remittanceDate, remittanceAmount, and remittanceReference are required",
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
    const taxYearNum = parseInt(taxYear);
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (isNaN(taxYearNum) || taxYearNum < 2026 || taxYearNum > 2100) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate remittanceAmount
    const remittanceAmountNum = parseFloat(remittanceAmount);
    if (isNaN(remittanceAmountNum) || remittanceAmountNum < 0) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid remittance amount",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate remittanceDate
    const remittanceDateObj = new Date(remittanceDate);
    if (isNaN(remittanceDateObj.getTime())) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid remittance date",
          data: null,
        },
        { status: 400 }
      );
    }

    // Check subscription plan for pitRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.pitRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "PIT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your PIT remittances.",
          data: {
            upgradeRequired: {
              feature: "PIT Remittance Tracking",
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

    return await pitController.createPITRemittance(userId, {
      accountId: String(accountId),
      taxYear: taxYearNum,
      remittanceDate: remittanceDateObj,
      remittanceAmount: remittanceAmountNum,
      remittanceReference: String(remittanceReference).trim(),
      receiptUrl: receiptUrl ? String(receiptUrl).trim() : undefined,
    });
  } catch (error: any) {
    console.error("PIT remittance creation API error:", error);
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
 * PUT /api/v1/pit/remittance
 * Update PIT remittance record
 * 
 * Query params:
 * - remittanceId: Remittance ID (required)
 * - accountId: User ID (for individual accounts, required)
 * 
 * Body:
 * - remittanceDate: Date of remittance (optional)
 * - remittanceAmount: Amount remitted (optional)
 * - remittanceReference: NRS remittance reference (optional)
 * - receiptUrl: URL to remittance receipt (optional)
 * - status: Remittance status (optional)
 * 
 * Subscription: Requires pitRemittance feature (Starter+ plan)
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

    const remittanceId = searchParams.get("remittanceId");
    const accountId = searchParams.get("accountId");

    if (!remittanceId || !accountId) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "remittanceId and accountId are required",
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

    // Validate remittanceId format
    if (!Types.ObjectId.isValid(remittanceId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid remittance ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Parse request body
    let body;
    try {
      const bodyText = await request.text();
      if (!bodyText || bodyText.trim().length === 0) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Request body is required",
            data: null,
          },
          { status: 400 }
        );
      }
      body = JSON.parse(bodyText);
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid JSON in request body",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate and parse update data
    const updateData: any = {};

    if (body.remittanceDate !== undefined) {
      const remittanceDateObj = new Date(body.remittanceDate);
      if (isNaN(remittanceDateObj.getTime())) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Invalid remittance date",
            data: null,
          },
          { status: 400 }
        );
      }
      updateData.remittanceDate = remittanceDateObj;
    }

    if (body.remittanceAmount !== undefined) {
      const remittanceAmountNum = parseFloat(body.remittanceAmount);
      if (isNaN(remittanceAmountNum) || remittanceAmountNum < 0) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Invalid remittance amount",
            data: null,
          },
          { status: 400 }
        );
      }
      updateData.remittanceAmount = remittanceAmountNum;
    }

    if (body.remittanceReference !== undefined) {
      updateData.remittanceReference = String(body.remittanceReference).trim();
    }

    if (body.receiptUrl !== undefined) {
      updateData.receiptUrl = body.receiptUrl ? String(body.receiptUrl).trim() : undefined;
    }

    if (body.status !== undefined) {
      const validStatuses = [PITRemittanceStatus.Pending, PITRemittanceStatus.Remitted, PITRemittanceStatus.Verified];
      if (!validStatuses.includes(body.status as PITRemittanceStatus)) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            data: null,
          },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    // Check subscription plan for pitRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.pitRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "PIT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your PIT remittances.",
          data: {
            upgradeRequired: {
              feature: "PIT Remittance Tracking",
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

    return await pitController.updatePITRemittance(
      userId,
      remittanceId,
      accountId,
      updateData
    );
  } catch (error: any) {
    console.error("PIT remittance update API error:", error);
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
 * DELETE /api/v1/pit/remittance
 * Delete PIT remittance record
 * 
 * Query params:
 * - remittanceId: Remittance ID (required)
 * - accountId: User ID (for individual accounts, required)
 * 
 * Subscription: Requires pitRemittance feature (Starter+ plan)
 */
export async function DELETE(request: Request): Promise<NextResponse> {
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

    const remittanceId = searchParams.get("remittanceId");
    const accountId = searchParams.get("accountId");

    if (!remittanceId || !accountId) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "remittanceId and accountId are required",
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

    // Validate remittanceId format
    if (!Types.ObjectId.isValid(remittanceId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid remittance ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Check subscription plan for pitRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.pitRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "PIT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your PIT remittances.",
          data: {
            upgradeRequired: {
              feature: "PIT Remittance Tracking",
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

    return await pitController.deletePITRemittance(userId, remittanceId, accountId);
  } catch (error: any) {
    console.error("PIT remittance deletion API error:", error);
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


