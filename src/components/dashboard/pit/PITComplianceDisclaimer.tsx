"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

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

/**
 * PITComplianceDisclaimer Component
 * 
 * Displays important compliance information and disclaimers about PIT calculations.
 * Includes links to official NRS (Nigeria Revenue Service) resources.
 * 
 * Production-ready with proper accessibility and external link handling.
 * 
 * NOTE: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025.
 */
export function PITComplianceDisclaimer() {
  return (
    <motion.div variants={itemVariants} className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            Important Information You Should Know
          </h3>
          <div className="text-sm text-amber-800 space-y-2">
            <p>
              <strong>How accurate is this?</strong> We calculate everything using the official Nigeria Tax Act 2025 (effective from 2026) and NRS (Nigeria Revenue Service) rules. 
              However, we recommend you also check with a tax professional before paying, especially if your situation is complicated.
            </p>
            <p>
              <strong>When do I need to pay?</strong> You must pay your tax by March 31 of the next year. 
              For example, if you earned money in 2026, you must pay by March 31, 2027. 
              If you pay late, you might have to pay extra money (penalties).
            </p>
            <p>
              <strong>Need more help?</strong> Visit the official NRS (Nigeria Revenue Service) website for the latest rules:{" "}
              <a
                href="https://www.nrs.gov.ng/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-900 font-semibold"
                aria-label="Visit NRS (Nigeria Revenue Service) website (opens in new tab)"
              >
                NRS (Nigeria Revenue Service) - www.nrs.gov.ng
              </a>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}



