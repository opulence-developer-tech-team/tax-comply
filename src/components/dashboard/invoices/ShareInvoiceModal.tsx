"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import { SharePromptPosition, ToastType, ModalSize, ButtonVariant } from "@/lib/utils/client-enums";
import { Button } from "@/components/ui/Button";
import { Share2, Copy, Check, X, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface ShareInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
}

export function ShareInvoiceModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
}: ShareInvoiceModalProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (isOpen && invoiceId) {
      // Generate the public invoice URL
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${baseUrl}/invoice/${invoiceId}`;
      setShareUrl(url);
    }
  }, [isOpen, invoiceId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast("Link copied to clipboard!", ToastType.Success);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast("Failed to copy link. Please try again.", ToastType.Error);
    }
  };

  const handleNativeShare = async () => {
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `Invoice ${invoiceNumber}`,
          text: `View invoice ${invoiceNumber}`,
          url: shareUrl,
        });
        showToast("Shared successfully!", ToastType.Success);
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== "AbortError") {
          showToast("Failed to share. Please try copying the link instead.", ToastType.Error);
        }
      }
    } else {
      // Fallback to copy if native share not available
      handleCopyLink();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Invoice"
      size={ModalSize.Md}
    >
      <div className="space-y-6">
        {/* Header Message with enhanced styling */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center space-y-3"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-50 mb-4 shadow-lg ring-4 ring-emerald-50"
          >
            <Share2 className="w-10 h-10 text-emerald-600" />
          </motion.div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Share Invoice {invoiceNumber}
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Send this link to your customer to view their invoice
          </p>
        </motion.div>

        {/* Link Display with premium styling */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="space-y-2"
        >
          <label className="block text-sm font-semibold text-slate-700">
            Invoice Link
          </label>
          <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-slate-50 to-emerald-50/30 border-2 border-emerald-200/60 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none font-mono"
            />
            <motion.button
              onClick={handleCopyLink}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 hover:bg-emerald-100 rounded-xl transition-all duration-200 text-emerald-600 hover:text-emerald-700 shadow-sm hover:shadow-md"
              title="Copy link"
            >
              {copied ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Check className="w-5 h-5 text-emerald-600" />
                </motion.div>
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 pt-4"
        >
          {(navigator as any).share && (
            <Button
              onClick={handleNativeShare}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share via...
            </Button>
          )}
          <Button
            onClick={handleCopyLink}
            variant={(navigator as any).share ? ButtonVariant.Outline : ButtonVariant.Primary}
            className={(navigator as any).share ? "flex-1" : "flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </motion.div>

        {/* Preview Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="pt-4 border-t border-emerald-100"
        >
          <Button
            onClick={() => {
              window.open(shareUrl, "_blank", "noopener,noreferrer");
            }}
            variant={ButtonVariant.Outline}
            className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview Invoice Page
          </Button>
        </motion.div>

        {/* Info Message with enhanced styling */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-50/50 border-2 border-emerald-200/60 rounded-xl shadow-sm"
        >
          <p className="text-sm text-emerald-800 leading-relaxed">
            💡 <strong className="font-semibold">Tip:</strong> Share this link via email, WhatsApp, or any messaging platform. 
            Your customer can view the invoice without logging in.
          </p>
        </motion.div>
      </div>
    </Modal>
  );
}

