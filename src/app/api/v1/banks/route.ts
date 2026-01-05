import { bankService } from "@/lib/server/bank/service";
import { requireAuth } from "@/lib/server/middleware/auth";
import { NextResponse } from "next/server";

async function handler(request: Request): Promise<NextResponse> {
  try {
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

    // Banks are now from hardcoded constants, no database needed
    const banks = await bankService.getAllBanks();

    return NextResponse.json({
      message: "success",
      description: "Banks retrieved successfully",
      data: banks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: "error", description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;

