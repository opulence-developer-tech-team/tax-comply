import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Building2, ShieldCheck, HelpCircle, Percent } from "lucide-react";
import { SimpleTooltip } from "@/components/shared/SimpleTooltip";
import type { PITSummary } from "@/store/redux/pit/pit-slice";
import Link from "next/link";
import { TaxClassification } from "@/lib/utils/tax-classification";
import { useState } from "react";
import { PITDeductionsBreakdownModal } from "./PITDeductionsBreakdownModal";
import { PitGuideModal } from "../guide-modals/PitGuideModal";

interface PITSummaryCardsProps {
  summary: PITSummary;
  isBusiness?: boolean;
}

/**
 * PITSummaryCards Component
 * 
 * Displays key PIT metrics in a "Luxury" grid layout matching the CIT page.
 * - Card 1: Total Money In (Revenue) - Emerald
 * - Card 2: Effective Tax Rate - Blue (New)
 * - Card 3: Tax Deductions (Expenses) - Rose
 * - Card 4: Taxable Income (Profit) - Emerald-800
 * - Card 5: Total Tax Owe (Liability) - Amber
 * - Card 6: Payment Status (Split Card) - Teal/Rose
 */
export function PITSummaryCards({ summary, isBusiness = false }: PITSummaryCardsProps) {
  const pitPending = summary.pitPending || 0;
  const pitRemitted = summary.pitRemitted || 0;
  const whtCredits = summary.whtCredits || 0;
  const totalPaid = pitRemitted + whtCredits;
  
  const isFullyExempt = summary.isFullyExempt === true;
  const exemptionReason = summary.exemptionReason;
  
  const [isDeductionsModalOpen, setIsDeductionsModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Calculate ACTUAL total deductions (Business Expenses + Statutory Deductions)
  // We do NOT include annualExemption (800k) here as it's a 0% Tax Band, not a deduction.
  const statutoryDeductions = 
    (summary.totalPension || 0) + 
    (summary.totalNHIS || 0) + 
    (summary.totalNHF || 0) + 
    (summary.totalRentRelief || 0) +
    (summary.totalLifeInsurance || 0) +
    (summary.totalHousingLoanInterest || 0);

  const businessExpenses = summary.totalAllowableDeductions || 0;
  const totalActualDeductions = businessExpenses + statutoryDeductions;

  // Taxable Income is already net of deductions from the backend
  const taxableIncome = summary.totalTaxableIncome || 0;

  // Calculate Effective Tax Rate (Total Tax Liability / Gross Income)
  // Use pitBeforeWHT as it represents the total tax charged before any payments/credits
  const effectiveTaxRate = (summary.totalGrossIncome || 0) > 0 
    ? ((summary.pitBeforeWHT || 0) / summary.totalGrossIncome) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Card 1: Total Money In (Gross Income) */}
      <Card className="p-6 hover:shadow-md transition-shadow duration-200 border-emerald-100 bg-white group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
           <TrendingUp className="w-24 h-24 text-emerald-600" aria-hidden="true" />
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Total Money In</p>
              <SimpleTooltip 
                content={
                  <div>
                    <p className="font-semibold mb-1">What is this?</p>
                    <p className="mb-2">
                       {isBusiness 
                        ? "Total revenue from your business plus any personal salary."
                        : "All the money you earned this year before subtracting anything."
                       }
                    </p>
                    <p className="mb-1"><strong>Includes:</strong> {isBusiness ? "Business Revenue + Personal Income" : "Salary + Other Income"}.</p>
                  </div>
                }
              >
                <HelpCircle className="w-3 h-3 text-emerald-400 cursor-help" />
              </SimpleTooltip>
            </div>
            <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
              {formatCurrency(summary.totalGrossIncome || 0)}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
             <Link 
               href={isBusiness ? "/dashboard/business/invoices" : "/dashboard/income"}
               className="text-xs text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1 underline decoration-dashed underline-offset-4"
             >
               {(summary.totalGrossIncome || 0) === 0 ? "Add your income" : "View details"}
             </Link>
             <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" aria-hidden="true" />
             </div>
          </div>
        </div>
      </Card>

      {/* Card 3: Tax Deductions/Reliefs */}
      <Card className="p-6 hover:shadow-md transition-shadow duration-200 border-rose-100 bg-white group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
           <TrendingDown className="w-24 h-24 text-rose-600" aria-hidden="true" />
        </div>
         <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">{isBusiness ? "Tax Deductions" : "Tax Reliefs"}</p>
              <SimpleTooltip 
                content={
                  <div>
                    <p className="font-semibold mb-1">What is this?</p>
                    <p className="mb-2">
                      {isBusiness 
                        ? "Expenses and statutory reliefs that lower your tax bill." 
                        : "Statutory reliefs that lower your tax bill."
                      }
                    </p>
                    <p className="mb-1"><strong>Includes:</strong> {isBusiness ? "Business Expenses, Pension, NHIS, Rent Relief" : "Pension, NHIS, Rent Relief, N800k Exempt"}.</p>
                  </div>
                }
              >
                <HelpCircle className="w-3 h-3 text-rose-400 cursor-help" />
              </SimpleTooltip>
            </div>
            <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
              {formatCurrency(totalActualDeductions)}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
             <button
               onClick={() => setIsDeductionsModalOpen(true)}
               className="text-xs text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 underline decoration-dashed underline-offset-4 bg-transparent border-none p-0 cursor-pointer"
             >
               View breakdown
             </button>
             <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-600" aria-hidden="true" />
             </div>
          </div>
        </div>
      </Card>

      {/* Card 4: Taxable Income (Net) */}
      <Card className="p-6 hover:shadow-md transition-shadow duration-200 border-emerald-100 bg-white group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
           <Wallet className="w-24 h-24 text-emerald-800" aria-hidden="true" />
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
             <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Taxable Income</p>
              <SimpleTooltip 
                content={
                  <div>
                    <p className="font-semibold mb-1">What is this?</p>
                    <p className="mb-2">The amount you are actually taxed on.</p>
                    <p className="mb-1"><strong>Formula:</strong> Money In - Deductions.</p>
                  </div>
                }
              >
                <HelpCircle className="w-3 h-3 text-emerald-600 cursor-help" />
              </SimpleTooltip>
            </div>
            <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
              {formatCurrency(taxableIncome)}
            </p>
          </div>
           <div className="mt-4 flex items-center justify-between">
             <span className="text-xs text-slate-500 font-medium">Net Amount</span>
             <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-800" aria-hidden="true" />
             </div>
          </div>
        </div>
      </Card>

      {/* Card 5: Tax You Owe (Liability) */}
      <Card className="p-6 hover:shadow-md transition-shadow duration-200 border-amber-100 bg-white group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
           <Building2 className="w-24 h-24 text-amber-600" aria-hidden="true" />
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Total Tax Due</p>
               {!isFullyExempt && (
                   <span className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-700 border border-blue-100">
                      {effectiveTaxRate.toFixed(1)}% Rate
                      <SimpleTooltip content="Your Effective Tax Rate (Total Tax / Total Income). This is an average result, NOT the rate used for calculation.">
                        <HelpCircle className="w-3 h-3 text-blue-400 cursor-help" />
                      </SimpleTooltip>
                   </span>
               )}
               {isFullyExempt && (
                 <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">
                   Exempt
                 </span>
               )}
            </div>
            <p className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight break-words">
              {formatCurrency(summary.pitAfterWHT || 0)}
            </p>
            
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isFullyExempt ? "You don't owe anything!" : "Amount to pay to NRS"}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
             <button
               onClick={() => setIsGuideModalOpen(true)}
               className="text-xs text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1 underline decoration-dashed underline-offset-4 bg-transparent border-none p-0 cursor-pointer"
             >
               How is this calculated?
             </button>
             <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center">
                <Building2 className="w-4 h-4 text-amber-600" aria-hidden="true" />
             </div>
          </div>
        </div>
      </Card>

      {/* Card 6: Payment Status (Spans remaining columns) */}
      <Card className="p-6 hover:shadow-md transition-shadow duration-200 border-emerald-100 bg-white group relative overflow-hidden md:col-span-2 lg:col-span-2">
         <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
           <ShieldCheck className="w-24 h-24 text-emerald-600" aria-hidden="true" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row h-full gap-4 md:gap-8 items-center">
           {/* Section A: Paid */}
           <div className="flex-1 w-full md:w-auto pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-slate-100 md:h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Amount Paid</p>
              </div>
              <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
                {formatCurrency(totalPaid)}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Remitted to State
              </p>
           </div>
           
           {/* Section B: Pending */}
           <div className="flex-1 w-full md:w-auto flex flex-col justify-center">
               <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">Left To Pay</p>
               <p className="text-2xl lg:text-3xl font-extrabold text-rose-600 tracking-tight break-words">
                 {formatCurrency(pitPending)}
               </p>
               <p className="text-xs text-slate-500 font-medium mt-1">
                 Outstanding Liability
               </p>
           </div>
        </div>
      </Card>

      <PITDeductionsBreakdownModal 
        isOpen={isDeductionsModalOpen}
        onClose={() => setIsDeductionsModalOpen(false)}
        summary={summary}
        isBusiness={isBusiness}
      />

      <PitGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        summary={summary}
        isBusiness={isBusiness}
      />
    </div>
  );
}

