"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { FileText, Wallet, CheckCircle2, BarChart3, Building2, Zap, ArrowRight, TrendingDown, Users } from "lucide-react"; // DollarSign
import { NairaSign } from "@/components/icons/NairaSign";
import { VAT_RATE } from "@/lib/constants/tax";

const features = [
  {
    icon: TrendingDown,
    title: "Track Tax Automatically",
    description: "Every time you spend money, we calculate your tax deductions instantly. No math required.",
    benefit: "Automatic",
  },
  {
    icon: FileText,
    title: "Perfect Invoices",
    description: `Create invoices that meet NRS standards. We handle the ${VAT_RATE}% VAT calculation for you.`,
    benefit: "NRS Compliant",
  },
  {
    icon: NairaSign,
    title: "Real-Time Calculations",
    description: "Know exactly what you owe in VAT and Company Tax at any moment. No surprises.",
    benefit: "Always Accurate",
  },
  {
    icon: Wallet,
    title: "Easy Payroll Tax",
    description: "Managing employee taxes (PAYE) is now one click. We calculate it all based on Nigerian law.",
    benefit: "Payroll Ready",
  },
  {
    icon: BarChart3,
    title: "Instant Reports",
    description: "Need a report for the bank or NRS? Download professional tax reports in seconds.",
    benefit: "Audit Ready",
  },
  {
    icon: Users,
    title: "Multi-Business Support",
    description: "Run multiple companies? Manage all their taxes from one single dashboard.",
    benefit: "Scalable",
  },
];

export function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" ref={ref} className="relative py-24 lg:py-32 bg-white overflow-hidden">
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">Everything Included</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Everything You Need to Run Your Business
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            We built TaxComply to be the only tool you need for Nigerian tax compliance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group p-8 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors duration-300">
                  <IconComponent className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {feature.description}
                </p>
                
                <div className="flex items-center space-x-2 text-sm font-medium text-emerald-700 bg-emerald-50 inline-block px-3 py-1 rounded-md">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{feature.benefit}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
