"use client";

import { AccountType } from "@/lib/utils/account-type";
import { DocumentType, ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { FileText, Download, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { TaxFilingGuideModal } from "@/components/dashboard/tax-filing/TaxFilingGuideModal";

interface TaxFilingContentProps {
  accountId: string;
  entityId: string | null;
  accountType: AccountType;
  currentPlan: SubscriptionPlan;
}

export function TaxFilingContent({ accountId: accountIdProp, entityId: entityIdProp, accountType: accountTypeProp, currentPlan: currentPlanProp }: TaxFilingContentProps) {
  const router = useRouter();

  // CRITICAL: Validate props - fail loudly if missing
  if (!accountIdProp) throw new Error("TaxFilingContent: accountId prop is required.");
  if (!accountTypeProp) throw new Error("TaxFilingContent: accountType prop is required.");
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(accountTypeProp)) throw new Error(`TaxFilingContent: Invalid accountType "${accountTypeProp}".`);
  if (!currentPlanProp) throw new Error("TaxFilingContent: currentPlan prop is required.");
  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(currentPlanProp)) throw new Error(`TaxFilingContent: Invalid currentPlan "${currentPlanProp}".`);

  // CRITICAL: Validate entityId for Company/Business accounts
  const isIndividualAccount = accountTypeProp === AccountType.Individual;
  const isCompanyAccount = accountTypeProp === AccountType.Company;
  const isBusinessAccount = accountTypeProp === AccountType.Business;

  if ((isCompanyAccount || isBusinessAccount) && !entityIdProp) {
    throw new Error(`TaxFilingContent: entityId prop is required for ${accountTypeProp} accounts.`);
  }

  const accountId = accountIdProp;
  const entityId = entityIdProp;
  const accountType = accountTypeProp;
  const currentPlan = currentPlanProp;

  const hasExportAccess = SUBSCRIPTION_PRICING[currentPlan]?.features?.exports === true;
  const { showUpgradePrompt } = useUpgradePrompt();
  
  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  const minTaxYear = 2026;
  const now = new Date();
  const currentYear = now.getFullYear();
  // CRITICAL: Ensure startYear is at least minTaxYear to always have dropdown options
  const startYear = Math.max(currentYear, minTaxYear);
  const [yearlyYear, setYearlyYear] = useState<number>(startYear);
  const [monthlyYear, setMonthlyYear] = useState<number>(startYear);
  const [monthlyMonth, setMonthlyMonth] = useState<number>(new Date().getMonth() + 1);
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  
  // Modal State
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  /**
   * Gets the compliance route based on account type
   */
  const getComplianceRoute = (): string => {
    if (isCompanyAccount) return "/dashboard/compliance";
    if (isBusinessAccount) return "/dashboard/business/compliance";
    return "/dashboard/expenses";
  };

  /**
   * Handles generating tax filing documents with custom year/month filters
   * CRITICAL: This function should only be called when all required IDs are validated
   */
  const handleGenerateDocument = async (
    documentType: DocumentType,
    year: number,
    month?: number
  ) => {
    
    // CRITICAL: Validate inputs - fail loudly if invalid
    if (isNaN(year) || !isFinite(year) || year < 2026 || year > 2100) {
      throw new Error(`Invalid year ${year}. Must be >= 2026.`);
    }
    

    if (month !== undefined && month !== null) {
      if (isNaN(month) || !isFinite(month) || month < 1 || month > 12) {
        throw new Error(`Invalid month ${month}. Must be 1-12.`);
      }
    }
    

    if (generatingDoc) return; // Prevent duplicates

    // Check upgrade
    // Check upgrade
    if (!hasExportAccess) {
      toast.info("Free Plan Limitation", {
        description: "Your document will include a 'taxcomply.ng' watermark. Upgrade to the Starter plan for official, unbranded documents.",
        duration: 5000,
      });
      // We don't return here anymore, we let it proceed to download the watermarked version
    }
    

    const docKey = `${documentType}-${year}-${month || "yearly"}`;
    setGeneratingDoc(docKey);
    
    try {
      let url = "";
      
      // CRITICAL: Build URL based on document type and account type
      if (documentType === DocumentType.VATMonthly && month) {
         if (isCompanyAccount) url = `/api/v1/tax-filing/vat-return?companyId=${entityId}&month=${month}&year=${year}`;
         else if (isBusinessAccount) url = `/api/v1/tax-filing/vat-return?businessId=${entityId}&month=${month}&year=${year}`;
      } else if (documentType === DocumentType.VATYearly) {
         if (isCompanyAccount) url = `/api/v1/tax-filing/vat-return?companyId=${entityId}&year=${year}`;
         else if (isBusinessAccount) url = `/api/v1/tax-filing/vat-return?businessId=${entityId}&year=${year}`;
      } else if (documentType === DocumentType.PAYE && month) {
         if (isCompanyAccount) url = `/api/v1/tax-filing/paye-remittance?companyId=${entityId}&month=${month}&year=${year}`;
         else if (isBusinessAccount) url = `/api/v1/tax-filing/paye-remittance?businessId=${entityId}&month=${month}&year=${year}`;
      } else if (documentType === DocumentType.WHTRemittance && month) {
         if (isCompanyAccount) url = `/api/v1/tax-filing/wht-remittance?companyId=${entityId}&month=${month}&year=${year}`;
         else if (isBusinessAccount) url = `/api/v1/tax-filing/wht-remittance?businessId=${entityId}&month=${month}&year=${year}`;
      } else if (documentType === DocumentType.CIT) {
         if (!isCompanyAccount) throw new Error("CIT is only for Companies.");
         url = `/api/v1/tax-filing/cit-return?companyId=${entityId}&year=${year}`;
      } else if (documentType === DocumentType.PITReturn) {
         url = `/api/v1/tax-filing/pit-return?accountId=${accountId}&year=${year}`;
      } else {
        throw new Error(`Invalid document type: ${documentType}`);
      }

      if (!url) throw new Error("Could not determine API URL.");

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 && errorData?.data?.upgradeRequired) {
             const upgradeData = errorData.data.upgradeRequired;
             showUpgradePrompt({
                feature: upgradeData.feature || "Tax Documents",
                currentPlan: upgradeData.currentPlan,
                requiredPlan: upgradeData.requiredPlan,
                requiredPlanPrice: upgradeData.requiredPlanPrice,
                message: errorData.description || "Upgrade required to download documents.",
                reason: upgradeData.reason,
              });
             setGeneratingDoc(null);
             return;
        }
        throw new Error(errorData.description || "Failed to generate document");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      
      // Handle filename
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
      
      toast.success("Download Complete", { description: "Your tax document is ready." });
      setGeneratingDoc(null);

    } catch (error: any) {
      console.error("Error generating document:", error);
      toast.error("Download Failed", { description: error.message || "Please try again." });
      setGeneratingDoc(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Guide Modal */}
      <TaxFilingGuideModal 
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        accountType={accountType} 
      />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <span className="bg-emerald-100 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-emerald-700" />
            </span>
            Tax Returns
          </h1>
          <p className="text-slate-600 mt-1 text-lg">
            Generate tax schedules and reports to assist with your filings.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <Button
                variant={ButtonVariant.Outline}
                onClick={() => setIsGuideOpen(true)}
                className="w-full sm:w-auto justify-center border-emerald-200 text-emerald-700 hover:bg-emerald-50 whitespace-nowrap"
            >
                Start Here: How to File?
            </Button>

            {(isCompanyAccount || isBusinessAccount) && (
              <Button
                  variant={ButtonVariant.Outline}
                  onClick={() => router.push(getComplianceRoute())}
                  className="w-full sm:w-auto justify-center whitespace-nowrap"
              >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Check Status
              </Button>
            )}
        </div>
      </motion.div>

        {/* Yearly Documents Section */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
          <Card title="Annual Tax Returns (Yearly)">
            <div className="space-y-6">
              <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Select Filing Year
                    </label>
                    <select
                      value={yearlyYear}
                      onChange={(e) => setYearlyYear(Math.max(minTaxYear, parseInt(e.target.value)))}
                      className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                    >
                      {Array.from({ length: 6 }, (_, i) => startYear - i).filter(y => y >= minTaxYear).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  {isCompanyAccount ? (
                    <>
                      <Button
                        size={ButtonSize.Lg}
                        onClick={() => handleGenerateDocument(DocumentType.CIT, yearlyYear)}
                        disabled={!!generatingDoc}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full md:w-auto justify-center"
                      >
                         {generatingDoc?.includes('cit') ? "Generating..." : "Download CIT Report"}
                         <Download className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        size={ButtonSize.Lg}
                        onClick={() => handleGenerateDocument(DocumentType.VATYearly, yearlyYear)}
                         disabled={!!generatingDoc}
                         className="bg-slate-800 hover:bg-slate-900 text-white w-full md:w-auto justify-center"
                      >
                         {generatingDoc?.includes('vat-yearly') ? "Generating..." : "Download Annual VAT"}
                         <Download className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size={ButtonSize.Lg}
                        onClick={() => handleGenerateDocument(DocumentType.PITReturn, yearlyYear)}
                         disabled={!!generatingDoc}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full md:w-auto justify-center"
                      >
                         {generatingDoc?.includes('pit') ? "Generating..." : "Download Personal Tax Return (PIT)"}
                        <Download className="w-4 h-4 ml-2" />
                      </Button>
                      
                       {(isBusinessAccount) && (
                         <Button
                            size={ButtonSize.Lg}
                            onClick={() => handleGenerateDocument(DocumentType.VATYearly, yearlyYear)}
                            disabled={!!generatingDoc}
                             className="bg-slate-800 hover:bg-slate-900 text-white w-full md:w-auto justify-center"
                         >
                            {generatingDoc?.includes('vat-yearly') ? "Generating..." : "Download Annual VAT"}
                            <Download className="w-4 h-4 ml-2" />
                        </Button>
                       )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Monthly Documents Section - For Company and Business Accounts */}
        {(isCompanyAccount || isBusinessAccount) && (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
        >
          <Card title="Monthly Returns (Every Month)">
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Year</label>
                    <select
                      value={monthlyYear}
                      onChange={(e) => setMonthlyYear(Math.max(minTaxYear, parseInt(e.target.value)))}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
                    >
                      {Array.from({ length: 6 }, (_, i) => startYear - i).filter(y => y >= minTaxYear).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Month</label>
                    <select
                      value={monthlyMonth}
                      onChange={(e) => setMonthlyMonth(parseInt(e.target.value))}
                       className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size={ButtonSize.Md}
                    onClick={() => handleGenerateDocument(DocumentType.VATMonthly, monthlyYear, monthlyMonth)}
                    disabled={!!generatingDoc}
                    className="flex-1 justify-center bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-0"
                  >
                     <Download className="w-4 h-4 mr-2" />
                     Download VAT
                     {generatingDoc?.includes('vat-monthly') && "..."}
                  </Button>
                  <Button
                    size={ButtonSize.Md}
                    onClick={() => handleGenerateDocument(DocumentType.PAYE, monthlyYear, monthlyMonth)}
                    disabled={!!generatingDoc}
                    className="flex-1 justify-center bg-blue-600 text-white hover:bg-blue-700 shadow-sm border-0"
                  >
                     <Download className="w-4 h-4 mr-2" />
                     Download PAYE (Staff Tax)
                     {generatingDoc?.includes('paye') && "..."}
                  </Button>
                  <Button
                    size={ButtonSize.Md}
                    onClick={() => handleGenerateDocument(DocumentType.WHTRemittance, monthlyYear, monthlyMonth)}
                    disabled={!!generatingDoc}
                    className="flex-1 justify-center bg-purple-600 text-white hover:bg-purple-700 shadow-sm border-0"
                  >
                     <Download className="w-4 h-4 mr-2" />
                     Download WHT
                     {generatingDoc?.includes('wht') && "..."}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
        )}
    </div>
  );
}
