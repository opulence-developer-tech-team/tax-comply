"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PITYearFilterProps {
  selectedYear: number;
  availableYears: number[];
  filingDeadline: Date;
  isOverdue: boolean;
  daysUntilDeadline: number;
  onYearChange: (year: number) => void;
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

/**
 * PITYearFilter Component
 * 
 * Year selector with filing deadline display.
 * Production-ready with proper validation and accessibility.
 */
export function PITYearFilter({
  selectedYear,
  availableYears,
  filingDeadline,
  isOverdue,
  daysUntilDeadline,
  onYearChange,
}: PITYearFilterProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <label htmlFor="pit-tax-year-select" className="text-sm font-medium text-slate-700 whitespace-nowrap">
              Tax Year:
            </label>
            <select
              id="pit-tax-year-select"
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1 md:w-auto"
              aria-label="Select tax year"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg md:bg-transparent md:p-0 w-full md:w-auto border md:border-none border-slate-100">
            <Calendar className="w-4 h-4 shrink-0 text-slate-400 md:text-currentColor" aria-hidden="true" />
            <span className="leading-snug">
              Filing Deadline: <span className="font-semibold text-slate-900">{formatDate(filingDeadline.toISOString())}</span>
              {isOverdue && (
                <span className="ml-2 text-red-600 font-bold block sm:inline sm:ml-2">(Overdue)</span>
              )}
              {!isOverdue && daysUntilDeadline > 0 && (
                <span className="ml-2 text-amber-600 font-medium block sm:inline sm:ml-2">
                  ({daysUntilDeadline} day{daysUntilDeadline !== 1 ? "s" : ""} remaining)
                </span>
              )}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}






