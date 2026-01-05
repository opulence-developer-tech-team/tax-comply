"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useHttp } from "@/hooks/useHttp";
import { LoadingState } from "@/components/shared/LoadingState";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { HttpMethod } from "@/lib/utils/http-method";
import { FileText, Download, X, Calendar, User, MapPin, Mail, Phone, Hash } from "lucide-react";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { getStatusConfig } from "./utils";
import { toast } from "sonner";

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category?: string;
}

interface InvoiceDetail {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTIN?: string;
  issueDate: string;
  dueDate?: string;
  status: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  whtAmount: number;
  whtRate: number;
  whtType?: string;
  total: number;
  netAmountAfterWHT: number;
  isVATExempted: boolean;
  notes?: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${config.className}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config.dotClassName}`}></div>
      <Icon className="w-3 h-3" />
      <span className="text-xs font-semibold">{config.label}</span>
    </div>
  );
}

export function InvoiceDetailsModal({ isOpen, onClose, invoiceId }: InvoiceDetailsModalProps) {
  const { isLoading, sendHttpRequest: fetchInvoiceReq } = useHttp();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(() => {
    if (!invoiceId) return;

    setError(null);
    fetchInvoiceReq({
      successRes: (response: any) => {
        const data = response?.data?.data || response?.data;
        if (data) {
          setInvoice(data);
        } else {
          setError("Invoice data not found");
        }
      },
      errorRes: (errorResponse: any) => {
        setError(errorResponse?.data?.description || "Failed to load invoice details");
        return true; // Let useHttp handle logging
      },
      requestConfig: {
        url: `/invoices/${invoiceId}`,
        method: HttpMethod.GET,
      },
    });
  }, [invoiceId, fetchInvoiceReq]);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoice();
    } else {
      setInvoice(null);
      setError(null);
    }
  }, [isOpen, invoiceId, fetchInvoice]);

  const { downloadPDF, downloadingId } = useInvoiceDownload();

  const handleDownloadPDF = () => {
    if (!invoiceId || !invoice) return;
    downloadPDF(invoiceId, invoice.invoiceNumber);
  };
  
  const isDownloading = downloadingId === invoiceId;

  if (!isOpen) return null;

  return (
    <FullScreenModal isOpen={isOpen} onClose={onClose} title="Invoice Details">
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {isLoading && !invoice ? (
          <div className="py-20">
            <LoadingState message="Loading invoice details..." />
          </div>
        ) : error ? (
          <div className="py-10">
            <ErrorState 
              title="Could not load invoice" 
              description={error}
              primaryAction={{
                label: "Try Again",
                onClick: fetchInvoice
              }}
            />
          </div>
        ) : invoice ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border-2 border-slate-100 shadow-sm">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
                  <StatusBadge status={invoice.status} />
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Issued: {formatDate(invoice.issueDate)}
                </p>
              </div>
              <div className="flex gap-3">
                 <Button
                  variant={ButtonVariant.Outline}
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="border-slate-200"
                >
                  {isDownloading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      Downloading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </span>
                  )}
                </Button>
                <Button variant={ButtonVariant.Ghost} onClick={onClose}>
                  <X className="w-4 h-4" />
                  Close
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Details */}
              <Card className="border-slate-100 shadow-sm">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold border-b border-slate-100 pb-2">
                    <User className="w-5 h-5" />
                    <h2>Bill To</h2>
                  </div>
                  <div className="space-y-3">
                    <div className="font-bold text-lg text-slate-800">{invoice.customerName}</div>
                    
                    {invoice.customerEmail && (
                      <div className="flex items-start gap-3 text-sm text-slate-600">
                        <Mail className="w-4 h-4 mt-0.5 text-slate-400" />
                        <span>{invoice.customerEmail}</span>
                      </div>
                    )}
                    
                    {invoice.customerPhone && (
                      <div className="flex items-start gap-3 text-sm text-slate-600">
                        <Phone className="w-4 h-4 mt-0.5 text-slate-400" />
                        <span>{invoice.customerPhone}</span>
                      </div>
                    )}
                    
                    {invoice.customerAddress && (
                      <div className="flex items-start gap-3 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                        <span>{invoice.customerAddress}</span>
                      </div>
                    )}

                    {invoice.customerTIN && (
                      <div className="flex items-start gap-3 text-sm text-slate-600">
                        <Hash className="w-4 h-4 mt-0.5 text-slate-400" />
                        <span>TIN: {invoice.customerTIN}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Payment Details */}
              <Card className="border-slate-100 shadow-sm">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold border-b border-slate-100 pb-2">
                    <FileText className="w-5 h-5" />
                    <h2>Invoice Details</h2>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Invoice Date</span>
                      <span className="font-medium text-slate-900">{formatDate(invoice.issueDate)}</span>
                    </div>
                    {invoice.dueDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Due Date</span>
                        <span className="font-medium text-slate-900">{formatDate(invoice.dueDate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">VAT Status</span>
                      <span className={`font-medium ${invoice.isVATExempted ? "text-amber-600" : "text-slate-900"}`}>
                        {invoice.isVATExempted ? "Exempted (Small Business / Exempt Goods)" : "Standard Rate (7.5%)"}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Items Table */}
            <Card className="border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-center w-24">Qty</th>
                      <th className="px-6 py-4 text-right w-32">Unit Price</th>
                      <th className="px-6 py-4 text-right w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-900 font-medium">
                          {item.description}
                          {item.category && (
                            <div className="text-xs text-slate-500 font-normal mt-0.5">
                              {item.category}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-6 py-4 text-right text-emerald-700 font-medium">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Totals Section */}
            <div className="flex justify-end">
              <Card className="w-full md:w-1/2 lg:w-1/3 border-slate-100 shadow-sm bg-slate-50/50">
                <div className="p-6 space-y-3">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900">{formatCurrency(invoice.subtotal)}</span>
                  </div>

                  {!invoice.isVATExempted && invoice.vatAmount > 0 && (
                     <div className="flex justify-between text-sm text-emerald-600">
                      <span>VAT (7.5%)</span>
                      <span className="font-medium">{formatCurrency(invoice.vatAmount)}</span>
                    </div>
                  )}

                  {invoice.whtAmount > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>WHT ({invoice.whtRate}%)</span>
                      <span className="font-medium">-{formatCurrency(invoice.whtAmount)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 my-2 pt-3 flex justify-between items-end">
                    <span className="text-base font-bold text-slate-900">
                      {invoice.whtAmount > 0 ? "Net Amount" : "Total Amount"}
                    </span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-emerald-700">
                        {formatCurrency(invoice.netAmountAfterWHT > 0 ? invoice.netAmountAfterWHT : invoice.total)}
                      </span>
                      {invoice.whtAmount > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          Total (Before WHT): {formatCurrency(invoice.total)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <Card className="border-slate-100 shadow-sm bg-amber-50/30">
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </Card>
            )}

          </motion.div>
        ) : null}
      </div>
    </FullScreenModal>
  );
}
