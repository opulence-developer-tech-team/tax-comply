"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { AccountType } from "@/lib/utils/account-type";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { Save, X, AlertCircle, Calendar, Users, CheckCircle2 } from "lucide-react";
import { NairaSign } from "@/components/icons/NairaSign";
import { Alert } from "@/components/ui/Alert";
import { AlertVariant, ButtonVariant } from "@/lib/utils/client-enums";
import { toast } from "sonner";

interface PayrollGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  entityId: string;
  accountType: AccountType;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

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

export function PayrollGenerationModal({
  isOpen,
  onClose,
  onSuccess,
  entityId,
  accountType,
}: PayrollGenerationModalProps) {
  // CRITICAL: Validate entityId prop - fail loudly if missing
  if (!entityId) {
    throw new Error("PayrollGenerationModal: entityId prop is required.");
  }

  // CRITICAL: Validate accountType prop - fail loudly if missing or invalid
  if (!accountType) {
    throw new Error("PayrollGenerationModal: accountType prop is required.");
  }

  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(accountType)) {
    throw new Error(
      `PayrollGenerationModal: Invalid accountType "${accountType}". Valid values are: ${validAccountTypes.join(", ")}.`
    );
  }

  // CRITICAL: Validate account type is Company or Business (Individual accounts don't have payroll)
  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;
  if (!isCompanyAccount && !isBusinessAccount) {
    throw new Error(
      `PayrollGenerationModal: Invalid account type "${accountType}". Expected AccountType.Company or AccountType.Business. Individual accounts do not have payroll management.`
    );
  }

  const { isLoading: isSubmitting, sendHttpRequest: submitRequest } = useHttp();
  const { isLoading: isLoadingEmployees, sendHttpRequest: fetchEmployeesReq } = useHttp();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  
  const [error, setError] = useState<string | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [isCheckingEmployees, setIsCheckingEmployees] = useState(false);

  // DEBUG: Log props on mount/update
  useEffect(() => {
    console.log("[PayrollGenerationModal] Props received:", {
      entityId,
      accountType,
      isOpen,
      isCompanyAccount,
      isBusinessAccount,
    });
  }, [entityId, accountType, isOpen, isCompanyAccount, isBusinessAccount]);

  // Initialize with current month/year
  // CRITICAL: This app only supports 2026+ tax laws per Nigeria Tax Act 2025
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = Math.max(2026, now.getFullYear()); // Ensure minimum year is 2026

  const { values, errors, touched, handleChange, handleBlur, validate, setValues } = useForm(
    {
      month: currentMonth.toString(),
      year: currentYear.toString(),
    },
    {
      month: {
        required: true,
        custom: (value: string) => {
          const month = parseInt(value);
          if (isNaN(month) || month < 1 || month > 12) {
            return "Month must be between 1 and 12";
          }
          // If current year, don't allow future months
          const year = parseInt(values.year);
          if (year === currentYear && month > currentMonth) {
            return "Month cannot be in the future";
          }
          return null;
        },
      },
      year: {
        required: true,
        custom: (value: string) => {
          const year = parseInt(value);
          // CRITICAL: This app only supports 2026+ tax laws per Nigeria Tax Act 2025
          if (isNaN(year) || year < 2026 || year > 2100) {
            return "Year must be between 2026 and 2100. This application only supports tax years 2026 and later per Nigeria Tax Act 2025";
          }
          // Don't allow future years
          if (year > currentYear) {
            return "Year cannot be in the future";
          }
          return null;
        },
      },
    }
  );

  // Check employee count when modal opens or month/year changes
  useEffect(() => {
    console.log("[PayrollGenerationModal] useEffect triggered:", {
      isOpen,
      entityId,
      month: values.month,
      year: values.year,
    });
    if (isOpen && entityId) {
      console.log("[PayrollGenerationModal] Calling checkEmployeeCount...");
      checkEmployeeCount();
    } else {
      console.log("[PayrollGenerationModal] Skipping checkEmployeeCount:", {
        isOpen,
        entityId,
        reason: !isOpen ? "modal not open" : "entityId missing",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entityId, values.month, values.year]);

  const checkEmployeeCount = async () => {
    console.log("[PayrollGenerationModal] checkEmployeeCount called with:", {
      entityId,
      accountType,
      isCompanyAccount,
      isBusinessAccount,
    });

    if (!entityId) {
      console.error("[PayrollGenerationModal] checkEmployeeCount: entityId is missing!");
      return;
    }

    setIsCheckingEmployees(true);
    
    // CRITICAL: Use correct parameter based on accountType
    // CRITICAL: API maximum limit is 100 - use 100 instead of 1000
    const entityParam = isCompanyAccount ? "companyId" : "businessId";
    const url = `/employees?${entityParam}=${entityId}&page=1&limit=100&sortBy=createdAt&sortOrder=desc&isActive=true`;
    
    console.log("[PayrollGenerationModal] Fetching employees from:", {
      url,
      entityParam,
      entityId,
      accountType,
      method: HttpMethod.GET,
    });
    
    fetchEmployeesReq({
      successRes: (response: any) => {
        console.log("[PayrollGenerationModal] Employee fetch SUCCESS:", {
          response,
          data: response?.data,
          employeesData: response?.data?.data,
          employees: response?.data?.data?.employees,
          employeesCount: response?.data?.data?.employees?.length,
        });
        
        const employees = response?.data?.data?.employees || [];
        console.log("[PayrollGenerationModal] Processing employees:", {
          totalEmployees: employees.length,
          employees: employees.map((emp: any) => ({
            id: emp._id,
            employeeId: emp.employeeId,
            name: `${emp.firstName} ${emp.lastName}`,
            isActive: emp.isActive,
          })),
        });
        
        // IMPORTANT: Align with server logic – only count employees that are explicitly active
        // The backend uses { isActive: true } when generating payroll.
        // Treating "undefined" as active here would confuse users and fail at generation time.
        const activeEmployees = employees.filter((emp: any) => emp.isActive === true);
        console.log("[PayrollGenerationModal] Active employees:", {
          activeCount: activeEmployees.length,
          activeEmployees: activeEmployees.map((emp: any) => ({
            id: emp._id,
            employeeId: emp.employeeId,
            name: `${emp.firstName} ${emp.lastName}`,
          })),
        });
        
        setEmployeeCount(activeEmployees.length);
        setIsCheckingEmployees(false);
      },
      errorRes: (errorResponse: any) => {
        // CRITICAL: Log full error details for debugging
        console.error("[PayrollGenerationModal] Employee fetch ERROR - Full error object:", errorResponse);
        console.error("[PayrollGenerationModal] Employee fetch ERROR - Error type:", typeof errorResponse);
        console.error("[PayrollGenerationModal] Employee fetch ERROR - Error keys:", errorResponse ? Object.keys(errorResponse) : "errorResponse is null/undefined");
        console.error("[PayrollGenerationModal] Employee fetch ERROR - Error stringified:", JSON.stringify(errorResponse, null, 2));
        console.error("[PayrollGenerationModal] Employee fetch ERROR - Request URL:", url);
        
        // Try to extract error message from various possible locations
        const errorMessage = errorResponse?.response?.data?.description 
          || errorResponse?.data?.description 
          || errorResponse?.message 
          || errorResponse?.response?.data?.message
          || String(errorResponse);
        
        console.error("[PayrollGenerationModal] Employee fetch ERROR - Extracted message:", errorMessage);
        console.error("[PayrollGenerationModal] Employee fetch ERROR - Status:", errorResponse?.response?.status || errorResponse?.status);
        console.error("[PayrollGenerationModal] Employee fetch ERROR - Status text:", errorResponse?.response?.statusText || errorResponse?.statusText);
        
        setEmployeeCount(0);
        setIsCheckingEmployees(false);
        return false; // Don't show error toast, just set count to 0
      },
      requestConfig: {
        url,
        method: HttpMethod.GET,
      },
    });
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setValues({
        month: currentMonth.toString(),
        year: currentYear.toString(),
      });
    }
  }, [isOpen, setValues, currentMonth, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("---------------------------------------------------");
    console.log("[DEBUG] Payroll Generation Submit Triggered");
    console.log("[DEBUG] Current State:", {
      entityId,
      accountType,
      isCompanyAccount,
      isBusinessAccount,
      employeeCount,
      values,
      isValidating: 'validating...',
    });

    // Validate all form fields
    const isValid = validate();
    if (!isValid) {
      console.log("[DEBUG] Validation Failed", errors);
      setError("Please fix the errors in the form before submitting.");
      return;
    }

    // CRITICAL: Validate entityId exists - fail loudly if missing
    if (!entityId) {
      console.error("[DEBUG] Missing entityId");
      const entityName = isCompanyAccount ? "Company" : "Business";
      setError(`${entityName} ID is required. Please complete onboarding first.`);
      return;
    }

    // Check if there are active employees
    if (employeeCount === 0) {
      console.error("[DEBUG] Employee Count is 0. Request blocked locally.");
      setError("No active employees found. Please add employees before generating payroll.");
      return;
    }

    const month = parseInt(values.month);
    const year = parseInt(values.year);

    // Final validation - don't allow future dates
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      console.error("[DEBUG] Future date selected", { month, year, currentMonth, currentYear });
      setError("Cannot generate payroll for future periods.");
      return;
    }

    // CRITICAL: Build request body with correct parameter based on accountType
    const requestBody: any = {
      month,
      year,
      accountType, // Explicitly pass accountType to help backend context switching
    };
    
    if (isCompanyAccount) {
      requestBody.companyId = entityId;
    } else {
      requestBody.businessId = entityId;
    }

    // CRITICAL: Construct URL with businessId query param for Business accounts
    // The server middleware likely requires businessId in query params for authorization
    let requestUrl = "/payroll/generate";
    if (isBusinessAccount) {
      requestUrl += `?businessId=${entityId}`;
    }

    console.log("[DEBUG] Preparing API Request:", {
      url: requestUrl,
      method: HttpMethod.POST,
      body: requestBody,
    });

    submitRequest({
      successRes: (response: any) => {
        console.log("[DEBUG] API Success Response:", response);
        const data = response?.data?.data;
        const payrollCount = data?.payrollCount || data?.payrolls?.length || 0;
        
        toast.success("Payroll Generated", {
          description: `Payroll generated successfully for ${payrollCount} employee${payrollCount !== 1 ? "s" : ""}.`,
        });

        if (onSuccess) onSuccess();
        onClose();
      },
      errorRes: (errorResponse: any) => {
        console.error("[DEBUG] API Error Response:", errorResponse);
        console.error("[DEBUG] API Error Status:", errorResponse?.status);
        console.error("[DEBUG] API Error Data:", errorResponse?.data);

        // Check if this is an upgrade-required error
        if (errorResponse?.status === 403 && errorResponse?.data?.data?.upgradeRequired) {
          const upgradeData = errorResponse.data.data.upgradeRequired;
          showUpgradePrompt({
            feature: "Payroll Management",
            currentPlan: upgradeData.currentPlan,
            requiredPlan: upgradeData.requiredPlan,
            requiredPlanPrice: upgradeData.requiredPlanPrice,
            message: errorResponse?.data?.description || "Payroll management is available on Company plan and above. Upgrade to unlock this feature.",
            reason: upgradeData.reason,
          });
          return false; // Don't show error toast, upgrade prompt handles it
        }
        
        const errorMessage =
          errorResponse?.data?.description ||
          "Failed to generate payroll. Please try again.";
        setError(errorMessage);
        return true;
      },
      requestConfig: {
        url: requestUrl,
        method: HttpMethod.POST,
        body: requestBody,
      },
    });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const selectedMonthName = monthNames[parseInt(values.month) - 1] || "";

  return (
    <>
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Payroll"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
              <NairaSign className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Generate Payroll for Employees
            </h2>
          </div>
          <p className="text-slate-600 ml-14">
            Generate payroll calculations for all active employees for the selected period.
          </p>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants}>
            <Alert variant={AlertVariant.Error} title="Error">
              {error}
            </Alert>
          </motion.div>
        )}

        {/* Employee Count Info */}
        {isCheckingEmployees ? (
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-blue-50/50 to-white border-2 border-blue-100">
              <div className="flex items-center gap-3 p-4">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-600">Checking active employees...</p>
              </div>
            </Card>
          </motion.div>
        ) : employeeCount > 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-emerald-50/50 to-white border-2 border-emerald-100">
              <div className="flex items-center gap-3 p-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Users className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {employeeCount} Active Employee{employeeCount !== 1 ? "s" : ""} Found
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Payroll will be generated for all active employees
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-amber-50/50 to-white border-2 border-amber-100">
              <div className="flex items-center gap-3 p-4">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    No Active Employees Found
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Please add employees before generating payroll
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
        >
          {/* Period Selection */}
          <motion.div variants={itemVariants}>
            <Card 
              title="Select Payroll Period"
              className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="month"
                    value={values.month}
                    onChange={handleChange("month")}
                    onBlur={handleBlur("month")}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium transition-all ${
                      touched.month && errors.month
                        ? "border-red-400 bg-red-50"
                        : "border-emerald-200"
                    }`}
                  >
                    {monthNames.map((month, index) => (
                      <option key={index + 1} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                  {touched.month && errors.month && (
                    <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center">
                      <span className="mr-1">⚠</span>
                      {errors.month}
                    </p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="year"
                    value={values.year}
                    onChange={handleChange("year")}
                    onBlur={handleBlur("year")}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium transition-all ${
                      touched.year && errors.year
                        ? "border-red-400 bg-red-50"
                        : "border-emerald-200"
                    }`}
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      // CRITICAL: This app only supports 2026+ tax laws per Nigeria Tax Act 2025
                      // Start from 2026 and go forward
                      const year = Math.max(2026, currentYear) + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                  {touched.year && errors.year && (
                    <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center">
                      <span className="mr-1">⚠</span>
                      {errors.year}
                    </p>
                  )}
                </motion.div>
              </div>

              {values.month && values.year && !errors.month && !errors.year && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">
                      Payroll will be generated for: <strong>{selectedMonthName} {values.year}</strong>
                    </span>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>

          {/* Important Notes */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-blue-50/50 to-white border-2 border-blue-100">
              <div className="p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  Important Information
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Payroll will be generated for <strong>all active employees</strong> only.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Calculations include: <strong>PAYE, Pension (8% employee, 10% employer), NHF (2.5%), NHIS (5%)</strong> based on NRS regulations.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>Tax-exempt income (₦800,000)</strong> is automatically applied to reduce taxable income per Nigeria Tax Act 2025.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>If payroll already exists for this period, it will be <strong>regenerated</strong> (existing records will be updated).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>You can generate payroll for <strong>past periods</strong> but not future periods.</span>
                  </li>
                </ul>
              </div>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.3 }}
            className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-emerald-100"
          >
            <Button
              type="button"
              variant={ButtonVariant.Outline}
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || !entityId || employeeCount === 0 || !!errors.month || !!errors.year}
              className="w-full sm:w-auto min-w-[180px] bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
            >
              <Save className="w-4 h-4" />
              Generate Payroll
            </Button>
          </motion.div>
        </motion.form>
      </motion.div>
    </FullScreenModal>
    
    {/* Upgrade Prompt */}
    <UpgradePromptComponent />
    </>
  );
}

