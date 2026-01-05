"use client";

import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import { Receipt, CheckCircle2, ShieldCheck } from "lucide-react";

interface RemittanceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RemittanceGuideModal({ isOpen, onClose }: RemittanceGuideModalProps) {
  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="What are Tax Payments?"
      subtitle="How keeping receipts keeps you safe."
      actionLabel="I Understand"
    >
      {/* 1. What is this page? */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
          Why record payments?
        </h3>
        <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-emerald-900 leading-relaxed text-base">
            When you pay tax to the government, they give you a receipt. 
            <strong>Recording it here</strong> proves you've paid, so you don't get charged twice or fined.
          </p>
        </div>
      </div>

      {/* 2. Visual Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center hover:border-emerald-200 transition-colors">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <Receipt className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">Bank Transfers</h4>
          <p className="text-xs text-slate-500">Payments made directly to IRS.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">PAYE Deduction</h4>
          <p className="text-xs text-slate-500">Tax your employer already took.</p>
        </div>
      </div>

       {/* 3. Why it matters */}
       <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
          The Result?
        </h3>
        
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex gap-4 items-start">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
                <p className="font-bold text-slate-900 text-sm">100% Tax Clearance</p>
                <p className="text-slate-600 text-xs mt-1">
                    Matching your payments to your calculated tax is how you get your Tax Clearance Certificate.
                </p>
            </div>
        </div>
      </div>

    </LuxuryGuideModal>
  );
}
