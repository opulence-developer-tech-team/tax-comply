"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useState, useEffect } from "react";
import { PITEmploymentSource, ButtonVariant, ButtonSize, ConfirmModalVariant } from "@/lib/utils/client-enums";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { SimpleTooltip } from "@/components/shared/SimpleTooltip";
import { 
  Building2, 
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  CreditCard,
  Wallet,
  Heart,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmploymentDeductionsGuideModal } from "@/components/dashboard/guide-modals/EmploymentDeductionsGuideModal";

interface EmploymentDeductions {
  _id?: string;
  accountId: string;
  taxYear: number;
  annualPension: number;
  annualNHF: number;
  annualNHIS: number;
  // New allowable deductions (2026+)
  annualHousingLoanInterest?: number;
  annualLifeInsurance?: number;
  annualRent?: number; // Annual rent paid (required to calculate rent relief)
  annualRentRelief?: number; // Calculated as 20% of annualRent, capped at ₦500,000
  source: PITEmploymentSource;
  sourceOther?: string; // Required if source is "other"
  notes?: string;
}

interface PITEmploymentDeductionsProps {
  accountId: string;
  taxYear: number;
  onDeductionsUpdated: () => void;
  totalGrossIncome?: number; // For validation hints
  isBusiness?: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export function PITEmploymentDeductions({
  accountId,
  taxYear,
  onDeductionsUpdated,
  totalGrossIncome = 0,
  isBusiness = false,
}: PITEmploymentDeductionsProps) {
  const [deductions, setDeductions] = useState<EmploymentDeductions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Form state
  const [annualPension, setAnnualPension] = useState("");
  const [annualNHF, setAnnualNHF] = useState("");
  const [annualNHIS, setAnnualNHIS] = useState("");
  // New allowable deductions (2026+)
  const [annualHousingLoanInterest, setAnnualHousingLoanInterest] = useState("");
  const [annualLifeInsurance, setAnnualLifeInsurance] = useState("");
  const [annualRent, setAnnualRent] = useState(""); // Annual rent paid (rent relief calculated from this)
  const [source, setSource] = useState<PITEmploymentSource>(PITEmploymentSource.Manual);
  const [sourceOther, setSourceOther] = useState("");
  const [notes, setNotes] = useState("");
  
  const { sendHttpRequest } = useHttp();

  // Fetch employment deductions
  useEffect(() => {
    if (!accountId || !taxYear) return;

    setIsLoading(true);
    sendHttpRequest({
      successRes: (response: any) => {
        const deductionsData = response?.data?.data || response?.data;
        setDeductions(deductionsData || null);
        setIsLoading(false);
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status || errorResponse?.response?.status;
        // 404 means no deductions found - this is valid
        if (status === 404) {
          setDeductions(null);
          setIsLoading(false);
          return false; // Don't show error toast for 404
        }
        console.error("Error fetching employment deductions:", errorResponse);
        setDeductions(null);
        setIsLoading(false);
        return true;
      },
      requestConfig: {
        url: `/pit/employment-deductions?accountId=${accountId}&taxYear=${taxYear}`,
        method: HttpMethod.GET,
      },
    });
  }, [accountId, taxYear, sendHttpRequest]);

  const handleOpenModal = () => {
    if (deductions) {
      // Editing existing - use nullish coalescing to handle undefined/null values
      setAnnualPension((deductions.annualPension ?? 0).toString());
      setAnnualNHF((deductions.annualNHF ?? 0).toString());
      setAnnualNHIS((deductions.annualNHIS ?? 0).toString());
      setAnnualHousingLoanInterest((deductions.annualHousingLoanInterest ?? 0).toString());
      setAnnualLifeInsurance((deductions.annualLifeInsurance ?? 0).toString());
      setAnnualRent((deductions.annualRent ?? 0).toString());
      setSource(deductions.source || PITEmploymentSource.Manual);
      setSourceOther(deductions.sourceOther || "");
      setNotes(deductions.notes || "");
    } else {
      // New entry
      setAnnualPension("0");
      setAnnualNHF("0");
      setAnnualNHIS("0");
      setAnnualHousingLoanInterest("0");
      setAnnualLifeInsurance("0");
      setAnnualRent("0");
      setSource(PITEmploymentSource.Manual);
      setSourceOther("");
      setNotes("");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: if source is "other", sourceOther must be provided
    if (source === PITEmploymentSource.Other && (!sourceOther || sourceOther.trim() === "")) {
      toast.error("Please specify the source when selecting 'Other'");
      return;
    }

    setIsSubmitting(true);

    // CRITICAL: Calculate rent relief from annual rent (20% capped at ₦500,000)
    // Per Nigeria Tax Act 2025 (effective 2026+), rent relief = 20% of annual rent, capped at ₦500,000
    const rentAmount = parseFloat(annualRent) || 0;
    const calculatedRentRelief = rentAmount > 0 
      ? Math.min(rentAmount * 0.20, 500000) 
      : 0;
    
    const data = {
      accountId,
      taxYear,
      annualPension: parseFloat(annualPension) || 0,
      annualNHF: parseFloat(annualNHF) || 0,
      annualNHIS: parseFloat(annualNHIS) || 0, // DEDUCTIBLE per Nigeria Tax Act 2025 (effective 2026+)
      // Allowable deductions per Nigeria Tax Act 2025 (effective 2026+)
      annualHousingLoanInterest: parseFloat(annualHousingLoanInterest) || 0,
      annualLifeInsurance: parseFloat(annualLifeInsurance) || 0,
      annualRent: rentAmount,
      // Rent relief is calculated from annualRent (backend will also recalculate to validate accuracy)
      annualRentRelief: calculatedRentRelief,
      source,
      sourceOther: source === PITEmploymentSource.Other ? sourceOther.trim() : undefined,
      notes: notes.trim() || undefined,
    };

    sendHttpRequest({
      successRes: (response: any) => {
        const deductionsData = response?.data?.data || response?.data;
        if (deductionsData) {
          setDeductions(deductionsData);
          toast.success("Saved successfully");
          setIsModalOpen(false);
          onDeductionsUpdated();
        }
        setIsSubmitting(false);
      },
      errorRes: (errorResponse: any) => {
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        console.error("Error saving employment deductions:", errorResponse);
        toast.error("Failed to save. Please try again.");
        setIsSubmitting(false);
        return true;
      },
      requestConfig: {
        url: "/pit/employment-deductions",
        method: HttpMethod.POST,
        body: data,
      },
    });
  };

  const handleDeleteClick = () => {
    // Validate deductions exist before showing confirmation
    if (!deductions || !deductions._id) {
      toast.error("No employment deductions found to delete");
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    // Double-check deductions still exist (defensive programming)
    if (!deductions || !deductions._id) {
      toast.error("No employment deductions found to delete");
      setShowDeleteConfirm(false);
      return;
    }

    // Validate accountId and taxYear (critical for API call)
    if (!accountId || !taxYear) {
      toast.error("Missing required information. Please refresh the page and try again.");
      setShowDeleteConfirm(false);
      return;
    }

    setIsDeleting(true);

    sendHttpRequest({
      successRes: (response: any) => {
        setDeductions(null);
        setShowDeleteConfirm(false);
        setIsDeleting(false);
        toast.success("Deleted successfully");
        onDeductionsUpdated();
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status || errorResponse?.response?.status;
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        
        console.error("Error deleting employment deductions:", {
          status,
          error: errorData?.description || errorData?.message || "Unknown error",
          accountId,
          taxYear,
        });

        // Don't close modal on error - let user see the error and decide
        setIsDeleting(false);
        
        toast.error("Failed to delete. Please try again.");
        return true;
      },
      requestConfig: {
        url: `/pit/employment-deductions?accountId=${accountId}&taxYear=${taxYear}`,
        method: HttpMethod.DELETE,
      },
    });
  };

  // Calculate percentage hints (typical rates)
  const pensionHint = totalGrossIncome > 0 
    ? `(Typically ~8% of gross income = ${formatCurrency(totalGrossIncome * 0.08)})`
    : "";
  const nhfHint = totalGrossIncome > 0
    ? `(Typically ~2.5% of gross income = ${formatCurrency(totalGrossIncome * 0.025)})`
    : "";

  if (isLoading) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div variants={itemVariants}>
        <Card className="p-0 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 sm:gap-0">
             <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                   <Briefcase className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">Employment Deductions</h3>
                    <button 
                      onClick={() => setIsGuideOpen(true)}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 underline decoration-dashed underline-offset-4 flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer whitespace-nowrap"
                    >
                      What is this?
                    </button>
                  </div>
                  <p className="text-base text-slate-500">Pension, NHF, & NHIS</p>
                </div>
             </div>

            <Button
              variant={ButtonVariant.Outline}
              size={ButtonSize.Sm}
              onClick={handleOpenModal}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-base py-2 px-4 w-full sm:w-auto"
            >
              {deductions ? "Edit Details" : "Add Deductions"}
            </Button>
          </div>

          {deductions ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2 text-purple-700">
                    <Wallet className="w-5 h-5" />
                    <span className="font-semibold text-base">Pension</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(deductions.annualPension ?? 0)}</p>
                </div>

                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2 text-blue-700">
                    <Building2 className="w-5 h-5" />
                    <span className="font-semibold text-base">NHF</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(deductions.annualNHF ?? 0)}</p>
                </div>

                <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2 text-emerald-700">
                    <Heart className="w-5 h-5" />
                    <span className="font-semibold text-base">NHIS</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(deductions.annualNHIS ?? 0)}</p>
                </div>
              </div>

               {/* Additional Deductions */}
               {((deductions.annualHousingLoanInterest ?? 0) > 0 || (deductions.annualLifeInsurance ?? 0) > 0 || (deductions.annualRentRelief ?? 0) > 0) && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                     <h4 className="text-base font-semibold text-slate-800 mb-4">Other Deductions</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(deductions.annualHousingLoanInterest ?? 0) > 0 && (
                           <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                              <span className="text-slate-600 text-base">Housing Loan Interest</span>
                              <span className="font-bold text-slate-900 text-base">{formatCurrency(deductions.annualHousingLoanInterest ?? 0)}</span>
                           </div>
                        )}
                         {(deductions.annualLifeInsurance ?? 0) > 0 && (
                           <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                              <span className="text-slate-600 text-base">Life Insurance</span>
                              <span className="font-bold text-slate-900 text-base">{formatCurrency(deductions.annualLifeInsurance ?? 0)}</span>
                           </div>
                        )}
                         {(deductions.annualRentRelief ?? 0) > 0 && (
                           <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                              <span className="text-slate-600 text-base">Rent Relief</span>
                              <span className="font-bold text-slate-900 text-base">{formatCurrency(deductions.annualRentRelief ?? 0)}</span>
                           </div>
                        )}
                     </div>
                  </div>
               )}

              <div className="flex items-center justify-end pt-2">
                <Button
                  variant={ButtonVariant.Ghost}
                  size={ButtonSize.Sm}
                  onClick={handleDeleteClick}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 text-base"
                >
                  Remove These Entries
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
               <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
               <h4 className="text-lg font-bold text-slate-900 mb-2">
                 {isBusiness ? "Statutory Deductions (Pension/NHF)" : "Are you employed?"}
               </h4>
               <p className="text-base text-slate-600 max-w-md mx-auto mb-6">
                  {isBusiness 
                    ? "Add your pension or NHF contributions to reduce your taxable income."
                    : "Add your employment details to reduce your tax."
                  }
               </p>
               <Button onClick={handleOpenModal} className="bg-emerald-600 hover:bg-emerald-700 text-white text-base py-3 px-6">
                  Add Deductions
               </Button>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Employment Deductions Modal */}
      <FullScreenModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={deductions ? "Edit Employment Deductions" : "Add Employment Deductions"}
      >
        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto py-4">
          
          {/* Main Deductions */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Primary Deductions</h3>
            
            <div>
              <label className="block text-base font-semibold text-slate-800 mb-2">
                Annual Pension (₦)
              </label>
              <Input
                type="number"
                value={annualPension}
                onChange={(e) => setAnnualPension(e.target.value)}
                placeholder="0.00"
                className="text-lg py-3"
              />
              <p className="text-base text-slate-600 mt-2">Found on your payslip (Usually ~8% of salary).</p>
            </div>

            <div>
              <label className="block text-base font-semibold text-slate-800 mb-2">
                Annual NHF (Housing Fund) (₦)
              </label>
              <Input
                type="number"
                value={annualNHF}
                onChange={(e) => setAnnualNHF(e.target.value)}
                placeholder="0.00"
                 className="text-lg py-3"
              />
              <p className="text-base text-slate-600 mt-2">Found on your payslip (Usually ~2.5% of income).</p>
            </div>

            <div>
              <label className="block text-base font-semibold text-slate-800 mb-2">
                Annual NHIS (Health Insurance) (₦)
              </label>
              <Input
                type="number"
                value={annualNHIS}
                onChange={(e) => setAnnualNHIS(e.target.value)}
                placeholder="0.00"
                 className="text-lg py-3"
              />
              <p className="text-base text-slate-600 mt-2">Found on your payslip (Usually ~5% of basic).</p>
            </div>
          </div>

          {/* Optional Deductions */}
          <div className="space-y-6 pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Other Tax Reliefs (Optional)</h3>
            
            <div>
              <label className="block text-base font-semibold text-slate-800 mb-2">
                 Housing Loan Interest (₦)
              </label>
              <Input
                type="number"
                 value={annualHousingLoanInterest}
                onChange={(e) => setAnnualHousingLoanInterest(e.target.value)}
                placeholder="0.00"
                 className="text-lg py-3"
              />
              <p className="text-sm text-slate-500 mt-1">Interest paid on your home loan this year.</p>
            </div>

             <div>
              <label className="block text-base font-semibold text-slate-800 mb-2">
                 Life Insurance Premiums (₦)
              </label>
              <Input
                type="number"
                value={annualLifeInsurance}
                onChange={(e) => setAnnualLifeInsurance(e.target.value)}
                placeholder="0.00"
                 className="text-lg py-3"
              />
            </div>

             <div>
              <label className="block text-base font-semibold text-slate-800 mb-2">
                 Annual Rent Paid (₦)
              </label>
              <Input
                type="number"
                value={annualRent}
                onChange={(e) => setAnnualRent(e.target.value)}
                placeholder="0.00"
                 className="text-lg py-3"
              />
              <p className="text-sm text-slate-500 mt-1">We'll calculate your Rent Relief automatically (20% of this amount).</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <label className="block text-base font-semibold text-slate-800 mb-2">
               Source of Data
            </label>
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value as PITEmploymentSource);
                // Clear sourceOther when source changes away from "other"
                if (e.target.value !== PITEmploymentSource.Other) {
                  setSourceOther("");
                }
              }}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-emerald-500"
            >
              <option value={PITEmploymentSource.Payslip}>Payslip</option>
              <option value={PITEmploymentSource.EmployerStatement}>Employer Statement</option>
              <option value={PITEmploymentSource.Manual}>Manual Entry</option>
              <option value={PITEmploymentSource.Other}>Other</option>
            </select>
          </div>

           {source === PITEmploymentSource.Other && (
             <div>
               <label className="block text-base font-semibold text-slate-800 mb-2">Specify Source</label>
               <Input 
                  value={sourceOther} 
                  onChange={(e) => setSourceOther(e.target.value)}
                  placeholder="e.g., HR department, bank statement, etc."
                  required={source === PITEmploymentSource.Other}
                  className="text-lg py-3"
               />
             </div>
           )}

          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant={ButtonVariant.Outline}
              onClick={handleCloseModal}
              className="flex-1 py-3 text-base"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-base"
            >
              Save Deductions
            </Button>
          </div>
        </form>
      </FullScreenModal>

      {/* Employment Deductions Guide Modal */}
      <EmploymentDeductionsGuideModal 
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          // Prevent closing during deletion to avoid state inconsistencies
          if (!isDeleting) {
            setShowDeleteConfirm(false);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Employment Deductions"
        message={
          <div className="space-y-2">
            <p className="text-base text-slate-700">
              Are you sure you want to delete your employment deductions?
            </p>
            <p className="text-sm text-slate-600">
              This will remove your Pension and NHF contributions. Your PIT calculations will use ₦0 for these values, which may increase your tax liability.
            </p>
            <p className="text-sm font-semibold text-amber-600 mt-3">
              ⚠️ This action cannot be undone.
            </p>
          </div>
        }
        confirmLabel="Delete Deductions"
        cancelLabel="Cancel"
        variant={ConfirmModalVariant.Danger}
        isLoading={isDeleting}
      />
    </>
  );
}

