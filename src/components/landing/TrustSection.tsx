"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Building2, Lock, MapPin, CheckCircle2, CreditCard, Activity, Shield } from "lucide-react";
import { VAT_RATE } from "@/lib/constants/tax";

const trustSignals = [
  {
    icon: Building2,
    title: "Nigerian by Design",
    description: `Everything is set to ${VAT_RATE}% VAT and relevant tax laws. We don't just "support" Nigeria; we are built for it.`,
    stat: "100%",
    statLabel: "Nigerian Logic",
  },
  {
    icon: Lock,
    title: "Safe & Secure",
    description: "We use the same security as major banks to keep your data safe. Your records are private and protected.",
    stat: "High",
    statLabel: "Security Level",
  },
  {
    icon: CheckCircle2,
    title: "Always Ready",
    description: "Need a report for the bank or NRS? Download it in seconds. Your records are always organized.",
    stat: "< 60s",
    statLabel: "Export Time",
  },
  {
    icon: CreditCard,
    title: "Easy Payments",
    description: "We accept local cards and bank transfers. Payments are processed securely via Monnify(Moniepoint).",
    stat: "Instant",
    statLabel: "Activation",
  },
];

export function TrustSection() {
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
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-200 mb-6"
          >
            <Shield className="w-4 h-4 text-emerald-700" />
            <span className="text-sm font-semibold text-emerald-800">Secure & Compliant</span>
          </motion.div>
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Built for Nigerian Individuals, Businesses & Companies
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            We focus on one thing: making tax compliance easy for you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {trustSignals.map((signal, index) => {
            const IconComponent = signal.icon;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-8 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 h-full">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors duration-300">
                      <IconComponent className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{signal.title}</h3>
                    <p className="text-slate-600 leading-relaxed mb-4">
                      {signal.description}
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      <div className="px-3 py-1 rounded bg-slate-100 text-sm font-bold text-slate-700 border border-slate-200">
                        {signal.stat}
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                        {signal.statLabel}
                      </span>
                    </div>
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
