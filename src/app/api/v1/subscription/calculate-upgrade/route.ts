import { subscriptionService } from "@/lib/server/subscription/service";
import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { SubscriptionPlan, BillingCycle } from "@/lib/server/utils/enum";
import { utils } from "@/lib/server/utils";
import { MessageResponse } from "@/lib/server/utils/enum";
import { NextResponse } from "next/server";

/**
 * Calculate upgrade information (bonus days) without initializing payment
 * This allows the frontend to show upgrade info before payment
 */
async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "POST") {
      return utils.customResponse({
        status: 405,
        message: MessageResponse.Error,
        description: "Method not allowed",
        data: null,
      }) as NextResponse;
    }

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    const body = await request.json();
    const { plan, billingCycle } = body;

    if (!plan || !billingCycle) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Plan and billing cycle are required",
        data: null,
      }) as NextResponse;
    }

    // Calculate upgrade info (bonus days)
    const upgradeInfo = await subscriptionService.calculateUpgradeInfo(
      auth.context.userId,
      plan as SubscriptionPlan,
      billingCycle as BillingCycle
    );

    return utils.customResponse({
      status: 200,
      message: MessageResponse.Success,
      description: "Upgrade information calculated successfully",
      data: upgradeInfo,
    }) as NextResponse;
  } catch (error: any) {
    return utils.customResponse({
      status: 500,
      message: MessageResponse.Error,
      description: "An error occurred",
      data: null,
    }) as NextResponse;
  }
}

export const POST = handler;












