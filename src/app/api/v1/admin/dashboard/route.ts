import { requireAdminAuth } from "@/lib/server/middleware/admin-auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { MessageResponse, SubscriptionStatus } from "@/lib/server/utils/enum";
import User from "@/lib/server/user/entity";
import Company from "@/lib/server/company/entity";
import { Subscription } from "@/lib/server/subscription/entity";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "GET") {
      return NextResponse.json(
        { message: "error", description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    const auth = await requireAdminAuth();
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // Fetch all admin dashboard data
    const [totalUsers, totalCompanies, totalSubscriptions, activeSubscriptions, users, companies, subscriptions] = await Promise.all([
      User.countDocuments({}),
      Company.countDocuments({}),
      Subscription.countDocuments({}),
      Subscription.countDocuments({ status: SubscriptionStatus.Active }),
      User.find({}).select("-password").sort({ createdAt: -1 }).limit(50).lean(),
      Company.find({}).sort({ createdAt: -1 }).limit(50).lean(),
      Subscription.find({}).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    return NextResponse.json({
      message: MessageResponse.Success,
      description: "Admin dashboard data retrieved successfully",
      data: {
        totalUsers,
        totalCompanies,
        totalSubscriptions,
        activeSubscriptions,
        users,
        companies,
        subscriptions,
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











