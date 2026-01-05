import { CheckCircle2, Clock, FileText, XCircle, LucideIcon } from "lucide-react";
import { InvoiceStatus, getInvoiceStatusLabel } from "./statusUtils";
import { InvoiceSortField, SortOrder } from "@/lib/utils/client-enums";
import { InvoiceFilterStatus } from "@/lib/utils/invoice-filter-status";

export interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
  dotClassName: string;
}

export function getStatusConfig(status: string): StatusConfig {
  // Use the centralized status label function
  const normalizedStatus = status.toLowerCase() as InvoiceStatus;
  
  switch (normalizedStatus) {
    case InvoiceStatus.Paid:
      return {
        label: getInvoiceStatusLabel(InvoiceStatus.Paid),
        icon: CheckCircle2,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotClassName: "bg-emerald-500",
      };
    case InvoiceStatus.Pending:
      return {
        label: getInvoiceStatusLabel(InvoiceStatus.Pending),
        icon: Clock,
        className: "bg-amber-50 text-amber-700 border-amber-200",
        dotClassName: "bg-amber-500",
      };
    case InvoiceStatus.Cancelled:
      return {
        label: getInvoiceStatusLabel(InvoiceStatus.Cancelled),
        icon: XCircle,
        className: "bg-red-50 text-red-700 border-red-200",
        dotClassName: "bg-red-500",
      };
    default:
      return {
        label: status,
        icon: FileText,
        className: "bg-slate-50 text-slate-700 border-slate-200",
        dotClassName: "bg-slate-500",
      };
  }
}

export type SortField = InvoiceSortField;
export type SortOrderType = SortOrder;
export type StatusFilter = InvoiceFilterStatus;
















