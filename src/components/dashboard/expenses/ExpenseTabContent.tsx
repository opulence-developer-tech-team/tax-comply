"use client";

import { motion, Variants } from "framer-motion";
import { ExpenseList } from "./ExpenseList";
import { ExpenseStats } from "./ExpenseStats";
import { ExpenseSummaryTab } from "./ExpenseSummaryTab";
import { ExpenseFormModal } from "./ExpenseFormModal";
import { ExpenseFilters, ExpenseSortOrder } from "./ExpenseFilters";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { expensesActions } from "@/store/redux/expenses/expenses-slice";
import { AccountType } from "@/lib/utils/account-type";
import { ExpenseTabType, FilterAll, ExpenseSortField } from "@/lib/utils/client-enums";

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

interface ExpenseTabContentProps {
  activeTab: ExpenseTabType;
  expenses: any[];
  isLoading: boolean;
  hasFetched: boolean;
  isDeleting: boolean;
  pagination: any;
  filters: any;
  summaryFilters: any;
  yearlySummaryFilters: any;
  onDelete: (expenseId: string) => void;
  stats: {
    total: number;
    totalAmount: number;
    taxDeductibleAmount: number;
    estimatedTaxSavings: number;
  };
  isModalOpen: boolean;
  onModalClose: () => void;
  onModalSuccess: () => void;
  searchTerm: string;
  debouncedSearchTerm: string;
  isSearching: boolean;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  yearFilter: number;
  monthFilter: number | FilterAll;
  itemsPerPage: number;
  sortField: ExpenseSortField;
  sortOrder: ExpenseSortOrder;
  onCategoryFilterChange: (category: string) => void;
  onYearFilterChange: (year: number) => void;
  onMonthFilterChange: (month: number | FilterAll) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  onSort: (field: ExpenseSortField) => void;
  onClearFilters?: () => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  onCreateClick?: () => void;
  accountId?: string;
  accountType?: AccountType;
  onIncomeAdded?: () => void;
  onExportMonthly?: (year: number, month: number) => void;
  onExportYearly?: (year: number) => void;
  isExportingMonthly?: boolean;
  isExportingYearly?: boolean;
}

export function ExpenseTabContent({
  activeTab,
  expenses,
  isLoading,
  hasFetched,
  isDeleting,
  pagination,
  filters,
  summaryFilters,
  yearlySummaryFilters,
  accountType = AccountType.Individual,
  onDelete,
  stats,
  isModalOpen,
  onModalClose,
  onModalSuccess,
  searchTerm,
  debouncedSearchTerm,
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
  onPageChange,
  currentPage,
  onCreateClick,
  accountId,
  onIncomeAdded,
  onExportMonthly,
  onExportYearly,
  isExportingMonthly = false,
  isExportingYearly = false,
}: ExpenseTabContentProps) {
  const dispatch = useAppDispatch();

  return (
    <motion.div
      key={activeTab}
      initial="hidden"
      animate="visible"
      variants={itemVariants}
      className="space-y-8"
    >
      {/* Statistics Cards - Only show in Expenses tab */}
      {activeTab === ExpenseTabType.Expenses && (
        <ExpenseStats
          total={stats.total}
          totalAmount={stats.totalAmount}
          taxDeductibleAmount={stats.taxDeductibleAmount}
          estimatedTaxSavings={stats.estimatedTaxSavings}
        />
      )}

      {/* Expenses Tab Content */}
      {activeTab === ExpenseTabType.Expenses && (
        <>
          <ExpenseFilters
            searchTerm={searchTerm}
            isSearching={isSearching}
            onSearchChange={onSearchChange}
            categoryFilter={categoryFilter}
            yearFilter={yearFilter}
            monthFilter={monthFilter}
            itemsPerPage={itemsPerPage}
            sortField={sortField}
            sortOrder={sortOrder}
            onCategoryFilterChange={onCategoryFilterChange}
            onYearFilterChange={onYearFilterChange}
            onMonthFilterChange={onMonthFilterChange}
            onItemsPerPageChange={onItemsPerPageChange}
            onSort={onSort}
            onClearFilters={onClearFilters}
          />
          <ExpenseList
            expenses={expenses || []}
            isLoading={isLoading}
            hasFetched={hasFetched}
            onDelete={onDelete}
            isDeleting={isDeleting}
            pagination={pagination}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
            debouncedSearchTerm={debouncedSearchTerm}
            categoryFilter={categoryFilter}
            yearFilter={yearFilter}
            monthFilter={monthFilter}
            onCreateClick={onCreateClick}
          />
        </>
      )}

      {/* PDF Reports Tab Content */}
      {activeTab === ExpenseTabType.PDFReports && (
        <ExpenseSummaryTab 
          summaryYear={summaryFilters.year}
          summaryMonth={summaryFilters.month}
          yearlySummaryYear={yearlySummaryFilters.year}
          onSummaryYearChange={(year) => {
            if (summaryFilters.year !== year) {
              dispatch(expensesActions.setSummaryFilters({ year, month: summaryFilters.month }));
            }
          }}
          onSummaryMonthChange={(month) => {
            if (summaryFilters.month !== month) {
              dispatch(expensesActions.setSummaryFilters({ year: summaryFilters.year, month }));
            }
          }}
          onYearlySummaryYearChange={(year) => {
            if (yearlySummaryFilters.year !== year) {
              dispatch(expensesActions.setYearlySummaryFilters({ year }));
            }
          }}
          onExportMonthly={onExportMonthly}
          onExportYearly={onExportYearly}
          isExportingMonthly={isExportingMonthly}
          isExportingYearly={isExportingYearly}
        />
      )}

      {/* Expense Form Modal */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        onSuccess={onModalSuccess}
      />
    </motion.div>
  );
}

