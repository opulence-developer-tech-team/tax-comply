"use client";

import { motion } from "framer-motion";
import { Accessibility, Eye, Ear, Keyboard, Palette, Laptop, CheckCircle2 } from "lucide-react";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { LandingFooter } from "@/components/layout/LandingFooter";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonSize } from "@/lib/utils/client-enums";

const features = [
  {
    icon: Eye,
    title: "Screen Reader Optimized",
    description: "Our platform is fully navigable using screen readers like NVDA and VoiceOver, with proper ARIA labels throughout.",
  },
  {
    icon: Keyboard,
    title: "Keyboard Navigation",
    description: "Power user or unable to use a mouse? Every action in TaxComply can be performed using just the keyboard.",
  },
  {
    icon: Palette,
    title: "Think Contrast",
    description: "We strictly adhere to WCAG AAA contrast ratios. Our 'Luxury Green' isn't just pretty; it's readable for everyone.",
  },
  {
    icon: Laptop,
    title: "Device Agnostic",
    description: "Whether on a high-end MacBook or an entry-level smartphone, our responsive design ensures a seamless experience.",
  },
  {
    icon: Ear,
    title: "Assistive Technology",
    description: "Compatible with braille displays, switch devices, and other assistive inputs.",
  },
  {
    icon: Accessibility,
    title: "Cognitive Friendly",
    description: "We use plain English and clear layouts to minimalize cognitive load. Tax is hard; our app isn't.",
  },
];

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden bg-emerald-950">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 opacity-90" />
           <motion.div
            animate={{
              opacity: [0.3, 0.5, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
            }}
            className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-400/20 rounded-full blur-[100px]"
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-sm font-medium mb-8 backdrop-blur-sm">
              <Accessibility className="w-4 h-4" />
              <span>Inclusive by Default</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Tax Compliance for <br />
              <span className="text-emerald-400">Everyone</span>
            </h1>
            <p className="text-xl text-emerald-100/80 max-w-2xl mx-auto mb-10 leading-relaxed">
              Disability should never be a barrier to financial independence. We are committed to building a platform that empowers every Nigerian business owner.
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

      {/* Commitment Section */}
      <section className="py-24 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Our ongoing commitment.
              </h2>
              <p className="text-lg text-slate-700 mb-6 leading-relaxed">
                Accessibility is not a checkbox; it's a journey. We continuously audit our platform against WCAG 2.1 Level AA standards.
              </p>
              <ul className="space-y-4">
                {[
                  "Regular manual audits by efficiency experts",
                  "Automated accessibility pipeline testing",
                  "Feedback loops with disabled users",
                  "Semantically correct HTML5 structure"
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
             <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 text-center">
                 <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Eye className="w-10 h-10 text-emerald-600" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 mb-2">WCAG 2.1 AA</h3>
                 <p className="text-emerald-600 font-medium mb-4">Target Standard</p>
                 <p className="text-slate-600">
                   We strive to meet or exceed these guidelines to ensure our content is accessible to a wider range of people with disabilities.
                 </p>
             </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white text-center">
         <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Found an issue?</h2>
            <p className="text-lg text-slate-600 mb-8">
              We value your feedback. If you encounter any accessibility barriers, please let us know immediately.
            </p>
            <Link href="/contact">
              <Button size={ButtonSize.Lg} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                Report Accessibility Issue
              </Button>
            </Link>
         </div>
      </section>

      <LandingFooter />
    </div>
  );
}
