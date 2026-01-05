"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Calendar, RefreshCw, ArrowUpDown, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SortField, SortOrderType, StatusFilter } from "./utils";
import { InvoiceStatus, getInvoiceStatusLabel } from "@/components/dashboard/invoices/statusUtils";
import { FilterAll, InvoiceSortField, SortOrder, ButtonVariant } from "@/lib/utils/client-enums";
import { InvoiceFilterStatus } from "@/lib/utils/invoice-filter-status";

const STORAGE_KEY = "taxcomply_invoice_filters_expanded";

interface InvoiceFiltersProps {
  searchTerm: string;
  isSearching: boolean;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  yearFilter: number | FilterAll;
  monthFilter: number | FilterAll;
  itemsPerPage: number;
  sortField: SortField;
  sortOrder: SortOrderType;
  onStatusFilterChange: (status: StatusFilter) => void;
  onYearFilterChange: (year: number | FilterAll) => void;
  onMonthFilterChange: (month: number | FilterAll) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  onSort: (field: SortField) => void;
  onRefresh: () => void;
}

export function InvoiceFilters({
  searchTerm,
  isSearching,
  onSearchChange,
  statusFilter,
  yearFilter,
  monthFilter,
  itemsPerPage,
  sortField,
  sortOrder,
  onStatusFilterChange,
  onYearFilterChange,
  onMonthFilterChange,
  onItemsPerPageChange,
  onSort,
  onRefresh,
}: InvoiceFiltersProps) {
  // Collapsible state - persists to localStorage for better UX
  // Default to collapsed (false) for better UX - users can expand when needed
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === "undefined") return false; // SSR default - collapsed
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : false; // Default to collapsed for first-time users
    } catch (error) {
      console.error("Failed to load filter state from localStorage:", error);
      return false; // Fallback to collapsed on error
    }
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isExpanded));
    } catch (error) {
      console.error("Failed to save filter state to localStorage:", error);
      // Non-critical - continue execution
    }
  }, [isExpanded]);

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
  const hasActiveFilters = 
    statusFilter !== InvoiceFilterStatus.All || 
    (yearFilter !== FilterAll.All && yearFilter !== validCurrentYear) || 
    monthFilter !== FilterAll.All || 
    searchTerm.trim().length > 0;

  const sortOptions: { field: SortField; label: string }[] = [
    { field: InvoiceSortField.IssueDate, label: "Date Created" },
    { field: InvoiceSortField.Total, label: "Amount (₦)" },
    { field: InvoiceSortField.CustomerName, label: "Customer Name" },
    { field: InvoiceSortField.InvoiceNumber, label: "Invoice Number" },
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="my-6"
    >
      <Card 
        className="bg-gradient-to-br from-white to-emerald-50/20 border-2 border-emerald-100 shadow-xl shadow-emerald-500/10 overflow-hidden rounded-xl"
        disableAnimation
      >
        {/* Header - Always visible, clickable to toggle */}
        <button
          onClick={toggleExpanded}
          onKeyDown={handleKeyDown}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-emerald-50/50 active:bg-emerald-100/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer rounded-t-xl"
          aria-expanded={isExpanded}
          aria-controls="invoice-filters-content"
          aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
          type="button"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${
              hasActiveFilters 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-slate-100 text-slate-600"
            }`}>
              <Filter className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-slate-900">Filters & Search</h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                <span className="font-bold">
                  Year: {yearFilter === FilterAll.All ? validCurrentYear : yearFilter}
                  {yearFilter === FilterAll.All || yearFilter === validCurrentYear ? " (Current)" : ""}
                </span>
                {monthFilter !== FilterAll.All && ` • Month: ${months.find(m => m.value === monthFilter)?.label || monthFilter}`}
                {statusFilter !== InvoiceFilterStatus.All && ` • Status: ${getInvoiceStatusLabel(statusFilter)}`}
                {searchTerm.trim().length > 0 && ` • Search: "${searchTerm.trim()}"`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && !isExpanded && (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                Active
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
              id="invoice-filters-content"
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
              <div className="space-y-6 px-6 py-6">
                {/* Search Bar - Full Width */}
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 z-10 ${
              isSearching ? "text-emerald-500 animate-pulse" : "text-slate-400"
            }`} />
            <Input
              placeholder="Search by customer name, invoice number, or email address..."
              value={searchTerm}
              onChange={(e) => {
                onSearchChange(e.target.value);
              }}
              className="pl-12 pr-12 border-2 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/20"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Filters Row - Organized Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Payment Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  onStatusFilterChange(e.target.value as StatusFilter);
                }}
                className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm transition-colors hover:border-emerald-200"
              >
                <option value={InvoiceFilterStatus.All}>All Status</option>
                {Object.values(InvoiceStatus).map((status) => (
                  <option key={status} value={status}>
                    {getInvoiceStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter - Current Year Default, No "All" Option */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Year <span className="text-emerald-600 font-bold">({validCurrentYear})</span>
              </label>
              <select
                value={yearFilter === FilterAll.All ? validCurrentYear : yearFilter}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  onYearFilterChange(value);
                }}
                className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm transition-colors hover:border-emerald-200"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
                  const year = validCurrentYear - i;
                  // Only show years >= 2026
                  if (year >= minTaxYear) {
                    return (
                      <option key={year} value={year}>
                        {year} {year === validCurrentYear ? "(Current)" : ""}
                      </option>
                    );
                  }
                  return null;
                }).filter(Boolean)}
              </select>
              <p className="text-xs text-emerald-600 font-medium mt-1.5">
                Showing invoices from {yearFilter === FilterAll.All ? validCurrentYear : yearFilter}
              </p>
            </div>

            {/* Month Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Month
              </label>
              <select
                value={monthFilter}
                onChange={(e) => {
                  const value = e.target.value === FilterAll.All ? FilterAll.All : parseInt(e.target.value);
                  onMonthFilterChange(value);
                }}
                className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm transition-colors hover:border-emerald-200"
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

            {/* Items Per Page & Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
              <div className="flex flex-col flex-1">
                <label className="text-xs font-semibold text-slate-600 mb-2">Show Per Page</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm transition-colors hover:border-emerald-200"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant={ButtonVariant.Outline}
                  onClick={onRefresh}
                  className="w-full sm:w-auto border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 text-sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Sort Options - Cleaner Design */}
          <div className="pt-4 border-t border-emerald-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-semibold text-slate-700 flex-shrink-0">Sort by:</span>
              <div className="flex flex-wrap items-center gap-2">
                {sortOptions.map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => onSort(field)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      sortField === field
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/30"
                        : "bg-white text-slate-700 hover:bg-emerald-50 border-2 border-emerald-100 hover:border-emerald-200"
                    }`}
                  >
                    <span>{label}</span>
                    {sortField === field && (
                      <ArrowUpDown className={`w-3.5 h-3.5 ${sortOrder === SortOrder.Asc ? "rotate-180" : ""}`} />
                    )}
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





