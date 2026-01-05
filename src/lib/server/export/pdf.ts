import jsPDF from "jspdf";
import { IInvoice } from "../invoice/interface";
import Company from "../company/entity";
import { Types } from "mongoose";

export async function generateInvoicePDF(
  invoice: IInvoice,
  companyId: Types.ObjectId
): Promise<Buffer> {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(company.name, margin, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (company.address) {
    doc.text(company.address, margin, yPos);
    yPos += 5;
  }
  if (company.city && company.state) {
    doc.text(`${company.city}, ${company.state}`, margin, yPos);
    yPos += 5;
  }
  if (company.phoneNumber) {
    doc.text(`Phone: ${company.phoneNumber}`, margin, yPos);
    yPos += 5;
  }
  if (company.email) {
    doc.text(`Email: ${company.email}`, margin, yPos);
    yPos += 5;
  }
  if (company.tin) {
    doc.text(`TIN: ${company.tin}`, margin, yPos);
    yPos += 5;
  }

  yPos += 10;

  doc.setFont("helvetica", "bold");
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, pageWidth - margin, yPos, {
    align: "right",
  });
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.text(
    `Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`,
    pageWidth - margin,
    yPos,
    { align: "right" }
  );
  yPos += 6;
  if (invoice.dueDate) {
    doc.text(
      `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`,
      pageWidth - margin,
      yPos,
      { align: "right" }
    );
    yPos += 6;
  }

  yPos += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", margin, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.text(invoice.customerName, margin, yPos);
  yPos += 5;
  if (invoice.customerAddress) {
    doc.text(invoice.customerAddress, margin, yPos);
    yPos += 5;
  }
  if (invoice.customerEmail) {
    doc.text(`Email: ${invoice.customerEmail}`, margin, yPos);
    yPos += 5;
  }
  if (invoice.customerPhone) {
    doc.text(`Phone: ${invoice.customerPhone}`, margin, yPos);
    yPos += 5;
  }
  if (invoice.customerTIN) {
    doc.text(`TIN: ${invoice.customerTIN}`, margin, yPos);
    yPos += 5;
  }

  yPos += 10;

  const tableStartY = yPos;
  const colWidths = [100, 30, 30, 30];
  const colXPositions = [margin, margin + 100, margin + 130, margin + 160];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Description", colXPositions[0], yPos);
  doc.text("Qty", colXPositions[1], yPos);
  doc.text("Price", colXPositions[2], yPos);
  doc.text("Amount", colXPositions[3], yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const item of invoice.items) {
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }

    const descriptionLines = doc.splitTextToSize(item.description, colWidths[0]);
    doc.text(descriptionLines[0], colXPositions[0], yPos);
    doc.text(item.quantity.toString(), colXPositions[1], yPos);
    doc.text(`₦${item.unitPrice.toLocaleString()}`, colXPositions[2], yPos);
    doc.text(`₦${item.amount.toLocaleString()}`, colXPositions[3], yPos);
    yPos += Math.max(6, descriptionLines.length * 6);
  }

  yPos += 10;

  const totalsX = pageWidth - margin;
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX - 50, yPos, { align: "right" });
  doc.text(`₦${invoice.subtotal.toLocaleString()}`, totalsX, yPos, { align: "right" });
  yPos += 6;
  doc.text(`VAT (${invoice.vatRate}%):`, totalsX - 50, yPos, { align: "right" });
  doc.text(`₦${invoice.vatAmount.toLocaleString()}`, totalsX, yPos, { align: "right" });
  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Total:", totalsX - 50, yPos, { align: "right" });
  doc.text(`₦${invoice.total.toLocaleString()}`, totalsX, yPos, { align: "right" });

  yPos += 15;

  if (invoice.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const notesLines = doc.splitTextToSize(`Notes: ${invoice.notes}`, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPos);
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    "This is a computer-generated invoice. No signature required.",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}

export async function generateReportPDF(
  title: string,
  content: string,
  companyId: Types.ObjectId
): Promise<Buffer> {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated for: ${company.name}`, margin, yPos);
  yPos += 6;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos);
  yPos += 15;

  doc.setFontSize(9);
  const contentLines = doc.splitTextToSize(content, pageWidth - 2 * margin);
  for (const line of contentLines) {
    if (yPos > 270) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin, yPos);
    yPos += 6;
  }

  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}




















