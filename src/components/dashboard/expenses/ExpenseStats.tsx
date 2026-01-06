"use client";

import { motion } from "framer-motion";
import { Receipt, TrendingDown, Calculator } from "lucide-react"; // DollarSign removed
import { NairaSign } from "@/components/icons/NairaSign";
import { formatCurrency } from "@/lib/utils";
import { Variants } from "framer-motion";

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

interface ExpenseStatsProps {
  total: number;
  totalAmount: number;
  taxDeductibleAmount: number;
  estimatedTaxSavings: number;
}

export function ExpenseStats({
  total,
  totalAmount,
  taxDeductibleAmount,
  estimatedTaxSavings,
}: ExpenseStatsProps) {
  return (
    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100 rounded-2xl p-6 shadow-lg shadow-emerald-500/10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <Receipt className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="text-sm font-bold text-emerald-700 bg-emerald-100/50 px-3 py-1 rounded-full border border-emerald-200">
            Count
          </span>
        </div>
        <p className="text-3xl font-bold text-slate-900 mb-2">{total}</p>
        <p className="text-base font-medium text-slate-600">Total Transactions</p>
      </motion.div>

      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100 rounded-2xl p-6 shadow-lg shadow-emerald-500/10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <NairaSign className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="text-sm font-bold text-emerald-700 bg-emerald-100/50 px-3 py-1 rounded-full border border-emerald-200">
            Spent
          </span>
        </div>
        <p className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(totalAmount)}</p>
        <p className="text-base font-medium text-slate-600">Total Money Out</p>
      </motion.div>

      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100 rounded-2xl p-6 shadow-lg shadow-emerald-500/10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <TrendingDown className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="text-sm font-bold text-emerald-700 bg-emerald-100/50 px-3 py-1 rounded-full border border-emerald-200">
            Valid
          </span>
        </div>
        <p className="text-3xl font-bold text-emerald-600 mb-2">{formatCurrency(taxDeductibleAmount)}</p>
        <p className="text-base font-medium text-slate-600">Tax Reducing Expenses</p>
      </motion.div>

      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100 rounded-2xl p-6 shadow-lg shadow-emerald-500/10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <Calculator className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="text-sm font-bold text-emerald-700 bg-emerald-100/50 px-3 py-1 rounded-full border border-emerald-200">
            Saved
          </span>
        </div>
        <p className="text-3xl font-bold text-emerald-600 mb-2">{formatCurrency(estimatedTaxSavings)}</p>
        <p className="text-base font-medium text-slate-600">Money Saved in Tax</p>
      </motion.div>
    </motion.div>
  );
}

