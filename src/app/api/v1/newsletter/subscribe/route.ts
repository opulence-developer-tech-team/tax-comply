"use server";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = subscribeSchema.safeParse(body);

    if (!result.success) {
      // result.error is the ZodError instance
      const errorMessage = result.error.issues[0]?.message || "Invalid email";
      return NextResponse.json(
        { 
          success: false, 
          message: errorMessage
        },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // TODO: Integrate with actual email service (Mailchimp, SendGrid, etc.) or database
    console.log(`[Newsletter] New subscriber: ${email}`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return NextResponse.json(
      { 
        success: true, 
        message: "You've been successfully subscribed to our newsletter." 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Newsletter] Subscription error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "An unexpected error occurred. Please try again later." 
      },
      { status: 500 }
    );
  }
}
