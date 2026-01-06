"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WithdrawalStatus } from "@/lib/utils/withdrawal-status";
import { ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";

interface Withdrawal {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface WithdrawalsHistoryProps {
  withdrawals: Withdrawal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
}

export function WithdrawalsHistory({
  withdrawals,
  pagination,
  onPageChange,
}: WithdrawalsHistoryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-0 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Withdrawal History
          </h2>
          {pagination.total > 0 && (
            <p className="text-sm text-slate-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
          )}
        </div>
        {withdrawals.length > 0 ? (
          <>
            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(withdrawal.amount)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {withdrawal.bankName} -{" "}
                      {withdrawal.accountNumber.substring(0, 4)}****
                      {withdrawal.accountNumber.substring(8)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(withdrawal.createdAt)}
                    </p>
                    {withdrawal.failureReason && (
                      <p className="text-xs text-red-600 mt-1">
                        {withdrawal.failureReason}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      withdrawal.status === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : withdrawal.status === "processing" ||
                          withdrawal.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : withdrawal.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {withdrawal.status}
                  </span>
                </div>
              ))}
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                <Button
                  variant={ButtonVariant.Outline}
                  size={ButtonSize.Sm}
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant={ButtonVariant.Outline}
                  size={ButtonSize.Sm}
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-slate-500 text-center py-8">No withdrawals yet</p>
        )}
      </Card>
    </motion.div>
  );
}

