"use client";

import React from "react";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { ArrowRight, CheckCircle2, Building2, TrendingUp, Calendar } from "lucide-react";

interface CitGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CitGuideModal({ isOpen, onClose }: CitGuideModalProps) {
  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="How Company Income Tax Works"
    >
      <div className="space-y-8 pb-8 max-w-4xl mx-auto">
        {/* Intro Section - Friendly & Reassuring */}
        <div className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-100 text-center">
          <h3 className="text-xl md:text-2xl font-bold text-emerald-900 mb-3">
            Simple Rules. No Complicated Jargon.
          </h3>
          <p className="text-lg text-emerald-800 leading-relaxed font-medium">
            We've simplified the new Nigeria Tax Act 2025 for you. <br className="hidden md:block"/>
            There are now only two categories of companies. Find yours below.
          </p>
        </div>

        {/* The Two Categories - Side by Side on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Small Company Card */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border-2 border-emerald-100 shadow-xl shadow-emerald-50/50 relative overflow-hidden group hover:border-emerald-300 transition-all">
             <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-xs font-bold px-4 py-2 rounded-bl-xl tracking-wider uppercase">
              Most Common
            </div>
            
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform duration-300">
              <Building2 className="w-7 h-7" />
            </div>
            
            <h4 className="font-bold text-slate-900 mb-2 text-2xl">Small Company</h4>
            <p className="text-base text-slate-500 font-medium mb-6">You made ₦50 Million or less</p>
            
            <div className="bg-emerald-50 rounded-xl p-4 mb-6 border border-emerald-100">
              <p className="text-sm font-bold text-emerald-800 uppercase tracking-wide mb-1">Your Tax Rate</p>
              <div className="text-4xl font-extrabold text-emerald-600">0% <span className="text-lg text-slate-400 font-normal ml-1">Zero</span></div>
            </div>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-600 font-medium text-lg">You pay <strong className="text-slate-900">NO Company Tax</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-600 font-medium text-lg">You pay <strong className="text-slate-900">NO Development Levy</strong>.</span>
              </li>
            </ul>
          </div>

          {/* Large Company Card */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border-2 border-slate-100 shadow-sm relative overflow-hidden group hover:border-slate-200 transition-all">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 text-slate-600 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-7 h-7" />
            </div>
            
            <h4 className="font-bold text-slate-900 mb-2 text-2xl">Large Company</h4>
            <p className="text-base text-slate-500 font-medium mb-6">You made over ₦50 Million</p>
             
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-1">Your Tax Rate</p>
              <div className="flex items-baseline gap-2">
                 <div className="text-4xl font-extrabold text-slate-800">30%</div>
                 <span className="text-base text-slate-500 font-medium">+ 4% Levy</span>
              </div>
            </div>

            <p className="text-slate-600 text-lg leading-relaxed">
              If your business is growing fast and earns above ₦50m, you pay the standard global rate.
            </p>
          </div>
        </div>

        {/* Deadline Information - Crucial */}
         <div className="bg-amber-50 rounded-2xl p-6 md:p-8 border-2 border-amber-100">
          <div className="flex flex-col md:flex-row gap-6 items-center">
             <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm shrink-0">
                <Calendar className="w-8 h-8 text-amber-500" />
             </div>
             <div className="text-center md:text-left">
                <h4 className="font-bold text-amber-900 text-xl mb-2">
                  One Important Rule
                </h4>
                <p className="text-amber-800 text-lg leading-relaxed">
                  Even if you are a Small Company and pay <strong>0% tax</strong>, you <strong className="underline decoration-2 decoration-amber-300 underline-offset-2">MUST still file</strong> your tax returns by <strong>June 30th</strong> every year.
                </p>
             </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={onClose}
            className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-emerald-200 hover:-translate-y-1 active:translate-y-0"
          >
            I Understand
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </FullScreenModal>
  );
}
