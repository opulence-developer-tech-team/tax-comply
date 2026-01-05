"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/SearchableSelect";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { Users, Save, X, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/shared/LoadingState";
import { AlertVariant, LoadingStateSize, ButtonVariant } from "@/lib/utils/client-enums";
import { toast } from "sonner";

import { AccountType } from "@/lib/utils/account-type";

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedEmployee?: any) => void; // Pass updated employee for Redux update
  employeeId?: string | null; // If provided, modal is in edit mode
  companyId?: string; // Optional: If provided, uses this ID (supports both Company and Business IDs)
  accountType?: AccountType; // Optional: To distinguish between Company and Business
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

// Nigerian phone number pattern (supports international format with +234 or 0)
const NIGERIAN_PHONE_PATTERN = /^(\+234|0)?[789]\d{9}$/;

// Account number pattern (10 digits)
const ACCOUNT_NUMBER_PATTERN = /^\d{10}$/;

export function EmployeeFormModal({
  isOpen,
  onClose,
  onSuccess,
  employeeId = null,
  companyId: propCompanyId,
  accountType = AccountType.Company, // Default to Company for backward compatibility
}: EmployeeFormModalProps) {
  const { isLoading: isSubmitting, sendHttpRequest: submitRequest } = useHttp();
  const { isLoading: isLoadingBanks, sendHttpRequest: fetchBanksReq } = useHttp();
  const { sendHttpRequest: verifyAccountReq } = useHttp();
  const { isLoading: isLoadingEmployee, sendHttpRequest: fetchEmployeeReq } = useHttp();
  const isEditMode = !!employeeId;
  
  // Get selectedCompanyId from Redux (fallback if prop not provided)
  const { selectedCompanyId: reduxCompanyId } = useAppSelector((state: any) => state.company);
  
  // CRITICAL: Prioritize propCompanyId (passed from parent) over Redux
  // Business accounts won't have reduxCompanyId set, so passing it is mandatory
  const companyId = propCompanyId || reduxCompanyId;
  // Get subscription from Redux subscription slice (user-based, works for both individual and company accounts)
  const { currentSubscription } = useAppSelector((state: any) => state.subscription);
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  // CRITICAL: No fallback - validate subscription exists and has plan
  // If subscription is not loaded, hasPayrollAccess will be false (safer than assuming Free)
  const currentPlan = currentSubscription?.plan;
  const hasPayrollAccess = currentPlan && currentPlan in SUBSCRIPTION_PRICING 
    ? (SUBSCRIPTION_PRICING[currentPlan as keyof typeof SUBSCRIPTION_PRICING]?.features?.payroll === true) 
    : false;
  const [error, setError] = useState<string | null>(null);
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [accountVerified, setAccountVerified] = useState(false);
  const [isVerifyingAccountState, setIsVerifyingAccount] = useState(false);
  const [accountVerificationError, setAccountVerificationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const verificationRef = useRef<{ accountNumber: string; bankCode: string } | null>(null);

  const { values, errors, touched, handleChange, handleBlur, validate, setValues, setValue } = useForm(
    {
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: "",
      dateOfEmployment: new Date().toISOString().split("T")[0],
      salary: "",
      taxIdentificationNumber: "",
      bankCode: "",
      bankName: "",
      accountNumber: "",
      accountName: "",
      // NOTE: Form initial values (UI only) - user must explicitly submit form with these values
      // Backend requires these fields explicitly - no defaults on server side
      isActive: true,
      hasPension: true,
      hasNHF: true,
      hasNHIS: true,
    },
    {
      employeeId: {
        required: true, // Required for validation, but field is disabled in edit mode so it will always have a value
        minLength: 2,
        maxLength: 50,
        custom: (value: string) => {
          if (!value.trim()) return null;
          // Employee ID should be alphanumeric
          if (!/^[A-Za-z0-9-_]+$/.test(value)) {
            return "Employee ID can only contain letters, numbers, hyphens, and underscores";
          }
          return null;
        },
      },
      firstName: {
        required: true,
        minLength: 2,
        maxLength: 50,
        custom: (value: string) => {
          if (!value.trim()) return null;
          // Name should only contain letters, spaces, hyphens, and apostrophes
          if (!/^[A-Za-z\s'-]+$/.test(value)) {
            return "First name can only contain letters, spaces, hyphens, and apostrophes";
          }
          return null;
        },
      },
      lastName: {
        required: true,
        minLength: 2,
        maxLength: 50,
        custom: (value: string) => {
          if (!value.trim()) return null;
          // Name should only contain letters, spaces, hyphens, and apostrophes
          if (!/^[A-Za-z\s'-]+$/.test(value)) {
            return "Last name can only contain letters, spaces, hyphens, and apostrophes";
          }
          return null;
        },
      },
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        custom: (value: string) => {
          if (!value) return null; // Email is optional
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return "Please enter a valid email address";
          }
          return null;
        },
      },
      phoneNumber: {
        custom: (value: string) => {
          if (!value) return null; // Phone is optional
          // Remove spaces and normalize
          const normalized = value.replace(/\s+/g, "");
          if (!NIGERIAN_PHONE_PATTERN.test(normalized)) {
            return "Please enter a valid Nigerian phone number (e.g., +2348012345678 or 08012345678)";
          }
          return null;
        },
      },
      dateOfBirth: {
        custom: (value: string) => {
          if (!value) return null; // Date of birth is optional
          const dob = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            // Birthday hasn't occurred this year
            if (age < 16) {
              return "Employee must be at least 16 years old";
            }
          } else if (age < 16) {
            return "Employee must be at least 16 years old";
          }
          
          if (age > 100) {
            return "Please enter a valid date of birth";
          }
          
          return null;
        },
      },
      dateOfEmployment: {
        required: true,
        custom: (value: string) => {
          if (!value) return null;
          const empDate = new Date(value);
          const today = new Date();
          today.setHours(23, 59, 59, 999); // Set to end of day
          
          if (empDate > today) {
            return "Date of employment cannot be in the future";
          }
          
          // Check if date is more than 50 years ago (probably a mistake)
          const fiftyYearsAgo = new Date();
          fiftyYearsAgo.setFullYear(today.getFullYear() - 50);
          if (empDate < fiftyYearsAgo) {
            return "Date of employment seems too far in the past. Please verify.";
          }
          
          return null;
        },
      },
      salary: {
        required: true,
        custom: (value: string) => {
          if (!value) return "Salary is required";
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            return "Salary must be a valid number";
          }
          if (numValue < 0) {
            return "Salary cannot be negative";
          }
          // Check for too many decimal places
          const decimals = value.split(".")[1];
          if (decimals && decimals.length > 2) {
            return "Salary can have at most 2 decimal places";
          }
          return null;
        },
      },
      taxIdentificationNumber: {
        required: true,
        custom: (value: string) => {
          if (!value) return "TIN is required by NRS regulations";
          // NRS (Nigeria Revenue Service) TIN format: 10-12 digits (consistent for companies and individuals)
          // Reference: NRS (Nigeria Revenue Service) - formerly NRS (https://www.firs.gov.ng/)
          // NOTE: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
          const normalized = value.replace(/\s+/g, "").replace(/-/g, "");
          if (!/^\d{10,12}$/.test(normalized)) {
            return "TIN must be 10-12 digits";
          }
          return null;
        },
      },
      bankCode: {
        custom: (value: string) => {
          // Bank code is optional, but if provided should be a valid code
          if (!value) return null;
          // Bank codes are typically 3-digit strings (e.g., "058" for GTBank)
          if (!/^[A-Za-z0-9]{2,10}$/.test(value)) {
            return "Invalid bank format";
          }
          return null;
        },
      },
      bankName: {
        maxLength: 100,
        // No validation needed - bank name is auto-populated from bank list
        // and can contain any characters including parentheses
      },
      accountNumber: {
        custom: (value: string) => {
          if (!value) return null; // Account number is optional
          const normalized = value.replace(/\s+/g, "");
          if (!ACCOUNT_NUMBER_PATTERN.test(normalized)) {
            return "Account number must be exactly 10 digits";
          }
          return null;
        },
      },
      accountName: {
        maxLength: 100,
        custom: (value: string) => {
          if (!value) return null; // Account name is optional
          if (!/^[A-Za-z\s'-]+$/.test(value)) {
            return "Account name can only contain letters, spaces, hyphens, and apostrophes";
          }
          return null;
        },
      },
    }
  );

  /**
   * CRITICAL: Scroll to First Validation Error
   * 
   * Scrolls to the first field with a validation error in the order fields appear in the form.
   */
  const scrollToFirstError = useCallback((validationErrors: string[]) => {
    // CRITICAL: Field order matches form layout for accurate scrolling
    const fieldOrder = [
      "employeeId",
      "dateOfEmployment",
      "firstName",
      "lastName",
      "email",
      "phoneNumber",
      "dateOfBirth",
      "salary",
      "taxIdentificationNumber",
      "bankCode",
      "accountNumber",
      "accountName"
    ];
    
    // Find first error field based on form order
    const firstErrorField = fieldOrder.find(field => validationErrors.includes(field));
    
    if (!firstErrorField) {
      return;
    }
    
    // Wait for DOM updates, then scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let errorElement: HTMLElement | null = null;
        
        // Try multiple selector patterns to find the input
        const selectors = [
          `input[name="${firstErrorField}"]`,
          `select[name="${firstErrorField}"]`,
          `button[name="${firstErrorField}"]`, // For SearchableSelect
          `textarea[name="${firstErrorField}"]`,
          `[id*="${firstErrorField}"]`,
        ];
        
        for (const selector of selectors) {
          errorElement = document.querySelector(selector) as HTMLElement;
          if (errorElement) break;
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

  // Auto-scroll to error when validation updates
  useEffect(() => {
    if (isValidating && Object.keys(errors).length > 0) {
      const validationErrors = Object.keys(errors);
      setError(`Please fix the errors in the form before submitting. ${validationErrors.length > 0 ? `Errors: ${validationErrors.join(", ")}` : ""}`);
      scrollToFirstError(validationErrors);
      setIsValidating(false);
    }
  }, [isValidating, errors, scrollToFirstError]);

  // Fetch banks when modal opens
  useEffect(() => {
    if (isOpen && banks.length === 0) {
      fetchBanksReq({
        requestConfig: {
          url: "/banks",
          method: HttpMethod.GET,
        },
        successRes: (response: any) => {
          if (response?.data?.data) {
            setBanks(response.data.data);
          }
        },
        errorRes: (errorResponse: any) => {
          console.error("Failed to fetch banks:", errorResponse);
          // Don't show error toast, handle it in the UI
          return false;
        },
      });
    }
  }, [isOpen, banks.length, fetchBanksReq]);

  // Fetch employee data when in edit mode
  useEffect(() => {
    if (isOpen && isEditMode && employeeId) {
      fetchEmployeeReq({
        successRes: (response: any) => {
          const emp = response?.data?.data;
          if (emp) {
            // CRITICAL: Validate required fields exist - fail loudly if missing (data integrity error)
            if (emp.isActive === undefined) {
              const errorMsg = "CRITICAL: Employee data is missing required field 'isActive'. This is a data integrity error.";
              console.error(errorMsg, { employeeId: emp._id, emp });
              setError(errorMsg);
              return;
            }
            if (emp.hasPension === undefined) {
              const errorMsg = "CRITICAL: Employee data is missing required field 'hasPension'. This is a data integrity error.";
              console.error(errorMsg, { employeeId: emp._id, emp });
              setError(errorMsg);
              return;
            }
            if (emp.hasNHF === undefined) {
              const errorMsg = "CRITICAL: Employee data is missing required field 'hasNHF'. This is a data integrity error.";
              console.error(errorMsg, { employeeId: emp._id, emp });
              setError(errorMsg);
              return;
            }
            if (emp.hasNHIS === undefined) {
              const errorMsg = "CRITICAL: Employee data is missing required field 'hasNHIS'. This is a data integrity error.";
              console.error(errorMsg, { employeeId: emp._id, emp });
              setError(errorMsg);
              return;
            }

            setValues({
              employeeId: emp.employeeId || "",
              firstName: emp.firstName || "",
              lastName: emp.lastName || "",
              email: emp.email || "",
              phoneNumber: emp.phoneNumber || "",
              dateOfBirth: emp.dateOfBirth
                ? new Date(emp.dateOfBirth).toISOString().split("T")[0]
                : "",
              dateOfEmployment: emp.dateOfEmployment
                ? new Date(emp.dateOfEmployment).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              salary: emp.salary?.toString() || "",
              taxIdentificationNumber: emp.taxIdentificationNumber || "",
              bankCode: emp.bankCode || "",
              bankName: emp.bankName || "",
              accountNumber: emp.accountNumber || "",
              accountName: emp.accountName || "",
              // CRITICAL: Required fields - must exist (validated above)
              isActive: emp.isActive,
              hasPension: emp.hasPension,
              hasNHF: emp.hasNHF,
              hasNHIS: emp.hasNHIS,
            });
            // Set account verified if account name exists (already verified)
            if (emp.accountName && emp.accountNumber && emp.bankCode) {
              setAccountVerified(true);
              verificationRef.current = {
                accountNumber: emp.accountNumber,
                bankCode: emp.bankCode,
              };
            }
          }
        },
        errorRes: (errorResponse: any) => {
          // CRITICAL: Fail loudly - use explicit error message, no fallback
          const errorMessage = errorResponse?.data?.description;
          if (!errorMessage) {
            console.error("CRITICAL: Employee fetch failed but error response has no description", {
              errorResponse,
              employeeId,
            });
            setError("CRITICAL: Failed to load employee data. Error response missing description.");
          } else {
            setError(errorMessage);
          }
          return true;
        },
        requestConfig: {
          url: `/employees/${employeeId}`,
          method: HttpMethod.GET,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditMode, employeeId]);

  // Debounce account number for verification
  const debouncedAccountNumber = useDebounce(values.accountNumber, 800);

  // Auto-verify account when account number reaches 10 digits and bank is selected
  useEffect(() => {
    const trimmedAccountNumber = debouncedAccountNumber.trim().replace(/\s+/g, "");
    const trimmedBankCode = values.bankCode.trim();

      // Only verify if we have exactly 10 digits and a bank code
      if (trimmedAccountNumber.length === 10 && /^\d{10}$/.test(trimmedAccountNumber) && trimmedBankCode) {
        // Prevent duplicate verification requests for the same account/bank combination
        const currentKey = `${trimmedAccountNumber}-${trimmedBankCode}`;
        const lastKey = verificationRef.current ? `${verificationRef.current.accountNumber}-${verificationRef.current.bankCode}` : null;
        
        if (currentKey === lastKey) {
          // Already verified or verifying this combination, skip
          return;
        }

        // Track that we're verifying this combination
        verificationRef.current = { accountNumber: trimmedAccountNumber, bankCode: trimmedBankCode };
        setIsVerifyingAccount(true);
        setAccountVerified(false);
        setAccountVerificationError(null); // Clear previous errors

        verifyAccountReq({
          requestConfig: {
            url: `/banks/verify-account?accountNumber=${trimmedAccountNumber}&bankCode=${trimmedBankCode}`,
            method: HttpMethod.GET,
          },
          successRes: (response: any) => {
            if (response?.data?.data?.accountName) {
              // Only set value if it's different to avoid unnecessary updates
              const newAccountName = response.data.data.accountName;
              if (values.accountName !== newAccountName) {
                setValue("accountName", newAccountName);
              }
              setAccountVerified(true);
              setAccountVerificationError(null);
            } else {
              // Only clear if not already empty
              if (values.accountName) {
                setValue("accountName", "");
              }
              setAccountVerified(false);
              setAccountVerificationError("Account verification failed. Please check your account number and bank.");
            }
            setIsVerifyingAccount(false);
          },
          errorRes: (errorResponse: any) => {
            // Clear account name on verification failure only if it has a value
            if (values.accountName) {
              setValue("accountName", "");
            }
            setAccountVerified(false);
            setIsVerifyingAccount(false);
            verificationRef.current = null; // Reset ref on error so we can retry
            
            // Show error message below the input
            const errorMessage = errorResponse?.data?.description || "Failed to verify account. Please check your account number and bank.";
            setAccountVerificationError(errorMessage);
            
            // Show toast error
            toast.error("Account Verification Failed", {
              description: errorMessage,
            });
            
            return false; // Prevent default error toast from useHttp (we're showing custom toast)
          },
        });
      } else {
        // Clear verification state when conditions are not met
        // Only clear if we had a previous verification attempt (prevent unnecessary state updates)
        if (verificationRef.current) {
          verificationRef.current = null;
          setValue("accountName", "");
          setAccountVerified(false);
          setIsVerifyingAccount(false);
          setAccountVerificationError(null);
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAccountNumber, values.bankCode]);

  // Reset form when modal closes (only if not in edit mode)
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setAccountVerificationError(null);
      if (!isEditMode) {
        // Only reset form values if not in edit mode
        setAccountVerified(false);
        setIsVerifyingAccount(false);
        verificationRef.current = null;
        setValues({
          employeeId: "",
          firstName: "",
          lastName: "",
          email: "",
          phoneNumber: "",
          dateOfBirth: "",
          dateOfEmployment: new Date().toISOString().split("T")[0],
          salary: "",
          taxIdentificationNumber: "",
          bankCode: "",
          bankName: "",
          accountNumber: "",
          accountName: "",
          isActive: true,
        });
      }
    }
  }, [isOpen, setValues, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all bank detail fields as touched if they have values to show validation errors
    if (values.bankCode || values.accountNumber || values.accountName) {
      handleBlur("bankCode")();
      handleBlur("accountNumber")();
      handleBlur("accountName")();
    }

    // Validate all form fields
    const isValid = validate();
    
    if (!isValid) {
      // Mark all fields with errors as touched so errors display under inputs
      // Note: Object.keys(errors) here is stale, so we rely on finding fields from validationRules
      // But we can't access validationRules here directly.
      // However, isValid=false implies errors will be updated.
      // We will re-render and the useEffect above will handle scrolling.
      
      // We still need to mark fields as touched. Since we don't know which ones failed yet (stale state),
      // we can mark ALL fields as touched to be safe, or just wait for re-render.
      // But wait! handleBlur() calls setFieldTouched() which calls validate().
      // This is what populates the errors state in the first place!
      
      // So we MUST iterate over all fields and touch them.
      // Since we don't have the list of fields easy to access without duplicating, 
      // we can rely on `validate` having run.
      // But `validate` updates `errors` but not `touched`.
      // The `errors` update is enough for usage of `errors` in render to show message?
      // Check Input.tsx usage. Usually looks at `touched && error`.
      
      // So we DO need to update `touched`.
      // Let's touch all known fields.
      const fields = [
        "employeeId", "firstName", "lastName", "email", "phoneNumber", 
        "dateOfBirth", "dateOfEmployment", "salary", "taxIdentificationNumber", 
        "bankCode", "accountNumber", "accountName"
      ];
      
      fields.forEach((field) => {
         // @ts-ignore
        handleBlur(field)();
      });
      
      // Set flag to trigger scroll on next render
      setIsValidating(true);
      
      return;
    }

    // Validate entity ID exists (companyId or businessId)
    if (!companyId) {
      setError("Organization ID is required. Please complete onboarding first.");
      return;
    }

    // Prepare employee data
    const employeeData: any = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      dateOfEmployment: new Date(values.dateOfEmployment),
      salary: parseFloat(values.salary),
      isActive: values.isActive,
    };

    // Only include IDs for CREATE (POST), not for UPDATE (PUT)
    if (!isEditMode) {
      employeeData.employeeId = values.employeeId.trim();
      
      // CRITICAL: Handle ID assignment based on AccountType
      if (accountType === AccountType.Business) {
        employeeData.businessId = companyId; // Use the passed ID as businessId
      } else {
        employeeData.companyId = companyId; // Use the passed ID as companyId
      }
    }
    
    // CRITICAL: Include benefit flags - explicitly set to boolean values (no defaults)
    employeeData.hasPension = values.hasPension === true;
    employeeData.hasNHF = values.hasNHF === true;
    employeeData.hasNHIS = values.hasNHIS === true;

    // Add optional fields - send empty strings if cleared in edit mode
    employeeData.email = values.email.trim() ? values.email.trim().toLowerCase() : "";
    employeeData.phoneNumber = values.phoneNumber.trim() ? values.phoneNumber.trim().replace(/\s+/g, "") : "";
    employeeData.dateOfBirth = values.dateOfBirth ? new Date(values.dateOfBirth) : null;
    employeeData.taxIdentificationNumber = values.taxIdentificationNumber.trim()
      ? values.taxIdentificationNumber.trim().replace(/\s+/g, "")
      : "";
    // CRITICAL: Bank details handling - all or nothing
    // Only include bank fields if bankCode is provided (non-empty)
    // Server requires bankName when bankCode is provided - must be set from banks list
    if (values.bankCode.trim()) {
      employeeData.bankCode = values.bankCode.trim();
      
      // CRITICAL: bankName must be set when bankCode is provided (server requirement)
      // Always get bankName from banks list to ensure consistency with bankCode
      const selectedBank = banks.find((bank) => bank.code === values.bankCode.trim());
      if (selectedBank) {
        employeeData.bankName = selectedBank.name;
      } else {
        // CRITICAL: Fail loudly - bankCode set but bank not found in banks list
        // This should never happen if banks list is loaded correctly
        console.error("CRITICAL: Bank not found in banks list", {
          bankCode: values.bankCode.trim(),
          banksCount: banks.length,
          availableBankCodes: banks.map(b => b.code).slice(0, 10),
        });
        setError("CRITICAL: Bank not found for selected bank code. Please refresh the page and try again.");
        return;
      }
      
      employeeData.accountNumber = values.accountNumber.trim() ? values.accountNumber.trim().replace(/\s+/g, "") : "";
      employeeData.accountName = values.accountName.trim() ? values.accountName.trim() : "";
    }
    // If bankCode is empty, don't send bank fields at all
    // For updates, server will only update fields that are provided (partial update)
    // For creates, schema handles defaults (empty strings/null)

    // CRITICAL: Construct URL with businessId query param if needed
    // The server error explicitly asked for businessId in query params
    let url = isEditMode && employeeId ? `/employees/${employeeId}` : "/employees";
    
    // Append businessId to query string for Business accounts (required by backend middleware)
    if (accountType === AccountType.Business) {
      const separator = url.includes("?") ? "&" : "?";
      url += `${separator}businessId=${companyId}`;
    }

    const method = isEditMode ? "PUT" : "POST";
    const successMessage = isEditMode
      ? "Employee updated successfully!"
      : "Employee created successfully!";

    submitRequest({
      successRes: (response: any) => {
        console.log("Employee update response:", response);
        if (response?.data?.message === "success") {
          // Pass the updated employee to onSuccess for Redux update
          if (onSuccess) {
            onSuccess(response?.data?.data);
          }
          onClose();
        } else {
          // CRITICAL: Fail loudly - validate response description exists
          const errorDescription = response?.data?.description;
          if (!errorDescription) {
            console.error("CRITICAL: Employee operation completed but response format unexpected and no description", {
              response,
              isEditMode,
            });
            setError("CRITICAL: Operation completed but response format was unexpected and no error description provided.");
          } else {
            setError(errorDescription);
          }
        }
      },
      errorRes: (errorResponse: any) => {
        // Check if this is an upgrade-required error
        if (errorResponse?.status === 403 && errorResponse?.data?.data?.upgradeRequired) {
          const upgradeData = errorResponse.data.data.upgradeRequired;
          // CRITICAL: Validate upgradeData fields exist - fail loudly if missing
          if (!upgradeData.feature || !upgradeData.currentPlan || !upgradeData.requiredPlan || upgradeData.requiredPlanPrice === undefined) {
            console.error("CRITICAL: Upgrade required error but upgradeData is incomplete", { upgradeData, errorResponse });
            setError("CRITICAL: Upgrade required but upgrade data is incomplete. Please contact support.");
            return false;
          }
          const errorDescription = errorResponse?.data?.description;
          if (!errorDescription) {
            console.error("CRITICAL: Upgrade required error but description is missing", { errorResponse });
            setError("CRITICAL: Upgrade required but error description is missing. Please contact support.");
            return false;
          }
          showUpgradePrompt({
            feature: upgradeData.feature,
            currentPlan: upgradeData.currentPlan,
            requiredPlan: upgradeData.requiredPlan,
            requiredPlanPrice: upgradeData.requiredPlanPrice,
            message: errorDescription,
            reason: upgradeData.reason,
          });
          return false; // Don't show error toast, upgrade prompt handles it
        }

        // CRITICAL: Fail loudly - validate error message exists, no fallback
        const errorMessage = errorResponse?.data?.description;
        if (!errorMessage) {
          console.error("CRITICAL: Employee operation failed but error response has no description", {
            errorResponse,
            isEditMode,
            employeeId,
          });
          setError(
            isEditMode
              ? "CRITICAL: Failed to update employee. Error response missing description."
              : "CRITICAL: Failed to create employee. Error response missing description."
          );
        } else {
          setError(errorMessage);
        }

        // Handle duplicate employee ID error - scroll to employeeId field
        if (errorMessage.includes("already exists") || errorMessage.includes("Employee ID")) {
          setError("An employee with this Employee ID already exists. Please use a different ID.");

          // Scroll to employeeId field
          setTimeout(() => {
            const employeeIdInput =
              (document.querySelector(`input[name="employeeId"]`) as HTMLInputElement) ||
              (document.querySelector(`input[id*="employee-id"]`) as HTMLInputElement) ||
              (document.querySelector(`input[id*="Employee ID"]`) as HTMLInputElement);

            if (employeeIdInput) {
              employeeIdInput.scrollIntoView({ behavior: "smooth", block: "center" });
              employeeIdInput.focus();
              employeeIdInput.select(); // Select the text for easy editing
            }
          }, 100);
        } else {
          setError(errorMessage);

          // Try to find and scroll to any field mentioned in the error message
          setTimeout(() => {
            const fieldNames = [
              "employeeId",
              "firstName",
              "lastName",
              "email",
              "phoneNumber",
              "dateOfBirth",
              "dateOfEmployment",
              "salary",
              "taxIdentificationNumber",
              "bankCode",
              "accountNumber",
              "accountName",
            ];

            for (const fieldName of fieldNames) {
              if (
                errorMessage
                  .toLowerCase()
                  .includes(fieldName.toLowerCase().replace(/([A-Z])/g, " $1").trim())
              ) {
                const fieldInput =
                  (document.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement) ||
                  (document.querySelector(`select[name="${fieldName}"]`) as HTMLSelectElement) ||
                  (document.querySelector(`input[id*="${fieldName}"]`) as HTMLInputElement);

                if (fieldInput) {
                  fieldInput.scrollIntoView({ behavior: "smooth", block: "center" });
                  fieldInput.focus();
                  break;
                }
              }
            }
          }, 100);
        }
        return true;
      },
      requestConfig: {
        url,
        method,
        body: employeeData,
        // Add companyId as query parameter for API route (REQUIRED - no fallback)
        ...(companyId && !isEditMode && { params: { companyId } }),
        successMessage,
      },
    });
  };

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Employee" : "Add New Employee"}
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
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEditMode ? "Edit Employee" : "Add New Employee"}
            </h2>
          </div>
          <p className="text-slate-600 ml-14">
            {isEditMode
              ? "Update the employee information below. Required fields are marked with an asterisk (*)."
              : "Complete the employee information below. Required fields are marked with an asterisk (*)."}
          </p>
        </motion.div>

        {isLoadingEmployee && isEditMode && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-center py-8">
              <LoadingState message="Loading employee data..." size={LoadingStateSize.Sm} />
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div variants={itemVariants}>
            <Alert variant={AlertVariant.Error} title="Error">
              {error}
            </Alert>
          </motion.div>
        )}

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={(e) => {
            console.log("Form onSubmit triggered");
            handleSubmit(e);
          }}
          className="space-y-6"
          noValidate
        >
          {/* Basic Information */}
          <motion.div variants={itemVariants}>
            <Card 
              title="Basic Information"
              className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Input
                    label="Employee ID"
                    name="employeeId"
                    type="text"
                    required
                    value={values.employeeId}
                    onChange={handleChange("employeeId")}
                    onBlur={handleBlur("employeeId")}
                    error={touched.employeeId ? errors.employeeId : undefined}
                    placeholder="e.g., EMP001"
                    autoComplete="off"
                    disabled={isEditMode}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <Input
                    label="Date of Employment"
                    name="dateOfEmployment"
                    type="date"
                    required
                    value={values.dateOfEmployment}
                    onChange={handleChange("dateOfEmployment")}
                    onBlur={handleBlur("dateOfEmployment")}
                    error={touched.dateOfEmployment ? errors.dateOfEmployment : undefined}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Input
                    label="First Name"
                    name="firstName"
                    type="text"
                    required
                    value={values.firstName}
                    onChange={handleChange("firstName")}
                    onBlur={handleBlur("firstName")}
                    error={touched.firstName ? errors.firstName : undefined}
                    placeholder="John"
                    autoComplete="given-name"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <Input
                    label="Last Name"
                    name="lastName"
                    type="text"
                    required
                    value={values.lastName}
                    onChange={handleChange("lastName")}
                    onBlur={handleBlur("lastName")}
                    error={touched.lastName ? errors.lastName : undefined}
                    placeholder="Doe"
                    autoComplete="family-name"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange("email")}
                    onBlur={handleBlur("email")}
                    error={touched.email ? errors.email : undefined}
                    placeholder="john.doe@example.com"
                    autoComplete="email"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <Input
                    label="Phone Number"
                    name="phoneNumber"
                    type="tel"
                    value={values.phoneNumber}
                    onChange={handleChange("phoneNumber")}
                    onBlur={handleBlur("phoneNumber")}
                    error={touched.phoneNumber ? errors.phoneNumber : undefined}
                    placeholder="+2348012345678 or 08012345678"
                    autoComplete="tel"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Input
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={values.dateOfBirth}
                    onChange={handleChange("dateOfBirth")}
                    onBlur={handleBlur("dateOfBirth")}
                    error={touched.dateOfBirth ? errors.dateOfBirth : undefined}
                  />
                </motion.div>
              </div>
            </Card>
          </motion.div>

          {/* Employment & Compensation */}
          <motion.div variants={itemVariants}>
            <Card 
              title="Employment & Compensation"
              className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 }}
                >
                  <Input
                    label="Monthly Salary (₦)"
                    name="salary"
                    type="number"
                    required
                    value={values.salary}
                    onChange={handleChange("salary")}
                    onBlur={handleBlur("salary")}
                    error={touched.salary ? errors.salary : undefined}
                    placeholder="e.g., 50000"
                    min="0"
                    step="0.01"
                    autoComplete="off"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Input
                    label="Tax Identification Number (TIN)"
                    name="taxIdentificationNumber"
                    type="text"
                    value={values.taxIdentificationNumber}
                    onChange={handleChange("taxIdentificationNumber")}
                    onBlur={handleBlur("taxIdentificationNumber")}
                    error={touched.taxIdentificationNumber ? errors.taxIdentificationNumber : undefined}
                    placeholder="10-12 digits"
                    autoComplete="off"
                  />
                  {!values.taxIdentificationNumber && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-900">
                        <strong>NRS (Nigeria Revenue Service) Recommendation:</strong> Employees should have a valid TIN for PAYE remittance. 
                        Remittances without corresponding TINs may be disallowed by NRS (Nigeria Revenue Service). 
                        <a 
                          href="https://www.firs.gov.ng/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-emerald-700 underline font-semibold hover:text-emerald-800 ml-1"
                        >
                          Learn more
                        </a>
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Employee Status Toggle - Available in Both Add and Edit Modes */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="mt-6 pt-6 border-t border-emerald-200"
              >
                <div className="flex items-start space-x-3 p-4 bg-emerald-50/50 rounded-lg border border-emerald-200">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={values.isActive}
                    onChange={(e) => setValue("isActive", e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="isActive" className="text-sm font-medium text-slate-900 cursor-pointer">
                      Employee is Active
                    </label>
                    <p className="text-xs text-slate-600 mt-1">
                      {isEditMode 
                        ? "Active employees are included in payroll processing. Deactivate employees who have resigned, been terminated, or are on extended leave."
                        : "New employees are active by default. Only uncheck this if the employee should not be included in payroll processing from the start."
                      }
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Statutory Benefits Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-6 pt-6 border-t border-emerald-200"
              >
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Statutory Benefits</h3>
                <p className="text-xs text-slate-600 mb-4">
                  Select which statutory benefits your company provides for this employee. These selections will affect payroll calculations.
                </p>
                
                <div className="space-y-3">
                  {/* Pension Benefit */}
                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      id="hasPension"
                      name="hasPension"
                      checked={values.hasPension}
                      onChange={(e) => setValue("hasPension", e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label htmlFor="hasPension" className="text-sm font-medium text-slate-900 cursor-pointer">
                        Pension (8% employee, 10% employer)
                      </label>
                      <p className="text-xs text-slate-600 mt-1">
                        Pension Reform Act 2014. Required for employers with 3+ employees. Uncheck only if your company is exempt.
                      </p>
                    </div>
                  </div>

                  {/* NHF Benefit */}
                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      id="hasNHF"
                      name="hasNHF"
                      checked={values.hasNHF}
                      onChange={(e) => setValue("hasNHF", e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label htmlFor="hasNHF" className="text-sm font-medium text-slate-900 cursor-pointer">
                        National Housing Fund (NHF) - 2.5%
                      </label>
                      <p className="text-xs text-slate-600 mt-1">
                        National Housing Fund Act. Uncheck only if your company or this employee is exempt from NHF contributions.
                      </p>
                    </div>
                  </div>

                  {/* NHIS Benefit */}
                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      id="hasNHIS"
                      name="hasNHIS"
                      checked={values.hasNHIS}
                      onChange={(e) => setValue("hasNHIS", e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label htmlFor="hasNHIS" className="text-sm font-medium text-slate-900 cursor-pointer">
                        National Health Insurance Scheme (NHIS) - 5%
                      </label>
                      <p className="text-xs text-slate-600 mt-1">
                        NHIS Act. Typically mandatory for all employees. Uncheck only if your company or this employee is exempt.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Card>
          </motion.div>

          {/* Bank Details */}
          <motion.div variants={itemVariants}>
            <Card 
              title="Bank Details (Optional)"
              className="bg-gradient-to-br from-white to-emerald-50/30 border-2 border-emerald-100"
            >
              <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-900 mb-1">
                      Why we collect bank details
                    </p>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      While optional, providing bank details enables salary payments via bank transfer, supports compliance with Nigerian labor regulations, and allows for complete payslip generation. You can add this information later if needed.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 }}
                  className="md:col-span-3"
                >
                  <SearchableSelect
                    label="Bank"
                    name="bankCode"
                    value={values.bankCode}
                    options={banks.map((bank) => ({
                      value: bank.code,
                      label: bank.name,
                    }))}
                    onChange={(selectedValue) => {
                      setValue("bankCode", selectedValue);
                      // Auto-populate bankName from the selected bank for server validation
                      const selectedBank = banks.find((bank) => bank.code === selectedValue);
                      if (selectedBank) {
                        setValue("bankName", selectedBank.name);
                      } else {
                        setValue("bankName", "");
                      }
                      // Clear account name and errors when bank changes (will trigger re-verification if account number is 10 digits)
                      setValue("accountName", "");
                      setAccountVerified(false);
                      setAccountVerificationError(null);
                    }}
                    onBlur={handleBlur("bankCode")}
                    error={touched.bankCode ? errors.bankCode : undefined}
                    disabled={isLoadingBanks}
                    placeholder={isLoadingBanks ? "Loading banks..." : "Select a bank"}
                    searchPlaceholder="Search for a bank..."
                    helperText={isLoadingBanks ? "Loading banks..." : undefined}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="relative">
                    <Input
                      label="Account Number"
                      name="accountNumber"
                      type="text"
                      value={values.accountNumber}
                      onChange={(e) => {
                        handleChange("accountNumber")(e);
                        // Clear verification error when user starts typing
                        setAccountVerificationError(null);
                        // Clear account name when account number changes
                        setValue("accountName", "");
                        setAccountVerified(false);
                        // Mark as touched to show validation errors
                        if (!touched.accountNumber) {
                          handleBlur("accountNumber")();
                        }
                      }}
                      onBlur={handleBlur("accountNumber")}
                      error={accountVerificationError || (touched.accountNumber ? errors.accountNumber : undefined)}
                      placeholder="10 digits"
                      maxLength={10}
                      inputMode="numeric"
                      autoComplete="off"
                      disabled={isVerifyingAccountState}
                    />
                    {isVerifyingAccountState && (
                      <div className="absolute right-3 top-10">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      </div>
                    )}
                    {accountVerified && values.accountName && !isVerifyingAccountState && (
                      <div className="absolute right-3 top-10">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.85 }}
                >
                  <div className="relative">
                    <Input
                      label="Account Name"
                      name="accountName"
                      type="text"
                      value={values.accountName}
                      readOnly
                      onBlur={handleBlur("accountName")}
                      error={touched.accountName ? errors.accountName : undefined}
                      placeholder={isVerifyingAccountState ? "Verifying account..." : accountVerified ? "Auto-filled from bank" : "Will be auto-filled when account is verified"}
                      autoComplete="off"
                      className={accountVerified && values.accountName ? "bg-emerald-50 border-emerald-300 cursor-not-allowed" : "cursor-not-allowed"}
                      disabled={isVerifyingAccountState}
                    />
                    {isVerifyingAccountState && (
                      <div className="absolute right-3 top-10">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      </div>
                    )}
                    {accountVerified && values.accountName && !isVerifyingAccountState && (
                      <div className="absolute right-3 top-10">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                    )}
                  </div>
                  {accountVerified && values.accountName && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Account verified and name auto-filled
                    </p>
                  )}
                  {!values.bankCode && values.accountNumber && (
                    <p className="text-xs text-amber-600 mt-1">
                      Select a bank to verify account number
                    </p>
                  )}
                </motion.div>
              </div>
            </Card>
          </motion.div>

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
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[160px] bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
            >
              <Save className="w-4 h-4" />
              {isEditMode ? "Update Employee" : "Create Employee"}
            </Button>
          </motion.div>
        </motion.form>
      </motion.div>

      {/* Upgrade Prompt */}
      <UpgradePromptComponent />
    </FullScreenModal>
  );
}

