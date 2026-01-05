import { incomeController } from "@/lib/server/income/controller";
import { incomeValidator } from "@/lib/server/income/validator";
import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, SubscriptionPlan, AccountType, HttpMethod } from "@/lib/server/utils/enum";
import { IncomeSortField } from "@/lib/utils/client-enums";
import { SortOrder } from "@/lib/server/utils/sort-order";
import { subscriptionService } from "@/lib/server/subscription/service";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);

    if (request.method === HttpMethod.POST) {
      let body;
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
        console.error("JSON parse error:", parseError);
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "Invalid JSON in request body",
            data: null,
          },
          { status: 400 }
        );
      }

      // Validate request body using Joi schema
      const validation = incomeValidator.createIncome(body);
      if (!validation.valid) {
        return validation.response!;
      }

      // After validation, types are guaranteed to be correct
      const { accountId, entityType, taxYear, month, annualIncome } = body;

      // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      const taxYearNum = Number(taxYear);
      if (isNaN(taxYearNum) || taxYearNum < 2026) {
        return NextResponse.json(
          { 
            message: MessageResponse.Error, 
            description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.", 
            data: null 
          },
          { status: 400 }
        );
      }

      // Validate accountId format (must be valid ObjectId)
      if (!Types.ObjectId.isValid(accountId)) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid account ID format.", data: null },
          { status: 400 }
        );
      }

      // CRITICAL: Check subscription limits for income sources (individual accounts only)
      if (entityType === "individual") {
        const subscription = await subscriptionService.getSubscription(userId);
        const plan = subscription?.plan || SubscriptionPlan.Free;
        const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
        const incomeSourcesLimit = planFeatures?.incomeSources as number | undefined;

        // Count existing income sources for this account
        // Use incomeService directly to get count (more efficient than fetching all)
        const { incomeService } = await import("@/lib/server/income/service");
        const existingIncomes = await incomeService.getIncomesByAccount(
          accountId,
          entityType
        );
        const currentCount = existingIncomes?.length || 0;

        // Check limit (unlimited = -1)
        if (
          incomeSourcesLimit !== undefined &&
          incomeSourcesLimit !== -1 &&
          currentCount >= incomeSourcesLimit
        ) {
          const currentPlan = plan.toLowerCase();
          const requiredPlan =
            plan === SubscriptionPlan.Free ? "starter" : "company";
          const requiredPlanPrice =
            plan === SubscriptionPlan.Free
              ? SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly
              : SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly;

          return NextResponse.json(
            {
              message: MessageResponse.Error,
              description: `You've reached your income source limit (${incomeSourcesLimit} sources for ${plan} plan). ${plan === SubscriptionPlan.Free ? "Upgrade to Starter plan (₦3,500/month) for 10 income sources." : "Upgrade to Company plan (₦8,500/month) for unlimited income sources."}`,
              data: {
                upgradeRequired: {
                  feature: "income_sources",
                  currentPlan,
                  requiredPlan,
                  requiredPlanPrice,
                  reason: "usage_limit_reached",
                  usageInfo: {
                    current: currentCount,
                    limit: incomeSourcesLimit,
                    period: "lifetime",
                  },
                },
              },
            },
            { status: 403 }
          );
        }
      }

      return await incomeController.createIncome(userId, {
        accountId: String(accountId),
        entityType: entityType as AccountType,
        taxYear: Number(taxYear),
        month: month !== undefined && month !== null ? Number(month) : null,
        annualIncome: Number(annualIncome),
      });
    }

    if (request.method === HttpMethod.GET) {
      const accountId = searchParams.get("accountId");
      const entityType = searchParams.get("entityType") as AccountType | null;
      const taxYear = searchParams.get("taxYear");

      if (!accountId || !entityType) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "accountId and entityType are required",
            data: null,
          },
          { status: 400 }
        );
      }

      // Validate accountId format (must be valid ObjectId)
      if (!Types.ObjectId.isValid(accountId)) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid account ID format.", data: null },
          { status: 400 }
        );
      }

      // If taxYear is provided WITHOUT pagination params, get specific income record
      const hasPaginationParams = searchParams.has("page") || searchParams.has("limit") || searchParams.has("search") || searchParams.has("year");
      if (taxYear && !hasPaginationParams) {
        // CRITICAL: Validate tax year - this app only supports tax years 2026 and onward
        const taxYearNum = parseInt(taxYear);
        if (isNaN(taxYearNum) || taxYearNum < 2026) {
          return NextResponse.json(
            { 
              message: MessageResponse.Error, 
              description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.", 
              data: null 
            },
            { status: 400 }
          );
        }
        
        const monthParam = searchParams.get("month");
        const month = monthParam ? parseInt(monthParam) : null;
        
        // Validate month if provided
        if (month !== null && (isNaN(month) || month < 1 || month > 12)) {
          return NextResponse.json(
            {
              message: MessageResponse.Error,
              description: "month must be between 1 and 12",
              data: null,
            },
            { status: 400 }
          );
        }
        
        return await incomeController.getIncome(
          userId,
          accountId,
          entityType,
          taxYearNum,
          month
        );
      }

      // NEW: Use paginated endpoint with filters (defaults to current year)
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      
      // CRITICAL: Validate year if provided - this app only supports tax years 2026 and onward
      let year: number | undefined = undefined;
      const yearParam = searchParams.get("year");
      if (yearParam) {
        const yearNum = parseInt(yearParam);
        if (isNaN(yearNum) || yearNum < 2026) {
          return NextResponse.json(
            { 
              message: MessageResponse.Error, 
              description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.", 
              data: null 
            },
            { status: 400 }
          );
        }
        year = yearNum;
      }
      
      // Month filter - only parse if parameter exists and is not empty
      // CRITICAL: Don't treat "null" string as null - if month param doesn't exist, it's undefined (all months)
      let month: number | null | undefined = undefined;
      const monthParam = searchParams.get("month");
      if (monthParam !== null && monthParam !== undefined && monthParam !== "") {
        const monthNum = parseInt(monthParam);
        if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
          month = monthNum;
        } else {
          // Invalid month parameter
          return NextResponse.json(
            {
              message: MessageResponse.Error,
              description: "month must be between 1 and 12",
              data: null,
            },
            { status: 400 }
          );
        }
      }
      // If monthParam is null/undefined/empty, month stays undefined (means "all months")
      
      const search = searchParams.get("search")?.trim() || undefined;
      const sortField = searchParams.get("sortField") as IncomeSortField | null;
      const sortOrder = searchParams.get("sortOrder") as SortOrder | null;

      // Validate pagination params
      if (page < 1) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "page must be >= 1", data: null },
          { status: 400 }
        );
      }
      if (limit < 1 || limit > 100) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "limit must be between 1 and 100", data: null },
          { status: 400 }
        );
      }

      // Validate month if provided
      if (month !== undefined && month !== null && (isNaN(month) || month < 1 || month > 12)) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "month must be between 1 and 12",
            data: null,
          },
          { status: 400 }
        );
      }

      return await incomeController.getIncomesByAccountWithFilters(
        userId,
        accountId,
        entityType,
        {
          year,
          month,
          search,
          page,
          limit,
          sortField: sortField || undefined,
          sortOrder: sortOrder || undefined,
        }
      );
    }

    if (request.method === HttpMethod.DELETE) {
      const accountId = searchParams.get("accountId");
      const entityType = searchParams.get("entityType") as AccountType | null;
      const taxYear = searchParams.get("taxYear");
      const monthParam = searchParams.get("month");

      if (!accountId || !entityType || !taxYear) {
        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: "accountId, entityType, and taxYear are required",
            data: null,
          },
          { status: 400 }
        );
      }

      // CRITICAL: Validate tax year - this app only supports tax years 2026 and onward
      const taxYearNum = parseInt(taxYear);
      if (isNaN(taxYearNum) || taxYearNum < 2026) {
        return NextResponse.json(
          { 
            message: MessageResponse.Error, 
            description: "Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.", 
            data: null 
          },
          { status: 400 }
        );
      }

      // Validate accountId format (must be valid ObjectId)
      if (!Types.ObjectId.isValid(accountId)) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid account ID format.", data: null },
          { status: 400 }
        );
      }

      // Validate month if provided
      let month: number | null = null;
      if (monthParam) {
        const monthNum = parseInt(monthParam);
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
          return NextResponse.json(
            {
              message: MessageResponse.Error,
              description: "month must be between 1 and 12",
              data: null,
            },
            { status: 400 }
          );
        }
        month = monthNum;
      }

      return await incomeController.deleteIncome(
        userId,
        accountId,
        entityType,
        taxYearNum,
        month
      );
    }

    return NextResponse.json(
      { message: MessageResponse.Error, description: "Method not allowed", data: null },
      { status: 405 }
    );
  } catch (error: any) {
    console.error("Income API error:", error);
    return NextResponse.json(
      { 
        message: MessageResponse.Error, 
        description: error?.message || "An error occurred while processing your request", 
        data: null 
      },
      { status: 500 }
    );
  }
}

export const POST = handler;
export const GET = handler;
export const DELETE = handler;

