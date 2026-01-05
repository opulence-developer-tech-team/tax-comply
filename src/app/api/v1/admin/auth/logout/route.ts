import { adminController } from "@/lib/server/admin/controller";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";

async function handler(request: Request): Promise<NextResponse> {
  try {
    // No DB connection needed - logout only clears cookies/tokens
    if (request.method !== "POST") {
      return NextResponse.json(
        { message: "error", description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    const response = await adminController.logout();

    return response as NextResponse;
  } catch (error: any) {
    return NextResponse.json(
      { message: "error", description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const POST = handler;

