import { userController } from "@/lib/server/user/controller";
import { utils } from "@/lib/server/utils";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "POST") {
      return utils.customResponse({
        status: 405,
        message: "error" as any,
        description: "Method not allowed. Only POST requests are supported.",
        data: null,
      }) as NextResponse;
    }

    return await userController.logout();
  } catch (error: any) {
    return utils.customResponse({
      status: 500,
      message: "error" as any,
      description: "An unexpected error occurred during logout.",
      data: null,
    }) as NextResponse;
  }
}

export const POST = utils.withErrorHandling(handler);





















