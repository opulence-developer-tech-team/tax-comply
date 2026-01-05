import { payrollService } from "@/lib/server/payroll/service";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, AccountType, HttpMethod } from "@/lib/server/utils/enum";
import { logger } from "@/lib/server/utils/logger";

async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectDB();

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only company and business accounts can access payroll schedules
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to access payroll schedule", {
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

    // Await params in Next.js 15+
    const { id } = await params;

    // CRITICAL: Validate schedule ID format
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Invalid payroll schedule ID format.", data: null },
        { status: 400 }
      );
    }

    const scheduleId = new Types.ObjectId(id);

    // GET: Get payroll schedule by ID with payroll records
    if (request.method === HttpMethod.GET) {
      try {
        const schedule = await payrollService.getPayrollScheduleById(scheduleId);
        
        if (!schedule) {
          return NextResponse.json(
            { message: MessageResponse.Error, description: "Payroll schedule not found.", data: null },
            { status: 404 }
          );
        }

        // Determine entityId and scheduleAccountType from schedule
        const scheduleEntityId = schedule.companyId || schedule.businessId;
        if (!scheduleEntityId) {
          return NextResponse.json(
            { message: MessageResponse.Error, description: "Payroll schedule has no associated entity ID.", data: null },
            { status: 500 }
          );
        }
        const scheduleAccountType = schedule.companyId ? AccountType.Company : AccountType.Business;

        // SECURITY: Verify user is the owner of the entity that owns this schedule
        let isOwner = false;
        if (scheduleAccountType === AccountType.Company) {
          isOwner = await requireOwner(auth.context.userId, scheduleEntityId);
        } else if (scheduleAccountType === AccountType.Business) {
          isOwner = await requireBusinessOwner(auth.context.userId, scheduleEntityId);
        }
        
        if (!isOwner) {
          logger.warn("User attempted to view payroll schedule without permission", {
            userId: auth.context.userId.toString(),
            scheduleId: scheduleId.toString(),
            entityId: scheduleEntityId.toString(),
            scheduleAccountType,
          });
          return NextResponse.json(
            { message: MessageResponse.Error, description: "You don't have permission to view this payroll schedule.", data: null },
            { status: 403 }
          );
        }

        // Fetch payroll records for this schedule
        const payrolls = await payrollService.getCompanyPayrolls(
          scheduleEntityId,
          schedule.month,
          schedule.year,
          scheduleAccountType
        );

        return NextResponse.json({
          message: MessageResponse.Success,
          description: "Payroll schedule retrieved successfully.",
          data: {
            schedule,
            payrolls,
          },
        });
      } catch (error: any) {
        // CRITICAL: Fail loudly - return error message from service
        const errorMessage = error instanceof Error ? error.message : "An error occurred while fetching payroll schedule.";
        logger.error("Error fetching payroll schedule", error, {
          scheduleId: scheduleId.toString(),
          userId: auth.context.userId.toString(),
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: errorMessage, data: null },
          { status: 400 }
        );
      }
    }

    // DELETE: Delete payroll schedule
    if (request.method === HttpMethod.DELETE) {
      try {
        // Get schedule first to verify ownership
        const schedule = await payrollService.getPayrollScheduleById(scheduleId);
        if (!schedule) {
          return NextResponse.json(
            { message: MessageResponse.Error, description: "Payroll schedule not found.", data: null },
            { status: 404 }
          );
        }

        // SECURITY: Verify user is the owner of the entity that owns this schedule
        let isOwner = false;
        // Check for entity ownership
        const entityId = schedule.companyId || schedule.businessId;
        if (!entityId) {
          return NextResponse.json(
             { message: MessageResponse.Error, description: "Schedule has no associated entity ID", data: null },
             { status: 500 }
          );
        }

        if (accountType === AccountType.Company) {
          isOwner = await requireOwner(auth.context.userId, entityId);
        } else if (accountType === AccountType.Business) {
          isOwner = await requireBusinessOwner(auth.context.userId, entityId);
        }
        
        if (!isOwner) {
          logger.warn("User attempted to delete payroll schedule without permission", {
            userId: auth.context.userId.toString(),
            scheduleId: scheduleId.toString(),
            entityId: entityId.toString(),
            accountType,
          });
          return NextResponse.json(
            { message: MessageResponse.Error, description: "You don't have permission to delete this payroll schedule.", data: null },
            { status: 403 }
          );
        }

        // Delete schedule (service method handles the actual deletion)
        const deleted = await payrollService.deletePayrollSchedule(scheduleId);
        
        if (!deleted) {
          return NextResponse.json(
            { message: MessageResponse.Error, description: "Payroll schedule not found.", data: null },
            { status: 404 }
          );
        }

        return NextResponse.json({
          message: MessageResponse.Success,
          description: "Payroll schedule deleted successfully.",
          data: null,
        });
      } catch (error: any) {
        // CRITICAL: Fail loudly - return error message from service
        const errorMessage = error instanceof Error ? error.message : "An error occurred while deleting payroll schedule.";
        logger.error("Error deleting payroll schedule", error, {
          scheduleId: scheduleId.toString(),
          userId: auth.context.userId.toString(),
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: errorMessage, data: null },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: MessageResponse.Error, description: "Method not allowed. Only GET and DELETE are supported.", data: null },
      { status: 405 }
    );
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Unexpected error in payroll schedule delete route", err, {
      error: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { message: MessageResponse.Error, description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const DELETE = handler;

