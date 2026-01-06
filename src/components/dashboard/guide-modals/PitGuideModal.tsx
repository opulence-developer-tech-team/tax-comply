"use client";

import { Wallet, CalendarClock, Calculator, CheckCircle2, HelpCircle } from "lucide-react";
import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import { SimpleTooltip } from "@/components/shared/SimpleTooltip";
import type { PITSummary } from "@/store/redux/pit/pit-slice";
import { formatCurrency } from "@/lib/utils";

interface PitGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary?: PITSummary;
  isBusiness?: boolean;
}

export function PitGuideModal({ isOpen, onClose, summary, isBusiness = false }: PitGuideModalProps) {
  // Data for calculation example
  const moneyIn = summary?.totalGrossIncome || 0;
  
  // CRITICAL: Sum ALL deductions to match the breakdown logic and backend calculation
  // (Pension, NHF, NHIS, Rent Relief, etc.)
  const statutoryDeductions = (summary?.totalPension || 0) + 
                            (summary?.totalNHF || 0) + 
                            (summary?.totalNHIS || 0) + 
                            (summary?.totalHousingLoanInterest || 0) + 
                            (summary?.totalLifeInsurance || 0) + 
                            (summary?.totalRentRelief || 0);
                            
  const taxReliefs = (summary?.totalAllowableDeductions || 0) + statutoryDeductions;
  
  // Taxable Income = Money In - All Reliefs
  // The 800k is a 0% Tax Band applied TO this Taxable Income, NOT a deduction FROM it.
  const taxableIncome = Math.max(0, moneyIn - taxReliefs);

  // Calculate tax per band for transparent display in footer
  const band1Obj = { limit: 800000, rate: 0 };
  const band2Obj = { limit: 2200000, rate: 0.15 };
  const band3Obj = { limit: 9000000, rate: 0.18 };
  const band4Obj = { limit: 13000000, rate: 0.21 };
  const band5Obj = { limit: 25000000, rate: 0.23 };
  const band6Obj = { limit: Infinity, rate: 0.25 };

  const taxableBand1 = Math.min(taxableIncome, band1Obj.limit);
  const taxBand1 = taxableBand1 * band1Obj.rate;

  const taxableBand2 = Math.min(Math.max(0, taxableIncome - 800000), band2Obj.limit);
  const taxBand2 = taxableBand2 * band2Obj.rate;

  const taxableBand3 = Math.min(Math.max(0, taxableIncome - 3000000), band3Obj.limit);
  const taxBand3 = taxableBand3 * band3Obj.rate;

  const taxableBand4 = Math.min(Math.max(0, taxableIncome - 12000000), band4Obj.limit);
  const taxBand4 = taxableBand4 * band4Obj.rate;

  const taxableBand5 = Math.min(Math.max(0, taxableIncome - 25000000), band5Obj.limit);
  const taxBand5 = taxableBand5 * band5Obj.rate;

  const taxableBand6 = Math.max(0, taxableIncome - 50000000);
  const taxBand6 = taxableBand6 * band6Obj.rate;

  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title={isBusiness ? "Understanding Your Personal Tax (Sole Proprietor)" : "Understanding Your Personal Tax"}
      subtitle="Based on the Nigeria Tax Act 2025 — Effective Jan 1, 2026."
    >
      <div className="space-y-8">
        {/* NEW: What is PIT? Section (Replaces Banner) */}
        <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
           <h3 className="text-lg font-bold text-emerald-900 mb-2 flex items-center gap-2">
             <Wallet className="w-5 h-5 text-emerald-600" />
             What is Personal Income Tax (PIT)?
           </h3>
           <div className="text-emerald-800 text-sm leading-relaxed space-y-3">
             <p>
               <strong>Simple Explanation:</strong> PIT is a small portion of the money you earn (from business or salary) that you pay to the State Government to support public services.
             </p>
             <p>
               <strong>The Good News:</strong> You don't pay tax on <em>everything</em>. We strictly follow the <strong>Nigeria Tax Act 2025</strong> to deduct business costs and personal reliefs first, so you only pay what is fair.
             </p>
           </div>
        </div>

        <div className="flex gap-4">
           {/* ... existing icons ... */}
           <div className="shrink-0 w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
             <Calculator className="w-6 h-6 text-blue-600" />
           </div>
           <div>
             <h3 className="text-lg font-bold text-slate-900 mb-1">We Do The Math For You</h3>
             <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                We automatically calculate your tax using your <strong>{isBusiness ? "net business profit" : "total income"}</strong>. We subtract all allowed "reliefs" (like Pension and Rent adjustments) so your tax bill is as low as legally possible.
             </p>
           </div>
        </div>

        <div className="flex gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 shadow-sm">
            <CalendarClock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">When Do You Pay?</h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              You must file and pay your returns by <strong>March 31st</strong> of the following year (e.g., pay 2026 tax by March 2027). Paying on time avoids stressful penalties.
            </p>
          </div>
        </div>

        {/* Calculation Deep Dive Section (Existing but refined) */}
        <div className="mt-8 pt-8 border-t border-slate-100">
           <h3 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-2">
             <Calculator className="w-6 h-6 text-emerald-600" />
             How We Calculate Your Tax
           </h3>
           
           <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
             {/* Step 1 */}
             <div className="p-5 border-b border-slate-100">
               <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Step 1: Money In</p>
               <div className="flex items-center justify-between mb-2">
                 <span className="font-bold text-slate-900 text-base md:text-lg">{isBusiness ? "Total Money In (Gross)" : "Total Income"}</span>
                 <span className="font-mono font-bold text-slate-900 text-base md:text-lg">{formatCurrency(moneyIn)}</span>
               </div>
               <p className="text-sm text-slate-500 leading-relaxed">
                 {isBusiness
                   ? "Every kobo your business received from sales and invoices."
                   : "Total salary and earnings before checking expenses."
                 }
               </p>
             </div>

             {/* Step 2 */}
             <div className="p-5 border-b border-slate-100 bg-rose-50/30">
               <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">Step 2: Less Deductions</p>
               <div className="flex items-center justify-between mb-2">
                 <span className="font-bold text-slate-900 text-base md:text-lg">{isBusiness ? "Minus: Business Costs & Reliefs" : "Minus: Reliefs"}</span>
                 <span className="font-mono font-bold text-rose-600 text-base md:text-lg">- {formatCurrency(taxReliefs)}</span>
               </div>
               <p className="text-sm text-slate-500 leading-relaxed mb-2">
                  We subtract amounts the government says are "Tax Free":
               </p>
               <ul className="list-disc pl-4 text-sm text-slate-600 space-y-1">
                  {isBusiness ? (
                    <>
                      <li><strong>Business Expenses:</strong> Rent, Salaries, Supplies (Costs of doing business).</li>
                      <li><strong>Statutory Reliefs:</strong> Pension, NHIS, and Rent Relief.</li>
                    </>
                  ) : (
                     <li><strong>Tax Reliefs:</strong> Pension, NHIS, Life Insurance, and Rent Relief.</li>
                  )}
               </ul>
             </div>

             {/* Step 3 */}
             <div className="p-5 bg-emerald-50/30">
               <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Step 3: The Amount Taxed</p>
               <div className="flex items-center justify-between mb-2">
                 <span className="font-bold text-emerald-900 text-base md:text-lg">Taxable Income</span>
                 <span className="font-mono font-bold text-emerald-900 text-base md:text-lg">= {formatCurrency(taxableIncome)}</span>
               </div>
               <p className="text-sm text-emerald-800 leading-relaxed">
                 This is your <strong>Real Profit</strong>. This is the <em>only</em> amount the tax man looks at.
               </p>
             </div>
           </div>

           {/* Progressive Tax Bands Table */}
           <div className="mt-8">
             <div className="bg-blue-50/50 rounded-xl p-4 mb-5 border border-blue-100">
                <h5 className="text-sm font-bold text-blue-900 mb-1">How the calculation works:</h5>
                <p className="text-sm text-blue-800 leading-relaxed">
                   We use a <strong>Progressive System</strong>. Think of your Taxable Income as being sliced into layers (bands).
                   The first layer is free, the next has a low rate (15%), and higher layers have higher rates. We calculate the tax for each layer separately and add them up.
                </p>
             </div>

             <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                PIT Calculation (2026 Progressive Bands)
             </h4>
             
             <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Band Range</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount in Band</th>
                      <th className="px-4 py-3 font-semibold text-center">
                        Tax Rate
                        <SimpleTooltip content="These are the actual rates used for calculation. The 21.1% 'Effective Rate' is just an average result.">
                           <HelpCircle className="w-3 h-3 text-slate-400 inline ml-1 cursor-help" />
                        </SimpleTooltip>
                      </th>
                      <th className="px-4 py-3 font-semibold text-right">Tax Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {/* Band 1: First 800k */}
                    <tr className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-4 py-3 text-slate-600">
                        First ₦800,000
                        <span className="block text-xs text-emerald-600 font-medium mt-0.5">Tax Free Allowance</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatCurrency(taxableBand1)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">0%</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900">{formatCurrency(taxBand1)}</td>
                    </tr>

                    {/* Band 2: 800k - 3m (Next 2.2m) */}
                    {taxableIncome > 800000 && (
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600">₦800,001 – ₦3,000,000</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                           {formatCurrency(taxableBand2)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">15%</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                           {formatCurrency(taxBand2)}
                        </td>
                      </tr>
                    )}

                    {/* Band 3: 3m - 12m (Next 9m) */}
                    {taxableIncome > 3000000 && (
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600">₦3,000,001 – ₦12,000,000</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                           {formatCurrency(taxableBand3)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">18%</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                           {formatCurrency(taxBand3)}
                        </td>
                      </tr>
                    )}

                    {/* Band 4: 12m - 25m (Next 13m) */}
                    {taxableIncome > 12000000 && (
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600">₦12,000,001 – ₦25,000,000</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                           {formatCurrency(taxableBand4)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">21%</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                           {formatCurrency(taxBand4)}
                        </td>
                      </tr>
                    )}

                    {/* Band 5: 25m - 50m (Next 25m) */}
                    {taxableIncome > 25000000 && (
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600">₦25,000,001 – ₦50,000,000</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                           {formatCurrency(taxableBand5)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">23%</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                           {formatCurrency(taxBand5)}
                        </td>
                      </tr>
                    )}

                    {/* Band 6: Above 50m */}
                    {taxableIncome > 50000000 && (
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600">Above ₦50,000,000</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                           {formatCurrency(taxableBand6)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">25%</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                           {formatCurrency(taxBand6)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  
                  {/* Total Footer */}
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr className="border-b border-slate-200">
                       <td className="px-4 py-3 font-semibold text-xs text-slate-500 bg-slate-50/50">Calculation Formula:</td>
                       <td className="px-4 py-3 text-right font-mono text-xs text-slate-500 bg-slate-50/50">
                          {formatCurrency(moneyIn)} - {formatCurrency(taxReliefs)}
                       </td>
                       <td className="px-4 py-3 bg-slate-50/50"></td>
                       <td className="px-4 py-3 text-right font-mono text-xs text-slate-500 bg-slate-50/50">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] uppercase tracking-wider font-semibold">Sum of Bands:</span>
                            <span className="block max-w-[200px] break-words leading-tight">
                              {formatCurrency(taxBand1)}
                              {taxBand2 > 0 && ` + ${formatCurrency(taxBand2)}`}
                              {taxBand3 > 0 && ` + ${formatCurrency(taxBand3)}`}
                              {taxBand4 > 0 && ` + ${formatCurrency(taxBand4)}`}
                              {taxBand5 > 0 && ` + ${formatCurrency(taxBand5)}`}
                              {taxBand6 > 0 && ` + ${formatCurrency(taxBand6)}`}
                            </span>
                          </div>
                       </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-800">Totals</td>
                      <td className="px-4 py-3 text-right font-bold font-mono text-slate-800">{formatCurrency(taxableIncome)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-bold font-mono text-emerald-700">
                        {formatCurrency(summary?.pitBeforeWHT || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
             </div>
             
             <p className="text-xs text-slate-500 mt-3 italic flex items-center gap-1">
               <CheckCircle2 className="w-3 h-3 text-emerald-600" />
               Calculated automatically using official NTA 2025 rates.
             </p>
           </div>
        </div>

        {/* Compliance Footer (Replaces Disclaimer) */}
        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Calculations based on Nigeria Tax Act 2025. Always consult a tax professional for complex cases.
            </p>
            <div className="mt-2 text-center text-xs text-slate-400">
               <a href="https://www.nrs.gov.ng/" target="_blank" rel="noreferrer" className="underline hover:text-emerald-600 transition-colors">
                 Verify on NRS Website
               </a>
            </div>
        </div>
      </div>
    </LuxuryGuideModal>
  );
}
