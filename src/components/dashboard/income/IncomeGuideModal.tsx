"use client";

import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import { Wallet, TrendingUp, Building2, Briefcase } from "lucide-react";

interface IncomeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IncomeGuideModal({ isOpen, onClose }: IncomeGuideModalProps) {
  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="What Counts as Income?"
      subtitle="Track what you earn so we can calculate your tax correctly."
      actionLabel="I Understand"
    >
      {/* 1. What is this page? */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
          Why track this?
        </h3>
        <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-emerald-900 leading-relaxed text-base">
            Your tax calculation starts with your <strong>Gross Income</strong> (total money earned). 
            If you don't track it here, we assume you earned nothing, which might be incorrect.
          </p>
        </div>
      </div>

      {/* 2. Visual Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center hover:border-emerald-200 transition-colors">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <Briefcase className="w-5 h-5 text-purple-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">Salary & Wages</h4>
          <p className="text-xs text-slate-500">Money from your employer.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">Business Profit</h4>
          <p className="text-xs text-slate-500">Earnings from side hustles.</p>
        </div>
      </div>

       {/* 3. Why it matters */}
       <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
          What happens next?
        </h3>
        
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex gap-4 items-start">
            <Wallet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
                <p className="font-bold text-slate-900 text-sm">We Calculate Your PIT</p>
                <p className="text-slate-600 text-xs mt-1">
                    Once you add your income, we automatically calculate your Pay-As-You-Earn (PIT) tax liability.
                </p>
            </div>
        </div>
      </div>

    </LuxuryGuideModal>
  );
}
