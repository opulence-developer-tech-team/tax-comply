"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Calendar, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterAll, ButtonSize } from "@/lib/utils/client-enums";

interface InvoiceSummaryTabProps {
  summaryYear: number | FilterAll;
  summaryMonth: number | FilterAll;
  onSummaryYearChange: (year: number | FilterAll) => void;
  onSummaryMonthChange: (month: number | FilterAll) => void;
}

export function InvoiceSummaryTab({
  summaryYear,
  summaryMonth,
  onSummaryYearChange,
  onSummaryMonthChange,
}: InvoiceSummaryTabProps) {
  const router = useRouter();

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <motion.div 
      key="summary-tab"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200 shadow-lg shadow-emerald-500/10">
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-emerald-600 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Financial Summary Reports</h2>
                <p className="text-slate-600 mt-1">View complete database summaries for any year or month</p>
              </div>
            </div>
          </div>

          {/* On-Demand Summary Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-emerald-200">
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span className="text-base font-semibold text-slate-700">View Complete Database Summary</span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Year Summary Section */}
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-5 border-2 border-emerald-200">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Year Summary</h3>
                    <p className="text-sm text-slate-600">View complete financial summary for a specific year or all years</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Select Year:</label>
                      <select
                        value={summaryYear}
                        onChange={(e) => {
                          const value = e.target.value === FilterAll.All ? FilterAll.All : parseInt(e.target.value);
                          onSummaryYearChange(value);
                        }}
                        className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium"
                      >
                        <option value={FilterAll.All}>All Years (2026+)</option>
                        {Array.from({ length: 10 }, (_, i) => {
                          // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
                          const currentYear = new Date().getFullYear();
                          const minTaxYear = 2026;
                          const validCurrentYear = Math.max(minTaxYear, currentYear);
                          const year = validCurrentYear - i;
                          // Only show years >= 2026
                          if (year >= minTaxYear) {
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          }
                          return null;
                        }).filter(Boolean)}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const yearParam = summaryYear === FilterAll.All ? FilterAll.All : summaryYear.toString();
                        router.push(`/dashboard/invoices/summary/year/${yearParam}`);
                      }}
                      className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/30 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex items-center justify-center cursor-pointer"
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      {summaryYear === FilterAll.All ? "View All Years Summary" : `View ${summaryYear} Summary`}
                    </button>
                  </div>
                </div>

                {/* Month Summary Section */}
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-5 border-2 border-emerald-200">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Month Summary</h3>
                    <p className="text-sm text-slate-600">View complete financial summary for a specific month and year</p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Year:</label>
                        <select
                          value={summaryYear === FilterAll.All ? Math.max(2026, new Date().getFullYear()) : summaryYear}
                          onChange={(e) => {
                            const year = parseInt(e.target.value);
                            onSummaryYearChange(year);
                          }}
                          className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm"
                        >
                          {Array.from({ length: 10 }, (_, i) => {
                            // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
                            const currentYear = new Date().getFullYear();
                            const minTaxYear = 2026;
                            const validCurrentYear = Math.max(minTaxYear, currentYear);
                            const year = validCurrentYear - i;
                            // Only show years >= 2026
                            if (year >= minTaxYear) {
                              return (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              );
                            }
                            return null;
                          }).filter(Boolean)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Month:</label>
                        <select
                          value={summaryMonth}
                          onChange={(e) => {
                            const value = e.target.value === FilterAll.All ? FilterAll.All : parseInt(e.target.value);
                            onSummaryMonthChange(value);
                          }}
                          className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm"
                        >
                          <option value={FilterAll.All}>Select Month</option>
                          {months.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button
                      size={ButtonSize.Sm}
                      onClick={() => {
                        if (summaryMonth !== FilterAll.All && summaryYear !== FilterAll.All) {
                          router.push(`/dashboard/invoices/summary/month/${summaryYear}/${summaryMonth}`);
                        }
                      }}
                      disabled={summaryMonth === FilterAll.All || summaryYear === FilterAll.All}
                      className="w-full whitespace-nowrap"
                    >
                      <Calendar className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">View Summary</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200 mt-6">
                <p className="text-sm text-blue-900 leading-relaxed">
                  <span className="font-semibold text-blue-950">Important:</span> Summary reports display all invoices for the selected period, independent of active filters. This helps provide comprehensive financial data for tax compliance, reporting, and company analysis purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}







