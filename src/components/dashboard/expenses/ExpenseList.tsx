"use client";

import { useState } from "react";
import { motion, Variants } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingStateSize, FilterAll } from "@/lib/utils/client-enums";
import { ExpenseDetailModal } from "./ExpenseDetailModal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Trash2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Expense } from "@/store/redux/expenses/expenses-slice";

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

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  hasFetched: boolean;
  onDelete: (expenseId: string) => void;
  isDeleting: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  debouncedSearchTerm?: string;
  categoryFilter?: string;
  yearFilter?: number;
  monthFilter?: number | FilterAll;
  onCreateClick?: () => void;
}

export function ExpenseList({ 
  expenses, 
  isLoading,
  hasFetched,
  onDelete, 
  isDeleting,
  pagination,
  currentPage,
  itemsPerPage,
  onPageChange,
  debouncedSearchTerm = "",
  categoryFilter = FilterAll.All,
  yearFilter,
  monthFilter = FilterAll.All,
  onCreateClick,
}: ExpenseListProps) {
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ensure expenses is always an array - matches InvoiceList pattern exactly
  const expensesArray = Array.isArray(expenses) ? expenses : [];

  const handleViewExpense = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExpenseId(null);
  };
  
  // Show loading state when:
  // 1. Data is actively being fetched (isLoading = true)
  // 2. Filters changed and data hasn't been fetched yet (hasFetched = false)
  // This ensures loading shows immediately when filters change, before fetch starts
  if (isLoading || !hasFetched) {
    return (
      <Card title="Your Expenses">
        <LoadingState message="Loading your expenses..." size={LoadingStateSize.Md} />
      </Card>
    );
  }
  
  // Show empty state when expenses array is empty
  // Check if any filters are active to show appropriate message
  const hasActiveFilters = 
    (debouncedSearchTerm && debouncedSearchTerm.trim() !== "") || 
    (categoryFilter && categoryFilter !== FilterAll.All) || 
    (yearFilter !== undefined) ||
    (monthFilter && monthFilter !== FilterAll.All);
  
  if (!expensesArray || expensesArray.length === 0) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
      >
        <Card className="bg-gradient-to-br from-white to-emerald-50/20 border-2 border-emerald-100">
          <EmptyState
            icon="📋"
            title={hasActiveFilters ? "No expenses found" : "No Expenses Yet"}
            description={
              hasActiveFilters
                ? "Try changing your search words or remove some filters to see more results"
                : "You haven't recorded any expenses for this month. Start tracking your expenses to see how much tax you can save."
            }
            actionLabel={!hasActiveFilters && onCreateClick ? "Add Your First Expense" : undefined}
            onAction={!hasActiveFilters && onCreateClick ? onCreateClick : undefined}
            searchTerm={debouncedSearchTerm}
          />
        </Card>
      </motion.div>
    );
  }

  // Get year for display
  const displayYear = yearFilter || new Date().getFullYear();
  
  return (
    <Card title={
      <div className="flex items-center gap-2">
        <span>Your Expenses</span>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold border border-emerald-200">
          {displayYear}
        </span>
      </div>
    }>
      <div className="space-y-3">
        {expensesArray.map((expense: Expense) => (
          <motion.div
            key={expense._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border border-slate-200 rounded-lg hover:border-emerald-200 transition-colors bg-white"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-slate-900">{expense.description}</h4>
                  {expense.isTaxDeductible && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                      Reduces Tax
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {expense.category} • {formatDate(new Date(expense.date))}
                </p>
                {(expense.vatAmount || 0) > 0 && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    Tax Savings: {formatCurrency(expense.vatAmount!)}
                  </p>
                )}
                {(expense.whtAmount || 0) > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-amber-600 font-medium">
                      WHT Deducted: {formatCurrency(expense.whtAmount!)}
                    </p>
                    {expense.isNonResident && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 rounded border border-amber-200">
                        Non-Resident (10%)
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right ml-4 flex flex-col items-end gap-2">
                <p className="font-bold text-slate-900 text-lg">{formatCurrency(expense.amount)}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewExpense(expense._id)}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    title="View expense details"
                    aria-label="View expense details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(expense._id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDeleting}
                    title="Delete expense"
                    aria-label="Delete expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200">
          <div className="text-sm text-slate-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} expenses
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (page === 1 || page === pagination.pages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, index, array) => {
                  // Add ellipsis if there's a gap
                  const prevPage = array[index - 1];
                  const showEllipsisBefore = prevPage && page - prevPage > 1;
                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsisBefore && (
                        <span className="px-2 text-slate-400">...</span>
                      )}
                      <button
                        onClick={() => onPageChange(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300"
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === pagination.pages}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        expenseId={selectedExpenseId}
      />
    </Card>
  );
}

