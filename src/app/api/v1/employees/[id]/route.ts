import { employeeController } from "@/lib/server/employee/controller";
import { employeeService } from "@/lib/server/employee/service";
import { employeeValidator } from "@/lib/server/employee/validator";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { logger } from "@/lib/server/utils/logger";
import { MessageResponse, SubscriptionPlan, AccountType, HttpMethod } from "@/lib/server/utils/enum";
import { subscriptionService} from "@/lib/server/subscription/service";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";

async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectDB();

    // Await params in Next.js 15+
    const { id } = await params;

    // Convert employeeId to ObjectId and validate format
    let employeeObjectId: Types.ObjectId;
    try {
      employeeObjectId = new Types.ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { message: "error", description: "Invalid employee ID format", data: null },
        { status: 400 }
      );
    }

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { message: "error", description: "Authentication required", data: null },
        { status: 401 }
      );
    }

    // SECURITY: Only company and business accounts can access employees
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to access employee", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
    }

    // Get user's account type to determine ownership check method
    const { userService } = await import("@/lib/server/user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "User account type not found", data: null },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    // GET: Retrieve employee
    if (request.method === "GET") {
      // SECURITY: Verify user has access to the entity that owns this employee
      // First, get employee to check companyId
      const employee = await employeeService.getEmployeeById(employeeObjectId);
      if (!employee) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Employee not found", data: null },
          { status: 404 }
        );
      }

      // Determine entityId from employee
      const employeeEntityId = employee.companyId || employee.businessId;
      if (!employeeEntityId) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Employee has no associated entity ID", data: null },
          { status: 500 }
        );
      }

      // SECURITY: Verify user is the owner of the entity that owns this employee
      let isOwner = false;
      if (accountType === AccountType.Company) {
        isOwner = await requireOwner(auth.context.userId, employeeEntityId);
      } else if (accountType === AccountType.Business) {
        isOwner = await requireBusinessOwner(auth.context.userId, employeeEntityId);
      }
      
      if (!isOwner) {
        logger.warn("Unauthorized employee access attempt", {
          userId: auth.context.userId.toString(),
          employeeId: employeeObjectId.toString(),
          employeeEntityId: employeeEntityId.toString(),
          accountType,
        });

        return NextResponse.json(
          { message: MessageResponse.Error, description: "You do not have permission to access this employee", data: null },
          { status: 403 }
        );
      }

      // Get employee using controller
      return await employeeController.getEmployee(employeeObjectId);
    }

    // Handle PUT - Update Employee
    if (request.method === HttpMethod.PUT) {
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return NextResponse.json(
          { message: "error", description: "Invalid JSON in request body", data: null },
          { status: 400 }
        );
      }

      // Get employee first to check if it exists and verify ownership
      const existingEmployee = await employeeService.getEmployeeById(employeeObjectId);

      if (!existingEmployee) {
        return NextResponse.json(
          { message: "error", description: "Employee not found", data: null },
          { status: 404 }
        );
      }

      // Determine entityId from existing employee
      const existingEmployeeEntityId = existingEmployee.companyId || existingEmployee.businessId;
      if (!existingEmployeeEntityId) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Employee has no associated entity ID", data: null },
          { status: 500 }
        );
      }

      // SECURITY: Verify user is the owner of the entity that owns this employee
      let isOwner = false;
      if (accountType === AccountType.Company) {
        isOwner = await requireOwner(auth.context.userId, existingEmployeeEntityId);
      } else if (accountType === AccountType.Business) {
        isOwner = await requireBusinessOwner(auth.context.userId, existingEmployeeEntityId);
      }
      
      if (!isOwner) {
        logger.warn("Unauthorized employee update attempt", {
          userId: auth.context.userId.toString(),
          employeeId: employeeObjectId.toString(),
          employeeEntityId: existingEmployeeEntityId.toString(),
          accountType,
        });

        return NextResponse.json(
          { message: MessageResponse.Error, description: "You do not have permission to update this employee", data: null },
          { status: 403 }
        );
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

      // Validate request body using Joi schema
      const validation = employeeValidator.updateEmployee(body);
      if (!validation.valid) {
        return validation.response!;
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

      // Update employee using controller
      return await employeeController.updateEmployee(
        auth.context.userId,
        employeeObjectId,
        body
      );
    }

    // Handle DELETE - Delete Employee
    if (request.method === HttpMethod.DELETE) {
      // Get employee first to check if it exists and verify ownership
      const existingEmployee = await employeeService.getEmployeeById(employeeObjectId);

      if (!existingEmployee) {
        return NextResponse.json(
          { message: "error", description: "Employee not found", data: null },
          { status: 404 }
        );
      }

      // Determine entityId from existing employee
      const deleteEmployeeEntityId = existingEmployee.companyId || existingEmployee.businessId;
      if (!deleteEmployeeEntityId) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Employee has no associated entity ID", data: null },
          { status: 500 }
        );
      }

      // SECURITY: Verify user is the owner of the entity that owns this employee
      let isOwner = false;
      if (accountType === AccountType.Company) {
        isOwner = await requireOwner(auth.context.userId, deleteEmployeeEntityId);
      } else if (accountType === AccountType.Business) {
        isOwner = await requireBusinessOwner(auth.context.userId, deleteEmployeeEntityId);
      }
      if (!isOwner) {
        logger.warn("Unauthorized employee deletion attempt", {
          userId: auth.context.userId.toString(),
          employeeId: employeeObjectId.toString(),
          employeeEntityId: deleteEmployeeEntityId.toString(),
          accountType,
        });

        return NextResponse.json(
          { message: MessageResponse.Error, description: "You do not have permission to delete this employee", data: null },
          { status: 403 }
        );
      }

      // Check subscription for payroll access (employee management is part of payroll)
      // Subscriptions are user-based - authenticated user IS the company owner
      const hasPayrollAccess = await subscriptionService.hasFeatureAccess(auth.context.userId, "payroll");
      if (!hasPayrollAccess) {
        const subscription = await subscriptionService.getSubscription(auth.context.userId);
        // CRITICAL: Fail loudly if subscription or plan is missing - no fallbacks
        if (!subscription || !subscription.plan) {
          logger.error(`CRITICAL: Subscription or plan missing when checking payroll access for user ${auth.context.userId.toString()}. Subscription exists: ${subscription ? "yes" : "no"}, Plan: ${subscription?.plan || "missing"}`);
          return NextResponse.json(
            {
              message: MessageResponse.Error,
              description: "CRITICAL: Subscription information is missing. Please contact support.",
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

      // Delete employee using controller
      return await employeeController.deleteEmployee(
        employeeObjectId,
        deleteEmployeeEntityId,
        auth.context.userId
      );
    }

    return NextResponse.json(
      { message: MessageResponse.Error, description: "Method not allowed", data: null },
      { status: 405 }
    );
  } catch (error: any) {
    // CRITICAL: Fail loudly - log the error with full details
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Error in employees/[id] route", err, {
      url: request.url,
      method: request.method,
    });
    return NextResponse.json(
      { message: MessageResponse.Error, description: "An error occurred while processing your request", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const PUT = handler;
export const DELETE = handler;

