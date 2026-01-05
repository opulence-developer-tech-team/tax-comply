import { invoiceController } from "@/lib/server/invoice/controller";
import { invoiceValidator } from "@/lib/server/invoice/validator";
import { requireAuth, requireOwner, requireAccountType, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { MessageResponse, AccountType, HttpMethod } from "@/lib/server/utils/enum";
import { logger } from "@/lib/server/utils/logger";
import { invoiceService } from "@/lib/server/invoice/service";

async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await connectDB();

    // Await params in Next.js 15+
    const { id } = await params;

    // Convert invoiceId to ObjectId and validate format
    let invoiceId: Types.ObjectId;
    try {
      invoiceId = new Types.ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "Invalid invoice ID format", data: null },
        { status: 400 }
      );
    }

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // SECURITY: Only company and business accounts can access invoices
    const accountTypeCheck = await requireAccountType(auth.context.userId, [AccountType.Company, AccountType.Business]);
    if (!accountTypeCheck.allowed) {
      logger.warn("Individual account attempted to access invoice", {
        userId: auth.context.userId.toString(),
        invoiceId: invoiceId.toString(),
      });
      return accountTypeCheck.response!;
    }

    // Get user's account type to determine ownership check method
    const { userService } = await import("@/lib/server/user/service");
    const user = await userService.getUserById(auth.context.userId);
    if (!user || !user.accountType) {
      return NextResponse.json(
        { message: MessageResponse.Error, description: "User account type not found", data: null },
        { status: 500 }
      );
    }
    const accountType = user.accountType as AccountType;

    // GET: Retrieve invoice
    if (request.method === HttpMethod.GET) {
      // Get invoice first to check if it exists and get companyId
      const invoice = await invoiceService.getInvoiceById(invoiceId);
      
      if (!invoice) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invoice not found", data: null },
          { status: 404 }
        );
      }

      // SECURITY: Verify user is the owner of the entity that owns this invoice
      let isOwner = false;
      if (accountType === AccountType.Company) {
        isOwner = await requireOwner(auth.context.userId, invoice.companyId);
      } else if (accountType === AccountType.Business) {
        isOwner = await requireBusinessOwner(auth.context.userId, invoice.companyId);
      }
      
      if (!isOwner) {
        logger.warn("Unauthorized invoice access attempt", {
          userId: auth.context.userId.toString(),
          invoiceId: invoiceId.toString(),
          invoiceCompanyId: invoice.companyId.toString(),
          accountType,
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have permission to view this invoice", data: null },
          { status: 403 }
        );
      }

      // Return invoice if user has permission
      return invoiceController.getInvoice(invoiceId);
    }

    // PUT: Update invoice (only drafts)
    if (request.method === HttpMethod.PUT) {
      // Parse request body
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invalid JSON in request body", data: null },
          { status: 400 }
        );
      }

      // Validate request body
      const validation = invoiceValidator.updateInvoice(body);
      if (!validation.valid) {
        return validation.response!;
      }

      // Get invoice to verify ownership and status
      const invoice = await invoiceService.getInvoiceById(invoiceId);
      if (!invoice) {
        return NextResponse.json(
          { message: MessageResponse.Error, description: "Invoice not found", data: null },
          { status: 404 }
        );
      }

      // SECURITY: Verify user is the owner of the entity that owns this invoice
      let isOwner = false;
      if (accountType === AccountType.Company) {
        isOwner = await requireOwner(auth.context.userId, invoice.companyId);
      } else if (accountType === AccountType.Business) {
        isOwner = await requireBusinessOwner(auth.context.userId, invoice.companyId);
      }
      
      if (!isOwner) {
        logger.warn("Unauthorized invoice update attempt", {
          userId: auth.context.userId.toString(),
          invoiceId: invoiceId.toString(),
          invoiceCompanyId: invoice.companyId.toString(),
          accountType,
        });
        return NextResponse.json(
          { message: MessageResponse.Error, description: "You don't have permission to update this invoice", data: null },
          { status: 403 }
        );
      }

      // Convert dates from strings to Date objects if provided
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

      if (body.dueDate !== undefined) {
        if (body.dueDate === null || body.dueDate === "") {
          body.dueDate = null;
        } else {
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
      }

      // Update invoice (controller will check if it's a draft)
      return await invoiceController.updateInvoice(
        auth.context.userId,
        invoiceId,
        body,
        accountType
      );
    }

    // Method not allowed
    return NextResponse.json(
      { message: MessageResponse.Error, description: "Method not allowed", data: null },
      { status: 405 }
    );
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    logger.error("Unexpected error in invoice route", err);
    return NextResponse.json(
      { message: MessageResponse.Error, description: "An unexpected error occurred", data: null },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const PUT = handler;

