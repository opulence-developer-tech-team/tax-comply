import { payrollService } from "@/lib/server/payroll/service";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, AccountType, HttpMethod } from "@/lib/server/utils/enum";
import { PayrollStatus } from "@/lib/server/utils/payroll-status";
import { logger } from "@/lib/server/utils/logger";

async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectDB();

    // CRITICAL: Only PUT method is allowed
    if (request.method !== HttpMethod.PUT) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Method not allowed. Only PUT is supported.", data: null },
        { status: 405 }
      );
    }

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only company and business accounts can update payroll schedules
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to update payroll schedule status", {
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

    // CRITICAL: Parse and validate request body
    let body: { status?: string };
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Invalid JSON in request body.", data: null },
        { status: 400 }
      );
    }

    // CRITICAL: Validate status is provided
    if (!body.status || typeof body.status !== "string") {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Status is required and must be a string.", data: null },
        { status: 400 }
      );
    }

    // CRITICAL: Validate status is a valid PayrollStatus enum value
    const validStatuses = [PayrollStatus.Draft, PayrollStatus.Approved, PayrollStatus.Submitted];
    if (!validStatuses.includes(body.status as PayrollStatus)) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid status value: "${body.status}". Allowed values: ${validStatuses.join(", ")}.`,
          data: null,
        },
        { status: 400 }
      );
    }

    const status = body.status as PayrollStatus;

    // SECURITY: Get schedule to verify ownership (via service method which calculates totals on-the-fly)
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
      logger.warn("User attempted to update payroll schedule status without permission", {
        userId: auth.context.userId.toString(),
        scheduleId: scheduleId.toString(),
        entityId: scheduleEntityId.toString(),
        scheduleAccountType,
      });
      return NextResponse.json(
        { message: MessageResponse.Error, description: "You don't have permission to update this payroll schedule.", data: null },
        { status: 403 }
      );
    }

    // Update schedule status (includes validation of status transitions)
    try {
      const updatedSchedule = await payrollService.updatePayrollScheduleStatus(scheduleId, status);

      if (!updatedSchedule) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Failed to update payroll schedule status.", data: null },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: MessageResponse.Success,
        description: `Payroll schedule status updated to ${status} successfully.`,
        data: updatedSchedule,
      });
    } catch (error: any) {
      // CRITICAL: Fail loudly - return error message from service
      const errorMessage = error instanceof Error ? error.message : "An error occurred while updating payroll schedule status.";
      logger.error("Error updating payroll schedule status", error, {
        scheduleId: scheduleId.toString(),
        status,
        userId: auth.context.userId.toString(),
      });
      return NextResponse.json(
        { message: MessageResponse.Error, description: errorMessage, data: null },
        { status: 400 }
      );
    }
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Unexpected error in payroll schedule status update route", err, {
      error: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { message: MessageResponse.Error, description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const PUT = handler;




