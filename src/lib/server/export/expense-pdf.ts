/**
 * Server-Side Expense Report PDF Generator
 * 
 * Generates professional expense report PDFs with watermark support based on subscription plan.
 * Supports both monthly and yearly expense reports.
 * 
 * CRITICAL: This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.
 * NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 */

import jsPDF from "jspdf";
import { Types } from "mongoose";
import { expenseService } from "../expense/service";
import { IExpense, IExpenseSummary } from "../expense/interface";
import { AccountType } from "../utils/enum";
import Company from "../company/entity";
import User from "../user/entity";

// Color palette for professional documents
const COLORS = {
  primary: [16, 185, 129], // emerald-500
  primaryDark: [5, 150, 105], // emerald-600
  primaryLight: [209, 250, 229], // emerald-100
  text: [15, 23, 42], // slate-900
  textLight: [100, 116, 139], // slate-500
  border: [226, 232, 240], // slate-200
  background: [240, 253, 250], // emerald-50
  watermark: [200, 200, 200], // Light gray for watermark
  warning: [245, 158, 11], // amber-500
  success: [34, 197, 94], // green-500
};

interface GenerateExpenseReportPDFOptions {
  userId: Types.ObjectId;
  accountId: Types.ObjectId;
  accountType: AccountType;
  year: number;
  month?: number; // Optional: if undefined, generates yearly report
  watermark?: string; // "taxcomply.com.ng" for free/expired plans - if undefined, no watermark
}

/**
 * Formats currency in Nigerian Naira format
 */
function formatCurrency(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount) || !isFinite(amount)) {
    return "NGN 0.00";
  }
  const parts = Math.abs(amount).toFixed(2).split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = `${integerPart}.${parts[1]}`;
  const cleaned = formatted.replace(/[\u200B-\u200D\uFEFF\u00AD\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, "");
  return `NGN ${cleaned}`;
}

/**
 * Formats date in DD/MM/YYYY format
 */
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return "Invalid Date";
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Adds watermark to PDF
 */
function addWatermark(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();

  const watermarkText = "taxcomply.com.ng";
  const upgradeText = "Upgrade to remove watermark";

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    
    // Primary diagonal watermark
    doc.setGState(doc.GState({ opacity: 0.15 }));
    doc.setTextColor(COLORS.watermark[0], COLORS.watermark[1], COLORS.watermark[2]);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    
    // Center diagonal watermark
    doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });
    
    // Secondary watermark - smaller, different angle
    doc.setGState(doc.GState({ opacity: 0.08 }));
    doc.setFontSize(28);
    doc.text(watermarkText, pageWidth / 2, pageHeight / 2 + 30, {
      align: "center",
      angle: -45,
    });
    
    // Upgrade message at bottom
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
 * Generates a professional expense report PDF
 */
