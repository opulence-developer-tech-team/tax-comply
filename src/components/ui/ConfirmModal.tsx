"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, LogOut } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";
import { ConfirmModalVariant, ButtonVariant } from "@/lib/utils/client-enums";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string | React.ReactNode; // Support both string and ReactNode for rich content
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  isLoading?: boolean;
}

/**
 * Luxury green corporate-level confirmation modal
 * 
 * Features:
 * - Premium emerald green design with corporate elegance
 * - Smooth animations and transitions
 * - Accessible keyboard navigation
 * - Loading state support
 * - Multiple variants (danger, warning, info)
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = ConfirmModalVariant.Danger,
  isLoading = false,
}: ConfirmModalProps) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, isLoading]);

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

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // Variant-specific styling
  const variantStyles = {
    danger: {
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      borderColor: "border-red-200",
      headerBg: "bg-gradient-to-r from-red-50 via-emerald-50 to-white",
      accentColor: "text-red-700",
    },
    warning: {
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      borderColor: "border-amber-200",
      headerBg: "bg-gradient-to-r from-amber-50 via-emerald-50 to-white",
      accentColor: "text-amber-700",
    },
    info: {
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-200",
      headerBg: "bg-gradient-to-r from-emerald-50 to-white",
      accentColor: "text-emerald-700",
    },
    logout: {
      iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      iconColor: "text-white",
      borderColor: "border-emerald-300",
      headerBg: "bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-white",
      accentColor: "text-emerald-700",
    },
  };

  const styles = variantStyles[variant];

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={handleCancel}
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
                "bg-white rounded-2xl shadow-2xl border-2 w-full pointer-events-auto max-w-lg max-h-[90vh] flex flex-col",
                styles.borderColor
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with luxury gradient */}
              <div className={cn(
                "flex items-center justify-between p-4 sm:p-6 border-b-2 rounded-t-2xl shrink-0",
                styles.borderColor,
                styles.headerBg
              )}>
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "p-2.5 rounded-xl shadow-sm",
                    styles.iconBg
                  )}>
                    {variant === ConfirmModalVariant.Logout ? (
                      <LogOut className={cn("w-6 h-6", styles.iconColor)} />
                    ) : (
                      <AlertTriangle className={cn("w-6 h-6", styles.iconColor)} />
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 line-clamp-2">{title}</h2>
                </div>
                {!isLoading && (
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-white/60 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin min-h-0">
                  {typeof message === "string" ? (
                    <p className="text-slate-700 leading-relaxed text-base">
                      {message}
                    </p>
                  ) : (
                    <div className="text-slate-700 leading-relaxed text-base">
                      {message}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-3 sm:space-x-3 pt-4 mt-4 border-t border-slate-100 shrink-0">
                  <Button
                    variant={ButtonVariant.Outline}
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="w-full sm:w-auto min-w-[100px] border-slate-200 text-slate-700 hover:bg-slate-50 order-1 sm:order-none"
                  >
                    {cancelLabel}
                  </Button>
                  <Button
                    variant={variant === ConfirmModalVariant.Danger ? ButtonVariant.Danger : ButtonVariant.Primary}
                    onClick={handleConfirm}
                    loading={isLoading}
                    disabled={isLoading}
                    className={cn(
                      "w-full sm:w-auto min-w-[100px] order-2 sm:order-none",
                      variant === ConfirmModalVariant.Logout 
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 border-0 text-white shadow-lg" 
                        : ""
                    )}
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;

  return createPortal(modalContent, document.body);
}





