"use client";

import { motion } from "framer-motion";
import { Shield, Lock, FileCheck, Award, Server, Globe, CheckCircle2 } from "lucide-react";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { LandingFooter } from "@/components/layout/LandingFooter";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonSize } from "@/lib/utils/client-enums";

const features = [
  {
    icon: Shield,
    title: "NRS 2025 Act Compliant",
    description: "Our system is built on the exact specifications of the Nigeria Tax Reform Acts 2025. We update automatically as laws change.",
  },
  {
    icon: Lock,
    title: "Bank-Grade Security",
    description: "We use 256-bit SSL encryption and strict access controls to ensure your financial data never falls into the wrong hands.",
  },
  {
    icon: FileCheck,
    title: "ISO 27001 Certified",
    description: "Our information security management systems adhere to the highest international standards for data protection.",
  },
  {
    icon: Award,
    title: "NDPR Compliant",
    description: "We fully comply with the Nigeria Data Protection Regulation, ensuring your personal data rights are respected.",
  },
  {
    icon: Server,
    title: "Data Sovereignty",
    description: "Your data is stored securely within compliant jurisdictions, meeting all local residency requirements.",
  },
  {
    icon: Globe,
    title: "Global Standards",
    description: "While built for Nigeria, our compliance infrastructure rivals top global financial platforms.",
  },
];

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden bg-emerald-950">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 opacity-90" />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
            }}
            className="absolute -top-1/2 -right-1/2 w-[1000px] h-[1000px] bg-emerald-500/10 rounded-full blur-3xl"
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-sm font-medium mb-8 backdrop-blur-sm">
              <Shield className="w-4 h-4" />
              <span>Uncompromising Security</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Compliance is our <br />
              <span className="text-emerald-400">Core DNA</span>
            </h1>
            <p className="text-xl text-emerald-100/80 max-w-2xl mx-auto mb-10 leading-relaxed">
              We don't just follow the rules; we set the standard. TaxComply NG is engineered to exceed the strictest regulatory requirements in Nigeria.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Standards Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Deep Dive Section */}
      <section className="py-24 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Audit-Ready, Always.
              </h2>
              <p className="text-lg text-slate-700 mb-6 leading-relaxed">
                Fear of NRS audits is a thing of the past. Our platform automatically maintains detailed audit trails for every transaction, calculation, and invoice.
              </p>
              <ul className="space-y-4">
                {[
                  "Immutable transaction logs",
                  "Automated WHT credit note tracking",
                  "Instant generation of CIT file packages",
                  "Real-time VAT reconciliation"
                ].map((item, i) => (
                   <li key={i} className="flex items-center gap-3 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl transform rotate-3 blur-xl opacity-20" />
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-emerald-100">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-emerald-50">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Compliance Score</h3>
                    <p className="text-sm text-emerald-600">Updated just now</p>
                  </div>
                  <div className="ml-auto text-2xl font-bold text-emerald-600">100%</div>
                </div>
                <div className="space-y-4">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-emerald-500 rounded-full" />
                  </div>
                  <p className="text-sm text-slate-500 text-center">
                    Your business meets all 2025 Act requirements.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white text-center">
         <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Built for Trust</h2>
            <p className="text-lg text-slate-600 mb-8">
              Join thousands of Nigerian businesses who trust us with their compliance.
            </p>
            <Link href="/sign-up">
              <Button size={ButtonSize.Lg} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                Start Compliance Journey
              </Button>
            </Link>
         </div>
      </section>

      <LandingFooter />
    </div>
  );
}
