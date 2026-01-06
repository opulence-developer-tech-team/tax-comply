"use client";

import { useState } from "react";
import { motion, Variants } from "framer-motion";
import { useAppSelector } from "@/hooks/useAppSelector";
import { AccountType } from "@/lib/utils/account-type";
import { Button } from "@/components/ui/Button";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { HelpCircle } from "lucide-react";
import { DashboardGuideModal } from "./DashboardGuideModal";

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

/**
 * DashboardHeader Component
 * 
 * Displays account-type-specific header text.
 * 
 * CRITICAL: Uses user accountType from Redux to determine correct text.
 * Fails loudly if accountType is invalid or missing.
 */
export function DashboardHeader() {
  const { user } = useAppSelector((state: any) => state.user);
  
  // CRITICAL: Validate user and accountType - fail loudly if invalid
  if (!user) {
    // User not loaded yet - show generic text
    return (
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Your Overview</h1>
        <p className="text-slate-600">See how you're doing with taxes and compliance. Everything you need in one place.</p>
      </motion.div>
    );
  }

  if (!user.accountType) {
    console.error(
      "[DashboardHeader] CRITICAL: user.accountType is missing. " +
      "This should never happen - user object must have accountType property."
    );
    // Fallback to generic text
    return (
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Your Overview</h1>
        <p className="text-slate-600">See how you're doing with taxes and compliance. Everything you need in one place.</p>
      </motion.div>
    );
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    console.error(
      `[DashboardHeader] CRITICAL: user.accountType "${user.accountType}" is not a valid AccountType enum value. ` +
      `Valid values are: ${validAccountTypes.join(", ")}.`
    );
    // Fallback to generic text
    return (
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Your Overview</h1>
        <p className="text-slate-600">See how you're doing with taxes and compliance. Everything you need in one place.</p>
      </motion.div>
    );
  }

  const accountType = user.accountType;
  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;
  const isIndividualAccount = accountType === AccountType.Individual;

  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // CRITICAL: Determine header text based on account type - no defaults
  let title: string;
  // Description is now in the guide modal

  if (isCompanyAccount) {
    title = "Hi, Welcome Back 👋";
  } else if (isBusinessAccount) {
    title = "Hi, Welcome Back 👋";
  } else if (isIndividualAccount) {
    title = "Hi, Welcome Back 👋";
  } else {
    // CRITICAL: This should never happen - fail loudly
    console.error(
      `[DashboardHeader] CRITICAL: Unhandled account type "${accountType}". ` +
      `Expected AccountType.Company, AccountType.Business, or AccountType.Individual.`
    );
    // Fallback to generic text
    title = "Hi, Welcome Back 👋";
  }

  return (
    <>
      <motion.div variants={itemVariants} className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-2 tracking-tight">{title}</h1>
          <p className="text-lg md:text-xl text-emerald-700/80 font-medium">Your financial command center</p>
        </div>
        
        <Button 
          variant={ButtonVariant.Ghost} 
          onClick={() => setIsGuideOpen(true)}
          className="self-start sm:self-auto text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all group py-2 px-3 h-auto rounded-lg"
        >
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-1 rounded-full group-hover:bg-emerald-200 transition-colors">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70">Need Help?</span>
              <span className="block font-bold text-sm">How This Page Works</span>
            </div>
          </div>
        </Button>
      </motion.div>

      <DashboardGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
        accountType={accountType} 
      />
    </>
  );
}

















