import { vatService } from "@/lib/server/vat/service";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { logger } from "@/lib/server/utils/logger";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, SubscriptionPlan, AccountType } from "@/lib/server/utils/enum";
import { subscriptionService } from "@/lib/server/subscription/service";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { ICreateVATRemittance, IUpdateVATRemittance } from "@/lib/server/vat/interface";

/**
 * GET /api/v1/vat/remittance
 * Get VAT remittances for a month/year or all remittances
 * 
 * Query params:
 * - companyId: Company ID (for Company accounts)
 * - businessId: Business ID (for Business accounts)
 * - month: Month (optional - if not provided, returns all months)
 * - year: Year (optional - if not provided, returns all years)
 * 
 * Subscription: Requires vatRemittance feature (Starter+ plan)
 */
export async function GET(request: Request): Promise<NextResponse> {
  let auth: any = null;
  try {
    await connectDB();

    // Authenticate user
    auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only company and business accounts can access VAT remittances
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      [AccountType.Company, AccountType.Business]
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("@/lib/server/user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "User account type not found", data: null },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    // Accept both companyId and businessId query parameters based on account type
    let entityId: string | null = null;
    if (accountType === AccountType.Company) {
      entityId = searchParams.get("companyId");
    } else if (accountType === AccountType.Business) {
      entityId = searchParams.get("businessId");
    } else {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Invalid account type for VAT remittance access", data: null },
        { status: 403 }
      );
    }

    if (!entityId) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required. Please provide ${paramName} in the query parameters.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate entityId format
    if (!Types.ObjectId.isValid(entityId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid ${accountType === AccountType.Company ? "company" : "business"} ID format.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Verify user is the owner of this entity
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this company.", data: null },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this business.", data: null },
          { status: 403 }
        );
      }
    }

    // Check subscription plan for vatRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.vatRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "VAT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your VAT remittances.",
          data: {
            upgradeRequired: {
              feature: "VAT Remittance Tracking",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    // Parse optional month and year parameters
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    let month: number | undefined;
    let year: number | undefined;

    if (monthParam) {
      month = parseInt(monthParam);
      if (isNaN(month) || month < 1 || month > 12) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Invalid month. Must be between 1 and 12.",
            data: null,
          },
          { status: 400 }
        );
      }
    }

    if (yearParam) {
      year = parseInt(yearParam);
      // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      if (isNaN(year) || year < 2026 || year > 2100) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: `Invalid year. This application only supports years 2026 and onward per Nigeria Tax Act 2025.`,
            data: null,
          },
          { status: 400 }
        );
      }
    }

    // Get remittances
    const remittances = await vatService.getVATRemittances(
      new Types.ObjectId(entityId),
      accountType,
      month,
      year
    );

    return NextResponse.json(
      {
        message: MessageResponse.Success,
        description: "VAT remittances retrieved successfully",
        data: remittances,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Error getting VAT remittances", error, {
      userId: auth?.context?.userId?.toString() || "unknown",
    });
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: error.message || "Failed to retrieve VAT remittances",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/vat/remittance
 * Create a new VAT remittance record
 * 
 * Body:
 * - entityId: Company ID or Business ID (required)
 * - accountType: "company" or "business" (required)
 * - month: Month (required, 1-12)
 * - year: Year (required, 2026+)
 * - remittanceAmount: Amount remitted (required, >= 0)
 * - remittanceDate: Date when remittance was made (required)
 * - remittanceReference: Unique reference number (required)
 * - remittanceReceipt: URL to receipt (optional)
 * 
 * Subscription: Requires vatRemittance feature (Starter+ plan)
 */
