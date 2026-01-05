/**
 * Server-Side Invoice PDF Generator
 * 
 * Generates NRS-compliant invoice PDFs with watermark support based on subscription plan.
 * Uses the same data structure as the client-side generator but adds watermark capability.
 */

import jsPDF from "jspdf";
import { IInvoice } from "../invoice/interface";
import { ICompany } from "../company/interface";
import { connectDB } from "../utils/db";

// Luxury green color palette (RGB values for jsPDF)
const COLORS = {
  primary: [16, 185, 129], // emerald-500
  primaryDark: [5, 150, 105], // emerald-600
  primaryLight: [209, 250, 229], // emerald-100
  text: [15, 23, 42], // slate-900
  textLight: [100, 116, 139], // slate-500
  border: [209, 250, 229], // emerald-100
  background: [240, 253, 250], // emerald-50
  watermark: [200, 200, 200], // Light gray for watermark
  warning: [245, 158, 11], // amber-500 for WHT display
};

interface GenerateInvoicePDFOptions {
  invoice: IInvoice;
  company: ICompany;
  watermark?: string; // Plan name for watermark (e.g., "FREE PLAN") - if undefined, no watermark
}

/**
 * Formats currency in Nigerian Naira format
 */
function formatCurrency(amount: number): string {
  const parts = amount.toFixed(2).split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = `${integerPart}.${parts[1]}`;
  const cleaned = formatted.replace(/[\u200B-\u200D\uFEFF\u00AD\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, "");
  return `NGN ${cleaned}`;
}

/**
 * Formats date in short format (DD/MM/YYYY)
 */
function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Draws a horizontal line
 */
function drawLine(
  doc: jsPDF,
  x1: number,
  y: number,
  x2: number,
  color: number[] = COLORS.border,
  width: number = 0.5
): void {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(width);
  // @ts-ignore - setLineDashPattern may not be in types but exists in jsPDF
  if (typeof doc.setLineDashPattern === "function") {
    doc.setLineDashPattern([], 0);
  }
  doc.line(x1, y, x2, y);
}

/**
 * Draws a filled rectangle (for backgrounds)
 */
function drawRect(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number[] = COLORS.primaryLight,
  border: boolean = false
): void {
  doc.setFillColor(color[0], color[1], color[2]);
  if (border) {
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setLineWidth(0.5);
    doc.rect(x, y, width, height, "FD");
  } else {
    doc.rect(x, y, width, height, "F");
  }
}

/**
 * Adds watermark to PDF
 * Production-ready: Multiple watermark patterns for better visibility and brand protection
 */
function addWatermark(doc: jsPDF, planName: string = "FREE PLAN"): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();

  // Watermark text - more descriptive for better upgrade incentive
  const watermarkText = `${planName} - taxcomply.com.ng`;
  const upgradeText = "Upgrade to remove watermark";

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    
    // Primary diagonal watermark - more visible but not intrusive
    doc.setGState(doc.GState({ opacity: 0.15 })); // Increased from 0.1 for better visibility
    doc.setTextColor(COLORS.watermark[0], COLORS.watermark[1], COLORS.watermark[2]);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    
    // Center diagonal watermark
    doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });
    
    // Secondary watermark - smaller, different angle for better coverage
    doc.setGState(doc.GState({ opacity: 0.08 }));
    doc.setFontSize(28);
    doc.text(watermarkText, pageWidth / 2, pageHeight / 2 + 30, {
      align: "center",
      angle: -45,
    });
    
    // Upgrade message at bottom (subtle)
    doc.setGState(doc.GState({ opacity: 0.12 }));
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(upgradeText, pageWidth / 2, pageHeight - 15, {
      align: "center",
      angle: 0,
    });
    
    doc.restoreGraphicsState();
  }
}

/**
 * Generates a corporate-grade, NRS-compliant invoice PDF
 */
