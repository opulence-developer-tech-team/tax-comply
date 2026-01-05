import * as XLSX from "xlsx";
import { IInvoice } from "../invoice/interface";
import { IVATRecord } from "../vat/interface";
import { IPayroll } from "../payroll/interface";

export function invoicesToExcel(invoices: IInvoice[]): Buffer {
  const data = invoices.map((invoice) => ({
    "Invoice Number": invoice.invoiceNumber,
    "Customer Name": invoice.customerName,
    "Customer Email": invoice.customerEmail || "",
    "Customer Phone": invoice.customerPhone || "",
    "Issue Date": new Date(invoice.issueDate).toLocaleDateString(),
    "Due Date": invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "",
    Subtotal: invoice.subtotal,
    "VAT Rate": invoice.vatRate,
    "VAT Amount": invoice.vatAmount,
    Total: invoice.total,
    Status: invoice.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

export function vatRecordsToExcel(records: IVATRecord[]): Buffer {
  const data = records.map((record) => ({
    Type: record.type,
    Amount: record.amount,
    Description: record.description,
    "Transaction Date": new Date(record.transactionDate).toLocaleDateString(),
    Month: record.month,
    Year: record.year,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "VAT Records");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

export function payrollToExcel(payrolls: IPayroll[]): Buffer {
  const data = payrolls.map((payroll) => ({
    "Employee ID": payroll.employeeId.toString(),
    Month: payroll.payrollMonth,
    Year: payroll.payrollYear,
    "Gross Salary": payroll.grossSalary,
    "Pension Contribution": payroll.employeePensionContribution,
    "NHF Contribution": payroll.nhfContribution,
    "Taxable Income": payroll.taxableIncome,
    PAYE: payroll.paye,
    "Net Salary": payroll.netSalary,
    Status: payroll.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}





















