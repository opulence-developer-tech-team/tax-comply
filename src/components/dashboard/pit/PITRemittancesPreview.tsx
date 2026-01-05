"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, Plus, Edit2, CheckCircle2, Clock } from "lucide-react";
import type { PITRemittance } from "@/store/redux/pit/pit-slice";
import { ButtonSize, ButtonVariant } from "@/lib/utils/client-enums";

interface PITRemittancesPreviewProps {
  remittances: PITRemittance[];
  selectedYear: number;
  remittancesHref?: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

/**
 * PITRemittancesPreview Component
 * 
 * Displays a READ-ONLY preview of remittances for the selected tax year.
 * Consistent 'Luxury' styling with other dashboard components.
 */
export function PITRemittancesPreview({ remittances, selectedYear, remittancesHref = "/dashboard/pit/remittances" }: PITRemittancesPreviewProps) {
  // Filter remittances for the selected year
  const filteredRemittances = remittances.filter(
    (remittance) => remittance.taxYear === selectedYear
  );

  // Calculate total remitted for this year
  const totalRemitted = filteredRemittances.reduce(
    (sum, rem) => sum + (rem.remittanceAmount || 0),
    0
  );

  return (
    <motion.div variants={itemVariants}>
      <Card 
        className="p-6"
        disableAnimation={false}
      >
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-purple-600" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-slate-900">Tax Payments</h3>
                 <p className="text-base text-slate-500">History of what you've paid</p>
               </div>
            </div>

            <Link href={remittancesHref}>
             <Button
               size={ButtonSize.Sm}
               variant={ButtonVariant.Outline}
               className="border-purple-200 text-purple-700 hover:bg-purple-50 text-base py-2 px-4"
               aria-label="Manage your remittances"
             >
               <Receipt className="w-4 h-4 mr-2" aria-hidden="true" />
               Manage Payments
             </Button>
           </Link>
         </div>

        {filteredRemittances.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
            <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-300" aria-hidden="true" />
            <h4 className="text-lg font-bold text-slate-900 mb-2">No Payments Yet for {selectedYear}</h4>
            <p className="text-base text-slate-600 max-w-md mx-auto mb-6">
              When you pay your tax to the NRS, record it here so we can subtract it from what you owe.
            </p>
            <Link href={remittancesHref}>
              <Button
                size={ButtonSize.Md}
                className="bg-purple-600 hover:bg-purple-700 text-white border-0 text-base py-3 px-6"
                aria-label="Record Your First Remittance"
              >
                <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
                Record Tax Payment
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-5 bg-purple-50 rounded-xl border border-purple-100">
              <div>
                <p className="text-base text-slate-600 mb-1">Total Remitted ({selectedYear})</p>
                <p className="text-3xl font-bold text-purple-700">
                  {formatCurrency(totalRemitted)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base text-slate-600 mb-1">Payments</p>
                <p className="text-3xl font-bold text-slate-900">
                  {filteredRemittances.length}
                </p>
              </div>
            </div>

            {/* Recent Remittances (Show max 3) */}
            <div className="space-y-3">
              {filteredRemittances.slice(0, 3).map((remittance) => (
                <div
                  key={remittance._id}
                  className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 hover:border-purple-200 hover:shadow-sm transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                       {/* Status Icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        remittance.status === "remitted" || remittance.status === "verified"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-600"
                      }`}>
                        {remittance.status === "remitted" || remittance.status === "verified" ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(remittance.remittanceAmount)}
                        </p>
                        <p className="text-sm text-slate-500">
                          Paid on {formatDate(remittance.remittanceDate)}
                        </p>
                      </div>
                    </div>
                    {remittance.remittanceReference && (
                      <p className="text-xs text-slate-400 pl-11">
                        Ref: {remittance.remittanceReference}
                      </p>
                    )}
                  </div>
                  <Link href="/dashboard/pit/remittances">
                    <Button
                      size={ButtonSize.Sm}
                      variant={ButtonVariant.Ghost}
                      className="text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                      aria-label={`Manage remittance`}
                    >
                      <Edit2 className="w-4 h-4 mr-2" aria-hidden="true" />
                      Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            {/* View All */}
            {filteredRemittances.length > 3 && (
              <div className="pt-3 border-t border-slate-100 text-center">
                <Link href={remittancesHref} className="text-purple-600 font-medium hover:text-purple-800 text-sm">
                  View All {filteredRemittances.length} Payments
                </Link>
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}



