import { invoiceController } from "@/lib/server/invoice/controller";
import { connectDB } from "@/lib/server/utils/db";
import { rateLimiter, RATE_LIMITS } from "@/lib/server/utils/rateLimiter";
import { logger } from "@/lib/server/utils/logger";
import { MessageResponse } from "@/lib/server/utils/enum";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

/**
 * Public API endpoint for guest invoice viewing
 * SECURITY:
 * - No authentication required (public access)
 * - Rate limiting applied
 * - Only non-cancelled invoices are accessible
 * - Validates invoice ID format
 */
async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "GET") {
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Method not allowed",
          data: null,
        },
        { status: 405 }
      );
    }

    // Await params in Next.js 15+
    const { id } = await params;

    // Rate limiting for public endpoint (stricter than authenticated)
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = rateLimiter.checkLimit(
      `public-invoice-${clientIp}`,
      RATE_LIMITS.FETCH.maxRequests, // 100 requests per minute
      RATE_LIMITS.FETCH.windowMs
    );

    if (!rateLimitResult.allowed) {
      logger.warn("Rate limit exceeded for public invoice view", {
        clientIp,
        invoiceId: id,
      });
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: `Too many requests. Please wait ${Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          )} seconds before trying again.`,
          data: null,
        },
        { status: 429 }
      );
    }

    // Validate invoice ID format
    if (!id || !Types.ObjectId.isValid(id)) {
      logger.warn("Invalid invoice ID format in public request", {
        invoiceId: id,
        clientIp,
      });
      return NextResponse.json(
        {
          message: MessageResponse.Error,
          description: "Invalid invoice ID format.",
          data: null,
        },
        { status: 400 }
      );
    }

    const invoiceId = new Types.ObjectId(id);

    // Get public invoice (no auth required, but validates invoice exists and is not cancelled)
    return await invoiceController.getPublicInvoice(invoiceId);
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    try {
      const resolvedParams = await params;
      logger.error("Unexpected error in public invoice route", err, {
        invoiceId: resolvedParams?.id,
      });
    } catch {
      logger.error("Unexpected error in public invoice route", err);
    }
    return NextResponse.json(
      {
        message: MessageResponse.Error,
        description: "An unexpected error occurred",
        data: null,
      },
      { status: 500 }
    );
  }
}

export const GET = handler;
