export async function generateExpenseReportPDF({
  userId,
  accountId,
  accountType,
  year,
  month,
  watermark,
}: GenerateExpenseReportPDFOptions): Promise<Buffer> {
  // CRITICAL: Validate inputs - fail loudly if invalid
  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new Error(`CRITICAL: Invalid userId. userId: ${userId}`);
  }
  if (!accountId || !Types.ObjectId.isValid(accountId)) {
    throw new Error(`CRITICAL: Invalid accountId. accountId: ${accountId}`);
  }
  if (accountType !== AccountType.Company && accountType !== AccountType.Individual) {
    throw new Error(
      `CRITICAL: Invalid accountType. accountType: ${accountType}. Must be ${AccountType.Company} or ${AccountType.Individual}.`
    );
  }
  if (year === undefined || year === null || isNaN(year) || !isFinite(year)) {
    throw new Error(`CRITICAL: Invalid year. year: ${year}`);
  }
  if (year < 2026) {
    throw new Error(
      `CRITICAL: Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025. year: ${year}`
    );
  }
  if (month !== undefined && month !== null) {
    if (isNaN(month) || !isFinite(month) || month < 1 || month > 12) {
      throw new Error(`CRITICAL: Invalid month. month: ${month}. Must be between 1 and 12.`);
    }
  }

  // Fetch account information
  let accountName = "";
  let accountTIN = "";
  let accountAddress = "";

  if (accountType === AccountType.Company) {
    const company = await Company.findById(accountId).lean();
    if (!company) {
      throw new Error(`CRITICAL: Company not found. accountId: ${accountId.toString()}`);
    }
    if (company.name === undefined || company.name === null || typeof company.name !== "string" || company.name.trim() === "") {
      throw new Error(`CRITICAL: Company name is missing or invalid. accountId: ${accountId.toString()}`);
    }
    accountName = company.name.trim();
    accountTIN = company.tin?.trim() || "";
    accountAddress = company.address?.trim() || "";
  } else {
    const user = await User.findById(accountId).lean();
    if (!user) {
      throw new Error(`CRITICAL: User not found. accountId: ${accountId.toString()}`);
    }
    if (!user.firstName || !user.lastName || typeof user.firstName !== "string" || typeof user.lastName !== "string") {
      throw new Error(`CRITICAL: User firstName or lastName is missing or invalid. accountId: ${accountId.toString()}`);
    }
    accountName = `${user.firstName.trim()} ${user.lastName.trim()}`.trim();
    accountTIN = ""; // Individual users don't have TIN stored in User model
    accountAddress = ""; // Individual users don't have address stored in User model
  }

  // Fetch expense summary
  const summary: IExpenseSummary = await expenseService.getExpenseSummary(userId, accountId.toString(), year, month);

  // CRITICAL: Validate summary data - fail loudly if invalid
  if (summary === undefined || summary === null) {
    throw new Error(
      `CRITICAL: Expense summary is null or undefined. userId: ${userId.toString()}, accountId: ${accountId.toString()}, year: ${year}, month: ${month}`
    );
  }
  if (typeof summary.totalExpenses !== "number" || isNaN(summary.totalExpenses) || !isFinite(summary.totalExpenses)) {
    throw new Error(
      `CRITICAL: summary.totalExpenses is invalid. totalExpenses: ${summary.totalExpenses}, userId: ${userId.toString()}, accountId: ${accountId.toString()}`
    );
  }
  if (typeof summary.taxDeductibleExpenses !== "number" || isNaN(summary.taxDeductibleExpenses) || !isFinite(summary.taxDeductibleExpenses)) {
    throw new Error(
      `CRITICAL: summary.taxDeductibleExpenses is invalid. taxDeductibleExpenses: ${summary.taxDeductibleExpenses}, userId: ${userId.toString()}, accountId: ${accountId.toString()}`
    );
  }

  // Fetch all expenses for the period
  const expenseResult = await expenseService.getExpensesByAccount(userId, accountId.toString(), {
    year,
    month,
    limit: 10000, // Large limit to get all expenses
  });

  const expenses: IExpense[] = expenseResult.expenses || [];

  // Create PDF document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;
  const contentWidth = pageWidth - 2 * margin;

  // ============================================
  // HEADER SECTION
  // ============================================

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  const reportTitle = month !== undefined && month !== null
    ? `EXPENSE REPORT - ${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
    : `EXPENSE REPORT - ${year}`;
  doc.text(reportTitle, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Account information
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(accountName, margin, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (accountAddress) {
    doc.text(accountAddress, margin, yPos);
    yPos += 5;
  }
  if (accountTIN) {
    doc.text(`TIN: ${accountTIN}`, margin, yPos);
    yPos += 5;
  }
  doc.text(`Account Type: ${accountType === AccountType.Company ? "Company" : "Individual"}`, margin, yPos);
  yPos += 10;

  // ============================================
  // SUMMARY SECTION
  // ============================================

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("Summary", margin, yPos);
  yPos += 8;

  // Summary box
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setFillColor(COLORS.primaryLight[0], COLORS.primaryLight[1], COLORS.primaryLight[2]);
  doc.rect(margin, yPos - 6, contentWidth, 22, "FD");
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos - 6, contentWidth, 22, "S");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

  const summaryStartY = yPos;
  doc.text("Total Expenses:", margin + 5, yPos);
  doc.text(formatCurrency(summary.totalExpenses), pageWidth - margin - 5, yPos, { align: "right" });
  yPos += 7;

  doc.text("Tax-Deductible Expenses:", margin + 5, yPos);
  doc.text(formatCurrency(summary.taxDeductibleExpenses), pageWidth - margin - 5, yPos, { align: "right" });
  yPos += 7;

  yPos += 8;

  // ============================================
  // EXPENSE DETAILS TABLE
  // ============================================

  if (expenses.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("Expense Details", margin, yPos);
    yPos += 8;

    // Table header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(margin, yPos - 5, contentWidth, 8, "FD");
    doc.setTextColor(255, 255, 255);

    // Column widths: Date, Description, Category, Amount, Tax-Deductible
    // A4 page width: 210mm, margins: 20mm each = contentWidth: 170mm
    // CRITICAL: Calculate column widths to fit within contentWidth with proper spacing
    const colSpacing = 4; // Spacing between columns (mm) - 4 spacings between 5 columns
    
    // Define column widths (will be adjusted if needed)
    // Define column widths (optimized to fit 170mm content width)
    // Total: 24 + 46 + 32 + 32 + 20 = 154mm columns + (4mm * 4) = 16mm spacing = 170mm total
    const colWidths = [
      24,  // Date (24mm - enough for DD/MM/YYYY)
      46,  // Description (46mm - main content column, reduced to make room)
      32,  // Category (32mm)
      32,  // Amount (32mm - enough for NGN 999,999,999.99)
      20,  // Tax-Deductible (20mm - increased from 18mm to fit "Tax-Ded" header)
    ];
    
    // Calculate column X positions (start of each column) with proper spacing
    // Position calculation: previous column end + spacing = next column start
    let currentX = margin + colSpacing;
    const colXPositions = [
      currentX,                              // Date
      (currentX += colWidths[0] + colSpacing),  // Description
      (currentX += colWidths[1] + colSpacing),  // Category
      (currentX += colWidths[2] + colSpacing),  // Amount
      (currentX += colWidths[3] + colSpacing),  // Tax-Deductible
    ];

    doc.text("Date", colXPositions[0], yPos);
    doc.text("Description", colXPositions[1], yPos);
    doc.text("Category", colXPositions[2], yPos);
    doc.text("Amount", colXPositions[3], yPos);
    doc.text("Tax-Ded", colXPositions[4], yPos);
    yPos += 10;

    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFont("helvetica", "normal");

    // Table rows
    for (const expense of expenses) {
      // Check if we need a new page
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;

        // Redraw header on new page
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(margin, yPos - 5, contentWidth, 8, "FD");
        doc.setTextColor(255, 255, 255);
        doc.text("Date", colXPositions[0], yPos);
        doc.text("Description", colXPositions[1], yPos);
        doc.text("Category", colXPositions[2], yPos);
        doc.text("Amount", colXPositions[3], yPos);
        doc.text("Tax-Ded", colXPositions[4], yPos);
        yPos += 10;
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        doc.setFont("helvetica", "normal");
      }

      // Validate expense data before rendering
      const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
      const expenseDescription = expense.description?.trim() || "N/A";
      const expenseCategory = expense.category?.trim() || "N/A";
      const expenseAmount = typeof expense.amount === "number" && !isNaN(expense.amount) && isFinite(expense.amount)
        ? expense.amount
        : 0;
      const isTaxDeductible = expense.isTaxDeductible === true ? "Yes" : "No";

      // Draw row background (alternating)
      const rowIndex = expenses.indexOf(expense);
      if (rowIndex % 2 === 0) {
        doc.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2]);
        doc.rect(margin, yPos - 5, contentWidth, 7, "F");
      }

      // Draw border
      doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
      doc.setLineWidth(0.1);
      doc.rect(margin, yPos - 5, contentWidth, 7, "S");

      // Date
      doc.setFontSize(8);
      doc.text(formatDate(expenseDate), colXPositions[0], yPos);

      // Description (truncate if too long)
      doc.setFontSize(8);
      const maxDescWidth = colWidths[1] - colSpacing;
      const descLines = doc.splitTextToSize(expenseDescription, maxDescWidth);
      if (descLines.length > 1) {
        doc.text(descLines[0], colXPositions[1], yPos);
        if (descLines.length > 1) {
          doc.text("...", colXPositions[1], yPos + 3);
        }
      } else {
        doc.text(expenseDescription, colXPositions[1], yPos);
      }

      // Category
      doc.setFontSize(8);
      const maxCategoryWidth = colWidths[2] - colSpacing;
      const categoryLines = doc.splitTextToSize(expenseCategory, maxCategoryWidth);
      doc.text(categoryLines[0], colXPositions[2], yPos);

      // Amount (left-aligned to match header)
      doc.setFontSize(8);
      doc.text(formatCurrency(expenseAmount), colXPositions[3], yPos);

      // Tax-Deductible (left-aligned)
      doc.setFontSize(8);
      doc.text(isTaxDeductible, colXPositions[4], yPos);

      yPos += 7;
    }

    // Draw total row
    yPos += 2;
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", colXPositions[3] - 10, yPos);
    doc.text(formatCurrency(summary.totalExpenses), colXPositions[3], yPos);
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
    doc.text("No expenses found for this period.", margin, yPos);
  }

  // ============================================
  // FOOTER SECTION
  // ============================================

  const footerY = pageHeight - 25;
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);

  const footerText = [
    "This is a computer-generated expense report for record-keeping and tax documentation purposes.",
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
    addWatermark(doc);
  }

  // ============================================
  // RETURN PDF BUFFER
  // ============================================

  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}
