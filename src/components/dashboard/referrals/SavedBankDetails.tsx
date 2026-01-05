"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";

export interface SavedBankDetail {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

interface SavedBankDetailsProps {
  bankDetails: SavedBankDetail[];
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export function SavedBankDetails({
  bankDetails,
  onDelete,
  isLoading = false,
}: SavedBankDetailsProps) {
  if (bankDetails.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Bank Account</h2>
          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
            Default
          </span>
        </div>
        <div className="space-y-3">
          {bankDetails.map((detail) => (
            <div
              key={detail.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900">
                      {detail.bankName}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">
                    {detail.accountName}
                  </p>
                  <p className="text-sm text-slate-500 font-mono">
                    {detail.accountNumber.substring(0, 4)}****
                    {detail.accountNumber.substring(8)}
                  </p>
                </div>
              </div>
              {onDelete && (
                <Button
                  variant={ButtonVariant.Outline}
                  size={ButtonSize.Sm}
                  onClick={() => onDelete(detail.id)}
                  disabled={isLoading}
                  className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

