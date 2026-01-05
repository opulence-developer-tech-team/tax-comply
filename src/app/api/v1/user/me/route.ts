import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { userService } from "@/lib/server/user/service";
import { utils } from "@/lib/server/utils";
import { MessageResponse } from "@/lib/server/utils/enum";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

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

    const user = await userService.getUserById(new Types.ObjectId(auth.context.userId));

    if (!user) {
      return utils.customResponse({
        status: 404,
        message: MessageResponse.Error,
        description: "User not found",
        data: null,
      }) as NextResponse;
    }

    return utils.customResponse({
      status: 200,
      message: MessageResponse.Success,
      description: "User retrieved successfully",
      data: user,
    }) as NextResponse;
  } catch (error: any) {
    return NextResponse.json(
      { message: "error", description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;





















