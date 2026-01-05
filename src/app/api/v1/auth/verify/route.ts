import { authService } from "@/lib/server/auth/service";
import { utils } from "@/lib/server/utils";
import { connectDB } from "@/lib/server/utils/db";
import { rateLimiter, RATE_LIMITS } from "@/lib/server/utils/rateLimiter";
import { logger } from "@/lib/server/utils/logger";
import { MessageResponse } from "@/lib/server/utils/enum";
import { NextResponse } from "next/server";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "POST") {
      return utils.customResponse({
        status: 405,
        message: MessageResponse.Error,
        description: "Method not allowed. Only POST requests are supported.",
        data: null,
      }) as NextResponse;
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
      return utils.customResponse({
        status: 429,
        message: MessageResponse.Error,
        description: `Too many requests. Please wait ${Math.ceil(
          (rateLimitResult.resetTime - Date.now()) / 1000
        )} seconds before trying again.`,
        data: null,
      }) as NextResponse;
    }

    let body: { email: string; otp: string };
    try {
      body = await request.json();
    } catch (error) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Invalid JSON in request body.",
        data: null,
      }) as NextResponse;
    }

    if (!body.email || !body.otp) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: "Email and OTP are required.",
        data: null,
      }) as NextResponse;
    }

    logger.info("Email verification attempt", {
      clientIp,
      email: body.email,
    });

    const result = await authService.verifyOTP(body.email, body.otp);

    if (!result.success) {
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: result.message,
        data: null,
      }) as NextResponse;
    }

    return utils.customResponse({
      status: 200,
      message: MessageResponse.Success,
      description: result.message,
      data: result.user,
    }) as NextResponse;
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Unexpected error in verify route", err);
    return utils.customResponse({
      status: 500,
      message: MessageResponse.Error,
      description: "An unexpected error occurred during verification.",
      data: null,
    }) as NextResponse;
  }
}

export const POST = utils.withErrorHandling(handler);





















