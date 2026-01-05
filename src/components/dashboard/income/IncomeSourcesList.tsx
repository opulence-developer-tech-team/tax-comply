"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { AccountType, LoadingStateSize, ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/shared/LoadingState";
import { Coins, Plus, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { IncomeSourceCard } from "./IncomeSourceCard";
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

interface IncomeSourcesListProps {
  filteredIncome: IncomeSource[];
  allIncomeSources: IncomeSource[];
  isLoading: boolean;
  hasFetched: boolean;
  isDeleting: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onAddClick: () => void;
  onEdit: (income: IncomeSource) => void;
  onDelete: (income: IncomeSource) => void;
}

/**
 * Income Sources List Component
 * 
 * Displays the list of income sources with empty states and refresh functionality.
 * Production-ready with proper loading states and accessibility.
 */
export function IncomeSourcesList({
  filteredIncome,
  allIncomeSources,
  isLoading,
  hasFetched,
  isDeleting,
  pagination,
  onPageChange,
  onRefresh,
  onAddClick,
  onEdit,
  onDelete,
}: IncomeSourcesListProps) {
  const { page, pages, total, limit } = pagination;
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);

  // Show loading state when:
  // 1. Data is actively being fetched (isLoading = true)
  // 2. Filters changed and data hasn't been fetched yet (hasFetched = false)
  // CRITICAL: This ensures loading shows immediately when filters change, before fetch starts
  // This matches the pattern used in ExpenseList for consistent UX
  if (isLoading || !hasFetched) {
    return (
      <motion.div variants={itemVariants}>
        <Card title="Income Sources">
          <LoadingState message="Loading income sources..." size={LoadingStateSize.Md} />
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants}>
      <Card 
        title={`Income Sources (${total.toLocaleString()})`}
        actions={
          <Button
            variant={ButtonVariant.Outline}
            size={ButtonSize.Sm}
            onClick={onRefresh}
            disabled={isLoading}
            className="border-green-200 text-green-700 hover:bg-green-50"
            aria-label="Refresh income sources"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      >
        {filteredIncome.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Coins className="w-16 h-16 mx-auto mb-4 text-slate-400" aria-hidden="true" />
            <p className="text-lg font-medium mb-2">
              {total === 0 
                ? "No income sources added yet"
                : "No income sources match your filters"}
            </p>
            <p className="text-sm mb-4">
              {total === 0
                ? "Add your income sources to track them for PIT calculation"
                : "Try adjusting your filters or search query"}
            </p>
            {total === 0 && (
              <Button
                onClick={onAddClick}
                className="bg-green-600 hover:bg-green-700 text-white border-0 mt-2"
                aria-label="Add your first income source"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Income Source
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredIncome.map((income) => (
                <IncomeSourceCard
                  key={income._id}
                  income={income}
                  isDeleting={isDeleting === income._id}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {pages > 1 && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Showing <span className="font-medium">{startItem}</span> to{" "}
                    <span className="font-medium">{endItem}</span> of{" "}
                    <span className="font-medium">{total.toLocaleString()}</span> results
                  </div>
                  <div className="flex items-center gap-2">
                      <Button
                        variant={ButtonVariant.Outline}
                        size={ButtonSize.Sm}
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1 || isLoading}
                        className="border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                          let pageNum: number;
                          if (pages <= 7) {
                            pageNum = i + 1;
                          } else if (page <= 4) {
                            pageNum = i + 1;
                          } else if (page >= pages - 3) {
                            pageNum = pages - 6 + i;
                          } else {
                            pageNum = page - 3 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? ButtonVariant.Primary : ButtonVariant.Outline}
                              size={ButtonSize.Sm}
                              onClick={() => onPageChange(pageNum)}
                              disabled={isLoading}
                              className={
                                page === pageNum
                                  ? "bg-green-600 hover:bg-green-700 text-white border-0"
                                  : "border-green-200 text-green-700 hover:bg-green-50"
                              }
                              aria-label={`Go to page ${pageNum}`}
                              aria-current={page === pageNum ? "page" : undefined}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant={ButtonVariant.Outline}
                        size={ButtonSize.Sm}
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === pages || isLoading}
                        className="border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50"
                        aria-label="Next page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </motion.div>
  );
}

