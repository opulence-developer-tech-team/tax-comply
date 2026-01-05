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
 * GET /api/v1/cit/remittance
 * Get CIT remittances for a tax year or all remittances
 * 
 * Query params:
 * - companyId: Company ID
 * - taxYear: Tax year (optional - if not provided, returns all remittances)
 * 
 * Subscription: Requires citRemittance feature (Starter+ plan)
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

    if (!companyId) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "companyId is required",
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

    // Check subscription plan for citRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.citRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "CIT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your CIT remittances.",
          data: {
            upgradeRequired: {
              feature: "CIT Remittance Tracking",
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
    let taxYear: number | undefined;
    if (taxYearParam) {
      taxYear = parseInt(taxYearParam);
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
    }

    // Get remittances
    const response = await citController.getCITRemittances(
      userId,
      companyId,
      taxYear
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: "Failed to retrieve CIT remittances",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/cit/remittance
 * Create a new CIT remittance record
 * 
 * Body:
 * - companyId: Company ID
 * - taxYear: Tax year (required)
 * - remittanceAmount: Amount remitted (required, >= 0)
 * - remittanceDate: Date when remittance was made (required)
 * - remittanceReference: Unique reference number (required)
 * - remittanceReceipt: URL to receipt (optional)
 * 
 * Subscription: Requires citRemittance feature (Starter+ plan)
 */
export async function POST(request: Request): Promise<NextResponse> {
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
    const body = await request.json();

    const {
      companyId,
      taxYear,
      remittanceAmount,
      remittanceDate,
      remittanceReference,
      remittanceReceipt,
    } = body;

    if (!companyId) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "companyId is required",
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

    // Check subscription plan for citRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.citRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "CIT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your CIT remittances.",
          data: {
            upgradeRequired: {
              feature: "CIT Remittance Tracking",
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

    // Create remittance
    const response = await citController.createCITRemittance(userId, companyId, {
      companyId,
      taxYear,
      remittanceAmount,
      remittanceDate: new Date(remittanceDate),
      remittanceReference,
      remittanceReceipt,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: "Failed to create CIT remittance",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/cit/remittance
 * Update an existing CIT remittance record
 * 
 * Query params:
 * - remittanceId: Remittance record ID
 * - companyId: Company ID
 * 
 * Body:
 * - remittanceDate: Date when remittance was made (optional)
 * - remittanceAmount: Amount remitted (optional, >= 0)
 * - remittanceReference: Unique reference number (optional)
 * - remittanceReceipt: URL to receipt (optional)
 * - status: Remittance status (optional)
 * 
 * Subscription: Requires citRemittance feature (Starter+ plan)
 */
export async function PUT(request: Request): Promise<NextResponse> {
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
    const body = await request.json();

    const remittanceId = searchParams.get("remittanceId");
    const companyId = searchParams.get("companyId");

    if (!remittanceId || !companyId) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "remittanceId and companyId are required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate IDs format
    if (!Types.ObjectId.isValid(remittanceId) || !Types.ObjectId.isValid(companyId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid remittance ID or company ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Check subscription plan for citRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.citRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "CIT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your CIT remittances.",
          data: {
            upgradeRequired: {
              feature: "CIT Remittance Tracking",
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

    // Update remittance
    const updateData: any = {};
    if (body.remittanceDate !== undefined) {
      updateData.remittanceDate = new Date(body.remittanceDate);
    }
    if (body.remittanceAmount !== undefined) {
      updateData.remittanceAmount = body.remittanceAmount;
    }
    if (body.remittanceReference !== undefined) {
      updateData.remittanceReference = body.remittanceReference;
    }
    if (body.remittanceReceipt !== undefined) {
      updateData.remittanceReceipt = body.remittanceReceipt;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    const response = await citController.updateCITRemittance(
      userId,
      companyId,
      remittanceId,
      updateData
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: "Failed to update CIT remittance",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/cit/remittance
 * Delete a CIT remittance record
 * 
 * Query params:
 * - remittanceId: Remittance record ID
 * - companyId: Company ID
 * 
 * Subscription: Requires citRemittance feature (Starter+ plan)
 */
export async function DELETE(request: Request): Promise<NextResponse> {
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

    const remittanceId = searchParams.get("remittanceId");
    const companyId = searchParams.get("companyId");

    if (!remittanceId || !companyId) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "remittanceId and companyId are required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate IDs format
    if (!Types.ObjectId.isValid(remittanceId) || !Types.ObjectId.isValid(companyId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid remittance ID or company ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Check subscription plan for citRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.citRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "CIT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your CIT remittances.",
          data: {
            upgradeRequired: {
              feature: "CIT Remittance Tracking",
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

    // Delete remittance
    const response = await citController.deleteCITRemittance(
      userId,
      companyId,
      remittanceId
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: "Failed to delete CIT remittance",
        data: null,
      },
      { status: 500 }
    );
  }
}

