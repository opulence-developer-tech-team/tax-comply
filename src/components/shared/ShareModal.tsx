"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Share2,
  Copy,
  Check,
  Mail,
  MessageCircle,
  Facebook,
  Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  shareText: string;
  shareTitle: string;
}

/**
 * ShareModal Component
 * 
 * Provides fallback sharing options when native Web Share API is unavailable.
 * Includes social media platforms and copy-to-clipboard functionality.
 * 
 * Features:
 * - Multiple sharing channels (WhatsApp, Facebook, X/Twitter, Email, Copy)
 * - Copy-to-clipboard with visual feedback
 * - Responsive design
 * - Accessible
 * - Matches luxury design system
 */
export function ShareModal({
  isOpen,
  onClose,
  shareUrl,
  shareText,
  shareTitle,
}: ShareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  /**
   * Copy link to clipboard
   */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      
      // Track copy event
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "share_link_copied", {
          method: "clipboard",
        });
      }
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  /**
   * Share via WhatsApp
   */
  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText} ${shareUrl}`);
    const url = `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
    
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "share_clicked", { method: "whatsapp" });
    }
    onClose();
  };

  /**
   * Share via Facebook
   */
  const handleFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "share_clicked", { method: "facebook" });
    }
    onClose();
  };

  /**
   * Share via X (Twitter)
   */
  const handleTwitter = () => {
    const text = encodeURIComponent(`${shareText} ${shareUrl}`);
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
    
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "share_clicked", { method: "twitter" });
    }
    onClose();
  };

  /**
   * Share via Email
   */
  const handleEmail = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    const url = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = url;
    
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "share_clicked", { method: "email" });
    }
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      onClick: handleWhatsApp,
      color: "text-green-600",
      bgColor: "bg-green-50 hover:bg-green-100",
    },
    {
      name: "Facebook",
      icon: Facebook,
      onClick: handleFacebook,
      color: "text-blue-600",
      bgColor: "bg-blue-50 hover:bg-blue-100",
    },
    {
      name: "X (Twitter)",
      icon: Twitter,
      onClick: handleTwitter,
      color: "text-slate-900",
      bgColor: "bg-slate-50 hover:bg-slate-100",
    },
    {
      name: "Email",
      icon: Mail,
      onClick: handleEmail,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 hover:bg-emerald-100",
    },
  ];

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "bg-white rounded-2xl shadow-2xl border-2 border-emerald-100 w-full max-w-md pointer-events-auto max-h-[90vh] overflow-hidden",
                "flex flex-col"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center ring-2 ring-emerald-200/50">
                    <Share2 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Share TaxComply NG</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-emerald-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                  aria-label="Close share modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                {/* Share options */}
                <div className="grid grid-cols-2 gap-3">
                  {shareOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.name}
                        onClick={option.onClick}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-200 transition-all",
                          option.bgColor,
                          "hover:scale-105 active:scale-95"
                        )}
                      >
                        <Icon className={cn("w-6 h-6 mb-2", option.color)} />
                        <span className="text-sm font-medium text-slate-700">
                          {option.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Copy link section */}
                <div className="pt-4 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Or copy link
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm bg-slate-50 border-2 border-emerald-100 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant={copied ? ButtonVariant.Primary : ButtonVariant.Outline}
                      size={ButtonSize.Md}
                      className="shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

















