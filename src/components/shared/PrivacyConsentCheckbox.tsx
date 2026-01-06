"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface PrivacyConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  touched?: boolean;
  entityType?: "company" | "business";
}

export function PrivacyConsentCheckbox({
  checked,
  onChange,
  error,
  touched,
  entityType = "company",
}: PrivacyConsentCheckboxProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
      className="border-t border-slate-200 pt-6 mt-6"
    >
      <div className="flex items-start">
        <input
          type="checkbox"
          id="privacyConsentGiven"
          checked={checked || false}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2"
        />
        <label htmlFor="privacyConsentGiven" className="ml-3 text-sm text-slate-600">
          I agree to the <Link href="/privacy-policy" className="text-emerald-600 hover:text-emerald-700 font-medium">Privacy Policy</Link> and consent to the processing of my {entityType}'s data for tax purposes.
          {touched && error && (
            <p className="text-red-500 mt-1">{error}</p>
          )}
        </label>
      </div>
    </motion.div>
  );
}
