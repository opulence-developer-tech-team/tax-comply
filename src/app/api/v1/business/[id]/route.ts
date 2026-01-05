import { businessController } from "@/lib/server/business/controller";
import { businessValidator } from "@/lib/server/business/validator";
import { businessService } from "@/lib/server/business/service";
import { requireAuth, requireAccountType } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { rateLimiter, RATE_LIMITS } from "@/lib/server/utils/rateLimiter";
import { logger } from "@/lib/server/utils/logger";
import { MessageResponse, HttpMethod, AccountType } from "@/lib/server/utils/enum";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== HttpMethod.PUT) {
      return new NextResponse(
        JSON.stringify({
          message: MessageResponse.Error,
          description: "Method not allowed",
          data: null,
        }),
        { status: 405 }
      );
    }

    const resolvedParams = await params;
    const businessIdParam = resolvedParams.id;

    if (!businessIdParam) {
      return new NextResponse(
        JSON.stringify({
          message: MessageResponse.Error,
          description: "Business ID is required in the URL",
          data: null,
        }),
        { status: 400 }
      );
    }

    let businessId: Types.ObjectId;
    try {
      businessId = new Types.ObjectId(businessIdParam);
    } catch (error) {
      return new NextResponse(
        JSON.stringify({
          message: MessageResponse.Error,
          description: "Invalid business ID format",
          data: null,
        }),
        { status: 400 }
      );
    }

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only business accounts can update businesses
    const accountTypeCheck = await requireAccountType(auth.context.userId, AccountType.Business);
    if (!accountTypeCheck.allowed) {
      logger.warn("Non-business account attempted to update business", {
        userId: auth.context.userId.toString(),
        businessId: businessId.toString(),
      });
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    
    logger.info("Business update attempt", {
      userId: userId.toString(),
      businessId: businessId.toString(),
    });

    // SECURITY: Verify user is the owner of this business
    const business = await businessService.getBusinessById(businessId);
    if (!business || business.ownerId.toString() !== userId.toString()) {
      return new NextResponse(
        JSON.stringify({
          message: MessageResponse.Error,
          description: "You don't have permission to update this business",
          data: null,
        }),
        { status: 403 }
      );
    }

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = rateLimiter.checkLimit(
      clientIp,
      RATE_LIMITS.FETCH.maxRequests,
      RATE_LIMITS.FETCH.windowMs
    );

    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          message: MessageResponse.Error,
          description: `Too many requests. Please wait ${Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          )} seconds before trying again.`,
          data: null,
        }),
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new NextResponse(
        JSON.stringify({
          message: MessageResponse.Error,
          description: "Invalid JSON in request body.",
          data: null,
        }),
        { status: 400 }
      );
    }

    const validation = businessValidator.update(body);
    if (!validation.valid) {
      return validation.response!;
    }

    return await businessController.updateBusiness(businessId, body);
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Unexpected error in business update route", err);
    return new NextResponse(
      JSON.stringify({
        message: MessageResponse.Error,
        description: "An unexpected error occurred.",
        data: null,
      }),
      { status: 500 }
    );
  }
}

export const PUT = handler;



