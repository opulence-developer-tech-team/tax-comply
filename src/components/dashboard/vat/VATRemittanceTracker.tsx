"use client";

/**
 * VATRemittanceTracker Component
 * 
 * CRITICAL: VAT remittances are monthly/quarterly, not annual like CIT.
 * Tracks VAT remittances for both Company and Business accounts.
 * 
 * CRITICAL REQUIREMENTS (Ruthless Mentor Standards):
 * - remittances: REQUIRED - must be an array (can be empty)
 * - entityId: REQUIRED - must be a non-empty string (companyId or businessId)
 * - accountType: REQUIRED - must be AccountType.Company or AccountType.Business
 * - month: REQUIRED - must be a number 1-12
 * - year: REQUIRED - must be a number >= 2026
 * - onRemittanceUpdated: REQUIRED - callback function
 * - currentPlan: REQUIRED - must be a valid SubscriptionPlan enum value
 * - All validation must fail loudly (throw errors) - no defaults, no fallbacks, no auto-assignment
 * - Uses enums, not string literals
 * - Production-ready, bulletproof code
 */

import { HttpMethod } from "@/lib/utils/http-method";
import { RemittanceStatus } from "@/lib/utils/remittance-status";
import { AccountType } from "@/lib/utils/account-type";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";
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
  Plus,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ConfirmModalVariant } from "@/lib/utils/client-enums";

interface VATRemittance {
  _id: string;
  companyId?: string;
  businessId?: string;
  month: number;
  year: number;
  remittanceDate: string;
  remittanceAmount: number;
  remittanceReference: string;
  remittanceReceipt?: string;
  status: string;
}

