"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { PITRemittanceStatus } from "@/lib/utils/pit-remittance-status";
import { ExemptionReason } from "@/lib/utils/exemption-reason";
import { ButtonSize, ButtonVariant } from "@/lib/utils/client-enums";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Edit2,
  X,
  Save,
  Receipt,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { FullScreenModal } from "@/components/ui/FullScreenModal";

interface PITRemittance {
  _id: string;
  accountId: string;
  taxYear: number;
  remittanceDate: string;
  remittanceAmount: number;
  remittanceReference: string;
  receiptUrl?: string;
  status: PITRemittanceStatus;
}

interface PITRemittanceTrackerProps {
  remittances: PITRemittance[];
  accountId: string;
  taxYear: number;
  onRemittanceUpdated: () => void;
  currentPlan: SubscriptionPlan; // CRITICAL: Required - no default
  isFullyExempt: boolean; // CRITICAL: Required - no default
  exemptionReason?: ExemptionReason; // Optional - only provided if user is exempt
  pitAfterWHT: number; // CRITICAL: Required - no default
}

// CRITICAL: Minimum tax year per Nigeria Tax Act 2025
const MIN_TAX_YEAR = 2026;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export function PITRemittanceTracker({
  remittances,
  accountId,
  taxYear,
  onRemittanceUpdated,
  currentPlan,
  isFullyExempt,
  exemptionReason,
  pitAfterWHT,
}: PITRemittanceTrackerProps): React.JSX.Element {
  // CRITICAL: Validate all required props - fail loudly if missing or invalid
  if (!remittances) throw new Error("PITRemittanceTracker: remittances prop is required");
  if (!Array.isArray(remittances)) throw new Error(`PITRemittanceTracker: remittances must be an array`);
  if (!accountId || typeof accountId !== "string") throw new Error("PITRemittanceTracker: accountId is required");
  if (!taxYear || typeof taxYear !== "number") throw new Error(`PITRemittanceTracker: taxYear is required`);
  if (taxYear < MIN_TAX_YEAR) throw new Error(`PITRemittanceTracker: taxYear must be >= ${MIN_TAX_YEAR}`);
  if (typeof onRemittanceUpdated !== "function") throw new Error("PITRemittanceTracker: onRemittanceUpdated required");
  
  const [editingRemittance, setEditingRemittance] = useState<PITRemittance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [remittanceDate, setRemittanceDate] = useState("");
  const [remittanceAmount, setRemittanceAmount] = useState("");
  const [remittanceReference, setRemittanceReference] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const { isLoading: isSubmitting, sendHttpRequest: remittanceReq } = useHttp();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();

  const hasPITRemittance = SUBSCRIPTION_PRICING[currentPlan]?.features?.pitRemittance === true;

  const handleAddRemittance = () => {
    if (!hasPITRemittance) {
      showUpgradePrompt({
        feature: "PIT Remittance Tracking",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "starter",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
        message: "PIT remittance tracking is available on Starter plan (₦3,500/month) and above.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }

    setEditingRemittance(null);
    setRemittanceDate(new Date().toISOString().split("T")[0]);
    setRemittanceAmount("");
    setRemittanceReference("");
    setReceiptUrl("");
    setIsModalOpen(true);
  };

  const handleEditRemittance = (remittance: PITRemittance) => {
    if (!hasPITRemittance) {
      showUpgradePrompt({
        feature: "PIT Remittance Tracking",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "starter",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
        message: "PIT remittance tracking is available on Starter plan (₦3,500/month) and above.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }

    setEditingRemittance(remittance);
    setRemittanceDate(new Date(remittance.remittanceDate).toISOString().split("T")[0]);
    setRemittanceAmount(remittance.remittanceAmount.toString());
    setRemittanceReference(remittance.remittanceReference);
    setReceiptUrl(remittance.receiptUrl || "");
    setIsModalOpen(true);
  };

  const handleSubmitRemittance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remittanceDate || !remittanceAmount || !remittanceReference) {
      toast.error("Please fill in all required fields");
      return;
    }
    const amount = parseFloat(remittanceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid remittance amount greater than 0");
      return;
    }
    if (amount > 1_000_000_000_000) {
      toast.error("Remittance amount seems too large.");
      return;
    }

    const payload = {
      remittanceDate: new Date(remittanceDate).toISOString(),
      remittanceAmount: amount,
      remittanceReference: remittanceReference.trim(),
      receiptUrl: receiptUrl.trim() || undefined,
    };

    const config = editingRemittance 
      ? {
          url: `/pit/remittance?remittanceId=${editingRemittance._id}&accountId=${accountId}`,
          method: HttpMethod.PUT,
          body: JSON.stringify(payload),
        }
      : {
          url: "/pit/remittance",
          method: HttpMethod.POST,
          body: JSON.stringify({ ...payload, accountId, taxYear }),
        };

    remittanceReq({
      successRes: () => {
        toast.success(editingRemittance ? "Remittance updated successfully" : "Remittance recorded successfully");
        onRemittanceUpdated();
        setIsModalOpen(false);
        setEditingRemittance(null);
        setRemittanceDate("");
        setRemittanceAmount("");
        setRemittanceReference("");
        setReceiptUrl("");
      },
      errorRes: (errorResponse: any) => {
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        const upgradeRequired = errorData?.upgradeRequired || errorData?.data?.upgradeRequired;
        if (errorResponse?.status === 403 && upgradeRequired) {
             showUpgradePrompt({
              feature: upgradeRequired.feature || "PIT Remittance Tracking",
              currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
              requiredPlan: upgradeRequired.requiredPlan || "starter",
              requiredPlanPrice: upgradeRequired.requiredPlanPrice || SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
              message: errorData?.description || "PIT remittance tracking is available on Starter plan.",
              reason: upgradeRequired.reason || "plan_limitation",
            });
        } else {
          toast.error(errorData?.description || "Failed to save remittance");
        }
      },
      requestConfig: config,
    });
  };

  return (
    <>
      <UpgradePromptComponent />
      <div className="space-y-6">
        {/* Exemption Banner - Luxury Green/Blue Mix */}
        {isFullyExempt && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-blue-50/50 border border-blue-200 p-5 rounded-xl shadow-sm"
            role="alert"
          >
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-2 rounded-full shrink-0">
                 <ShieldCheck className="w-5 h-5 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 mb-1">
                  Tax Exempt for {taxYear}
                </h4>
                <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    {exemptionReason === "threshold" 
                      ? "Your income is within the ₦800,000 threshold. You don't owe tax."
                      : "Deductions have reduced your taxable income to zero."}
                  </p>
                  <p className="text-slate-500 text-xs mt-2 bg-white/50 p-2 rounded border border-blue-100 inline-block">
                    <span className="font-semibold text-blue-700">Tip:</span> Only record remittances if you accidentally paid tax and need to track it for a refund.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Remittances
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Track payments made to the Nigeria Revenue Service (NRS) for {taxYear}.
            </p>
          </div>
          <Button
            size={ButtonSize.Md}
            onClick={handleAddRemittance}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 shadow-md w-full sm:w-auto"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>
        
        {/* Remittances List */}
        <div>
        {remittances.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="bg-white w-16 h-16 mx-auto mb-4 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
               <Receipt className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 mb-1">No payments recorded</h4>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              {hasPITRemittance 
                ? "Keep track of your tax payments. Once you pay NRS, record it here to reduce your liability balance."
                : "Upgrade to the Starter plan to track your tax payments and manage your liability effectively."
              }
            </p>
            {!hasPITRemittance && (
              <Button
                size={ButtonSize.Sm}
                onClick={handleAddRemittance}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Upgrade to Track
              </Button>
            )}
             {hasPITRemittance && (
              <Button
                variant={ButtonVariant.Ghost}
                onClick={handleAddRemittance}
                className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                Record your first payment
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {remittances.map((remittance) => (
              <motion.div
                key={remittance._id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    remittance.status === "remitted" || remittance.status === "verified"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}>
                    {remittance.status === "remitted" || remittance.status === "verified" ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                       <h5 className="font-bold text-slate-900 text-lg">
                        {formatCurrency(remittance.remittanceAmount)}
                      </h5>
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                        {formatDate(remittance.remittanceDate)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-600">
                       <span className="flex items-center gap-1">
                         <span className="font-medium text-slate-400 text-xs uppercase">Ref:</span> 
                         <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                           {remittance.remittanceReference}
                         </span>
                       </span>
                       
                       {remittance.receiptUrl && (
                        <a
                          href={remittance.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium hover:underline decoration-emerald-200 underline-offset-2"
                        >
                          <FileText className="w-3 h-3" />
                          View Receipt
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {hasPITRemittance && (
                  <div className="mt-4 sm:mt-0 flex justify-end">
                    <Button
                      variant={ButtonVariant.Ghost}
                      size={ButtonSize.Sm}
                      onClick={() => handleEditRemittance(remittance)}
                      className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
        </div>
      </div>

      <FullScreenModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRemittance(null);
          setRemittanceDate("");
          setRemittanceAmount("");
          setRemittanceReference("");
          setReceiptUrl("");
        }}
        title={editingRemittance ? "Edit Payment Record" : "Record Tax Payment"}
      >
        <form onSubmit={handleSubmitRemittance} className="max-w-2xl mx-auto space-y-8 py-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600 mb-6">
            <p>
              Please enter the details exactly as they appear on your <strong>NRS Remittance Receipt</strong>. 
              This information serves as proof of payment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={remittanceDate}
                  onChange={(e) => setRemittanceDate(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Amount Paid (₦) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={remittanceAmount}
                  onChange={(e) => setRemittanceAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-11 font-mono"
                  required
                />
              </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">
              NRS Reference Number <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={remittanceReference}
              onChange={(e) => setRemittanceReference(e.target.value)}
              placeholder="e.g., RRR-1234-5678"
              className="h-11 font-mono uppercase"
              required
            />
            <p className="text-xs text-slate-500">
              The generic reference number (RRR) or Transaction ID from the payment portal.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">
              Receipt URL <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Input
              type="url"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://..."
              className="h-11"
            />
            <p className="text-xs text-slate-500">
              Link to your digital receipt for safekeeping.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-8 border-t border-slate-100 mt-8">
            <Button
              type="button"
              variant={ButtonVariant.Ghost}
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              className="min-w-[120px] bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-11"
            >
              {editingRemittance ? "Update Record" : "Save Payment"}
            </Button>
          </div>
        </form>
      </FullScreenModal>
    </>
  );
}

