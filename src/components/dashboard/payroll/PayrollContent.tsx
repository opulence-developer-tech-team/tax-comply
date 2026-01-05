"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { payrollActions } from "@/store/redux/payroll/payroll-slice";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { ButtonVariant, ButtonSize, LoadingStateSize } from "@/lib/utils/client-enums";
import { LoadingState } from "@/components/shared/LoadingState";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { PayrollScheduleFilterStatus } from "@/lib/utils/payroll-schedule-filter-status";
import { FilterAll } from "@/lib/utils/client-enums";
import { PayrollStatus } from "@/lib/server/utils/payroll-status";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ConfirmModalVariant } from "@/lib/utils/client-enums";
import { DollarSign, RefreshCw, UserPlus, Trash2, Eye, CheckCircle2, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PayrollGenerationModal } from "@/components/dashboard/payroll/PayrollGenerationModal";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { PayrollScheduleDetailModal } from "@/components/dashboard/payroll/PayrollScheduleDetailModal";
import { PayrollGuideModal } from "@/components/dashboard/payroll/PayrollGuideModal";
import type { PayrollSchedule } from "@/store/redux/payroll/payroll-slice";

interface PayrollContentProps {
  entityId: string;
  accountType: AccountType;
  currentPlan: SubscriptionPlan;
}

