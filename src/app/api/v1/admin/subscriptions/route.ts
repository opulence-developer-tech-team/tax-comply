import { requireAdminAuth } from "@/lib/server/middleware/admin-auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { MessageResponse } from "@/lib/server/utils/enum";
import { Subscription } from "@/lib/server/subscription/entity";

export async function GET(request: Request) {
  try {
    await connectDB();

    const auth = await requireAdminAuth();
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    const subscriptions = await Subscription.find({})
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
        message: MessageResponse.Success,
        description: "Subscriptions retrieved successfully",
        data: subscriptions // Direct array return
    });

  } catch (error: any) {
    console.error("Admin Subscriptions API Error:", error);
    return NextResponse.json(
      { message: "error", description: "Internal Server Error", data: null },
      { status: 500 }
    );
  }
}
