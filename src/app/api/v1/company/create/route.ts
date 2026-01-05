import { companyController } from "@/lib/server/company/controller";
import { companyValidator } from "@/lib/server/company/validator";
import { requireAuth, requireAccountType } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { rateLimiter, RATE_LIMITS } from "@/lib/server/utils/rateLimiter";
import { logger } from "@/lib/server/utils/logger";
import { MessageResponse, AccountType } from "@/lib/server/utils/enum";
import { NextResponse } from "next/server";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "POST") {
      return requireAuth(request).then(() => {
        return { authorized: false, response: undefined };
      }).then(() => {
        return new NextResponse();
      });
    }

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only company accounts can create companies
    const accountTypeCheck = await requireAccountType(auth.context.userId, AccountType.Company);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to create company", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
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
      return new NextResponse(JSON.stringify({
        message: MessageResponse.Error,
        description: `Too many requests. Please wait ${Math.ceil(
          (rateLimitResult.resetTime - Date.now()) / 1000
        )} seconds before trying again.`,
        data: null,
      }), { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new NextResponse(JSON.stringify({
        message: MessageResponse.Error,
        description: "Invalid JSON in request body.",
        data: null,
      }), { status: 400 });
    }

    const validation = companyValidator.onboarding(body);
    if (!validation.valid) {
      return validation.response!;
    }

    logger.info("Company creation attempt", {
      userId: auth.context.userId.toString(),
    });

    return await companyController.createCompany(auth.context.userId, body);
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Unexpected error in company creation route", err);
    return new NextResponse(JSON.stringify({
      message: MessageResponse.Error,
      description: "An unexpected error occurred.",
      data: null,
    }), { status: 500 });
  }
}

export const POST = handler;










