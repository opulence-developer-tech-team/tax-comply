/**
 * Expense Report Export API Route
 * 
 * Generates PDF exports of expense reports with watermark support based on subscription plan.
 * Supports both monthly and yearly expense reports.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOwner } from "@/lib/server/middleware/auth";
import { expenseService } from "@/lib/server/expense/service";
import { subscriptionService, SUBSCRIPTION_PRICING } from "@/lib/server/subscription/service";
import { logger } from "@/lib/server/utils/logger";
import { connectDB } from "@/lib/server/utils/db";
import { generateExpenseReportPDF } from "@/lib/server/export/expense-pdf";
import { SubscriptionPlan, SubscriptionStatus, AccountType, MessageResponse } from "@/lib/server/utils/enum";
import { Types } from "mongoose";

async function handler(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "GET") {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const { searchParams } = new URL(request.url);

    // CRITICAL: Validate query parameters - fail loudly if missing or invalid
    const accountIdParam = searchParams.get("accountId");
    if (!accountIdParam) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "accountId is required in query parameters", data: null },
        { status: 400 }
      );
    }
    if (!Types.ObjectId.isValid(accountIdParam)) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Invalid accountId format", data: null },
        { status: 400 }
      );
    }
    const accountId = new Types.ObjectId(accountIdParam);

    const accountTypeParam = searchParams.get("accountType");
    if (!accountTypeParam) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "accountType is required in query parameters", data: null },
        { status: 400 }
      );
    }
    if (accountTypeParam !== AccountType.Company && accountTypeParam !== AccountType.Individual) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid accountType. Must be ${AccountType.Company} or ${AccountType.Individual}`,
          data: null,
        },
        { status: 400 }
      );
    }
    const accountType = accountTypeParam as AccountType;

    // Verify ownership
    const isOwner = await requireOwner(auth.context.userId, accountId);
    if (!isOwner) {
      logger.warn("User attempted to export expenses without permission", {
        userId: auth.context.userId.toString(),
        accountId: accountId.toString(),
      });
      return NextResponse.json(
        { message: MessageResponse.Error, description: "You don't have permission to export expenses for this account", data: null },
        { status: 403 }
      );
    }

    // Parse year and month
    const yearParam = searchParams.get("year");
    if (!yearParam) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "year is required in query parameters", data: null },
        { status: 400 }
      );
    }
    const year = parseInt(yearParam);
    if (isNaN(year) || !isFinite(year)) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Invalid year format", data: null },
        { status: 400 }
      );
    }

    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (year < 2026 || year > 2100) {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Invalid year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`,
          data: null,
        },
        { status: 400 }
      );
    }

    const monthParam = searchParams.get("month");
    let month: number | undefined;
    if (monthParam) {
      month = parseInt(monthParam);
      if (isNaN(month) || !isFinite(month) || month < 1 || month > 12) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid month. Must be between 1 and 12", data: null },
          { status: 400 }
        );
      }
    }

    // Get subscription to determine watermark - CRITICAL: Check both plan AND status
    // Subscriptions are user-based
    const subscription = await subscriptionService.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const isActiveSubscription = subscription?.status === SubscriptionStatus.Active;

    // Determine if watermark is required
    // Watermark is required for Free plan or expired subscriptions
    const shouldWatermark = !isActiveSubscription || plan === SubscriptionPlan.Free;
    const watermark = shouldWatermark ? "taxcomply.com.ng" : undefined;

    // Generate PDF
    const pdfBuffer = await generateExpenseReportPDF({
      userId,
      accountId,
      accountType,
      year,
      month,
      watermark,
    });

    // Generate filename
    const monthNames = [
      "",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const filename = month !== undefined
      ? `Expense-Report-${monthNames[month]}-${year}.pdf`
      : `Expense-Report-${year}.pdf`;

    // Return PDF as response
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Error exporting expense report", err);
    return NextResponse.json(
      { message: MessageResponse.Error, description: err.message || "Failed to export expense report", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;


