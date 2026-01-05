import { employeeController } from "@/lib/server/employee/controller";
import { employeeService } from "@/lib/server/employee/service";
import { employeeValidator } from "@/lib/server/employee/validator";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, SubscriptionPlan, AccountType, HttpMethod } from "@/lib/server/utils/enum";
import { SortOrder } from "@/lib/server/utils/sort-order";
import { EmployeeSortField as ServerEmployeeSortField } from "@/lib/server/utils/employee-sort-field";
import { logger } from "@/lib/server/utils/logger";
import { subscriptionService, SUBSCRIPTION_PRICING } from "@/lib/server/subscription/service";

async function handler(request: Request): Promise<NextResponse> {
  let auth: any = null; // Declare auth in outer scope for error logging
  try {
    await connectDB();

    auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { message: "error", description: "Authentication required", data: null },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can access employees
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to access employees", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
    }

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

    // Get entityId from query parameter (REQUIRED - no fallback)
    const requestUrl = new URL(request.url);
    const entityIdParam = accountType === AccountType.Company
      ? requestUrl.searchParams.get("companyId")
      : requestUrl.searchParams.get("businessId");
    
    if (!entityIdParam) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { message: MessageResponse.Error, description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required. Please provide ${paramName} in the query parameters.`, data: null },
        { status: 400 }
      );
    }

    // Validate entityId format
    if (!Types.ObjectId.isValid(entityIdParam)) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: `Invalid ${accountType === AccountType.Company ? "company" : "business"} ID format.`, data: null },
        { status: 400 }
      );
    }
    
    const entityId = new Types.ObjectId(entityIdParam);
    
    // SECURITY: Verify user is the owner of this entity (company or business)
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(auth.context.userId, entityId);
      if (!isOwner) {
        logger.warn("Unauthorized employee access attempt", {
          userId: auth.context.userId.toString(),
          companyId: entityId.toString(),
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this company.", data: null },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, entityId);
      if (!isOwner) {
        logger.warn("Unauthorized employee access attempt", {
          userId: auth.context.userId.toString(),
          businessId: entityId.toString(),
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this business.", data: null },
          { status: 403 }
        );
      }
    }

    // Handle POST - Create Employee
    if (request.method === HttpMethod.POST) {
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return NextResponse.json(
          { message: "error", description: "Invalid JSON in request body", data: null },
          { status: 400 }
        );
      }

      // Validate request body using Joi schema
      // Convert entityId to string for validation (ObjectId.toString())
      const validationBody: any = {
        ...body,
      };
      // Set companyId or businessId in validation body based on accountType
      if (accountType === AccountType.Company) {
        validationBody.companyId = entityId.toString();
      } else if (accountType === AccountType.Business) {
        validationBody.businessId = entityId.toString();
      }
      const validation = employeeValidator.createEmployee(validationBody);
      if (!validation.valid) {
        return validation.response!;
      }

      // Check subscription for payroll access (employee management is part of payroll)
      // Subscriptions are user-based - authenticated user IS the company owner
      const hasPayrollAccess = await subscriptionService.hasFeatureAccess(auth.context.userId, "payroll");
      if (!hasPayrollAccess) {
        const subscription = await subscriptionService.getSubscription(auth.context.userId);
        // CRITICAL: Fail loudly if subscription or plan is missing - no defaults
        if (!subscription) {
          logger.error(`Subscription not found for user ${auth.context.userId.toString()}`);
          return NextResponse.json(
            {
              message: MessageResponse.Error,
              description: "Subscription information not found. Please contact support.",
              data: null,
            },
            { status: 500 }
          );
        }
        if (!subscription.plan) {
          logger.error(`Subscription plan is missing for user ${auth.context.userId.toString()}, subscriptionId: ${subscription._id?.toString()}`);
          return NextResponse.json(
            {
              message: MessageResponse.Error,
              description: "Subscription plan information is missing. Please contact support.",
              data: null,
            },
            { status: 500 }
          );
        }
        const currentPlan = subscription.plan;
        const requiredPlan = SubscriptionPlan.Standard; // Payroll starts from Company plan
        const requiredPlanPrice = SUBSCRIPTION_PRICING[requiredPlan].monthly;

        return NextResponse.json(
          {
            message: MessageResponse.Error,
            description: `Employee management is not available on your current ${currentPlan} plan. Upgrade to Company plan to unlock this feature.`,
            data: {
              upgradeRequired: {
                feature: "Employee Management",
                currentPlan: currentPlan.toLowerCase(),
                requiredPlan: requiredPlan.toLowerCase(),
                requiredPlanPrice,
                reason: "plan_limitation",
              },
            },
          },
          { status: 403 }
        );
      }

      // Convert date strings to Date objects (JSON.stringify converts Date to string)
      // This is critical - the controller expects Date objects, not strings
      if (body.dateOfEmployment) {
        const dateOfEmployment = new Date(body.dateOfEmployment);
        if (isNaN(dateOfEmployment.getTime())) {
          return NextResponse.json(
            { message: MessageResponse.Error, description: "Invalid date of employment format", data: null },
            { status: 400 }
          );
        }
        body.dateOfEmployment = dateOfEmployment;
      }

      if (body.dateOfBirth) {
        const dateOfBirth = new Date(body.dateOfBirth);
        if (isNaN(dateOfBirth.getTime())) {
          return NextResponse.json(
            { message: MessageResponse.Error, description: "Invalid date of birth format", data: null },
            { status: 400 }
          );
        }
        body.dateOfBirth = dateOfBirth;
      }

      // Create employee using controller
      return await employeeController.createEmployee(
        auth.context.userId,
        entityId,
        body,
        accountType
      );
    }

    // Handle GET - List Employees
    if (request.method !== "GET") {
      return NextResponse.json(
        { message: "error", description: "Method not allowed", data: null },
        { status: 405 }
      );
    }


    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // CRITICAL: Parse and validate required pagination parameters - fail loudly if missing
    const pageParam = searchParams.get("page");
    if (!pageParam) {
      return NextResponse.json(
        {
          message: "error",
          description: "Required query parameter 'page' is missing",
          data: null,
        },
        { status: 400 }
      );
    }
    const parsedPage = parseInt(pageParam, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      return NextResponse.json(
        {
          message: "error",
          description: "Query parameter 'page' must be a positive integer",
          data: null,
        },
        { status: 400 }
      );
    }
    const page = parsedPage;

    const limitParam = searchParams.get("limit");
    if (!limitParam) {
      return NextResponse.json(
        {
          message: "error",
          description: "Required query parameter 'limit' is missing",
          data: null,
        },
        { status: 400 }
      );
    }
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return NextResponse.json(
        {
          message: "error",
          description: "Query parameter 'limit' must be an integer between 1 and 100",
          data: null,
        },
        { status: 400 }
      );
    }
    const limit = parsedLimit;

    // Optional query parameters
    const search = searchParams.get("search")?.trim() || undefined;
    const isActive = searchParams.get("isActive");

    // CRITICAL: Parse and validate required sortBy parameter - fail loudly if missing
    const sortByParam = searchParams.get("sortBy");
    if (!sortByParam) {
      return NextResponse.json(
        {
          message: "error",
          description: "Required query parameter 'sortBy' is missing",
          data: null,
        },
        { status: 400 }
      );
    }
    if (!Object.values(ServerEmployeeSortField).includes(sortByParam as ServerEmployeeSortField)) {
      return NextResponse.json(
        {
          message: "error",
          description: `Invalid 'sortBy' parameter. Must be one of: ${Object.values(ServerEmployeeSortField).join(", ")}`,
          data: null,
        },
        { status: 400 }
      );
    }
    const sortBy = sortByParam as ServerEmployeeSortField;

    // CRITICAL: Parse and validate required sortOrder parameter - fail loudly if missing
    const sortOrderParam = searchParams.get("sortOrder");
    if (!sortOrderParam) {
      return NextResponse.json(
        {
          message: "error",
          description: "Required query parameter 'sortOrder' is missing",
          data: null,
        },
        { status: 400 }
      );
    }
    if (!Object.values(SortOrder).includes(sortOrderParam as SortOrder)) {
      return NextResponse.json(
        {
          message: "error",
          description: `Invalid 'sortOrder' parameter. Must be one of: ${Object.values(SortOrder).join(", ")}`,
          data: null,
        },
        { status: 400 }
      );
    }
    const sortOrder = sortOrderParam as SortOrder;

    const isActiveFilter = isActive ? isActive === "true" : undefined;
    
    // DEBUG: Log employee query details
    logger.info("Fetching employees", {
      entityId: entityId.toString(),
      accountType,
      isActiveQueryParam: isActive,
      isActiveFilter,
      search,
      page,
      limit,
      userId: auth.context.userId.toString(),
    });

    const result = await employeeService.getCompanyEmployees(
      entityId,
      accountType,
      {
        isActive: isActiveFilter,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      }
    );

    // DEBUG: Log results
    logger.info("Employees fetched", {
      entityId: entityId.toString(),
      accountType,
      totalEmployees: result.total,
      returnedEmployees: result.employees.length,
      isActiveFilter,
      sampleEmployees: result.employees.slice(0, 3).map((emp: any) => ({
        _id: emp._id?.toString(),
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        isActive: emp.isActive,
        isActiveType: typeof emp.isActive,
      })),
    });

    return NextResponse.json({
      message: "success",
      description: "Employees retrieved successfully",
      data: {
        employees: result.employees,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
        },
      },
    });
  } catch (error: any) {
    // CRITICAL: Fail loudly - log the error with full details
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Error in employees route", err, {
      userId: auth?.context?.userId?.toString(),
      url: request.url,
      method: request.method,
    });
    return NextResponse.json(
      { message: "error", description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;









