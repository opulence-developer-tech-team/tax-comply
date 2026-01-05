import { pitController } from "@/lib/server/pit/controller";
import { requireAuth } from "@/lib/server/middleware/auth";
import { requireAccountType } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, SubscriptionPlan } from "@/lib/server/utils/enum";
import { subscriptionService } from "@/lib/server/subscription/service";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { PITEmploymentSource } from "@/lib/utils/client-enums";
import { AccountType } from "@/lib/server/utils/enum";

/**
 * GET /api/v1/pit/employment-deductions
 * Get employment deductions for a tax year
 * 
 * Query params:
 * - accountId: User ID (for individual accounts)
 * - taxYear: Tax year (required)
 * 
 * Subscription: Requires pitTracking feature (available on all plans)
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only individual and business accounts (sole proprietorships) can access PIT features
    // Business accounts use PIT, NOT CIT (Company Income Tax)
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      [AccountType.Individual, AccountType.Business]
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);

    const accountId = searchParams.get("accountId");
    const taxYearParam = searchParams.get("taxYear");

    if (!accountId || !taxYearParam) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "accountId and taxYear are required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate accountId format
    if (!Types.ObjectId.isValid(accountId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid account ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate taxYear
    const taxYear = parseInt(taxYearParam);
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (isNaN(taxYear) || taxYear < 2026 || taxYear > 2100) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Check subscription plan for pitTracking feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.pitTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "PIT tracking is not available on your current plan. Please contact support.",
          data: {
            upgradeRequired: {
              feature: "PIT Tracking",
              currentPlan,
              requiredPlan: "free",
              requiredPlanPrice: 0,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    return await pitController.getEmploymentDeductions(userId, accountId, taxYear);
  } catch (error: any) {
    console.error("Employment deductions GET API error:", error);
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: error?.message || "An error occurred while processing your request",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/pit/employment-deductions
 * Create or update employment deductions for a tax year
 * 
 * Body:
 * - accountId: User ID (required)
 * - taxYear: Tax year (required)
 * - annualPension: Annual pension contributions (required, >= 0)
 * - annualNHF: Annual NHF contributions (required, >= 0)
 * - annualNHIS: Annual NHIS contributions (required, >= 0)
 * - source: Source of information (required: "payslip" | "employer_statement" | "manual" | "other")
 * - notes: Optional notes
 * 
 * Subscription: Requires pitTracking feature (available on all plans)
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only individual and business accounts (sole proprietorships) can access PIT features
    // Business accounts use PIT, NOT CIT (Company Income Tax)
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      [AccountType.Individual, AccountType.Business]
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    
    // Safely parse request body
    let body;
    try {
      body = await request.json();
    } catch (error: any) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid request body. Please ensure all required fields are provided.",
          data: null,
        },
        { status: 400 }
      );
    }

    const {
      accountId,
      taxYear,
      annualPension,
      annualNHF,
      annualNHIS,
      // New allowable deductions (2026+)
      annualHousingLoanInterest,
      annualLifeInsurance,
      annualRent, // Annual rent paid (required to calculate rent relief)
      annualRentRelief, // Will be calculated from annualRent (20% capped at ₦500,000)
      source,
      sourceOther,
      notes,
    } = body || {};

    // Validate required fields
    if (
      !accountId ||
      taxYear === undefined ||
      annualPension === undefined ||
      annualNHF === undefined ||
      annualNHIS === undefined ||
      !source
    ) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "accountId, taxYear, annualPension, annualNHF, annualNHIS, and source are required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate accountId format
    if (!Types.ObjectId.isValid(accountId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid account ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate taxYear
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (isNaN(taxYear) || taxYear < 2026 || taxYear > 2100) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate amounts are non-negative
    if (
      annualPension < 0 ||
      annualNHF < 0 ||
      annualNHIS < 0 ||
      (annualHousingLoanInterest !== undefined && annualHousingLoanInterest < 0) ||
      (annualLifeInsurance !== undefined && annualLifeInsurance < 0) ||
      (annualRent !== undefined && annualRent < 0) ||
      (annualRentRelief !== undefined && annualRentRelief < 0)
    ) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Deduction amounts cannot be negative",
          data: null,
        },
        { status: 400 }
      );
    }
    
    // CRITICAL: Validate rent relief calculation (2026+)
    // Rent relief = 20% of annual rent, capped at ₦500,000 per Nigeria Tax Act 2025
    if (taxYear >= 2026) {
      if (annualRent !== undefined && annualRent < 0) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Annual rent cannot be negative",
            data: null,
          },
          { status: 400 }
        );
      }
      // If annualRent is provided, calculate and validate rent relief
      if (annualRent !== undefined && annualRent > 0) {
        const calculatedRentRelief = Math.min(annualRent * 0.20, 500000);
        // If annualRentRelief is also provided, ensure it matches the calculated value
        if (annualRentRelief !== undefined && Math.abs(annualRentRelief - calculatedRentRelief) > 0.01) {
          return NextResponse.json(
            {
              message: MessageResponse.Error,
              description: `Rent relief must be 20% of annual rent (₦${(annualRent * 0.20).toLocaleString()}), capped at ₦500,000. Calculated relief: ₦${calculatedRentRelief.toLocaleString()}`,
              data: null,
            },
            { status: 400 }
          );
        }
      }
      // If annualRentRelief is provided without annualRent, reject it
      if (annualRentRelief !== undefined && annualRentRelief > 0 && (annualRent === undefined || annualRent === 0)) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Annual rent is required to calculate rent relief. Please provide annualRent.",
            data: null,
          },
          { status: 400 }
        );
      }
    }

    // Validate source
    const validSources = [PITEmploymentSource.Payslip, PITEmploymentSource.EmployerStatement, PITEmploymentSource.Manual, PITEmploymentSource.Other];
    if (!validSources.includes(source as PITEmploymentSource)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid source. Must be one of: ${validSources.join(", ")}`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Check subscription plan for pitTracking feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.pitTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "PIT tracking is not available on your current plan. Please contact support.",
          data: {
            upgradeRequired: {
              feature: "PIT Tracking",
              currentPlan,
              requiredPlan: "free",
              requiredPlanPrice: 0,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    return await pitController.upsertEmploymentDeductions(userId, {
      accountId,
      taxYear,
      annualPension,
      annualNHF,
      annualNHIS,
      // New allowable deductions (2026+)
      annualHousingLoanInterest: annualHousingLoanInterest || 0,
      annualLifeInsurance: annualLifeInsurance || 0,
      annualRent: annualRent || 0,
      annualRentRelief: annualRentRelief || 0,
      source,
      sourceOther,
      notes,
    });
  } catch (error: any) {
    console.error("Employment deductions POST API error:", error);
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: error?.message || "An error occurred while processing your request",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/pit/employment-deductions
 * Update employment deductions for a tax year
 * 
 * Query params:
 * - accountId: User ID (required)
 * - taxYear: Tax year (required)
 * 
 * Body:
 * - annualPension: Annual pension contributions (optional, >= 0)
 * - annualNHF: Annual NHF contributions (optional, >= 0)
 * - annualNHIS: Annual NHIS contributions (optional, >= 0)
 * - source: Source of information (optional: "payslip" | "employer_statement" | "manual" | "other")
 * - notes: Optional notes
 * 
 * Subscription: Requires pitTracking feature (available on all plans)
 */
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only individual and business accounts (sole proprietorships) can access PIT features
    // Business accounts use PIT, NOT CIT (Company Income Tax)
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      [AccountType.Individual, AccountType.Business]
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);
    
    // Safely parse request body
    let body;
    try {
      body = await request.json();
    } catch (error: any) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid request body. Please ensure all required fields are provided.",
          data: null,
        },
        { status: 400 }
      );
    }

    const accountId = searchParams.get("accountId");
    const taxYearParam = searchParams.get("taxYear");

    if (!accountId || !taxYearParam) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "accountId and taxYear are required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate accountId format
    if (!Types.ObjectId.isValid(accountId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid account ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate taxYear
    const taxYear = parseInt(taxYearParam);
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (isNaN(taxYear) || taxYear < 2026 || taxYear > 2100) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate amounts are non-negative if provided
    if (
      (body.annualPension !== undefined && body.annualPension < 0) ||
      (body.annualNHF !== undefined && body.annualNHF < 0) ||
      (body.annualNHIS !== undefined && body.annualNHIS < 0) ||
      (body.annualHousingLoanInterest !== undefined && body.annualHousingLoanInterest < 0) ||
      (body.annualLifeInsurance !== undefined && body.annualLifeInsurance < 0) ||
      (body.annualRent !== undefined && body.annualRent < 0) ||
      (body.annualRentRelief !== undefined && body.annualRentRelief < 0)
    ) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Deduction amounts cannot be negative",
          data: null,
        },
        { status: 400 }
      );
    }
    
    // CRITICAL: Validate rent relief calculation (2026+)
    // Rent relief = 20% of annual rent, capped at ₦500,000 per Nigeria Tax Act 2025
    if (taxYear >= 2026) {
      if (body.annualRent !== undefined && body.annualRent < 0) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Annual rent cannot be negative",
            data: null,
          },
          { status: 400 }
        );
      }
      // If annualRent is provided, calculate and validate rent relief
      if (body.annualRent !== undefined && body.annualRent > 0) {
        const calculatedRentRelief = Math.min(body.annualRent * 0.20, 500000);
        // If annualRentRelief is also provided, ensure it matches the calculated value
        if (body.annualRentRelief !== undefined && Math.abs(body.annualRentRelief - calculatedRentRelief) > 0.01) {
          return NextResponse.json(
            {
              message: MessageResponse.Error,
              description: `Rent relief must be 20% of annual rent (₦${(body.annualRent * 0.20).toLocaleString()}), capped at ₦500,000. Calculated relief: ₦${calculatedRentRelief.toLocaleString()}`,
              data: null,
            },
            { status: 400 }
          );
        }
      }
      // If annualRentRelief is provided without annualRent, reject it
      if (body.annualRentRelief !== undefined && body.annualRentRelief > 0 && (body.annualRent === undefined || body.annualRent === 0)) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Annual rent is required to calculate rent relief. Please provide annualRent.",
            data: null,
          },
          { status: 400 }
        );
      }
    }

    // Validate source if provided
    if (body.source) {
      const validSources = [PITEmploymentSource.Payslip, PITEmploymentSource.EmployerStatement, PITEmploymentSource.Manual, PITEmploymentSource.Other];
      if (!validSources.includes(body.source as PITEmploymentSource)) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: `Invalid source. Must be one of: ${validSources.join(", ")}`,
            data: null,
          },
          { status: 400 }
        );
      }

      // Validate: if source is "other", sourceOther must be provided
      if (body.source === PITEmploymentSource.Other && (!body.sourceOther || body.sourceOther.trim() === "")) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Please specify the source when selecting 'Other'",
            data: null,
          },
          { status: 400 }
        );
      }
    }

    // Check subscription plan for pitTracking feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.pitTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "PIT tracking is not available on your current plan. Please contact support.",
          data: {
            upgradeRequired: {
              feature: "PIT Tracking",
              currentPlan,
              requiredPlan: "free",
              requiredPlanPrice: 0,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    return await pitController.updateEmploymentDeductions(
      userId,
      accountId,
      taxYear,
      body
    );
  } catch (error: any) {
    console.error("Employment deductions PUT API error:", error);
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: error?.message || "An error occurred while processing your request",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/pit/employment-deductions
 * Delete employment deductions for a tax year
 * 
 * Query params:
 * - accountId: User ID (required)
 * - taxYear: Tax year (required)
 * 
 * Subscription: Requires pitTracking feature (available on all plans)
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // CRITICAL: Only individual and business accounts (sole proprietorships) can access PIT features
    // Business accounts use PIT, NOT CIT (Company Income Tax)
    const accountTypeCheck = await requireAccountType(
      auth.context.userId,
      [AccountType.Individual, AccountType.Business]
    );
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);

    const accountId = searchParams.get("accountId");
    const taxYearParam = searchParams.get("taxYear");

    if (!accountId || !taxYearParam) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "accountId and taxYear are required",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate accountId format
    if (!Types.ObjectId.isValid(accountId)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid account ID format",
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate taxYear
    const taxYear = parseInt(taxYearParam);
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (isNaN(taxYear) || taxYear < 2026 || taxYear > 2100) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Check subscription plan for pitTracking feature
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;

    if (!planFeatures?.pitTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "PIT tracking is not available on your current plan. Please contact support.",
          data: {
            upgradeRequired: {
              feature: "PIT Tracking",
              currentPlan,
              requiredPlan: "free",
              requiredPlanPrice: 0,
              reason: "plan_limitation",
            },
          },
        },
        { status: 403 }
      );
    }

    return await pitController.deleteEmploymentDeductions(userId, accountId, taxYear);
  } catch (error: any) {
    console.error("Employment deductions DELETE API error:", error);
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: error?.message || "An error occurred while processing your request",
        data: null,
      },
      { status: 500 }
    );
  }
}

