import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { referralService } from "@/lib/server/referral/service";
import { monnifyService } from "@/lib/server/payment/monnify";
import { utils } from "@/lib/server/utils";
import { MessageResponse } from "@/lib/server/utils/enum";
import { logger } from "@/lib/server/utils/logger";
import { REFERRAL_CONFIG } from "@/lib/server/referral/config";

/**
 * POST /api/v1/referral/withdraw
 * Initiate withdrawal of referral earnings
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
    const { amount, bankCode, bankName, accountNumber, accountName } = body;

    // Validation
    if (!amount || !bankCode || !bankName || !accountNumber || !accountName) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Amount, bank code, bank name, account number, and account name are required",
        data: null,
      }) as NextResponse;
    }

    // Validate amount
    if (amount < REFERRAL_CONFIG.MIN_WITHDRAWAL_AMOUNT) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: `Minimum withdrawal amount is ₦${REFERRAL_CONFIG.MIN_WITHDRAWAL_AMOUNT}`,
        data: null,
      }) as NextResponse;
    }

    if (REFERRAL_CONFIG.MAX_WITHDRAWAL_AMOUNT && amount > REFERRAL_CONFIG.MAX_WITHDRAWAL_AMOUNT) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: `Maximum withdrawal amount is ₦${REFERRAL_CONFIG.MAX_WITHDRAWAL_AMOUNT}`,
        data: null,
      }) as NextResponse;
    }

    const userId = auth.context.userId;

    // CRITICAL: Verify user has saved bank details before allowing withdrawal
    // This is a hard backend check that cannot be bypassed
    const savedBankDetails = await referralService.getUserBankDetails(userId);
    if (!savedBankDetails || savedBankDetails.length === 0) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "You must add bank details before withdrawing. Please add your bank account first.",
        data: null,
      }) as NextResponse;
    }

    // CRITICAL: Validate account number format
    const normalizedAccountNumber = accountNumber.trim().replace(/\s/g, "");
    if (!/^\d{10}$/.test(normalizedAccountNumber)) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Account number must be exactly 10 digits",
        data: null,
      }) as NextResponse;
    }

    // CRITICAL: Validate that withdrawal bank details match saved bank details
    // This prevents users from withdrawing to unauthorized accounts
    const savedBank = savedBankDetails[0];
    if (
      savedBank.bankCode !== bankCode.trim() ||
      savedBank.accountNumber !== normalizedAccountNumber
    ) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Withdrawal bank details must match your saved bank account. Please use your saved bank details or update them first.",
        data: null,
      }) as NextResponse;
    }

    // Create withdrawal record
    let withdrawalResult;
    try {
      withdrawalResult = await referralService.createWithdrawal(userId, amount, {
        bankCode: bankCode.trim(),
        bankName: bankName.trim(),
        accountNumber: normalizedAccountNumber,
        accountName: accountName.trim(),
      });
    } catch (error: any) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: error.message || "Failed to create withdrawal",
        data: null,
      }) as NextResponse;
    }

    if (!withdrawalResult) {
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to create withdrawal record",
        data: null,
      }) as NextResponse;
    }

    const { withdrawal, earnings } = withdrawalResult;

    // Initiate Monnify disbursement
    try {
      const withdrawalReference = `REF-WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const monnifyResponse = await monnifyService.initiateDisbursement({
        amount: amount,
        reference: withdrawalReference,
        narration: `Referral earnings withdrawal - ${earnings.length} earning(s)`,
        destinationBankCode: bankCode.trim(),
        destinationAccountNumber: accountNumber.trim(),
        destinationAccountName: accountName.trim(),
        currencyCode: "NGN",
      });

      // Update withdrawal with Monnify reference
      const { ReferralWithdrawal } = await import("@/lib/server/referral/entity");
      await ReferralWithdrawal.findByIdAndUpdate(withdrawal._id, {
        monnifyReference: monnifyResponse.responseBody.transactionReference,
        status: "processing",
      });

      logger.info("Withdrawal initiated successfully", {
        userId: userId.toString(),
        withdrawalId: withdrawal._id?.toString(),
        amount,
        monnifyReference: monnifyResponse.responseBody.transactionReference,
      });

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Withdrawal initiated successfully",
        data: {
          withdrawalId: withdrawal._id?.toString(),
          amount,
          status: "processing",
          monnifyReference: monnifyResponse.responseBody.transactionReference,
        },
      }) as NextResponse;
    } catch (error: any) {
      // Update withdrawal status to failed
      const { ReferralWithdrawal } = await import("@/lib/server/referral/entity");
      await ReferralWithdrawal.findByIdAndUpdate(withdrawal._id, {
        status: "failed",
        failureReason: error.message || "Monnify disbursement failed",
      });

      // Revert earnings status back to available
      const { ReferralEarning } = await import("@/lib/server/referral/entity");
      await ReferralEarning.updateMany(
        { _id: { $in: earnings.map((e) => e._id!) } },
        {
          $set: {
            status: "available",
            withdrawalId: null,
          },
        }
      );

      logger.error("Error initiating Monnify disbursement", error instanceof Error ? error : new Error(String(error)));

      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: error.message || "Failed to initiate withdrawal. Please try again.",
        data: null,
      }) as NextResponse;
    }
  } catch (error: any) {
    logger.error("Error processing withdrawal request", error instanceof Error ? error : new Error(String(error)));
    return utils.customResponse({
      status: 500,
      message: MessageResponse.Error,
      description: "An error occurred while processing withdrawal",
      data: null,
    }) as NextResponse;
  }
}

export const POST = utils.withErrorHandling(handler);