export function PayrollContent({ entityId, accountType, currentPlan }: PayrollContentProps) {
  // DEBUG: Log props on mount/update
  useEffect(() => {
    console.log("[PayrollContent] Props received:", {
      entityId,
      accountType,
      currentPlan,
    });
  }, [entityId, accountType, currentPlan]);

  const router = useRouter();
  const dispatch = useAppDispatch();

  // CRITICAL: Validate entityId prop - fail loudly if missing
  if (!entityId) {
    throw new Error("PayrollContent: entityId prop is required.");
  }

  // CRITICAL: Validate accountType prop - fail loudly if missing
  if (!accountType) {
    throw new Error("PayrollContent: accountType prop is required.");
  }

  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(accountType)) {
    throw new Error(`PayrollContent: Invalid accountType "${accountType}". Valid values are: ${validAccountTypes.join(", ")}.`);
  }

  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;

  // CRITICAL: Validate account type is Company or Business (Individual accounts don't have payroll)
  if (!isCompanyAccount && !isBusinessAccount) {
    throw new Error(
      `PayrollContent: Invalid account type "${accountType}". ` +
      `Expected AccountType.Company or AccountType.Business. ` +
      "Individual accounts do not have payroll management."
    );
  }

  // CRITICAL: Validate currentPlan prop - fail loudly if missing or invalid
  if (!currentPlan) {
    throw new Error("PayrollContent: currentPlan prop is required.");
  }

  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentPlan)) {
    throw new Error(`PayrollContent: Invalid currentPlan "${currentPlan}". Valid values are: ${validPlans.join(", ")}.`);
  }

  // Get payroll schedules state from Redux
  // CRITICAL: Validate that payroll slice exists before destructuring (fail loudly if missing)
  const payrollState = useAppSelector((state: any) => state.payroll);
  
  if (!payrollState) {
    throw new Error(
      "PayrollContent: Payroll Redux slice is not initialized. This is a configuration error. " +
      "The payroll reducer must be registered in the Redux store."
    );
  }

  const {
    schedules,
    pagination,
    filters,
    hasFetched,
    isLoading,
    error,
    companyId: payrollCompanyId,
  } = payrollState;

  // DEBUG: Log schedules state when it changes
  useEffect(() => {
    console.log("[PayrollContent] Schedules state updated", {
      schedulesLength: schedules.length,
      schedules: schedules.map((s: PayrollSchedule) => ({
        _id: s._id,
        month: s.month,
        year: s.year,
        status: s.status,
        totalEmployees: s.totalEmployees,
        totalGrossSalary: s.totalGrossSalary,
        totalPAYE: s.totalPAYE,
        totalNetSalary: s.totalNetSalary,
      })),
      pagination,
    });
  }, [schedules, pagination]);

  const hasPayrollAccess = SUBSCRIPTION_PRICING[currentPlan]?.features?.payroll === true;
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();

  const { sendHttpRequest: fetchPayrollReq } = useHttp();
  const { sendHttpRequest: updateStatusReq } = useHttp();
  const { sendHttpRequest: deleteScheduleReq, isLoading: isDeletingSchedule } = useHttp();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [updatingScheduleId, setUpdatingScheduleId] = useState<string | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [viewScheduleId, setViewScheduleId] = useState<string | null>(null);

  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  const minTaxYear = 2026;
  const currentYear = Math.max(minTaxYear, new Date().getFullYear());

  // Sync entityId in Redux when it changes
  // CRITICAL: Payroll Redux slice uses companyId field name, but it stores entityId (companyId or businessId)
  useEffect(() => {
    if (entityId && entityId !== payrollCompanyId) {
      dispatch(payrollActions.setCompanyId(entityId));
    }
  }, [entityId, payrollCompanyId, dispatch]);

  // Fetch payroll schedules when:
  // 1. EntityId is available AND data hasn't been fetched for current filters
  // 2. Filters change (Redux sets hasFetched to false when filters change)
  useEffect(() => {
    // Don't fetch if already loading or if we don't have an entityId yet
    if (isLoading || !entityId) return;

    // Fetch if data hasn't been fetched for current filters
    if (!hasFetched) {
      fetchPayrollSchedulesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, filters.status, filters.year, filters.month, filters.page, filters.itemsPerPage, hasFetched, isLoading]);

  const fetchPayrollSchedulesData = useCallback(() => {
    // CRITICAL: Validate entityId - fail loudly if missing
    if (!entityId) {
      throw new Error(
        "PayrollContent.fetchPayrollSchedulesData: entityId is required. " +
        "This should be validated at component level before calling fetchPayrollSchedulesData."
      );
    }

    dispatch(payrollActions.setLoading(true));

    const params = new URLSearchParams({
      page: filters.page.toString(),
      limit: filters.itemsPerPage.toString(),
    });

    // CRITICAL: Use companyId or businessId query parameter based on account type
    if (isCompanyAccount) {
      params.append("companyId", entityId);
    } else if (isBusinessAccount) {
      params.append("businessId", entityId);
    } else {
      throw new Error(
        `PayrollContent.fetchPayrollSchedulesData: Cannot determine query parameter for account type "${accountType}". ` +
        "This is a critical logic error."
      );
    }

    // Add status filter if not "all"
    if (filters.status !== PayrollScheduleFilterStatus.All) {
      params.append("status", filters.status);
    }

    // CRITICAL: Always send year filter - year is always a number in Redux state
    params.append("year", filters.year.toString());

    // Add month filter if not "all"
    if (filters.month !== FilterAll.All) {
      params.append("month", filters.month.toString());
    }

    const requestUrl = `/payroll/schedule?${params.toString()}`;

    fetchPayrollReq({
      successRes: (response: any) => {
        console.log("[PayrollContent] Payroll schedules API response received", {
          response,
          data: response?.data,
          schedules: response?.data?.data?.schedules,
          pagination: response?.data?.data?.pagination,
        });

        const data = response?.data?.data;
        const schedulesList = data?.schedules || [];
        const paginationData = data?.pagination || {
          page: filters.page,
          limit: filters.itemsPerPage,
          total: schedulesList.length,
          pages: Math.ceil(schedulesList.length / filters.itemsPerPage) || 1,
        };

        console.log("[PayrollContent] Processing schedules for Redux", {
          schedulesListLength: schedulesList.length,
          schedulesList: schedulesList.map((s: any) => ({
            _id: s._id,
            month: s.month,
            year: s.year,
            status: s.status,
            totalEmployees: s.totalEmployees,
            totalGrossSalary: s.totalGrossSalary,
            totalPAYE: s.totalPAYE,
            totalNetSalary: s.totalNetSalary,
            companyId: s.companyId,
            businessId: s.businessId,
          })),
          paginationData,
          entityId,
          accountType,
        });

        // Update Redux store
        // CRITICAL: Payroll Redux slice uses companyId field name, but it stores entityId (companyId or businessId)
        dispatch(payrollActions.setPayrollSchedules({
          schedules: schedulesList,
          pagination: paginationData,
          companyId: entityId, // Redux slice field name is companyId, but it stores entityId
        }));
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status;
        console.error("Payroll schedules API error:", errorResponse);
        dispatch(payrollActions.setError(errorResponse?.data?.description || "Failed to fetch payroll schedules"));
        
        // Handle 403 errors - prevent infinite retries
        if (status === 403) {
          // Authorization/permission error - stop retrying
          return false;
        } else if (status === 404) {
          // CRITICAL: Redirect to appropriate onboarding page based on account type
          const onboardingRoute = isCompanyAccount ? "/dashboard/company/onboard" : "/dashboard/business/onboard";
          router.push(onboardingRoute);
          return false;
        }
        return true;
      },
      requestConfig: {
        url: requestUrl,
        method: HttpMethod.GET,
      },
    });
  }, [entityId, accountType, isCompanyAccount, isBusinessAccount, filters, isLoading, dispatch, fetchPayrollReq, router]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      dispatch(payrollActions.setPage(newPage));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    dispatch(payrollActions.setFilters({ itemsPerPage: newItemsPerPage, page: 1 }));
  };

  const handleStatusFilterChange = (status: PayrollScheduleFilterStatus) => {
    dispatch(payrollActions.setFilters({ status, page: 1 }));
  };

  const handleYearFilterChange = (year: number) => {
    // CRITICAL: Ensure minimum year is 2026
    const yearToUse = Math.max(minTaxYear, year);
    dispatch(payrollActions.setFilters({ year: yearToUse, page: 1 }));
  };

  const handleMonthFilterChange = (month: number | FilterAll) => {
    dispatch(payrollActions.setFilters({ month, page: 1 }));
  };

  const handleRefresh = () => {
    dispatch(payrollActions.invalidateCache());
    // CRITICAL: entityId is validated at component level, so it's guaranteed to exist here
    fetchPayrollSchedulesData();
  };

  // Handle successful payroll generation
  const handlePayrollGenerated = () => {
    setIsGenerateModalOpen(false);
    // Invalidate cache and refetch
    dispatch(payrollActions.invalidateCache());
    // CRITICAL: entityId is validated at component level, so it's guaranteed to exist here
    fetchPayrollSchedulesData();
  };

  // Handle Generate Payroll button click with subscription check
  const handleGeneratePayrollClick = () => {
    console.log("[PayrollContent] handleGeneratePayrollClick called:", {
      hasPayrollAccess,
      entityId,
      accountType,
    });
    if (!hasPayrollAccess) {
      showUpgradePrompt({
        feature: "Payroll Management",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "company",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly,
        message: "Payroll management is available on Company plan (₦8,500/month) and above. Upgrade to unlock payroll generation, employee management, and PAYE calculations.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }
    console.log("[PayrollContent] Opening PayrollGenerationModal with props:", {
      entityId,
      accountType,
    });
    setIsGenerateModalOpen(true);
  };

  // Handle status update (approve or submit)
  const handleStatusUpdate = useCallback((scheduleId: string, newStatus: PayrollStatus) => {
    // CRITICAL: Validate scheduleId
    if (!scheduleId || typeof scheduleId !== "string" || scheduleId.trim().length === 0) {
      const errorMessage = "Schedule ID is required and must be a non-empty string";
      console.error("handleStatusUpdate: Invalid scheduleId provided", { scheduleId, errorMessage });
      toast.error("Invalid Schedule", {
        description: errorMessage,
      });
      return;
    }

    // CRITICAL: Validate status is a valid PayrollStatus enum value
    const validStatuses = [PayrollStatus.Approved, PayrollStatus.Submitted];
    if (!validStatuses.includes(newStatus)) {
      const errorMessage = `Invalid status: ${newStatus}. Only "approved" and "submitted" are allowed.`;
      console.error("handleStatusUpdate: Invalid status provided", { scheduleId, newStatus, errorMessage });
      toast.error("Invalid Status", {
        description: errorMessage,
      });
      return;
    }

    setUpdatingScheduleId(scheduleId);

    updateStatusReq({
      successRes: (response: any) => {
        const updatedSchedule = response?.data?.data;
        if (updatedSchedule) {
          // Update Redux state
          dispatch(payrollActions.updateSchedule(updatedSchedule));
          
          toast.success("Status Updated", {
            description: `Payroll schedule status updated to ${newStatus} successfully.`,
          });
        }
        setUpdatingScheduleId(null);
      },
      errorRes: (errorResponse: any) => {
        const errorMessage = errorResponse?.data?.description || "Failed to update payroll schedule status";
        console.error("Error updating payroll schedule status:", errorResponse);
        toast.error("Update Failed", {
          description: errorMessage,
        });
        setUpdatingScheduleId(null);
        return true;
      },
      requestConfig: {
        url: `/payroll/schedule/${scheduleId}/status`,
        method: HttpMethod.PUT,
        body: {
          status: newStatus,
        },
      },
    });
  }, [dispatch, updateStatusReq]);

  // Handle delete schedule
  const handleDeleteSchedule = useCallback((scheduleId: string) => {
    // CRITICAL: Validate scheduleId
    if (!scheduleId || typeof scheduleId !== "string" || scheduleId.trim().length === 0) {
      const errorMessage = "Schedule ID is required and must be a non-empty string";
      console.error("handleDeleteSchedule: Invalid scheduleId provided", { scheduleId, errorMessage });
      toast.error("Invalid Schedule", {
        description: errorMessage,
      });
      return;
    }

    setDeleteScheduleId(scheduleId);
  }, []);

  // Confirm and execute delete
  const handleConfirmDelete = useCallback(() => {
    if (!deleteScheduleId) return;

    const scheduleId = deleteScheduleId;

    deleteScheduleReq({
      successRes: () => {
        // Remove from Redux state
        dispatch(payrollActions.removeSchedule(scheduleId));
        
        toast.success("Schedule Deleted", {
          description: "Payroll schedule deleted successfully.",
        });
        
        setDeleteScheduleId(null);
        
        // If current page is empty after deletion, go to previous page
        const remainingSchedules = schedules.filter((s: PayrollSchedule) => s._id !== scheduleId);
        if (remainingSchedules.length === 0 && pagination.page > 1) {
          dispatch(payrollActions.setPage(pagination.page - 1));
        }
      },
      errorRes: (errorResponse: any) => {
        const errorMessage = errorResponse?.data?.description || "Failed to delete payroll schedule";
        console.error("Error deleting payroll schedule:", errorResponse);
        toast.error("Delete Failed", {
          description: errorMessage,
        });
        setDeleteScheduleId(null);
        return true;
      },
      requestConfig: {
        url: `/payroll/schedule/${scheduleId}`,
        method: HttpMethod.DELETE,
      },
    });
  }, [deleteScheduleId, dispatch, deleteScheduleReq, schedules, pagination.page]);

  const handleCancelDelete = useCallback(() => {
    if (!isDeletingSchedule) {
      setDeleteScheduleId(null);
    }
  }, [isDeletingSchedule]);

  // Handle view schedule
  const handleViewSchedule = useCallback((scheduleId: string) => {
    // CRITICAL: Validate scheduleId
    if (!scheduleId || typeof scheduleId !== "string" || scheduleId.trim().length === 0) {
      const errorMessage = "Schedule ID is required and must be a non-empty string";
      console.error("handleViewSchedule: Invalid scheduleId provided", { scheduleId, errorMessage });
      toast.error("Invalid Schedule", {
        description: errorMessage,
      });
      return;
    }
    setViewScheduleId(scheduleId);
  }, []);

  // Only show loading if we're actually fetching AND don't have data yet
  const shouldShowLoading = isLoading && !hasFetched;

  if (shouldShowLoading) {
    return <LoadingState message="Loading payroll..." size={LoadingStateSize.Md} />;
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Generate year options (from 2026 to current year, going backwards)
  const startYear = Math.max(currentYear, minTaxYear);
  const yearOptions = Array.from({ length: 11 }, (_, i) => {
    const year = startYear - i;
    if (year >= minTaxYear) {
      return { value: year, label: year.toString() };
    }
    return null;
  }).filter((option): option is { value: number; label: string } => option !== null);

  // Generate month options
  const monthOptions = [
    { value: FilterAll.All, label: "All Months" },
    ...monthNames.map((name, index) => ({
      value: index + 1,
      label: name,
    })),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Staff Salaries & Tax</h1>
            </div>
            <button
               onClick={() => setIsGuideModalOpen(true)}
               className="self-start sm:self-auto text-emerald-600 font-medium text-sm bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors flex items-center gap-2 whitespace-nowrap"
             >
               <span>How does this work?</span>
               <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 text-xs font-bold">?</div>
             </button>
          </div>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl">
            Pay your staff and calculate their taxes (PAYE) automatically.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
            <Button
              variant={ButtonVariant.Outline}
              onClick={() => router.push("/dashboard/employees")}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 w-full justify-center"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Manage Staff
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
            <Button onClick={handleGeneratePayrollClick} className="w-full justify-center">
              Run Payroll
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters */}
      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleStatusFilterChange(e.target.value as PayrollScheduleFilterStatus)}
              className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm"
            >
              <option value={PayrollScheduleFilterStatus.All}>All Statuses</option>
              <option value={PayrollScheduleFilterStatus.Draft}>Draft</option>
              <option value={PayrollScheduleFilterStatus.Approved}>Approved</option>
              <option value={PayrollScheduleFilterStatus.Submitted}>Submitted</option>
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600 mb-2">
              Year <span className="text-red-500">*</span>
            </label>
            <select
              value={filters.year}
              onChange={(e) => {
                const year = parseInt(e.target.value);
                handleYearFilterChange(Math.max(minTaxYear, year));
              }}
              className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm"
            >
              {yearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600 mb-2">
              Month
            </label>
            <select
              value={filters.month}
              onChange={(e) => {
                const value = e.target.value;
                if (value === FilterAll.All.toString()) {
                  handleMonthFilterChange(FilterAll.All);
                } else {
                  handleMonthFilterChange(parseInt(value));
                }
              }}
              className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm"
            >
              {monthOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Items Per Page */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600 mb-2">
              Items Per Page
            </label>
            <select
              value={filters.itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 border-2 border-emerald-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-4 flex justify-end">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={ButtonVariant.Outline}
              size={ButtonSize.Sm}
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </motion.div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Payroll Schedules List */}
      {schedules.length > 0 ? (
        <Card title={`Payroll Schedules (${pagination.total})`}>
          <div className="space-y-4">
            {schedules.map((schedule: PayrollSchedule) => (
              <motion.div
                key={schedule._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-slate-50 rounded-lg border-2 border-slate-200 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {monthNames[schedule.month - 1]} {schedule.year}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {schedule.totalEmployees} {schedule.totalEmployees === 1 ? "employee" : "employees"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                      schedule.status === PayrollStatus.Submitted
                        ? "bg-green-100 text-green-800"
                        : schedule.status === PayrollStatus.Approved
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-800"
                    }`}>
                      {schedule.status.toUpperCase()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewSchedule(schedule._id);
                      }}
                      className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                      aria-label="View payroll schedule details"
                    >
                      <Eye className="w-4 h-4 text-emerald-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSchedule(schedule._id);
                      }}
                      disabled={isDeletingSchedule}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Delete payroll schedule"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${schedule.totalITF && schedule.totalITF > 0 ? '5' : '4'} gap-4 mb-4`}>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Total Salary (Before Tax)</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(schedule.totalGrossSalary)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Tax to Deduct (PAYE)</p>
                    <p className="text-lg font-bold text-red-700">{formatCurrency(schedule.totalPAYE)}</p>
                    {schedule.totalPAYE === 0 && (
                      <p className="text-xs text-slate-500 mt-1 italic leading-relaxed">
                        No tax deduction needed. Income is within the ₦800k tax-free allowance.
                      </p>
                    )}
                  </div>
                  {/* ITF Liability - Only show if > 0 */}
                  {schedule.totalITF && schedule.totalITF > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-slate-600">ITF Liability</p>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded" title="Employer obligation: 1% of annual payroll">1%</span>
                      </div>
                      <p className="text-lg font-bold text-blue-700">{formatCurrency(schedule.totalITF)}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Due: Turnover ≥ ₦50M or 5+ Employees
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Staff Take-Home Pay</p>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(schedule.totalNetSalary)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Created</p>
                    <p className="text-sm font-medium text-slate-900">
                      {schedule.createdAt ? formatDate(new Date(schedule.createdAt)) : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Action Buttons - Only show for draft status */}
                {schedule.status === PayrollStatus.Draft && (
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                    <Button
                      variant={ButtonVariant.Outline}
                      size={ButtonSize.Sm}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(schedule._id, PayrollStatus.Approved);
                      }}
                      disabled={updatingScheduleId === schedule._id || !hasPayrollAccess}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {updatingScheduleId === schedule._id ? "Updating..." : "Approve"}
                    </Button>
                    <Button
                      variant={ButtonVariant.Outline}
                      size={ButtonSize.Sm}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(schedule._id, PayrollStatus.Submitted);
                      }}
                      disabled={updatingScheduleId === schedule._id || !hasPayrollAccess}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {updatingScheduleId === schedule._id ? "Updating..." : "Submit"}
                    </Button>
                  </div>
                )}

                {schedule.status === PayrollStatus.Approved && (
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                    <Button
                      variant={ButtonVariant.Outline}
                      size={ButtonSize.Sm}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(schedule._id, PayrollStatus.Submitted);
                      }}
                      disabled={updatingScheduleId === schedule._id || !hasPayrollAccess}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {updatingScheduleId === schedule._id ? "Updating..." : "Submit"}
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} schedules
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={ButtonVariant.Outline}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1 || isLoading}
                  className="border-2 border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          pagination.page === pageNum
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                            : "bg-white text-slate-700 hover:bg-emerald-50 border-2 border-emerald-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant={ButtonVariant.Outline}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages || isLoading}
                  className="border-2 border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="text-center py-16">
            <div className="text-6xl mb-6">💵</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              No payroll schedules found
            </h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Generate payroll for your employees to get started
            </p>
            <div className="flex justify-center space-x-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={ButtonVariant.Outline}
                  onClick={() => router.push("/dashboard/employees")}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employees
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={handleGeneratePayrollClick}>
                  Generate Payroll
                </Button>
              </motion.div>
            </div>
          </div>
        </Card>
      )}

      {/* Payroll Generation Modal */}
      {isGenerateModalOpen && console.log("[PayrollContent] Rendering PayrollGenerationModal with props:", { entityId, accountType, isOpen: isGenerateModalOpen })}
      <PayrollGenerationModal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          console.log("[PayrollContent] PayrollGenerationModal onClose called");
          setIsGenerateModalOpen(false);
        }}
        onSuccess={handlePayrollGenerated}
        entityId={entityId}
        accountType={accountType}
      />

      {/* Payroll Schedule Detail Modal */}
      <PayrollScheduleDetailModal
        isOpen={!!viewScheduleId}
        scheduleId={viewScheduleId}
        onClose={() => setViewScheduleId(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteScheduleId}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Payroll Schedule"
        message={
          deleteScheduleId
            ? (() => {
                const schedule = schedules.find((s: PayrollSchedule) => s._id === deleteScheduleId);
                if (schedule) {
                  return `Are you sure you want to delete the payroll schedule for ${monthNames[schedule.month - 1]} ${schedule.year}? This action cannot be undone. The schedule will be removed, but individual payroll records will remain.`;
                }
                return "Are you sure you want to delete this payroll schedule? This action cannot be undone.";
              })()
            : ""
        }
        confirmLabel="Delete Schedule"
        cancelLabel="Cancel"
        variant={ConfirmModalVariant.Danger}
        isLoading={isDeletingSchedule}
      />

      {/* Next Step Navigation */}
      <NextStepCard
        title="Next Step: File Your Returns"
        description="After processing payroll, remember to remit PAYE taxes to the State Internal Revenue Service."
        href="/dashboard/tax-filing"
        actionLabel="Go to Tax Filing"
      />

      {/* Upgrade Prompt */}
      <UpgradePromptComponent />
      <PayrollGuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
    </motion.div>
  );
}



