import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { reviewService } from "@/lib/server/review/service";
import { MessageResponse } from "@/lib/server/utils/enum";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    const reviews = await reviewService.getApprovedReviewsRandom(Math.min(limit, 20));

    return NextResponse.json({
      message: MessageResponse.Success,
      description: "Random reviews retrieved successfully",
      data: reviews,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: MessageResponse.Error, description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}










