"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { ToastType, ButtonVariant } from "@/lib/utils/client-enums";
import { AccountType } from "@/lib/utils/account-type";

import { useState, useEffect, useMemo } from "react";
import { X, AlertCircle } from "lucide-react";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useHttp } from "@/hooks/useHttp";
import { useToast } from "@/hooks/useToast";

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accountId: string; // Renamed from entityId for consistency
  entityType: AccountType;
  taxYear: number;
  month?: number | null; // Optional: 1-12 for monthly income, null/undefined for yearly income
  currentIncome?: number | null;
}

export function IncomeFormModal({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  entityType,
  taxYear,
  month,
  currentIncome,
}: IncomeFormModalProps) {
  const [income, setIncome] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { sendHttpRequest: saveIncomeReq, isLoading } = useHttp();
  const { showToast } = useToast();

  // Initialize form with current income if provided
  useEffect(() => {
    if (isOpen) {
      if (currentIncome !== null && currentIncome !== undefined) {
        setIncome(currentIncome.toString());
      } else {
        setIncome("");
      }
      setErrors({});
      setTouched({});
    }
  }, [isOpen, currentIncome]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!income.trim()) {
      newErrors.income = "Annual income is required";
    } else {
      const incomeValue = parseFloat(income);
      if (isNaN(incomeValue)) {
        newErrors.income = "Please enter a valid number";
      } else if (incomeValue < 0) {
        newErrors.income = "Income cannot be negative";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => () => {
    setTouched({ ...touched, [field]: true });
    validate();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIncome(value);
    if (touched.income) {
      validate();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ income: true });

    if (!validate()) {
      return;
    }

    const incomeValue = parseFloat(income);

    saveIncomeReq({
      successRes: (response: any) => {
        showToast("Income saved successfully", ToastType.Success);
        onSuccess();
        onClose();
      },
      errorRes: (errorResponse: any) => {
        const errorMessage =
          errorResponse?.data?.description || "Failed to save income. Please try again.";
        showToast(errorMessage, ToastType.Error);
        return true;
      },
      requestConfig: {
        url: "/income",
        method: HttpMethod.POST,
        body: {
          accountId,
          entityType,
          taxYear,
          month: month ?? null, // null for yearly income, 1-12 for monthly income
          annualIncome: incomeValue,
        },
      },
    });
  };

  const entityLabel = entityType === AccountType.Individual ? "your" : "this company's";
  const incomeType = month !== null && month !== undefined ? "Monthly" : "Annual";
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthLabel = month ? monthNames[month - 1] : "";
  const modalTitle = `${currentIncome !== null && currentIncome !== undefined ? "Update" : "Enter"} ${incomeType} Income${month ? ` - ${monthLabel} ${taxYear}` : ` - Tax Year ${taxYear}`}`;

  return (
    <FullScreenModal 
      isOpen={isOpen} 
      onClose={onClose}
      title={modalTitle}
    >
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
            {/* Info Alert */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Why we need this information</p>
                <p className="text-sm text-blue-800 mt-1">
                  To calculate your exact tax savings, we need to know {entityLabel} gross {month ? "monthly" : "annual"} income{month ? ` for ${monthLabel} ${taxYear}` : ` for tax year ${taxYear}`}.
                  We use this to compute: Tax(Income) - Tax(Income - Deductible Expenses) = Your Tax Savings
                </p>
              </div>
            </div>

            {/* Income Input */}
            <div>
              <Input
                label={`Gross ${incomeType} Income${month ? ` for ${monthLabel} ${taxYear}` : ` for ${taxYear}`} (₦)`}
                type="number"
                step="0.01"
                required
                value={income}
                onChange={handleChange}
                onBlur={handleBlur("income")}
                error={touched.income ? errors.income : undefined}
                placeholder={month ? "e.g., 416667" : "e.g., 5000000"}
                helperText={`Enter the gross ${month ? "monthly" : "annual"} income for ${entityLabel} ${entityType === AccountType.Individual ? "personal" : "company"} account${month ? ` in ${monthLabel} ${taxYear}` : ` for tax year ${taxYear}`}`}
              />
            </div>

            {/* Submit Button */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant={ButtonVariant.Outline}
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={ButtonVariant.Primary}
                loading={isLoading}
                disabled={isLoading}
                className="w-full sm:w-auto min-w-[140px]"
              >
                {currentIncome !== null && currentIncome !== undefined ? "Update Income" : "Save Income"}
              </Button>
            </div>
          </form>
    </FullScreenModal>
  );
}

