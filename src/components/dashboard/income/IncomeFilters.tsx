"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Search, Filter, Calendar, ChevronDown, X } from "lucide-react";

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

interface IncomeFiltersProps {
  searchQuery: string;
  selectedYear: number | null;
  selectedMonth: number | null;
  availableYears: number[];
  onSearchChange: (value: string) => void;
  onYearChange: (year: number | null) => void;
  onMonthChange: (month: number | null) => void;
}

/**
 * Income Filters Component
 * 
 * Collapsible filter panel with search, year, and month filters.
 * Production-ready with accessibility and smooth animations.
 * CRITICAL: Always defaults to collapsed for consistent UX.
 */
export function IncomeFilters({
  searchQuery,
  selectedYear,
  selectedMonth,
  availableYears,
  onSearchChange,
  onYearChange,
  onMonthChange,
}: IncomeFiltersProps) {
  // Collapsible state - ALWAYS defaults to collapsed
  // CRITICAL: Always start collapsed, don't persist to localStorage
  // This ensures consistent UX - filters are hidden by default
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded((prev: boolean) => !prev);
  };

  // Keyboard support for accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpanded();
    }
  };

  // Check if any filters are active (for visual indicator)
  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  // Enforce minimum year 2026 for comparison
  const currentYear = new Date().getFullYear();
  const minTaxYear = 2026;
  const validCurrentYear = Math.max(minTaxYear, currentYear);
  const yearIsActive = selectedYear === null || (selectedYear !== null && selectedYear !== validCurrentYear);
  const hasActiveFilters = 
    yearIsActive || 
    selectedMonth !== null || 
    searchQuery.trim().length > 0;

  // Count active filters
  const activeFiltersCount = [
    yearIsActive,
    selectedMonth !== null,
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  // Get month label helper
  const getMonthLabel = (month: number | null): string => {
    if (month === null) return "";
    return new Date(2000, month - 1).toLocaleString("default", { month: "long" });
  };

  // Clear all filters
  const handleClearFilters = () => {
    onSearchChange("");
    onYearChange(null);
    onMonthChange(null);
  };

  return (
    <motion.div variants={itemVariants}>
      <Card 
        className="bg-gradient-to-br from-white to-green-50/20 border-2 border-green-100 shadow-xl shadow-green-500/10 overflow-hidden rounded-xl"
        disableAnimation
      >
        {/* Header - Always visible, clickable to toggle */}
        <button
          onClick={toggleExpanded}
          onKeyDown={handleKeyDown}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-green-50/50 active:bg-green-100/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer rounded-t-xl"
          aria-expanded={isExpanded}
          aria-controls="income-filters-content"
          aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
          type="button"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${
              hasActiveFilters 
                ? "bg-green-100 text-green-700" 
                : "bg-slate-100 text-slate-600"
            }`}>
              <Filter className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-slate-900">Filters & Search</h3>
              <p className="text-xs text-green-600 font-medium mt-0.5">
                {!hasActiveFilters ? (
                  <span className="text-slate-500">No active filters</span>
                ) : (
                  <>
                    {selectedYear === null && (
                      <span className="font-bold">Year: All Years</span>
                    )}
                    {selectedYear !== null && selectedYear !== validCurrentYear && (
                      <span className="font-bold">Year: {selectedYear}</span>
                    )}
                    {(selectedYear === null || (selectedYear !== null && selectedYear !== validCurrentYear)) && selectedMonth !== null && " • "}
                    {selectedMonth !== null && (
                      <span className="font-bold">Month: {getMonthLabel(selectedMonth)}</span>
                    )}
                    {((selectedYear === null || (selectedYear !== null && selectedYear !== validCurrentYear)) || selectedMonth !== null) && searchQuery.trim().length > 0 && " • "}
                    {searchQuery.trim().length > 0 && (
                      <span className="font-bold">Search: "{searchQuery.trim()}"</span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && !isExpanded && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                {activeFiltersCount} Active
              </span>
            )}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <ChevronDown className="w-5 h-5 text-slate-600" />
            </motion.div>
          </div>
        </button>

        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              id="income-filters-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: "easeInOut",
                opacity: { duration: 0.2 }
              }}
              style={{ overflow: "hidden" }}
              className="rounded-b-xl"
            >
              <div className="space-y-6 px-6 py-6 bg-slate-50/50">
                {/* Search Bar - Full Width */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 z-10 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by amount, year, or month..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-12 pr-12 border-2 border-green-100 focus:border-green-500 focus:ring-green-500/20 bg-white"
                    aria-label="Search income sources"
                  />
                </div>

                {/* Filters Row - Year and Month */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Year Filter */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-green-600" />
                      Tax Year
                    </label>
                    <select
                      value={selectedYear || ""}
                      onChange={(e) => onYearChange(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2.5 border-2 border-green-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white text-slate-900 font-medium text-sm transition-colors hover:border-green-200"
                      aria-label="Filter by tax year"
                    >
                      <option value="">All Years</option>
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Month Filter */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-green-600" />
                      Month
                    </label>
                    <select
                      value={selectedMonth !== null ? selectedMonth.toString() : ""}
                      onChange={(e) => onMonthChange(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2.5 border-2 border-green-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white text-slate-900 font-medium text-sm transition-colors hover:border-green-200"
                      aria-label="Filter by month"
                    >
                      <option value="">All Months / Yearly</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                        </option>
                      ))}
                      <option value="null">Yearly Income</option>
                    </select>
                  </div>
                </div>

                {/* Active Filters - Show when filters are active */}
                {hasActiveFilters && (
                  <div className="pt-4 border-t border-green-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Active filters:</span>
                      <button
                        onClick={handleClearFilters}
                        className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1.5 transition-colors"
                        aria-label="Clear all filters"
                      >
                        <X className="w-4 h-4" />
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedYear === null && (
                        <button
                          onClick={() => onYearChange(validCurrentYear)}
                          className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200 transition-colors font-medium"
                          aria-label="Reset year filter to current year"
                        >
                          Year: All Years
                          <X className="w-3 h-3 ml-1.5" />
                        </button>
                      )}
                      {selectedYear !== null && selectedYear !== validCurrentYear && (
                        <button
                          onClick={() => onYearChange(null)}
                          className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200 transition-colors font-medium"
                          aria-label={`Remove year filter: ${selectedYear}`}
                        >
                          Year: {selectedYear}
                          <X className="w-3 h-3 ml-1.5" />
                        </button>
                      )}
                      {selectedMonth !== null && (
                        <button
                          onClick={() => onMonthChange(null)}
                          className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200 transition-colors font-medium"
                          aria-label={`Remove month filter: ${selectedMonth}`}
                        >
                          Month: {getMonthLabel(selectedMonth)}
                          <X className="w-3 h-3 ml-1.5" />
                        </button>
                      )}
                      {searchQuery && (
                        <button
                          onClick={() => onSearchChange("")}
                          className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200 transition-colors font-medium"
                          aria-label="Clear search"
                        >
                          Search: {searchQuery}
                          <X className="w-3 h-3 ml-1.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
