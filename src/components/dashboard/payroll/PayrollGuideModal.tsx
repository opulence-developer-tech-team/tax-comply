"use client";

import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import { Check, ArrowRight, Wallet, Building2, Users } from "lucide-react";

interface PayrollGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PayrollGuideModal({ isOpen, onClose }: PayrollGuideModalProps) {
  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Salaries & Tax (Payroll)"
      subtitle="How to pay your staff correctly under Nigeria Tax Act 2025"
      actionLabel="I Understand Now"
    >
      {/* Core Concept */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
            The Simple Rule
        </h3>
        <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-emerald-900 leading-relaxed text-base">
            Before you pay your staff their salary, the law says you must subtract their tax (PAYE) first. 
            You pay the staff the remaining amount (Net Salary) and send the tax to the government.
          </p>
        </div>
      </div>

      {/* Visual Breakdown */}
      <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
            How It Works (Example)
        </h3>
        
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          {/* Step A */}
          <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto md:mx-0 mb-3">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Salary</p>
            <p className="font-bold text-slate-900 text-lg">₦200,000</p>
            <p className="text-xs text-slate-500 mt-1">Gross Pay</p>
          </div>

          <ArrowRight className="text-slate-300 w-6 h-6 rotate-90 md:rotate-0 shrink-0" />

          {/* Step B */}
          <div className="flex-1 bg-red-50 p-4 rounded-xl border border-red-100 w-full">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto md:mx-0 mb-3">
              <Building2 className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Less Tax (PAYE)</p>
            <p className="font-bold text-red-700 text-lg">- ₦15,000</p>
            <p className="text-xs text-red-500 mt-1">To Government</p>
          </div>

          <ArrowRight className="text-slate-300 w-6 h-6 rotate-90 md:rotate-0 shrink-0" />

          {/* Step C */}
          <div className="flex-1 bg-emerald-50 p-4 rounded-xl border border-emerald-200 w-full shadow-sm">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto md:mx-0 mb-3">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Staff Get</p>
            <p className="font-bold text-emerald-700 text-lg">= ₦185,000</p>
            <p className="text-xs text-emerald-500 mt-1">Take-Home Pay</p>
          </div>
        </div>
      </div>

        {/* What We Do */}
        <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">3</span>
            We Do The Math For You
        </h3>
        <ul className="space-y-3">
          <li className="flex gap-3 items-start">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-slate-600 text-sm">
              We automatically calculate the correct tax for each staff member based on NTA 2025 rates.
            </p>
          </li>
          <li className="flex gap-3 items-start">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-slate-600 text-sm">
              We apply the ₦800,000 annual exemption (tax-free allowance) automatically.
            </p>
          </li>
          <li className="flex gap-3 items-start">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-slate-600 text-sm">
              We generate a simple schedule you can use to pay your staff.
            </p>
          </li>
        </ul>
      </div>
    </LuxuryGuideModal>
  );
}
