"use client";

import { motion } from "framer-motion";
import { Calculator, Info, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { VAT_RATE } from "@/lib/constants/tax";
import { AccountType } from "@/lib/utils/account-type";

interface TaxCalculationPreviewProps {
  amount: number;
  vatAmount: number;
  accountType: string;
  isTaxDeductible: boolean;
}

export function TaxCalculationPreview({
  amount,
  vatAmount,
  accountType,
  isTaxDeductible,
}: TaxCalculationPreviewProps) {
  if (amount <= 0 || !isTaxDeductible) return null;

  // For company: CIT rate depends on company classification:
  // - Small Company: 0% (turnover ≤ ₦50M AND fixedAssets ≤ ₦250M)
  // - Other Companies: 30% (turnover > ₦50M)
  // - Large Company: 30% (turnover > ₦100M)
  // For individual: PIT uses progressive brackets (0% to 25% depending on income level)
  // Here we show estimated ranges based on possible rates
  
  // Calculate estimated savings for different rate scenarios
  const companyMinRate = 0; // Small company rate
  const companyMaxRate = 30; // Large company rate
  const companyTypicalRate = 30; // Standard company rate (for companies > 50M)
  
  const individualMinRate = 0; // First bracket (income ≤ ₦800,000 exempt)
  const individualMaxRate = 25; // Highest bracket (income > ₦50M)
  const individualTypicalRate = 15; // Typical rate for middle-income earners
  
  // Show range of possible savings
  const minSavings = accountType === AccountType.Company 
    ? (amount * companyMinRate) / 100
    : (amount * individualMinRate) / 100;
  const maxSavings = accountType === AccountType.Company
    ? (amount * companyMaxRate) / 100
    : (amount * individualMaxRate) / 100;
  const typicalSavings = accountType === AccountType.Company
    ? (amount * companyTypicalRate) / 100
    : (amount * individualTypicalRate) / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Simple Explanation Box */}
      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-2">
              💡 How This Expense Reduces Your Tax (Simple Explanation)
            </h4>
            <div className="text-sm text-blue-800 space-y-2">
              {accountType === AccountType.Company ? (
                <>
                  <p>
                    <strong>Think of it like this:</strong> Your company makes profit (money you earn minus money you spend). 
                    NRS (Nigeria Revenue Service, the tax office) takes a percentage of your profit as tax. The rate depends on your company size:
                  </p>
                    <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                      <li><strong>Small companies:</strong> 0% (turnover ≤ ₦50M)</li>
                      <li><strong>Other companies:</strong> 30% (turnover &gt; ₦50M)</li>
                    </ul>
                  <p>
                    <strong>How expenses help:</strong> When you spend money on company expenses (like buying printer paper, 
                    fuel for delivery, or paying rent for your shop), that spending <strong>reduces your profit</strong>.
                  </p>
                  <p>
                    <strong>Example:</strong> If you earn ₦1,000,000 this year and spend ₦200,000 on company expenses, 
                    your profit becomes ₦800,000. You'll pay tax on ₦800,000 instead of ₦1,000,000, saving you money (amount depends on your company's tax rate)!
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Think of it like this:</strong> You earn money, and NRS (Nigeria Revenue Service, the tax office) takes a percentage 
                    of your income as tax using progressive brackets (0% to 25% depending on your income level). Certain expenses you paid for your business can reduce how much tax you pay.
                  </p>
                  <p>
                    <strong>How expenses help:</strong> When you spend money on business expenses (like buying supplies for your
                    business or paying rent for your shop), that spending <strong>reduces the amount of income you pay tax on</strong>.
                  </p>
                  <p>
                    <strong>Example:</strong> If you earn ₦600,000 this year and spent ₦100,000 on business expenses, 
                    you'll pay tax on a lower amount (₦500,000 instead of ₦600,000). The actual savings depend on which tax bracket applies to your income level!
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Preview */}
      <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <h4 className="font-semibold text-emerald-900">Estimated Tax Savings for This Expense</h4>
        </div>
        <div className="space-y-3 text-sm">
          <div className="bg-white p-3 rounded border border-emerald-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-700">Expense Amount:</span>
              <span className="font-bold text-slate-900">{formatCurrency(amount)}</span>
            </div>
            {accountType === AccountType.Company && vatAmount > 0 && (
              <div className="flex justify-between items-center text-xs text-slate-600 mb-2">
                <span>VAT Input ({VAT_RATE}%):</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs text-slate-700 bg-white p-3 rounded border border-emerald-100">
            <div className="flex justify-between">
              <span>Step 1: This expense reduces your {accountType === AccountType.Company ? "profit" : "taxable income"} by:</span>
              <span className="font-medium">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                Step 2: Tax rate for {accountType === AccountType.Company ? "companies (CIT)" : "individuals (PIT)"}:
              </span>
              <span className="font-medium">
                {accountType === AccountType.Company 
                  ? `0% - 30%*` 
                  : `0% - 25%*`}
              </span>
            </div>
            <div className="text-xs text-slate-600 italic mb-2">
              {accountType === AccountType.Company ? (
                <>*Rate depends on company classification: Small (0%), Medium (20%), Large (30%)</>
              ) : (
                <>*Rate depends on income level using progressive brackets (0% to 25%)</>
              )}
            </div>
            <div className="border-t border-emerald-200 pt-2 mt-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-900 flex items-center">
                    <TrendingDown className="w-4 h-4 mr-1" />
                    Estimated Tax Savings Range:
                  </span>
                  <span className="font-bold text-emerald-600 text-base">
                    {formatCurrency(minSavings)} - {formatCurrency(maxSavings)}
                  </span>
                </div>
                {typicalSavings > 0 && (
                  <div className="flex justify-between items-center text-xs text-slate-600 bg-emerald-50 p-2 rounded">
                    <span>Typical estimate (if {accountType === AccountType.Company ? "Medium" : "middle-income"} rate applies):</span>
                    <span className="font-medium text-emerald-700">{formatCurrency(typicalSavings)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r text-xs text-amber-800">
            <p className="font-semibold mb-1">⚠️ Important Note:</p>
            <p>
              This is an <strong>estimate showing possible savings range</strong>. Your actual tax savings depend on:
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {accountType === AccountType.Company ? (
                <>
                  <li><strong>Company classification:</strong> Small companies (0% CIT) or Other companies (30% CIT)</li>
                  <li><strong>Total profit:</strong> Your annual taxable profit (revenue minus expenses)</li>
                  <li><strong>Other deductions:</strong> Other tax-deductible expenses you've recorded</li>
                </>
              ) : (
                <>
                  <li><strong>Your income level:</strong> PIT uses progressive brackets (0% to 25%) depending on taxable income</li>
                  <li><strong>Total income:</strong> Your annual gross income from all sources</li>
                  <li><strong>Other deductions:</strong> Statutory deductions (Pension, NHF, NHIS) and other allowable deductions</li>
                </>
              )}
              <li><strong>Tax calculations:</strong> This expense will be included when calculating your final tax at the end of the year</li>
            </ul>
            <p className="mt-2">
              The actual savings will be calculated by NRS (Nigeria Revenue Service) based on your complete tax return and may fall anywhere within the range shown above.
            </p>
          </div>

          <div className="text-xs text-slate-600 pt-2 border-t border-emerald-200">
            <p>
              <strong>💡 Tip:</strong> Record all your company expenses throughout the year. 
              The more legitimate company expenses you record, the more you can reduce your tax bill. 
              This is allowed by NRS (Nigeria Revenue Service) as long as the expenses are 
              for your company.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

