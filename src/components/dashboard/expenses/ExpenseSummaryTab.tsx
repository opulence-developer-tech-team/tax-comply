"use client";

import { motion } from "framer-motion";
import { Calendar, Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ButtonSize, ButtonVariant } from "@/lib/utils/client-enums";

interface ExpenseSummaryTabProps {
  summaryYear: number;
  summaryMonth: number;
  yearlySummaryYear: number;
  onSummaryYearChange: (year: number) => void;
  onSummaryMonthChange: (month: number) => void;
  onYearlySummaryYearChange: (year: number) => void;
  onExportMonthly?: (year: number, month: number) => void;
  onExportYearly?: (year: number) => void;
  isExportingMonthly?: boolean;
  isExportingYearly?: boolean;
}

export function ExpenseSummaryTab({ 
  summaryYear, 
  summaryMonth,
  yearlySummaryYear,
  onSummaryYearChange,
  onSummaryMonthChange,
  onYearlySummaryYearChange,
  onExportMonthly,
  onExportYearly,
  isExportingMonthly = false,
  isExportingYearly = false,
}: ExpenseSummaryTabProps) {
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
        <div className="p-0 md:p-6">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-600 rounded-xl shrink-0">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Export Expense Reports</h2>
                <p className="text-sm sm:text-base text-slate-600 mt-1">Generate and download expense reports as PDFs</p>
              </div>
            </div>
          </div>

          {/* PDF Export Sections */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-emerald-200">
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span className="text-base font-semibold text-slate-700">Generate Expense Report PDFs</span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Yearly Export Section */}
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-5 border-2 border-emerald-200">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Yearly Report</h3>
                    <p className="text-sm text-slate-600">Export expense report for a specific year</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Select Year: *</label>
                      <select
                        value={yearlySummaryYear}
                        onChange={(e) => onYearlySummaryYearChange(parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium"
                        required
                      >
                        {(() => {
                          const currentYear = new Date().getFullYear();
                          const minYear = 2026; // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
                          // Generate years from currentYear down to minYear, but not more than 10 years
                          // If currentYear < minYear, start from minYear and go forward
                          const years: number[] = [];
                          const startYear = Math.max(minYear, currentYear);
                          
                          for (let i = 0; i < 10; i++) {
                            const year = startYear - i;
                            if (year >= minYear) {
                              years.push(year);
                            } else {
                              break; // Stop if we've reached minYear
                            }
                          }
                          
                          return years.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                    {/* Export Button */}
                    {onExportYearly && (
                      <div className="mt-4">
                        <Button
                          size={ButtonSize.Md}
                          variant={ButtonVariant.Primary}
                          onClick={() => onExportYearly(yearlySummaryYear)}
                          disabled={isExportingYearly || !yearlySummaryYear}
                          className="w-full shadow-md hover:shadow-lg transition-all py-3"
                        >
                          {isExportingYearly ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Generating PDF...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Export {yearlySummaryYear}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Export Section */}
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-5 border-2 border-emerald-200">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Monthly Report</h3>
                    <p className="text-sm text-slate-600">Export expense report for a specific month and year</p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Year:</label>
                        <select
                          value={summaryYear}
                          onChange={(e) => onSummaryYearChange(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm"
                        >
                          {(() => {
                            const currentYear = new Date().getFullYear();
                            const minYear = 2026; // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
                            // Generate years from currentYear down to minYear, but not more than 10 years
                            // If currentYear < minYear, start from minYear and go forward
                            const years: number[] = [];
                            const startYear = Math.max(minYear, currentYear);
                            
                            for (let i = 0; i < 10; i++) {
                              const year = startYear - i;
                              if (year >= minYear) {
                                years.push(year);
                              } else {
                                break; // Stop if we've reached minYear
                              }
                            }
                            
                            return years.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Month:</label>
                        <select
                          value={summaryMonth}
                          onChange={(e) => onSummaryMonthChange(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm"
                        >
                          {months.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {/* Export Button */}
                    {onExportMonthly && (
                      <div className="mt-4">
                        <Button
                          size={ButtonSize.Md}
                          variant={ButtonVariant.Primary}
                          onClick={() => onExportMonthly(summaryYear, summaryMonth)}
                          disabled={isExportingMonthly || !summaryYear || !summaryMonth}
                          className="w-full shadow-md hover:shadow-lg transition-all py-3"
                        >
                          {isExportingMonthly ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Generating PDF...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Export {months.find((m) => m.value === summaryMonth)?.label} {summaryYear}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
