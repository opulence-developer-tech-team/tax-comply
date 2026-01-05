"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { InvoiceCard } from "./InvoiceCard";
import { Invoice } from "@/store/redux/invoices/invoices-slice";
import { Variants } from "framer-motion";
import { InvoiceFilterStatus } from "@/lib/utils/invoice-filter-status";
import { ButtonVariant } from "@/lib/utils/client-enums";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

interface InvoiceListProps {
  invoices: Invoice[];
  pagination: {
    total: number;
    pages: number;
  };
  currentPage: number;
  itemsPerPage: number;
  debouncedSearchTerm: string;
  statusFilter: string;
  onPageChange: (page: number) => void;
  onCreateClick?: () => void;
  onEditClick?: (invoiceId: string) => void;
  onViewClick?: (invoiceId: string) => void;
  onDownloadClick?: (invoiceId: string) => void;
  downloadingId?: string | null;
}

export function InvoiceList({
  invoices,
  pagination,
  currentPage,
  itemsPerPage,
  debouncedSearchTerm,
  statusFilter,
  onPageChange,
  onCreateClick,
  onEditClick,
  onViewClick,
  onDownloadClick,
  downloadingId,
}: InvoiceListProps) {
  const router = useRouter();

  if (invoices.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-br from-white to-emerald-50/20 border-2 border-emerald-100">
          <EmptyState
            icon="📄"
            title={debouncedSearchTerm || statusFilter !== InvoiceFilterStatus.All ? "No invoices found" : "No invoices yet"}
            description={
              debouncedSearchTerm || statusFilter !== InvoiceFilterStatus.All
                ? "Try changing your search words or check other folders."
                : "Create your first professional invoice now. It makes you look big!"
            }
            actionLabel={!debouncedSearchTerm && statusFilter === InvoiceFilterStatus.All ? "Create First Invoice" : undefined}
            onAction={
              !debouncedSearchTerm && statusFilter === InvoiceFilterStatus.All && onCreateClick ? onCreateClick : undefined
            }
            searchTerm={debouncedSearchTerm}
          />
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      key="invoice-list"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-600">
          Showing <span className="font-bold text-emerald-600">
            {pagination.total > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
          </span> to <span className="font-bold text-emerald-600">
            {Math.min(currentPage * itemsPerPage, pagination.total)}
          </span> of{" "}
          <span className="font-bold text-slate-900">{pagination.total}</span> invoice{pagination.total !== 1 ? 's' : ''}
          {debouncedSearchTerm && (
            <span className="ml-2 text-slate-500">
              (searching for &quot;{debouncedSearchTerm}&quot;)
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {invoices.map((invoice, index) => (
          <InvoiceCard 
            key={invoice._id} 
            invoice={invoice} 
            index={index} 
            onEditClick={onEditClick}
            onViewClick={onViewClick}
            onDownloadClick={onDownloadClick}
            isDownloading={downloadingId === invoice._id}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between pt-6 border-t border-emerald-100"
        >
          <div className="flex items-center space-x-2">
            <Button
              variant={ButtonVariant.Outline}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-2 border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed text-base px-4 py-2 h-12"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pageNum: number;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl text-lg font-bold transition-all ${
                      currentPage === pageNum
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-110"
                        : "bg-white text-slate-700 hover:bg-emerald-50 border-2 border-emerald-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant={ButtonVariant.Outline}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === pagination.pages}
              className="border-2 border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed text-base px-4 py-2 h-12"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>

          <div className="text-base font-medium text-slate-600">
            Page <span className="font-bold text-emerald-700 text-lg">{currentPage}</span> of{" "}
            <span className="font-bold text-slate-900 text-lg">{pagination.pages}</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

















