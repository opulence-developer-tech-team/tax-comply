"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/shared/LoadingState";
import { Alert } from "@/components/ui/Alert";
import { useHttp } from "@/hooks/useHttp";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { useAppSelector } from "@/hooks/useAppSelector";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  Calendar,
  // DollarSign,
  Hash,
  Building2,
  CreditCard,
  Edit,
  UserCheck,
  UserX,
  Briefcase,
  Banknote,
  Trash2,
} from "lucide-react";
import { NairaSign } from "@/components/icons/NairaSign";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LoadingStateSize, AlertVariant, ButtonVariant, ConfirmModalVariant } from "@/lib/utils/client-enums";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  dateOfEmployment: string;
  salary: number;
  taxIdentificationNumber?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface EmployeeDetailModalProps {
  isOpen: boolean;
  employeeId: string | null;
  onClose: () => void;
  onEdit: (employeeId: string) => void;
  onDelete?: (employeeId: string) => void;
}

export function EmployeeDetailModal({
  isOpen,
  employeeId,
  onClose,
  onEdit,
  onDelete,
}: EmployeeDetailModalProps) {
  const { isLoading, sendHttpRequest: fetchEmployeeReq } = useHttp();
  const { isLoading: isDeleting, sendHttpRequest: deleteEmployeeReq } = useHttp();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  // Get subscription from Redux subscription slice (user-based, works for both individual and company accounts)
  const { currentSubscription } = useAppSelector((state: any) => state.subscription);
  const currentPlan = (currentSubscription?.plan || SubscriptionPlan.Free) as SubscriptionPlan;
  const hasPayrollAccess = SUBSCRIPTION_PRICING[currentPlan]?.features?.payroll === true;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchEmployee();
    } else {
      // Reset state when modal closes
      setEmployee(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employeeId]);

  const fetchEmployee = () => {
    if (!employeeId) return;

    setError(null);
    fetchEmployeeReq({
      successRes: (response: any) => {
        setEmployee(response?.data?.data || null);
      },
      errorRes: (errorResponse: any) => {
        const errorMessage =
          errorResponse?.data?.description ||
          errorResponse?.message ||
          "Failed to load employee details. Please try again.";
        setError(errorMessage);
        return true;
      },
      requestConfig: {
        url: `/employees/${employeeId}`,
        method: HttpMethod.GET,
      },
    });
  };

  const handleDelete = () => {
    if (!employeeId || !onDelete) return;

    // Check if user has payroll access before deleting
    if (!hasPayrollAccess) {
      showUpgradePrompt({
        feature: "Employee Management",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "company",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly,
        message: "Employee management is available on Company plan (₦8,500/month) and above. Upgrade to manage employees and process payroll.",
        reason: UpgradeReason.PlanLimitation,
      });
      setShowDeleteConfirm(false);
      return;
    }

    deleteEmployeeReq({
      successRes: () => {
        onDelete(employeeId);
        setShowDeleteConfirm(false);
        onClose();
      },
      errorRes: (errorResponse: any) => {
        // Check if this is an upgrade-required error
        if (errorResponse?.status === 403 && errorResponse?.data?.data?.upgradeRequired) {
          const upgradeData = errorResponse.data.data.upgradeRequired;
          showUpgradePrompt({
            feature: upgradeData.feature || "Employee Management",
            currentPlan: upgradeData.currentPlan,
            requiredPlan: upgradeData.requiredPlan,
            requiredPlanPrice: upgradeData.requiredPlanPrice,
            message: errorResponse?.data?.description || "Employee management is not available on your current plan. Upgrade to unlock this feature.",
            reason: upgradeData.reason,
          });
          setShowDeleteConfirm(false);
          return false; // Don't show error toast, upgrade prompt handles it
        }

        const errorMessage =
          errorResponse?.data?.description ||
          errorResponse?.message ||
          "Failed to delete employee. Please try again.";
        setError(errorMessage);
        setShowDeleteConfirm(false);
        return true;
      },
      requestConfig: {
        url: `/employees/${employeeId}`,
        method: HttpMethod.DELETE,
      },
    });
  };

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? `${employee.firstName} ${employee.lastName}` : "Employee Details"}
    >
      {isLoading && !employee ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingState message="Loading employee details..." size={LoadingStateSize.Md} />
        </div>
      ) : error ? (
        <div className="space-y-6">
          <Alert variant={AlertVariant.Error} title="Error Loading Employee">
            {error}
          </Alert>
          <div className="flex justify-center">
            <Button variant={ButtonVariant.Outline} onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : employee ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 overflow-y-auto flex-1"
        >
          {/* Header Actions */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-emerald-100">
            <div className="flex items-center space-x-3">
              <div
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                  employee.isActive
                    ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-300"
                    : "bg-slate-100 text-slate-800 border-2 border-slate-300"
                }`}
              >
                {employee.isActive ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Active
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4 mr-2" />
                    Inactive
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {onDelete && (
                <Button
                  variant={ButtonVariant.Outline}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                onClick={() => {
                  onEdit(employee._id);
                  onClose();
                }}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Employee
              </Button>
            </div>
          </div>

          {/* Basic Information */}
          <Card
            title="Basic Information"
            className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <Hash className="w-4 h-4 mr-2 text-emerald-600" />
                  Employee ID
                </div>
                <p className="text-lg font-semibold text-slate-900">{employee.employeeId}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <User className="w-4 h-4 mr-2 text-emerald-600" />
                  Full Name
                </div>
                <p className="text-lg font-semibold text-slate-900">
                  {employee.firstName} {employee.lastName}
                </p>
              </div>

              {employee.email && (
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-slate-600 mb-1">
                    <Mail className="w-4 h-4 mr-2 text-emerald-600" />
                    Email Address
                  </div>
                  <p className="text-lg font-medium text-slate-900">{employee.email}</p>
                </div>
              )}

              {employee.phoneNumber && (
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-slate-600 mb-1">
                    <Phone className="w-4 h-4 mr-2 text-emerald-600" />
                    Phone Number
                  </div>
                  <p className="text-lg font-medium text-slate-900">{employee.phoneNumber}</p>
                </div>
              )}

              {employee.dateOfBirth && (
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-slate-600 mb-1">
                    <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                    Date of Birth
                  </div>
                  <p className="text-lg font-medium text-slate-900">
                    {employee.dateOfBirth ? formatDate(employee.dateOfBirth) : "—"}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <Briefcase className="w-4 h-4 mr-2 text-emerald-600" />
                  Date of Employment
                </div>
                  <p className="text-lg font-medium text-slate-900">
                    {formatDate(new Date(employee.dateOfEmployment))}
                  </p>
              </div>
            </div>
          </Card>

          {/* Employment & Compensation */}
          <Card
            title="Employment & Compensation"
            className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <NairaSign className="w-4 h-4 mr-2 text-emerald-600" />
                  Monthly Salary
                </div>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(employee.salary)}</p>
              </div>

              {employee.taxIdentificationNumber && (
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-slate-600 mb-1">
                    <Hash className="w-4 h-4 mr-2 text-emerald-600" />
                    Tax Identification Number (TIN)
                  </div>
                  <p className="text-lg font-medium text-slate-900">{employee.taxIdentificationNumber}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Bank Details */}
          {(employee.bankCode || employee.bankName || employee.accountNumber || employee.accountName) && (
            <Card
              title="Bank Details"
              className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {employee.bankName && (
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-slate-600 mb-1">
                      <Building2 className="w-4 h-4 mr-2 text-emerald-600" />
                      Bank Name
                    </div>
                    <p className="text-lg font-medium text-slate-900">{employee.bankName}</p>
                  </div>
                )}

                {employee.accountNumber && (
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-slate-600 mb-1">
                      <CreditCard className="w-4 h-4 mr-2 text-emerald-600" />
                      Account Number
                    </div>
                    <p className="text-lg font-mono font-medium text-slate-900">{employee.accountNumber}</p>
                  </div>
                )}

                {employee.accountName && (
                  <div className="space-y-1 md:col-span-2">
                    <div className="flex items-center text-sm text-slate-600 mb-1">
                      <Banknote className="w-4 h-4 mr-2 text-emerald-600" />
                      Account Name
                    </div>
                    <p className="text-lg font-medium text-slate-900">{employee.accountName}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Metadata */}
          {(employee.createdAt || employee.updatedAt) && (
            <Card
              title="Additional Information"
              className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {employee.createdAt && (
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-slate-600 mb-1">
                      <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                      Created At
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(new Date(employee.createdAt))}
                    </p>
                  </div>
                )}

                {employee.updatedAt && (
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-slate-600 mb-1">
                      <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                      Last Updated
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(new Date(employee.updatedAt))}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </motion.div>
      ) : null}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteConfirm(false);
          }
        }}
        onConfirm={handleDelete}
        title="Delete Employee"
        message={`Are you sure you want to delete ${employee?.firstName} ${employee?.lastName} (${employee?.employeeId})? This action cannot be undone and will remove all associated payroll records.`}
        confirmLabel="Delete Employee"
        cancelLabel="Cancel"
        variant={ConfirmModalVariant.Danger}
        isLoading={isDeleting}
      />

      {/* Upgrade Prompt */}
      <UpgradePromptComponent />
    </FullScreenModal>
  );
}

