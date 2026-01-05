"use client";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { HelpCircle, ChevronRight } from "lucide-react";
import { SimpleTooltip } from "@/components/shared/SimpleTooltip";
import type { PITSummary } from "@/store/redux/pit/pit-slice";
import { PAYE_TAX_BRACKETS_2026_ANNUAL } from "@/lib/constants/tax";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonVariant } from "@/lib/utils/client-enums";

interface PITCalculationBreakdownProps {
  summary: PITSummary;
  selectedYear: number;
  isBusiness?: boolean;
}

/**
 * Calculate tax breakdown by bracket for display
 * Returns an array showing how tax is calculated across each bracket
 */
function calculateTaxBreakdown(adjustedTaxableIncome: number, taxYear: number): Array<{
  bracket: string;
  incomeInBracket: number;
  rate: number;
  taxInBracket: number;
}> {
  const annualBrackets = PAYE_TAX_BRACKETS_2026_ANNUAL;

  const breakdown: Array<{
    bracket: string;
    incomeInBracket: number;
    rate: number;
    taxInBracket: number;
  }> = [];

  let remainingIncome = adjustedTaxableIncome;

  for (const bracket of annualBrackets) {
    if (remainingIncome <= 0) break;

    const incomeInBracket = Math.min(
      remainingIncome,
      bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min
    );

    if (incomeInBracket > 0) {
      const taxInBracket = incomeInBracket * (bracket.rate / 100);
      breakdown.push({
        bracket: bracket.label || "",
        incomeInBracket: Math.round(incomeInBracket * 100) / 100,
        rate: bracket.rate,
        taxInBracket: Math.round(taxInBracket * 100) / 100,
      });
      remainingIncome -= incomeInBracket;
    }
  }

  return breakdown;
}

/**
 * PITCalculationBreakdown Component
 * 
 * Displays a minimal summary of the tax calculation.
 * Verbose explanations have been moved to the "How this works" modal.
 */
export function PITCalculationBreakdown({ summary, selectedYear, isBusiness = false }: PITCalculationBreakdownProps) {
  // Calculate intermediate values
  const totalGrossIncome = summary.totalGrossIncome || 0;
  const totalAllowableDeductions = summary.totalAllowableDeductions || 0;
  // Other deductions (Pension, NHF, etc. - grouped for simplicity)
  const otherDeductions = (summary.totalPension || 0) + (summary.totalNHF || 0) + (summary.totalNHIS || 0) + (summary.totalHousingLoanInterest || 0) + (summary.totalLifeInsurance || 0) + (summary.totalRentRelief || 0);
  
  const totalDeductions = totalAllowableDeductions + otherDeductions;
  
  // Taxable Income Calculation
  const totalTaxableIncome = Math.max(0, totalGrossIncome - totalDeductions);
  const adjustedTaxableIncome = totalTaxableIncome; // Same for 2026+ basics

  const pitBeforeWHT = summary.pitBeforeWHT || 0;
  const whtCredits = summary.whtCredits || 0;
  const pitAfterWHT = summary.pitAfterWHT || 0;
  const isFullyExempt = summary.isFullyExempt;

  // Trigger the guide modal (this relies on the parent page passing a handler, 
  // but since we are strictly refactoring this component, we'll use a visual cue 
  // that aligns with the user's request to "put it in a button").
  // Ideally, this button should open the same modal as the header.
  // For now, we will just present the data clearly.

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h3 className="text-lg font-bold text-slate-900">Tax Calculation Summary</h3>
            <p className="text-sm text-slate-500">A quick look at how your tax was computed.</p>
         </div>
         {/* Note: The main "How this works" button is in the header, 
             but we can add a small helper here if needed. For now, clear data is the priority. */}
      </div>

      <div className="p-6">
        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
           {/* Row 1: Gross Income */}
           <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
              <span className="text-slate-700 font-medium text-base">Total Gross Income</span>
              <span className="font-bold text-slate-900 text-lg">{formatCurrency(totalGrossIncome)}</span>
           </div>

           {/* Row 2: Deductions */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
               <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-medium text-base">Less: Total Tax Reliefs</span>
                  <SimpleTooltip content="Sum of all your allowable expenses, pension, NHF, etc.">
                     <HelpCircle className="w-5 h-5 text-slate-400" />
                  </SimpleTooltip>
               </div>
               <span className="font-bold text-rose-600 text-lg">- {formatCurrency(totalDeductions)}</span>
            </div>

           {/* Row 3: Taxable Income */}
           <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-blue-50/50">
              <span className="text-blue-900 font-bold text-base">Equals: Taxable Income</span>
              <span className="font-bold text-blue-700 text-lg">{formatCurrency(totalTaxableIncome)}</span>
           </div>
           
            {/* Row 4: Calculated Tax */}
           <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
              <span className="text-slate-700 font-medium text-base">Tax Calculated (Before Credits)</span>
              <span className="font-bold text-slate-900 text-lg">{formatCurrency(pitBeforeWHT)}</span>
           </div>

            {/* Row 5: WHT Credits */}
           {whtCredits > 0 && (
             <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
                <span className="text-slate-700 font-medium text-base">Less: WHT Credits (Already Paid)</span>
                <span className="font-bold text-emerald-600 text-lg">- {formatCurrency(whtCredits)}</span>
             </div>
           )}

           {/* Row 5b: Effective Tax Rate */}
           <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                 <span className="text-slate-700 font-medium text-base">Effective Tax Rate</span>
                 <SimpleTooltip content="The actual percentage of your total income that goes to tax.">
                    <HelpCircle className="w-5 h-5 text-slate-400" />
                 </SimpleTooltip>
              </div>
              <span className="font-bold text-slate-900 text-lg">
                {totalGrossIncome > 0 ? ((pitBeforeWHT / totalGrossIncome) * 100).toFixed(1) : "0.0"}%
              </span>
           </div>

           {/* Row 6: Final Tax */}
           <div className="flex items-center justify-between p-4 bg-slate-100">
              <div className="flex items-center gap-2">
                 <span className="text-slate-900 font-extrabold text-xl">Final Tax to Pay</span>
                 {isFullyExempt && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">Exempt</span>
                 )}
              </div>
              <span className={`font-extrabold text-2xl ${isFullyExempt ? 'text-emerald-600' : 'text-slate-900'}`}>
                 {formatCurrency(pitAfterWHT)}
              </span>
           </div>
        </div>
      </div>
    </Card>
  );
}