interface VATRemittanceTrackerProps {
  remittances: VATRemittance[];
  entityId: string;
  accountType: AccountType.Company | AccountType.Business;
  month: number;
  year: number;
  onRemittanceUpdated: () => void;
  currentPlan: SubscriptionPlan;
}

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

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function VATRemittanceTracker({
  remittances,
  entityId,
  accountType,
  month,
  year,
  onRemittanceUpdated,
  currentPlan,
}: VATRemittanceTrackerProps) {
  // CRITICAL: Validate props - fail loudly if invalid
  if (!remittances || !Array.isArray(remittances)) {
    throw new Error(
      `VATRemittanceTracker: remittances prop must be an array. ` +
      `Received: ${typeof remittances}. ` +
      `This is a critical prop validation error.`
    );
  }

  if (!entityId || typeof entityId !== "string" || entityId.trim() === "") {
    throw new Error(
      `VATRemittanceTracker: entityId prop is required and must be a non-empty string. ` +
      `Received: "${entityId}". ` +
      `This is a critical prop validation error.`
    );
  }

  const validAccountTypes = [AccountType.Company, AccountType.Business];
  if (!validAccountTypes.includes(accountType)) {
    throw new Error(
      `VATRemittanceTracker: accountType prop must be AccountType.Company or AccountType.Business. ` +
      `Received: "${accountType}". ` +
      `Use AccountType enum, not string literals.`
    );
  }

  if (typeof month !== "number" || month < 1 || month > 12) {
    throw new Error(
      `VATRemittanceTracker: month prop must be a number between 1 and 12. ` +
      `Received: ${month}.`
    );
  }

  if (typeof year !== "number" || year < 2026 || year > 2100) {
    throw new Error(
      `VATRemittanceTracker: year prop must be a number >= 2026 (Nigeria Tax Act 2025). ` +
      `Received: ${year}.`
    );
  }

  if (typeof onRemittanceUpdated !== "function") {
    throw new Error(
      `VATRemittanceTracker: onRemittanceUpdated prop must be a function. ` +
      `Received: ${typeof onRemittanceUpdated}.`
    );
  }

  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentPlan)) {
    throw new Error(
      `VATRemittanceTracker: currentPlan prop must be a valid SubscriptionPlan enum value. ` +
      `Received: "${currentPlan}". ` +
      `Valid values are: ${validPlans.join(", ")}. ` +
      `Use SubscriptionPlan enum, not string literals.`
    );
  }

  const [editingRemittance, setEditingRemittance] = useState<VATRemittance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [remittanceToDelete, setRemittanceToDelete] = useState<string | null>(null);
  const [remittanceDate, setRemittanceDate] = useState("");
  const [remittanceAmount, setRemittanceAmount] = useState("");
  const [remittanceReference, setRemittanceReference] = useState("");
  const [remittanceReceipt, setRemittanceReceipt] = useState("");
  const { isLoading: isSubmitting, sendHttpRequest: remittanceReq } = useHttp();
  const { showUpgradePrompt } = useUpgradePrompt();

  const hasVATRemittance = SUBSCRIPTION_PRICING[currentPlan]?.features?.vatRemittance === true;

  const handleAddRemittance = () => {
    if (!hasVATRemittance) {
      showUpgradePrompt({
        feature: "VAT Remittance Tracking",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "starter",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
      });
      return;
    }
    setEditingRemittance(null);
    setRemittanceDate(new Date().toISOString().split("T")[0]);
    setRemittanceAmount("");
    setRemittanceReference("");
    setRemittanceReceipt("");
    setIsModalOpen(true);
  };

  const handleEditRemittance = (remittance: VATRemittance) => {
    if (!hasVATRemittance) {
      showUpgradePrompt({
        feature: "VAT Remittance Tracking",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "starter",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
      });
      return;
    }
    setEditingRemittance(remittance);
    setRemittanceDate(
      remittance.remittanceDate 
        ? new Date(remittance.remittanceDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setRemittanceAmount(remittance.remittanceAmount.toString());
    setRemittanceReference(remittance.remittanceReference || "");
    setRemittanceReceipt(remittance.remittanceReceipt || "");
    setIsModalOpen(true);
  };

  const handleDeleteRemittance = (remittanceId: string) => {
    if (!hasVATRemittance) {
      showUpgradePrompt({
        feature: "VAT Remittance Tracking",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "starter",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
      });
      return;
    }
    setRemittanceToDelete(remittanceId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteRemittance = async () => {
    if (!remittanceToDelete) return;
    setIsDeleteModalOpen(false);
    
    // CRITICAL: Determine query parameter based on account type
    const entityParam = accountType === AccountType.Company ? "companyId" : "businessId";
    
    remittanceReq({
      successRes: () => {
        toast.success("VAT Remittance deleted successfully");
        onRemittanceUpdated();
        setRemittanceToDelete(null);
      },
      errorRes: (errorResponse: any) => {
        const errorData = errorResponse?.data;
        const upgradeRequired = errorData?.upgradeRequired;
        
        if (errorResponse?.status === 403 && upgradeRequired) {
          showUpgradePrompt({
            feature: upgradeRequired.feature || "VAT Remittance Tracking",
            currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
            requiredPlan: upgradeRequired.requiredPlan || "starter",
            requiredPlanPrice: upgradeRequired.requiredPlanPrice || SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
          });
        } else {
          toast.error(errorData?.description || "Failed to delete remittance");
        }
      },
      requestConfig: {
        url: `/vat/remittance?remittanceId=${remittanceToDelete}&${entityParam}=${entityId}`,
        method: HttpMethod.DELETE,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // CRITICAL: Validate form fields - fail loudly if invalid
    if (!remittanceDate) {
      toast.error("Remittance date is required");
      return;
    }

    const dateObj = new Date(remittanceDate);
    if (isNaN(dateObj.getTime())) {
      toast.error("Invalid remittance date format");
      return;
    }

    if (!remittanceAmount || parseFloat(remittanceAmount) <= 0) {
      toast.error("Remittance amount must be greater than 0");
      return;
    }

    const amountNum = parseFloat(remittanceAmount);
    if (isNaN(amountNum) || !isFinite(amountNum)) {
      toast.error("Invalid remittance amount");
      return;
    }

    if (!remittanceReference || remittanceReference.trim() === "") {
      toast.error("Remittance reference is required");
      return;
    }

    const isEditing = !!editingRemittance;
    const entityParam = accountType === AccountType.Company ? "companyId" : "businessId";

    remittanceReq({
      successRes: (response: any) => {
        toast.success(isEditing ? "Remittance updated successfully!" : "Remittance added successfully!");
        setIsModalOpen(false);
        setEditingRemittance(null);
        onRemittanceUpdated();
      },
      errorRes: (errorResponse: any) => {
        const errorData = errorResponse?.data;
        const upgradeRequired = errorData?.upgradeRequired;
        
        if (errorResponse?.status === 403 && upgradeRequired) {
          showUpgradePrompt({
            feature: upgradeRequired.feature || "VAT Remittance Tracking",
            currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
            requiredPlan: upgradeRequired.requiredPlan || "starter",
            requiredPlanPrice: upgradeRequired.requiredPlanPrice || SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
          });
        } else {
          toast.error(errorData?.description || `Failed to ${isEditing ? "update" : "create"} remittance`);
        }
      },
      requestConfig: {
        url: isEditing 
          ? `/vat/remittance?remittanceId=${editingRemittance._id}&${entityParam}=${entityId}`
          : `/vat/remittance`,
        method: isEditing ? HttpMethod.PUT : HttpMethod.POST,
        body: {
          entityId,
          accountType,
          month,
          year,
          remittanceDate: new Date(remittanceDate),
          remittanceAmount: amountNum,
          remittanceReference: remittanceReference.trim(),
          remittanceReceipt: remittanceReceipt.trim() || undefined,
        },
      },
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRemittance(null);
    setRemittanceDate("");
    setRemittanceAmount("");
    setRemittanceReference("");
    setRemittanceReceipt("");
  };

  // Filter remittances for the current month/year
  const filteredRemittances = remittances.filter(
    (r) => r.month === month && r.year === year
  );
  
  const sortedRemittances = [...filteredRemittances].sort((a, b) => {
    const dateA = new Date(a.remittanceDate).getTime();
    const dateB = new Date(b.remittanceDate).getTime();
    return dateB - dateA; // Most recent first
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Your Payments</h2>
            <p className="text-sm text-gray-600 mt-1">
              Track payments you made to the government for {monthNames[month - 1]} {year}
            </p>
          </div>
          {hasVATRemittance && (
            <Button
              onClick={handleAddRemittance}
              variant={ButtonVariant.Primary}
              size={ButtonSize.Sm}
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          )}
        </div>

        {/* Payments List */}
        {sortedRemittances.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date Paid</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount Paid</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Reference Number</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Receipt</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRemittances.map((remittance) => (
                        <tr key={remittance._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-900">
                              {formatDate(new Date(remittance.remittanceDate))}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(remittance.remittanceAmount)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-700 font-mono">
                              {remittance.remittanceReference}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {remittance.remittanceReceipt ? (
                              <span className="text-sm text-gray-600">
                                {remittance.remittanceReceipt}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              remittance.status === RemittanceStatus.Compliant || remittance.status === RemittanceStatus.Remitted
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : remittance.status === RemittanceStatus.Pending
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : "bg-red-100 text-red-700 border border-red-200"
                            }`}>
                              {remittance.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleEditRemittance(remittance)}
                                variant={ButtonVariant.Outline}
                                size={ButtonSize.Sm}
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleDeleteRemittance(remittance._id)}
                                variant={ButtonVariant.Outline}
                                size={ButtonSize.Sm}
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <div className="p-0 md:p-12 text-center">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No payments recorded</p>
                <p className="text-sm text-gray-500 mt-1">
                  Add your VAT payments to track what you've sent to the government.
                </p>
                {hasVATRemittance && (
                  <Button
                    onClick={handleAddRemittance}
                    variant={ButtonVariant.Primary}
                    size={ButtonSize.Sm}
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Record First Payment
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Add/Edit Remittance Modal */}
      <FullScreenModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRemittance ? "Edit Payment Record" : "Record VAT Payment"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Payment Information</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-800">Period:</span>
                  <span className="font-semibold text-blue-900">{monthNames[month - 1]} {year}</span>
                </div>
              </div>
            </div>

            <Input
              label="Date Paid *"
              type="date"
              required
              value={remittanceDate}
              onChange={(e) => setRemittanceDate(e.target.value)}
              helperText="When did you pay the government?"
            />

            <Input
              label="Amount Paid *"
              type="number"
              step="0.01"
              min="0"
              required
              value={remittanceAmount}
              onChange={(e) => setRemittanceAmount(e.target.value)}
              placeholder="0.00"
              helperText="How much did you pay?"
            />

            <Input
              label="Payment Reference (RRR) *"
              type="text"
              required
              value={remittanceReference}
              onChange={(e) => setRemittanceReference(e.target.value)}
              placeholder="e.g., NRS-VAT-2026-..."
              helperText="The reference number from your payment receipt"
            />

            <Input
              label="Receipt/Document Number"
              type="text"
              value={remittanceReceipt}
              onChange={(e) => setRemittanceReceipt(e.target.value)}
              placeholder="Optional receipt number"
              helperText="Optional: Keep a record of your receipt number"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
            <Button
              type="button"
              variant={ButtonVariant.Outline}
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || !remittanceDate || !remittanceAmount || !remittanceReference}
              className="w-full sm:w-auto min-w-[160px]"
            >
              <Save className="w-4 h-4" />
              {editingRemittance ? "Update Payment" : "Save Payment"}
            </Button>
          </div>
        </form>
      </FullScreenModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteRemittance}
        title="Delete VAT Remittance"
        message="Are you sure you want to delete this VAT remittance record? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant={ConfirmModalVariant.Danger}
        isLoading={isSubmitting}
      />
    </>
  );
}


