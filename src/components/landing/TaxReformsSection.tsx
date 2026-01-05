"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Calendar, AlertCircle, CheckCircle2, Shield, TrendingUp, ArrowRight, User, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonSize } from "@/lib/utils/client-enums";

const reforms = [
  {
    icon: User,
    title: "Earn Under ₦800k?",
    badge: "New for 2026",
    description: "If you earn ₦800,000 or less per year, you pay Zero Tax. The law now protects your income.",
    impact: "For Individuals",
    solution: "We check your yearly income automatically. If it's under ₦800k, we set your tax to zero.",
    urgency: "High",
  },
  {
    icon: Building2,
    title: "Small Business? 0% Tax.",
    badge: "Big Change",
    description: "Make less than ₦50 Million a year? Your Company Tax is now 0%. You keep 100% of your profit.",
    impact: "For Companies",
    solution: "We track your sales. If you're a Small Company (Turnover < ₦50M), we stop adding Company Tax.",
    urgency: "High",
  },
  {
    icon: TrendingUp,
    title: "VAT Only Over ₦100M",
    badge: "Important",
    description: "You only charge VAT if you sell more than ₦100 Million a year. Below that? No VAT required.",
    impact: "For Everyone",
    solution: "We alert you only when you cross the ₦100M sales line, so you never charge VAT by mistake.",
    urgency: "Medium",
  },
  {
    icon: Shield,
    title: "Claim Your Rent Relief",
    badge: "New Benefit",
    description: "The law now lets you deduct rent from your taxable income. You can save up to ₦500,000.",
    impact: "For Individuals",
    solution: "Just enter your rent amount. We subtract it from your income before calculating tax.",
    urgency: "Medium",
  },
];

export function TaxReformsSection() {
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
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-emerald-100 border border-emerald-200 mb-8"
          >
            <Calendar className="w-5 h-5 text-emerald-700" />
            <span className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Effective Jan 1, 2026</span>
          </motion.div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            New Tax Rules. <span className="text-emerald-600">Simplified.</span>
          </h2>
          <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-light mb-6">
            The government changed the rules for 2025/2026. Good news: You might owe less tax than before. We help you claim every benefit.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {reforms.map((reform, index) => {
            const IconComponent = reform.icon;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ duration: 0.7, delay: 0.3 + index * 0.1 }}
                className="group"
              >
                <div className="h-full p-8 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                      <IconComponent className="w-7 h-7" />
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                      {reform.badge}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{reform.title}</h3>
                  <div className="text-sm font-semibold text-emerald-600 mb-4 uppercase tracking-wider">{reform.impact}</div>
                  
                  <p className="text-slate-600 leading-relaxed mb-6 text-base">
                    {reform.description}
                  </p>
                  
                  <div className="bg-slate-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                    <div className="text-sm font-bold text-emerald-900 mb-1">How We Help:</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{reform.solution}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}









