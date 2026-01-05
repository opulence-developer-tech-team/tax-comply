"use client";

import { motion } from "framer-motion";
import { FileText, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Variants } from "framer-motion";

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

interface InvoiceStatsProps {
  total: number;
  totalAmount: number;
  paid: number;
  pending: number;
  paidAmount: number;
}

export function InvoiceStats({
  total,
  totalAmount,
  paid,
  pending,
  paidAmount,
}: InvoiceStatsProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100 rounded-2xl p-6 shadow-lg shadow-emerald-500/10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <FileText className="w-8 h-8 text-emerald-700" />
          </div>
          <span className="text-base font-bold text-emerald-700 bg-emerald-100/50 px-4 py-1.5 rounded-full">
            All Invoices
          </span>
        </div>
        <p className="text-4xl font-bold text-slate-900 mb-2">{total}</p>
        <p className="text-lg text-slate-600">Total requests sent</p>
      </motion.div>

      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100 rounded-2xl p-6 shadow-lg shadow-emerald-500/10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <DollarSign className="w-8 h-8 text-emerald-700" />
          </div>
          <span className="text-base font-bold text-emerald-700 bg-emerald-100/50 px-4 py-1.5 rounded-full">
            Total Value
          </span>
        </div>
        <p className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(totalAmount)}</p>
        <p className="text-lg text-slate-600">Expected total money</p>
      </motion.div>

      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100 rounded-2xl p-6 shadow-lg shadow-emerald-500/10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-700" />
          </div>
          <span className="text-base font-bold text-emerald-700 bg-emerald-100/50 px-4 py-1.5 rounded-full">
            Money In
          </span>
        </div>
        <p className="text-3xl font-bold text-slate-900 mb-2">{paid}</p>
        <p className="text-lg text-slate-600">{formatCurrency(paidAmount)} received</p>
      </motion.div>

      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100 rounded-2xl p-6 shadow-lg shadow-emerald-500/10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <Clock className="w-8 h-8 text-emerald-700" />
          </div>
          <span className="text-base font-bold text-emerald-700 bg-emerald-100/50 px-4 py-1.5 rounded-full">
            Waiting
          </span>
        </div>
        <p className="text-3xl font-bold text-slate-900 mb-2">{pending}</p>
        <p className="text-lg text-slate-600">Not paid yet</p>
      </motion.div>
    </motion.div>
  );
}

















