import React from "react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

interface InvoiceSummaryProps {
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  whtAmount?: number;
  whtRate?: number;
  netAmountAfterWHT?: number;
}

export function InvoiceSummary({
  subtotal,
  vatAmount,
  total,
  vatRate,
  whtAmount = 0,
  whtRate = 0,
  netAmountAfterWHT,
}: InvoiceSummaryProps) {
  const hasWHT = whtAmount > 0 && whtRate > 0;
  const finalTotal = netAmountAfterWHT !== undefined ? netAmountAfterWHT : total;

  return (
    <Card title="Invoice Summary">
      <div className="space-y-4">
        <div className="flex justify-between text-slate-600 text-lg">
          <span>Subtotal:</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        
        <div className="flex justify-between text-slate-600 text-lg">
          <span>VAT (7.5%):</span>
          <span className="font-medium">{formatCurrency(vatAmount)}</span>
        </div>
        
        <div className="flex justify-between text-slate-800 text-xl font-semibold pt-2 border-t border-slate-100">
          <span>Total Invoice Value:</span>
          <span>{formatCurrency(total)}</span>
        </div>

        {hasWHT && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 space-y-3">
            <div className="flex justify-between text-amber-800 text-lg">
              <span className="flex items-center gap-2">
                Minus WHT ({whtRate}%)
                <span className="text-xs bg-amber-100 px-2 py-0.5 rounded text-amber-700">Tax</span>
              </span>
              <span className="font-bold">-{formatCurrency(whtAmount)}</span>
            </div>
            
            <div className="flex justify-between text-emerald-900 text-xl font-bold pt-3 border-t border-amber-200">
              <span>Money You Will Receive:</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>
            <p className="text-xs text-amber-700 text-center">
              The client will pay {formatCurrency(whtAmount)} to the government for you.
            </p>
          </div>
        )}

        {!hasWHT && (
          <div className="flex justify-between text-2xl font-bold text-emerald-800 pt-4 border-t-2 border-slate-100">
            <span>Money You Will Receive:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}











