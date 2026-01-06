"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { complianceActions } from "@/store/redux/compliance/compliance-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";
import { ErrorState } from "@/components/shared/ErrorState";
import { createErrorStateProps } from "@/components/shared/errorUtils";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { Shield, AlertTriangle, CheckCircle2, Clock, RefreshCw, ArrowRight, Download, FileText, Info } from "lucide-react";
import { toast } from "sonner";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { ButtonVariant, ButtonSize, LoadingStateSize } from "@/lib/utils/client-enums";
import type { ComplianceStatus, TaxDeadline } from "@/store/redux/compliance/compliance-slice";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { ComplianceGuideModal } from "@/components/dashboard/compliance/ComplianceGuideModal";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

interface ComplianceContentProps {
  entityId: string;
  accountType: AccountType;
  currentPlan: SubscriptionPlan;
}

export function ComplianceContent({ entityId, accountType, currentPlan }: ComplianceContentProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // CRITICAL: Validate entityId prop - fail loudly if missing
  if (!entityId) {
    throw new Error("ComplianceContent: entityId prop is required.");
  }

  // CRITICAL: Validate accountType prop - fail loudly if missing
  if (!accountType) {
    throw new Error("ComplianceContent: accountType prop is required.");
  }

  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(accountType)) {
    throw new Error(`ComplianceContent: Invalid accountType "${accountType}". Valid values are: ${validAccountTypes.join(", ")}.`);
  }

  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;

  // CRITICAL: Validate account type is Company or Business (Individual accounts don't have compliance dashboard)
  if (!isCompanyAccount && !isBusinessAccount) {
    throw new Error(
      `ComplianceContent: Invalid account type "${accountType}". ` +
      `Expected AccountType.Company or AccountType.Business. ` +
      "Individual accounts do not have compliance dashboard."
    );
  }

  // CRITICAL: Validate currentPlan prop - fail loudly if missing or invalid
  if (!currentPlan) {
    throw new Error("ComplianceContent: currentPlan prop is required.");
  }

  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentPlan)) {
    throw new Error(`ComplianceContent: Invalid currentPlan "${currentPlan}". Valid values are: ${validPlans.join(", ")}.`);
  }

  // Get compliance state from Redux
  const {
    data,
    hasFetched,
    isLoading,
    error,
    companyId: complianceCompanyId,
  } = useAppSelector((state: any) => state.compliance);
  
  const { sendHttpRequest: fetchComplianceReq } = useHttp();
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  
  // Modal State
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const hasExportAccess = SUBSCRIPTION_PRICING[currentPlan]?.features?.exports === true;

  // Sync entityId in Redux when it changes
  useEffect(() => {
    if (entityId && entityId !== complianceCompanyId) {
      dispatch(complianceActions.setCompanyId(entityId));
    }
  }, [entityId, complianceCompanyId, dispatch]);

  // Fetch compliance data when:
  // 1. EntityId is available AND data hasn't been fetched
  // 2. EntityId changes (Redux sets hasFetched to false when companyId changes)
  useEffect(() => {
    // Don't fetch if already loading or if we don't have an entityId yet
    if (isLoading || !entityId) return;
    
    // Fetch if data hasn't been fetched for current entityId
    if (!hasFetched) {
      fetchComplianceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, hasFetched, isLoading]);

  const fetchComplianceData = useCallback(() => {
    // CRITICAL: Validate entityId - fail loudly if missing
    if (!entityId) {
      throw new Error(
        "ComplianceContent.fetchComplianceData: entityId is required. " +
        "This should be validated at component level before calling fetchComplianceData."
      );
    }
    
    dispatch(complianceActions.setLoading(true));
    
    fetchComplianceReq({
      successRes: (response: any) => {
        const responseData = response?.data?.data;
        
        // Convert date strings to ISO strings for Redux (must be serializable)
        // Redux requires all values to be serializable (no Date objects)
        const deadlines = (responseData.taxDeadlines || []).map((deadline: any) => ({
          ...deadline,
          date: deadline.date 
            ? (deadline.date instanceof Date ? deadline.date.toISOString() : deadline.date)
            : new Date().toISOString(),
        }));
        
        // Convert lastChecked to ISO string if it's a Date
        const complianceStatus = responseData.complianceStatus ? {
          ...responseData.complianceStatus,
          lastChecked: responseData.complianceStatus.lastChecked 
            ? (responseData.complianceStatus.lastChecked instanceof Date 
                ? responseData.complianceStatus.lastChecked.toISOString()
                : responseData.complianceStatus.lastChecked)
            : new Date().toISOString(),
        } : null;
        
        // Store in Redux (all dates are now ISO strings - serializable)
        dispatch(complianceActions.setComplianceData({
          data: {
            complianceStatus,
            taxDeadlines: deadlines,
          },
          companyId: entityId,
        }));
      },
      errorRes: (errorResponse: any) => {
        if (errorResponse?.status === 404) {
          // CRITICAL: Redirect to correct onboarding page based on account type
          const onboardingRoute = isCompanyAccount ? "/dashboard/company/onboard" : "/dashboard/business/onboard";
          router.push(onboardingRoute);
          return false;
        }
        dispatch(
          complianceActions.setError(
            errorResponse?.data?.description || "Failed to load compliance data"
          )
        );
        return true;
      },
      requestConfig: {
        url: isCompanyAccount 
          ? `/compliance/dashboard?companyId=${entityId}`
          : `/compliance/dashboard?businessId=${entityId}`,
        method: HttpMethod.GET,
      },
    });
  }, [entityId, isLoading, dispatch, fetchComplianceReq, router, isCompanyAccount]);

  // Refresh compliance data (invalidate cache and refetch)
  const refreshCompliance = useCallback(() => {
    // CRITICAL: entityId is validated at component level, so it's guaranteed to exist here
    dispatch(complianceActions.invalidateCache());
    fetchComplianceData();
  }, [dispatch, fetchComplianceData]);
  
  // Extract data from Redux state and convert ISO strings back to Date objects for UI
  // Redux stores dates as ISO strings (serializable), but UI needs Date objects
  const complianceStatus = data?.complianceStatus ? {
    ...data.complianceStatus,
    lastChecked: data.complianceStatus.lastChecked 
      ? (typeof data.complianceStatus.lastChecked === 'string' 
          ? new Date(data.complianceStatus.lastChecked)
          : data.complianceStatus.lastChecked)
      : new Date(),
  } : null;
  
  const taxDeadlines = (data?.taxDeadlines || []).map((deadline: TaxDeadline) => ({
    ...deadline,
    date: deadline.date 
      ? (typeof deadline.date === 'string' ? new Date(deadline.date) : deadline.date)
      : new Date(),
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "at_risk":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "non_compliant":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
      }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 text-red-900 border-red-200";
      case "high":
        return "bg-orange-50 text-orange-900 border-orange-200";
      case "medium":
        return "bg-amber-50 text-amber-900 border-amber-200";
      default:
        return "bg-emerald-50 text-emerald-900 border-emerald-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "medium":
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    }
  };

  /**
   * Determines if an alert should have a link to the entity details page
   * TIN/CAC alerts should link to company or business management page
   */
  const shouldShowEntityLink = (alertType: string): boolean => {
    return alertType === "missing_tin" || alertType === "missing_cac";
  };

  /**
   * Gets the correct entity management page route based on account type
   */
  const getEntityManagementRoute = (): string => {
    return isCompanyAccount ? "/dashboard/company" : "/dashboard/business";
  };

  /**
   * Gets the correct WHT route based on account type
   */
  const getWHTRoute = (): string => {
    return isCompanyAccount ? "/dashboard/wht" : "/dashboard/business/wht";
  };

  /**
   * Determines if an alert should have a link to the WHT page
   * WHT remittance alerts should link to the WHT management page
   */
  const shouldShowWHTLink = (alertType: string): boolean => {
    return alertType === "wht_remittance";
  };

  /**
   * Handles downloading tax filing documents from deadline cards
   */
  const handleDownloadFilingDocument = async (deadlineName: string, deadlineDate: Date | string) => {
    // CRITICAL: Validate entityId - fail loudly if missing (should never happen due to component-level validation)
    if (!entityId) {
      throw new Error(
        "ComplianceContent.handleDownloadFilingDocument: entityId is required. " +
        "This should be validated at component level before calling handleDownloadFilingDocument."
      );
    }
    
    if (downloadingDoc) return; // Already downloading, prevent duplicate requests

    // Check if user has export access (Free plan doesn't have exports)
    // Check if user has export access (Free plan doesn't have exports)
    if (!hasExportAccess) {
      toast.info("Free Plan Limitation", {
        description: "Your document will include a 'taxcomply.com.ng' watermark. Upgrade to the Starter plan for official, unbranded documents.",
        duration: 5000,
      });
      // Allow download to proceed with watermark
    }

    setDownloadingDoc(deadlineName);
    
    try {
      // Ensure deadlineDate is a Date object
      const date = deadlineDate instanceof Date ? deadlineDate : new Date(deadlineDate);
      
      // Validate the date
      if (isNaN(date.getTime())) {
        throw new Error("Invalid deadline date");
      }
      
      const deadlineYear = date.getFullYear();
      const deadlineMonth = date.getMonth() + 1; // JavaScript months are 0-indexed
      
      let url = "";
      
      // Determine which document to generate based on deadline name
      if (deadlineName.includes("VAT")) {
        const filingMonth = deadlineMonth === 1 ? 12 : deadlineMonth - 1;
        const filingYear = deadlineMonth === 1 ? deadlineYear - 1 : deadlineYear;
        url = isCompanyAccount 
          ? `/api/v1/tax-filing/vat-return?companyId=${entityId}&month=${filingMonth}&year=${filingYear}`
          : `/api/v1/tax-filing/vat-return?businessId=${entityId}&month=${filingMonth}&year=${filingYear}`;
      } else if (deadlineName.includes("PAYE")) {
        const filingMonth = deadlineMonth === 1 ? 12 : deadlineMonth - 1;
        const filingYear = deadlineMonth === 1 ? deadlineYear - 1 : deadlineYear;
        url = isCompanyAccount 
          ? `/api/v1/tax-filing/paye-remittance?companyId=${entityId}&month=${filingMonth}&year=${filingYear}`
          : `/api/v1/tax-filing/paye-remittance?businessId=${entityId}&month=${filingMonth}&year=${filingYear}`;
      } else if (deadlineName.includes("Company Income Tax") || deadlineName.includes("CIT")) {
        const filingYear = deadlineYear - 1; 
        if (!isCompanyAccount) {
          toast.error("CIT is for Companies only.");
          setDownloadingDoc(null);
          return;
        }
        url = `/api/v1/tax-filing/cit-return?companyId=${entityId}&year=${filingYear}`;
      } else if (deadlineName.includes("PIT") || deadlineName.includes("Form A")) {
        const filingYear = deadlineYear - 1; 
        if (!isBusinessAccount) {
           toast.error("PIT Annual Returns are for Business accounts.");
           setDownloadingDoc(null);
           return;
        }
        url = `/api/v1/tax-filing/pit-return?businessId=${entityId}&year=${filingYear}`;
      } else {
        setDownloadingDoc(null);
        return;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.description || "Failed to generate document");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "tax-document.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      if (!filename.endsWith('.pdf')) filename += '.pdf';
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success("Downloaded Successfully", {
        description: "Your tax document is ready.",
      });
      
      setDownloadingDoc(null);
    } catch (error: any) {
      console.error("Error downloading document:", error);
      toast.error("Download Failed", {
        description: error.message || "Please try again.",
      });
      setDownloadingDoc(null);
    }
  };

  // Show loading state until compliance data is fetched
  const shouldShowLoading = isLoading && !hasFetched;
  
  if (shouldShowLoading && !error) {
    return <LoadingState message="Checking your tax health..." size={LoadingStateSize.Md} />;
  }

  // Show error state with retry button
  if (error && !data && !isLoading && hasFetched) {
    const errorProps = createErrorStateProps(error);
    return (
      <ErrorState
        {...errorProps}
        title="Could Not Check Tax Health"
        primaryAction={{
          label: "Try Again",
          onClick: fetchComplianceData,
          icon: RefreshCw,
        }}
      />
    );
  }

  /**
   * Gets the correct tax filing route based on account type
   */
  const getTaxFilingRoute = (): string => {
    return isCompanyAccount ? "/dashboard/tax-filing" : "/dashboard/business/tax-filing";
  };

  return (
    <div className="space-y-6">
       {/* Guide Modal */}
       <ComplianceGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <span className="bg-emerald-100 p-2 rounded-lg">
                    <Shield className="w-6 h-6 text-emerald-700" />
                </span>
                Your Tax Health
            </h1>
            <p className="text-slate-600 mt-1 text-base md:text-lg">
                See if you're safe from government fines.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <Button
                variant={ButtonVariant.Outline}
                onClick={() => setIsGuideOpen(true)}
                className="justify-center border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
                <Info className="w-4 h-4 mr-2" />
                What is this?
            </Button>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={ButtonVariant.Outline}
                onClick={refreshCompliance}
                className="w-full justify-center border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {complianceStatus && (
          <>
            {/* 1. Safety Score Card */}
            <motion.div variants={itemVariants}>
              <Card 
                title="Safety Score"
                subtitle="A high score means you are safe from NRS fines."
              >
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className={`px-6 py-3 rounded-xl border-2 font-bold text-sm ${getStatusColor(
                        complianceStatus.status
                      )}`}
                    >
                      {complianceStatus.status === 'compliant' ? "SAFE" : 
                       complianceStatus.status === 'at_risk' ? "AT RISK" : "DANGER"}
                    </motion.div>
                    <div className="flex-1 w-full">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${complianceStatus.score}%` }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className={`h-3 rounded-full ${
                              complianceStatus.score >= 80
                                ? "bg-emerald-500"
                                : complianceStatus.score >= 60
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                          />
                        </div>
                        <span className="text-xl font-bold text-slate-700 min-w-[60px]">
                          {complianceStatus.score}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* 2. Action Needed Card - only if alerts exist */}
            {complianceStatus.alerts.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card title="Action Needed (Fix Now)">
                  <div className="space-y-4">
                    {complianceStatus.alerts.map((alert: ComplianceStatus['alerts'][0], index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className={`p-5 rounded-xl border ${getSeverityColor(alert.severity)}`}
                      >
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                          <div className="flex-shrink-0 mt-0.5">
                            {getSeverityIcon(alert.severity)}
                          </div>
                          
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 mb-1">{alert.message}</p>
                            <p className="text-sm opacity-90">{alert.actionRequired}</p>
                          </div>

                          <div className="w-full md:w-auto mt-2 md:mt-0">
                            {shouldShowEntityLink(alert.type) && (
                                <Link href={getEntityManagementRoute()} className="block w-full">
                                  <Button
                                    size={ButtonSize.Sm}
                                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                  >
                                    Update Details
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                  </Button>
                                </Link>
                            )}
                            {shouldShowWHTLink(alert.type) && (
                                <Link href={getWHTRoute()} className="block w-full">
                                  <Button
                                    size={ButtonSize.Sm}
                                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                  >
                                    Go to WHT
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                  </Button>
                                </Link>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}

        {/* 3. Upcoming Deadlines */}
        {taxDeadlines.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card title="Upcoming Payments & Filings">
              <div className="space-y-4">
                {taxDeadlines.map((deadline: TaxDeadline, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="p-5 bg-white rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all block"
                  >
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Clock className="w-5 h-5 text-emerald-600" />
                          <h4 className="font-bold text-slate-900 text-lg">{deadline.name}</h4>
                        </div>
                        <p className="text-slate-600 mb-3">{deadline.action}</p>
                        
                         <Button
                            size={ButtonSize.Sm}
                            onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFilingDocument(deadline.name, deadline.date);
                            }}
                            disabled={downloadingDoc === deadline.name}
                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                        >
                            {downloadingDoc === deadline.name ? (
                            "Generating..."
                            ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Download Schedule
                            </>
                            )}
                        </Button>
                      </div>

                      <div className="w-full md:w-auto text-left md:text-right bg-slate-50 p-3 rounded-lg md:bg-transparent md:p-0">
                        <p className="text-sm font-bold text-slate-900 mb-1">
                            Due Date: {formatDate(deadline.date)}
                        </p>
                        <p className={`text-xs font-bold ${deadline.date < new Date() ? "text-red-600" : "text-emerald-600"}`}>
                          {deadline.date < new Date() ? "OVERDUE" : "UPCOMING"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Next Step Navigation */}
        <motion.div variants={itemVariants}>
          <NextStepCard
            title="Ready to File?"
            description="You've checked your health score. Now generate your tax schedules."
            href={getTaxFilingRoute()}
            actionLabel="Go to Tax Returns"
          />
        </motion.div>

        {/* Upgrade Prompt */}
        <UpgradePromptComponent />
      </motion.div>
    </div>
  );
}
