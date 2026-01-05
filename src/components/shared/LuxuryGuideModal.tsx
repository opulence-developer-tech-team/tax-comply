"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { ReactNode } from "react";

interface LuxuryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function LuxuryGuideModal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  children,
  actionLabel = "I Understand Now",
  onAction
}: LuxuryGuideModalProps) {
  if (!isOpen) return null;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-end md:items-center justify-center">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto relative z-10"
          >
            {/* Header - Luxury Green Gradient */}
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 p-6 text-white shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{title}</h2>
                  <p className="text-emerald-100 mt-1 text-sm">
                    {subtitle}
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 bg-emerald-700/50 hover:bg-emerald-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-8">
              {children}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
               <button
                onClick={handleAction}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                {actionLabel}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
