/**
 * Corporate-Grade Invoice PDF Generator
 * 
 * Generates NRS-compliant, premium invoice PDFs for Nigerian companies.
 * Features:
 * - Luxury green corporate branding
 * - NRS compliance standards
 * - High-resolution output
 * - Professional typography and layout
 * - Print-ready format
 * - Perfect spacing with no overlapping text
 */

import jsPDF from "jspdf";
import { TextAlign } from "./client-enums";

// Luxury green color palette (RGB values for jsPDF)
const COLORS = {
  primary: [16, 185, 129], // emerald-500
  primaryDark: [5, 150, 105], // emerald-600
  primaryLight: [209, 250, 229], // emerald-100
  text: [15, 23, 42], // slate-900
  textLight: [100, 116, 139], // slate-500
  border: [209, 250, 229], // emerald-100
  background: [240, 253, 250], // emerald-50
};

interface CompanyInfo {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  tin?: string;
  cacNumber?: string;
  website?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string | Date;
  dueDate?: string | Date;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTIN?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    category?: string;
  }>;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  vatCategory?: string;
  total: number;
  status: string;
  notes?: string;
}

interface GenerateInvoicePDFOptions {
  invoice: InvoiceData;
  company: CompanyInfo;
}

/**
 * Formats currency in Nigerian Naira format
 */
