"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonSize } from "@/lib/utils/client-enums";
import { UserPlus, FileInput, Calculator, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "Step 01",
    title: "Create Account",
    description: "Sign up in 30 seconds. Choose 'Individual' or 'Company'.",
  },
  {
    icon: FileInput,
    step: "Step 02",
    title: "Add Income",
    description: "Log your invoices or salary. We organize everything.",
  },
  {
    icon: Calculator,
    step: "Step 03",
    title: "See Your Tax",
    description: "We instantly calculate VAT, WHT ,Income Tax, and PAYE for you.",
  },
  {
    icon: CheckCircle,
    step: "Step 04",
    title: "Be Compliant",
    description: "Download ready-to-file reports. No stress.",
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" ref={ref} className="py-24 lg:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            So Simple, You Don't Need Training
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            We designed TaxComply to work the way you do. No accounting degree required.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-emerald-200 -z-10"></div>

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="relative text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm relative z-10">
                <step.icon className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">{step.step}</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm">{step.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <Link href="/sign-up">
            <Button 
              size={ButtonSize.Lg} 
              className="px-8 py-6 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-all rounded-xl"
            >
              Start Your Free Account
            </Button>
          </Link>
          <p className="mt-4 text-sm text-slate-500">Takes less than 2 minutes</p>
        </motion.div>
      </div>
    </section>
  );
}
