"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { RefreshCw, Gem, Sparkles } from "lucide-react";
import { ButtonVariant } from "@/lib/utils/client-enums";

interface ReferralHeaderProps {
  onRefresh: () => void;
}

export function ReferralHeader({ onRefresh }: ReferralHeaderProps) {
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
      
      <Button
        onClick={onRefresh}
        variant={ButtonVariant.Outline}
        className="self-start sm:self-center bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 transition-all shadow-sm"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh Data
      </Button>
    </motion.div>
  );
}











