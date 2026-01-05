import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { HttpMethod } from "@/lib/server/utils/enum";
import { reviewController } from "@/lib/server/review/controller";
import { requireAuth } from "@/lib/server/middleware/auth";
import { reviewService } from "@/lib/server/review/service";
import { ReviewStatus } from "@/lib/server/review/interface";
import { utils } from "@/lib/server/utils";
import { MessageResponse } from "@/lib/server/utils/enum";
import { rateLimiter, RATE_LIMITS } from "@/lib/server/utils/rateLimiter";
import { logger } from "@/lib/server/utils/logger";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method === HttpMethod.GET) {
      const url = new URL(request.url);
      const cursor = url.searchParams.get("cursor") || undefined;
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);

      const result = await reviewService.getApprovedReviewsPaginated({
        cursor,
        limit,
        status: ReviewStatus.Approved,
      });

      return NextResponse.json({
        message: MessageResponse.Success,
        description: "Reviews retrieved successfully",
        data: result,
      });
    }

    if (request.method === HttpMethod.POST) {
      const authResult = await requireAuth(request);
      if (!authResult.authorized || !authResult.context) {
        return authResult.response || NextResponse.json(
          { message: MessageResponse.Error, description: "Authentication required", data: null },
          { status: 401 }
        );
      }

      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown";

      const rateLimitResult = rateLimiter.checkLimit(
        `review:${authResult.context.userId.toString()}`,
        3,
        3600000
      );

      if (!rateLimitResult.allowed) {
        logger.warn("Rate limit exceeded for review submission", {
          userId: authResult.context.userId.toString(),
          clientIp,
        });
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: `Too many review submissions. Please wait ${Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            )} seconds before trying again.`,
            data: null,
          },
          { status: 429 }
        );
      }

      const body = await request.json();
      return reviewController.createReview(authResult.context.userId, body);
    }

    return NextResponse.json(
      { message: MessageResponse.Error, description: "Method not allowed", data: null },
      { status: 405 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: MessageResponse.Error, description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;

