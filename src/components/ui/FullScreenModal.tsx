"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function FullScreenModal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: FullScreenModalProps) {
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

          {/* Full Screen Modal with premium styling */}
          <div className="fixed inset-0 z-[100] pointer-events-none">
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ 
                duration: 0.35, 
                ease: [0.16, 1, 0.3, 1] // Custom easing for smooth luxury feel
              }}
              className={cn(
                "bg-white w-full h-full pointer-events-auto flex flex-col overflow-hidden",
                "shadow-[0_0_0_1px_rgba(0,0,0,0.05)]",
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Luxury Header with gradient and decorative elements */}
              <div className="relative flex items-center justify-between p-6 md:p-8 border-b-2 border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-white shrink-0 overflow-hidden">
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/40 via-transparent to-transparent pointer-events-none" />
                
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
                     style={{
                       backgroundImage: `radial-gradient(circle at 2px 2px, rgb(0,0,0) 1px, transparent 0)`,
                       backgroundSize: '24px 24px'
                     }}
                />
                
                {/* Content */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-3 hover:bg-white/80 rounded-xl transition-all duration-200 text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                    aria-label="Close modal"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content - Scrollable with smooth scrolling */}
              <div className="flex-1 overflow-y-auto scrollbar-thin custom-scrollbar">
                <div className="max-w-6xl mx-auto p-6 md:p-8 lg:p-12">
                  {children}
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

