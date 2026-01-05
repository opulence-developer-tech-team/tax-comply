import { monnifyService } from "@/lib/server/payment/monnify";
import { subscriptionService } from "@/lib/server/subscription/service";
import { connectDB } from "@/lib/server/utils/db";
import { Payment } from "@/lib/server/subscription/entity";
import { PaymentStatus, SubscriptionPlan, BillingCycle } from "@/lib/server/utils/enum";
import { BillingCycle as ClientBillingCycle } from "@/lib/utils/client-enums";
import { NextResponse } from "next/server";
import { logger } from "@/lib/server/utils/logger";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "POST") {
      return NextResponse.json({ status: false }, { status: 405 });
    }

    // Get webhook signature from headers
    const signature = request.headers.get("monnify-signature") || "";

    if (!signature) {
      logger.warn("Webhook request missing signature");
      return NextResponse.json({ status: false }, { status: 401 });
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Verify webhook signature
    const isValidSignature = monnifyService.verifyWebhookSignature(
      rawBody,
      signature
    );

    if (!isValidSignature) {
      logger.warn("Invalid webhook signature", {
        signature: signature.substring(0, 20) + "...",
      });
      return NextResponse.json({ status: false }, { status: 401 });
    }

    // Parse webhook payload
    const webhookPayload = monnifyService.parseWebhookPayload(body);
    if (!webhookPayload) {
      logger.warn("Invalid webhook payload structure");
      return NextResponse.json({ status: false }, { status: 400 });
    }

    logger.info("Monnify webhook received", {
      eventType: webhookPayload.eventType,
      transactionReference: webhookPayload.eventData.transactionReference,
      paymentStatus: webhookPayload.eventData.paymentStatus,
    });

    // Handle successful payment event
    if (webhookPayload.eventType === "SUCCESSFUL_TRANSACTION") {
      const { transactionReference, paymentReference, paymentStatus, metaData } =
        webhookPayload.eventData;

      // Find payment by Monnify transaction reference or payment reference
      const payment = await Payment.findOne({
        $or: [
          { monnifyTransactionReference: transactionReference },
          { monnifyPaymentReference: paymentReference },
        ],
      });

      if (payment && payment.status === PaymentStatus.Pending) {
        // Update payment status
        await subscriptionService.updatePaymentStatus(
          payment._id,
          PaymentStatus.Completed,
          undefined, // paystackTransactionId
          transactionReference
        );

        // Create or update subscription if metadata is available
        // Subscriptions are user-based, not company-based
        if (metaData && metaData.plan && metaData.billingCycle && metaData.userId) {
          const { Types } = await import("mongoose");
          const userId = new Types.ObjectId(metaData.userId);
          
          const subscription = await subscriptionService.createSubscription(
            userId,
            metaData.plan as SubscriptionPlan,
            metaData.billingCycle as ClientBillingCycle
          );

          // Process referral commission if applicable
          try {
            const { referralService } = await import("@/lib/server/referral/service");
            const { SUBSCRIPTION_PRICING } = await import("@/lib/server/subscription/service");
            
            // Get userId from metadata (stored during payment initialization)
            // Subscriptions are paid for by users, not companies
            const userId = metaData?.userId;
            
            if (userId) {
              const { Types } = await import("mongoose");
              const userIdObjectId = new Types.ObjectId(userId);
              
              // Check if this user was referred
              const referral = await referralService.getReferralByReferredUser(userIdObjectId);
              
              if (referral && subscription?._id && payment?._id) {
                // Calculate commission - backend resolves pricing (no client manipulation)
                const planPricing = SUBSCRIPTION_PRICING[metaData.plan as SubscriptionPlan];
                const subscriptionAmount = metaData.billingCycle === BillingCycle.Yearly 
                  ? planPricing.yearly 
                  : planPricing.monthly;

                // Create referral earning
                await referralService.createReferralEarning(
                  referral.referrerId,
                  referral.referredUserId,
                  subscription._id,
                  payment._id,
                  metaData.plan as string,
                  subscriptionAmount
                );

                logger.info("Referral commission processed", {
                  referrerId: referral.referrerId.toString(),
                  referredUserId: referral.referredUserId.toString(),
                  userId: userId,
                  subscriptionAmount,
                  plan: metaData.plan,
                });
              }
            } else {
              logger.warn("No userId in payment metadata, skipping referral commission", {
                paymentId: payment._id.toString(),
                metaData,
              });
            }
          } catch (error: any) {
            // Log error but don't fail payment processing
            logger.error("Error processing referral commission", error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    }

    return NextResponse.json({ status: true });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Error processing Monnify webhook", err);
    return NextResponse.json({ status: false }, { status: 500 });
  }
}

export const POST = handler;










