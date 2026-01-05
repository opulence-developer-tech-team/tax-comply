"use client";

import React from "react";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { motion } from "framer-motion";
import { ArrowRight, Calculator, CheckCircle2, TrendingDown, TrendingUp, Building2, Landmark } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import { NRS_VAT_TURNOVER_THRESHOLD_2026 } from "@/lib/constants/nrs-constants";

interface VatGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VatGuideModal({ isOpen, onClose }: VatGuideModalProps) {
  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="How VAT Works"
    >
      <div className="space-y-8 pb-8">
        {/* Intro Section */}
        <div className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-100">
          <h3 className="text-xl font-bold text-emerald-900 mb-2">
            Understanding Value Added Tax (VAT)
          </h3>
          <p className="text-emerald-800 leading-relaxed">
            VAT is simply a tax you help the government collect. It is not your money, and it is not an expense for your business if managed correctly. You act as a middleman between your customers and the government.
          </p>
        </div>

        {/* The Three Key Concepts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Concept 1: What you collect */}
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 mb-2 text-lg">1. Money You Collect</h4>
            <p className="text-sm text-slate-600 font-medium mb-2">(Technical term: Output VAT)</p>
            <p className="text-slate-600 text-sm leading-relaxed">
              When you sell to a customer, you add 7.5% VAT to their bill. This extra money belongs to the government, not you. You are just holding it for them.
            </p>
          </div>

          {/* Concept 2: What you pay */}
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 mb-2 text-lg">2. Money You Pay</h4>
            <p className="text-sm text-slate-600 font-medium mb-2">(Technical term: Input VAT)</p>
            <p className="text-slate-600 text-sm leading-relaxed">
              When you buy things for your business, you also pay 7.5% VAT to your suppliers. The government allows you to subtract this amount from what you owe them.
            </p>
          </div>

          {/* Concept 3: The Balance */}
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
              <Calculator className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 mb-2 text-lg">3. The Balance</h4>
            <p className="text-sm text-slate-600 font-medium mb-2">(Technical term: Net VAT)</p>
            <p className="text-slate-600 text-sm leading-relaxed">
              At the end of the month, you do a simple calculation:
              <br/>
              <span className="font-bold text-emerald-700 block mt-2">
                (Money You Collected) - (Money You Paid)
              </span>
            </p>
          </div>
        </div>

        {/* Example Flow */}
        <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-100">
          <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Example Scenario
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">1</div>
              <p className="text-slate-700">You sold goods worth ₦1,000,000 and collected <span className="font-bold text-emerald-700">₦75,000</span> VAT.</p>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="h-8 w-0.5 bg-slate-200"></div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">2</div>
              <p className="text-slate-700">You paid expenses of ₦500,000 and paid <span className="font-bold text-emerald-700">₦37,500</span> VAT to suppliers.</p>
            </div>

            <div className="flex items-center justify-center">
              <div className="h-8 w-0.5 bg-slate-200"></div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border-2 border-emerald-100">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shrink-0">3</div>
              <div>
                <p className="text-slate-900 font-medium">You only pay the difference to the government:</p>
                <p className="text-emerald-700 font-bold text-lg mt-1">
                  ₦75,000 - ₦37,500 = ₦37,500
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
            <h5 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Your Responsibility
            </h5>
            <ul className="space-y-2">
              <li className="flex gap-2 text-sm text-emerald-800">
                <span className="font-bold">•</span>
                Create invoices for all sales (we add VAT automatically).
              </li>
              <li className="flex gap-2 text-sm text-emerald-800">
                <span className="font-bold">•</span>
                Record all business expenses (so we can subtract VAT you paid).
              </li>
              <li className="flex gap-2 text-sm text-emerald-800">
                <span className="font-bold">•</span>
                Pay the balance to the government by the 21st of the next month.
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
            <h5 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              Exemption Note
            </h5>
            <p className="text-sm text-blue-800 leading-relaxed">
              If your business makes less than <strong>{formatCurrency(NRS_VAT_TURNOVER_THRESHOLD_2026)}</strong> a year, you are <strong>exempt from charging VAT</strong>. However, if you are already registered or want to be professional, you should file your returns (even if zero).
            </p>
            <p className="text-xs text-blue-600 mt-2 italic">
              *Based on Nigeria Tax Act 2025.
            </p>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={onClose}
            className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            I Understand
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </FullScreenModal>
  );
}
