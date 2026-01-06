"use client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { Wallet, Plus, Edit2, TrendingUp } from "lucide-react";
import type { IncomeSource } from "@/store/redux/pit/pit-slice";
import { ButtonSize, ButtonVariant } from "@/lib/utils/client-enums";

interface PITIncomeSourcesProps {
  incomeSources: IncomeSource[];
  selectedYear: number;
  totalBusinessIncome?: number;
  isBusiness?: boolean;
}

/**
 * PITIncomeSources Component
 * 
 * Displays a list of income sources for the selected tax year.
 * Provides a link to manage income sources on the dedicated income page.
 */
export function PITIncomeSources({ incomeSources, selectedYear, totalBusinessIncome = 0, isBusiness = false }: PITIncomeSourcesProps) {
  const filteredIncomeSources = incomeSources.filter(
    (income) => income.taxYear === selectedYear
  );

  return (
    <div>
      <Card 
        className="p-0 md:p-6"
        disableAnimation={false}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 sm:gap-0">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                 <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Your Income Sources</h3>
                <p className="text-base text-slate-500">Where your money comes from</p>
              </div>
           </div>

           {isBusiness && (
             <Link href="/dashboard/business/invoices" className="w-full sm:w-auto">
              <Button
                size={ButtonSize.Sm}
                variant={ButtonVariant.Outline}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-base py-2 px-4 w-full sm:w-auto"
                aria-label="Manage your invoices"
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Manage Invoices
              </Button>
            </Link>
           )}
        </div>

        {filteredIncomeSources.length === 0 && totalBusinessIncome <= 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-slate-300" aria-hidden="true" />
            <h4 className="text-lg font-bold text-slate-900 mb-2">No Income Recorded Yet</h4>
            <p className="text-base text-slate-600 max-w-md mx-auto mb-6">
              {isBusiness 
                ? "Create invoices to track your business revenue automatically."
                : "Add your income sources so we can calculate your tax."}
            </p>
            <Link href={isBusiness ? "/dashboard/business/invoices" : "/dashboard/income"}>
              <Button
                size={ButtonSize.Md}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-base py-3 px-6"
                aria-label={isBusiness ? "Create your first invoice" : "Add your first income source"}
              >
                <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
                {isBusiness ? "Create First Invoice" : "Add Your First Income"}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
             {/* Auto-calculated Business Revenue */}
             {totalBusinessIncome > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-blue-50 rounded-xl border border-blue-100 transition-all hover:border-blue-200 hover:shadow-sm">
                <div className="flex-1 mb-4 sm:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totalBusinessIncome)}
                    </p>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                      Automatic
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium text-base">Business Revenue (Paid Invoices)</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Calculated from your Invoices for {selectedYear}
                  </p>
                </div>
                <Link href="/dashboard/business/invoices">
                  <Button
                    size={ButtonSize.Sm}
                    variant={ButtonVariant.Outline}
                    className="border-blue-200 text-blue-700 hover:bg-blue-100 w-full sm:w-auto text-sm"
                    aria-label="View Invoices"
                  >
                    View Invoices
                  </Button>
                </Link>
              </div>
            )}

            {filteredIncomeSources.map((income) => (
              <div
                key={income._id}
                className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-sm transition-all"
              >
                <div className="flex-1">
                  <p className="text-xl font-bold text-slate-900">
                    {formatCurrency(income.annualIncome)}
                  </p>
                  <p className="text-base text-slate-600">
                    Tax Year {income.taxYear}
                    {income.month && ` - ${new Date(2000, income.month - 1).toLocaleString("default", { month: "long" })}`}
                  </p>
                </div>
                <Link href="/dashboard/income">
                  <Button
                    size={ButtonSize.Sm}
                    variant={ButtonVariant.Ghost}
                    className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    aria-label={`Manage income source: ${formatCurrency(income.annualIncome)}`}
                  >
                    <Edit2 className="w-4 h-4 mr-2" aria-hidden="true" />
                    Edit
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
