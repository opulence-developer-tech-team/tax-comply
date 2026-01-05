"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

import { ModalSize } from "@/lib/utils/client-enums";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, size = ModalSize.Md, className }: ModalProps) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  const sizes = {
    [ModalSize.Sm]: "max-w-md",
    [ModalSize.Md]: "max-w-2xl",
    [ModalSize.Lg]: "max-w-4xl",
    [ModalSize.Xl]: "max-w-6xl",
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with luxury blur effect */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            onClick={onClose}
          />

          {/* Modal with premium styling */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ 
                duration: 0.3, 
                ease: [0.16, 1, 0.3, 1] // Custom easing for smooth luxury feel
              }}
              className={cn(
                "bg-white rounded-3xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] border-2 border-emerald-200/50 w-full pointer-events-auto max-h-[90vh] overflow-hidden",
                "ring-4 ring-emerald-50/50",
                sizes[size],
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Luxury Header with gradient and subtle pattern */}
              <div className="relative flex items-center justify-between p-6 border-b-2 border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-white overflow-hidden">
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/30 via-transparent to-transparent pointer-events-none" />
                
                {/* Content */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2.5 hover:bg-white/80 rounded-xl transition-all duration-200 text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content with smooth scrolling */}
              <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin custom-scrollbar">
                {children}
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

