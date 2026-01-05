"use client";

import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import { Check, ArrowRight, Shield, TrendingUp, Building2, User } from "lucide-react";

interface HeroGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HeroGuideModal({ isOpen, onClose }: HeroGuideModalProps) {
  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="How TaxComply Works"
      subtitle="Simple steps to handle your taxes correctly in Nigeria."
      actionLabel="I'm Ready to Start"
      onAction={onClose}
    >
      <div className="space-y-8">
        {/* Intro */}
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
          <p className="text-emerald-800 font-medium">
            New for 2026: If you earn less than ₦800,000 a year, you pay <span className="font-bold">ZERO Personal Income Tax</span>. Small businesses (under ₦100M turnover) pay <span className="font-bold">ZERO Company Tax</span>.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-bold border border-emerald-200">
              1
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Create Your Account</h3>
              <p className="text-slate-600 mt-1">
                Tell us if you are an Individual (Salary earner) or a Company/Business. We'll set up the right tax rules for you automatically.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-bold border border-emerald-200">
              2
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Add Your Income & Expenses</h3>
              <p className="text-slate-600 mt-1">
                Log what you earn and what you spend. We automatically track invoices to prove your expenses to the tax office (NRS).
              </p>
            </div>
          </div>

          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-bold border border-emerald-200">
              3
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">See What You Owe (Or Save)</h3>
              <p className="text-slate-600 mt-1">
                We instantly calculate your VAT, WHT, and Income Tax based on the new 2025 Finance Act. No math required.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 mb-2 text-emerald-700 font-semibold">
              <User className="w-5 h-5" />
              For Individuals
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2 items-start">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                 Track salary & side hustles
              </li>
              <li className="flex gap-2 items-start">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                 Get 2026 tax relief automatically
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 mb-2 text-emerald-700 font-semibold">
              <Building2 className="w-5 h-5" />
              For Businesses
            </div>
             <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2 items-start">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                 Create strict, compliant invoices
              </li>
              <li className="flex gap-2 items-start">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                 Manage VAT & Withholding Tax
              </li>
            </ul>
          </div>
        </div>
      </div>
    </LuxuryGuideModal>
  );
}