export async function POST(request: Request): Promise<NextResponse> {
  let auth: any = null;
  try {
    await connectDB();

    // Authenticate user
    auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only company and business accounts can access VAT remittances
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      [AccountType.Company, AccountType.Business]
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    
    // Parse request body
    let body: any;
    try {
      const bodyText = await request.text();
      if (!bodyText || bodyText.trim().length === 0) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Request body is required",
            data: null,
          },
          { status: 400 }
        );
      }
      body = JSON.parse(bodyText);
    } catch (parseError: any) {
      logger.error("JSON parse error:", parseError);
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid JSON in request body",
          data: null,
        },
        { status: 400 }
      );
    }

    const {
      entityId,
      accountType,
      month,
      year,
      remittanceAmount,
      remittanceDate,
      remittanceReference,
      remittanceReceipt,
    } = body;

    // Validate required fields
    if (!entityId) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "entityId is required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate entityId format
    if (!Types.ObjectId.isValid(entityId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid entity ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // CRITICAL: Validate accountType
    if (!accountType) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "accountType is required (must be 'company' or 'business')",
          data: null,
        },
        { status: 400 }
      );
    }

    const validAccountTypes = [AccountType.Company, AccountType.Business];
    if (!validAccountTypes.includes(accountType as AccountType)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid accountType. Must be ${AccountType.Company} or ${AccountType.Business}.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Verify user is the owner of this entity
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this company.", data: null },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this business.", data: null },
          { status: 403 }
        );
      }
    }

    // Validate month
    if (!month) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "month is required (1-12)",
          data: null,
        },
        { status: 400 }
      );
    }

    const monthNum = parseInt(month);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid month. Must be between 1 and 12.",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate year
    if (!year) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "year is required (2026+)",
          data: null,
        },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (isNaN(yearNum) || yearNum < 2026 || yearNum > 2100) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid year. This application only supports years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate remittanceAmount
    if (remittanceAmount === null || remittanceAmount === undefined) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "remittanceAmount is required",
          data: null,
        },
        { status: 400 }
      );
    }

    const remittanceAmountNum = parseFloat(remittanceAmount);
    if (isNaN(remittanceAmountNum) || remittanceAmountNum < 0) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid remittance amount. Must be >= 0",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate remittanceDate
    if (!remittanceDate) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "remittanceDate is required",
          data: null,
        },
        { status: 400 }
      );
    }

    const remittanceDateObj = new Date(remittanceDate);
    if (isNaN(remittanceDateObj.getTime())) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid remittance date format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate remittanceReference
    if (!remittanceReference || remittanceReference.trim() === "") {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "remittanceReference is required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Check subscription plan for vatRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.vatRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "VAT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your VAT remittances.",
          data: {
            upgradeRequired: {
              feature: "VAT Remittance Tracking",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    // Create remittance
    const remittanceData: ICreateVATRemittance = {
      entityId,
      accountType: accountType as AccountType,
      month: monthNum,
      year: yearNum,
      remittanceAmount: remittanceAmountNum,
      remittanceDate: remittanceDateObj,
      remittanceReference,
      remittanceReceipt,
    };

    const remittance = await vatService.createVATRemittance(remittanceData);

    return NextResponse.json(
      {
        message: MessageResponse.Success,
        description: "VAT remittance created successfully",
        data: remittance,
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error("Error creating VAT remittance", error, {
      userId: auth?.context?.userId?.toString(),
    });
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: error.message || "Failed to create VAT remittance",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/vat/remittance
 * Update an existing VAT remittance record
 * 
 * Query params:
 * - remittanceId: Remittance record ID (required)
 * - companyId: Company ID (for Company accounts)
 * - businessId: Business ID (for Business accounts)
 * 
 * Body:
 * - remittanceDate: Date when remittance was made (optional)
 * - remittanceAmount: Amount remitted (optional, >= 0)
 * - remittanceReference: Unique reference number (optional)
 * - remittanceReceipt: URL to receipt (optional)
 * - status: Remittance status (optional)
 * 
 * Subscription: Requires vatRemittance feature (Starter+ plan)
 */
export async function PUT(request: Request): Promise<NextResponse> {
  let auth: any = null;
  try {
    await connectDB();

    // Authenticate user
    auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only company and business accounts can access VAT remittances
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      [AccountType.Company, AccountType.Business]
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("@/lib/server/user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "User account type not found", data: null },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    // Get remittanceId from query params
    const remittanceId = searchParams.get("remittanceId");
    if (!remittanceId) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "remittanceId is required in query parameters",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate remittanceId format
    if (!Types.ObjectId.isValid(remittanceId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid remittance ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Accept both companyId and businessId query parameters based on account type
    let entityId: string | null = null;
    if (accountType === AccountType.Company) {
      entityId = searchParams.get("companyId");
    } else if (accountType === AccountType.Business) {
      entityId = searchParams.get("businessId");
    } else {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Invalid account type for VAT remittance access", data: null },
        { status: 403 }
      );
    }

    if (!entityId) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required. Please provide ${paramName} in the query parameters.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate entityId format
    if (!Types.ObjectId.isValid(entityId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid ${accountType === AccountType.Company ? "company" : "business"} ID format.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Verify user is the owner of this entity
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this company.", data: null },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this business.", data: null },
          { status: 403 }
        );
      }
    }

    // Check subscription plan for vatRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.vatRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "VAT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your VAT remittances.",
          data: {
            upgradeRequired: {
              feature: "VAT Remittance Tracking",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    // Parse request body
    let body: any;
    try {
      const bodyText = await request.text();
      if (!bodyText || bodyText.trim().length === 0) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Request body is required",
            data: null,
          },
          { status: 400 }
        );
      }
      body = JSON.parse(bodyText);
    } catch (parseError: any) {
      logger.error("JSON parse error:", parseError);
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid JSON in request body",
          data: null,
        },
        { status: 400 }
      );
    }

    const updateData: IUpdateVATRemittance = {};

    if (body.remittanceDate !== undefined) {
      const remittanceDateObj = new Date(body.remittanceDate);
      if (isNaN(remittanceDateObj.getTime())) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Invalid remittance date format",
            data: null,
          },
          { status: 400 }
        );
      }
      updateData.remittanceDate = remittanceDateObj;
    }

    if (body.remittanceAmount !== undefined) {
      const remittanceAmountNum = parseFloat(body.remittanceAmount);
      if (isNaN(remittanceAmountNum) || remittanceAmountNum < 0) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Invalid remittance amount. Must be >= 0",
            data: null,
          },
          { status: 400 }
        );
      }
      updateData.remittanceAmount = remittanceAmountNum;
    }

    if (body.remittanceReference !== undefined) {
      if (!body.remittanceReference || body.remittanceReference.trim() === "") {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "remittanceReference cannot be empty",
            data: null,
          },
          { status: 400 }
        );
      }
      updateData.remittanceReference = body.remittanceReference;
    }

    if (body.remittanceReceipt !== undefined) {
      updateData.remittanceReceipt = body.remittanceReceipt;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // Update remittance
    const remittance = await vatService.updateVATRemittance(
      remittanceId,
      new Types.ObjectId(entityId),
      accountType,
      updateData
    );

    return NextResponse.json(
      {
        message: MessageResponse.Success,
        description: "VAT remittance updated successfully",
        data: remittance,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Error updating VAT remittance", error, {
      userId: auth?.context?.userId?.toString(),
    });
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: error.message || "Failed to update VAT remittance",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/vat/remittance
 * Delete a VAT remittance record
 * 
 * Query params:
 * - remittanceId: Remittance record ID (required)
 * - companyId: Company ID (for Company accounts)
 * - businessId: Business ID (for Business accounts)
 * 
 * Subscription: Requires vatRemittance feature (Starter+ plan)
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  let auth: any = null;
  try {
    await connectDB();

    // Authenticate user
    auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only company and business accounts can access VAT remittances
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      [AccountType.Company, AccountType.Business]
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("@/lib/server/user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "User account type not found", data: null },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    // Get remittanceId from query params
    const remittanceId = searchParams.get("remittanceId");
    if (!remittanceId) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "remittanceId is required in query parameters",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate remittanceId format
    if (!Types.ObjectId.isValid(remittanceId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid remittance ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Accept both companyId and businessId query parameters based on account type
    let entityId: string | null = null;
    if (accountType === AccountType.Company) {
      entityId = searchParams.get("companyId");
    } else if (accountType === AccountType.Business) {
      entityId = searchParams.get("businessId");
    } else {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Invalid account type for VAT remittance access", data: null },
        { status: 403 }
      );
    }

    if (!entityId) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required. Please provide ${paramName} in the query parameters.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate entityId format
    if (!Types.ObjectId.isValid(entityId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid ${accountType === AccountType.Company ? "company" : "business"} ID format.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Verify user is the owner of this entity
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this company.", data: null },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this business.", data: null },
          { status: 403 }
        );
      }
    }

    // Check subscription plan for vatRemittance feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.vatRemittance) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "VAT remittance tracking is available on Starter plan (₦3,500/month) and above. Upgrade to track your VAT remittances.",
          data: {
            upgradeRequired: {
              feature: "VAT Remittance Tracking",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    // Delete remittance
    const deleted = await vatService.deleteVATRemittance(
      remittanceId,
      new Types.ObjectId(entityId),
      accountType
    );

    if (!deleted) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "VAT remittance record not found",
          data: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: MessageResponse.Success,
        description: "VAT remittance deleted successfully",
        data: null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Error deleting VAT remittance", error, {
      userId: auth?.context?.userId?.toString(),
    });
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: error.message || "Failed to delete VAT remittance",
        data: null,
      },
      { status: 500 }
    );
  }
}

