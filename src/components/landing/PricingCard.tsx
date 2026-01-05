"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { Check } from "lucide-react";

export interface PricingPlan {
  name: string;
  price: number | null;
  yearlyPrice?: number | null;
  discountPrice?: number | null; // Monthly anchor price
  discountYearlyPrice?: number | null; // Yearly anchor price
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
  savings: string | null;
  gradient: string;
  borderColor: string;
  isCustom?: boolean;
}

import { BillingCycle } from "@/lib/utils/client-enums";

interface PricingCardProps {
  plan: PricingPlan;
  billingCycle: BillingCycle;
  isInView: boolean;
  index: number;
}

export function PricingCard({ plan, billingCycle, isInView, index }: PricingCardProps) {
  const displayPrice = billingCycle === "yearly" && plan.yearlyPrice !== null && plan.yearlyPrice !== undefined
    ? plan.yearlyPrice 
    : plan.price;
    
  const anchorPrice = billingCycle === "yearly" 
    ? plan.discountYearlyPrice 
    : plan.discountPrice;

  const displayPeriod = billingCycle === "yearly" ? "year" : plan.period;
  const isCustom = plan.isCustom || plan.price === null;
  const isFree = plan.name === "Free";

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.95 }}
      transition={{ 
        duration: 0.6, 
        delay: 0.6 + index * 0.1,
        type: "spring",
        stiffness: 100
      }}
      className={`relative h-full ${plan.highlight ? "lg:-mt-4 lg:mb-4 z-10" : "z-0"}`}
    >
      <div
        className={`h-full p-8 rounded-2xl transition-all duration-300 relative flex flex-col group
          ${plan.highlight 
            ? "bg-gradient-to-b from-emerald-800 to-[#022c22] border border-emerald-400/30 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)]" 
            : "bg-[#064e3b]/20 backdrop-blur-md border border-emerald-800/30 shadow-lg hover:bg-[#064e3b]/30 hover:border-emerald-700/50"
          }
        `}
      >
        {plan.highlight && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400 blur-lg opacity-40 rounded-full" />
              <div className="relative px-6 py-1.5 bg-gradient-to-r from-emerald-400 to-teal-400 text-[#022c22] text-xs font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                 Most Popular
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h3 className={`text-xl font-bold mb-2 ${plan.highlight ? "text-white" : "text-white"}`}>
            {plan.name}
          </h3>
          {/* <p className={`text-sm h-10 leading-snug ${plan.highlight ? "text-emerald-50" : "text-emerald-50/80"}`}>{plan.description}</p> */}
        </div>

        <div className="mb-8">
          {isCustom ? (
            <div className="flex flex-col h-[60px] justify-center">
              <div className="text-3xl font-extrabold text-white">Custom</div>
              <div className="text-sm text-emerald-100">Contact us for pricing</div>
            </div>
          ) : (
            <div className="h-[60px]">
              {/* Strikethrough Anchor Price */}
              {anchorPrice && anchorPrice > (displayPrice || 0) && (
                <div className="text-emerald-200/50 text-base line-through font-medium mb-1">
                  ₦{anchorPrice.toLocaleString()}
                </div>
              )}
              
              <div className="flex items-baseline gap-x-1">
                <span className={`text-2xl font-bold ${plan.highlight ? "text-emerald-300" : "text-emerald-400"}`}>{isFree ? "" : "₦"}</span>
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  {isFree ? "Free" : (displayPrice !== null && displayPrice !== undefined ? displayPrice.toLocaleString() : "0")}
                </span>
                {!isFree && plan.price !== null && plan.price > 0 && (
                  <span className="text-emerald-100/60 font-medium">/{displayPeriod}</span>
                )}
              </div>
              
              {plan.savings && billingCycle === "yearly" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-900/50 border border-emerald-700/50"
                >
                  <span className="text-xs text-emerald-300 font-bold">{plan.savings}</span>
                </motion.div>
              )}
            </div>
          )}
        </div>

        <div className={`flex-grow border-t pt-6 mb-8 ${plan.highlight ? "border-emerald-700/30" : "border-emerald-800/30"}`}>
          <ul className="space-y-4">
            {plan.features.map((feature, featureIndex) => (
              <motion.li
                key={featureIndex}
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: 0.3, delay: 0.8 + index * 0.1 + featureIndex * 0.05 }}
                className="flex items-start group/item"
              >
                <div className={`mt-0.5 mr-3 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  plan.highlight ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-900/30 text-emerald-400 group-hover/item:text-emerald-300 transition-colors"
                }`}>
                  <Check className="w-3 h-3" strokeWidth={3} />
                </div>
                <span className={`text-sm leading-relaxed ${plan.highlight ? "text-emerald-50" : "text-emerald-100/90"}`}>{feature}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-auto"
        >
          <Link href={plan.name === "Custom" ? "#contact" : "/sign-up"} className="block">
            <Button
              variant={plan.highlight ? ButtonVariant.Primary : ButtonVariant.Outline}
              className={`w-full py-6 font-bold rounded-xl text-base transition-all duration-300 shadow-sm ${
                plan.highlight
                  ? "bg-emerald-400 hover:bg-emerald-300 text-[#022c22] shadow-[0_0_20px_rgba(52,211,153,0.3)] border-0 ring-0"
                  : plan.name === "Custom"
                  ? "bg-white text-slate-900 hover:bg-slate-100"
                  : "bg-transparent border border-emerald-600 text-white hover:bg-emerald-900/50 hover:border-emerald-400"
              }`}
            >
              {plan.cta}
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}




















