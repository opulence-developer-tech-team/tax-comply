"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Invoice } from "@/store/redux/invoices/invoices-slice";

export function useInvoiceDownload() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    if (!invoiceId) return;
    
    setDownloadingId(invoiceId);
    try {
      const response = await fetch(`/api/v1/invoices/${invoiceId}/export`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.description || "Failed to download invoice PDF");
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Invoice downloaded successfully");
    } catch (error: any) {
      console.error("PDF download error:", error);
      toast.error(error.message || "Failed to download invoice PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return {
    downloadPDF,
    downloadingId,
    isDownloading: (id: string) => downloadingId === id
  };
}
