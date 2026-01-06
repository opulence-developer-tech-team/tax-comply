"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { RemittanceStatus } from "@/lib/utils/remittance-status";
import { AccountType } from "@/lib/utils/account-type";

import { useState, useCallback } from "react";
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
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { FullScreenModal } from "@/components/ui/FullScreenModal";

import { NRS_WHT_DEADLINE_DAY } from "@/lib/constants/nrs-constants";

/**
 * Validation Error Field Names Enum
 * CRITICAL: Field names must match the order they appear in the form for scroll-to-error functionality
 */
enum WHTRemittanceValidationField {
  RemittanceAmount = "remittanceAmount",
  RemittanceDate = "remittanceDate",
  RemittanceReference = "remittanceReference",
}

/**
 * WHT Remittance Form Validation Errors
 */
interface WHTRemittanceValidationErrors {
  remittanceAmount?: string;
  remittanceDate?: string;
  remittanceReference?: string;
}

interface WHTRemittance {
  _id: string;
  remittanceMonth: number;
  remittanceYear: number;
  totalWHTAmount: number;
  remittanceDate?: string;
  remittanceDeadline: string;
  remittanceReference?: string;
  remittanceReceipt?: string;
  status: RemittanceStatus;
}

interface WHTRemittanceTrackerProps {
  remittances: WHTRemittance[];
  companyId: string;
  remittanceMonth: number;
  remittanceYear: number;
  accountType: AccountType;
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

export function WHTRemittanceTracker({
  remittances,
  companyId,
  remittanceMonth,
  remittanceYear,
  accountType,
  onRemittanceUpdated,
  currentPlan = SubscriptionPlan.Free,
}: WHTRemittanceTrackerProps) {
  // CRITICAL: Validate props - fail loudly if invalid
  if (!remittanceMonth || remittanceMonth < 1 || remittanceMonth > 12) {
    throw new Error(
      `WHTRemittanceTracker: remittanceMonth must be between 1 and 12. Received: ${remittanceMonth}`
    );
  }

  if (!remittanceYear || remittanceYear < 2026) {
    throw new Error(
      `WHTRemittanceTracker: remittanceYear must be >= 2026. Received: ${remittanceYear}`
    );
  }

  if (accountType !== AccountType.Company && accountType !== AccountType.Business) {
    throw new Error(
      `WHTRemittanceTracker: accountType must be Company or Business. Received: ${accountType}`
    );
  }

  const [editingRemittance, setEditingRemittance] = useState<WHTRemittance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [remittanceDate, setRemittanceDate] = useState("");
  const [remittanceAmount, setRemittanceAmount] = useState("");
  const [remittanceReference, setRemittanceReference] = useState("");
  const [remittanceReceipt, setRemittanceReceipt] = useState("");
  const { isLoading: isSubmitting, sendHttpRequest: remittanceReq } = useHttp();
  const { showUpgradePrompt } = useUpgradePrompt();

  const hasWHTRemittance = SUBSCRIPTION_PRICING[currentPlan]?.features?.whtTracking === true;

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString("default", { month: "long" });
  };

  const getRemittanceDeadline = (month: number, year: number): Date => {
    let deadlineYear = year;
    let deadlineMonth = month + 1;
    if (deadlineMonth > 12) {
      deadlineMonth = 1;
      deadlineYear += 1;
    }
    return new Date(deadlineYear, deadlineMonth - 1, NRS_WHT_DEADLINE_DAY);
  };

  const isOverdue = (remittance: WHTRemittance) => {
    if (remittance.status === RemittanceStatus.Remitted || remittance.status === RemittanceStatus.Overdue) return false;
    const deadline = new Date(remittance.remittanceDeadline);
    return new Date() > deadline;
  };

