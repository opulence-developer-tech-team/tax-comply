import { companyController } from "@/lib/server/company/controller";
import { companyValidator } from "@/lib/server/company/validator";
import { companyService } from "@/lib/server/company/service";
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

    // Get companyId from URL parameter
    const resolvedParams = await params;
    const companyIdParam = resolvedParams.id;

    if (!companyIdParam) {
      return new NextResponse(
        JSON.stringify({
          message: MessageResponse.Error,
          description: "Company ID is required in the URL",
          data: null,
        }),
        { status: 400 }
      );
    }

    let companyId: Types.ObjectId;
    try {
      companyId = new Types.ObjectId(companyIdParam);
    } catch (error) {
      return new NextResponse(
        JSON.stringify({
          message: MessageResponse.Error,
          description: "Invalid company ID format",
          data: null,
        }),
        { status: 400 }
      );
    }

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only company accounts can update companies
    const accountTypeCheck = await requireAccountType(auth.context.userId, AccountType.Company);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to update company", {
        userId: auth.context.userId.toString(),
        companyId: companyId.toString(),
      });
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    
    logger.info("Company update attempt", {
      userId: userId.toString(),
      companyId: companyId.toString(),
    });

    // SECURITY: Verify user is the owner of this company
    const company = await companyService.getCompanyById(companyId);
    if (!company || company.ownerId.toString() !== userId.toString()) {
      return new NextResponse(
        JSON.stringify({
          message: MessageResponse.Error,
          description: "You don't have permission to update this company",
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

    const validation = companyValidator.update(body);
    if (!validation.valid) {
      return validation.response!;
    }

    // DEBUG: Log what's received from frontend for update
    console.log("🟢 BACKEND (API Route) - Received privacy consent data for UPDATE:", {
      companyId: companyId.toString(),
      privacyConsentGiven: body.privacyConsentGiven,
      privacyPolicyVersion: body.privacyPolicyVersion,
      type_privacyConsentGiven: typeof body.privacyConsentGiven,
      type_privacyPolicyVersion: typeof body.privacyPolicyVersion,
      hasPrivacyConsentGiven: 'privacyConsentGiven' in body,
      hasPrivacyPolicyVersion: 'privacyPolicyVersion' in body,
      fullBodyKeys: Object.keys(body),
    });

    return await companyController.updateCompany(companyId, body);
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Unexpected error in company update route", err);
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


