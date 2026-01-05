"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { employeesActions } from "@/store/redux/employees/employees-slice";
import { useDebounce } from "@/hooks/useDebounce";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { createErrorStateProps } from "@/components/shared/errorUtils";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { EmployeeFormModal } from "@/components/dashboard/employees/EmployeeFormModal";
import { EmployeeDetailModal } from "@/components/dashboard/employees/EmployeeDetailModal";
import { EmployeeGuideModal } from "@/components/dashboard/employees/EmployeeGuideModal";
import { Users, Plus, Search, Eye, UserCheck, UserX, ChevronLeft, ChevronRight, RefreshCw, Edit } from "lucide-react";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { ButtonVariant, ButtonSize, LoadingStateSize } from "@/lib/utils/client-enums";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";
import type { Employee } from "@/store/redux/employees/employees-slice";
import { toast } from "sonner";
import { NextStepCard } from "@/components/shared/NextStepCard";

interface EmployeesContentProps {
  entityId: string;
  accountType: AccountType;
  currentPlan: SubscriptionPlan;
}

export function EmployeesContent({ entityId, accountType, currentPlan }: EmployeesContentProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // CRITICAL: Validate entityId prop - fail loudly if missing
  if (!entityId) {
    throw new Error("EmployeesContent: entityId prop is required.");
  }

  // CRITICAL: Validate accountType prop - fail loudly if missing
  if (!accountType) {
    throw new Error("EmployeesContent: accountType prop is required.");
  }

  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(accountType)) {
    throw new Error(`EmployeesContent: Invalid accountType "${accountType}". Valid values are: ${validAccountTypes.join(", ")}.`);
  }

  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;

  // CRITICAL: Validate account type is Company or Business (Individual accounts don't have employees)
  if (!isCompanyAccount && !isBusinessAccount) {
    throw new Error(
      `EmployeesContent: Invalid account type "${accountType}". ` +
      `Expected AccountType.Company or AccountType.Business. ` +
      "Individual accounts do not have employee management."
    );
  }

  // CRITICAL: Validate currentPlan prop - fail loudly if missing or invalid
  if (!currentPlan) {
    throw new Error("EmployeesContent: currentPlan prop is required.");
  }

  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentPlan)) {
    throw new Error(`EmployeesContent: Invalid currentPlan "${currentPlan}". Valid values are: ${validPlans.join(", ")}.`);
  }

  // Get employees state from Redux
  const {
    employees,
    pagination,
    filters,
    hasFetched,
    isLoading,
    error,
    companyId: employeesCompanyId,
  } = useAppSelector((state: any) => state.employees);
  
  const { sendHttpRequest: fetchEmployeesReq } = useHttp();
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [viewEmployeeId, setViewEmployeeId] = useState<string | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();

  const hasPayrollAccess = SUBSCRIPTION_PRICING[currentPlan]?.features?.payroll === true;

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Sync entityId in Redux when it changes
  // CRITICAL: Employees Redux slice uses companyId field name, but it stores entityId (companyId or businessId)
  useEffect(() => {
    if (entityId && entityId !== employeesCompanyId) {
      dispatch(employeesActions.setCompanyId(entityId));
    }
  }, [entityId, employeesCompanyId, dispatch]);

  // Update search in Redux when debounced value changes
  useEffect(() => {
    if (debouncedSearchTerm !== filters.search) {
      dispatch(employeesActions.setSearch(debouncedSearchTerm));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  // Update page in Redux when it changes (for pagination)
  useEffect(() => {
    if (filters.page !== pagination.page) {
      // Page is already updated in Redux via setPage action
      // This effect just ensures sync
    }
  }, [filters.page, pagination.page]);

  // Fetch employees when:
  // 1. EntityId is available AND data hasn't been fetched for current filters
  // 2. Filters change (Redux sets hasFetched to false when filters change)
  useEffect(() => {
    // Don't fetch if already loading or if we don't have an entityId yet
    if (isLoading || !entityId) return;
    
    // Fetch if data hasn't been fetched for current filters
    if (!hasFetched) {
      fetchEmployeesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, filters.page, filters.search, filters.limit, hasFetched, isLoading]);

  const fetchEmployeesData = useCallback(() => {
    // CRITICAL: Validate entityId - fail loudly if missing
    if (!entityId) {
      throw new Error(
        "EmployeesContent.fetchEmployeesData: entityId is required. " +
        "This should be validated at component level before calling fetchEmployeesData."
      );
    }
    
    dispatch(employeesActions.setLoading(true));
    
    const params = new URLSearchParams({
      page: filters.page.toString(),
      limit: filters.limit.toString(),
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

    // CRITICAL: Use companyId or businessId query parameter based on account type
    if (isCompanyAccount) {
      params.append("companyId", entityId);
    } else if (isBusinessAccount) {
      params.append("businessId", entityId);
    } else {
      throw new Error(
        `EmployeesContent.fetchEmployeesData: Cannot determine query parameter for account type "${accountType}". ` +
        "This is a critical logic error."
      );
    }

    // Only add search if it's not empty
    if (filters.search.trim()) {
      params.append("search", filters.search.trim());
    }

    fetchEmployeesReq({
      successRes: (response: any) => {
        const data = response?.data?.data;
        const employeesList = data?.employees || [];
        const paginationData = data?.pagination || {
          page: filters.page,
          limit: filters.limit,
          total: employeesList.length,
          pages: 1,
        };

        // Store in Redux
        // CRITICAL: Employees Redux slice uses companyId field name, but it stores entityId (companyId or businessId)
        dispatch(employeesActions.setEmployees({
          employees: employeesList,
          pagination: paginationData,
          companyId: entityId, // Redux slice field name is companyId, but it stores entityId
        }));
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status;
        
        // Handle 403 errors - prevent infinite retries
        if (status === 403) {
          // Authorization/permission error - stop retrying
          dispatch(
            employeesActions.setError(
              errorResponse?.data?.description || "Failed to load employees"
            )
          );
          return false;
        } else if (status === 404) {
          // CRITICAL: Redirect to correct onboarding page based on account type
          const onboardingRoute = isCompanyAccount ? "/dashboard/company/onboard" : "/dashboard/business/onboard";
          router.push(onboardingRoute);
          return false;
        }
        dispatch(
          employeesActions.setError(
            errorResponse?.data?.description || "Failed to load employees"
          )
        );
        return true;
      },
      requestConfig: {
        url: `/employees?${params.toString()}`,
        method: HttpMethod.GET,
      },
    });
  }, [entityId, accountType, isCompanyAccount, isBusinessAccount, filters, isLoading, dispatch, fetchEmployeesReq, router]);

  const handleModalSuccess = useCallback((newOrUpdatedEmployee?: any) => {
    if (newOrUpdatedEmployee && newOrUpdatedEmployee._id) {
      // Check if this is an edit (employee already exists in list) or create (new employee)
      const existingIndex = employees.findIndex(
        (emp: Employee) => emp._id === newOrUpdatedEmployee._id
      );

      if (existingIndex !== -1) {
        // Employee exists in list - this is an edit
        dispatch(employeesActions.updateEmployee(newOrUpdatedEmployee));
      } else {
        // Employee doesn't exist in list - this is a create
        // Add to Redux list (will only add if on page 1 and matches filters)
        dispatch(
          employeesActions.addEmployee({
            employee: newOrUpdatedEmployee,
            companyId: entityId, // Use entityId instead of selectedCompanyId
          })
        );
      }
    }
  }, [dispatch, employees, entityId]);

  const handleDeleteEmployee = useCallback((employeeId: string) => {
    // CRITICAL: Validate employeeId - fail loudly if missing or invalid
    if (!employeeId || typeof employeeId !== "string" || employeeId.trim().length === 0) {
      const errorMessage = "Employee ID is required and must be a non-empty string";
      console.error("handleDeleteEmployee: Invalid employeeId provided", { employeeId, errorMessage });
      toast.error("Invalid Employee", {
        description: errorMessage,
      });
      return;
    }
    // Remove employee from Redux state
    dispatch(employeesActions.removeEmployee(employeeId));
  }, [dispatch]);

  const handleViewEmployee = useCallback((employeeId: string) => {
    // CRITICAL: Validate employeeId - fail loudly if missing or invalid
    if (!employeeId || typeof employeeId !== "string" || employeeId.trim().length === 0) {
      const errorMessage = "Employee ID is required and must be a non-empty string";
      console.error("handleViewEmployee: Invalid employeeId provided", { employeeId, errorMessage });
      toast.error("Invalid Employee", {
        description: errorMessage,
      });
      return;
    }
    setViewEmployeeId(employeeId);
  }, []);

  const handleEditEmployee = useCallback((employeeId: string) => {
    // CRITICAL: Validate employeeId - fail loudly if missing or invalid
    if (!employeeId || typeof employeeId !== "string" || employeeId.trim().length === 0) {
      const errorMessage = "Employee ID is required and must be a non-empty string";
      console.error("handleEditEmployee: Invalid employeeId provided", { employeeId, errorMessage });
      toast.error("Invalid Employee", {
        description: errorMessage,
      });
      return;
    }

    // CRITICAL: Check payroll access before allowing edit
    if (!hasPayrollAccess) {
      showUpgradePrompt({
        feature: "Employee Management",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "company",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly,
        message: "Employee management is available on Company plan (₦8,500/month) and above. Upgrade to manage employees and process payroll.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }

    setViewEmployeeId(null); // Close detail modal
    setEditEmployeeId(employeeId);
  }, [hasPayrollAccess, currentPlan, showUpgradePrompt]);

  const handleCloseDetailModal = useCallback(() => {
    setViewEmployeeId(null);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditEmployeeId(null);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    // Validate page number
    if (newPage < 1 || newPage > pagination.pages) {
      return;
    }
    // Update page in Redux (this will invalidate cache and trigger refetch)
    dispatch(employeesActions.setPage(newPage));
    // Scroll to top of the page when paginating
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pagination.pages, dispatch]);

  // Show loading state until employees data is fetched
  const shouldShowLoading = isLoading && !hasFetched && employees.length === 0;
  
  if (shouldShowLoading && !error) {
    return <LoadingState message="Loading employees..." size={LoadingStateSize.Md} />;
  }

  // Show error state with retry button
  if (error && !employees.length && !isLoading && hasFetched) {
    const errorProps = createErrorStateProps(error);
    return (
      <ErrorState
        {...errorProps}
        title="Could Not Load Employees"
        primaryAction={{
          label: "Try Again",
          onClick: fetchEmployeesData,
          icon: RefreshCw,
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
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
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Staff Management</h1>
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
            List all your staff members here to pay them correctly.
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full md:w-auto">
          <Button 
            className="w-full md:w-auto justify-center"
            onClick={() => {
              if (!hasPayrollAccess) {
                showUpgradePrompt({
                  feature: "Employee Management",
                  currentPlan: currentPlan.toLowerCase(),
                  requiredPlan: "company",
                  requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly,
                  message: "Employee management is available on Company plan (₦8,500/month) and above. Upgrade to manage employees and process payroll.",
                  reason: UpgradeReason.PlanLimitation,
                });
              } else {
                setIsModalOpen(true);
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>
      </motion.div>

      {employees.length === 0 && !isLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="text-6xl mb-6"
              >
                👥
              </motion.div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                No employees found
              </h3>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                {filters.search
                  ? "No staff members match your search criteria. Try adjusting your search terms."
                  : "Add your first staff member to start processing payroll"}
              </p>
              {!filters.search && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={() => {
                      if (!hasPayrollAccess) {
                        showUpgradePrompt({
                          feature: "Employee Management",
                          currentPlan: currentPlan.toLowerCase(),
                          requiredPlan: "company",
                          requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly,
                          message: "Employee management is available on Company plan (₦8,500/month) and above. Upgrade to manage employees and process payroll.",
                          reason: UpgradeReason.PlanLimitation,
                        });
                      } else {
                        setIsModalOpen(true);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Staff
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            {/* Desktop Table - Hidden on Mobile */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-emerald-50 to-white">
                  <tr>
                    {["Staff ID", "Name", "Email", "Monthly Salary", "Status", ""].map((header, index) => (
                      <th
                        key={index}
                        className={`px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider ${
                          header === "" ? "text-center" : "text-left"
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {isLoading && employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <LoadingState message="Loading staff list..." size={LoadingStateSize.Sm} />
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee: Employee, index: number) => (
                      <motion.tr
                        key={employee._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleViewEmployee(employee._id)}
                        className="hover:bg-emerald-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                          {employee.employeeId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {employee.firstName} {employee.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {employee.email || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                          {formatCurrency(employee.salary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              employee.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {employee.isActive ? (
                              <>
                                <UserCheck className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3 mr-1" />
                                Left
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewEmployee(employee._id);
                              }}
                              className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                              aria-label="View employee details"
                            >
                              <Eye className="w-4 h-4 text-emerald-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEmployee(employee._id);
                              }}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              aria-label="Edit employee"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List - Visible on Mobile */}
            <div className="md:hidden space-y-4 p-4 bg-slate-50/50">
               {isLoading && employees.length === 0 ? (
                  <div className="py-12 text-center">
                    <LoadingState message="Loading staff list..." size={LoadingStateSize.Sm} />
                  </div>
                ) : (
                  employees.map((employee: Employee, index: number) => (
                    <motion.div
                      key={employee._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleViewEmployee(employee._id)}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{employee.firstName} {employee.lastName}</h3>
                            <p className="text-xs text-slate-500">{employee.employeeId}</p>
                          </div>
                        </div>
                         <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              employee.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {employee.isActive ? 'Active' : 'Left'}
                          </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Weekly/Monthly Pay</p>
                          <p className="font-bold text-slate-900">{formatCurrency(employee.salary)}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                           <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Email</p>
                          <p className="text-xs text-slate-700 truncate">{employee.email || "—"}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant={ButtonVariant.Outline}
                          size={ButtonSize.Sm}
                          className="flex-1 justify-center border-slate-200 text-slate-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewEmployee(employee._id);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-2" />
                          View
                        </Button>
                        <Button
                          variant={ButtonVariant.Outline}
                          size={ButtonSize.Sm}
                          className="flex-1 justify-center border-blue-200 text-blue-600 bg-blue-50/50"
                           onClick={(e) => {
                            e.stopPropagation();
                            handleEditEmployee(employee._id);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-emerald-100 gap-4"
              >
                <div className="text-sm text-slate-600">
                  Showing{" "}
                  <span className="font-bold text-slate-900">
                    {pagination.total > 0 ? (pagination.page - 1) * filters.limit + 1 : 0}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-slate-900">
                    {Math.min(pagination.page * filters.limit, pagination.total)}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-emerald-600">{pagination.total}</span>{" "}
                  employee{pagination.total !== 1 ? "s" : ""}
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

                <div className="text-sm text-slate-600 hidden sm:block">
                  Page <span className="font-bold text-emerald-600">{pagination.page}</span> of{" "}
                  <span className="font-bold text-slate-900">{pagination.pages}</span>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        isOpen={!!viewEmployeeId}
        employeeId={viewEmployeeId}
        onClose={handleCloseDetailModal}
        onEdit={handleEditEmployee}
        onDelete={handleDeleteEmployee}
      />

      {/* Employee Form Modal - Add */}
      <EmployeeFormModal
        isOpen={isModalOpen && !editEmployeeId}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        companyId={entityId}
        accountType={accountType}
      />

      {/* Employee Form Modal - Edit */}
      <EmployeeFormModal
        isOpen={!!editEmployeeId}
        employeeId={editEmployeeId}
        onClose={handleCloseEditModal}
        onSuccess={handleModalSuccess}
        companyId={entityId}
        accountType={accountType}
      />

      {/* Next Step Navigation */}
      <NextStepCard
        title="Next Step: Process Payroll"
        description="Your employee records are set. You can now generate payroll and calculate PAYE."
        href="/dashboard/payroll"
        actionLabel="Go to Payroll"
      />

      {/* Upgrade Prompt */}
      <UpgradePromptComponent />
      <EmployeeGuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
    </motion.div>
  );
}



