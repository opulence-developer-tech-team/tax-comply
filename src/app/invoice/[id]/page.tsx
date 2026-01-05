"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useHttp } from "@/hooks/useHttp";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { FileText, Building2, Mail, Phone, MapPin, Calendar, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ButtonVariant } from "@/lib/utils/client-enums";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Company {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  tin?: string;
  cacNumber?: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTIN?: string;
  issueDate: string;
  dueDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  vatCategory?: string;
  // WHT (Withholding Tax) fields - for tracking WHT deducted from invoice payments
  whtType?: string;
  whtRate?: number;
  whtAmount?: number;
  netAmountAfterWHT?: number;
  status: string;
  notes?: string;
}

interface InvoiceData {
  invoice: Invoice;
  company: Company;
}

export default function GuestInvoicePage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const { isLoading, sendHttpRequest } = useHttp();
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchInvoice = () => {
    setError(null);
    sendHttpRequest({
      successRes: (response: any) => {
        if (response?.data?.message === "success" && response?.data?.data) {
          setInvoiceData(response.data.data);
        } else {
          setError("Invoice not found");
        }
      },
      errorRes: (errorResponse: any) => {
        if (errorResponse?.status === 404) {
          setError("Invoice not found or no longer available");
        } else {
          setError("Failed to load invoice. Please try again later.");
        }
        return true;
      },
      requestConfig: {
        url: `/invoices/${invoiceId}/public`,
        method: HttpMethod.GET,
      },
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-NG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
        <LoadingState message="Loading invoice..." />
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <EmptyState
          icon="📄"
          title="Invoice Not Found"
          description={error || "The invoice you're looking for doesn't exist or is no longer available."}
        />
      </div>
    );
  }

  const { invoice, company } = invoiceData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 print:bg-white">
      {/* Header - Hidden on print */}
      <div className="hidden print:block"></div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto p-6 md:p-8 lg:p-12"
      >
        {/* Print Actions - Hidden on print */}
        <div className="mb-6 flex justify-end gap-3 print:hidden">
          <Button
            onClick={handlePrint}
            variant={ButtonVariant.Outline}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Invoice Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 overflow-hidden print:shadow-none print:border-0"
        >
          {/* Header Section with Luxury Green Gradient */}
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 text-white p-8 md:p-12 print:bg-emerald-700">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Company Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold">{company.name}</h1>
                </div>
                
                <div className="space-y-2 text-emerald-50">
                  {company.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-1 shrink-0" />
                      <span className="text-sm">
                        {company.address}
                        {company.city && `, ${company.city}`}
                        {company.state && `, ${company.state}`}
                        {company.country && `, ${company.country}`}
                      </span>
                    </div>
                  )}
                  {company.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span className="text-sm">{company.phoneNumber}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="text-sm">{company.email}</span>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{company.website}</span>
                    </div>
                  )}
                </div>

                {/* Company Registration */}
                {(company.tin || company.cacNumber) && (
                  <div className="pt-4 border-t border-emerald-500/30 space-y-1 text-sm">
                    {company.tin && <div>Tax ID: {company.tin}</div>}
                    {company.cacNumber && <div>CAC: {company.cacNumber}</div>}
                  </div>
                )}
              </div>

              {/* Invoice Details */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5" />
                  <h2 className="text-2xl font-bold">INVOICE</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-emerald-100">Invoice #:</span>
                    <span className="font-bold">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-emerald-100">Issue Date:</span>
                    <span className="font-semibold">{formatDate(invoice.issueDate)}</span>
                  </div>
                  {invoice.dueDate && (
                    <div className="flex justify-between gap-4">
                      <span className="text-emerald-100">Due Date:</span>
                      <span className="font-semibold">{formatDate(invoice.dueDate)}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-white/20">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-100">Status:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {getStatusLabel(invoice.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Body */}
          <div className="p-8 md:p-12 space-y-8">
            {/* Customer Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b-2 border-emerald-100">
              <div>
                <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-4">
                  Bill To
                </h3>
                <div className="space-y-2 text-slate-700">
                  <p className="font-bold text-lg">{invoice.customerName}</p>
                  {invoice.customerAddress && (
                    <p className="text-sm">{invoice.customerAddress}</p>
                  )}
                  {invoice.customerEmail && (
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-600" />
                      {invoice.customerEmail}
                    </p>
                  )}
                  {invoice.customerPhone && (
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      {invoice.customerPhone}
                    </p>
                  )}
                  {invoice.customerTIN && (
                    <p className="text-sm text-slate-500">TIN: {invoice.customerTIN}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-4">
                Items
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-emerald-50">
                      <th className="text-left p-4 font-semibold text-emerald-900 border-b-2 border-emerald-200">
                        Description
                      </th>
                      <th className="text-right p-4 font-semibold text-emerald-900 border-b-2 border-emerald-200">
                        Quantity
                      </th>
                      <th className="text-right p-4 font-semibold text-emerald-900 border-b-2 border-emerald-200">
                        Unit Price
                      </th>
                      <th className="text-right p-4 font-semibold text-emerald-900 border-b-2 border-emerald-200">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="border-b border-emerald-100 hover:bg-emerald-50/50 transition-colors"
                      >
                        <td className="p-4 text-slate-700">{item.description}</td>
                        <td className="p-4 text-right text-slate-700">{item.quantity}</td>
                        <td className="p-4 text-right text-slate-700">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-900">
                          {formatCurrency(item.amount)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end">
              <div className="w-full md:w-96 space-y-3">
                <div className="flex justify-between text-slate-700 py-2 border-b border-emerald-100">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-700 py-2 border-b border-emerald-100">
                  <span className="font-medium">
                    VAT ({invoice.vatRate}%):
                  </span>
                  <span className="font-semibold">{formatCurrency(invoice.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-700 py-2 border-b border-emerald-100">
                  <span className="font-medium">Total (Before WHT):</span>
                  <span className="font-semibold">{formatCurrency(invoice.total)}</span>
                </div>
                {/* WHT Section - Only show if invoice is paid and has WHT */}
                {invoice.status.toLowerCase() === "paid" && (invoice.whtAmount || 0) > 0 && (
                  <>
                    <div className="flex justify-between text-amber-700 py-2 border-b-2 border-amber-200 bg-amber-50/50 rounded-lg px-3">
                      <span className="font-medium">
                        WHT ({invoice.whtRate}%):
                      </span>
                      <span className="font-semibold text-amber-600">
                        {formatCurrency(invoice.whtAmount!)}
                      </span>
                    </div>
                    <div className="flex justify-between py-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg px-4 border-2 border-emerald-200">
                      <span className="text-lg font-bold text-emerald-900">Net Amount (After WHT):</span>
                      <span className="text-2xl font-bold text-emerald-900">
                        {formatCurrency(invoice.netAmountAfterWHT || invoice.total)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 italic pt-2 border-t border-emerald-100">
                      * WHT deducted per NRS regulations. This is the amount actually received.
                    </div>
                  </>
                )}
                {(!invoice.whtAmount || invoice.whtAmount === 0 || invoice.status.toLowerCase() !== "paid") && (
                  <div className="flex justify-between py-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg px-4 border-2 border-emerald-200">
                    <span className="text-lg font-bold text-emerald-900">Total:</span>
                    <span className="text-2xl font-bold text-emerald-900">
                      {formatCurrency(invoice.total)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="pt-6 border-t-2 border-emerald-100">
                <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                  Notes
                </h3>
                <p className="text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-8 border-t-2 border-emerald-100 text-center text-sm text-slate-500">
              <p>Thank you for your company!</p>
              {company.name && (
                <p className="mt-2 font-semibold text-emerald-700">{company.name}</p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}








