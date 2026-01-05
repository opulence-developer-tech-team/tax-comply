"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { AccountType, ExpenseSortField, ToastType, LoadingStateSize, ButtonVariant, ConfirmModalVariant } from "@/lib/utils/client-enums";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/shared/LoadingState";
import { formatCurrency } from "@/lib/utils";
import { TrendingDown, Calculator, AlertCircle, Plus, Edit2, Trash2, Receipt } from "lucide-react";
import { IncomeFormModal } from "./IncomeFormModal";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useHttp } from "@/hooks/useHttp";
import { useToast } from "@/hooks/useToast";

type SummaryType = "monthly" | "yearly";

interface ExpenseSummaryData {
  totalExpenses: number;
  taxDeductibleExpenses: number;
  taxableIncome: number;
  taxSavings: number | null;
  requiresIncome: boolean;
  incomeRequiredFor: {
    accountId: string; // Renamed from entityId for consistency
    entityType: AccountType;
    taxYear: number;
    month?: number | null; // Optional: 1-12 for monthly income, null/undefined for yearly income
  } | null;
  // Breakdown values for display (only present if income is available)
  annualIncome?: number;
  annualTaxExemption?: number; // Tax exemption threshold (e.g., ₦800,000 for 2026+)
  taxableIncomeAmount?: number; // Income amount after exemption
  taxOnIncome?: number;
  taxOnReducedIncome?: number;
}

interface ExpenseSummaryProps {
  summary: ExpenseSummaryData | null;
  isLoading: boolean;
  summaryType?: SummaryType;
  year?: number;
  month?: number;
  accountType?: AccountType;
  accountId?: string; // Renamed from entityId for consistency
  onIncomeAdded?: () => void;
}

