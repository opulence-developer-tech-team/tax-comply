/**
 * Server-Side Invoice CSV Generator
 * 
 * Generates NRS-compliant invoice CSV with the same data structure as PDF.
 * Ensures data consistency between PDF and CSV exports.
 */

import { IInvoice } from "../invoice/interface";
import { ICompany } from "../company/interface";
import { connectDB } from "../utils/db";

interface GenerateInvoiceCSVOptions {
  invoice: IInvoice;
  company: ICompany;
  watermark?: string; // Not used in CSV but kept for consistency
}

/**
 * Formats currency in Nigerian Naira format (same as PDF)
 */
function formatCurrency(amount: number): string {
  const parts = amount.toFixed(2).split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = `${integerPart}.${parts[1]}`;
  const cleaned = formatted.replace(/[\u200B-\u200D\uFEFF\u00AD\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, "");
  return `NGN ${cleaned}`;
}

/**
 * Formats date in short format (DD/MM/YYYY) - same as PDF
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
 * Escapes CSV field values
 */
function escapeCSV(value: string | number | undefined | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates NRS-compliant invoice CSV with same data as PDF
 */
export async function generateInvoiceCSV({
  invoice,
  company,
}: GenerateInvoiceCSVOptions): Promise<string> {
  await connectDB();

  const rows: string[] = [];

  // ============================================
  // HEADER SECTION - Company Information
  // ============================================
  rows.push("INVOICE EXPORT - NRS COMPLIANT");
  rows.push(""); // Empty row
  rows.push("COMPANY INFORMATION");
  rows.push(`Company Name: ${escapeCSV(company.name)}`);
  if (company.address) {
    rows.push(`Company Address: ${escapeCSV(company.address)}`);
  }
  if (company.city && company.state) {
    rows.push(`City/State: ${escapeCSV(`${company.city}, ${company.state}`)}`);
  }
  if (company.country) {
    rows.push(`Country: ${escapeCSV(company.country)}`);
  }
  if (company.phoneNumber) {
    rows.push(`Phone: ${escapeCSV(company.phoneNumber)}`);
  }
  if (company.email) {
    rows.push(`Email: ${escapeCSV(company.email)}`);
  }
  if (company.website) {
    rows.push(`Website: ${escapeCSV(company.website)}`);
  }
  if (company.tin) {
    rows.push(`TIN: ${escapeCSV(company.tin)}`);
  }
  if (company.cacNumber) {
    rows.push(`CAC Number: ${escapeCSV(company.cacNumber)}`);
  }
  rows.push(""); // Empty row

  // ============================================
  // INVOICE DETAILS SECTION
  // ============================================
  rows.push("INVOICE DETAILS");
  rows.push(`Invoice Number: ${escapeCSV(invoice.invoiceNumber)}`);
  rows.push(`Issue Date: ${escapeCSV(formatDateShort(invoice.issueDate))}`);
  if (invoice.dueDate) {
    rows.push(`Due Date: ${escapeCSV(formatDateShort(invoice.dueDate))}`);
  }
  rows.push(`Status: ${escapeCSV(invoice.status.toUpperCase())}`);
  rows.push(""); // Empty row

  // ============================================
  // CUSTOMER INFORMATION SECTION
  // ============================================
  rows.push("CUSTOMER INFORMATION");
  rows.push(`Customer Name: ${escapeCSV(invoice.customerName)}`);
  if (invoice.customerAddress) {
    rows.push(`Customer Address: ${escapeCSV(invoice.customerAddress)}`);
  }
  if (invoice.customerEmail) {
    rows.push(`Customer Email: ${escapeCSV(invoice.customerEmail)}`);
  }
  if (invoice.customerPhone) {
    rows.push(`Customer Phone: ${escapeCSV(invoice.customerPhone)}`);
  }
  if (invoice.customerTIN) {
    rows.push(`Customer TIN: ${escapeCSV(invoice.customerTIN)}`);
  }
  rows.push(""); // Empty row

  // ============================================
  // ITEMS TABLE SECTION - Same structure as PDF
  // ============================================
  rows.push("INVOICE ITEMS");
  rows.push("Description,Quantity,Unit Price,Amount,Category");

  // Add each item (same data as PDF)
  for (const item of invoice.items) {
    const row = [
      escapeCSV(item.description),
      escapeCSV(item.quantity.toString()),
      escapeCSV(formatCurrency(item.unitPrice)),
      escapeCSV(formatCurrency(item.amount)),
      escapeCSV(item.category || ""),
    ];
    rows.push(row.join(","));
  }
  rows.push(""); // Empty row

  // ============================================
  // TOTALS SECTION - Same as PDF
  // ============================================
  rows.push("FINANCIAL SUMMARY");
  rows.push(`Subtotal: ${escapeCSV(formatCurrency(invoice.subtotal))}`);
  
  if (invoice.vatAmount > 0) {
    rows.push(`VAT Rate: ${escapeCSV(`${invoice.vatRate}%`)}`);
    rows.push(`VAT Amount: ${escapeCSV(formatCurrency(invoice.vatAmount))}`);
    if (invoice.vatCategory) {
      rows.push(`VAT Category: ${escapeCSV(invoice.vatCategory)}`);
    }
  }
  
  rows.push(`TOTAL: ${escapeCSV(formatCurrency(invoice.total))}`);
  rows.push(""); // Empty row

  // ============================================
  // NOTES SECTION - Same as PDF
  // ============================================
  if (invoice.notes) {
    rows.push("NOTES");
    rows.push(`Notes: ${escapeCSV(invoice.notes)}`);
    rows.push(""); // Empty row
  }

  // ============================================
  // NRS COMPLIANCE FOOTER
  // ============================================
  rows.push("COMPLIANCE INFORMATION");
  rows.push("Compliance: This invoice complies with NRS (Federal Inland Revenue Service) requirements");
  rows.push(`Generated Date: ${escapeCSV(new Date().toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }))}`);
  rows.push("Generated By: TaxComply NG");

  // Join all rows with newlines
  return rows.join("\n");
}