  const handleAddRemittance = () => {
    if (!hasWHTRemittance) {
      showUpgradePrompt({
        feature: "WHT Remittance Tracking",
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

  const handleEditRemittance = (remittance: WHTRemittance) => {
    if (!hasWHTRemittance) {
      showUpgradePrompt({
        feature: "WHT Remittance Tracking",
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
    setRemittanceAmount(remittance.totalWHTAmount.toString());
    setRemittanceReference(remittance.remittanceReference || "");
    setRemittanceReceipt(remittance.remittanceReceipt || "");
    setIsModalOpen(true);
  };

  /**
   * CRITICAL: Scroll to First Validation Error
   * 
   * Scrolls to the first field with a validation error in the order fields appear in the form.
   * Order: Remittance Amount, Remittance Date, NRS Reference Number
   */
  const scrollToFirstError = useCallback((validationErrors: WHTRemittanceValidationErrors) => {
    // CRITICAL: Field order matches form layout for accurate scrolling
    const fieldOrder: Array<{ field: WHTRemittanceValidationField; selector: string }> = [
      { field: WHTRemittanceValidationField.RemittanceAmount, selector: "input-remittance-amount" },
      { field: WHTRemittanceValidationField.RemittanceDate, selector: "input-remittance-date" },
      { field: WHTRemittanceValidationField.RemittanceReference, selector: "input-remittance-reference" },
    ];
    
    // Find first error field
    let firstErrorField: { field: WHTRemittanceValidationField; selector: string } | null = null;
    
    for (const fieldConfig of fieldOrder) {
      const hasError = validationErrors[fieldConfig.field as keyof WHTRemittanceValidationErrors];
      if (hasError) {
        firstErrorField = fieldConfig;
        break;
      }
    }
    
    if (!firstErrorField) {
      return;
    }
    
    // Wait for DOM updates, then scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let errorElement: HTMLElement | null = document.getElementById(firstErrorField!.selector);
        
        // Additional fallback selectors
        if (!errorElement) {
          const selectors = [
            `input[name="${firstErrorField!.field}"]`,
            `input[id*="${firstErrorField!.selector}"]`,
          ];
          
          for (const selector of selectors) {
            errorElement = document.querySelector(selector) as HTMLElement;
            if (errorElement) break;
          }
        }
        
        if (errorElement) {
          errorElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          
          // Focus after scroll completes
          setTimeout(() => {
            if (errorElement && (errorElement instanceof HTMLInputElement || errorElement instanceof HTMLSelectElement || errorElement instanceof HTMLTextAreaElement)) {
              errorElement.focus();
            }
          }, 400);
        }
      });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEditing = !!editingRemittance;
    const validationErrors: WHTRemittanceValidationErrors = {};

    // CRITICAL: Validate remittanceDate
    if (!remittanceDate || remittanceDate.trim() === "") {
      validationErrors.remittanceDate = "Remittance date is required";
    } else {
      const dateObj = new Date(remittanceDate);
      if (isNaN(dateObj.getTime())) {
        validationErrors.remittanceDate = "Invalid remittance date format";
      }
    }

    // CRITICAL: Validate remittanceAmount
    if (!remittanceAmount || remittanceAmount.trim() === "") {
      validationErrors.remittanceAmount = "Remittance amount is required";
    } else {
      const amountValue = parseFloat(remittanceAmount);
      if (isNaN(amountValue) || !isFinite(amountValue)) {
        validationErrors.remittanceAmount = "Remittance amount must be a valid number";
      } else if (amountValue < 0) {
        validationErrors.remittanceAmount = "Remittance amount must be >= 0";
      } else if (!isEditing && amountValue <= 0) {
        validationErrors.remittanceAmount = "Remittance amount must be greater than 0";
      }
    }

    // CRITICAL: Validate remittanceReference (required only when creating new remittance)
    if (!isEditing && (!remittanceReference || remittanceReference.trim() === "")) {
      validationErrors.remittanceReference = "NRS reference number is required";
    }

    // If there are validation errors, show toast and scroll to first error
    if (Object.keys(validationErrors).length > 0) {
      const firstErrorField = Object.values(validationErrors)[0];
      if (firstErrorField) {
        toast.error(firstErrorField);
      }
      scrollToFirstError(validationErrors);
      return;
    }

    const amountValue = parseFloat(remittanceAmount);

    remittanceReq({
      successRes: () => {
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
            feature: upgradeRequired.feature || "WHT Management",
            currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
            requiredPlan: upgradeRequired.requiredPlan || "starter",
            requiredPlanPrice: upgradeRequired.requiredPlanPrice || SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
            message: errorData?.description || "WHT management is available on Starter plan (₦3,500/month) and above. Upgrade to track WHT deductions, remittances, and credits.",
            reason: upgradeRequired.reason || "plan_limitation",
          });
        } else {
          toast.error(errorData?.description || `Failed to ${isEditing ? "update" : "create"} remittance`);
        }
        return true;
      },
      requestConfig: {
        url: isEditing ? `/wht/remittance` : `/wht/remittance`,
        method: isEditing ? HttpMethod.PUT : HttpMethod.POST,
        body: isEditing ? {
          companyId,
          remittanceMonth: editingRemittance.remittanceMonth,
          remittanceYear: editingRemittance.remittanceYear,
          remittanceDate: new Date(remittanceDate),
          remittanceAmount: amountValue, // CRITICAL: Include remittanceAmount when editing
          remittanceReference: remittanceReference || undefined,
          remittanceReceipt: remittanceReceipt || undefined,
        } : {
          companyId,
          remittanceMonth,
          remittanceYear,
          remittanceAmount: parseFloat(remittanceAmount),
          remittanceDate: new Date(remittanceDate),
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

  // Find remittance for current month/year
  const currentRemittance = remittances.find(
    (r) => r.remittanceMonth === remittanceMonth && r.remittanceYear === remittanceYear
  );

  const pendingRemittances = remittances.filter((r) => r.status === RemittanceStatus.Pending || isOverdue(r));
  const completedRemittances = remittances.filter((r) => r.status === RemittanceStatus.Remitted || r.status === RemittanceStatus.Overdue);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payments to Government</h2>
            <p className="text-base text-gray-600 mt-1">
              Record the tax money you sent to NRS or State IRS for {getMonthName(remittanceMonth)} {remittanceYear}
            </p>
          </div>
          {hasWHTRemittance && !currentRemittance && (
            <Button
              onClick={handleAddRemittance}
              variant={ButtonVariant.Primary}
              size={ButtonSize.Sm}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          )}
        </div>

        {/* Current Period Remittance */}
        {currentRemittance && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {getMonthName(remittanceMonth)} {remittanceYear}
                    </h3>
                    <p className="text-slate-600 mt-1">Status for this month</p>
                  </div>
                  {hasWHTRemittance && (
                    <Button
                      onClick={() => handleEditRemittance(currentRemittance)}
                      variant={ButtonVariant.Outline}
                      size={ButtonSize.Md}
                      className="w-full md:w-auto justify-center"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Info
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div>
                    <p className="text-slate-600 font-medium">Amount Paid</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {formatCurrency(currentRemittance.totalWHTAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Paid On</p>
                    <p className="text-xl font-semibold text-slate-900 mt-2">
                      {currentRemittance.remittanceDate
                        ? formatDate(new Date(currentRemittance.remittanceDate))
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">RRR Reference</p>
                    <p className="text-xl font-semibold text-slate-900 mt-2 font-mono">
                      {currentRemittance.remittanceReference || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Pending Remittances (Other periods) */}
        {pendingRemittances.filter(r => !(r.remittanceMonth === remittanceMonth && r.remittanceYear === remittanceYear)).length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Unpaid Tax (Debt)</h2>
                    <p className="text-base text-slate-600 mt-1">
                      {pendingRemittances.filter(r => !(r.remittanceMonth === remittanceMonth && r.remittanceYear === remittanceYear)).length} past period(s) need payment
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {pendingRemittances.filter(r => !(r.remittanceMonth === remittanceMonth && r.remittanceYear === remittanceYear)).map((remittance) => {
                    const deadline = new Date(remittance.remittanceDeadline);
                    const overdue = isOverdue(remittance);
                    const daysUntilDeadline = Math.ceil(
                      (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <motion.div
                        key={remittance._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className={`p-4 rounded-lg border-2 ${
                          overdue
                            ? "border-red-200 bg-red-50/50"
                            : "border-amber-200 bg-amber-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {overdue ? (
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                              ) : (
                                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                              )}
                              <div>
                                <h3 className="font-semibold text-slate-900">
                                  {getMonthName(remittance.remittanceMonth)} {remittance.remittanceYear}
                                </h3>
                                <p className="text-xs text-slate-600">
                                  {overdue ? "Overdue (Late)" : `${daysUntilDeadline} day(s) left to pay`}
                                </p>
                              </div>
                            </div>
                            <div className="ml-8 space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Amount Due:</span>
                                <span className="font-bold text-slate-900">
                                  {formatCurrency(remittance.totalWHTAmount)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Pay By:</span>
                                <span className={`font-semibold ${
                                  overdue ? "text-red-600" : "text-slate-900"
                                }`}>
                                  {formatDate(deadline)}
                                </span>
                              </div>
                              <div className="flex justify-end">
                                <span className="text-[10px] text-amber-600 font-medium">*State IRS due 10th</span>
                              </div>
                            </div>
                          </div>
                          {hasWHTRemittance && (
                            <Button
                              onClick={() => handleEditRemittance(remittance)}
                              variant={ButtonVariant.Primary}
                              size={ButtonSize.Sm}
                              className="ml-4 shrink-0"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Update
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Completed Remittances */}
        {completedRemittances.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Payment History</h2>
                    <p className="text-base text-slate-600 mt-1">
                      {completedRemittances.length} completed payment(s) to government
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Period</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Paid On</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Reference</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedRemittances.map((remittance) => (
                        <tr key={remittance._id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-slate-900">
                                {getMonthName(remittance.remittanceMonth)} {remittance.remittanceYear}
                              </p>
                              <p className="text-xs text-slate-500">
                                Due: {formatDate(new Date(remittance.remittanceDeadline))}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(remittance.totalWHTAmount)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {remittance.remittanceDate
                              ? formatDate(new Date(remittance.remittanceDate))
                              : "—"}
                          </td>
                          <td className="py-3 px-4">
                            {remittance.remittanceReference ? (
                              <span className="text-sm text-slate-700 font-mono">
                                {remittance.remittanceReference}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold border border-emerald-200">
                              PAID
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {hasWHTRemittance && (
                              <Button
                                onClick={() => handleEditRemittance(remittance)}
                                variant={ButtonVariant.Outline}
                                size={ButtonSize.Sm}
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Empty State - Only show if no remittance for current period AND user has access */}
        {/* Note: This empty state is now handled by the parent component - only render if there's data or access */}
        {!currentRemittance && completedRemittances.length === 0 && pendingRemittances.length === 0 && hasWHTRemittance && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <div className="p-12 text-center">
                <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No payment records for {getMonthName(remittanceMonth)} {remittanceYear}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Click "Record Payment" to log a tax payment for this month if you owe.
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Remittance Modal */}
      <FullScreenModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          editingRemittance
            ? `Edit Remittance - ${getMonthName(editingRemittance.remittanceMonth)} ${editingRemittance.remittanceYear}`
            : `Add Remittance - ${getMonthName(remittanceMonth)} ${remittanceYear}`
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {editingRemittance ? (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-emerald-900">Payment Information</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-emerald-800">Period:</span>
                    <span className="font-semibold text-emerald-900">
                      {getMonthName(editingRemittance.remittanceMonth)} {editingRemittance.remittanceYear}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-800">Amount:</span>
                    <span className="font-semibold text-emerald-900">
                      {formatCurrency(editingRemittance.totalWHTAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-800">Deadline:</span>
                    <span className="font-semibold text-emerald-900">
                      {formatDate(new Date(editingRemittance.remittanceDeadline))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Payment Period</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-800">Period:</span>
                    <span className="font-semibold text-blue-900">
                      {getMonthName(remittanceMonth)} {remittanceYear}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800">Deadline:</span>
                    <span className="font-semibold text-blue-900">
                      {formatDate(getRemittanceDeadline(remittanceMonth, remittanceYear))} (NRS)
                    </span>
                  </div>
                  <div className="flex justify-end">
                     <span className="text-[10px] text-amber-600 font-medium">*State IRS due 10th</span>
                  </div>
                </div>
              </div>
            )}


            <Input
              id="input-remittance-amount"
              label="Amount Paid *"
              type="number"
              step="0.01"
              min="0"
              required
              value={remittanceAmount}
              onChange={(e) => setRemittanceAmount(e.target.value)}
              placeholder="0.00"
              helperText={
                editingRemittance
                  ? `Current amount: ${formatCurrency(editingRemittance.totalWHTAmount)}. You can update the amount.`
                  : "How much did you pay to the government?"
              }
            />

            <Input
              id="input-remittance-date"
              label="Payment Date *"
              type="date"
              required
              value={remittanceDate}
              onChange={(e) => setRemittanceDate(e.target.value)}
              helperText="The date you actually made the payment"
            />

            <Input
              id="input-remittance-reference"
              label="Government Payment Ref (RRR) *"
              type="text"
              required={!editingRemittance}
              value={remittanceReference}
              onChange={(e) => setRemittanceReference(e.target.value)}
              placeholder="e.g., RRR-123456789"
              helperText={editingRemittance ? "Optional: The RRR or reference number on your receipt" : "The RRR or reference number on your receipt"}
            />

            <Input
              label="Receipt/Document Reference"
              type="text"
              value={remittanceReceipt}
              onChange={(e) => setRemittanceReceipt(e.target.value)}
              placeholder="e.g., Receipt #12345"
              helperText="Optional: Any other receipt number for your own records"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
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
              variant={ButtonVariant.Primary}
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[160px]"
            >
              <Save className="w-4 h-4" />
              {editingRemittance ? "Update Payment Info" : "Save Payment Info"}
            </Button>
          </div>
        </form>
      </FullScreenModal>
    </>
  );
}





