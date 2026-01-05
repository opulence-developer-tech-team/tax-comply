"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useState, useEffect } from "react";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { incomeActions } from "@/store/redux/income/income-slice";
import { pitActions } from "@/store/redux/pit/pit-slice";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { toast } from "sonner";
import { getErrorMessage } from "@/components/shared/errorUtils";
import type { IncomeSource } from "@/store/redux/income/income-slice";
import { IncomeType, ButtonVariant } from "@/lib/utils/client-enums";

interface IncomeSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  income: IncomeSource | null;
  onSuccess: (updatedIncome?: IncomeSource) => void;
  currentPlan: SubscriptionPlan;
}

/**
 * Income Source Modal Component
 * 
 * Handles creating and editing income sources with proper validation.
 * Production-ready with error handling, loading states, and optimistic updates.
 */
export function IncomeSourceModal({
  isOpen,
  onClose,
  income,
  onSuccess,
  currentPlan,
}: IncomeSourceModalProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const accountId = user?._id?.toString() || null;
  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  const currentYear = new Date().getFullYear();
  const minTaxYear = 2026;
  const defaultTaxYear = Math.max(minTaxYear, currentYear);
  
  // Get current income sources from Redux to check for existing _id
  const incomeSources = useAppSelector((state) => state.income.incomeSources);
  
  const [incomeType, setIncomeType] = useState<IncomeType>(IncomeType.Annual);
  const [annualIncome, setAnnualIncome] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [taxYear, setTaxYear] = useState<string>(defaultTaxYear.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sendHttpRequest: incomeReq } = useHttp();
  const { showUpgradePrompt } = useUpgradePrompt();

  // Reset form when modal opens/closes or income changes
  useEffect(() => {
    if (isOpen) {
      if (income) {
        // Edit mode: populate with existing data
        setAnnualIncome(income.annualIncome.toString());
        setMonth(income.month?.toString() || "");
        setTaxYear(income.taxYear.toString());
        // Set income type based on whether month is specified
        setIncomeType(income.month !== null && income.month !== undefined ? IncomeType.Monthly : IncomeType.Annual);
      } else {
        // Create mode: reset to defaults
        setAnnualIncome("");
        setMonth("");
        setTaxYear(defaultTaxYear.toString());
        setIncomeType(IncomeType.Annual);
      }
      setIsSubmitting(false);
    }
  }, [isOpen, income, defaultTaxYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountId) {
      toast.error("Account ID is missing");
      return;
    }

    // CRITICAL VALIDATION: Ensure income is a valid positive number
    const incomeValue = parseFloat(annualIncome);
    if (!annualIncome || isNaN(incomeValue) || incomeValue <= 0) {
      toast.error("Please enter a valid income amount greater than 0");
      return;
    }

    // CRITICAL VALIDATION: Prevent extremely large values (potential data entry errors)
    if (incomeValue > 1_000_000_000_000) {
      toast.error("Income amount seems too large. Please verify the amount.");
      return;
    }

    // Validate tax year
    // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
    const taxYearNum = parseInt(taxYear);
    if (isNaN(taxYearNum) || taxYearNum < 2026 || taxYearNum > 2100) {
      toast.error("Please enter a valid tax year (2026-2100). This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.");
      return;
    }

    setIsSubmitting(true);

    // CRITICAL: If income type is monthly, month must be selected
    if (incomeType === IncomeType.Monthly && !month) {
      toast.error("Please select a month for monthly income");
      setIsSubmitting(false);
      return;
    }

    const incomeData = {
      accountId,
      entityType: "individual" as const,
      taxYear: taxYearNum,
      month: incomeType === IncomeType.Monthly && month ? parseInt(month) : null,
      annualIncome: incomeValue,
    };

    incomeReq({
      successRes: (response: any) => {
        setIsSubmitting(false);
        
          // Get the created/updated income source from response
          // CRITICAL: Backend always returns the document (created or updated)
          const incomeSourceData = response?.data?.data;
          
          if (incomeSourceData) {
            // CRITICAL: Ensure _id is a string (MongoDB ObjectId is serialized to string in JSON)
            // This matches the pattern used in company-slice.ts for bulletproof comparison
            const incomeId = String(incomeSourceData._id);
            
            // CRITICAL: Check if this income source already exists in Redux by _id
            // This handles both create and update scenarios correctly:
            // 1. Create: New _id -> addIncomeSource
            // 2. Edit: Existing _id -> updateIncomeSource
            // 3. Duplicate key (backend updates existing): Existing _id -> updateIncomeSource
            const existingIncome = incomeSources.find(
              (source) => String(source._id) === incomeId
            );
            
            // Ensure incomeSourceData has _id as string for Redux consistency
            const normalizedIncomeSource = {
              ...incomeSourceData,
              _id: incomeId,
            };
            
            if (existingIncome) {
              // Income source exists - update it (edit mode or duplicate key scenario)
              // CRITICAL: Just update Redux state - no need to refetch since we have the updated document
              // The server returned the updated document, we find it by _id in Redux and replace it
              dispatch(incomeActions.updateIncomeSource(normalizedIncomeSource));
              toast.success("Income source updated successfully");
            } else {
              // New income source - add it (create mode)
              // CRITICAL: Invalidate cache only on create because:
              // 1. New item might affect pagination (total count changes)
              // 2. New item might not be visible if current filters exclude it
              // 3. Summary calculations need to be refreshed
              dispatch(incomeActions.addIncomeSource(normalizedIncomeSource));
              dispatch(incomeActions.invalidateCache());
              toast.success("Income source added successfully");
            }
            
            // CRITICAL: Invalidate PIT cache when income is created/updated
            // Income affects PIT calculations (gross income is the base for tax calculations)
            // The backend already triggers PIT summary recalculation, but we need to invalidate frontend cache
            // so the PIT page refetches the updated summary
            dispatch(pitActions.invalidateCache());
            console.log("[IncomeSourceModal] PIT cache invalidated - income source created/updated", {
              incomeId: normalizedIncomeSource._id,
              taxYear: normalizedIncomeSource.taxYear,
              isUpdate: !!income,
              timestamp: new Date().toISOString(),
            });
            
            // Pass the updated/created income source to onSuccess callback
            onSuccess(normalizedIncomeSource);
            onClose();
          } else {
            // Fallback: If response doesn't contain data, show generic success
            toast.success(income ? "Income source updated successfully" : "Income source added successfully");
            // Still invalidate cache to trigger refetch
            dispatch(incomeActions.invalidateCache());
            // CRITICAL: Invalidate PIT cache when income is created/updated
            dispatch(pitActions.invalidateCache());
            onSuccess(); // No income data to pass
            onClose();
          }
      },
      errorRes: (errorResponse: any) => {
        setIsSubmitting(false);
        const status = errorResponse?.status || errorResponse?.response?.status;
        const errorData = errorResponse?.data || errorResponse?.response?.data || errorResponse;
        const upgradeRequired = errorData?.upgradeRequired || errorData?.data?.upgradeRequired;

        if (status === 403 && upgradeRequired) {
          showUpgradePrompt({
            feature: upgradeRequired.feature || "Income Sources",
            currentPlan: upgradeRequired.currentPlan || currentPlan.toLowerCase(),
            requiredPlan: upgradeRequired.requiredPlan || "starter",
            requiredPlanPrice: upgradeRequired.requiredPlanPrice || SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
            message: errorData?.description || "You've reached your income source limit. Upgrade to add more income sources.",
            reason: upgradeRequired.reason || "usage_limit_reached",
          });
          return false; // Don't show error toast for upgrade prompts
        } else {
          // Use standardized error handling for other errors
          const errorMessage = getErrorMessage(errorResponse, "Failed to save income source");
          toast.error(errorMessage);
          return true; // Show error toast
        }
      },
      requestConfig: {
        url: "/income",
        method: HttpMethod.POST,
        body: JSON.stringify(incomeData),
      },
    });
  };

  return (
    <FullScreenModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={income ? "Edit Income Source" : "Add Income Source"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tax Year *
          </label>
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-green-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white text-slate-900 font-medium text-sm transition-colors hover:border-green-200"
            required
            aria-label="Select tax year"
          >
            {(() => {
              const currentYear = new Date().getFullYear();
              const minYear = 2026; // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
              // Generate years from currentYear down to minYear, but not more than 10 years
              // If currentYear < minYear, start from minYear and go forward
              const years: number[] = [];
              const startYear = Math.max(minYear, currentYear);
              
              for (let i = 0; i < 10; i++) {
                const year = startYear - i;
                if (year >= minYear) {
                  years.push(year);
                } else {
                  break; // Stop if we've reached minYear
                }
              }
              
              return years.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ));
            })()}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            The tax year this income applies to
          </p>
        </div>

        {/* Income Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Income Type *
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIncomeType(IncomeType.Annual);
                setMonth(""); // Clear month when switching to annual
              }}
              className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                incomeType === IncomeType.Annual
                  ? "bg-green-50 border-green-500 text-green-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:border-green-200"
              }`}
              aria-label="Annual income"
            >
              <div className="font-semibold">Annual Income</div>
              <div className="text-xs mt-1 opacity-75">For the entire tax year</div>
            </button>
            <button
              type="button"
              onClick={() => setIncomeType(IncomeType.Monthly)}
              className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                incomeType === IncomeType.Monthly
                  ? "bg-green-50 border-green-500 text-green-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:border-green-200"
              }`}
              aria-label="Monthly income"
            >
              <div className="font-semibold">Monthly Income</div>
              <div className="text-xs mt-1 opacity-75">For a specific month</div>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {incomeType === IncomeType.Annual
              ? "Enter your total income for the entire tax year. This is added directly to your annual income."
              : "Enter income for a specific month. You can add multiple monthly income records for different months, and they will be summed together."}
          </p>
        </div>

        {/* Month Selector (only shown for monthly income) */}
        {incomeType === IncomeType.Monthly && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Month *
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-green-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white text-slate-900 font-medium text-sm transition-colors hover:border-green-200"
              required={incomeType === IncomeType.Monthly}
              aria-label="Select month"
            >
              <option value="">Select a month</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m.toString()}>
                  {new Date(2000, m - 1).toLocaleString("default", { month: "long" })} {taxYear}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Select the month this income was earned. You can add separate income records for each month.
            </p>
          </div>
        )}

        {/* Income Amount Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {incomeType === IncomeType.Annual ? "Annual Income (₦)" : "Monthly Income (₦)"} *
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={annualIncome}
            onChange={(e) => setAnnualIncome(e.target.value)}
            placeholder={incomeType === IncomeType.Annual ? "Enter annual income" : "Enter monthly income"}
            required
            aria-label={incomeType === IncomeType.Annual ? "Annual income" : "Monthly income"}
          />
          <p className="text-xs text-slate-500 mt-1">
            {incomeType === IncomeType.Annual ? (
              `Enter your total gross annual income for tax year ${taxYear}. This amount will be used directly in PIT calculations.`
            ) : month ? (
              `Enter your gross monthly income for ${new Date(2000, parseInt(month) - 1).toLocaleString("default", { month: "long" })} ${taxYear}. This will be added to other monthly incomes for the year.`
            ) : (
              "Enter your gross monthly income. Don't forget to select the month above."
            )}
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <Button 
            type="button" 
            variant={ButtonVariant.Outline} 
            onClick={onClose} 
            disabled={isSubmitting}
            aria-label="Cancel"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="bg-green-600 hover:bg-green-700 text-white border-0"
            aria-label={income ? "Update income source" : "Add income source"}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true"></div>
                {income ? "Updating..." : "Adding..."}
              </>
            ) : (
              <>
                {income ? "Update Income Source" : "Add Income Source"}
              </>
            )}
          </Button>
        </div>
      </form>
    </FullScreenModal>
  );
}

