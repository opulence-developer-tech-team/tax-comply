"use client";

import { Briefcase, PiggyBank, Heart, Home, ShieldCheck } from "lucide-react";
import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";

interface EmploymentDeductionsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmploymentDeductionsGuideModal({ isOpen, onClose }: EmploymentDeductionsGuideModalProps) {
  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Do You Have a Side Job?"
      subtitle="Understanding Employment Deductions for Sole Proprietors."
    >
      <div className="space-y-8">
        
        {/* Intro */}
        <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
           <div className="flex gap-4">
             <div className="shrink-0 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-emerald-700" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-emerald-900 mb-2">Why is this here?</h3>
               <p className="text-emerald-800 text-sm leading-relaxed">
                 Many business owners also have a <strong>9-5 job</strong> or are employed by another company. If that's you, the law allows you to lower your tax bill using deductions from that salary.
               </p>
             </div>
           </div>
        </div>

        {/* What counts? */}
        <div>
           <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
             <ShieldCheck className="w-6 h-6 text-emerald-600" />
             The "Big 3" Tax Reducers
           </h3>
           <p className="text-slate-600 text-sm mb-6">
             If you pay any of these at your job, tell us! We will subtract them from your income so you pay less tax.
           </p>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pension */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                 <div className="flex items-center gap-2 mb-2">
                    <PiggyBank className="w-5 h-5 text-purple-600" />
                    <span className="font-bold text-purple-900">Pension</span>
                 </div>
                 <p className="text-xs text-purple-800 leading-relaxed">
                    Money set aside for your retirement. The government doesn't tax this because it's for your future.
                 </p>
              </div>

              {/* NHIS */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                 <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-emerald-900">NHIS (Health)</span>
                 </div>
                 <p className="text-xs text-emerald-800 leading-relaxed">
                    Payments for National Health Insurance. Staying healthy shouldn't increase your tax bill!
                 </p>
              </div>

              {/* NHF */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                 <div className="flex items-center gap-2 mb-2">
                    <Home className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-blue-900">NHF (Housing)</span>
                 </div>
                 <p className="text-xs text-blue-800 leading-relaxed">
                    Contributions to the National Housing Fund.
                 </p>
              </div>
           </div>
        </div>

        {/* Other Reliefs */}
        <div className="pt-6 border-t border-slate-100">
           <h3 className="text-lg font-bold text-slate-900 mb-3">Other Ways to Save</h3>
           <ul className="space-y-3 text-sm text-slate-600">
             <li className="flex gap-2">
               <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></span>
               <span><strong>Life Insurance:</strong> If you pay for life insurance, that amount is tax-free.</span>
             </li>
             <li className="flex gap-2">
               <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></span>
               <span><strong>Housing Loan Interest:</strong> Interest you paid on a loan to buy or build your *personal* house (specifically owner-occupied).</span>
             </li>
           </ul>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl text-center">
            <p className="text-slate-500 text-xs italic">
              "If you don't have a separate job, you can usually ignore this section."
            </p>
        </div>

      </div>
    </LuxuryGuideModal>
  );
}
