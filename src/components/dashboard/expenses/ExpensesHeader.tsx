"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Receipt, Plus, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExpensesGuideModal } from "./ExpensesGuideModal";

import { AccountType } from "@/lib/utils/account-type";

interface ExpensesHeaderProps {
  onCreateClick: () => void;
  currentYear?: number;
  accountType: AccountType;
}

export function ExpensesHeader({ onCreateClick, currentYear, accountType }: ExpensesHeaderProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const getTitle = () => {
    switch (accountType) {
      case AccountType.Company:
        return "Company Expenses";
      case AccountType.Business:
        return "Business Expenses";
      case AccountType.Individual:
        return "My Expenses";
      default:
        return "Expenses";
    }
  };

  const getSubtitle = () => {
    if (accountType === AccountType.Individual) {
      return (
        <>
          Track your personal spending. <span className="text-emerald-700 font-medium">Optimize your finances.</span>
        </>
      );
    }
    return (
      <>
        Record money leaving your business. <span className="text-emerald-700 font-medium">Pay less tax legally.</span>
      </>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
      >
        <div className="flex-1">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 hidden xs:block">
              <Receipt className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{getTitle()}</h1>
                {currentYear && (
                  <span className="px-3 py-1 bg-emerald-100/50 text-emerald-700 rounded-full text-sm font-semibold border border-emerald-200">
                    {currentYear}
                  </span>
                )}
              </div>
              <p className="text-slate-600 mt-2 text-lg">
                {getSubtitle()}
              </p>
              
              <button 
                onClick={() => setIsGuideOpen(true)}
                className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full text-base font-semibold transition-all border border-emerald-200 flex items-center gap-2 group shadow-sm"
              >
                <HelpCircle className="w-5 h-5" />
                <span>How does this work?</span>
              </button>
            </div>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0 w-full sm:w-auto">
          <Button 
            onClick={onCreateClick}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/30 text-lg py-6 px-8 rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Expense
          </Button>
        </motion.div>
      </motion.div>

      <ExpensesGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
    </>
  );
}

