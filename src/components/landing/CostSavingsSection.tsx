"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { AlertTriangle, TrendingDown, User, Check, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function CostSavingsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-slate-50 overflow-hidden">
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">Save Money</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Cheaper than an Accountant.
            <br />
            Safer than doing it yourself.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
            {/* DIY Option */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 opacity-75 grayscale hover:grayscale-0 transition-all">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Do It Yourself</h3>
                    <div className="text-4xl font-bold text-slate-900 mt-2">Free?</div>
                    <div className="text-sm text-slate-500">Warning: High Risk</div>
                </div>
                <ul className="space-y-4 text-slate-600 mb-8">
                    <li className="flex gap-3">
                        <X className="w-5 h-5 text-red-500 shrink-0" />
                        <span>High risk of penalties</span>
                    </li>
                    <li className="flex gap-3">
                        <X className="w-5 h-5 text-red-500 shrink-0" />
                        <span>Hours of manual data entry</span>
                    </li>
                    <li className="flex gap-3">
                        <X className="w-5 h-5 text-red-500 shrink-0" />
                        <span>Missed deductions</span>
                    </li>
                </ul>
            </div>

            {/* TaxComply Option */}
            <div className="bg-emerald-900 p-8 lg:p-10 rounded-3xl border-4 border-emerald-400 shadow-2xl relative transform lg:scale-110 z-10">
                <div className="absolute top-0 right-0 bg-emerald-400 text-emerald-900 text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                    BEST CHOICE
                </div>
                <div className="mb-8">
                    <h3 className="text-2xl font-bold text-white">TaxComply</h3>
                    <div className="text-5xl font-bold text-white mt-2">₦4,000</div>
                    <div className="text-emerald-200">per month (billed annually)</div>
                </div>
                <ul className="space-y-4 text-emerald-100 mb-8 text-lg">
                    <li className="flex gap-3 items-center">
                        <div className="bg-emerald-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>
                        <span>Zero Calculation Errors</span>
                    </li>
                    <li className="flex gap-3 items-center">
                        <div className="bg-emerald-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>
                        <span>NRS Compliant Invoices</span>
                    </li>
                    <li className="flex gap-3 items-center">
                        <div className="bg-emerald-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>
                        <span>Audit-Ready Reports</span>
                    </li>
                    <li className="flex gap-3 items-center">
                        <div className="bg-emerald-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>
                        <span>Deadline Reminders</span>
                    </li>
                </ul>
                <Link href="/sign-up">
                    <Button className="w-full py-6 text-lg font-bold bg-emerald-400 text-emerald-900 hover:bg-emerald-300">
                        Start Free Trial
                    </Button>
                </Link>
            </div>

             {/* Accountant Option */}
             <div className="bg-white p-8 rounded-2xl border border-slate-200">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Hire Accountant</h3>
                    <div className="text-4xl font-bold text-slate-900 mt-2">₦50,000+</div>
                    <div className="text-sm text-slate-500">per month (average)</div>
                </div>
                <ul className="space-y-4 text-slate-600 mb-8">
                    <li className="flex gap-3">
                        <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Professional advice</span>
                    </li>
                    <li className="flex gap-3">
                        <X className="w-5 h-5 text-orange-500 shrink-0" />
                        <span>Expensive for small biz</span>
                    </li>
                    <li className="flex gap-3">
                        <X className="w-5 h-5 text-orange-500 shrink-0" />
                        <span>Slow response times</span>
                    </li>
                </ul>
            </div>
        </div>

      </div>
    </section>
  );
}
