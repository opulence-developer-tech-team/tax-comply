import { monnifyService } from "@/lib/server/payment/monnify";
import { subscriptionService } from "@/lib/server/subscription/service";
import { connectDB } from "@/lib/server/utils/db";
import { utils } from "@/lib/server/utils";
import { MessageResponse, PaymentStatus, SubscriptionPlan, BillingCycle } from "@/lib/server/utils/enum";
import { NextResponse } from "next/server";
import { HttpMethod } from "@/lib/server/utils/enum";
import { Payment } from "@/lib/server/subscription/entity";
import { logger } from "@/lib/server/utils/logger";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    // Support both GET (redirect from Monnify) and POST (manual verification)
    const isGet = request.method === HttpMethod.GET;
    const isPost = request.method === HttpMethod.POST;

    if (!isGet && !isPost) {
      return utils.customResponse({
        status: 405,
        message: MessageResponse.Error,
        description: "Method not allowed",
        data: null,
      }) as NextResponse;
    }

    let transactionReference: string | null = null;
    let paymentReference: string | null = null;

    if (isGet) {
      // Monnify redirects with query params
      const { searchParams } = new URL(request.url);
      transactionReference = searchParams.get("transactionReference");
      paymentReference = searchParams.get("paymentReference");
    } else {
      // POST request with body
      const body = await request.json();
      transactionReference = body.transactionReference || body.reference;
      paymentReference = body.paymentReference;
    }

    // We need at least one reference
    if (!transactionReference && !paymentReference) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Transaction reference or payment reference is required",
        data: null,
      }) as NextResponse;
    }

    // Prefer transactionReference for verification
    const referenceToUse = transactionReference || paymentReference!;

    console.log("For Debugging: Verifying payment with reference:", referenceToUse); 
    logger.info("Payment verification requested", {
      transactionReference: transactionReference || "none",
      paymentReference: paymentReference || "none",
    });

    // Verify transaction with Monnify
    const verification = await monnifyService.verifyTransaction(referenceToUse);
    console.log("For Debugging: Monnify verification response:", verification);
    
    if (!verification || verification.paymentStatus?.toUpperCase() !== "PAID") {
       console.log("For Debugging: Verification failed or not paid. Status:", verification?.paymentStatus);
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Payment verification failed or payment not completed",
        data: null,
      }) as NextResponse;
    }

    // Find payment record
    const payment = await Payment.findOne({
      $or: [
        { monnifyTransactionReference: verification.transactionReference },
        { monnifyPaymentReference: verification.paymentReference },
      ],
    });
    
    console.log("For Debugging: Found existing payment record:", payment ? payment._id : "None");

    if (payment && payment.status === PaymentStatus.Pending) {
      // Update payment status
      await subscriptionService.updatePaymentStatus(
        payment._id,
        PaymentStatus.Completed,
        undefined, // paystackTransactionId
        verification.transactionReference
      );

      // Create or update subscription if metadata is available
      // Subscriptions are user-based, not company-based
      // Get metadata from payment record (stored during initialization) or from verification response
      const metaData = verification.metaData || (payment as any)?.metaData;
      
      console.log("For Debugging: Metadata for subscription:", metaData);

      if (metaData?.plan && metaData?.billingCycle && metaData?.userId) {
        const { Types } = await import("mongoose");
        const userId = new Types.ObjectId(metaData.userId);
        
        await subscriptionService.createSubscription(
          userId,
          metaData.plan as SubscriptionPlan,
          metaData.billingCycle as BillingCycle
        );
      } else if (payment?.userId) {
        // Fallback: use userId from payment record if metadata is missing
        // This handles cases where metadata might not be in verification response
        // We still need plan and billingCycle, so log a warning
        logger.warn("Payment verified but metadata missing, cannot create subscription", {
          paymentId: payment._id.toString(),
          userId: payment.userId.toString(),
        });
      }
    }

    // For GET requests (redirects), redirect to success page
    if (isGet) {
      return NextResponse.redirect(
        new URL("/dashboard/subscription?payment=success", request.url)
      );
    }

    // For POST requests, return JSON response
    return utils.customResponse({
      status: 200,
      message: MessageResponse.Success,
      description: "Payment verified successfully",
      data: {
        verified: true,
        amount: parseFloat(verification.amountPaid || "0"),
        transactionReference: verification.transactionReference,
        paymentReference: verification.paymentReference,
        // Add subscription info if available (to match frontend expectation)
        subscription: verification.metaData?.bonusDays ? { bonusDays: verification.metaData.bonusDays } : undefined
      },
    }) as NextResponse;
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("For Debugging: Error verifying payment:", err.message, (err as any).response?.data || "");
    logger.error("Error verifying payment", err);

    // For GET requests, redirect to error page
    if (request.method === HttpMethod.GET) {
      return NextResponse.redirect(
        new URL("/dashboard/subscription?payment=failed", request.url)
      );
    }

    // Check for common verification errors to return 400 instead of 500
    const isVerificationError = 
        err.message.includes("no transaction matching") || 
        err.message.includes("not found") ||
        err.message.includes("Paid"); // e.g. "Transaction not Paid"

    return utils.customResponse({
      status: isVerificationError ? 400 : 500,
      message: MessageResponse.Error,
      description: err.message || "An error occurred while verifying payment",
      data: null,
    }) as NextResponse;
  }
}

export const GET = handler;
export const POST = handler;










