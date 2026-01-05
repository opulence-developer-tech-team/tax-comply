"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { PricingCard, type PricingPlan } from "./PricingCard";
import { BillingCycle } from "@/lib/utils/client-enums";

import Link from "next/link";

const defaultPlans: PricingPlan[] = [
  {
    name: "Free",
    price: 0,
    yearlyPrice: 0,
    period: "forever",
    description: "Perfect for testing. valid for small individuals.",
    features: [
      "Track up to 50 expenses/mo",
      "Basic VAT calculation",
      "Manual Reports",
      "Email Support",
    ],
    cta: "Start Free",
    highlight: false,
    savings: null,
    gradient: "from-slate-50 to-white",
    borderColor: "border-slate-200",
  },
  {
    name: "Individual",
    price: 4000,
    yearlyPrice: 38400,
    period: "month",
    description: "For freelancers and sole proprietors.",
    features: [
      "Unlimited expenses",
      "Automated VAT & WHT",
      "Personal Income Tax (PIT)",
      "Audit-ready PDF Reports",
      "Priority Support",
    ],
    cta: "Start Free Trial",
    highlight: true,
    savings: "Save ₦9,600/year",
    gradient: "from-emerald-50 to-white",
    borderColor: "border-emerald-500",
  },
  {
    name: "Company",
    price: 15000,
    yearlyPrice: 144000,
    period: "month",
    description: "For registered businesses (Ltd, PLC).",
    features: [
      "Everything in Individual",
      "Corporate Income Tax (CIT)",
      "Employee PAYE Management",
      "Multi-user Access",
      "Dedicated Account Manager",
    ],
    cta: "Start Free Trial",
    highlight: false,
    savings: "Save ₦36,000/year",
    gradient: "from-slate-50 to-white",
    borderColor: "border-slate-200",
  },
];

interface PricingSectionProps {
  initialPlans?: Array<any>;
}

interface ServerPricingPlan {
  name: string;
  plan: string;
  monthly: number;
  yearly: number;
  discountMonthly?: number;
  discountYearly?: number;
  description: string;
  features: string[];
  gradient: string;
  border: string;
}

export function PricingSection({ initialPlans = [] }: PricingSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(BillingCycle.Monthly);

  // Transform server plans to UI plans or use default if empty
  const plans: PricingPlan[] = (initialPlans.length > 0 ? initialPlans : defaultPlans).map((plan: any) => {
    // If it's already in the UI format (fallback to defaultPlans), return as is
    if ('cta' in plan && 'savings' in plan) return plan as PricingPlan;

    const serverPlan = plan as ServerPricingPlan;
    const isFree = serverPlan.name === "Free";
    
    // Calculate savings
    const yearlySavings = (serverPlan.monthly * 12) - serverPlan.yearly;
    const savings = yearlySavings > 0 ? `Save ₦${yearlySavings.toLocaleString()}/year` : null;

    return {
      name: serverPlan.name,
      price: serverPlan.monthly,
      yearlyPrice: serverPlan.yearly,
      period: isFree ? "forever" : "month",
      description: serverPlan.description,
      features: serverPlan.features,
      cta: isFree ? "Start Free" : "Start Free Trial",
      highlight: serverPlan.name === "Starter", // Highlight the standard paid plan
      savings: savings,
      discountPrice: serverPlan.discountMonthly,
      discountYearlyPrice: serverPlan.discountYearly,
      gradient: serverPlan.gradient,
      borderColor: serverPlan.border,
    };
  }); 

  return (
    <section id="pricing" ref={ref} className="relative py-24 lg:py-32 bg-[#022c22] overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Golden/Emerald Glows */}
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-900/40 blur-[100px]" />
        <div className="absolute top-[30%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#064e3b]/40 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-gradient-to-t from-[#022c22] via-[#022c22]/80 to-transparent" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
            Simple Pricing. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">No Surprises.</span>
          </h2>
          <p className="text-lg text-emerald-50 max-w-2xl mx-auto mb-10 font-light">
            Choose the perfect plan for your business stage. Cancel anytime.
          </p>

          <div className="inline-flex items-center p-1.5 bg-emerald-950/50 backdrop-blur-md rounded-full border border-emerald-800/50 shadow-inner relative">
            <button
              onClick={() => setBillingCycle(BillingCycle.Monthly)}
              className={`relative z-10 px-8 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200 ${
                billingCycle === BillingCycle.Monthly ? "text-emerald-950" : "text-emerald-100 hover:text-white"
              }`}
            >
              Monthly
              {billingCycle === BillingCycle.Monthly && (
                <motion.div
                  layoutId="billing-pill"
                  className="absolute inset-0 bg-emerald-400 rounded-full -z-10 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}
            </button>
            <button
              onClick={() => setBillingCycle(BillingCycle.Yearly)}
              className={`relative z-10 px-8 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200 ${
                billingCycle === BillingCycle.Yearly ? "text-emerald-950" : "text-emerald-100 hover:text-white"
              }`}
            >
              Yearly <span className={`text-xs font-normal ml-1 ${billingCycle === BillingCycle.Yearly ? "text-emerald-900" : "text-emerald-400"}`}>(Save 17%)</span>
              {billingCycle === BillingCycle.Yearly && (
                <motion.div
                  layoutId="billing-pill"
                  className="absolute inset-0 bg-emerald-400 rounded-full -z-10 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              billingCycle={billingCycle}
              isInView={isInView}
              index={index}
            />
          ))}
        </div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
           transition={{ duration: 0.8, delay: 0.8 }}
           className="mt-20 text-center"
        >
            <p className="text-emerald-200/80">
                Need a custom enterprise solution? <Link href="/contact" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">Contact our sales team</Link>
            </p>
        </motion.div>
      </div>
    </section>
  );
}
