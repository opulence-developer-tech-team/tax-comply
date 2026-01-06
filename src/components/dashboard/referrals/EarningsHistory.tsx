"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReferralStatus } from "@/lib/utils/referral-status";
import { ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";

interface Earning {
  id: string;
  referredUser: {
    id: string;
    name: string;
    email: string;
  };
  subscriptionPlan: string;
  subscriptionAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  status: ReferralStatus;
  createdAt: string;
}

interface EarningsHistoryProps {
  earnings: Earning[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
}

export function EarningsHistory({ earnings, pagination, onPageChange }: EarningsHistoryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-0 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Earnings History</h2>
          {pagination.total > 0 && (
            <p className="text-sm text-slate-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
          )}
        </div>
        {earnings.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Referred User
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Plan
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Subscription
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Commission
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((earning) => (
                    <tr
                      key={earning.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">
                          {earning.referredUser.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {earning.referredUser.email}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">
                          {earning.subscriptionPlan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-slate-900">
                          {formatCurrency(earning.subscriptionAmount)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-semibold text-emerald-600">
                          {formatCurrency(earning.commissionAmount)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(earning.commissionPercentage * 100).toFixed(0)}%
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            earning.status === "available"
                              ? "bg-emerald-100 text-emerald-700"
                              : earning.status === "withdrawn"
                              ? "bg-slate-100 text-slate-700"
                              : earning.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {earning.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {formatDate(earning.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <p className="text-slate-500 text-center py-8">
            No earnings yet. Refer users to start earning!
          </p>
        )}
      </Card>
    </motion.div>
  );
}

