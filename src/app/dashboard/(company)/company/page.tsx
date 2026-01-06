"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { createErrorStateProps } from "@/components/shared/errorUtils";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { companyActions } from "@/store/redux/company/company-slice";
import { Building2, Save, X, RefreshCw, Shield, ExternalLink } from "lucide-react";
import Link from "next/link";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { StateSelect } from "@/components/ui/StateSelect";
import { isValidNigerianState } from "@/lib/constants/nigeria";
import { ButtonVariant, LoadingStateSize } from "@/lib/utils/client-enums";
import { CURRENT_PRIVACY_POLICY_VERSION, needsPrivacyReconsent } from "@/lib/constants/privacy";
import { PrivacyConsentSection } from "@/components/shared/PrivacyConsentSection";
import { HttpMethod } from "@/lib/utils/http-method";
import {
  isValidTIN,
  isValidCAC,
  isValidNigerianPhone,
  isValidVRN,
  requiresTIN,
  requiresVATRegistration,
} from "@/lib/utils/nrs-validators-client";

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
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

import { CompanyGuideModal } from "@/components/dashboard/company/CompanyGuideModal";
import { HelpCircle } from "lucide-react";

export default function CompanyPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Redux state
  const { companies, selectedCompanyId, isLoading, error, isLoading: isLoadingCompany } = useAppSelector((state) => state.company);
  
  // Get selected company from companies list
  const company = companies.find((b: any) => b._id === selectedCompanyId) || null;
  
  // Track if form has been populated to avoid repopulating
  const [companyData, setCompanyData] = useState<any>(null);
  
  // Local state for form validation errors (separate from Redux API errors)
  const [validationError, setValidationError] = useState<string | null>(null);

  // Guide Modal State
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Ref to track if we should scroll to error after validation
  const shouldScrollToErrorRef = useRef(false);
  
  const { isLoading: isSaving, success: isSuccess, sendHttpRequest: updateCompanyReq } = useHttp();

  const { values, errors, touched, handleChange, handleBlur, validate, setValue } = useForm(
    {
      name: "",
      cacNumber: "",
      tin: "",
      vatRegistrationNumber: "",
      isCACRegistered: true, // Always true for Companies
      address: "",
      city: "",
      state: "",
      phoneNumber: "",
      email: "",
      website: "",
      companyType: "",

      fixedAssets: "",
      privacyConsentGiven: false,
      privacyPolicyVersion: "",
    },
    {
      name: {
        required: true,
        minLength: 2,
        maxLength: 200,
      },
      cacNumber: {
        required: true, 
        custom: (value) => {
          if (!value || value.trim() === "") {
            return "CAC number is required. All companies must be registered with CAC.";
          }
          // Strict Compliance: Reject Business Names (BN)
          const normalized = value.trim().toUpperCase();
          if (normalized.startsWith("BN")) {
            return "BN numbers are for Sole Proprietorships (Business Names). Companies valid for CIT must have an RC or IT number.";
          }
          if (!isValidCAC(value)) {
            return "Invalid format. Expected RCxxxxxx or ITxxxxxx";
          }
          return null;
        },
      },
      tin: {
        custom: (value) => {
          // CRITICAL: TIN is required for companies with turnover ≥ ₦25M
          const requiresTINForVAT = requiresTIN(company?.annualTurnover);
          if (requiresTINForVAT && (!value || value.trim() === "")) {
            return "TIN is required for companies with annual turnover ≥ ₦25M (for WHT Compliance).";
          }
          if (value && value.trim() !== "" && !isValidTIN(value)) {
            return "TIN format is invalid. TIN must be 10-12 digits";
          }
          return null;
        },
      },
      vatRegistrationNumber: {
        custom: (value) => {
          // CRITICAL: VRN is required for companies with turnover ≥ ₦25M
          const requiresVRNForVAT = requiresVATRegistration(company?.annualTurnover);
          if (requiresVRNForVAT && (!value || value.trim() === "")) {
            return "VAT Registration Number (VRN) is required for companies with annual turnover ≥ ₦25M (VAT Threshold).";
          }
          if (value && value.trim() !== "" && !isValidVRN(value)) {
            return "VAT Registration Number format is invalid. Expected 8-12 digits";
          }
          return null;
        },
      },
      phoneNumber: {
        custom: (value) => {
          if (value && value.trim() !== "" && !isValidNigerianPhone(value)) {
            return "Phone number format is invalid. Expected format: 08012345678 or +2348012345678";
          }
          return null;
        },
      },
      state: {
        custom: (value) => {
          // If state is provided and not empty, validate against Nigerian states
          if (value && typeof value === "string" && value.trim() !== "") {
            if (!isValidNigerianState(value.trim())) {
              return "Please select a valid Nigerian state from the list";
            }
          }
          return null;
        },
      },
      fixedAssets: {
        custom: (value) => {
          if (value && isNaN(Number(value))) {
            return "Please enter a valid number. For example: 10000000";
          }
          if (value && Number(value) < 0) {
            return "Amount cannot be negative. Please enter a positive number.";
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
   * Field order matches actual form layout:
   * 1. Basic fields (name, companyType, fixedAssets)
   * 2. CAC Registration section (isCACRegistered, cacNumber)
   * 3. Tax Identification section (tin, vatRegistrationNumber)
   * 4. Contact Information (address, city, state, phoneNumber, email, website)
   * 5. Privacy consent (if needed)
   */
  const scrollToFirstError = useCallback(() => {
    // CRITICAL: Field order matches form layout for accurate scrolling
    const fieldOrder = [
      "name",
      "companyType",

      "fixedAssets",
      "isCACRegistered",
      "cacNumber",
      "tin",
      "vatRegistrationNumber",
      "address",
      "city",
      "state",
      "phoneNumber",
      "email",
      "website",
      "privacyConsentGiven",
    ];

    // Find the first field with an error
    const firstErrorField = fieldOrder.find((field) => errors[field as keyof typeof errors]);

    if (firstErrorField) {
      // Use requestAnimationFrame to wait for DOM updates
      requestAnimationFrame(() => {
        // Special handling for checkboxes with hardcoded IDs
        const checkboxIdMap: Record<string, string> = {
          isCACRegistered: "isCACRegistered-edit",
          privacyConsentGiven: "data-consent",
        };

        // Try multiple selectors to find the input/select/checkbox
        const selectors = [
          // Special checkbox IDs
          checkboxIdMap[firstErrorField] ? `#${checkboxIdMap[firstErrorField]}` : null,
          // Primary: explicit ID we set
          `#input-${firstErrorField}`,
          // For select elements
          `#select-${firstErrorField}`,
          // Fallback: by name attribute
          `input[name="${firstErrorField}"]`,
          `select[name="${firstErrorField}"]`,
          // Direct ID match
          `#${firstErrorField}`,
          // Partial match for complex IDs
          `input[id*="${firstErrorField}"]`,
        ].filter(Boolean) as string[];

        let errorElement: HTMLElement | null = null;
        for (const selector of selectors) {
          errorElement = document.querySelector(selector) as HTMLElement;
          if (errorElement) break;
        }

        // Fallback: find by label text
        if (!errorElement) {
          const labels = document.querySelectorAll("label");
          for (const label of labels) {
            if (label.textContent?.toLowerCase().includes(firstErrorField.toLowerCase())) {
              const inputId = label.getAttribute("for");
              if (inputId) {
                errorElement = document.getElementById(inputId);
                if (errorElement) break;
              }
            }
          }
        }

        if (errorElement) {
          // Use another requestAnimationFrame to ensure element is visible
          requestAnimationFrame(() => {
            errorElement?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            // Focus the input after scroll completes
            setTimeout(() => {
              if (errorElement && (errorElement instanceof HTMLInputElement || errorElement instanceof HTMLSelectElement)) {
                errorElement.focus();
              }
            }, 400);
          });
        }
      });
    }
  }, [errors]);

  // Watch for errors and scroll when they appear after submit attempt
  useEffect(() => {
    if (shouldScrollToErrorRef.current && Object.keys(errors).length > 0) {
      // Wait for the next tick to ensure all state updates are complete
      // Then wait for DOM to render with multiple requestAnimationFrames
      const timeoutId = setTimeout(() => {
        // First RAF: wait for React to commit state updates
        requestAnimationFrame(() => {
          // Second RAF: wait for browser to paint
          requestAnimationFrame(() => {
            // Third RAF: ensure DOM is fully updated
            requestAnimationFrame(() => {
              scrollToFirstError();
              shouldScrollToErrorRef.current = false;
            });
          });
        });
      }, 100); // Initial delay to batch state updates
      
      return () => clearTimeout(timeoutId);
    }
  }, [errors, touched, scrollToFirstError]);

  // Use companies from Redux (already fetched in DashboardLayout)
  useEffect(() => {
    if (company && !isLoadingCompany) {
      // Always update companyData to ensure we have the latest data
      // This is critical for privacy consent state
      if (!companyData || companyData._id !== company._id) {
        // New company - populate form and set companyData
        populateFormFromCompany(company);
        setCompanyData(company);
      } else {
        // Same company ID - check if data actually changed by comparing key fields
        // Include privacy fields to detect consent changes
        const keyFields = [
          'name', 'cacNumber', 'tin', 'vatRegistrationNumber', 'isCACRegistered',
          'address', 'city', 'state', 'phoneNumber', 'email', 'website', 
          'companyType', 'fixedAssets', 'taxClassification',
          'privacyConsentGiven', 'privacyPolicyVersion' // Include privacy fields
        ];
        const hasChanges = keyFields.some(field => {
          const oldValue = companyData[field];
          const newValue = company[field];
          // Deep comparison for objects, strict equality for primitives
          return oldValue !== newValue;
        });
        if (hasChanges) {
          populateFormFromCompany(company);
          setCompanyData(company);
        } else {
          // Even if no changes detected, ensure companyData is synced
          // This handles cases where company object is updated but comparison misses it
          setCompanyData(company);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, isLoadingCompany]);

  const populateFormFromCompany = (companyData: typeof company) => {
    if (!companyData) return;
    
    // Populate all form fields from company data
    // Handle different data types correctly (strings, numbers, booleans, null)
    const formFields = [
      'name', 'cacNumber', 'tin', 'vatRegistrationNumber', 'isCACRegistered',
      'address', 'city', 'state', 'phoneNumber', 'email', 'website', 
 
      'companyType', 'fixedAssets', 'privacyConsentGiven', 'privacyPolicyVersion'
    ];
    
    formFields.forEach((key) => {
      const companyValue = companyData[key as keyof typeof companyData];
      
      // Handle each field type explicitly
      if (key === 'privacyConsentGiven') {
        // Boolean field - explicitly check for true, preserve false
        const boolValue = companyValue === true || companyValue === "true";
        setValue(key as any, boolValue);
      } else if (key === 'isCACRegistered') {
        // Strict Compliance: Always true for Company Accounts
        setValue(key as any, true);
      } else if (key === 'privacyPolicyVersion') {
        // String field - preserve the version or empty string
        // Handle null, undefined, and empty string cases
        const stringValue = companyValue ? String(companyValue) : "";
        setValue(key as any, stringValue);
      } else if (key === 'fixedAssets') {
        // Number field - convert to string for form input
        setValue(key as any, companyValue ? String(companyValue) : "");
      } else {
        // String fields - preserve value or use empty string
        setValue(key as any, companyValue ? String(companyValue) : "");
      }
    });
  };

  // Companies are fetched in DashboardLayout - no need to fetch here

  const updateCompanySuccessHandler = (response: any) => {
    if (response?.data?.message === "success" && response?.data?.data) {
      const updatedCompany = response.data.data;
      
      // DEBUG: Log what's received from API
      console.log("🔵 FRONTEND (Edit) - Received updated company from API:", {
        companyId: updatedCompany._id,
        privacyConsentGiven: updatedCompany.privacyConsentGiven,
        privacyConsentDate: updatedCompany.privacyConsentDate,
        privacyPolicyVersion: updatedCompany.privacyPolicyVersion,
        type_privacyConsentGiven: typeof updatedCompany.privacyConsentGiven,
        hasPrivacyFields: {
          hasPrivacyConsentGiven: 'privacyConsentGiven' in updatedCompany,
          hasPrivacyConsentDate: 'privacyConsentDate' in updatedCompany,
          hasPrivacyPolicyVersion: 'privacyPolicyVersion' in updatedCompany,
        },
        fullUpdatedCompany: JSON.stringify(updatedCompany, null, 2),
      });
      
      // Clear any previous errors (both Redux API errors and local validation errors)
      dispatch(companyActions.setError(null));
      setValidationError(null);
      
      // Update Redux state directly with the updated document from API
      // No refetch needed - the API returns the complete updated document
      // This is more efficient and ensures UI stays in sync with server state
      dispatch(companyActions.updateCompany(updatedCompany));
      
      // CRITICAL: Update local companyData state immediately
      // This ensures the consent check uses the latest data
      setCompanyData(updatedCompany);
      
      // CRITICAL: Repopulate form with updated company data to reflect consent changes
      // This ensures the form shows the correct consent state after update
      populateFormFromCompany(updatedCompany);
    }
  };

  const handleUpdateError = (errorResponse: any) => {
    // CRITICAL: Clear validation error when API error occurs (they're mutually exclusive)
    setValidationError(null);
    
    // Set Redux error for API errors (this is correct - API errors go to Redux)
    const errorMessage = errorResponse?.data?.description || "Failed to update company information";
    dispatch(companyActions.setError(errorMessage));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // CRITICAL: Validate all form fields - fail loudly if invalid
    const isValid = validate();
    
    if (!isValid) {
      // Mark all fields with errors as touched so errors display under inputs
      const validationErrors = Object.keys(errors).filter((key) => errors[key as keyof typeof errors]);
      validationErrors.forEach((fieldName) => {
        handleBlur(fieldName as keyof typeof values)();
      });
      
      // Trigger scroll to first error
      shouldScrollToErrorRef.current = true;
      
      // Set local validation error (NOT Redux - Redux is only for API errors)
      const errorFields = validationErrors.join(", ");
      setValidationError(`Please fix the errors in the form before submitting. Invalid fields: ${errorFields}`);
      
      return;
    }
    
    // Reset scroll flag and validation error on valid submission
    shouldScrollToErrorRef.current = false;
    setValidationError(null);

    if (!company) {
      return;
    }

    // Determine if privacy consent needs to be updated
    const needsReconsent = needsPrivacyReconsent(company?.privacyPolicyVersion);
    
    const updateData = {
      ...values,
      fixedAssets: values.fixedAssets ? Number(values.fixedAssets) : undefined,
      isCACRegistered: true, // Always true for Companies
      // Only include privacy consent if re-consent is needed
      // If consent section wasn't shown (already consented), preserve existing consent
      ...(needsReconsent && {
        privacyConsentGiven: values.privacyConsentGiven ?? false,
        privacyPolicyVersion: values.privacyConsentGiven ? CURRENT_PRIVACY_POLICY_VERSION : undefined,
      }),
    };

    // DEBUG: Log what's being sent to backend
    console.log("🔵 FRONTEND (Edit) - Sending privacy consent data:", {
      needsReconsent,
      privacyConsentGiven: updateData.privacyConsentGiven,
      privacyPolicyVersion: updateData.privacyPolicyVersion,
      formValue_privacyConsentGiven: values.privacyConsentGiven,
      formValue_privacyPolicyVersion: values.privacyPolicyVersion,
      company_privacyConsentGiven: company?.privacyConsentGiven,
      company_privacyPolicyVersion: company?.privacyPolicyVersion,
      CURRENT_PRIVACY_POLICY_VERSION,
      updateDataKeys: Object.keys(updateData),
    });

    updateCompanyReq({
      successRes: updateCompanySuccessHandler,
      errorRes: handleUpdateError,
      requestConfig: {
        url: `/company/${company._id}`,
        method: HttpMethod.PUT,
        body: updateData,
        successMessage: "Your company information has been updated successfully!",
      },
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading your company information..." size={LoadingStateSize.Md} />;
  }

  // Show error state if there's an error and no company data
  if (error && !company && !isLoading) {
    const errorProps = createErrorStateProps(error);
    return (
      <RouteGuard requireAccountType={AccountType.Company} redirectTo="/dashboard/expenses">
        <ErrorState
          {...errorProps}
          title="Could Not Load Your Company Information"
          primaryAction={{
            label: "Try Again",
            onClick: () => {
              // Trigger refetch by invalidating cache - DashboardLayout will refetch
              dispatch(companyActions.invalidateCache());
              dispatch(companyActions.setCompanies([]));
            },
            icon: RefreshCw,
          }}
          secondaryAction={{
            label: "Go to Dashboard",
            onClick: () => router.push("/dashboard"),
            icon: Building2,
            variant: ButtonVariant.Outline,
          }}
        />
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAccountType={AccountType.Company} redirectTo="/dashboard/expenses">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-6"
      >
      <motion.div variants={itemVariants} className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <Building2 className="w-8 h-8 text-emerald-700" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Company Profile</h1>
            </div>
            <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
              Ensure your business details are correct. <strong className="text-emerald-700">Accurate details = Accurate Taxes.</strong>
            </p>
          </div>

          <button 
            onClick={() => setIsGuideOpen(true)}
            className="px-5 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full text-base font-semibold transition-all border border-emerald-200 flex items-center gap-2 group shadow-sm shrink-0"
          >
            <HelpCircle className="w-5 h-5" />
            <span>How does this work?</span>
          </button>
        </div>
      </motion.div>

      {company && (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Error alert for validation errors (local state) */}
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-2 border-red-200 rounded-lg p-4"
            >
              <p className="text-sm text-red-800 font-medium">
                {validationError}
              </p>
            </motion.div>
          )}
          {/* Error alert for API/update errors (Redux state) */}
          {error && company && !validationError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-2 border-red-200 rounded-lg p-4"
            >
              <p className="text-sm text-red-800 font-medium">
                {error}
              </p>
            </motion.div>
          )}

          <Card 
            title="Company Details" 
            subtitle="Update your company information. Changes here will be reflected in your invoices and tax records."
          >
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {[
                  { 
                    key: "name", 
                    label: "What is your company name?", 
                    required: true,
                    placeholder: "e.g., Adebayo Stores, Lagos Tech Solutions"
                  },
                  { 
                    key: "companyType", 
                    label: "What type of company do you run?", 
                    placeholder: "e.g., Shop, Restaurant, Tech Company"
                  },
                  { 
                    key: "fixedAssets", 
                    label: "What is the total value of your company's fixed assets? (₦)", 
                    type: "number", 
                    helperText: "Things your business owns that last a long time (like Machines, Cars, Land, or Buildings). This helps us know your correct tax rate.",
                    placeholder: "e.g., 10000000"
                  },
                ].map((field, index) => {
                  const fieldKey = field.key as keyof typeof values;
                  return (
                    <motion.div key={field.key} variants={itemVariants}>
                      <Input
                        id={`input-${fieldKey}`}
                        name={String(fieldKey)}
                        label={field.label}
                        type={field.type || "text"}
                        required={field.required}
                        value={String(values[fieldKey] || "")}
                        onChange={handleChange(fieldKey as any)}
                        onBlur={handleBlur(fieldKey as any)}
                        error={touched[fieldKey] ? errors[fieldKey] : undefined}
                        helperText={field.helperText}
                        placeholder={field.placeholder}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* VAT Registration Threshold Warning */}
              {requiresVATRegistration(company?.annualTurnover) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 shadow-sm"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-amber-100 rounded-full shrink-0">
                      <RefreshCw className="w-6 h-6 text-amber-700" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <h3 className="text-lg font-bold text-amber-900">
                        Compulsory VAT Registration
                      </h3>
                      <p className="text-base text-amber-800 leading-relaxed">
                        Because your company earns over <strong>₦25 Million/year</strong>, the law requires you to register for VAT.
                      </p>
                      <p className="text-base text-amber-800">
                        Please enter your <strong>TIN</strong> and <strong>VAT Number</strong> below so we can handle this for you correctly.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="border-t border-slate-200 pt-6 mt-6"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-emerald-600" />
                  Company Registration
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  For Company Income Tax (CIT) compliance, your business must be a registered Limited Liability Company (RC) or Incorporated Trustee (IT).
                </p>
                <div className="space-y-4">
                    <Input
                      id="input-cacNumber"
                      name="cacNumber"
                      label="CAC Registration Number"
                      type="text"
                      required
                      value={String(values.cacNumber || "")}
                      onChange={handleChange("cacNumber")}
                      onBlur={handleBlur("cacNumber")}
                      error={touched.cacNumber ? errors.cacNumber : undefined}
                      helperText="Must be an RC or IT number (e.g., RC123456). BN numbers are not valid for Company accounts."
                      placeholder="e.g., RC123456"
                    />
                </div>
              </motion.div>

              {/* TIN and VRN Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="border-t border-slate-200 pt-6 mt-6"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-emerald-600" />
                  Tax Identification
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {requiresVATRegistration(company?.annualTurnover)
                    ? "TIN and VAT Registration Number are required for VAT-registered companies (turnover ≥ ₦25M)."
                    : "Your NRS (Nigeria Revenue Service) tax identification numbers. If you don't have them yet, you can add them later."}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    id="input-tin"
                    name="tin"
                    label={`Tax Identification Number - TIN${requiresTIN(company?.annualTurnover) ? " (Required)" : " (Optional)"}`}
                    type="text"
                    required={requiresTIN(company?.annualTurnover)}
                    value={String(values.tin || "")}
                    onChange={handleChange("tin")}
                    onBlur={handleBlur("tin")}
                    error={touched.tin ? errors.tin : undefined}
                    helperText={requiresTIN(company?.annualTurnover) 
                      ? "Required for VAT-registered companies. Format: 10-12 digits"
                      : "Your NRS (Nigeria Revenue Service) tax number. Format: 10-12 digits"}
                    placeholder="e.g., 12345678901"
                  />
                  <Input
                    id="input-vatRegistrationNumber"
                    name="vatRegistrationNumber"
                    label={`VAT Registration Number - VRN${requiresVATRegistration(company?.annualTurnover) ? " (Required)" : " (Optional)"}`}
                    type="text"
                    required={requiresVATRegistration(company?.annualTurnover)}
                    value={String(values.vatRegistrationNumber || "")}
                    onChange={handleChange("vatRegistrationNumber")}
                    onBlur={handleBlur("vatRegistrationNumber")}
                    error={touched.vatRegistrationNumber ? errors.vatRegistrationNumber : undefined}
                    helperText={requiresVATRegistration(company?.annualTurnover)
                      ? "Required for VAT-registered companies. Format: 8-12 digits"
                      : "Your VAT registration number if registered. Format: 8-12 digits"}
                    placeholder="e.g., 12345678"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="border-t border-slate-200 pt-8 mt-8"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-emerald-600" />
                  Company Contact Information
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Update your company contact details for invoices and records. Tax reminders and important updates will be sent to your email address only.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Input
                      id="input-address"
                      name="address"
                      label="Company Address"
                      type="text"
                      value={values.address}
                      onChange={handleChange("address")}
                      onBlur={handleBlur("address")}
                      placeholder="e.g., 123 Main Street, Ikeja"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <Input
                      id="input-city"
                      name="city"
                      label="City"
                      type="text"
                      value={values.city}
                      onChange={handleChange("city")}
                      onBlur={handleBlur("city")}
                      placeholder="e.g., Lagos, Abuja, Port Harcourt"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <StateSelect
                      id="select-state"
                      name="state"
                      label="State"
                      value={String(values.state || "")}
                      onChange={handleChange("state")}
                      onBlur={handleBlur("state")}
                      error={touched.state ? errors.state : undefined}
                      placeholder="Select a state"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                  >
                    <Input
                      id="input-phoneNumber"
                      name="phoneNumber"
                      label="Phone Number"
                      type="tel"
                      value={values.phoneNumber}
                      onChange={handleChange("phoneNumber")}
                      onBlur={handleBlur("phoneNumber")}
                      placeholder="e.g., 08012345678"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Input
                      id="input-email"
                      name="email"
                      label="Email Address"
                      type="email"
                      value={values.email}
                      onChange={handleChange("email")}
                      onBlur={handleBlur("email")}
                      placeholder="yourcompany@email.com"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                  >
                    <Input
                      id="input-website"
                      name="website"
                      label="Website (if you have one)"
                      type="url"
                      value={values.website}
                      onChange={handleChange("website")}
                      onBlur={handleBlur("website")}
                      placeholder="https://yourcompany.com"
                    />
                  </motion.div>
                </div>
              </motion.div>

              {company.taxClassification && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-2 border-emerald-200 rounded-xl p-5"
                >
                  <div className="flex items-start space-x-3">
                    <Building2 className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900 mb-1">
                        Your Tax Classification
                      </p>
                      <p className="text-sm text-emerald-800">
                        {(() => {
                           const formatted = company.taxClassification.replace(/_/g, " ").split(" ").map((word: string) => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(" ");
                           
                           // If it's "Large", map to "Large Company (Standard)" or similar if desired
                           // For now, "Large" -> "Large" is fine, or "Large Company" if the enum is just "large"
                           if (company.taxClassification === "large") return "Large Company";
                           return formatted;
                        })()}
                      </p>
                      <p className="text-xs text-emerald-700 mt-2">
                        This is automatically determined based on your company details. It helps us calculate your tax obligations.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Privacy and Data Consent - Only show if re-consent is needed */}
              {/* Check multiple sources to ensure we have the correct consent state */}
              {(() => {
                // Don't show consent section if company data hasn't loaded yet
                if (!company && !companyData && isLoadingCompany) {
                  return false; // Don't show while loading
                }
                
                // Priority order: companyData (local, most recent) > company (Redux) > form values
                const currentCompany = companyData || company;
                
                // If we don't have company data yet, don't show (wait for it to load)
                if (!currentCompany) {
                  return false;
                }
                
                
                // Check consent from company object (most reliable source)
                // Handle both boolean true and string "true" cases
                const companyConsentValue = currentCompany?.privacyConsentGiven;
                const hasConsentFromCompany = companyConsentValue === true || companyConsentValue === "true";
                
                // Also check form values (in case company object hasn't updated yet)
                const hasConsentFromForm = values.privacyConsentGiven === true;
                
                // User has consent if either source says yes
                const hasConsent = hasConsentFromCompany || hasConsentFromForm;
                
                // Get version - prefer company object, otherwise use form value
                const consentVersion = currentCompany?.privacyPolicyVersion ?? values.privacyPolicyVersion;
                const versionMatches = consentVersion === CURRENT_PRIVACY_POLICY_VERSION;
                
                // Show consent section ONLY if:
                // 1. No consent given yet (neither company nor form has it), OR
                // 2. Version doesn't match (or no version exists)
                // If user has consent AND version matches, hide the section
                const shouldShow = !hasConsent || !versionMatches;
                
                
                // CRITICAL: Double-check - if we have explicit consent and matching version, never show
                if (hasConsent && versionMatches) {
                  return false;
                }
                
                return shouldShow;
              })() && (
              <PrivacyConsentSection
                checked={values.privacyConsentGiven ?? false}
                onCheckedChange={(checked) => {
                  setValue("privacyConsentGiven", checked);
                  if (checked) {
                    setValue("privacyPolicyVersion", CURRENT_PRIVACY_POLICY_VERSION);
                  } else {
                    setValue("privacyPolicyVersion", "");
                  }
                }}
                entityType="company"
              />
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                className="pt-6 mt-6 border-t border-slate-200"
              >
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <Button
                    type="button"
                    variant={ButtonVariant.Outline}
                    onClick={() => router.back()}
                    disabled={isSaving}
                    className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <X className="w-4 h-4" />
                    Go Back
                  </Button>
                  <Button 
                    type="submit" 
                    loading={isSaving} 
                    success={isSuccess}
                    disabled={isSaving}
                    className="w-full sm:w-auto min-w-[140px]"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </div>
              </motion.div>
            </motion.form>
          </Card>
        </motion.div>
      )}

      {!company && !isLoading && !error && (
        <motion.div variants={itemVariants}>
          <Card title="No Company Found">
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">
                You haven't set up your company yet. Let's get you started!
              </p>
              <Button onClick={() => router.push("/dashboard/company/onboard")}>
                Set Up Your Company
                <Building2 className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Next Step Navigation */}
      <motion.div variants={itemVariants}>
        <NextStepCard
          title="Return to Dashboard"
          description="You've finished managing your company profile. Return to the main dashboard."
          href="/dashboard"
          actionLabel="Go to Dashboard"
        />
      </motion.div>
    </motion.div>
      <CompanyGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
    </RouteGuard>
  );
}
