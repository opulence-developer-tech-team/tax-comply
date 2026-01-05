"use client";

import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import { Download, Calendar, ArrowRight, Building2, PersonStanding } from "lucide-react";
import { AccountType } from "@/lib/utils/account-type";

interface TaxFilingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountType: AccountType;
}

export function TaxFilingGuideModal({ isOpen, onClose, accountType }: TaxFilingGuideModalProps) {
  const isCompany = accountType === AccountType.Company;
  const isIndividual = accountType === AccountType.Individual;

  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Filing Your Tax Returns"
      subtitle="How to report your income to the government correctly."
      actionLabel="I'm Ready to File"
    >
      {/* 1. What is this? */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
          What is this page?
        </h3>
        <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-emerald-900 leading-relaxed text-base">
            This page generates **Tax Schedules and Draft Returns** based on your transactions. 
            You can download these reports to aid in your rightful declaration to the **NRS** (or State IRS).
          </p>
        </div>
      </div>

      {/* 2. Visual Process */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <Download className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">1. Download</h4>
          <p className="text-xs text-slate-500">Get your tax return from this page.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">2. Check Date</h4>
          <p className="text-xs text-slate-500">File before the deadline to avoid fines.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">3. Send</h4>
          <p className="text-xs text-slate-500">Submit to NRS (Nigeria Revenue Service) or State IRS.</p>
        </div>
      </div>

       {/* 3. Deadlines (Dynamic based on account type) */}
       <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
           Important Deadlines
        </h3>
        
        <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
            {isIndividual ? (
                <div className="p-4 flex gap-4 items-start">
                    <PersonStanding className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-slate-900 text-sm">Personal Income Tax (PIT)</p>
                        <p className="text-slate-600 text-xs mt-1">
                            Due by <strong>March 31st</strong> of the following year. 
                            <br />(e.g., File 2026 taxes by March 31, 2027)
                        </p>
                    </div>
                </div>
            ) : (
                <>
                <div className="p-4 flex gap-4 items-start">
                    <Calendar className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-slate-900 text-sm">Monthly Returns (VAT, PAYE, WHT)</p>
                        <p className="text-slate-600 text-xs mt-1">
                            Due by <strong>21st</strong> of the following month.
                        </p>
                    </div>
                </div>
                <div className="p-4 flex gap-4 items-start">
                    <Building2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-slate-900 text-sm">Company Income Tax (CIT)</p>
                        <p className="text-slate-600 text-xs mt-1">
                            Due by <strong>June 30th</strong> of the following year.
                        </p>
                    </div>
                </div>
                </>
            )}
        </div>
      </div>

    </LuxuryGuideModal>
  );
}
