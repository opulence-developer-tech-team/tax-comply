import { expenseController } from "@/lib/server/expense/controller";
import { requireAuth, requireOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { AccountType } from "@/lib/server/utils/enum";
import { Types } from "mongoose";
import { MessageResponse } from "@/lib/server/utils/enum";

async function handler(request: Request): Promise<NextResponse> {
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
    const accountId = searchParams.get("accountId");
    const accountType = searchParams.get("accountType");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!accountId) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Account ID is required in query parameters.", data: null },
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

    if (!year) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Year is required in query parameters.", data: null },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    if (isNaN(yearNum) || yearNum < 2026) {
      return NextResponse.json(
        { 
          message: MessageResponse.Error, 
          description: `Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.`, 
          data: null 
        },
        { status: 400 }
      );
    }

    // Month is optional - if not provided, returns yearly summary (aggregates all months)
    const monthNum = month ? parseInt(month) : undefined;

    // If accountType is company, verify user is the owner of the company
    if (accountType === AccountType.Company) {
      const companyId = new Types.ObjectId(accountId);
      const isOwner = await requireOwner(auth.context.userId, companyId);
      if (!isOwner) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have access to this company.", data: null },
          { status: 403 }
        );
      }
    }

    return await expenseController.getExpenseSummary(
      userId,
      accountId,
      yearNum,
      monthNum
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: MessageResponse.Error, description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;





