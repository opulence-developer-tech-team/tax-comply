"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { RemittanceStatus } from "@/lib/utils/remittance-status";

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
import { EmptyState } from "@/components/shared/EmptyState";

interface CITRemittance {
  _id: string;
  companyId: string;
  taxYear: number;
  remittanceDate: string;
  remittanceAmount: number;
  remittanceReference: string;
  remittanceReceipt?: string;
  status: RemittanceStatus;
}

interface CITRemittanceTrackerProps {
  remittances: CITRemittance[];
  companyId: string;
  taxYear: number;
  onRemittanceUpdated: () => void;
  currentPlan?: SubscriptionPlan;
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

export function CITRemittanceTracker({
  remittances,
  companyId,
  taxYear,
  onRemittanceUpdated,
  currentPlan = SubscriptionPlan.Free,
}: CITRemittanceTrackerProps) {
  const [editingRemittance, setEditingRemittance] = useState<CITRemittance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [remittanceToDelete, setRemittanceToDelete] = useState<string | null>(null);
  const [remittanceDate, setRemittanceDate] = useState("");
  const [remittanceAmount, setRemittanceAmount] = useState("");
  const [remittanceReference, setRemittanceReference] = useState("");
  const [remittanceReceipt, setRemittanceReceipt] = useState("");
  const { isLoading: isSubmitting, sendHttpRequest: remittanceReq } = useHttp();
  const { showUpgradePrompt } = useUpgradePrompt();

  const hasCITRemittance = SUBSCRIPTION_PRICING[currentPlan]?.features?.citRemittance === true;

  const handleAddRemittance = () => {
    if (!hasCITRemittance) {
      showUpgradePrompt({
        feature: "CIT Remittance Tracking",
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

  const handleEditRemittance = (remittance: CITRemittance) => {
    if (!hasCITRemittance) {
      showUpgradePrompt({
        feature: "CIT Remittance Tracking",
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
    if (!hasCITRemittance) {
      showUpgradePrompt({
        feature: "CIT Remittance Tracking",
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
    
    remittanceReq({
      successRes: () => {
        toast.success("Payment record deleted successfully");
        onRemittanceUpdated();
        setRemittanceToDelete(null);
      },
      errorRes: (errorResponse: any) => {
        const errorData = errorResponse?.data;
        const upgradeRequired = errorData?.upgradeRequired;
        
        if (errorResponse?.status === 403 && upgradeRequired) {
          showUpgradePrompt({
            feature: upgradeRequired.feature || "CIT Remittance Tracking",
            currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
            requiredPlan: upgradeRequired.requiredPlan || "starter",
            requiredPlanPrice: upgradeRequired.requiredPlanPrice || SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
          });
        } else {
          toast.error(errorData?.description || "Failed to delete payment record");
        }
      },
      requestConfig: {
        url: `/cit/remittance?remittanceId=${remittanceToDelete}&companyId=${companyId}`,
        method: HttpMethod.DELETE,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!remittanceDate) {
      toast.error("Remittance date is required");
      return;
    }

    if (!remittanceAmount || parseFloat(remittanceAmount) <= 0) {
      toast.error("Remittance amount must be greater than 0");
      return;
    }

    if (!remittanceReference || remittanceReference.trim() === "") {
      toast.error("Remittance reference is required");
      return;
    }

    const isEditing = !!editingRemittance;

    remittanceReq({
      successRes: (response: any) => {
        console.log("[CIT_REMITTANCE_TRACKER] Remittance save success:", {
          isEditing,
          response,
          responseData: response?.data,
        });
        toast.success(isEditing ? "Payment updated successfully!" : "Payment added successfully!");
        setIsModalOpen(false);
        setEditingRemittance(null);
        console.log("[CIT_REMITTANCE_TRACKER] Calling onRemittanceUpdated callback");
        onRemittanceUpdated();
      },
      errorRes: (errorResponse: any) => {
        const errorData = errorResponse?.data;
        const upgradeRequired = errorData?.upgradeRequired;
        
        if (errorResponse?.status === 403 && upgradeRequired) {
          showUpgradePrompt({
            feature: upgradeRequired.feature || "CIT Remittance Tracking",
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
          ? `/cit/remittance?remittanceId=${editingRemittance._id}&companyId=${companyId}`
          : `/cit/remittance`,
        method: isEditing ? HttpMethod.PUT : HttpMethod.POST,
        body: {
          companyId,
          taxYear,
          remittanceDate: new Date(remittanceDate),
          remittanceAmount: parseFloat(remittanceAmount),
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

  // CRITICAL: Ensure remittances is always an array
  console.log("[CIT_REMITTANCE_TRACKER] Remittances received as props:", {
    remittances,
    remittancesType: typeof remittances,
    isArray: Array.isArray(remittances),
    length: Array.isArray(remittances) ? remittances.length : "N/A",
    companyId,
    taxYear,
  });
  
  const remittancesArray = Array.isArray(remittances) ? remittances : [];
  console.log("[CIT_REMITTANCE_TRACKER] Remittances array after processing:", {
    remittancesArray,
    remittancesArrayLength: remittancesArray.length,
    remittancesArrayItems: remittancesArray.map((r) => ({
      _id: r._id,
      remittanceDate: r.remittanceDate,
      remittanceAmount: r.remittanceAmount,
      remittanceReference: r.remittanceReference,
    })),
  });
  
  const sortedRemittances = [...remittancesArray].sort((a, b) => {
    const dateA = new Date(a.remittanceDate).getTime();
    const dateB = new Date(b.remittanceDate).getTime();
    return dateB - dateA; // Most recent first
  });
  
  console.log("[CIT_REMITTANCE_TRACKER] Sorted remittances:", {
    sortedRemittances,
    sortedRemittancesLength: sortedRemittances.length,
    sortedRemittancesItems: sortedRemittances.map((r) => ({
      _id: r._id,
      remittanceDate: r.remittanceDate,
      remittanceAmount: r.remittanceAmount,
      remittanceReference: r.remittanceReference,
    })),
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Your Tax Payments</h2>
            <p className="text-sm text-gray-600 mt-1">
              Track payments you made to the NRS for tax year {taxYear}
            </p>
          </div>
          {hasCITRemittance && (
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

        {/* Remittances List */}
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
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Reference</th>
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
                              {remittance.status === RemittanceStatus.Remitted ? "PAID" : 
                               remittance.status === RemittanceStatus.Compliant ? "VERIFIED" :
                               remittance.status.toUpperCase()}
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
            <div className="py-6">
              <EmptyState
                title="No Payments Recorded"
                description={`No tax payments recorded for tax year ${taxYear}.`}
                icon="🧾"
                actionLabel={hasCITRemittance ? "Record First Payment" : undefined}
                onAction={hasCITRemittance ? handleAddRemittance : undefined}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Add/Edit Remittance Modal */}
      <FullScreenModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRemittance ? "Edit Payment Info" : "Record Tax Payment"}
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
                  <span className="text-blue-800">Tax Year:</span>
                  <span className="font-semibold text-blue-900">{taxYear}</span>
                </div>
              </div>
            </div>

            <Input
              label="Payment Date *"
              type="date"
              required
              value={remittanceDate}
              onChange={(e) => setRemittanceDate(e.target.value)}
              helperText="Date when you actually paid the NRS"
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
              helperText="The exact amount you paid"
            />

            <Input
              label="Government Payment Ref (RRR) *"
              type="text"
              required
              value={remittanceReference}
              onChange={(e) => setRemittanceReference(e.target.value)}
              placeholder="e.g., NRS-CIT-2026-001234"
              helperText="The RRR or reference number on your receipt"
            />

            <Input
              label="Receipt/Document Reference"
              type="text"
              value={remittanceReceipt}
              onChange={(e) => setRemittanceReceipt(e.target.value)}
              placeholder="e.g., Receipt #12345 or Document ID"
              helperText="Optional: Receipt number or document reference for your records"
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
        title="Delete Payment Record"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant={ConfirmModalVariant.Danger}
        isLoading={isSubmitting}
      />
    </>
  );
}

