"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { AlertTriangle, FileText, CheckCircle2, ArrowRight, Shield, Zap, XCircle } from "lucide-react";

const problems = [
  {
    icon: XCircle,
    title: "Fear of FIRS Penalties",
    description: "One wrong calculation or missed deadline can lead to heavy fines. The rules change often, and it's hard to keep up.",
    impact: "Constant Data Anxiety",
  },
  {
    icon: FileText,
    title: "Messy Paperwork",
    description: "Spreadsheets get complicated. Receipts get lost. When it's time to file, you don't know where to start.",
    impact: "Wasted Operations Time",
  },
  {
    icon: AlertTriangle,
    title: "Overpaying Taxes",
    description: "Without expert knowledge, you might be paying more than you owe. Deductions and exemptions are often missed.",
    impact: "Lost Company Revenue",
  },
];

const solutions = [
  {
    icon: CheckCircle2,
    title: "100% Accurate, Always",
    description: "We handle the math. VAT, WHT, CIT, PIT — it's all calculated automatically based on the latest 2025 laws.",
    benefit: "Zero Errors",
  },
  {
    icon: Shield,
    title: "Audit-Proof Records",
    description: "Every invoice and expense is stored securely. If NRS asks, you have a professional report ready in seconds.",
    benefit: "Total Peace of Mind",
  },
  {
    icon: Zap,
    title: "Never Miss a Date",
    description: "We remind you before every deadline. You'll always file on time and avoid those annoying penalties.",
    benefit: "Always On Time",
  },
];

export function ProblemSolutionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-28 lg:py-36 bg-slate-50 overflow-hidden">
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            Tax Compliance is <span className="text-red-600">Hard</span>.
            <br />
            We Make it <span className="text-emerald-600">Easy</span>.
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Stop losing sleep over tax issues. We've built the system that handles it for you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* Problem Side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-xl border border-red-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl opacity-50 -mr-32 -mt-32 pointer-events-none"></div>
                <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3 relative z-10">
                    <span className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <XCircle className="w-6 h-6" />
                    </span>
                    The Old Way
                </h3>
                <div className="space-y-8 relative z-10">
                    {problems.map((item, idx) => (
                        <div key={idx} className="flex gap-4">
                            <div className="mt-1">
                                <XCircle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h4>
                                <p className="text-slate-600 leading-relaxed">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>

          {/* Solution Side */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="bg-emerald-900 rounded-3xl p-8 lg:p-10 shadow-2xl relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-3xl opacity-20 -mr-32 -mt-32 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600 rounded-full blur-3xl opacity-20 -ml-32 -mb-32 pointer-events-none"></div>
                
                <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 relative z-10">
                    <span className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                    </span>
                    The TaxComply Way
                </h3>

                <div className="space-y-8 relative z-10">
                    {solutions.map((item, idx) => (
                        <div key={idx} className="flex gap-4">
                            <div className="mt-1">
                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-emerald-50 mb-2">{item.title}</h4>
                                <p className="text-emerald-200/90 leading-relaxed">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-10 pt-8 border-t border-emerald-800/50">
                    <button className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2">
                        Get Peace of Mind
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