export function ExpenseSummary({ 
  summary, 
  isLoading, 
  summaryType = "monthly",
  year,
  month,
  accountType = AccountType.Individual,
  accountId,
  onIncomeAdded,
}: ExpenseSummaryProps) {
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [whtCredits, setWhtCredits] = useState<number | null>(null);
  const { sendHttpRequest: deleteIncomeReq, isLoading: isDeleting } = useHttp();
  const { sendHttpRequest: fetchWHTCreditsReq } = useHttp();
  const { showToast } = useToast();

  // Fetch WHT credits if accountId and year are available
  useEffect(() => {
    if (accountId && year) {
      fetchWHTCreditsReq({
        successRes: (response: any) => {
          const credits = response?.data?.data?.totalCredits || 0;
          setWhtCredits(credits);
        },
        errorRes: () => {
          setWhtCredits(0);
          return false; // Don't show error for WHT credits
        },
        requestConfig: {
          url: `/wht/credits?accountId=${accountId}&taxYear=${year}`,
          method: HttpMethod.GET,
        },
      });
    }
  }, [accountId, year, fetchWHTCreditsReq]);

  // Determine title based on summary type
  const getTitle = () => {
    if (summaryType === "yearly" && year) {
      return `${year} Year Summary`;
    }
    if (summaryType === "monthly" && year && month) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return `${monthNames[month - 1]} ${year} Summary`;
    }
    return summaryType === "yearly" ? "Year Summary" : "Month Summary";
  };

  const handleIncomeAdded = () => {
    setIsIncomeModalOpen(false);
    if (onIncomeAdded) {
      onIncomeAdded();
    }
  };

  const handleDeleteIncome = () => {
    if (!accountId || !year) return;
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteIncome = () => {
    if (!accountId || !year) return;

    setIsConfirmModalOpen(false);

    const incomeType = summaryType === "yearly" ? "annual" : "monthly";

    // Build query parameters
    const params = new URLSearchParams({
      accountId,
      entityType: accountType,
      taxYear: year.toString(),
    });

    // Add month parameter if it's a monthly summary
    if (summaryType === "monthly" && month) {
      params.append("month", month.toString());
    }

    deleteIncomeReq({
      successRes: () => {
        showToast(`${incomeType.charAt(0).toUpperCase() + incomeType.slice(1)} income deleted successfully`, ToastType.Success);
        if (onIncomeAdded) {
          onIncomeAdded(); // Refresh the summary
        }
      },
      errorRes: (errorResponse: any) => {
        const errorMessage =
          errorResponse?.data?.description || "Failed to delete income. Please try again.";
        showToast(errorMessage, ToastType.Error);
        return true;
      },
      requestConfig: {
        url: `/income?${params.toString()}`,
        method: HttpMethod.DELETE,
      },
    });
  };

  if (isLoading) {
    return (
      <Card title={getTitle()}>
        <LoadingState message="Loading summary..." size={LoadingStateSize.Sm} />
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card title={getTitle()}>
      <div className="space-y-5">
        <div className="pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="w-5 h-5 text-slate-600" />
            <p className="text-sm font-medium text-slate-700">Total You Spent</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>

        <div className="pb-4 border-b border-slate-200">
          <p className="text-sm font-medium text-slate-700 mb-2">
            Expenses That Reduce Your Tax
          </p>
          <p className="text-2xl font-semibold text-emerald-600">
            {formatCurrency(summary.taxDeductibleExpenses)}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            These expenses can be deducted from your tax
          </p>
        </div>

        {/* Taxable Income Section (only show if income is provided) */}
        {!summary.requiresIncome && summary.taxableIncome > 0 && (
          <div className="pb-4 border-b border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Taxable Income After Deductions
            </p>
            <p className="text-2xl font-semibold text-slate-700">
              {formatCurrency(summary.taxableIncome)}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Income - Deductible Expenses
            </p>
          </div>
        )}

        {/* Tax Savings Section */}
        <div className="pt-2">
          <div className="flex items-center space-x-2 mb-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-medium text-slate-700">Tax Savings</p>
          </div>

          {/* Blocking State: Income Required */}
          {summary.requiresIncome && summary.incomeRequiredFor && (
            <div className="space-y-4">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">
                      Income Information Required
                    </p>
                    <p className="text-sm text-amber-800 mt-1">
                      To calculate your tax savings, we need your gross {summaryType === "yearly" ? "annual" : "monthly"} income{summaryType === "yearly" ? ` for tax year ${summary.incomeRequiredFor.taxYear}` : month ? ` for ${new Date(summary.incomeRequiredFor.taxYear, month - 1).toLocaleString('default', { month: 'long' })} ${summary.incomeRequiredFor.taxYear}` : ` for ${summary.incomeRequiredFor.taxYear}`}.
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                      We use this to compute: Tax(Income) - Tax(Income - Deductible Expenses) = Your Tax Savings
                    </p>
                    {accountId && (
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant={ButtonVariant.Primary}
                          onClick={() => setIsIncomeModalOpen(true)}
                          className="w-full sm:w-auto text-xs text-start"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Enter {summaryType === "yearly" ? "Annual" : "Monthly"} Income{summaryType === "yearly" ? ` for ${summary.incomeRequiredFor.taxYear}` : month ? ` for ${new Date(summary.incomeRequiredFor.taxYear, month - 1).toLocaleString('default', { month: 'long' })} ${summary.incomeRequiredFor.taxYear}` : ` for ${summary.incomeRequiredFor.taxYear}`}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Display Tax Savings (only if income is provided) */}
          {!summary.requiresIncome && summary.taxSavings !== null && (
            <>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(summary.taxSavings)}
              </p>
              <p className="text-xs text-emerald-700 mt-1 font-medium">
                {summaryType === "yearly"
                  ? `Tax savings for ${year}`
                  : `Tax savings for ${month && year ? new Date(year, month - 1).toLocaleString('default', { month: 'long' }) : ''} ${year}`}
              </p>
              {summary.annualIncome !== undefined && 
               summary.taxOnIncome !== undefined && 
               summary.taxOnReducedIncome !== undefined && (
                <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-100">
                  {summary.annualTaxExemption !== undefined && summary.annualTaxExemption > 0 && (
                    <p className="text-xs text-slate-500 italic">
                      First {formatCurrency(summary.annualTaxExemption)} is tax-exempt
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-slate-600 flex-1 min-w-0">
                      <span className="font-medium">Gross Income:</span> {formatCurrency(summary.annualIncome)}
                      {summary.annualTaxExemption !== undefined && summary.annualTaxExemption > 0 && summary.taxableIncomeAmount !== undefined && (
                        <> → <span className="font-medium">Taxable:</span> {formatCurrency(summary.taxableIncomeAmount)}</>
                      )}
                      {" → "}
                      <span className="font-medium">Tax:</span> {formatCurrency(summary.taxOnIncome)}
                    </p>
                    {accountId && year && (
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => setIsIncomeModalOpen(true)}
                          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          title={summaryType === "yearly" ? "Edit Annual Income" : "Edit Monthly Income"}
                          aria-label={summaryType === "yearly" ? "Edit Annual Income" : "Edit Monthly Income"}
                          disabled={isDeleting}
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{summaryType === "yearly" ? "Edit Annual Income" : "Edit Monthly Income"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteIncome}
                          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          title={summaryType === "yearly" ? "Delete Annual Income" : "Delete Monthly Income"}
                          aria-label={summaryType === "yearly" ? "Delete Annual Income" : "Delete Monthly Income"}
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">After Deductions:</span> {formatCurrency(summary.taxableIncome)}
                    {" → "}
                    <span className="font-medium">Tax:</span> {formatCurrency(summary.taxOnReducedIncome)}
                  </p>
                  <p className="text-xs font-medium text-emerald-600 pt-1 border-t border-slate-100">
                    Tax Savings: {formatCurrency(summary.taxOnIncome)} - {formatCurrency(summary.taxOnReducedIncome)} = {formatCurrency(summary.taxSavings!)}
                  </p>
                  {/* WHT Credits Applied */}
                  {whtCredits !== null && whtCredits > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <p className="text-xs font-semibold text-blue-900">WHT Credits Applied</p>
                      </div>
                      <p className="text-xs text-blue-800">
                        Your tax liability has been reduced by <span className="font-semibold">{formatCurrency(whtCredits)}</span> in WHT credits.
                      </p>
                      <p className="text-[10px] text-blue-700 mt-1 italic">
                        WHT credits offset your final tax liability per NRS (Nigeria Revenue Service) regulations.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {(!summary.annualIncome || summary.taxOnIncome === undefined || summary.taxOnReducedIncome === undefined) && (
                <p className="text-xs text-slate-600 mt-2">
                  Calculated using: Tax(Income) - Tax(Income - Deductible Expenses)
                </p>
              )}
            </>
          )}
        </div>

        {/* Income Form Modal - Show for both missing income (requiresIncome) and when editing existing income */}
        {accountId && (
          <>
            {/* Modal for missing income */}
            {summary.incomeRequiredFor && (
              <IncomeFormModal
                isOpen={isIncomeModalOpen && summary.requiresIncome}
                onClose={() => setIsIncomeModalOpen(false)}
                onSuccess={handleIncomeAdded}
                accountId={summary.incomeRequiredFor.accountId}
                entityType={summary.incomeRequiredFor.entityType}
                taxYear={summary.incomeRequiredFor.taxYear}
                month={summary.incomeRequiredFor.month ?? (summaryType === "monthly" ? month ?? null : null)}
              />
            )}
            {/* Modal for editing existing income */}
            {!summary.requiresIncome && summary.annualIncome !== undefined && year && (
              <IncomeFormModal
                isOpen={isIncomeModalOpen && !summary.requiresIncome}
                onClose={() => setIsIncomeModalOpen(false)}
                onSuccess={handleIncomeAdded}
                accountId={accountId}
                entityType={accountType}
                taxYear={year}
                month={summaryType === "monthly" ? month ?? null : null}
                currentIncome={summary.annualIncome}
              />
            )}
          </>
        )}

        {/* Confirmation Modal */}
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={confirmDeleteIncome}
          title="Delete Income Record"
          message={`Are you sure you want to delete this ${summaryType === "yearly" ? "annual" : "monthly"} income record? This action cannot be undone and tax calculations will be affected.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant={ConfirmModalVariant.Danger}
          isLoading={isDeleting}
        />
      </div>
    </Card>
  );
}
