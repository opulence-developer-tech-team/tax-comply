"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { useHttp } from "@/hooks/useHttp";
import { NairaSign } from "@/components/icons/NairaSign";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Receipt,
  Calendar,
  Tag,
  // DollarSign,
  TrendingDown,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountType } from "@/lib/utils/account-type";
import { ButtonVariant, AlertVariant } from "@/lib/utils/client-enums";

interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: string;
  date: string | Date;
  isTaxDeductible: boolean;
  vatAmount?: number;
  whtType?: string;
  whtAmount?: number;
  whtDeducted?: boolean;
  supplierName?: string;
  supplierTIN?: string;
  supplierType?: AccountType;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

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
 * Formats WHT type from snake_case to Title Case
 * Example: "other_services" -> "Other Services"
 * Example: "professional_services" -> "Professional Services"
 */
function formatWHTType(whtType: string): string {
  if (!whtType) return "";
  
  return whtType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function ExpenseDetailModal({
  isOpen,
  onClose,
  expenseId,
}: ExpenseDetailModalProps) {
  const { isLoading, sendHttpRequest } = useHttp();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && expenseId) {
      fetchExpense();
    } else {
      // Reset state when modal closes
      setExpense(null);
      setError(null);
      setErrorStatus(null);
    }
  }, [isOpen, expenseId]);

  const fetchExpense = () => {
    if (!expenseId) return;

    setError(null);
    setErrorStatus(null);
    sendHttpRequest({
      successRes: (response: any) => {
        if (response?.data?.message === "success" && response?.data?.data) {
          setExpense(response.data.data);
          setError(null);
          setErrorStatus(null);
        } else {
          setError("Expense not found");
          setErrorStatus(404);
        }
      },
      errorRes: (errorResponse: any) => {
        // Extract status from various possible locations
        const status =
          errorResponse?.status ||
          errorResponse?.response?.status ||
          errorResponse?.response?.data?.status ||
          null;
        
        setErrorStatus(status);

        if (status === 404) {
          setError("Expense not found or no longer available");
        } else if (status === 403) {
          setError("You don't have permission to view this expense");
        } else if (status === 401) {
          setError("Your session has expired. Please refresh the page.");
        } else if (!status || status === 0) {
          // Network errors (no status code) - retryable
          setError("Network error. Please check your connection and try again.");
        } else if (status >= 500) {
          // Server errors (500, 502, 503, 504, etc.) - retryable
          setError("Server error. Please try again in a moment.");
        } else {
          // Other client errors (400, etc.) - may or may not be retryable
          setError("Failed to load expense. Please try again.");
        }
        return true;
      },
      requestConfig: {
        url: `/expenses/${expenseId}`,
        method: HttpMethod.GET,
      },
    });
  };

  /**
   * Determines if an error is retryable
   * Retryable: Network errors (no status/0), server errors (5xx)
   * Non-retryable: 404 (not found), 403 (forbidden), 401 (unauthorized), 400 (bad request)
   */
  const isRetryableError = (status: number | null): boolean => {
    if (status === null || status === undefined) {
      // Network errors (no status) are retryable
      return true;
    }
    // Retryable: server errors (5xx) and network errors (0)
    // Non-retryable: client errors (4xx) except some edge cases
    return status >= 500 || status === 0;
  };

  if (!isOpen) return null;

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Expense Details"
    >
      {isLoading ? (
        <LoadingState message="Loading expense details..." />
      ) : error || !expense ? (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center min-h-[400px]"
        >
          <div className="text-center max-w-md">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
              className="text-6xl mb-6"
            >
              {errorStatus === 404 ? "📋" : "⚠️"}
            </motion.div>
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-bold text-slate-900 mb-3"
            >
              {errorStatus === 404
                ? "Expense Not Found"
                : errorStatus === 403
                ? "Access Denied"
                : "Failed to Load Expense"}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-slate-600 mb-6"
            >
              {error || "The expense you're looking for doesn't exist or is no longer available."}
            </motion.p>
            {isRetryableError(errorStatus) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Button
                  onClick={fetchExpense}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Try Again
                </Button>
                <Button
                  onClick={onClose}
                  variant={ButtonVariant.Outline}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Close
                </Button>
              </motion.div>
            )}
            {!isRetryableError(errorStatus) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  onClick={onClose}
                  variant={ButtonVariant.Outline}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Close
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Receipt className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{expense.description}</h2>
            </div>
            <p className="text-slate-600 ml-14">
              View complete expense details and tax information
            </p>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div variants={itemVariants}>
              <Alert variant={AlertVariant.Error} title="Error">
                {error}
              </Alert>
            </motion.div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information Card */}
              <motion.div
                variants={itemVariants}
                className="bg-white rounded-xl border-2 border-emerald-100 p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Date</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatDate(new Date(expense.date))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Tag className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Category</p>
                        <p className="text-sm font-semibold text-slate-900">{expense.category}</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-start gap-3">
                      <NairaSign className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Amount</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Tax Information Card */}
              <motion.div
                variants={itemVariants}
                className="bg-white rounded-xl border-2 border-emerald-100 p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                  Tax Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {expense.isTaxDeductible ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-400" />
                      )}
                      <span className="text-sm font-medium text-slate-700">Tax Deductible</span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        expense.isTaxDeductible
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {expense.isTaxDeductible ? "Yes" : "No"}
                    </span>
                  </div>
                  {typeof expense.vatAmount === "number" && expense.vatAmount > 0 && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-xs text-emerald-700 uppercase tracking-wide mb-1">
                        Tax Savings (VAT)
                      </p>
                      <p className="text-lg font-bold text-emerald-700">
                        {formatCurrency(expense.vatAmount)}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* WHT Information Card (if applicable) */}
              {expense.whtDeducted && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white rounded-xl border-2 border-purple-100 p-6 shadow-sm"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-purple-600" />
                    Withholding Tax (WHT)
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {expense.whtType && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                            WHT Type
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatWHTType(expense.whtType)}
                          </p>
                        </div>
                      )}
                      {typeof expense.whtAmount === "number" && expense.whtAmount > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                            WHT Amount
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(expense.whtAmount)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Supplier Information Card (if WHT deducted) */}
              {expense.whtDeducted && (expense.supplierName || expense.supplierTIN) && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white rounded-xl border-2 border-blue-100 p-6 shadow-sm"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Supplier/Vendor Information
                  </h3>
                  <div className="space-y-3">
                    {expense.supplierName && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                          Supplier Name
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {expense.supplierName}
                        </p>
                      </div>
                    )}
                    {expense.supplierTIN && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                          Supplier TIN
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {expense.supplierTIN}
                        </p>
                      </div>
                    )}
                    {expense.supplierType && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                          Supplier Type
                        </p>
                        <p className="text-sm font-semibold text-slate-900 capitalize">
                          {expense.supplierType}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column - Summary Card */}
            <div className="lg:col-span-1">
              <motion.div
                variants={itemVariants}
                className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-200 p-6 shadow-sm sticky top-6"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-4">Summary</h3>
                <div className="space-y-4">
                  <div className="pb-4 border-b border-emerald-200">
                    <p className="text-xs text-emerald-700 uppercase tracking-wide mb-1">
                      Expense Amount
                    </p>
                    <p className="text-2xl font-bold text-emerald-900">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                  {typeof expense.vatAmount === "number" && expense.vatAmount > 0 && (
                    <div className="pb-4 border-b border-emerald-200">
                      <p className="text-xs text-emerald-700 uppercase tracking-wide mb-1">
                        Tax Savings
                      </p>
                      <p className="text-xl font-bold text-emerald-900">
                        {formatCurrency(expense.vatAmount)}
                      </p>
                    </div>
                  )}
                  {typeof expense.whtAmount === "number" && expense.whtAmount > 0 && (
                    <div>
                      <p className="text-xs text-emerald-700 uppercase tracking-wide mb-1">
                        WHT Deducted
                      </p>
                      <p className="text-lg font-bold text-emerald-900">
                        {formatCurrency(expense.whtAmount)}
                      </p>
                    </div>
                  )}
                  {expense.createdAt && (
                    <div className="pt-4 border-t border-emerald-200">
                      <p className="text-xs text-emerald-700 uppercase tracking-wide mb-1">
                        Created
                      </p>
                      <p className="text-sm font-medium text-emerald-900">
                        {formatDate(new Date(expense.createdAt))}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </FullScreenModal>
  );
}

