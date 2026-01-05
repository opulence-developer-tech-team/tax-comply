import { userController } from "@/lib/server/user/controller";
import { requireAuth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { HttpMethod, MessageResponse } from "@/lib/server/utils/enum";
import { Types } from "mongoose";

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
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid JSON in request body.", data: null },
          { status: 400 }
        );
      }

      return await userController.changePassword(userId, body);
    }

    return NextResponse.json(
      { message: MessageResponse.Error, description: "Method not allowed. Only POST is supported.", data: null },
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
