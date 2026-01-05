import { expenseController } from "@/lib/server/expense/controller";
import { requireAuth, requireOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, HttpMethod, AccountType } from "@/lib/server/utils/enum";
import { ExpenseSortField } from "@/lib/server/utils/expense-sort-field";
import { SortOrder } from "@/lib/server/utils/sort-order";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    const userId = new Types.ObjectId(auth.context.userId);

    if (request.method === HttpMethod.POST) {
      const body = await request.json();
      // OBSERVABILITY: Log expense creation request
      console.log("📝 [API] Expense Creation Request:", JSON.stringify(body, null, 2));
      
      // accountId is required in body (can be companyId or user._id for individual)
      if (!body.accountId) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Account ID is required in request body.", data: null },
          { status: 400 }
        );
      }

      // Validate accountId format (must be valid ObjectId)
      if (!Types.ObjectId.isValid(body.accountId)) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid account ID format.", data: null },
          { status: 400 }
        );
      }

      // If accountType is company, verify user is the owner of the company
      if (body.accountType === AccountType.Company) {
        const companyId = new Types.ObjectId(body.accountId);
        const isOwner = await requireOwner(auth.context.userId, companyId);
        if (!isOwner) {
          return NextResponse.json(
            { message: MessageResponse.Error, description: "You don't have access to this company.", data: null },
            { status: 403 }
          );
        }
      }

      const newExpense = await expenseController.createExpense(userId, body);
      
      // OBSERVABILITY: Log success
      console.log("✅ [API] Expense Created Successfully");
      
      return newExpense;
    }

    if (request.method === HttpMethod.GET) {
      const { searchParams } = new URL(request.url);
      const accountId = searchParams.get("accountId");
      const accountType = searchParams.get("accountType");
      const category = searchParams.get("category");
      const month = searchParams.get("month");
      const year = searchParams.get("year");
      const search = searchParams.get("search")?.trim() || undefined;
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const sortField = searchParams.get("sortField") as ExpenseSortField | null;
      const sortOrder = searchParams.get("sortOrder") as SortOrder | null;

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

      // CRITICAL: Validate year if provided - this app only supports tax years 2026 and onward
      let yearNum: number | undefined;
      if (year) {
        yearNum = parseInt(year);
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
      }

      return await expenseController.getExpenses(userId, accountId, {
        category: category && category !== "all" ? category : undefined,
        year: yearNum,
        month: month ? parseInt(month) : undefined,
        search,
        page,
        limit,
        sortField: sortField || undefined,
        sortOrder: sortOrder || undefined,
      });
    }

    return NextResponse.json(
      { message: MessageResponse.Error, description: "Method not allowed", data: null },
      { status: 405 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: MessageResponse.Error, description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const POST = handler;
export const GET = handler;





