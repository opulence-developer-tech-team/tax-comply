"use client";

import React from "react";
import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import { ArrowRight, Building2, Landmark, Sparkles, AlertCircle } from "lucide-react";

interface WhtGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhtGuideModal({ isOpen, onClose }: WhtGuideModalProps) {
  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Unlocking WHT"
      subtitle="It’s Not Extra Tax."
      actionLabel="I Understand Now"
    >
        {/* Intro Section - The Hook */}
        <div className="bg-emerald-900 border-2 border-emerald-800 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3 border border-emerald-700/50">
              <Sparkles className="w-8 h-8 text-emerald-300" />
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              It’s Not Extra Tax.
            </h3>
            <p className="text-emerald-100 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-medium">
              Withholding Tax (WHT) is just an <span className="text-white font-bold decoration-emerald-400 decoration-2 underline underline-offset-4">advance payment</span>. 
              The government simply takes a slice of the tax <i>now</i> instead of waiting for the end of the year.
            </p>
          </div>
        </div>

        {/* The Two Sides of the Coin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Side 1: YOU PAY (The Agent) */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-300 group">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
              <Building2 className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-slate-900 mb-3 text-2xl">1. When You Pay Others</h4>
            <p className="text-emerald-700 font-bold text-sm tracking-widest uppercase mb-4">YOU ARE THE COLLECTOR</p>
            <p className="text-slate-600 text-lg leading-relaxed">
              When you pay a supplier (e.g., for rent or services), you <strong>keep back a small part</strong> (usually 5% or 10%).
            </p>
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-800 font-medium flex gap-2">
                  <span className="text-emerald-600">➜</span>
                  Action: Send that money to the Govt.
                </p>
            </div>
          </div>

          {/* Side 2: YOU GET PAID (The Beneficiary) */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-300 group">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
              <Landmark className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-slate-900 mb-3 text-2xl">2. When You Get Paid</h4>
            <p className="text-emerald-700 font-bold text-sm tracking-widest uppercase mb-4">YOU ARE THE TAXPAYER</p>
            <p className="text-slate-600 text-lg leading-relaxed">
              When a client pays you, they might keep back 5%.
              <strong>Do not panic.</strong> This counts as tax you have <i>already paid</i>.
            </p>
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-800 font-medium flex gap-2">
                  <span className="text-emerald-600">➜</span>
                  Benefit: Reduces your final tax bill.
                </p>
            </div>
          </div>

        </div>

        {/* The Example - Simple & Visual */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-8 border border-emerald-100">
          <h4 className="font-bold text-emerald-900 mb-8 flex items-center gap-3 text-xl">
            <span className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 text-sm">💡</span>
            See How It Works (Example)
          </h4>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0 relative">
              {/* Step 1 */}
              <div className="text-center w-full md:w-1/3 relative z-10">
                <div className="text-3xl font-bold text-slate-900 mb-1">₦100,000</div>
                <div className="text-slate-500 font-medium">Invoice Value</div>
              </div>

              {/* Arrow/Divider */}
              <div className="hidden md:flex flex-col items-center justify-center w-8 absolute left-1/3 -ml-4 z-0 opacity-30">
                <ArrowRight className="w-8 h-8 text-slate-400" />
              </div>

              {/* Step 2 - The Split */}
              <div className="w-full md:w-1/3 bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 text-center relative z-20 transform md:scale-110">
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">5% WHT DEDUCTED</div>
                <div className="text-4xl font-bold text-emerald-700 mb-2">₦5,000</div>
                <div className="text-slate-600 text-sm">Sent to Government</div>
              </div>

              {/* Arrow/Divider */}
              <div className="hidden md:flex flex-col items-center justify-center w-8 absolute right-1/3 -mr-4 z-0 opacity-30">
                <ArrowRight className="w-8 h-8 text-slate-400" />
              </div>

              {/* Step 3 */}
              <div className="text-center w-full md:w-1/3 relative z-10">
                <div className="text-3xl font-bold text-slate-900 mb-1">₦95,000</div>
                <div className="text-slate-500 font-medium">Cash Received</div>
              </div>
          </div>
        </div>

        {/* Deadlines Section - Practical Info */}
        <div className="bg-amber-50 rounded-3xl p-6 md:p-8 border border-amber-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-1">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h5 className="font-bold text-amber-900 text-lg mb-2">Important Deadline</h5>
              <p className="text-amber-800 text-base leading-relaxed">
                If you withhold money from someone, you must pay it to the government by the <strong>21st of the following month</strong>.
                <br /><br />
                <span className="text-sm opacity-80">Example: Tax deducted in January must be paid by February 21st.</span>
              </p>
            </div>
          </div>
        </div>
    </LuxuryGuideModal>
  );
}
