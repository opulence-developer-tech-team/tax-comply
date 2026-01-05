import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { referralService } from "@/lib/server/referral/service";
import { utils } from "@/lib/server/utils";
import { MessageResponse } from "@/lib/server/utils/enum";
import { logger } from "@/lib/server/utils/logger";

/**
 * GET /api/v1/referral/bank-details
 * Get user's bank details for withdrawals
 */
async function getHandler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    const userId = auth.context.userId;
    const bankDetails = await referralService.getUserBankDetails(userId);

    return utils.customResponse({
      status: 200,
      message: MessageResponse.Success,
      description: "Bank details retrieved successfully",
      data: bankDetails.map((b) => ({
        id: b._id?.toString(),
        bankCode: b.bankCode,
        bankName: b.bankName,
        accountNumber: b.accountNumber,
        accountName: b.accountName,
        isDefault: b.isDefault,
        createdAt: b.createdAt,
      })),
    }) as NextResponse;
  } catch (error: any) {
    logger.error("Error fetching bank details", error instanceof Error ? error : new Error(String(error)));
    return utils.customResponse({
      status: 500,
      message: MessageResponse.Error,
      description: "An error occurred while fetching bank details",
      data: null,
    }) as NextResponse;
  }
}

/**
 * POST /api/v1/referral/bank-details
 * Add or update user's bank details
 */
async function postHandler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    const body = await request.json();
    const { bankCode, bankName, accountNumber, accountName } = body;

    // Validation
    if (!bankCode || !bankName || !accountNumber || !accountName) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Bank code, bank name, account number, and account name are required",
        data: null,
      }) as NextResponse;
    }

    // Validate account number (Nigerian account numbers are typically 10 digits)
    if (!/^\d{10}$/.test(accountNumber.trim())) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Account number must be 10 digits",
        data: null,
      }) as NextResponse;
    }

    const userId = auth.context.userId;
    // CRITICAL: Users can only have ONE bank detail (always default)
    // isDefault is removed from request - service always sets it to true
    const bankDetails = await referralService.saveUserBankDetails(userId, {
      bankCode: bankCode.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
    });

    return utils.customResponse({
      status: 200,
      message: MessageResponse.Success,
      description: "Bank details saved successfully",
      data: {
        id: bankDetails._id?.toString(),
        bankCode: bankDetails.bankCode,
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountName: bankDetails.accountName,
        isDefault: bankDetails.isDefault,
      },
    }) as NextResponse;
  } catch (error: any) {
    logger.error("Error saving bank details", error instanceof Error ? error : new Error(String(error)));
    return utils.customResponse({
      status: 500,
      message: MessageResponse.Error,
      description: "An error occurred while saving bank details",
      data: null,
    }) as NextResponse;
  }
}

export const GET = utils.withErrorHandling(getHandler);
export const POST = utils.withErrorHandling(postHandler);


