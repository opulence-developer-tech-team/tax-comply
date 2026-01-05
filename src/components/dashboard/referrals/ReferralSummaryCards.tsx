"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Users, TrendingUp, Wallet, Banknote, HelpCircle, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { SimpleTooltip } from "@/components/shared/SimpleTooltip";

interface ReferralSummary {
  totalReferrals: number;
  totalEarnings: number;
  availableBalance: number;
  totalWithdrawn: number;
  pendingEarnings: number;
}

interface ReferralSummaryCardsProps {
  summary: ReferralSummary;
}

export function ReferralSummaryCards({
  summary,
}: ReferralSummaryCardsProps) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Referrals */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 h-full border-blue-100 bg-white hover:shadow-md transition-shadow duration-200 group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
             <Users className="w-24 h-24 text-blue-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Total Referrals</p>
              <SimpleTooltip content="Number of people who signed up using your link.">
                 <HelpCircle className="w-3 h-3 text-blue-400 cursor-help" />
              </SimpleTooltip>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {summary.totalReferrals}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Friend(s) Invited</p>
          </div>
        </Card>
      </motion.div>

      {/* Total Earnings */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 h-full border-emerald-100 bg-white hover:shadow-md transition-shadow duration-200 group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
             <TrendingUp className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="relative z-10">
             <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Total Earnings</p>
              <SimpleTooltip content="Total commission you have earned from all your referrals to date.">
                 <HelpCircle className="w-3 h-3 text-emerald-400 cursor-help" />
              </SimpleTooltip>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight break-words">
              {formatCurrency(summary.totalEarnings)}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Lifetime Commission</p>
          </div>
        </Card>
      </motion.div>

      {/* Available Balance */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 h-full border-amber-100 bg-amber-50/30 hover:shadow-md transition-shadow duration-200 group relative overflow-hidden">
           <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
             <Wallet className="w-24 h-24 text-amber-600" />
          </div>
          <div className="relative z-10">
             <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Available Balance</p>
              <SimpleTooltip content="Money currently in your wallet, ready to be withdrawn to your bank.">
                 <HelpCircle className="w-3 h-3 text-amber-400 cursor-help" />
              </SimpleTooltip>
            </div>
            <p className="text-3xl font-extrabold text-emerald-600 tracking-tight break-words">
              {formatCurrency(summary.availableBalance)}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-700 font-medium">
               <span>Ready to withdraw</span>
               <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Total Withdrawn */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 h-full border-purple-100 bg-white hover:shadow-md transition-shadow duration-200 group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
             <Banknote className="w-24 h-24 text-purple-600" />
          </div>
          <div className="relative z-10">
             <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Total Withdrawn</p>
              <SimpleTooltip content="Total amount you have successfully successfully withdrawn to your bank.">
                 <HelpCircle className="w-3 h-3 text-purple-400 cursor-help" />
              </SimpleTooltip>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight break-words">
              {formatCurrency(summary.totalWithdrawn)}
            </p>
             <p className="text-xs text-slate-500 mt-1 font-medium">Sent to Bank</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}