export async function generateInvoicePDF({
  invoice,
  company,
  watermark,
}: GenerateInvoicePDFOptions): Promise<Buffer> {
  await connectDB();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // @ts-ignore - setLineDashPattern may not be in types but exists in jsPDF
  if (typeof doc.setLineDashPattern === "function") {
    doc.setLineDashPattern([], 0);
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // ============================================
  // HEADER SECTION - Luxury Green Branding
  // ============================================

  drawRect(doc, 0, 0, pageWidth, 45, COLORS.background, false);
  drawRect(doc, 0, 0, pageWidth, 2.5, COLORS.primary, false);

  let leftY = 12;
  let rightY = 12;

  // Company Name
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(company.name, margin, leftY);
  leftY += 8;

  // Company Address Block
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);

  const companyInfo: string[] = [];
  if (company.address) companyInfo.push(company.address);
  if (company.city && company.state) {
    companyInfo.push(
      `${company.city}, ${company.state}${company.country ? `, ${company.country}` : ""}`
    );
  } else if (company.state) {
    companyInfo.push(company.state);
  }

  companyInfo.forEach((info) => {
    doc.text(info, margin, leftY);
    leftY += 3.5;
  });

  // Contact Information
  if (company.phoneNumber) {
    doc.text(`Phone: ${company.phoneNumber}`, margin, leftY);
    leftY += 3.5;
  }
  if (company.email) {
    doc.text(`Email: ${company.email}`, margin, leftY);
    leftY += 3.5;
  }
  if (company.website) {
    doc.text(`Website: ${company.website}`, margin, leftY);
    leftY += 3.5;
  }

  // Tax Identification
  const taxInfo: string[] = [];
  if (company.tin) {
    taxInfo.push(`TIN: ${company.tin}`);
  }
  if (company.cacNumber) {
    taxInfo.push(`CAC: ${company.cacNumber}`);
  }

  if (taxInfo.length > 0) {
    leftY += 2;
    taxInfo.forEach((info) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.text(info, margin, leftY);
      leftY += 3.5;
    });
  }

  // Invoice Details - Extreme right aligned
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

  // TAX INVOICE label - extreme right
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text("TAX INVOICE", pageWidth - margin, rightY, { align: "right" });
  rightY += 10;

  // Invoice details - extreme right aligned
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  const addDetailRow = (label: string, value: string, isBold: boolean = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    const fullText = `${label} ${value}`;
    doc.text(fullText, pageWidth - margin, rightY, { align: "right" });
    rightY += 4.5;
  };

  addDetailRow("Invoice Number:", invoice.invoiceNumber, true);
  addDetailRow("Issue Date:", formatDateShort(invoice.issueDate));
  if (invoice.dueDate) {
    addDetailRow("Due Date:", formatDateShort(invoice.dueDate));
  }
  addDetailRow("Status:", invoice.status.toUpperCase(), true);

  yPos = Math.max(leftY, rightY) + 10;

  // ============================================
  // CUSTOMER INFORMATION SECTION
  // ============================================

  drawLine(doc, margin, yPos, pageWidth - margin, COLORS.border, 0.5);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("BILL TO:", margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(invoice.customerName, margin, yPos);
  yPos += 5;

  if (invoice.customerAddress) {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
    const addressLines = doc.splitTextToSize(invoice.customerAddress, contentWidth / 2);
    addressLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 3.5;
    });
  }

  if (invoice.customerEmail) {
    doc.setFontSize(9);
    doc.text(`Email: ${invoice.customerEmail}`, margin, yPos);
    yPos += 3.5;
  }

  if (invoice.customerPhone) {
    doc.setFontSize(9);
    doc.text(`Phone: ${invoice.customerPhone}`, margin, yPos);
    yPos += 3.5;
  }

  if (invoice.customerTIN) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text(`TIN: ${invoice.customerTIN}`, margin, yPos);
    yPos += 3.5;
  }

  yPos += 8;

  // ============================================
  // ITEMS TABLE SECTION
  // ============================================

  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }

  drawLine(doc, margin, yPos, pageWidth - margin, COLORS.border, 0.5);
  yPos += 6;

  const headerHeight = 8;
  const headerY = yPos - headerHeight / 2;
  drawRect(doc, margin, headerY, contentWidth, headerHeight, COLORS.primaryLight, true);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);

  const colWidths = {
    description: 75,
    quantity: 20,
    unitPrice: 35,
    amount: 35,
  };

  const colSpacing = 5;
  const colXPositions = {
    description: margin + 2,
    quantity: margin + colWidths.description + colSpacing,
    unitPrice: margin + colWidths.description + colWidths.quantity + colSpacing * 2,
    amount: margin + colWidths.description + colWidths.quantity + colWidths.unitPrice + colSpacing * 3,
  };

  const amountColumnEnd = colXPositions.amount + colWidths.amount;
  if (amountColumnEnd > pageWidth - margin) {
    const excess = amountColumnEnd - (pageWidth - margin);
    colWidths.description = Math.max(60, colWidths.description - excess);
    colXPositions.quantity = margin + colWidths.description + colSpacing;
    colXPositions.unitPrice = margin + colWidths.description + colWidths.quantity + colSpacing * 2;
    colXPositions.amount =
      margin + colWidths.description + colWidths.quantity + colWidths.unitPrice + colSpacing * 3;
  }

  const headerTextY = headerY + headerHeight / 2 + 1.5;

  doc.text("Description", colXPositions.description, headerTextY);
  doc.text("Qty", colXPositions.quantity + colWidths.quantity - 2, headerTextY, { align: "right" });
  doc.text("Unit Price", colXPositions.unitPrice + colWidths.unitPrice - 2, headerTextY, { align: "right" });
  doc.text("Amount", colXPositions.amount + colWidths.amount - 2, headerTextY, { align: "right" });

  yPos = headerY + headerHeight + 2;
  drawLine(doc, margin, yPos, pageWidth - margin, COLORS.border, 0.5);
  yPos += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

  for (const item of invoice.items) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin + 5;
      const newPageHeaderY = yPos - headerHeight / 2;
      drawRect(doc, margin, newPageHeaderY, contentWidth, headerHeight, COLORS.primaryLight, true);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      const newPageHeaderTextY = newPageHeaderY + headerHeight / 2 + 1.5;
      doc.text("Description", colXPositions.description, newPageHeaderTextY);
      doc.text("Qty", colXPositions.quantity + colWidths.quantity - 2, newPageHeaderTextY, { align: "right" });
      doc.text("Unit Price", colXPositions.unitPrice + colWidths.unitPrice - 2, newPageHeaderTextY, { align: "right" });
      doc.text("Amount", colXPositions.amount + colWidths.amount - 2, newPageHeaderTextY, { align: "right" });
      yPos = newPageHeaderY + headerHeight + 2;
      drawLine(doc, margin, yPos, pageWidth - margin, COLORS.border, 0.5);
      yPos += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    }

    const descriptionLines = doc.splitTextToSize(item.description, colWidths.description - 4);
    doc.text(descriptionLines[0], colXPositions.description, yPos);

    const qtyText = item.quantity.toString();
    const qtyWidth = doc.getTextWidth(qtyText);
    doc.text(qtyText, colXPositions.quantity + colWidths.quantity - 2 - qtyWidth, yPos);

    const unitPriceText = formatCurrency(item.unitPrice);
    const unitPriceWidth = doc.getTextWidth(unitPriceText);
    doc.text(unitPriceText, colXPositions.unitPrice + colWidths.unitPrice - 2 - unitPriceWidth, yPos);

    doc.setFont("helvetica", "bold");
    const amountText = formatCurrency(item.amount);
    const amountWidth = doc.getTextWidth(amountText);
    doc.text(amountText, colXPositions.amount + colWidths.amount - 2 - amountWidth, yPos);
    doc.setFont("helvetica", "normal");

    const rowHeight = Math.max(6, descriptionLines.length * 4.5);
    yPos += rowHeight;

    if (descriptionLines.length > 1) {
      for (let i = 1; i < descriptionLines.length; i++) {
        doc.text(descriptionLines[i], colXPositions.description, yPos);
        yPos += 4.5;
      }
    }

    if (item.category) {
      doc.setFontSize(7);
      doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
      doc.text(`Category: ${item.category}`, colXPositions.description, yPos);
      yPos += 3.5;
      doc.setFontSize(8);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    }

    yPos += 3;
  }

  yPos += 6;

  // ============================================
  // TOTALS SECTION
  // ============================================

  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }

  const totalsStartX = colXPositions.amount;
  const totalsLabelX = colXPositions.unitPrice;
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text("Subtotal:", totalsLabelX, yPos, { align: "right" });
  const subtotalText = formatCurrency(invoice.subtotal);
  const subtotalWidth = doc.getTextWidth(subtotalText);
  doc.text(subtotalText, totalsStartX + colWidths.amount - 2 - subtotalWidth, yPos);
  yPos += 6;

  if (invoice.vatAmount > 0) {
    doc.text(`VAT (${invoice.vatRate}%):`, totalsLabelX, yPos, { align: "right" });
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    const vatText = formatCurrency(invoice.vatAmount);
    const vatWidth = doc.getTextWidth(vatText);
    doc.text(vatText, totalsStartX + colWidths.amount - 2 - vatWidth, yPos);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    yPos += 6;

    if (invoice.vatCategory) {
      doc.setFontSize(7);
      doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
      doc.text(`VAT Category: ${invoice.vatCategory}`, totalsLabelX, yPos, { align: "right" });
      yPos += 4;
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    }
  }

  // WHT Section (if applicable)
  if (invoice.whtAmount && invoice.whtAmount > 0 && invoice.whtRate) {
    doc.text(`WHT (${invoice.whtRate}%):`, totalsLabelX, yPos, { align: "right" });
    doc.setTextColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2]);
    const whtText = formatCurrency(invoice.whtAmount);
    const whtWidth = doc.getTextWidth(whtText);
    doc.text(whtText, totalsStartX + colWidths.amount - 2 - whtWidth, yPos);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    yPos += 6;

    if (invoice.whtType) {
      doc.setFontSize(7);
      doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
      const whtTypeLabel = invoice.whtType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      doc.text(`WHT Type: ${whtTypeLabel}`, totalsLabelX, yPos, { align: "right" });
      yPos += 4;
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    }
  }

  yPos += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  
  // Show net amount after WHT if applicable, otherwise show total
  const finalAmount = invoice.netAmountAfterWHT && invoice.netAmountAfterWHT > 0 
    ? invoice.netAmountAfterWHT 
    : invoice.total;
  const finalLabel = invoice.netAmountAfterWHT && invoice.netAmountAfterWHT > 0
    ? "NET AMOUNT (After WHT):"
    : "TOTAL:";
  
  doc.text(finalLabel, totalsLabelX, yPos, { align: "right" });
  const totalText = formatCurrency(finalAmount);
  const totalWidth = doc.getTextWidth(totalText);
  doc.text(totalText, totalsStartX + colWidths.amount - 2 - totalWidth, yPos);
  
  // Show total before WHT if WHT was deducted
  if (invoice.netAmountAfterWHT && invoice.netAmountAfterWHT > 0 && invoice.whtAmount) {
    yPos += 6;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
    doc.text("Total (Before WHT):", totalsLabelX, yPos, { align: "right" });
    const totalBeforeWHTText = formatCurrency(invoice.total);
    const totalBeforeWHTWidth = doc.getTextWidth(totalBeforeWHTText);
    doc.text(totalBeforeWHTText, totalsStartX + colWidths.amount - 2 - totalBeforeWHTWidth, yPos);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  }

  yPos += 10;

  // ============================================
  // NOTES SECTION
  // ============================================

  if (invoice.notes) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }
    drawLine(doc, margin, yPos, pageWidth - margin, COLORS.border, 0.5);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text("Notes:", margin, yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
    const notesLines = doc.splitTextToSize(invoice.notes, contentWidth);
    notesLines.forEach((line: string) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  }

  // ============================================
  // FOOTER SECTION - NRS Compliance
  // ============================================

  const footerY = pageHeight - 25;
  drawLine(doc, margin, footerY, pageWidth - margin, COLORS.border, 0.5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);

  const footerText = [
    "This is a computer-generated invoice and is valid without a physical signature.",
    "This invoice complies with NRS (Nigeria Revenue Service) requirements for tax documentation.",
    `Generated on ${new Date().toLocaleDateString("en-NG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })} via TaxComply NG.`,
  ];

  footerText.forEach((text, index) => {
    doc.text(text, pageWidth / 2, footerY + 5 + index * 4, { align: "center" });
  });

  // ============================================
  // WATERMARK (if required - based on subscription plan)
  // ============================================

  if (watermark) {
    addWatermark(doc, watermark);
  }

  // ============================================
  // RETURN PDF BUFFER
  // ============================================

  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}



