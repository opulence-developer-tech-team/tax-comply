import { IInvoice } from "../invoice/interface";
import { IVATRecord } from "../vat/interface";
import { IPayroll } from "../payroll/interface";

export function invoicesToCSV(invoices: IInvoice[]): string {
  const headers = [
    "Invoice Number",
    "Customer Name",
    "Issue Date",
    "Due Date",
    "Subtotal",
    "VAT Amount",
    "Total",
    "Status",
  ];

  const rows = invoices.map((invoice) => [
    invoice.invoiceNumber,
    invoice.customerName,
    new Date(invoice.issueDate).toLocaleDateString(),
    invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "",
    invoice.subtotal.toFixed(2),
    invoice.vatAmount.toFixed(2),
    invoice.total.toFixed(2),
    invoice.status,
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

export function vatRecordsToCSV(records: IVATRecord[]): string {
  const headers = ["Type", "Amount", "Description", "Transaction Date", "Month", "Year"];

  const rows = records.map((record) => [
    record.type,
    record.amount.toFixed(2),
    record.description,
    new Date(record.transactionDate).toLocaleDateString(),
    record.month.toString(),
    record.year.toString(),
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

export function payrollToCSV(payrolls: IPayroll[]): string {
  const headers = [
    "Employee ID",
    "Month",
    "Year",
    "Gross Salary",
    "Pension",
    "NHF",
    "Taxable Income",
    "PAYE",
    "Net Salary",
    "Status",
  ];

  const rows = payrolls.map((payroll) => [
    payroll.employeeId.toString(),
    payroll.payrollMonth.toString(),
    payroll.payrollYear.toString(),
    payroll.grossSalary.toFixed(2),
    payroll.employeePensionContribution.toFixed(2),
    payroll.nhfContribution.toFixed(2),
    payroll.taxableIncome.toFixed(2),
    payroll.paye.toFixed(2),
    payroll.netSalary.toFixed(2),
    payroll.status,
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}





















