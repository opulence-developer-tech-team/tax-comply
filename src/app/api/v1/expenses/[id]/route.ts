import { expenseController } from "@/lib/server/expense/controller";
import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, HttpMethod } from "@/lib/server/utils/enum";

async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectDB();

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // Await params in Next.js 15+
    const { id } = await params;

    // Validate expense ID format
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Invalid expense ID format", data: null },
        { status: 400 }
      );
    }

    const userId = new Types.ObjectId(auth.context.userId);
    const expenseId = id;

    if (request.method === HttpMethod.GET) {
      return await expenseController.getExpenseById(userId, expenseId);
    }

    if (request.method === HttpMethod.PUT) {
      const body = await request.json();
      return await expenseController.updateExpense(userId, expenseId, body);
    }

    if (request.method === HttpMethod.DELETE) {
      return await expenseController.deleteExpense(userId, expenseId);
    }

    return NextResponse.json(
      { message: "error", description: "Method not allowed", data: null },
      { status: 405 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "error", description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const PUT = handler;
export const DELETE = handler;









