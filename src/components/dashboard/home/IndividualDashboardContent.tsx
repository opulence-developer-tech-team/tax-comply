"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Calculator, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { QuickActionsCard } from "./QuickActionsCard";
import { NextStepCard } from "@/components/shared/NextStepCard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

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

/**
 * Individual Account Dashboard Content
 * 
 * Production-ready component for individual account dashboard.
 * Displays PIT, Income, and Expenses management cards.
 * 
 * Features:
 * - Clean, focused UI for individual tax management
 * - Links to PIT, Income, and Expenses pages
 * - Quick actions card for common tasks
 * - Smooth animations and transitions
 */
export function IndividualDashboardContent() {
  const router = useRouter();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Individual Account Dashboard - Simplified Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Tax Summary Card - Renamed from PIT */}
        <motion.div
          variants={itemVariants}
          onClick={() => router.push("/dashboard/pit")}
          className="cursor-pointer group"
        >
          <Card className="h-full hover:shadow-2xl transition-all duration-300 border-emerald-100 hover:border-emerald-400 group-hover:-translate-y-2">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="p-4 bg-emerald-50 rounded-2xl group-hover:bg-emerald-100 transition-colors shadow-sm">
                  <Calculator className="w-10 h-10 text-emerald-700" />
                </div>
                <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                  Most Important
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 group-hover:text-emerald-900 transition-colors">
                My Tax Summary
              </h3>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed font-medium">
                See exactly how much tax you owe (or don't owe). We do the math for you.
              </p>
              <div className="flex items-center text-emerald-700 font-bold text-lg group-hover:text-emerald-800">
                Check My Tax Status
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Income Card */}
        <motion.div
          variants={itemVariants}
          onClick={() => router.push("/dashboard/income")}
          className="cursor-pointer group"
        >
          <Card className="h-full hover:shadow-2xl transition-all duration-300 border-slate-100 hover:border-emerald-300 group-hover:-translate-y-2">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="p-4 bg-emerald-50 rounded-2xl group-hover:bg-emerald-100 transition-colors shadow-sm">
                  <TrendingUp className="w-10 h-10 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 group-hover:text-emerald-800 transition-colors">
                Money I Earned
              </h3>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed font-medium">
                Tell us about your salary or business income so we can calculate things correctly.
              </p>
              <div className="flex items-center text-emerald-600 font-bold text-lg group-hover:text-emerald-800">
                Add Income
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Expenses Card */}
        <motion.div
          variants={itemVariants}
          onClick={() => router.push("/dashboard/expenses")}
          className="cursor-pointer group"
        >
          <Card className="h-full hover:shadow-2xl transition-all duration-300 border-slate-100 hover:border-emerald-300 group-hover:-translate-y-2">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="p-4 bg-emerald-50 rounded-2xl group-hover:bg-emerald-100 transition-colors shadow-sm">
                  <TrendingDown className="w-10 h-10 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 group-hover:text-emerald-800 transition-colors">
                Money I Spent
              </h3>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed font-medium">
                Record your business costs. This helps lower your tax bill legally.
              </p>
              <div className="flex items-center text-emerald-600 font-bold text-lg group-hover:text-emerald-800">
                Add Expenses
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <QuickActionsCard />

      <NextStepCard
        title="Start Here: Add Your Income"
        description="First, tell us how much you earned. This is the first step to checking your tax status."
        href="/dashboard/income"
        actionLabel="Go to Income Page"
      />
    </motion.div>
  );
}

