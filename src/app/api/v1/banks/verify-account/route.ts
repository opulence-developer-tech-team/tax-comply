import { bankService } from "@/lib/server/bank/service";
import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";

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
      return auth.response || NextResponse.json(
        { message: "error", description: "Authentication required", data: null },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const accountNumber = url.searchParams.get("accountNumber");
    const bankCode = url.searchParams.get("bankCode");

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { message: "error", description: "Account number and bank code are required", data: null },
        { status: 400 }
      );
    }

    const result = await bankService.verifyAccountNumber(accountNumber, bankCode);

    if (!result.valid) {
      return NextResponse.json(
        { message: "error", description: result.error || "Account verification failed", data: null },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "success",
      description: "Account verified successfully",
      data: {
        accountName: result.accountName,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: "error", description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;













