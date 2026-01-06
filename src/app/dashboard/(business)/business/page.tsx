"use client";

import { useEffect, useState } from "react";
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
import { businessActions } from "@/store/redux/business/business-slice";
import { Building2, Save, X, RefreshCw, Shield, ExternalLink } from "lucide-react";
import Link from "next/link";
import { StateSelect } from "@/components/ui/StateSelect";
import { isValidNigerianState } from "@/lib/constants/nigeria";
import { ButtonVariant, LoadingStateSize } from "@/lib/utils/client-enums";
import { CURRENT_PRIVACY_POLICY_VERSION, needsPrivacyReconsent } from "@/lib/constants/privacy";
import { PrivacyConsentSection } from "@/components/shared/PrivacyConsentSection";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { HttpMethod } from "@/lib/utils/http-method";
import {
  isValidTIN,
  isValidNigerianPhone,
  isValidVRN,
  requiresTIN,
  requiresVATRegistration,
} from "@/lib/utils/nrs-validators-client";
import { BusinessProfileGuideModal } from "@/components/dashboard/guide-modals/BusinessProfileGuideModal";

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

export default function BusinessPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Redux state
  const { businesses, selectedBusinessId, isLoading, error, isLoading: isLoadingBusiness } = useAppSelector((state) => state.business);
  
  // Get selected business from businesses list
  const business = businesses.find((b: any) => b._id === selectedBusinessId) || null;
  
  // Track if form has been populated to avoid repopulating
  const [businessData, setBusinessData] = useState<any>(null);
  
  const { isLoading: isSaving, success: isSuccess, sendHttpRequest: updateBusinessReq } = useHttp();

  const { values, errors, touched, handleChange, handleBlur, validate, setValue } = useForm(
    {
      name: "",
      businessRegistrationNumber: "",
      tin: "",
      vatRegistrationNumber: "",
      isRegistered: false,
      address: "",
      city: "",
      state: "",
      phoneNumber: "",
      email: "",
      website: "",
      businessType: "",
      privacyConsentGiven: false,
      privacyPolicyVersion: "",
    },
    {
      name: {
        required: true,
        minLength: 2,
        maxLength: 200,
      },
      businessRegistrationNumber: {
        custom: (value) => {
          // Business registration number validation (optional field, no strict format requirements)
          return null;
        },
      },
      tin: {
        custom: (value) => {
          // CRITICAL: TIN is required for businesses with turnover ≥ ₦25M
          // Use business data from scope since field is read-only/calculated
          const turnover = business?.annualTurnover || 0;
          const requiresTINForVAT = requiresTIN(turnover);
          if (requiresTINForVAT && (!value || value.trim() === "")) {
            return "TIN is required. Mandatory for businesses with turnover ≥ ₦25M (WHT Compliance/VAT).";
          }
          if (value && value.trim() !== "" && !isValidTIN(value)) {
            return "TIN format is invalid. TIN must be 10-12 digits";
          }
          return null;
        },
      },
      vatRegistrationNumber: {
        custom: (value) => {
          // CRITICAL: VRN is required for businesses with turnover ≥ ₦25M
          const turnover = business?.annualTurnover || 0;
          const requiresVRNForVAT = requiresVATRegistration(turnover);
          if (requiresVRNForVAT && (!value || value.trim() === "")) {
            return "VAT Registration Number (VRN) is required for businesses with annual turnover ≥ ₦25M per 2026 Act.";
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
    }
  );

  // Use businesses from Redux (already fetched in DashboardLayout)
  useEffect(() => {
    if (business && !isLoadingBusiness) {
      // Always update businessData to ensure we have the latest data
      // This is critical for privacy consent state
      if (!businessData || businessData._id !== business._id) {
        // New business - populate form and set businessData
        populateFormFromBusiness(business);
        setBusinessData(business);
      } else {
        // Same business ID - check if data actually changed by comparing key fields
        // Include privacy fields to detect consent changes
        const keyFields = [
          'name', 'businessRegistrationNumber', 'tin', 'vatRegistrationNumber', 'isRegistered',
          'address', 'city', 'state', 'phoneNumber', 'email', 'website', 
          'businessType', 'taxClassification',
          'privacyConsentGiven', 'privacyPolicyVersion' // Include privacy fields
        ];
        const hasChanges = keyFields.some(field => {
          const oldValue = businessData[field];
          const newValue = business[field];
          // Deep comparison for objects, strict equality for primitives
          return oldValue !== newValue;
        });
        if (hasChanges) {
          populateFormFromBusiness(business);
          setBusinessData(business);
        } else {
          // Even if no changes detected, ensure businessData is synced
          // This handles cases where business object is updated but comparison misses it
          setBusinessData(business);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, isLoadingBusiness]);

  const populateFormFromBusiness = (businessData: typeof business) => {
    if (!businessData) return;
    
    // Populate all form fields from business data
    // Handle different data types correctly (strings, numbers, booleans, null)
    const formFields = [
      'name', 'businessRegistrationNumber', 'tin', 'vatRegistrationNumber', 'isRegistered',
      'address', 'city', 'state', 'phoneNumber', 'email', 'website', 
      'businessType', 'privacyConsentGiven', 'privacyPolicyVersion'
    ];
    
    formFields.forEach((key) => {
      const businessValue = businessData[key as keyof typeof businessData];
      
      // Handle each field type explicitly
      if (key === 'privacyConsentGiven' || key === 'isRegistered') {
        // Boolean field - explicitly check for true, preserve false
        // This is critical: undefined/null should become false, only true stays true
        const boolValue = businessValue === true || businessValue === "true";
        setValue(key as any, boolValue);
      } else if (key === 'privacyPolicyVersion') {
        // String field - preserve the version or empty string
        // Handle null, undefined, and empty string cases
        const stringValue = businessValue ? String(businessValue) : "";
        setValue(key as any, stringValue);
      } else {
        // String fields - preserve value or use empty string
        setValue(key as any, businessValue ? String(businessValue) : "");
      }
    });
  };

  // Businesses are fetched in DashboardLayout - no need to fetch here

  const updateBusinessSuccessHandler = (response: any) => {
    if (response?.data?.message === "success" && response?.data?.data) {
      const updatedBusiness = response.data.data;
      
      // DEBUG: Log what's received from API
      console.log("🔵 FRONTEND (Edit) - Received updated business from API:", {
        businessId: updatedBusiness._id,
        privacyConsentGiven: updatedBusiness.privacyConsentGiven,
        privacyConsentDate: updatedBusiness.privacyConsentDate,
        privacyPolicyVersion: updatedBusiness.privacyPolicyVersion,
        type_privacyConsentGiven: typeof updatedBusiness.privacyConsentGiven,
        hasPrivacyFields: {
          hasPrivacyConsentGiven: 'privacyConsentGiven' in updatedBusiness,
          hasPrivacyConsentDate: 'privacyConsentDate' in updatedBusiness,
          hasPrivacyPolicyVersion: 'privacyPolicyVersion' in updatedBusiness,
        },
        fullUpdatedBusiness: JSON.stringify(updatedBusiness, null, 2),
      });
      
      // Clear any previous errors
      dispatch(businessActions.setError(null));
      
      // Update Redux state directly with the updated document from API
      // No refetch needed - the API returns the complete updated document
      // This is more efficient and ensures UI stays in sync with server state
      dispatch(businessActions.updateBusiness(updatedBusiness));
      
      // CRITICAL: Update local businessData state immediately
      // This ensures the consent check uses the latest data
      setBusinessData(updatedBusiness);
      
      // CRITICAL: Repopulate form with updated business data to reflect consent changes
      // This ensures the form shows the correct consent state after update
      populateFormFromBusiness(updatedBusiness);
    }
  };

  const handleUpdateError = (errorResponse: any) => {
    const errorMessage = errorResponse?.data?.description || "Failed to update business information";
    dispatch(businessActions.setError(errorMessage));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (!business) {
      return;
    }

    // Determine if privacy consent needs to be updated
    const needsReconsent = needsPrivacyReconsent(business?.privacyPolicyVersion);
    
    const updateData = {
      ...values,
      isRegistered: values.isRegistered || false,
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
      business_privacyConsentGiven: business?.privacyConsentGiven,
      business_privacyPolicyVersion: business?.privacyPolicyVersion,
      CURRENT_PRIVACY_POLICY_VERSION,
      updateDataKeys: Object.keys(updateData),
    });

    updateBusinessReq({
      successRes: updateBusinessSuccessHandler,
      errorRes: handleUpdateError,
      requestConfig: {
        url: `/business/${business._id}`,
        method: HttpMethod.PUT,
        body: updateData,
        successMessage: "Your business information has been updated successfully!",
      },
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading your business information..." size={LoadingStateSize.Md} />;
  }

  // Show error state if there's an error and no business data
  if (error && !business && !isLoading) {
    const errorProps = createErrorStateProps(error);
    return (
      <RouteGuard requireAccountType={AccountType.Business} redirectTo="/dashboard/expenses">
        <ErrorState
          {...errorProps}
          title="Could Not Load Your Business Information"
          primaryAction={{
            label: "Try Again",
            onClick: () => {
              // Trigger refetch by invalidating cache - DashboardLayout will refetch
              dispatch(businessActions.invalidateCache());
              dispatch(businessActions.setBusinesses([]));
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
    <RouteGuard requireAccountType={AccountType.Business} redirectTo="/dashboard/expenses">
      <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-6"
    >
      <motion.div variants={itemVariants} className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="bg-emerald-100 p-3 rounded-2xl shrink-0">
              <Building2 className="w-8 h-8 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Business Profile</h1>
              <p className="text-lg text-slate-600 mt-2 font-medium">
                Manage your official tax details.
              </p>
            </div>
          </div>
          
          <Button 
            variant={ButtonVariant.Outline} 
            onClick={() => setIsGuideOpen(true)}
            className="self-start sm:self-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-all shadow-sm group py-4 px-5 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-1.5 rounded-full group-hover:bg-emerald-200 transition-colors">
                <Shield className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">Confused?</span>
                <span className="block font-bold text-sm">How This Works</span>
              </div>
            </div>
          </Button>
        </div>
      </motion.div>

      {business && (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Error alert for update errors */}
          {error && business && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <ErrorState 
                type={error.type}
                title={error.message}
                description={error.description}
                primaryAction={{
                  label: "Dismiss",
                  onClick: () => dispatch(businessActions.setError(null)),
                  icon: X,
                  variant: ButtonVariant.Outline
                }}
                fullPage={false}
                className="rounded-lg border-2"
              />
            </motion.div>
          )}

          <Card 
            title="Business Details" 
            subtitle="Update your business information. Changes here will be reflected in your invoices and tax records."
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
                <motion.div variants={itemVariants}>
                  <Input
                    label="Business Name"
                    type="text"
                    required={true}
                    value={values.name}
                    onChange={handleChange("name")}
                    onBlur={handleBlur("name")}
                    error={touched.name ? errors.name : undefined}
                    placeholder="e.g., Adebayo Stores"
                    className="text-lg"
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Input
                    label="Business Type"
                    type="text"
                    value={values.businessType}
                    onChange={handleChange("businessType")}
                    onBlur={handleBlur("businessType")}
                    placeholder="e.g., Shop, Restaurant, Tech"
                    className="text-lg"
                  />
                </motion.div>
              </motion.div>

              {/* VAT Registration Threshold Warning */}
              {requiresVATRegistration(business?.annualTurnover || 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5"
                >
                  <div className="flex items-start space-x-4">
                    <div className="bg-amber-100 p-2 rounded-full shrink-0">
                      <RefreshCw className="w-6 h-6 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-amber-900 mb-2">
                        Action Required: VAT Registration
                      </p>
                      <p className="text-base text-amber-800 mb-3 leading-relaxed">
                        Your business has grown! Since your turnover is over ₦25 Million, the law requires you to register for VAT.
                      </p>
                      <p className="text-sm font-medium text-amber-700 bg-amber-100/50 p-3 rounded-lg">
                        Please enter your TIN and VAT Number below to stay compliant and avoid penalties.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* CAC Registration Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="border-t border-slate-200 pt-8 mt-8"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                  <Building2 className="w-6 h-6 mr-3 text-emerald-600" />
                  Business Registration (CAC)
                </h3>
                <p className="text-base text-slate-600 mb-6">
                  Is your business officially registered with the Corporate Affairs Commission?
                </p>
                <div className="space-y-6">
                  <div className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-emerald-200 transition-colors" onClick={() => {
                        const newValue = !values.isRegistered;
                        setValue("isRegistered", newValue);
                        if (!newValue) {
                          setValue("businessRegistrationNumber", "");
                        }
                      }}>
                    <input
                      type="checkbox"
                      id="isRegistered-edit"
                      checked={values.isRegistered || false}
                      readOnly
                      className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                    />
                    <label htmlFor="isRegistered-edit" className="ml-3 text-base font-medium text-slate-700 cursor-pointer select-none">
                      Yes, I am registered with CAC
                    </label>
                  </div>
                  {values.isRegistered && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                    >
                      <Input
                        label="Enter your CAC Number"
                        type="text"
                        required
                        value={String(values.businessRegistrationNumber || "")}
                        onChange={handleChange("businessRegistrationNumber")}
                        onBlur={handleBlur("businessRegistrationNumber")}
                        error={touched.businessRegistrationNumber ? errors.businessRegistrationNumber : undefined}
                        helperText="Example: RC123456 or BN1234567"
                        placeholder="RC..."
                        className="text-lg"
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* TIN and VRN Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="border-t border-slate-200 pt-8 mt-8"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                  <Shield className="w-6 h-6 mr-3 text-emerald-600" />
                  Tax Identification
                </h3>
                <p className="text-base text-slate-600 mb-6">
                  {requiresVATRegistration(business?.annualTurnover || 0)
                    ? "Since your turnover is over ₦25M, these numbers are required by law."
                    : "These are your official tax numbers. It's okay if you don't have them yet."}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Input
                    label={`Tax ID Number (TIN)${requiresTIN(business?.annualTurnover || 0) ? " *" : ""}`}
                    type="text"
                    required={requiresTIN(business?.annualTurnover || 0)}
                    value={String(values.tin || "")}
                    onChange={handleChange("tin")}
                    onBlur={handleBlur("tin")}
                    error={touched.tin ? errors.tin : undefined}
                    helperText={requiresTIN(business?.annualTurnover || 0) 
                      ? "Required. Must be 10-12 digits."
                      : "Optional. 10-12 digits if you have one."}
                    placeholder="e.g., 12345678901"
                    className="text-lg"
                  />
                  <Input
                    label={`VAT Number (VRN)${requiresVATRegistration(business?.annualTurnover || 0) ? " *" : ""}`}
                    type="text"
                    required={requiresVATRegistration(business?.annualTurnover || 0)}
                    value={String(values.vatRegistrationNumber || "")}
                    onChange={handleChange("vatRegistrationNumber")}
                    onBlur={handleBlur("vatRegistrationNumber")}
                    error={touched.vatRegistrationNumber ? errors.vatRegistrationNumber : undefined}
                    helperText={requiresVATRegistration(business?.annualTurnover || 0)
                      ? "Required. Must be 8-12 digits."
                      : "Optional. 8-12 digits if you have one."}
                    placeholder="e.g., 12345678"
                    className="text-lg"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="border-t border-slate-200 pt-8 mt-8"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                  <Building2 className="w-6 h-6 mr-3 text-emerald-600" />
                  Contact Details
                </h3>
                <p className="text-base text-slate-600 mb-6">
                  Where should we send your tax alerts and important updates?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Input
                      label="Business Address"
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
                      label="City"
                      type="text"
                      value={values.city}
                      onChange={handleChange("city")}
                      onBlur={handleBlur("city")}
                      placeholder="e.g., Lagos, Abuja"
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
                      placeholder="e.g., 08012345678"
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
                      placeholder="yourbusiness@email.com"
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
                      placeholder="https://yourbusiness.com"
                    />
                  </motion.div>
                </div>
              </motion.div>

              {business.taxClassification && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-4 md:p-6 mt-6 md:mt-8"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="bg-emerald-200/50 p-3 rounded-xl shrink-0">
                      <Shield className="w-8 h-8 text-emerald-700" />
                    </div>
                    <div className="w-full">
                      <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-emerald-700 mb-1">
                        Your Tax Category
                      </p>
                      <h3 className="text-xl md:text-2xl font-extrabold text-emerald-900 mb-2">
                        {business.taxClassification
                          .replace(/_/g, " ")
                          .replace(/Company/g, "Business")
                          .split(" ").map((word: string) => 
                          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(" ")}
                      </h3>
                      
                      <div className="mt-4 pt-4 border-t border-emerald-200/60">
                         <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mb-2">
                           <span className="text-sm font-semibold text-emerald-800">Annual Turnover:</span>
                           <span className="text-lg md:text-xl font-bold text-emerald-950">
                             {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(business.annualTurnover || 0)}
                           </span>
                         </div>
                         <p className="text-sm text-emerald-700 leading-relaxed">
                           This is your total sales for the year, calculated from your paid invoices. We use this to decide which tax rules apply to you.
                         </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Privacy and Data Consent - Only show if re-consent is needed */}
              {/* Check multiple sources to ensure we have the correct consent state */}
              {(() => {
                // Don't show consent section if business data hasn't loaded yet
                if (!business && !businessData && isLoadingBusiness) {
                  return false; // Don't show while loading
                }
                
                // Priority order: businessData (local, most recent) > business (Redux) > form values
                const currentBusiness = businessData || business;
                
                // If we don't have business data yet, don't show (wait for it to load)
                if (!currentBusiness) {
                  return false;
                }
                
                
                // Check consent from business object (most reliable source)
                // Handle both boolean true and string "true" cases
                const businessConsentValue = currentBusiness?.privacyConsentGiven;
                const hasConsentFromBusiness = businessConsentValue === true || businessConsentValue === "true";
                
                // Also check form values (in case business object hasn't updated yet)
                const hasConsentFromForm = values.privacyConsentGiven === true;
                
                // User has consent if either source says yes
                const hasConsent = hasConsentFromBusiness || hasConsentFromForm;
                
                // Get version - prefer business object, otherwise use form value
                const consentVersion = currentBusiness?.privacyPolicyVersion ?? values.privacyPolicyVersion;
                const versionMatches = consentVersion === CURRENT_PRIVACY_POLICY_VERSION;
                
                // Show consent section ONLY if:
                // 1. No consent given yet (neither business nor form has it), OR
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
                entityType="business"
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

      {!business && !isLoading && !error && (
        <motion.div variants={itemVariants}>
          <Card title="No Business Found">
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">
                You haven't set up your business yet. Let's get you started!
              </p>
              <Button onClick={() => router.push("/dashboard/business/onboard")}>
                Set Up Your Business
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
          description="You've finished managing your business profile. Return to the main dashboard."
          href="/dashboard"
          actionLabel="Go to Dashboard"
        />
      </motion.div>
    </motion.div>
      <BusinessProfileGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
    </RouteGuard>
  );
}
