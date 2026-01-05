import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { HttpMethod } from "@/lib/server/utils/enum";
import { reviewController } from "@/lib/server/review/controller";
import { requireAuth } from "@/lib/server/middleware/auth";
import { MessageResponse } from "@/lib/server/utils/enum";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    const authResult = await requireAuth(request);
    if (!authResult.authorized || !authResult.context) {
      return authResult.response || NextResponse.json(
        { message: MessageResponse.Error, description: "Authentication required", data: null },
        { status: 401 }
      );
    }

    if (request.method === HttpMethod.GET) {
      return reviewController.getUserReview(authResult.context.userId);
    }

    if (request.method === HttpMethod.PUT) {
      const body = await request.json();
      return reviewController.updateReview(authResult.context.userId, body);
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

export const GET = handler;
export const PUT = handler;










