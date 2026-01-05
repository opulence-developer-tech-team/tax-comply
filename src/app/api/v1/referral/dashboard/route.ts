import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { referralService } from "@/lib/server/referral/service";
import { utils } from "@/lib/server/utils";
import { MessageResponse } from "@/lib/server/utils/enum";
import { logger } from "@/lib/server/utils/logger";

/**
 * GET /api/v1/referral/dashboard
 * Get referral dashboard data for the authenticated user
 */
async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "GET") {
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

    const userId = auth.context.userId;

    // Get pagination parameters from query string
    // CRITICAL: Validate and enforce pagination limits to prevent abuse
    const { searchParams } = new URL(request.url);
    const { REFERRAL_CONFIG } = await import("@/lib/server/referral/config");
    
    const earningsPage = Math.max(
      REFERRAL_CONFIG.PAGINATION.MIN_PAGE,
      Math.min(
        parseInt(searchParams.get("earningsPage") || String(REFERRAL_CONFIG.PAGINATION.DEFAULT_PAGE), 10),
        Number.MAX_SAFE_INTEGER
      )
    );
    const earningsLimit = Math.max(
      REFERRAL_CONFIG.PAGINATION.MIN_LIMIT,
      Math.min(
        parseInt(searchParams.get("earningsLimit") || String(REFERRAL_CONFIG.PAGINATION.DEFAULT_LIMIT), 10),
        REFERRAL_CONFIG.PAGINATION.MAX_LIMIT
      )
    );
    const withdrawalsPage = Math.max(
      REFERRAL_CONFIG.PAGINATION.MIN_PAGE,
      Math.min(
        parseInt(searchParams.get("withdrawalsPage") || String(REFERRAL_CONFIG.PAGINATION.DEFAULT_PAGE), 10),
        Number.MAX_SAFE_INTEGER
      )
    );
    const withdrawalsLimit = Math.max(
      REFERRAL_CONFIG.PAGINATION.MIN_LIMIT,
      Math.min(
        parseInt(searchParams.get("withdrawalsLimit") || String(REFERRAL_CONFIG.PAGINATION.DEFAULT_LIMIT), 10),
        REFERRAL_CONFIG.PAGINATION.MAX_LIMIT
      )
    );

    // Get all referrals
    const referrals = await referralService.getReferralsByReferrer(userId);

    // Get earnings with pagination
    const earningsResult = await referralService.getEarningsByReferrer(userId, {
      page: earningsPage,
      limit: earningsLimit,
    });

    // Get available balance
    const availableBalance = await referralService.getAvailableBalance(userId);

    // Get total withdrawn
    const totalWithdrawn = await referralService.getTotalWithdrawn(userId);

    // Get withdrawals history with pagination
    const withdrawalsResult = await referralService.getWithdrawalsByUser(userId, {
      page: withdrawalsPage,
      limit: withdrawalsLimit,
    });

    // Get user's referralId
    const User = (await import("@/lib/server/user/entity")).default;
    const user = await User.findById(userId).select("referralId");
    const referralId = user?.referralId || null;

    // Generate referral link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const referralLink = referralId ? `${baseUrl}/sign-up/${referralId}` : null;

    return utils.customResponse({
      status: 200,
      message: MessageResponse.Success,
      description: "Referral dashboard data retrieved successfully",
      data: {
        referralId,
        referralLink,
        referrals: referrals.map((r) => ({
          id: r._id?.toString(),
          referredUser: {
            id: (r.referredUserId as any)?._id?.toString(),
            name: `${(r.referredUserId as any)?.firstName || ""} ${(r.referredUserId as any)?.lastName || ""}`.trim(),
            email: (r.referredUserId as any)?.email || "",
          },
          createdAt: r.createdAt,
        })),
        earnings: {
          data: earningsResult.earnings.map((e) => ({
            id: e._id?.toString(),
            referredUser: {
              id: (e.referredUserId as any)?._id?.toString(),
              name: `${(e.referredUserId as any)?.firstName || ""} ${(e.referredUserId as any)?.lastName || ""}`.trim(),
              email: (e.referredUserId as any)?.email || "",
            },
            subscriptionPlan: e.subscriptionPlan,
            subscriptionAmount: e.subscriptionAmount,
            commissionPercentage: e.commissionPercentage,
            commissionAmount: e.commissionAmount,
            status: e.status,
            createdAt: e.createdAt,
          })),
          pagination: {
            page: earningsResult.page,
            limit: earningsResult.limit,
            total: earningsResult.total,
            pages: earningsResult.pages,
          },
        },
        summary: {
          totalReferrals: referrals.length,
          totalEarnings: earningsResult.earnings.reduce((sum, e) => sum + e.commissionAmount, 0),
          availableBalance,
          totalWithdrawn,
          pendingEarnings: earningsResult.earnings.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.commissionAmount, 0),
        },
        withdrawals: {
          data: withdrawalsResult.withdrawals.map((w) => ({
            id: w._id?.toString(),
            amount: w.amount,
            bankName: w.bankName,
            accountNumber: w.accountNumber,
            accountName: w.accountName,
            status: w.status,
            failureReason: w.failureReason,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
          })),
          pagination: {
            page: withdrawalsResult.page,
            limit: withdrawalsResult.limit,
            total: withdrawalsResult.total,
            pages: withdrawalsResult.pages,
          },
        },
      },
    }) as NextResponse;
  } catch (error: any) {
    logger.error("Error fetching referral dashboard", error instanceof Error ? error : new Error(String(error)));
    return utils.customResponse({
      status: 500,
      message: MessageResponse.Error,
      description: "An error occurred while fetching referral dashboard",
      data: null,
    }) as NextResponse;
  }
}

export const GET = utils.withErrorHandling(handler);


