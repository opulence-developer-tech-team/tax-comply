import { businessController } from "@/lib/server/business/controller";
import { requireAuth, requireAccountType } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { logger } from "@/lib/server/utils/logger";
import { AccountType } from "@/lib/server/utils/enum";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "GET") {
      return NextResponse.json(
        { message: "error", description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only business accounts can have businesses
    const accountTypeCheck = await requireAccountType(auth.context.userId, AccountType.Business);
    if (!accountTypeCheck.allowed) {
      logger.warn("Non-business account attempted to list businesses", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
    }

    return await businessController.getUserBusinesses(auth.context.userId);
  } catch (error: any) {
    return NextResponse.json(
      { message: "error", description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;