function formatCurrency(amount: number): string {
  // Use a more controlled formatting to avoid locale-specific characters
  const parts = amount.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = `${integerPart}.${parts[1]}`;
  // Clean any problematic characters
  const cleaned = formatted.replace(/[\u200B-\u200D\uFEFF\u00AD\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, '');
  // Use "NGN" prefix instead of naira sign (₦) because jsPDF's default Helvetica font
  // doesn't support the naira sign and renders it as a vertical bar (¦)
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
 * Formats date in a readable format
 */
function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
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
  // Ensure solid line style (not dashed/dotted) - reset dash pattern
  // @ts-ignore - setLineDashPattern may not be in types but exists in jsPDF
  if (typeof doc.setLineDashPattern === 'function') {
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
 * Generates a corporate-grade, NRS-compliant invoice PDF
 * Perfect spacing, no overlapping text, professional layout
 */
export function generateInvoicePDF({ invoice, company }: GenerateInvoicePDFOptions): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  
  // Ensure all lines are solid (not dashed/dotted) - fix for dotted line artifacts
  // @ts-ignore - setLineDashPattern may not be in types but exists in jsPDF
  if (typeof doc.setLineDashPattern === 'function') {
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
  
  // Header background with luxury green
  drawRect(doc, 0, 0, pageWidth, 45, COLORS.background, false);
  
  // Top border accent
  drawRect(doc, 0, 0, pageWidth, 2.5, COLORS.primary, false);
  
  // Left side: Company Information
  let leftY = 12;
  
  // Company Name - Large, Bold
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(company.name, margin, leftY);
  leftY += 7;
  
  // Company Address Block
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
  
  const companyInfo: string[] = [];
  if (company.address) companyInfo.push(company.address);
  if (company.city && company.state) {
    companyInfo.push(`${company.city}, ${company.state}${company.country ? `, ${company.country}` : ""}`);
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
  
  // Right side: Invoice Details - Completely separate Y position
  let rightY = 12;
  
  // "TAX INVOICE" label - Corporate styling
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text("TAX INVOICE", pageWidth - margin, rightY, { align: TextAlign.Right });
  rightY += 8;
  
  // Invoice Details - Right aligned
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  
  const invoiceDetails = [
    { label: "Invoice Number:", value: invoice.invoiceNumber },
    { label: "Issue Date:", value: formatDateShort(invoice.issueDate) },
    ...(invoice.dueDate ? [{ label: "Due Date:", value: formatDateShort(invoice.dueDate) }] : []),
    { label: "Status:", value: invoice.status.toUpperCase() },
  ];
  
  invoiceDetails.forEach((detail) => {
    doc.setFont("helvetica", "bold");
    doc.text(detail.label, pageWidth - margin - 45, rightY, { align: TextAlign.Right });
    doc.setFont("helvetica", "normal");
    doc.text(detail.value, pageWidth - margin, rightY, { align: TextAlign.Right });
    rightY += 4.5;
  });
  
  // Set Y position to the bottom of header section (whichever is lower)
  yPos = Math.max(leftY, rightY) + 10;
  
  // ============================================
  // CUSTOMER INFORMATION SECTION
  // ============================================
  
  drawLine(doc, margin, yPos, pageWidth - margin, COLORS.border, 0.5);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("BILL TO:", margin, yPos);
  yPos += 6;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(invoice.customerName, margin, yPos);
  yPos += 5;
  
  if (invoice.customerAddress) {
    doc.setFontSize(8);
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
    const addressLines = doc.splitTextToSize(invoice.customerAddress, contentWidth * 0.5);
    addressLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 3.5;
    });
  }
  
  if (invoice.customerEmail) {
    doc.setFontSize(8);
    doc.text(`Email: ${invoice.customerEmail}`, margin, yPos);
    yPos += 3.5;
  }
  
  if (invoice.customerPhone) {
    doc.setFontSize(8);
    doc.text(`Phone: ${invoice.customerPhone}`, margin, yPos);
    yPos += 3.5;
  }
  
  if (invoice.customerTIN) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text(`TIN: ${invoice.customerTIN}`, margin, yPos);
    yPos += 3.5;
  }
  
  yPos += 8;
  
  // ============================================
  // ITEMS TABLE SECTION
  // ============================================
  
  // Check if we need a new page before table
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }
  
  drawLine(doc, margin, yPos, pageWidth - margin, COLORS.border, 0.5);
  yPos += 6;
  
  // Table Header Background - properly centered
  const headerHeight = 8;
  const headerY = yPos - headerHeight / 2;
  drawRect(doc, margin, headerY, contentWidth, headerHeight, COLORS.primaryLight, true);
  
  // Table Headers - Perfectly aligned columns
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  
  // Column widths - precise measurements (adjusted to prevent overlap)
  const colWidths = {
    description: 75,  // Description column
    quantity: 20,     // Quantity column
    unitPrice: 35,    // Unit Price column
    amount: 35,       // Amount column
  };
  
  // Column spacing between columns
  const colSpacing = 5;
  
  // Column X positions - calculated precisely to prevent overlap
  // Each column starts after the previous one ends + spacing
  const colXPositions = {
    description: margin + 2,
    quantity: margin + colWidths.description + colSpacing,
    unitPrice: margin + colWidths.description + colWidths.quantity + (colSpacing * 2),
    amount: margin + colWidths.description + colWidths.quantity + colWidths.unitPrice + (colSpacing * 3),
  };
  
  // Ensure amount column doesn't exceed page width
  const amountColumnEnd = colXPositions.amount + colWidths.amount;
  if (amountColumnEnd > pageWidth - margin) {
    // Adjust description width to fit
    const excess = amountColumnEnd - (pageWidth - margin);
    colWidths.description = Math.max(60, colWidths.description - excess);
    // Recalculate positions
    colXPositions.quantity = margin + colWidths.description + colSpacing;
    colXPositions.unitPrice = margin + colWidths.description + colWidths.quantity + (colSpacing * 2);
    colXPositions.amount = margin + colWidths.description + colWidths.quantity + colWidths.unitPrice + (colSpacing * 3);
  }
  
  // Headers - vertically centered in header box
  // Calculate vertical center: headerY + (headerHeight / 2) + text offset
  // Text baseline offset for 9pt font is approximately 1.5mm (reduced to move text up)
  const headerTextY = headerY + (headerHeight / 2) + 1.5;
  
  doc.text("Description", colXPositions.description, headerTextY);
  // Qty - right aligned within its column
  doc.text("Qty", colXPositions.quantity + colWidths.quantity - 2, headerTextY, { align: TextAlign.Right });
  // Unit Price - right aligned within its column
  doc.text("Unit Price", colXPositions.unitPrice + colWidths.unitPrice - 2, headerTextY, { align: TextAlign.Right });
  // Amount - right aligned within its column
  doc.text("Amount", colXPositions.amount + colWidths.amount - 2, headerTextY, { align: TextAlign.Right });
  
  // Move yPos to below the header box
  yPos = headerY + headerHeight + 2;
  drawLine(doc, margin, yPos, pageWidth - margin, COLORS.border, 0.5);
  yPos += 4;
  
  // Helper function to render text with auto-sizing if it doesn't fit
  // Preserves font style (bold/normal) and handles edge cases
  const renderTextWithAutoSize = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    options: { align?: TextAlign; minFontSize?: number; defaultFontSize?: number } = {}
  ): void => {
    const { align = TextAlign.Left, minFontSize = 6, defaultFontSize = 8 } = options;
    
    // Clean text - remove invisible characters and vertical bars
    // jsPDF's default Helvetica font doesn't support naira sign (₦),
    // so we use "NGN" prefix instead. Remove any vertical bar artifacts.
    let cleanText = text
      .replace(/[\u200B-\u200D\uFEFF\u00AD\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, '')
      .replace(/[\u00A6\u20A6]/g, '') // Remove vertical bar (¦) and naira sign (₦) - not supported by font
      .replace(/[¦₦]/g, '') // Also remove as literal characters
      .trim();
    
    // Preserve current font state
    const currentFontSize = doc.getFontSize();
    const currentFontStyle = doc.getFont().fontStyle; // "normal" or "bold"
    const currentFontName = doc.getFont().fontName; // "helvetica"
    
    // Try default size first
    doc.setFontSize(defaultFontSize);
    const textWidth = doc.getTextWidth(cleanText);
    
    if (textWidth <= maxWidth) {
      // Fits at default size, render normally
      // For right alignment, calculate the actual X position to avoid alignment artifacts
      if (align === TextAlign.Right) {
        // Calculate left edge of text for right alignment
        const textX = x - textWidth;
        doc.text(cleanText, textX, y);
      } else if (align === TextAlign.Center) {
        const textX = x - (textWidth / 2);
        doc.text(cleanText, textX, y);
      } else {
        doc.text(cleanText, x, y);
      }
      // Restore original font state
      doc.setFontSize(currentFontSize);
      doc.setFont(currentFontName, currentFontStyle);
      return;
    }
    
    // Calculate required font size to fit
    const requiredFontSize = (defaultFontSize * maxWidth) / textWidth;
    const finalFontSize = Math.max(minFontSize, Math.min(defaultFontSize, requiredFontSize));
    
    // Apply calculated font size (font style is already set by caller)
    doc.setFontSize(finalFontSize);
    const finalTextWidth = doc.getTextWidth(cleanText);
    
    // For right alignment, calculate the actual X position to avoid alignment artifacts
    if (align === TextAlign.Right) {
      // Calculate left edge of text for right alignment
      const textX = x - finalTextWidth;
      doc.text(cleanText, textX, y);
    } else if (align === TextAlign.Center) {
      const textX = x - (finalTextWidth / 2);
      doc.text(cleanText, textX, y);
    } else {
      doc.text(cleanText, x, y);
    }
    
    // Restore original font state
    doc.setFontSize(currentFontSize);
    doc.setFont(currentFontName, currentFontStyle);
  };
  
  // Table Rows
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  
  for (const item of invoice.items) {
    // Check if we need a new page
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin + 5;
      // Redraw table header on new page - vertically centered
      const newPageHeaderY = yPos - headerHeight / 2;
      drawRect(doc, margin, newPageHeaderY, contentWidth, headerHeight, COLORS.primaryLight, true);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      const newPageHeaderTextY = newPageHeaderY + (headerHeight / 2) + 1.5;
      doc.text("Description", colXPositions.description, newPageHeaderTextY);
      doc.text("Qty", colXPositions.quantity + colWidths.quantity - 2, newPageHeaderTextY, { align: TextAlign.Right });
      doc.text("Unit Price", colXPositions.unitPrice + colWidths.unitPrice - 2, newPageHeaderTextY, { align: TextAlign.Right });
      doc.text("Amount", colXPositions.amount + colWidths.amount - 2, newPageHeaderTextY, { align: TextAlign.Right });
      yPos = newPageHeaderY + headerHeight + 2;
      drawLine(doc, margin, yPos, pageWidth - margin, COLORS.border, 0.5);
      yPos += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    }
    
    // Description (with wrapping)
    const descriptionLines = doc.splitTextToSize(
      item.description,
      colWidths.description - 4
    );
    
    // First line of description
    doc.text(descriptionLines[0], colXPositions.description, yPos);
    
    // Quantity - Right aligned with auto-sizing
    const qtyText = item.quantity.toString();
    const qtyMaxWidth = colWidths.quantity - 2;
    renderTextWithAutoSize(
      qtyText,
      colXPositions.quantity + colWidths.quantity - 2,
      yPos,
      qtyMaxWidth,
      { align: TextAlign.Right, defaultFontSize: 8, minFontSize: 6 }
    );
    
    // Unit Price - Right aligned with auto-sizing
    // Reset line dash pattern before rendering to prevent dotted lines
    // @ts-ignore - setLineDashPattern may not be in types but exists in jsPDF
    if (typeof doc.setLineDashPattern === 'function') {
      doc.setLineDashPattern([], 0);
    }
    let unitPriceText = formatCurrency(item.unitPrice);
    // Remove any vertical bar or naira sign artifacts (now using "NGN" prefix)
    unitPriceText = unitPriceText.replace(/[\u00A6\u20A6¦₦]/g, '').trim();
    const unitPriceMaxWidth = colWidths.unitPrice - 2;
    renderTextWithAutoSize(
      unitPriceText,
      colXPositions.unitPrice + colWidths.unitPrice - 2,
      yPos,
      unitPriceMaxWidth,
      { align: TextAlign.Right, defaultFontSize: 8, minFontSize: 6 }
    );
    
    // Amount - Right aligned with auto-sizing
    // Reset line dash pattern before rendering to prevent dotted lines
    // @ts-ignore - setLineDashPattern may not be in types but exists in jsPDF
    if (typeof doc.setLineDashPattern === 'function') {
      doc.setLineDashPattern([], 0);
    }
    let amountText = formatCurrency(item.amount);
    // Remove any vertical bar or naira sign artifacts (now using "NGN" prefix)
    amountText = amountText.replace(/[\u00A6\u20A6¦₦]/g, '').trim();
    const amountMaxWidth = colWidths.amount - 2;
    doc.setFont("helvetica", "bold");
    renderTextWithAutoSize(
      amountText,
      colXPositions.amount + colWidths.amount - 2,
      yPos,
      amountMaxWidth,
      { align: TextAlign.Right, defaultFontSize: 8, minFontSize: 6 }
    );
    doc.setFont("helvetica", "normal");
    
    // Calculate row height based on description lines
    const rowHeight = Math.max(6, descriptionLines.length * 4.5);
    yPos += rowHeight;
    
    // Additional description lines if any
    if (descriptionLines.length > 1) {
      for (let i = 1; i < descriptionLines.length; i++) {
        doc.text(descriptionLines[i], colXPositions.description, yPos);
        yPos += 4.5;
      }
    }
    
    // Category if available
    if (item.category) {
      doc.setFontSize(7);
      doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
      doc.text(`Category: ${item.category}`, colXPositions.description, yPos);
      yPos += 3.5;
      doc.setFontSize(8);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    }
    
    // Row separator - removed to prevent dotted line artifacts
    // drawLine(doc, margin, yPos - 1, pageWidth - margin, COLORS.border, 0.2);
    yPos += 3;
  }
  
  yPos += 6;
  
  // ============================================
  // TOTALS SECTION - Professional Design
  // ============================================
  
  // Check if we need a new page for totals
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }
  
  // Use same column positions as table for perfect alignment
  const totalsStartX = colXPositions.amount;
  const totalsLabelX = colXPositions.unitPrice;
  const totalsSectionStartX = colXPositions.description;
  
  // Add spacing before totals section
  yPos += 8;
  
  // Subtotal - aligned with table columns with auto-sizing
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text("Subtotal:", totalsLabelX, yPos, { align: TextAlign.Right });
  let subtotalText = formatCurrency(invoice.subtotal);
  // Remove any vertical bar or naira sign artifacts (now using "NGN" prefix)
  subtotalText = subtotalText.replace(/[\u00A6\u20A6¦₦]/g, '').trim();
  const subtotalMaxWidth = colWidths.amount - 2;
  renderTextWithAutoSize(
    subtotalText,
    totalsStartX,
    yPos,
    subtotalMaxWidth,
    { align: TextAlign.Right, defaultFontSize: 9, minFontSize: 6 }
  );
  yPos += 6;
  
  // VAT
  if (invoice.vatAmount > 0) {
    doc.text(`VAT (${invoice.vatRate}%):`, totalsLabelX, yPos, { align: TextAlign.Right });
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    let vatText = formatCurrency(invoice.vatAmount);
    // Remove any vertical bar or naira sign artifacts (now using "NGN" prefix)
    vatText = vatText.replace(/[\u00A6\u20A6¦₦]/g, '').trim();
    renderTextWithAutoSize(
      vatText,
      totalsStartX,
      yPos,
      subtotalMaxWidth,
      { align: TextAlign.Right, defaultFontSize: 9, minFontSize: 6 }
    );
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    yPos += 6;
    
    if (invoice.vatCategory) {
      doc.setFontSize(7);
      doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
      doc.text(`VAT Category: ${invoice.vatCategory}`, totalsLabelX, yPos, { align: TextAlign.Right });
      yPos += 4;
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    }
  }
  
  // Total - Clean and professional (no line above)
  yPos += 5;
  
  // Total row - clean and bold with auto-sizing
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("TOTAL:", totalsLabelX, yPos, { align: TextAlign.Right });
  let totalText = formatCurrency(invoice.total);
  // Remove any vertical bar or naira sign artifacts (now using "NGN" prefix)
  totalText = totalText.replace(/[\u00A6\u20A6¦₦]/g, '').trim();
  renderTextWithAutoSize(
    totalText,
    totalsStartX,
    yPos,
    subtotalMaxWidth,
    { align: TextAlign.Right, defaultFontSize: 12, minFontSize: 7 }
  );
  
  yPos += 10;
  
  // ============================================
  // NOTES SECTION
  // ============================================
  
  if (invoice.notes) {
    // Check if we need a new page
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }
    
    drawLine(doc, margin, yPos, pageWidth - margin, COLORS.border, 0.5);
    yPos += 6;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text("Notes:", margin, yPos);
    yPos += 5;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
    const notesLines = doc.splitTextToSize(invoice.notes, contentWidth);
    notesLines.forEach((line: string) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 4;
    });
  }
  
  // ============================================
  // FOOTER SECTION - NRS Compliance
  // ============================================
  
  // Ensure footer is always at bottom, but not overlapping content
  const footerY = Math.min(pageHeight - 20, yPos + 10);
  
  // Only draw footer line if we have space
  if (footerY < pageHeight - 15) {
    drawLine(doc, margin, footerY, pageWidth - margin, COLORS.border, 0.5);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
    
    const footerText = [
      "This is a computer-generated invoice and is valid without a physical signature.",
      "This invoice complies with NRS (Federal Inland Revenue Service) requirements for tax documentation.",
      `Generated on ${formatDate(new Date())} via TaxComply NG.`,
    ];
    
    footerText.forEach((text, index) => {
      const footerLineY = footerY + 4 + index * 3.5;
      if (footerLineY < pageHeight - 5) {
        doc.text(text, pageWidth / 2, footerLineY, { align: TextAlign.Center });
      }
    });
  }
  
  // ============================================
  // DOWNLOAD PDF
  // ============================================
  
  const fileName = `Invoice-${invoice.invoiceNumber}-${formatDateShort(invoice.issueDate).replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}
