"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateSelect } from "@/components/ui/StateSelect";
import { Shield, ExternalLink } from "lucide-react";
import Link from "next/link";
import { isValidNigerianState } from "@/lib/constants/nigeria";
import { CURRENT_PRIVACY_POLICY_VERSION } from "@/lib/constants/privacy";
import {
  isValidTIN,
  isValidCAC,
  isValidNigerianPhone,
  isValidVRN,
} from "@/lib/utils/nrs-validators-client";
import { ErrorState } from "@/components/shared/ErrorState";
import { createErrorStateProps } from "@/components/shared/errorUtils";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { companyActions } from "@/store/redux/company/company-slice";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { UsagePeriod } from "@/lib/utils/usage-period";
import { Building2, ArrowRight, X, RefreshCw, CheckCircle2 } from "lucide-react";

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

export default function CompanyOnboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, sendHttpRequest: createCompanyReq } = useHttp();
  const [error, setError] = useState<string | null>(null);
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  const errorMessageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const shouldScrollToErrorRef = useRef(false);
  const isSubmittingRef = useRef(false);

  const { values, errors, touched, handleChange, handleBlur, validate, setValue, setFieldTouched } = useForm(
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
        required: true, // Mandatory for Companies
        custom: (value) => {
          if (!value || value.trim() === "") {
            return "CAC number is required for Limited Companies";
          }
          // Strict Validation: Companies must be RC or IT. BN is for Business Name (Sole Prop).
          const normalized = value.trim().toUpperCase();
          if (normalized.startsWith("BN")) {
            return "BN numbers are for Business Names (Sole Proprietorships). Please use a Business Account for PIT filing. Companies must have an RC or IT number.";
          }
          if (!isValidCAC(value)) {
            return "Invalid format. Expected RCxxxxxx or ITxxxxxx";
          }
          return null;
        },
      },
      tin: {
        custom: (value) => {
          if (value && value.trim() !== "" && !isValidTIN(value)) {
            return "TIN format is invalid. TIN must be 10-12 digits";
          }
          return null;
        },
      },
      vatRegistrationNumber: {
        custom: (value) => {
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
    }
  );

  /**
   * Scroll to the first field with an error
   * Uses current errors state to find the first error field
   */
  const scrollToFirstError = useCallback(() => {
    // Get all field names in order of appearance in the form
    // Order matches actual form layout:
    // 1. Basic fields (name, companyType)
    // 2. CAC Registration section (isCACRegistered, cacNumber)
    // 3. Tax Identification section (tin, vatRegistrationNumber)
    // 4. Contact Information (address, city, state, phoneNumber, email, website)
    // 5. Privacy consent
    const fieldOrder = [
      "name",
      "companyType",
      "isCACRegistered",
      "cacNumber",
      "tin",
      "vatRegistrationNumber",
      "fixedAssets",
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
        // Try multiple selectors to find the input/select
        const selectors = [
          `input[name="${firstErrorField}"]`,
          `select[name="${firstErrorField}"]`,
          `#input-${firstErrorField}`,
          `#select-${firstErrorField}`,
          `#input-${firstErrorField.toLowerCase().replace(/\s+/g, "-")}`,
          `[id*="${firstErrorField}"]`,
        ];

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

  const createCompanySuccessResHandler = (response: any) => {
    if (response?.data?.message === "success") {
      setError(null);

      // Get the created company from the response
      const createdCompany = response?.data?.data;
      
      if (createdCompany && createdCompany._id) {
        // Add the new company to Redux store before navigation
        // This adds it to the existing list without replacing other companies
        dispatch(companyActions.addCompany(createdCompany));
        
        // Set the newly created company as selected
        dispatch(companyActions.setSelectedCompanyId(String(createdCompany._id)));
        
        // Use requestAnimationFrame to ensure Redux state updates are committed
        // Then use setTimeout to give React time to process the state update
        // This prevents DashboardLayout from redirecting back to onboarding
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              // Navigate to company page after successful onboarding
              // Using replace instead of push to prevent back navigation to onboarding
              router.replace("/dashboard");
            }, 2000);
          });
        });
      } else {
        // Fallback: navigate even if company data is missing (shouldn't happen)
        setTimeout(() => {
          router.replace("/dashboard/company");
        }, 2000);
      }
    }
  };

  const handleSubmitError = (errorResponse: any) => {
    // Check if this is an upgrade-required error
    if (errorResponse?.status === 403 && errorResponse?.data?.data?.upgradeRequired) {
      const upgradeData = errorResponse.data.data.upgradeRequired;
      showUpgradePrompt({
        feature: "Multiple Companies",
        currentPlan: upgradeData.currentPlan,
        requiredPlan: upgradeData.requiredPlan,
        requiredPlanPrice: upgradeData.requiredPlanPrice,
        message: errorResponse?.data?.description || "You've reached your company limit. Upgrade to create more companies.",
        reason: upgradeData.reason,
        usageInfo: errorResponse?.data?.data?.currentCount !== undefined ? {
          current: errorResponse.data.data.currentCount,
          limit: errorResponse.data.data.limit,
          period: UsagePeriod.Month,
        } : undefined,
      });
      return false; // Don't show error toast, upgrade prompt handles it
    }
    
    const errorMessage = errorResponse?.data?.description || "Failed to set up your company. Please check your information and try again.";
    setError(errorMessage);
    
    // Scroll to error message
    setTimeout(() => {
      if (errorMessageRef.current) {
        errorMessageRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    // Prevent multiple submissions
    if (isSubmittingRef.current) {
      return;
    }
    
    isSubmittingRef.current = true;
    setError(null);

    // Validate all fields first
    const isValid = validate();
    
    if (!isValid) {
      // Mark all fields as touched to show errors
      // Order matches actual form layout for consistent error display
      const allFields: (keyof typeof values)[] = [
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
      
      // Mark all fields as touched - this will also trigger validation
      allFields.forEach((field) => {
        setFieldTouched(field);
      });
      
      // Set flag to scroll after errors are rendered
      // The useEffect will handle the actual scrolling once errors are in state
      shouldScrollToErrorRef.current = true;
      isSubmittingRef.current = false; // Reset submission flag on validation error
      
      return;
    }

    const submitData = {
      ...values,
      fixedAssets: values.fixedAssets ? Number(values.fixedAssets) : undefined,
      isCACRegistered: true, // Always true for Companies (Required for CIT)
      // Include privacy consent data for legal compliance
      privacyConsentGiven: values.privacyConsentGiven ?? false,
      privacyPolicyVersion: values.privacyConsentGiven ? (values.privacyPolicyVersion ?? CURRENT_PRIVACY_POLICY_VERSION) : undefined,
    };

    // DEBUG: Log what's being sent to backend
    console.log("🔵 FRONTEND (Onboard) - Sending privacy consent data:", {
      privacyConsentGiven: submitData.privacyConsentGiven,
      privacyPolicyVersion: submitData.privacyPolicyVersion,
      formValue_privacyConsentGiven: values.privacyConsentGiven,
      formValue_privacyPolicyVersion: values.privacyPolicyVersion,
      CURRENT_PRIVACY_POLICY_VERSION,
    });

    createCompanyReq({
      successRes: (response: any) => {
        createCompanySuccessResHandler(response);
        // Reset submission flag after success
        isSubmittingRef.current = false;
      },
      errorRes: (errorResponse: any) => {
        handleSubmitError(errorResponse);
        // Reset submission flag on error
        isSubmittingRef.current = false;
      },
      requestConfig: {
        url: "/company/create",
        method: HttpMethod.POST,
        body: submitData,
        successMessage: "Great! Your company has been set up. Taking you to your dashboard...",
      },
    });
  };

  return (
    <RouteGuard requireAccountType={AccountType.Company} redirectTo="/dashboard/expenses">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-6"
      >
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Building2 className="w-8 h-8 text-emerald-600" />
          <h1 className="text-4xl font-bold text-slate-900">Set Up Your Company</h1>
        </div>
        <div className="ml-11 space-y-3">
          <p className="text-lg text-slate-700 font-medium">
            We'll help you manage your taxes and tax compliance with NRS (Nigeria Revenue Service).
          </p>
          <p className="text-slate-600">
            This takes less than 5 minutes. Fill in what you know - you can add more details later.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-900 mb-1">
                  What you'll be able to do:
                </p>
                <ul className="text-sm text-emerald-800 space-y-1">
                  <li>• Create invoices for your customers</li>
                  <li>• Track your VAT automatically</li>
                  <li>• Get reminders before tax deadlines</li>
                  <li>• Review your tax compliance status</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card 
          title="Company Information" 
          subtitle="Tell us about your company. If you don't have some details (like CAC or TIN), that's okay - you can add them later."
        >
          <motion.form
            ref={formRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              // Prevent form submission on Enter key in non-submit inputs
              if (e.key === "Enter" && e.target instanceof HTMLTextAreaElement) {
                return; // Allow Enter in textareas
              }
              if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            {/* Error alert for submission errors */}
            {error && (
              <motion.div
                ref={errorMessageRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border-2 border-red-200 rounded-lg p-4"
              >
                <p className="text-sm text-red-800 font-medium">
                  {error}
                </p>
              </motion.div>
            )}
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
                  placeholder: "e.g., Adebayo Stores, Lagos Tech Solutions, Mama Nkechi Restaurant" 
                },
                { 
                  key: "companyType", 
                  label: "What type of company do you run?", 
                  placeholder: "e.g., Shop, Restaurant, Tech Company, Freelance Services" 
                },
                { 
                  key: "fixedAssets", 
                  label: "What is the total value of your company's fixed assets? (₦)", 
                  type: "number", 
                  placeholder: "e.g., 10000000", 
                  helperText: "Fixed assets include property, equipment, machinery, vehicles, and other long-term assets. This, along with your annual turnover (computed from invoices), helps determine your tax classification (Small, Medium, or Large company) and your CIT rate. You can estimate if needed." 
                },
              ].map((field, index) => {
                const fieldKey = field.key as keyof typeof values;
                return (
                  <motion.div key={field.key} variants={itemVariants}>
                    <Input
                      label={field.label}
                      type={field.type || "text"}
                      required={field.required}
                      value={String(values[fieldKey] || "")}
                      onChange={handleChange(fieldKey as any)}
                      onBlur={handleBlur(fieldKey as any)}
                      error={touched[fieldKey] ? errors[fieldKey] : undefined}
                      helperText={field.helperText}
                      placeholder={field.placeholder}
                      name={field.key}
                      id={`input-${field.key}`}
                    />
                  </motion.div>
                );
              })}
            </motion.div>

            {/* CAC Registration Section */}
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
                To create a Company Account (for CIT), your business must be a registered Limited Liability Company (RC) or Incorporated Trustee (IT).
                <br />
                <span className="text-amber-600 font-medium mt-1 inline-block">
                  Note: If you have a Business Name (BN), please switch to a Business Account (Sole Proprietorship) for PIT filing.
                </span>
              </p>
              <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                  >
                    <Input
                      label="CAC Registration Number"
                      type="text"
                      required
                      value={String(values.cacNumber || "")}
                      onChange={handleChange("cacNumber")}
                      onBlur={handleBlur("cacNumber")}
                      error={touched.cacNumber ? errors.cacNumber : undefined}
                      helperText="Must be an RC or IT number (e.g., RC123456)"
                      placeholder="e.g., RC123456"
                      name="cacNumber"
                      id="input-cacNumber"
                    />
                  </motion.div>
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
                Your NRS (Nigeria Revenue Service) tax identification numbers. If you don't have them yet, you can add them later.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Tax Identification Number - TIN (Optional)"
                  type="text"
                  required={false}
                  value={String(values.tin || "")}
                  onChange={handleChange("tin")}
                  onBlur={handleBlur("tin")}
                  error={touched.tin ? errors.tin : undefined}
                  helperText="Your NRS (Nigeria Revenue Service) tax number. Format: 10-12 digits"
                  placeholder="e.g., 12345678901"
                  name="tin"
                  id="input-tin"
                />
                <Input
                  label="VAT Registration Number - VRN (Optional)"
                  type="text"
                  required={false}
                  value={String(values.vatRegistrationNumber || "")}
                  onChange={handleChange("vatRegistrationNumber")}
                  onBlur={handleBlur("vatRegistrationNumber")}
                  error={touched.vatRegistrationNumber ? errors.vatRegistrationNumber : undefined}
                  helperText="Your VAT registration number if registered. Format: 8-12 digits"
                  placeholder="e.g., 12345678"
                  name="vatRegistrationNumber"
                  id="input-vatRegistrationNumber"
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
                Contact Information
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                We'll use this to send you tax reminders and important updates. Make sure your email and phone number are correct.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Input
                    label="Company Address"
                    type="text"
                    value={values.address}
                    onChange={handleChange("address")}
                    onBlur={handleBlur("address")}
                    error={touched.address ? errors.address : undefined}
                    placeholder="e.g., 123 Main Street, Ikeja"
                    name="address"
                    id="input-address"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <Input
                    label="City"
                    type="text"
                    value={values.city}
                    onChange={handleChange("city")}
                    onBlur={handleBlur("city")}
                    error={touched.city ? errors.city : undefined}
                    placeholder="e.g., Lagos, Abuja, Port Harcourt"
                    name="city"
                    id="input-city"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <StateSelect
                    label="State"
                    value={String(values.state || "")}
                    onChange={handleChange("state")}
                    onBlur={handleBlur("state")}
                    error={touched.state ? errors.state : undefined}
                    placeholder="Select a state"
                    name="state"
                    id="input-state"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <Input
                    label="Phone Number"
                    type="tel"
                    value={values.phoneNumber}
                    onChange={handleChange("phoneNumber")}
                    onBlur={handleBlur("phoneNumber")}
                    error={touched.phoneNumber ? errors.phoneNumber : undefined}
                    placeholder="e.g., 08012345678"
                    name="phoneNumber"
                    id="input-phone-number"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Input
                    label="Email Address"
                    type="email"
                    value={values.email}
                    onChange={handleChange("email")}
                    onBlur={handleBlur("email")}
                    error={touched.email ? errors.email : undefined}
                    placeholder="yourcompany@email.com"
                    name="email"
                    id="input-email"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                >
                  <Input
                    label="Website (Optional)"
                    type="url"
                    value={values.website}
                    onChange={handleChange("website")}
                    onBlur={handleBlur("website")}
                    error={touched.website ? errors.website : undefined}
                    placeholder="https://yourcompany.com"
                    name="website"
                    id="input-website"
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Privacy Policy Consent */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="border-t border-slate-200 pt-6 mt-6"
            >
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="privacyConsentGiven"
                  checked={values.privacyConsentGiven || false}
                  onChange={(e) => setValue("privacyConsentGiven", e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2"
                />
                <label htmlFor="privacyConsentGiven" className="ml-3 text-sm text-slate-600">
                  I agree to the <Link href="/privacy-policy" className="text-emerald-600 hover:text-emerald-700 font-medium">Privacy Policy</Link> and consent to the processing of my company's data for tax purposes.
                  {touched.privacyConsentGiven && errors.privacyConsentGiven && (
                    <p className="text-red-500 mt-1">{errors.privacyConsentGiven}</p>
                  )}
                </label>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="pt-6 flex justify-end"
            >
              <Button
                type="submit"
                variant={ButtonVariant.Primary}
                loading={isLoading || isSubmittingRef.current}
                disabled={isLoading || isSubmittingRef.current}
                className="w-full md:w-auto px-8"
              >
                Complete Setup <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
            
            {/* Show upgrade prompt if needed */}
            <UpgradePromptComponent />
          </motion.form>
        </Card>
      </motion.div>
      </motion.div>
    </RouteGuard>
  );
}
