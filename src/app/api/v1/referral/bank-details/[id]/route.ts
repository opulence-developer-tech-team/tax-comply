import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { referralService } from "@/lib/server/referral/service";
import { utils } from "@/lib/server/utils";
import { MessageResponse } from "@/lib/server/utils/enum";
import { logger } from "@/lib/server/utils/logger";
import { Types } from "mongoose";

/**
 * DELETE /api/v1/referral/bank-details/[id]
 * Delete user's bank details
 */
async function deleteHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectDB();

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // Await params in Next.js 15+
    const { id } = await params;

    // Validate bank details ID format
    if (!id || !Types.ObjectId.isValid(id)) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Invalid bank details ID format",
        data: null,
      }) as NextResponse;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const bankDetailsId = new Types.ObjectId(id);

    await referralService.deleteUserBankDetails(userId, bankDetailsId);

    return utils.customResponse({
      status: 200,
      message: MessageResponse.Success,
      description: "Bank details deleted successfully",
      data: null,
    }) as NextResponse;
  } catch (error: any) {
    logger.error("Error deleting bank details", error instanceof Error ? error : new Error(String(error)));
    
    // Handle specific error cases
    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return utils.customResponse({
        status: 404,
        message: MessageResponse.Error,
        description: error.message || "Bank details not found",
        data: null,
      }) as NextResponse;
    }

    return utils.customResponse({
      status: 500,
      message: MessageResponse.Error,
      description: "An error occurred while deleting bank details",
      data: null,
    }) as NextResponse;
  }
}

export const DELETE = utils.withErrorHandling(deleteHandler);











