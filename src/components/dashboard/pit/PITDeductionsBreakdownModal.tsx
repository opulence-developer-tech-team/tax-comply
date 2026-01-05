"use client";

import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import type { PITSummary } from "@/store/redux/pit/pit-slice";
import { formatCurrency } from "@/lib/utils";
import { TrendingDown, ShieldCheck, HeartPulse, Home, Building2 } from "lucide-react";

interface PITDeductionsBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary?: PITSummary;
  isBusiness?: boolean;
}

export function PITDeductionsBreakdownModal({ isOpen, onClose, summary, isBusiness = false }: PITDeductionsBreakdownModalProps) {
  if (!summary) return null;

  // 1. Calculate Business Expenses (The "Hidden" Figure)
  // Logic: Total Allowable Deductions contains everything EXCEPT the specific Exemption.
  // So: Business Expenses = Total Allowable Deductions - (Pension + NHIS + NHF + Rent Relief + Life Insurance + Housing Interest) + (actually, it should be whatever is left over).
  const totalStatutory = 
    (summary.totalPension || 0) + 
    (summary.totalNHIS || 0) + 
    (summary.totalNHF || 0) + 
    (summary.totalRentRelief || 0) +
    (summary.totalLifeInsurance || 0) +
    (summary.totalHousingLoanInterest || 0);

  const businessExpenses = Math.max(0, (summary.totalAllowableDeductions || 0) - totalStatutory);

  // 2. Prepare Breakdown Items (Statutory + Expenses)
  const items = [
    {
      label: "Business Expenses",
      amount: businessExpenses,
      icon: <TrendingDown className="w-5 h-5 text-rose-600" />,
      description: "Direct costs of running your business (Rent, Salaries, Supplies).",
      color: "bg-rose-50 border-rose-100 text-rose-900",
      show: isBusiness // Only show for business
    },
    {
      label: "Pension Contribution",
      amount: summary.totalPension || 0,
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      description: "8% of your income saved for retirement.",
      color: "bg-emerald-50 border-emerald-100 text-emerald-900",
      show: true
    },
    {
      label: "Health Insurance (NHIS)",
      amount: summary.totalNHIS || 0,
      icon: <HeartPulse className="w-5 h-5 text-blue-600" />,
      description: "Contributions to National Health Insurance.",
      color: "bg-blue-50 border-blue-100 text-blue-900",
      show: true
    },
    {
      label: "Housing Fund (NHF)",
      amount: summary.totalNHF || 0,
      icon: <Home className="w-5 h-5 text-amber-600" />,
      description: "2.5% contribution to National Housing Fund.",
      color: "bg-amber-50 border-amber-100 text-amber-900",
      show: true
    },
    // Rent Relief, Life Insurance, Housing Loan Interest could be added here if non-zero
    {
      label: "Rent Relief",
      amount: summary.totalRentRelief || 0,
      icon: <Home className="w-5 h-5 text-indigo-600" />,
      description: "Tax relief on rent paid (up to ₦500k).",
      color: "bg-indigo-50 border-indigo-100 text-indigo-900",
      show: true
    }
  ].filter(item => item.show && item.amount > 0); // Only show relevant items

  // Total Deductions matches Card 2 (Expenses + Statutory)
  // We do NOT include annualExemption here to ensure A - B = C math holds up visually
  const totalDeductions = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Deductions Breakdown"
      subtitle="Complete transparency on what lowers your tax bill."
      actionLabel="Back to Dashboard"
    >
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
          <p className="text-sm text-slate-600 text-center leading-relaxed">
            These are the amounts we subtracted from your <span className="font-semibold text-slate-900">Total Money In</span> to calculate your <span className="font-semibold text-blue-600">Taxable Income</span>.
          </p>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-4 p-4 rounded-xl border bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-bold text-slate-900 truncate">{item.label}</p>
                  <p className="font-bold text-slate-900">{formatCurrency(item.amount)}</p>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-slate-100 space-y-4">
           {/* Total Deductions Summary */}
           <div className="flex items-center justify-between p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
             <div>
               <p className="text-emerald-900 font-bold text-lg">Total Deductions</p>
               <p className="text-emerald-600 text-sm">Total amount removed from tax</p>
             </div>
             <p className="text-2xl font-extrabold text-emerald-700">{formatCurrency(totalDeductions)}</p>
           </div>

           {/* Separate Block for 0% Band (Exemption) */}
           <div className="flex items-start gap-4 p-4 rounded-xl border border-purple-100 bg-purple-50/50">
              <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 text-purple-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                 <p className="font-bold text-purple-900">Plus: Tax Free Allowance</p>
                 <p className="text-sm text-purple-800 mt-1">
                   In addition to the deductions above, the first <strong>{formatCurrency(summary.annualExemption || 0)}</strong> of your Taxable Income is taxed at <strong>0%</strong>.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </LuxuryGuideModal>
  );
}
