import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { whtService } from "./service";
import { ICreateWHTRecord, IUpdateWHTRemittance } from "./interface";
import { requireAuth, requireAccountType, requireOwner, requireBusinessOwner } from "../middleware/auth";
import { logger } from "../utils/logger";
import { WHTType } from "../tax/calculator";
import { subscriptionService, SUBSCRIPTION_PRICING } from "../subscription/service";
import { SubscriptionPlan, AccountType, TransactionType } from "../utils/enum";

/**
 * WHT Controller
 * Handles API requests for Withholding Tax operations
 * Reference: NRS (Nigeria Revenue Service) - https://www.firs.gov.ng/ (Note: NRS was rebranded as NRS effective January 1, 2026)
 */

/**
 * POST /api/v1/wht/record
 * Create a WHT record
 * Company accounts only
 */
export async function createWHTRecord(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { success: false, description: "Unauthorized" },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can create WHT records
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response ?? NextResponse.json(
        { success: false, description: "WHT is only available for company and business accounts" },
        { status: 403 }
      );
    }

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("../user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { success: false, description: "User account type not found" },
        { status: 500 }
      );
    }
    const userAccountType = user.accountType as AccountType;

    const body = await req.json();
    const {
      companyId,
      businessId,
      accountId,
      accountType,
      transactionType,
      transactionId,
      payeeName,
      payeeTIN,
      paymentAmount,
      whtType,
      paymentDate,
      description,
      notes,
    } = body;

    // Get entityId based on account type
    const entityId = userAccountType === AccountType.Company ? companyId : businessId;

    // Validation
    if (!entityId || !accountId || !payeeName || !paymentAmount || !whtType || !paymentDate) {
      const entityName = userAccountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { success: false, description: `Missing required fields: ${entityName} is required` },
        { status: 400 }
      );
    }

    if (!Object.values(WHTType).includes(whtType)) {
      return NextResponse.json(
        { success: false, description: "Invalid WHT type" },
        { status: 400 }
      );
    }

    if (paymentAmount <= 0) {
      return NextResponse.json(
        { success: false, description: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Verify entity ownership (company or business)
    let isOwner = false;
    if (userAccountType === AccountType.Company) {
      isOwner = await requireOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this company" },
          { status: 403 }
        );
      }
    } else if (userAccountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this business" },
          { status: 403 }
        );
      }
    }

    // Check subscription plan for WHT tracking feature
    // Subscriptions are user-based - authenticated user IS the entity owner
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    if (!planFeatures?.whtTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        { 
          success: false, 
          description: "WHT management is available on Starter plan (₦3,500/month) and above. Upgrade to track WHT deductions, remittances, and credits.",
          data: {
            upgradeRequired: {
              feature: "WHT Management",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation" as const,
            },
          },
        },
        { status: 403 }
      );
    }

    const whtRecord = await whtService.createWHTRecord({
      companyId: new Types.ObjectId(entityId),
      accountId: new Types.ObjectId(accountId),
      accountType: accountType,
      transactionType: transactionType || TransactionType.Manual,
      transactionId: transactionId ? new Types.ObjectId(transactionId) : undefined,
      payeeName,
      payeeTIN: payeeTIN,
      paymentAmount,
      whtType,
      paymentDate,
      description: description || "",
      notes: notes || "",
    });

    return NextResponse.json({
      success: true,
      data: whtRecord,
    });
  } catch (error: any) {
    logger.error("Error creating WHT record", error);
    return NextResponse.json(
      { success: false, description: error.message || "Failed to create WHT record" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/wht/records
 * Get WHT records for a company
 * Company accounts only
 */
export async function getWHTRecords(req: NextRequest) {
  // DEBUG: Log WHT records fetch request
  const { logger } = await import("../utils/logger");
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { success: false, description: "Unauthorized" },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can access WHT records
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response ?? NextResponse.json(
        { success: false, description: "WHT is only available for company and business accounts" },
        { status: 403 }
      );
    }

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("../user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { success: false, description: "User account type not found" },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    const { searchParams } = new URL(req.url);
    // Accept both companyId and businessId query parameters based on account type
    const entityId = accountType === AccountType.Company 
      ? searchParams.get("companyId")
      : searchParams.get("businessId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const whtType = searchParams.get("whtType");

    if (!entityId) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { success: false, description: `${paramName} is required` },
        { status: 400 }
      );
    }

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    // Validate year if provided
    if (year) {
      const yearNum = parseInt(year);
      if (isNaN(yearNum) || yearNum < 2026 || yearNum > 2100) {
        return NextResponse.json(
          { success: false, description: `Invalid year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.` },
          { status: 400 }
        );
      }
    }

    // Verify entity ownership (company or business)
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this company" },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this business" },
          { status: 403 }
        );
      }
    }

    // Check subscription plan for WHT tracking feature
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    if (!planFeatures?.whtTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        { 
          success: false, 
          description: "WHT management is available on Starter plan (₦3,500/month) and above. Upgrade to track WHT deductions, remittances, and credits.",
          data: {
            upgradeRequired: {
              feature: "WHT Management",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation" as const,
            },
          },
        },
        { status: 403 }
      );
    }

    const records = await whtService.getWHTRecords(new Types.ObjectId(entityId), {
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      whtType: whtType as WHTType | undefined,
    });

    // DEBUG: Log WHT records fetch
    logger.info("📋 WHT records fetched", {
      entityId,
      month: month || "all",
      year: year || "all",
      whtType: whtType || "all",
      recordCount: records.length,
      invoiceRecords: records.filter(r => r.transactionType === TransactionType.Invoice).length,
      expenseRecords: records.filter(r => r.transactionType === TransactionType.Expense).length,
      manualRecords: records.filter(r => r.transactionType === TransactionType.Manual).length,
      totalWHTAmount: records.reduce((sum, r) => sum + (r.whtAmount ?? 0), 0),
    });

    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error: any) {
    logger.error("Error fetching WHT records", error);
    return NextResponse.json(
      { success: false, description: error.message || "Failed to fetch WHT records" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/wht/remittance
 * Get WHT remittance records
 * Company accounts only
 */
export async function getWHTRemittances(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { success: false, description: "Unauthorized" },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can access WHT remittances
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response ?? NextResponse.json(
        { success: false, description: "WHT remittances are only available for company and business accounts" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url); // Extract search params once
    
    // Get user's account type to determine which parameter to expect
    const { userService } = await import("../user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { success: false, description: "User account type not found" },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    // Accept both companyId and businessId query parameters based on account type
    const entityId = accountType === AccountType.Company 
      ? searchParams.get("companyId")
      : searchParams.get("businessId");
    const year = searchParams.get("year");

    if (!entityId) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { success: false, description: `${paramName} is required` },
        { status: 400 }
      );
    }

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    // Validate year if provided
    if (year) {
      const yearNum = parseInt(year);
      if (isNaN(yearNum) || yearNum < 2026 || yearNum > 2100) {
        return NextResponse.json(
          { success: false, description: `Invalid year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.` },
          { status: 400 }
        );
      }
    }

    // Verify company ownership
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this company" },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this business" },
          { status: 403 }
        );
      }
    }

    // Check subscription plan for WHT tracking feature
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    if (!planFeatures?.whtTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        { 
          success: false, 
          description: "WHT management is available on Starter plan (₦3,500/month) and above. Upgrade to track WHT deductions, remittances, and credits.",
          data: {
            upgradeRequired: {
              feature: "WHT Management",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation" as const,
            },
          },
        },
        { status: 403 }
      );
    }

    const remittances = await whtService.getCompanyWHTRemittances(
      new Types.ObjectId(entityId),
      year ? parseInt(year) : undefined
    );

    return NextResponse.json({
      success: true,
      data: remittances,
    });
  } catch (error: any) {
    logger.error("Error fetching WHT remittances", error);
    return NextResponse.json(
      { success: false, description: error.message || "Failed to fetch WHT remittances" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/wht/remittance
 * Create a new WHT remittance record manually
 * Company and Business accounts
 */
export async function createWHTRemittance(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { success: false, description: "Unauthorized" },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can access WHT remittances
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response ?? NextResponse.json(
        { success: false, description: "WHT remittances are only available for company and business accounts" },
        { status: 403 }
      );
    }

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("../user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { success: false, description: "User account type not found" },
        { status: 500 }
      );
    }
    const userAccountType = user.accountType as AccountType;

    const body = await req.json();
    const { companyId, businessId, remittanceMonth, remittanceYear, remittanceAmount, remittanceDate, remittanceReference, remittanceReceipt } = body;

    // Get entityId based on account type
    const entityId = userAccountType === AccountType.Company ? companyId : businessId;

    // CRITICAL: Validate required fields
    if (!entityId) {
      const entityName = userAccountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { success: false, description: `${entityName} is required` },
        { status: 400 }
      );
    }

    if (remittanceMonth === undefined || remittanceMonth === null) {
      return NextResponse.json(
        { success: false, description: "remittanceMonth is required" },
        { status: 400 }
      );
    }

    if (remittanceYear === undefined || remittanceYear === null) {
      return NextResponse.json(
        { success: false, description: "remittanceYear is required" },
        { status: 400 }
      );
    }

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (isNaN(remittanceYear) || remittanceYear < 2026 || remittanceYear > 2100) {
      return NextResponse.json(
        { success: false, description: `Invalid remittanceYear. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.` },
        { status: 400 }
      );
    }

    if (remittanceMonth < 1 || remittanceMonth > 12) {
      return NextResponse.json(
        { success: false, description: "remittanceMonth must be between 1 and 12" },
        { status: 400 }
      );
    }

    if (remittanceAmount === undefined || remittanceAmount === null || remittanceAmount < 0) {
      return NextResponse.json(
        { success: false, description: "remittanceAmount is required and must be >= 0" },
        { status: 400 }
      );
    }

    if (!remittanceDate) {
      return NextResponse.json(
        { success: false, description: "remittanceDate is required" },
        { status: 400 }
      );
    }

    if (!remittanceReference || remittanceReference.trim() === "") {
      return NextResponse.json(
        { success: false, description: "remittanceReference is required" },
        { status: 400 }
      );
    }

    // Verify company/business ownership
    let isOwner = false;
    if (userAccountType === AccountType.Company) {
      isOwner = await requireOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this company" },
          { status: 403 }
        );
      }
    } else if (userAccountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this business" },
          { status: 403 }
        );
      }
    }

    // Check subscription plan for WHT tracking feature
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    if (!planFeatures?.whtTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        { 
          success: false, 
          description: "WHT management is available on Starter plan (₦3,500/month) and above. Upgrade to track WHT deductions, remittances, and credits.",
          data: {
            upgradeRequired: {
              feature: "WHT Management",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation" as const,
            },
          },
        },
        { status: 403 }
      );
    }

    const remittance = await whtService.createWHTRemittance({
      companyId: entityId,
      remittanceMonth,
      remittanceYear,
      remittanceAmount,
      remittanceDate: new Date(remittanceDate),
      remittanceReference,
      remittanceReceipt,
    });

    return NextResponse.json({
      success: true,
      data: remittance,
    });
  } catch (error: any) {
    logger.error("Error creating WHT remittance", error);
    return NextResponse.json(
      { success: false, description: error.message || "Failed to create WHT remittance" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/wht/remittance
 * Mark WHT remittance as remitted (or update existing remittance)
 * Company and Business accounts
 */
export async function markWHTRemitted(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { success: false, description: "Unauthorized" },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can access WHT remittances
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response ?? NextResponse.json(
        { success: false, description: "WHT remittances are only available for company and business accounts" },
        { status: 403 }
      );
    }

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("../user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { success: false, description: "User account type not found" },
        { status: 500 }
      );
    }
    const userAccountType = user.accountType as AccountType;

    const body = await req.json();
    const { companyId, businessId, remittanceMonth, remittanceYear, remittanceDate, remittanceReference, remittanceReceipt, remittanceAmount } = body;

    // Get entityId based on account type
    const entityId = userAccountType === AccountType.Company ? companyId : businessId;

    if (!entityId || remittanceMonth === undefined || remittanceYear === undefined || !remittanceDate) {
      const entityName = userAccountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { success: false, description: `Missing required fields: ${entityName} is required` },
        { status: 400 }
      );
    }

    // CRITICAL: Validate remittanceAmount if provided
    if (remittanceAmount !== undefined && remittanceAmount !== null) {
      if (typeof remittanceAmount !== "number" || isNaN(remittanceAmount) || !isFinite(remittanceAmount)) {
        return NextResponse.json(
          { success: false, description: `Invalid remittanceAmount. Must be a valid number. Received: ${remittanceAmount}` },
          { status: 400 }
        );
      }
      if (remittanceAmount < 0) {
        return NextResponse.json(
          { success: false, description: `Invalid remittanceAmount. Must be >= 0. Received: ${remittanceAmount}` },
          { status: 400 }
        );
      }
    }

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    // Validate remittanceYear
    if (isNaN(remittanceYear) || remittanceYear < 2026 || remittanceYear > 2100) {
      return NextResponse.json(
        { success: false, description: `Invalid remittanceYear. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.` },
        { status: 400 }
      );
    }

    // Verify company ownership
    let isOwner = false;
    if (userAccountType === AccountType.Company) {
      isOwner = await requireOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this company" },
          { status: 403 }
        );
      }
    } else if (userAccountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this business" },
          { status: 403 }
        );
      }
    }

    // Check subscription plan for WHT tracking feature
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    if (!planFeatures?.whtTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        { 
          success: false, 
          description: "WHT management is available on Starter plan (₦3,500/month) and above. Upgrade to track WHT deductions, remittances, and credits.",
          data: {
            upgradeRequired: {
              feature: "WHT Management",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation" as const,
            },
          },
        },
        { status: 403 }
      );
    }

    const remittance = await whtService.markWHTRemitted(
      new Types.ObjectId(entityId),
      remittanceMonth,
      remittanceYear,
      {
        remittanceDate: new Date(remittanceDate),
        remittanceReference: remittanceReference || "",
        remittanceReceipt: remittanceReceipt || "",
        remittanceAmount: remittanceAmount !== undefined && remittanceAmount !== null ? remittanceAmount : undefined,
      }
    );

    if (!remittance) {
      return NextResponse.json(
        { success: false, description: "WHT remittance not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: remittance,
    });
  } catch (error: any) {
    logger.error("Error marking WHT remittance", error);
    return NextResponse.json(
      { success: false, description: error.message || "Failed to mark WHT remittance" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/wht/summary
 * Get WHT summary
 * Company accounts only
 */
export async function getWHTSummary(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { success: false, description: "Unauthorized" },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can access WHT summary
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response ?? NextResponse.json(
        { success: false, description: "WHT is only available for company and business accounts" },
        { status: 403 }
      );
    }

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("../user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { success: false, description: "User account type not found" },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    const { searchParams } = new URL(req.url);
    // Accept both companyId and businessId query parameters based on account type
    const entityId = accountType === AccountType.Company 
      ? searchParams.get("companyId")
      : searchParams.get("businessId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!entityId || !month || !year) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { success: false, description: `${paramName}, month, and year are required` },
        { status: 400 }
      );
    }

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    // Validate year
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2026 || yearNum > 2100) {
      return NextResponse.json(
        { success: false, description: `Invalid year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.` },
        { status: 400 }
      );
    }

    // Verify entity ownership (company or business)
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this company" },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, new Types.ObjectId(entityId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this business" },
          { status: 403 }
        );
      }
    }

    // Check subscription plan for WHT tracking feature
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    if (!planFeatures?.whtTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        { 
          success: false, 
          description: "WHT management is available on Starter plan (₦3,500/month) and above. Upgrade to track WHT deductions, remittances, and credits.",
          data: {
            upgradeRequired: {
              feature: "WHT Management",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation" as const,
            },
          },
        },
        { status: 403 }
      );
    }

    const summary = await whtService.getWHTSummary(
      new Types.ObjectId(entityId),
      parseInt(month),
      parseInt(year)
    );

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error("Error fetching WHT summary", error);
    return NextResponse.json(
      { success: false, description: error.message || "Failed to fetch WHT summary" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/wht/credits
 * Get WHT credits for an account
 * Company and Individual accounts
 */
export async function getWHTCredits(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { success: false, description: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const taxYear = searchParams.get("taxYear");

    if (!accountId || !taxYear) {
      return NextResponse.json(
        { success: false, description: "accountId and taxYear are required" },
        { status: 400 }
      );
    }

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    // Validate taxYear
    const yearNum = parseInt(taxYear);
    if (isNaN(yearNum) || yearNum < 2026 || yearNum > 2100) {
      return NextResponse.json(
        { success: false, description: `Invalid taxYear. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.` },
        { status: 400 }
      );
    }

    // Verify account ownership (company or individual)
    // For WHT credits, accountId can be either companyId or individual accountId
    // We need to check if user owns the company (if it's a company account)
    const Company = (await import("../company/entity")).default;
    const company = await Company.findById(accountId);
    if (company) {
      // It's a company account - verify ownership
      const isOwner = await requireOwner(auth.context.userId, new Types.ObjectId(accountId));
      if (!isOwner) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this account" },
          { status: 403 }
        );
      }
    } else {
      // For individual accounts, accountId should match userId
      // In a full implementation, you'd have an Individual entity
      // For now, we'll allow if accountId matches userId (simplified)
      if (accountId !== auth.context.userId.toString()) {
        return NextResponse.json(
          { success: false, description: "Unauthorized: You don't own this account" },
          { status: 403 }
        );
      }
    }

    const totalCredits = await whtService.getTotalWHTCredits(
      new Types.ObjectId(accountId),
      parseInt(taxYear)
    );

    return NextResponse.json({
      success: true,
      data: {
        accountId,
        taxYear: parseInt(taxYear),
        totalCredits,
      },
    });
  } catch (error: any) {
    logger.error("Error fetching WHT credits", error);
    return NextResponse.json(
      { success: false, description: error.message || "Failed to fetch WHT credits" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/wht/record/:id
 * Delete a WHT record
 * Company accounts only
 */
export async function deleteWHTRecord(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { success: false, description: "Unauthorized" },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can access WHT remittances
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      return accountTypeCheck.response ?? NextResponse.json(
        { success: false, description: "WHT remittances are only available for company and business accounts" },
        { status: 403 }
      );
    }

    const { WHTRecord } = await import("./entity");
    const whtRecord = await WHTRecord.findById(params.id).lean();

    if (!whtRecord) {
      return NextResponse.json(
        { success: false, description: "WHT record not found" },
        { status: 404 }
      );
    }

    // Verify company ownership
    const isOwner = await requireOwner(auth.context.userId, whtRecord.companyId);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, description: "Unauthorized: You don't own this company" },
        { status: 403 }
      );
    }

    // Check subscription plan for WHT tracking feature
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    if (!planFeatures?.whtTracking) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        { 
          success: false, 
          description: "WHT management is available on Starter plan (₦3,500/month) and above. Upgrade to track WHT deductions, remittances, and credits.",
          data: {
            upgradeRequired: {
              feature: "WHT Management",
              currentPlan,
              requiredPlan: "starter",
              requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              reason: "plan_limitation" as const,
            },
          },
        },
        { status: 403 }
      );
    }

    const deleted = await whtService.deleteWHTRecord(new Types.ObjectId(params.id));

    if (!deleted) {
      return NextResponse.json(
        { success: false, description: "Failed to delete WHT record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: "WHT record deleted successfully" },
    });
  } catch (error: any) {
    logger.error("Error deleting WHT record", error);
    return NextResponse.json(
      { success: false, description: error.message || "Failed to delete WHT record" },
      { status: 500 }
    );
  }
}

