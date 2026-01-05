"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FileText, Calendar, Clock, Eye, Edit, Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getStatusConfig } from "./utils";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { Invoice } from "@/store/redux/invoices/invoices-slice";

interface InvoiceCardProps {
  invoice: Invoice;
  index: number;
  onEditClick?: (invoiceId: string) => void;
  onViewClick?: (invoiceId: string) => void;
  onDownloadClick?: (invoiceId: string) => void;
  isDownloading?: boolean;
}

export function InvoiceCard({ invoice, index, onEditClick, onViewClick, onDownloadClick, isDownloading }: InvoiceCardProps) {
  const router = useRouter();
  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "paid";

  return (
    <motion.div
      key={invoice._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group"
    >
      <Card className="bg-gradient-to-br from-white to-emerald-50/10 border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 gap-4">
            <div className="flex-1 w-full md:w-auto">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{invoice.invoiceNumber}</h3>
                  <p className="text-sm text-slate-600 truncate">{invoice.customerName}</p>
                </div>
              </div>
              {invoice.customerEmail && (
                <p className="text-sm text-slate-500 ml-11 truncate max-w-[250px] md:max-w-none">{invoice.customerEmail}</p>
              )}
            </div>

            <div className="flex flex-row md:flex-col items-center justify-between md:items-end w-full md:w-auto gap-3 md:gap-0">
              {/* Status Badge */}
              <div
                className={`flex items-center space-x-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 ${statusConfig.className} shadow-sm shrink-0`}
              >
                <div className={`w-2 h-2 rounded-full ${statusConfig.dotClassName}`}></div>
                <StatusIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-semibold">{statusConfig.label}</span>
              </div>

              {/* Amount */}
              <div className="text-right md:mt-2">
                <p className="text-xl md:text-2xl font-bold text-slate-900">
                  {formatCurrency(
                    invoice.netAmountAfterWHT && invoice.netAmountAfterWHT > 0
                      ? invoice.netAmountAfterWHT
                      : invoice.total
                  )}
                </p>
                
                <div className="flex flex-col items-end">
                    {(invoice.vatAmount || 0) > 0 && (
                      <p className="text-xs text-emerald-600 mt-0.5 md:mt-1">
                        VAT: {formatCurrency(invoice.vatAmount)}
                      </p>
                    )}
                    {(invoice.whtAmount || 0) > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5 md:mt-1">
                        WHT ({invoice.whtRate}%): {formatCurrency(invoice.whtAmount)}
                      </p>
                    )}
                     {(invoice.whtAmount || 0) > 0 && (
                      <p className="text-[10px] md:text-xs text-slate-400 md:text-slate-500 mt-0.5">
                        Total: {formatCurrency(invoice.total)}
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:grid md:grid-cols-3 gap-4 pt-4 border-t border-emerald-100">
            <div className="flex items-center justify-between md:justify-start space-x-2">
               <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Issue Date</p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(new Date(invoice.issueDate))}
                    </p>
                  </div>
               </div>
               
               {/* Mobile-only spacer if needed, or just let them stack/justify */}
            </div>

            {invoice.dueDate && (
              <div className="flex items-center space-x-2 md:col-start-2">
                <Clock className={`w-4 h-4 shrink-0 ${isOverdue ? "text-red-500" : "text-slate-400"}`} />
                <div>
                  <p className="text-xs text-slate-500">Due Date</p>
                  <p className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-slate-900"}`}>
                    {formatDate(new Date(invoice.dueDate))}
                    {isOverdue && <span className="ml-2 text-red-600 font-bold text-xs">Overdue</span>}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-start md:justify-end gap-2 md:col-start-3 w-full md:w-auto md:overflow-visible">
              {onEditClick && (
                <Button
                  variant={ButtonVariant.Outline}
                  onClick={() => onEditClick(invoice._id)}
                  className="w-full md:w-auto border-2 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 bg-emerald-50 justify-center"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {onDownloadClick && (
                <Button
                  variant={ButtonVariant.Outline}
                  onClick={() => onDownloadClick(invoice._id)}
                  disabled={isDownloading}
                  className="w-full md:w-auto border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 justify-center"
                >
                  {isDownloading ? (
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isDownloading ? "Downloading..." : "PDF"}
                </Button>
              )}
              {onViewClick && (
                <Button
                  variant={ButtonVariant.Ghost}
                  onClick={() => onViewClick(invoice._id)}
                  className="w-full md:w-auto text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium px-4 justify-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}








