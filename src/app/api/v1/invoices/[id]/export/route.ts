/**
 * Invoice Export API Route
 * 
 * Generates PDF or CSV exports of invoices with watermark support based on subscription plan.
 * NRS-compliant formats for Nigerian tax compliance.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOwner, requireBusinessOwner } from "@/lib/server/middleware/auth";
import { invoiceService } from "@/lib/server/invoice/service";
import { subscriptionService, SUBSCRIPTION_PRICING } from "@/lib/server/subscription/service";
import { companyService } from "@/lib/server/company/service";
import { businessService } from "@/lib/server/business/service";
import { logger } from "@/lib/server/utils/logger";
import { connectDB } from "@/lib/server/utils/db";
import { generateInvoicePDF } from "@/lib/server/export/invoice-pdf";
import { generateInvoiceCSV } from "@/lib/server/export/invoice-csv";
import { SubscriptionPlan, SubscriptionStatus } from "@/lib/server/utils/enum";
import { Types } from "mongoose";
import { ICompany } from "@/lib/server/company/interface";

export async function GET(
  request: NextRequest,
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
        { message: "error", description: "Invalid invoice ID format", data: null },
        { status: 400 }
      );
    }

    // Authenticate user
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.context) {
      return auth.response || NextResponse.json(
        { message: "error", description: "Authentication required", data: null },
        { status: 401 }
      );
    }

    const format = request.nextUrl.searchParams.get("format") || "pdf"; // pdf or csv

    if (format !== "pdf" && format !== "csv") {
      return NextResponse.json(
        { message: "error", description: "Invalid format. Must be 'pdf' or 'csv'", data: null },
        { status: 400 }
      );
    }

    // Fetch invoice
    const invoice = await invoiceService.getInvoiceById(invoiceId);
    if (!invoice) {
      return NextResponse.json(
        { message: "error", description: "Invoice not found", data: null },
        { status: 404 }
      );
    }

    // SECURITY & ENTITY RETRIEVAL: Check if it's a Company or Business invoice
    // Invoice uses companyId or businessId
    const entityId = invoice.companyId || invoice.businessId;

    if (!entityId) {
       return NextResponse.json(
        { message: "error", description: "Invoice is not linked to any Company or Business", data: null },
        { status: 500 }
      );
    }
    
    let entity: any = null;
    let isOwner = false;
    let isCompany = true;

    // Try Company first
    entity = await companyService.getCompanyById(entityId);
    
    if (entity) {
      isOwner = await requireOwner(auth.context.userId, entityId);
    } else {
      // Try Business
      entity = await businessService.getBusinessById(entityId);
      if (entity) {
        isCompany = false;
        isOwner = await requireBusinessOwner(auth.context.userId, entityId);
      }
    }

    if (!entity) {
      return NextResponse.json(
        { message: "error", description: "Entity (Company or Business) not found", data: null },
        { status: 404 }
      );
    }

    if (!isOwner) {
       return NextResponse.json(
        { message: "error", description: "You don't have access to this invoice", data: null },
        { status: 403 }
      );
    }

    // Prepare entity for PDF generator (normalize to ICompany interface)
    // Business entities need to be mapped to ICompany shape (cacNumber <- businessRegistrationNumber)
    const companyForPdf = isCompany ? entity : {
      ...entity,
      cacNumber: entity.businessRegistrationNumber, 
      name: entity.name,
      address: entity.address,
      city: entity.city,
      state: entity.state,
      country: entity.country,
      phoneNumber: entity.phoneNumber,
      email: entity.email,
      website: entity.website,
      tin: entity.tin,
    } as ICompany;

    // Get subscription to determine watermark - CRITICAL: Check both plan AND status
    // Subscriptions are user-based - authenticated user IS the company owner
    const subscription = await subscriptionService.getSubscription(auth.context.userId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const isActiveSubscription = subscription?.status === SubscriptionStatus.Active;
    
    // Only apply watermark if:
    // 1. Plan has watermark feature enabled, AND
    // 2. Subscription is not active (expired/cancelled) OR plan is Free
    const pricing = SUBSCRIPTION_PRICING[plan as SubscriptionPlan];
    const planRequiresWatermark = pricing?.features?.watermark === true;
    const shouldWatermark = planRequiresWatermark && (!isActiveSubscription || plan === SubscriptionPlan.Free);
    
    // Watermark text based on plan
    const watermarkText = shouldWatermark 
      ? (plan === SubscriptionPlan.Free ? "FREE PLAN" : "TRIAL EXPIRED")
      : undefined;

    // Generate export based on format
    if (format === "pdf") {
      const pdfBuffer = await generateInvoicePDF({
        invoice,
        company: companyForPdf,
        watermark: watermarkText,
      });

      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
        },
      });
    } else {
      // CSV format (watermark not applicable but kept for consistency)
      const csvContent = await generateInvoiceCSV({
        invoice,
        company: companyForPdf,
        watermark: watermarkText, // Not used in CSV but kept for API consistency
      });

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="Invoice-${invoice.invoiceNumber}.csv"`,
        },
      });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Error exporting invoice", err);
    return NextResponse.json(
      { message: "error", description: err.message || "Failed to export invoice", data: null },
      { status: 500 }
    );
  }
}
