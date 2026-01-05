"use client";

import { motion } from "framer-motion";
import { FileText, TrendingUp } from "lucide-react";
import { Variants } from "framer-motion";
import { InvoiceTabType } from "@/lib/utils/client-enums";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

interface InvoiceTabsProps {
  activeTab: InvoiceTabType;
  onTabChange: (tab: InvoiceTabType) => void;
}

export function InvoiceTabs({ activeTab, onTabChange }: InvoiceTabsProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center space-x-2 border-b-2 border-emerald-100">
        <button
          onClick={() => onTabChange(InvoiceTabType.Invoices)}
          className={`px-6 py-3 font-semibold text-sm transition-all relative ${
            activeTab === InvoiceTabType.Invoices
              ? "text-emerald-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>All Invoices</span>
          </div>
          {activeTab === InvoiceTabType.Invoices && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
{/* 
        <button
          onClick={() => onTabChange(InvoiceTabType.Summary)}
          className={`px-6 py-3 font-semibold text-sm transition-all relative ${
            activeTab === InvoiceTabType.Summary
              ? "text-emerald-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Money Summary</span>
          </div>
          {activeTab === InvoiceTabType.Summary && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button> 
        */}
      </div>
    </motion.div>
  );
}

















