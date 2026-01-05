"use client";

import { motion } from "framer-motion";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Coins, Calendar, Edit2, Trash2, RefreshCw } from "lucide-react";
import type { IncomeSource } from "@/store/redux/income/income-slice";

interface IncomeSourceCardProps {
  income: IncomeSource;
  isDeleting: boolean;
  onEdit: (income: IncomeSource) => void;
  onDelete: (income: IncomeSource) => void;
}

/**
 * Income Source Card Component
 * 
 * Displays a single income source with edit and delete actions.
 * Production-ready with proper accessibility and loading states.
 */
export function IncomeSourceCard({
  income,
  isDeleting,
  onEdit,
  onDelete,
}: IncomeSourceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-green-300 hover:bg-green-50/50 transition-all"
    >
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-1">
          <Coins className="w-5 h-5 text-green-600" aria-hidden="true" />
          <p className="text-xl font-bold text-slate-900">
            {formatCurrency(income.annualIncome)}
          </p>
          {income.month ? (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              Monthly
            </span>
          ) : (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
              Yearly
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4 text-sm text-slate-600 ml-8">
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <span>Tax Year {income.taxYear}</span>
          </div>
          {income.month && (
            <span>
              Month: {new Date(2000, income.month - 1).toLocaleString("default", { month: "long" })}
            </span>
          )}
          {income.createdAt && (
            <span>
              Added: {formatDate(income.createdAt)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        <button
          onClick={() => onEdit(income)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit income source"
          aria-label={`Edit income source: ${formatCurrency(income.annualIncome)}`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(income)}
          disabled={isDeleting}
          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete income source"
          aria-label={`Delete income source: ${formatCurrency(income.annualIncome)}`}
        >
          {isDeleting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </motion.div>
  );
}

