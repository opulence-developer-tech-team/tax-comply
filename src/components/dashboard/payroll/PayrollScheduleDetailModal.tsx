"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/shared/LoadingState";
import { Alert } from "@/components/ui/Alert";
import { useHttp } from "@/hooks/useHttp";
import { HttpMethod } from "@/lib/utils/http-method";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Calendar,
  // DollarSign,
  Users,
  TrendingUp,
  FileText,
  AlertCircle,
} from "lucide-react";
import { LoadingStateSize, AlertVariant } from "@/lib/utils/client-enums";
import { PayrollStatus } from "@/lib/server/utils/payroll-status";

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  hasPension?: boolean;
  hasNHF?: boolean;
  hasNHIS?: boolean;
}

interface PayrollRecord {
  _id: string;
  employeeId: Employee | string;
  grossSalary: number;
  employeePensionContribution: number;
  employerPensionContribution: number;
  nhfContribution: number;
  nhisContribution: number;
  cra: number;
  taxableIncome: number;
  paye: number;
  netSalary: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PayrollSchedule {
  _id: string;
  month: number;
  year: number;
  totalEmployees: number;
  totalGrossSalary: number;
  totalEmployeePension: number;
  totalEmployerPension: number;
  totalNHF: number;
  totalNHIS: number;
  totalPAYE: number;
  totalNetSalary: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PayrollScheduleDetailModalProps {
  isOpen: boolean;
  scheduleId: string | null;
  onClose: () => void;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function PayrollScheduleDetailModal({
  isOpen,
  scheduleId,
  onClose,
}: PayrollScheduleDetailModalProps) {
  const { isLoading, sendHttpRequest: fetchScheduleReq } = useHttp();
  const [schedule, setSchedule] = useState<PayrollSchedule | null>(null);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && scheduleId) {
      fetchSchedule();
    } else {
      // Reset state when modal closes
      setSchedule(null);
      setPayrolls([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scheduleId]);

  const fetchSchedule = () => {
    // CRITICAL: Validate scheduleId
    if (!scheduleId || typeof scheduleId !== "string" || scheduleId.trim().length === 0) {
      setError("Schedule ID is required and must be a non-empty string");
      return;
    }

    setError(null);
    fetchScheduleReq({
      successRes: (response: any) => {
        const data = response?.data?.data;
        if (data?.schedule && Array.isArray(data?.payrolls)) {
          setSchedule(data.schedule);
          setPayrolls(data.payrolls);
          setError(null);
        } else {
          setError("Invalid response format. Schedule data not found.");
        }
      },
      errorRes: (errorResponse: any) => {
        const errorMessage =
          errorResponse?.data?.description ||
          errorResponse?.message ||
          "Failed to load payroll schedule details. Please try again.";
        setError(errorMessage);
        return true;
      },
      requestConfig: {
        url: `/payroll/schedule/${scheduleId}`,
        method: HttpMethod.GET,
      },
    });
  };

  const getEmployeeName = (employeeId: Employee | string): string => {
    if (typeof employeeId === "object" && employeeId !== null) {
      return `${employeeId.firstName} ${employeeId.lastName}`;
    }
    return "Unknown Employee";
  };

  const getEmployeeId = (employeeId: Employee | string): string => {
    if (typeof employeeId === "object" && employeeId !== null) {
      return employeeId.employeeId;
    }
    return "N/A";
  };

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title={schedule ? `Payroll Schedule - ${monthNames[schedule.month - 1]} ${schedule.year}` : "Payroll Schedule Details"}
    >
      {isLoading && !schedule ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingState message="Loading payroll schedule details..." size={LoadingStateSize.Md} />
        </div>
      ) : error ? (
        <div className="space-y-6">
          <Alert variant={AlertVariant.Error} title="Error Loading Payroll Schedule">
            {error}
          </Alert>
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      ) : schedule ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 overflow-y-auto flex-1"
        >
          {/* Schedule Summary */}
          <Card
            title="Schedule Summary"
            className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                  Period
                </div>
                <p className="text-lg font-semibold text-slate-900">
                  {monthNames[schedule.month - 1]} {schedule.year}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <Users className="w-4 h-4 mr-2 text-emerald-600" />
                  Total Employees
                </div>
                <p className="text-lg font-semibold text-slate-900">
                  {schedule.totalEmployees}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-slate-600 mb-1">
                  <FileText className="w-4 h-4 mr-2 text-emerald-600" />
                  Status
                </div>
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                  schedule.status === PayrollStatus.Submitted
                    ? "bg-green-100 text-green-800"
                    : schedule.status === PayrollStatus.Approved
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-800"
                }`}>
                  {schedule.status.toUpperCase()}
                </span>
              </div>
            </div>
          </Card>

          {/* Financial Summary */}
          <Card
            title="Financial Summary"
            className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-600 mb-1">Total Gross Salary</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(schedule.totalGrossSalary)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Total PAYE</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(schedule.totalPAYE)}</p>
                {schedule.totalPAYE === 0 && (
                  <p className="text-xs text-slate-500 mt-1 italic leading-relaxed">
                    No PAYE tax applies because the taxable income (after deductions) is within the ₦800,000 annual exemption limit (₦66,666.67 monthly) set by the Nigeria Tax Act 2025. This means employees earning up to ₦800,000 per year are fully exempt from PAYE tax.
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Total Net Salary</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(schedule.totalNetSalary)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Total Employee Pension</p>
                <p className="text-xl font-bold text-slate-700">{formatCurrency(schedule.totalEmployeePension || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Total Employer Pension</p>
                <p className="text-xl font-bold text-slate-700">{formatCurrency(schedule.totalEmployerPension || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Total NHF</p>
                <p className="text-xl font-bold text-slate-700">{formatCurrency(schedule.totalNHF || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Total NHIS</p>
                <p className="text-xl font-bold text-slate-700">{formatCurrency(schedule.totalNHIS || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Created At</p>
                <p className="text-sm font-medium text-slate-900">
                  {schedule.createdAt ? formatDate(new Date(schedule.createdAt)) : "N/A"}
                </p>
              </div>
            </div>
          </Card>

          {/* Individual Payroll Records */}
          <Card
            title={`Employee Payroll Records (${payrolls.length})`}
            className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
          >
            {payrolls.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No payroll records found for this schedule.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-emerald-50 to-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Employee Name
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Gross Salary
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Employee Pension
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                        NHF
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                        NHIS
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                        PAYE
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Net Salary
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {payrolls.map((payroll) => (
                      <tr key={payroll._id} className="hover:bg-emerald-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                          {getEmployeeId(payroll.employeeId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {getEmployeeName(payroll.employeeId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 text-right">
                          {formatCurrency(payroll.grossSalary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              const employee = typeof payroll.employeeId === "object" ? payroll.employeeId : null;
                              const hasPension = employee?.hasPension;
                              // CRITICAL: Benefit flags are required - if missing, show error indicator
                              if (hasPension === undefined) {
                                return <span className="text-red-500 italic">Error: Missing flag</span>;
                              }
                              return hasPension ? (
                                formatCurrency(payroll.employeePensionContribution)
                              ) : (
                                <span className="text-slate-400 italic">N/A</span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              const employee = typeof payroll.employeeId === "object" ? payroll.employeeId : null;
                              const hasNHF = employee?.hasNHF;
                              // CRITICAL: Benefit flags are required - if missing, show error indicator
                              if (hasNHF === undefined) {
                                return <span className="text-red-500 italic">Error: Missing flag</span>;
                              }
                              return hasNHF ? (
                                formatCurrency(payroll.nhfContribution)
                              ) : (
                                <span className="text-slate-400 italic">N/A</span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              const employee = typeof payroll.employeeId === "object" ? payroll.employeeId : null;
                              const hasNHIS = employee?.hasNHIS;
                              // CRITICAL: Benefit flags are required - if missing, show error indicator
                              if (hasNHIS === undefined) {
                                return <span className="text-red-500 italic">Error: Missing flag</span>;
                              }
                              return hasNHIS ? (
                                formatCurrency(payroll.nhisContribution)
                              ) : (
                                <span className="text-slate-400 italic">N/A</span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-red-700">{formatCurrency(payroll.paye)}</span>
                            {payroll.paye === 0 && (
                              <span className="text-xs text-slate-400 italic mt-1">
                                Tax exempt
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700 text-right">
                          {formatCurrency(payroll.netSalary)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      ) : null}
    </FullScreenModal>
  );
}

