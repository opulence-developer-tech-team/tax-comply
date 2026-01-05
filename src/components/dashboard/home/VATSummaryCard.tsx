"use client";

import { motion, Variants } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

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

interface VATSummaryCardProps {
  vatData: {
    inputVAT: number;
    outputVAT: number;
    netVAT: number;
    status: string;
  } | null;
}

export function VATSummaryCard({ vatData }: VATSummaryCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card title="VAT This Month" subtitle="What you owe or will get back">
        {vatData ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">VAT from your sales:</span>
              <span className="font-bold text-slate-900">{formatCurrency(vatData.outputVAT)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">VAT you paid on purchases:</span>
              <span className="font-bold text-slate-900">{formatCurrency(vatData.inputVAT)}</span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-900">What you owe NRS:</span>
              <motion.span
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className={`font-bold text-lg ${
                  vatData.netVAT >= 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {formatCurrency(Math.abs(vatData.netVAT))}
              </motion.span>
            </div>
            <div className="mt-3">
              <span
                className={`inline-block px-3 py-1.5 text-xs font-semibold rounded-lg ${
                  vatData.status === "payable"
                    ? "bg-red-100 text-red-800"
                    : vatData.status === "refundable"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {vatData.status === "payable"
                  ? "You need to pay this to NRS (Nigeria Revenue Service)"
                  : vatData.status === "refundable"
                  ? "NRS (Nigeria Revenue Service) will refund this to you"
                  : "No payment needed"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No VAT records for this month yet</p>
        )}
      </Card>
    </motion.div>
  );
}

















