"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

interface PITInfoBannerProps {
  // No props needed - banner is always visible but collapsed by default
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

// Animation variants for expand/collapse
const contentVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
  },
  expanded: {
    height: "auto",
    opacity: 1,
  },
};

/**
 * PITInfoBanner Component
 * 
 * Collapsible information banner explaining what PIT is and key concepts.
 * Collapsed by default. Users can expand/collapse it as needed.
 * Production-ready with proper accessibility and state management.
 */
export function PITInfoBanner({}: PITInfoBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg relative"
      role="region"
      aria-label="Personal Income Tax Information"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100/50 transition-colors rounded-r-lg"
        aria-expanded={isExpanded}
        aria-controls="pit-info-content"
        type="button"
      >
        <div className="flex items-center gap-3 flex-1">
          <Info className="w-5 h-5 text-blue-600 shrink-0" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-blue-900">
            What is Personal Income Tax (PIT)?
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-blue-600 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-5 h-5 text-blue-600 shrink-0" aria-hidden="true" />
        )}
      </button>
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id="pit-info-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="text-sm text-blue-800 space-y-2 pt-2 border-t border-blue-200">
                <p>
                  <strong>Simple explanation:</strong> PIT is the tax you pay on money you earn from work or business income. 
                  Think of it like a small portion of your income that goes to the government.
                </p>
                <p>
                  <strong>When to pay:</strong> You must pay by March 31 of the next year. 
                  For example, if you earned money in 2026, you pay by March 31, 2027.
                </p>
                <p>
                  <strong>Good news:</strong> You don't pay tax on everything! Things like pension, 
                  housing fund, and some expenses reduce the amount you pay tax on.
                </p>
                <p>
                  <strong>Already paid some tax?</strong> If tax was deducted from your income (such as PAYE from employment or WHT from other sources), 
                  that counts! We subtract it from what you owe.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


