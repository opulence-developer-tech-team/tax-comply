"use client";

import { useState } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { Search, Filter, Calendar, ArrowUpDown, ChevronDown, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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

import { EXPENSE_CATEGORIES } from "@/lib/constants/expenses";
import { ExpenseSortField, SortOrder, ButtonVariant, ButtonSize, FilterAll } from "@/lib/utils/client-enums";

export type ExpenseSortOrder = SortOrder;
export type ExpenseCategoryFilter = FilterAll | string;

interface ExpenseFiltersProps {
  searchTerm: string;
  isSearching: boolean;
  onSearchChange: (value: string) => void;
  categoryFilter: ExpenseCategoryFilter;
  yearFilter: number;
  monthFilter: number | FilterAll;
  itemsPerPage: number;
  sortField: ExpenseSortField;
  sortOrder: ExpenseSortOrder;
  onCategoryFilterChange: (category: ExpenseCategoryFilter) => void;
  onYearFilterChange: (year: number) => void;
  onMonthFilterChange: (month: number | FilterAll) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  onSort: (field: ExpenseSortField) => void;
  onClearFilters?: () => void;
}

export function ExpenseFilters({
  searchTerm,
  isSearching,
  onSearchChange,
  categoryFilter,
  yearFilter,
  monthFilter,
  itemsPerPage,
  sortField,
  sortOrder,
  onCategoryFilterChange,
  onYearFilterChange,
  onMonthFilterChange,
  onItemsPerPageChange,
  onSort,
  onClearFilters,
}: ExpenseFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortOptions: { field: ExpenseSortField; label: string }[] = [
    { field: ExpenseSortField.Date, label: "Date" },
    { field: ExpenseSortField.Amount, label: "Amount (₦)" },
    { field: ExpenseSortField.Description, label: "Description" },
    { field: ExpenseSortField.Category, label: "Category" },
  ];

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

  // Count active filters (excluding search as it's always visible)
  const activeFiltersCount = [
    categoryFilter !== FilterAll.All,
    monthFilter !== FilterAll.All,
    searchTerm.trim() !== "", // Include search term in count
  ].filter(Boolean).length;

  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-white border-2 border-emerald-100 shadow-lg shadow-emerald-500/5 overflow-hidden">
        {/* Header - Always Visible */}
        <div className="p-4 md:p-6 bg-gradient-to-r from-emerald-50/50 to-white border-b border-emerald-100">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            {/* Search - Always Visible */}
            <div className="flex-1 relative w-full">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isSearching ? "text-emerald-600 animate-pulse" : "text-slate-400"
              }`} />
              <Input
                placeholder="Search (e.g. Fuel, Rent)..."
                value={searchTerm}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                }}
                className="pl-12 pr-12 w-full border-2 border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-4 shrink-0 overflow-x-auto pb-1 md:pb-0">
                {/* Expand/Collapse Button */}
                <Button
                variant={ButtonVariant.Outline}
                onClick={() => setIsExpanded(!isExpanded)}
                className="border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex items-center justify-center shrink-0"
                >
                <Filter className="w-4 h-4 mr-2" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full">
                    {activeFiltersCount}
                    </span>
                )}
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="ml-2"
                >
                    <ChevronDown className="w-4 h-4" />
                </motion.div>
                </Button>

                {/* Clear Filters Button - Only show if filters are active */}
                {activeFiltersCount > 0 && onClearFilters && (
                <Button
                    variant={ButtonVariant.Outline}
                    onClick={onClearFilters}
                    className="border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-700 shrink-0"
                    size={ButtonSize.Sm}
                >
                    <X className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Clear</span>
                </Button>
                )}
            </div>
          </div>
        </div>

        {/* Expandable Filters Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="p-4 md:p-6 space-y-6 bg-slate-50/50">
                {/* Filter Row 1: Category, Year, Month */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Filter className="w-4 h-4 text-emerald-600" />
                      Category
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => {
                        onCategoryFilterChange(e.target.value as ExpenseCategoryFilter);
                      }}
                      className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium transition-all hover:border-emerald-200"
                    >
                      <option value={FilterAll.All}>All Categories</option>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      Year *
                    </label>
                    <select
                      value={yearFilter}
                      onChange={(e) => {
                        onYearFilterChange(parseInt(e.target.value));
                      }}
                      className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium transition-all hover:border-emerald-200"
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

                  {/* Month Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      Month
                    </label>
                    <select
                      value={monthFilter}
                      onChange={(e) => {
                        const value = e.target.value === FilterAll.All ? FilterAll.All : parseInt(e.target.value);
                        onMonthFilterChange(value);
                      }}
                      className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium transition-all hover:border-emerald-200"
                      title="Select month (filters across all years if no year is selected)"
                    >
                      <option value={FilterAll.All}>Any Month</option>
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filter Row 2: Items Per Page and Sort Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-emerald-100">
                  {/* Items Per Page */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Rows per page</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium transition-all hover:border-emerald-200"
                    >
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                  </div>

                  {/* Sort Options */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                      Sort By
                    </label>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                      {sortOptions.map(({ field, label }) => (
                        <button
                          key={field}
                          onClick={() => onSort(field)}
                          className={`px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-medium transition-all ${
                            sortField === field
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                              : "bg-white text-slate-700 hover:bg-emerald-50 border-2 border-emerald-100 hover:border-emerald-200"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{label}</span>
                            {sortField === field && (
                              <ArrowUpDown className={`w-3.5 h-3.5 ${sortOrder === SortOrder.Asc ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}







