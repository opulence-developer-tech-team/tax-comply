import { subscriptionService, SUBSCRIPTION_PRICING } from "@/lib/server/subscription/service";
import { monnifyService } from "@/lib/server/payment/monnify";
import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { SubscriptionPlan, BillingCycle } from "@/lib/server/utils/enum";
import { utils } from "@/lib/server/utils";
import { MessageResponse } from "@/lib/server/utils/enum";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { subscriptionService as subService } from "@/lib/server/subscription/service";
import { Payment } from "@/lib/server/subscription/entity";
import { PaymentMethod, PaymentStatus } from "@/lib/server/utils/enum";
import User from "@/lib/server/user/entity";
import Company from "@/lib/server/company/entity";

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

    const pricing = SUBSCRIPTION_PRICING[plan as SubscriptionPlan];
    if (!pricing) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Invalid subscription plan",
        data: null,
      }) as NextResponse;
    }

    const amount = billingCycle === BillingCycle.Monthly ? pricing.monthly : pricing.yearly;

    // Fetch user and company details for Monnify
    const user = await User.findById(auth.context.userId);
    if (!user) {
      return utils.customResponse({
        status: 404,
        message: MessageResponse.Error,
        description: "User not found",
        data: null,
      }) as NextResponse;
    }

    // Generate payment reference
    const paymentReference = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare customer information
    const customerName = `${user.firstName} ${user.lastName}`;
    const customerEmail = user.email;
    const customerPhone = user.phoneNumber;
    
    // Get companyId if available (for tracking, but subscription is user-based)
    const companyId = auth.context.companyId || null;

    // Get redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUrl = `${baseUrl}/payment/verify`;

    // Create checkout URL with Monnify
    const monnifyResponse = await monnifyService.createCheckoutUrl({
      amount: amount,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhoneNumber: customerPhone?.trim() || "",
      paymentDescription: `Subscription ${plan} - ${billingCycle}`,
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE || "",
      paymentReference,
      redirectUrl,
      metadata: {
        companyId: companyId?.toString() || null, // Optional: for tracking which company initiated payment
        plan,
        billingCycle,
        userId: auth.context.userId.toString(), // Primary: subscription is for the user
      },
    });

    if (!monnifyResponse.requestSuccessful) {
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: monnifyResponse.responseMessage || "Failed to initialize payment",
        data: null,
      }) as NextResponse;
    }

    // Calculate upgrade info (bonus days) before payment
    const upgradeInfo = await subscriptionService.calculateUpgradeInfo(
      auth.context.userId,
      plan as SubscriptionPlan,
      billingCycle as BillingCycle
    );

    const subscription = await subService.getSubscription(auth.context.userId);
    const payment = await subService.createPayment(
      auth.context.userId,
      subscription?._id || new Types.ObjectId(),
      amount,
      PaymentMethod.Monnify,
      companyId || undefined, // Optional: track which company initiated payment
      undefined, // paystackReference
      undefined, // paystackTransactionId
      monnifyResponse.responseBody.transactionReference,
      monnifyResponse.responseBody.paymentReference
    );

    return utils.customResponse({
      status: 200,
      message: MessageResponse.Success,
      description: "Payment initialized successfully",
      data: {
        checkoutUrl: monnifyResponse.responseBody.checkoutUrl,
        transactionReference: monnifyResponse.responseBody.transactionReference,
        paymentReference: monnifyResponse.responseBody.paymentReference,
        paymentId: payment._id?.toString() || "",
        // Include upgrade info for frontend display
        upgradeInfo: {
          hasBonus: upgradeInfo.hasBonus,
          bonusDays: upgradeInfo.bonusDays,
          previousPlan: upgradeInfo.previousPlan,
          newEndDate: upgradeInfo.newEndDate,
          standardEndDate: upgradeInfo.standardEndDate,
          message: upgradeInfo.message,
        },
      },
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










