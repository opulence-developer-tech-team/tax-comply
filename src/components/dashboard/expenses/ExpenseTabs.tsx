"use client";

import { motion } from "framer-motion";
import { Receipt, FileText } from "lucide-react";
import { Variants } from "framer-motion";
import { ExpenseTabType } from "@/lib/utils/client-enums";

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

interface ExpenseTabsProps {
  activeTab: ExpenseTabType;
  onTabChange: (tab: ExpenseTabType) => void;
}

export function ExpenseTabs({ activeTab, onTabChange }: ExpenseTabsProps) {
  return (
    <motion.div variants={itemVariants}>
      <div className="flex items-center space-x-2 border-b-2 border-emerald-100 w-full overflow-x-auto">
        <button
          onClick={() => onTabChange(ExpenseTabType.Expenses)}
          className={`flex-1 sm:flex-none px-3 py-3 md:px-6 font-semibold text-xs md:text-sm transition-all relative whitespace-nowrap ${
            activeTab === ExpenseTabType.Expenses
              ? "text-emerald-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Receipt className="w-4 h-4 md:w-5 md:h-5" />
            <span>All Expenses</span>
          </div>
          {activeTab === ExpenseTabType.Expenses && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => onTabChange(ExpenseTabType.PDFReports)}
          className={`flex-1 sm:flex-none px-3 py-3 md:px-6 font-semibold text-xs md:text-sm transition-all relative whitespace-nowrap ${
            activeTab === ExpenseTabType.PDFReports
              ? "text-emerald-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
            <span>PDF Reports</span>
          </div>
          {activeTab === ExpenseTabType.PDFReports && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      </div>
    </motion.div>
  );
}

















