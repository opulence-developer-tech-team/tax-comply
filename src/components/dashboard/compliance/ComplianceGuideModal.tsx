"use client";

import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import { ShieldCheck, AlertTriangle, Activity, TrendingUp } from "lucide-react";

interface ComplianceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComplianceGuideModal({ isOpen, onClose }: ComplianceGuideModalProps) {
  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Understanding Your Tax Health"
      subtitle="How we keep your business safe from government fines."
      actionLabel="I Understand My Score"
    >
      {/* 1. What is this page? */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
          What is this Score?
        </h3>
        <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-emerald-900 leading-relaxed text-base">
            Think of this like a <strong>health check</strong> for your business tax. 
            We check if you have your TIN, if you've filed your returns, and if you're up to date.
          </p>
        </div>
      </div>

      {/* 2. Visual Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-emerald-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">Safe (80-100%)</h4>
          <p className="text-xs text-slate-500">You are safe. No fines expected.</p>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-amber-100">
            <Activity className="w-5 h-5 text-amber-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">At Risk (50-79%)</h4>
          <p className="text-xs text-slate-500">You missed a few things.</p>
        </div>

        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">Danger (0-49%)</h4>
          <p className="text-xs text-slate-500">High risk of fines. Act now!</p>
        </div>
      </div>

       {/* 3. Why it matters */}
       <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
          Why does this matter?
        </h3>
        
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex gap-4 items-start">
            <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
                <p className="font-bold text-slate-900 text-sm">Avoid Surprise Costs</p>
                <p className="text-slate-600 text-xs mt-1">
                    Government fines for late filing can be expensive. 
                    Checking this page once a month helps you catch issues before they happen.
                </p>
            </div>
        </div>
      </div>

    </LuxuryGuideModal>
  );
}
