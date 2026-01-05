"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { IncomeSource } from "@/store/redux/income/income-slice";

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

interface IncomeSummaryProps {
  filteredIncome: IncomeSource[];
  selectedYear?: number | null;
  selectedMonth?: number | null;
}

/**
 * Income Summary Component
 * 
 * Displays summary statistics for filtered income sources.
 * Production-ready with proper calculations and formatting.
 */
export function IncomeSummary({ filteredIncome, selectedYear, selectedMonth }: IncomeSummaryProps) {
  // Calculate total income from all sources
  // CRITICAL FIX: Sum ACTUAL income entered, don't estimate by multiplying monthly income by 12
  // According to NRS (Nigeria Revenue Service) regulations, annual income should be the SUM of actual income earned during the tax year
  // 
  // Example:
  // - January: ₦500,000 → add ₦500,000
  // - February: ₦700,000 → add ₦700,000
  // - March: ₦600,000 → add ₦600,000
  // Total = ₦1,800,000 (NOT ₦500,000 × 12 = ₦6,000,000)
  //
  // For yearly income (month = null): use annualIncome directly
  // For monthly income (month = 1-12): sum the actual monthly amounts (don't multiply by 12)
  const totalIncome = filteredIncome.reduce((sum, income) => {
    // Sum actual income amounts - monthly incomes are already the actual monthly amount
    // Yearly incomes are already the annual amount
    return sum + (income.annualIncome || 0);
  }, 0);

  // Get unique tax years count
  const uniqueTaxYears = new Set(filteredIncome.map((income) => income.taxYear)).size;

  // Build summary title based on filters
  // CRITICAL: Validate month is between 1-12 to prevent invalid dates
  const getSummaryTitle = () => {
    // If month is selected, year must also be selected (month filter requires year)
    if (selectedMonth !== null && selectedMonth !== undefined && selectedMonth >= 1 && selectedMonth <= 12) {
      if (selectedYear !== null && selectedYear !== undefined) {
        // Monthly filter: show month and year
        const monthName = new Date(2000, selectedMonth - 1).toLocaleString("default", { month: "long" });
        return `Summary - ${monthName} ${selectedYear}`;
      }
      // Invalid state: month selected but no year - fall through to year-only or default
    }
    
    if (selectedYear !== null && selectedYear !== undefined) {
      // Yearly filter: show year only
      return `Summary - ${selectedYear}`;
    }
    
    // No filter: show "Summary"
    return "Summary";
  };

  // Only render if there are income sources
  if (filteredIncome.length === 0) {
    return null;
  }

  return (
    <motion.div 
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <Card title={getSummaryTitle()}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Total Income</p>
            <p className="text-2xl font-bold text-emerald-700" aria-label={`Total income: ${formatCurrency(totalIncome)}`}>
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Income Sources</p>
            <p className="text-2xl font-bold text-blue-700" aria-label={`${filteredIncome.length} income sources`}>
              {filteredIncome.length}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Tax Years</p>
            <p className="text-2xl font-bold text-purple-700" aria-label={`${uniqueTaxYears} tax years`}>
              {uniqueTaxYears}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

