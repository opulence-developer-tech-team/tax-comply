import { payrollService } from "@/lib/server/payroll/service";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { logger } from "@/lib/server/utils/logger";
import Employee from "@/lib/server/employee/entity";
import { subscriptionService, SUBSCRIPTION_PRICING } from "@/lib/server/subscription/service";
import { SubscriptionPlan, AccountType } from "@/lib/server/utils/enum";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "POST") {
      return NextResponse.json(
        { message: "error", description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { message: "error", description: "Authentication required", data: null },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can generate payroll
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to generate payroll", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
    }

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("@/lib/server/user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { message: "error", description: "User account type not found", data: null },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { message: "error", description: "Invalid JSON in request body", data: null },
        { status: 400 }
      );
    }

    const entityIdParam = accountType === AccountType.Company ? body.companyId : body.businessId;
    const { month, year } = body;

    if (!entityIdParam) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { message: "error", description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required. Please provide ${paramName}.`, data: null },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(entityIdParam)) {
      return NextResponse.json(
        { message: "error", description: `Invalid ${accountType === AccountType.Company ? "company" : "business"} ID format`, data: null },
        { status: 400 }
      );
    }

    const entityId = new Types.ObjectId(entityIdParam);

    // SECURITY: Verify user is the owner of this entity (company or business)
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(auth.context.userId, entityId);
      if (!isOwner) {
        return NextResponse.json(
          { message: "error", description: "You don't have access to this company", data: null },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, entityId);
      if (!isOwner) {
        return NextResponse.json(
          { message: "error", description: "You don't have access to this business", data: null },
          { status: 403 }
        );
      }
    }

    // Check if user's subscription plan includes payroll feature
    // Subscriptions are user-based - authenticated user IS the company owner
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    
    if (!planFeatures?.payroll) {
      const currentPlan = plan.toLowerCase();
      return NextResponse.json(
        { 
          message: "error", 
          description: "Payroll management is available on Company plan (₦8,500/month) and above. Upgrade to unlock this feature.",
          data: {
            upgradeRequired: {
              feature: "payroll",
              currentPlan,
              requiredPlan: "company",
              requiredPlanPrice: 8500,
              reason: "plan_limitation" as const,
            },
          },
        },
        { status: 403 }
      );
    }

    // Validate month
    if (!month || typeof month !== "number" || month < 1 || month > 12) {
      return NextResponse.json(
        { message: "error", description: "Invalid month. Must be between 1 and 12", data: null },
        { status: 400 }
      );
    }

    // Validate year - CRITICAL: This app only supports 2026+ tax laws per Nigeria Tax Act 2025
    if (!year || typeof year !== "number" || year < 2026 || year > 2100) {
      return NextResponse.json(
        { message: "error", description: "Invalid year. This application only supports tax years 2026 and later per Nigeria Tax Act 2025. Year must be between 2026 and 2100", data: null },
        { status: 400 }
      );
    }

    // DEBUG: Comprehensive employee query logging
    logger.info("Checking for active employees", {
      entityId: entityId.toString(),
      entityIdParam: entityIdParam,
      accountType,
      month,
      year,
      userId: auth.context.userId.toString(),
    });

    // CRITICAL: Build query based on account type
    const baseQuery: any = {};
    if (accountType === AccountType.Company) {
      baseQuery.companyId = entityId;
    } else {
      baseQuery.businessId = entityId;
    }

    // Check total employees for this entity (any status)
    const totalEmployees = await Employee.countDocuments({ ...baseQuery });
    
    // Check active employees
    const employeeCount = await Employee.countDocuments({
      ...baseQuery,
      isActive: true,
    });

    // Check inactive employees
    const inactiveEmployeeCount = await Employee.countDocuments({
      ...baseQuery,
      isActive: false,
    });

    // Check employees with null isActive (isActive field must exist per schema)
    const employeesWithNullStatus = await Employee.countDocuments({
      ...baseQuery,
      isActive: null,
    });

    // Get sample employees for debugging
    const sampleEmployees = await Employee.find({ ...baseQuery })
      .select("_id employeeId firstName lastName isActive companyId businessId")
      .limit(5)
      .lean();

    logger.info("Employee count breakdown", {
      entityId: entityId.toString(),
      accountType,
      totalEmployees,
      activeEmployees: employeeCount,
      inactiveEmployees: inactiveEmployeeCount,
      undefinedStatusEmployees: employeesWithNullStatus,
      sampleEmployees: sampleEmployees.map((emp: any) => ({
        _id: emp._id?.toString(),
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        isActive: emp.isActive,
        isActiveType: typeof emp.isActive,
        companyId: emp.companyId?.toString(),
      })),
    });

    if (employeeCount === 0) {
      logger.warn("No active employees found for payroll generation", {
        entityId: entityId.toString(),
        accountType,
        totalEmployees,
        inactiveEmployeeCount,
        undefinedStatusEmployees: employeesWithNullStatus,
        message: totalEmployees > 0 
          ? `Found ${totalEmployees} total employees, but ${inactiveEmployeeCount} are inactive and ${employeesWithNullStatus} have undefined status. Only employees with isActive === true are included.`
          : "No employees found for this company.",
      });

      return NextResponse.json(
        { 
          message: "error", 
          description: totalEmployees > 0
            ? `No active employees found. Found ${totalEmployees} total employee${totalEmployees !== 1 ? "s" : ""}, but ${inactiveEmployeeCount} ${inactiveEmployeeCount !== 1 ? "are" : "is"} inactive and ${employeesWithNullStatus} ${employeesWithNullStatus !== 1 ? "have" : "has"} undefined status. Please ensure employees are set to active status.`
            : "No active employees found. Please add employees before generating payroll.",
          data: null 
        },
        { status: 400 }
      );
    }

    console.log("[payroll/generate route] Calling generatePayrollForAllEmployees", {
      entityId: entityId.toString(),
      accountType,
      month,
      year,
      employeeCount,
    });

    // Generate payroll for all active employees
    const payrolls = await payrollService.generatePayrollForAllEmployees(
      entityId,
      month,
      year,
      accountType
    );

    console.log("[payroll/generate route] Payrolls generated", {
      payrollCount: payrolls.length,
      payrolls: payrolls.map(p => ({
        _id: p._id?.toString(),
        employeeId: p.employeeId?.toString(),
        grossSalary: p.grossSalary,
        paye: p.paye,
        netSalary: p.netSalary,
        companyId: p.companyId?.toString(),
        businessId: p.businessId?.toString(),
        payrollMonth: p.payrollMonth,
        payrollYear: p.payrollYear,
      })),
      entityId: entityId.toString(),
      accountType,
      month,
      year,
    });

    // Ensure payroll schedule exists (workflow status only, totals calculated on-the-fly)
    console.log("[payroll/generate route] Ensuring payroll schedule exists", {
      entityId: entityId.toString(),
      accountType,
      month,
      year,
    });

    const schedule = await payrollService.ensurePayrollSchedule(
      entityId,
      month,
      year,
      accountType
    );

    console.log("[payroll/generate route] Payroll schedule ensured", {
      scheduleId: schedule._id?.toString(),
      entityId: entityId.toString(),
      accountType,
      month,
      year,
    });

    logger.info("Payroll generated successfully", {
      entityId: entityId.toString(),
      accountType,
      month,
      year,
      employeeCount: employeeCount,
      payrollCount: payrolls.length,
    });

    return NextResponse.json({
      message: "success",
      description: `Payroll generated successfully for ${payrolls.length} employee${payrolls.length !== 1 ? "s" : ""}`,
      data: {
        payrolls,
        schedule,
        employeeCount: payrolls.length,
      },
    });
  } catch (error: any) {
    logger.error("Error generating payroll", error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      { 
        message: "error", 
        description: err.message || "An error occurred while generating payroll", 
        data: null 
      },
      { status: 500 }
    );
  }
}

export const POST = handler;

