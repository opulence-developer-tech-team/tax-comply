import { invoiceController } from "@/lib/server/invoice/controller";
import { invoiceValidator } from "@/lib/server/invoice/validator";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, AccountType } from "@/lib/server/utils/enum";
import { logger } from "@/lib/server/utils/logger";

async function handler(request: Request): Promise<NextResponse> {
  try {
    await connectDB();

    if (request.method !== "POST") {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Method not allowed", data: null },
        { status: 405 }
      );
    }

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only company and business accounts can create invoices
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to create invoice", {
        userId: auth.context.userId.toString(),
      });
      return accountTypeCheck.response!;
    }

    // Get user's account type to determine which parameter to expect
    const { userService } = await import("@/lib/server/user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "User account type not found", data: null },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    // Parse request body
    let body;
    try {
      body = await request.json();
      // OBSERVABILITY: Log the incoming invoice creation request
      console.log("📝 [API] Invoice Creation Request:", JSON.stringify(body, null, 2));
    } catch (error) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Invalid JSON in request body", data: null },
        { status: 400 }
      );
    }

    // Get entityId from request body (companyId or businessId)
    const entityId = accountType === AccountType.Company ? body.companyId : body.businessId;
    if (!entityId) {
      const paramName = accountType === AccountType.Company ? "companyId" : "businessId";
      return NextResponse.json(
        { message: MessageResponse.Error, description: `${accountType === AccountType.Company ? "Company" : "Business"} ID is required in request body. Please provide ${paramName}.`, data: null },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(entityId)) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: `Invalid ${accountType === AccountType.Company ? "company" : "business"} ID format.`, data: null },
        { status: 400 }
      );
    }

    const entityObjectId = new Types.ObjectId(entityId);

    // SECURITY: Verify user has access to this entity and is owner
    let isOwner = false;
    if (accountType === AccountType.Company) {
      isOwner = await requireOwner(auth.context.userId, entityObjectId);
      if (!isOwner) {
        logger.warn("Unauthorized invoice creation attempt", {
          userId: auth.context.userId.toString(),
          companyId: entityObjectId.toString(),
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have permission to create invoices for this company", data: null },
          { status: 403 }
        );
      }
    } else if (accountType === AccountType.Business) {
      isOwner = await requireBusinessOwner(auth.context.userId, entityObjectId);
      if (!isOwner) {
        logger.warn("Unauthorized invoice creation attempt", {
          userId: auth.context.userId.toString(),
          businessId: entityObjectId.toString(),
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have permission to create invoices for this business", data: null },
          { status: 403 }
        );
      }
    }

    // Convert date strings to Date objects (JSON.stringify converts Date to string)
    // This is critical - the service expects Date objects, not strings
    if (body.issueDate) {
      const issueDate = new Date(body.issueDate);
      if (isNaN(issueDate.getTime())) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid issue date format", data: null },
          { status: 400 }
        );
      }
      // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      // Validate that issue date is >= 2026-01-01
      const minDate = new Date("2026-01-01T00:00:00.000Z");
      if (issueDate < minDate) {
        return NextResponse.json(
          { 
            message: MessageResponse.Error, 
            description: "Invalid issue date. This application only supports invoice dates from January 1, 2026 onward per Nigeria Tax Act 2025.", 
            data: null 
          },
          { status: 400 }
        );
      }
      body.issueDate = issueDate;
    }

    if (body.dueDate) {
      const dueDate = new Date(body.dueDate);
      if (isNaN(dueDate.getTime())) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid due date format", data: null },
          { status: 400 }
        );
      }
      // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
      // Validate that due date is >= 2026-01-01 if provided
      const minDate = new Date("2026-01-01T00:00:00.000Z");
      if (dueDate < minDate) {
        return NextResponse.json(
          { 
            message: MessageResponse.Error, 
            description: "Invalid due date. This application only supports invoice dates from January 1, 2026 onward per Nigeria Tax Act 2025.", 
            data: null 
          },
          { status: 400 }
        );
      }
      body.dueDate = dueDate;
    }

    // Validate invoice data (after date conversion)
    const validation = invoiceValidator.createInvoice(body);
    if (!validation.valid) {
      return validation.response!;
    }

    // entityObjectId is already ObjectId at this point
    // Ensure body has the correct entity ID field for the service
    if (accountType === AccountType.Company) {
      body.companyId = entityObjectId.toString();
    } else {
      body.companyId = entityObjectId.toString(); // Service uses companyId field for both
    }

    // Create invoice
    const newInvoice = await invoiceController.createInvoice(
      auth.context.userId,
      entityObjectId,
      body,
      accountType
    );
    
    // OBSERVABILITY: Log success
    console.log("✅ [API] Invoice Created Successfully");
    
    return newInvoice;
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Unexpected error in invoice creation route", err);
    return NextResponse.json(
      { message: MessageResponse.Error, description: "An unexpected error occurred", data: null },
      { status: 500 }
    );
  }
}

export const POST = handler;





