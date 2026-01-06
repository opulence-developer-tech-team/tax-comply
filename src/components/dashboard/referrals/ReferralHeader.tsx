"use client";

import { motion } from "framer-motion";
import { Gem, Sparkles } from "lucide-react";

export function ReferralHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center border border-emerald-100 shadow-sm shrink-0">
           <Gem className="w-7 h-7 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Referral Program
            <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400 hidden sm:block" />
          </h1>
          <p className="text-slate-500 font-medium text-sm md:text-base mt-0.5">
            Turn your network into net worth.
          </p>
        </div>
      </div>
    </motion.div>
  );
}











