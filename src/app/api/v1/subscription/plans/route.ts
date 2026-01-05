import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { getPricingPlans } from "@/lib/server/subscription/get-pricing-plans";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "GET") {
      return NextResponse.json(
        { message: "error", description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    // Use the shared server-side function
    const plans = await getPricingPlans();

    return NextResponse.json({
      message: "success",
      description: "Pricing plans retrieved successfully",
      data: plans,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: "error", description: "An error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;









