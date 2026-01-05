"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { expensesActions } from "@/store/redux/expenses/expenses-slice";
import { vatActions } from "@/store/redux/vat/vat-slice";
import { pitActions } from "@/store/redux/pit/pit-slice";
import { whtActions } from "@/store/redux/wht/wht-slice";
import { citActions } from "@/store/redux/cit/cit-slice";
import { TransactionType } from "@/lib/utils/transaction-type";
import { TaxCalculationPreview } from "./TaxCalculationPreview";
import { Receipt, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { VAT_RATE_DECIMAL } from "@/lib/constants/tax";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { ButtonVariant } from "@/lib/utils/client-enums";

import { EXPENSE_CATEGORIES } from "@/lib/constants/expenses";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // CRITICAL: Pass created expense data to onSuccess for cache invalidation decisions
  onSuccess?: (createdExpense?: { whtDeducted?: boolean; accountType?: AccountType }) => void;
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

export function ExpenseFormModal({
  isOpen,
  onClose,
  onSuccess,
}: ExpenseFormModalProps) {
  const dispatch = useAppDispatch();
  const { isLoading: isSubmitting, sendHttpRequest: saveExpenseReq } = useHttp();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  const [isTaxDeductibleExpanded, setIsTaxDeductibleExpanded] = useState(false);
  
  // Get account info from Redux
  const { accountId, accountType } = useAppSelector((state: any) => state.expenses);

  // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
  const getDefaultDate = () => {
    const currentDate = new Date();
    const minDate = new Date("2026-01-01T00:00:00.000Z");
    // Use current date if >= 2026-01-01, otherwise use 2026-01-01
    return currentDate >= minDate 
      ? currentDate.toISOString().split("T")[0]
      : "2026-01-01";
  };

  // Get base initial values (date will be updated when modal opens)
  const baseInitialValues = useMemo(() => ({
    description: "",
    amount: "",
    category: "",
    date: getDefaultDate(),
    isTaxDeductible: false,
    whtType: "",
    whtDeducted: false,
    // Supplier information (REQUIRED when WHT is deducted per NRS)
    supplierName: "",
    supplierTIN: "",
    supplierType: AccountType.Company as AccountType,
    isNonResident: false,
  }), []);

  const { values, errors, touched, handleChange, handleBlur, validate, reset, setValues } = useForm(
    baseInitialValues,
    {
      description: {
        required: true,
        minLength: 3,
      },
      amount: {
        required: true,
        custom: (value) => {
          const num = parseFloat(value);
          if (isNaN(num) || num <= 0) {
            return "Amount must be greater than 0";
          }
          return null;
        },
      },
      category: {
        required: true,
      },
      date: {
        required: true,
        custom: (value) => {
          if (!value) return null;
          const date = new Date(value);
          const minDate = new Date("2026-01-01T00:00:00.000Z");
          if (isNaN(date.getTime())) {
            return "Invalid date format";
          }
          if (date < minDate) {
            return "This app only supports expenses from January 1, 2026 onward per Nigeria Tax Act 2025";
          }
          return null;
        },
      },
    }
  );

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form and update date to current date when modal opens (but not before 2026-01-01)
      setValues({
        ...baseInitialValues,
        date: getDefaultDate(),
        whtType: "",
        whtDeducted: false,
        supplierName: "",
        supplierTIN: "",
        supplierType: AccountType.Company,
        isNonResident: false,
      });
      // Reset expanded state when modal opens
      setIsTaxDeductibleExpanded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const calculateTax = () => {
    const amount = parseFloat(values.amount) || 0;
    if (amount <= 0 || !values.isTaxDeductible) return 0;

    // Calculate VAT for company expenses
    // Note: VAT is separate from tax savings - this is just for display purposes
    if (accountType === AccountType.Company || accountType === AccountType.Business) {
      return Math.round(amount * VAT_RATE_DECIMAL * 100) / 100;
    }

    // For individuals: Return 0 here as TaxCalculationPreview component will show
    // the proper range-based estimate (0% to 25% depending on income level)
    // This function is primarily for VAT calculation (company expenses)
    return 0; // Tax savings estimate is handled in TaxCalculationPreview component
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !accountId) {
      console.error("[ExpenseFormModal] ❌ Validation failed or accountId missing", {
        isValid: validate(),
        accountId,
        errors,
        touched,
      });
      return;
    }

    const expenseData = {
      accountId,
      accountType: accountType!,
      description: values.description,
      amount: parseFloat(values.amount),
      category: values.category,
      date: values.date,
      isTaxDeductible: values.isTaxDeductible,
      whtType: values.whtType,
      whtDeducted: values.whtDeducted ?? false,
      // Supplier information (REQUIRED when WHT is deducted per NRS)
      supplierName: values.supplierName,
      supplierTIN: values.supplierTIN,
      supplierType: values.supplierType ?? null,
      isNonResident: values.isNonResident ?? false,
    };

    // DEBUG: Log expense data before submission
    console.log("[ExpenseFormModal] 📤 Submitting expense with WHT data:", {
      accountId: expenseData.accountId,
      accountType: expenseData.accountType,
      amount: expenseData.amount,
      date: expenseData.date,
      whtDeducted: expenseData.whtDeducted,
      whtType: expenseData.whtType,
      supplierName: expenseData.supplierName,
      supplierTIN: expenseData.supplierTIN,
      supplierType: expenseData.supplierType,
      willCreateWHTRecord: expenseData.accountType === AccountType.Company && expenseData.whtDeducted === true,
      timestamp: new Date().toISOString(),
    });

    saveExpenseReq({
      successRes: (response: any) => {
        // DEBUG: Log full response
        console.log("[ExpenseFormModal] ✅ Expense created successfully - Full response:", {
          response,
          responseData: response?.data,
          expenseData: response?.data?.data,
          timestamp: new Date().toISOString(),
        });

        const newExpense = response?.data?.data;
        
        // DEBUG: Log expense details
        if (newExpense) {
          console.log("[ExpenseFormModal] 📋 Created expense details:", {
            _id: newExpense._id,
            description: newExpense.description,
            amount: newExpense.amount,
            date: newExpense.date,
            month: newExpense.month,
            year: newExpense.year,
            whtDeducted: newExpense.whtDeducted,
            whtType: newExpense.whtType,
            whtAmount: newExpense.whtAmount,
            accountType: newExpense.accountType,
            companyId: newExpense.companyId,
            timestamp: new Date().toISOString(),
          });
          
          // CRITICAL: Log WHT record creation expectation
          if (newExpense.accountType === AccountType.Company && newExpense.whtDeducted === true) {
            console.log("[ExpenseFormModal] 🔍 WHT RECORD CREATION EXPECTED:", {
              expenseId: newExpense._id,
              transactionType: TransactionType.Expense,
              companyId: newExpense.companyId,
              expenseMonth: newExpense.month,
              expenseYear: newExpense.year,
              whtType: newExpense.whtType,
              whtAmount: newExpense.whtAmount,
              paymentAmount: newExpense.amount,
              supplierName: newExpense.supplierName,
              supplierTIN: newExpense.supplierTIN,
              note: "Backend should create a WHT record for this expense. The WHT record should have:",
              expectedWHTRecord: {
                transactionId: newExpense._id,
                transactionType: TransactionType.Expense,
                month: newExpense.month,
                year: newExpense.year,
                companyId: newExpense.companyId,
                whtAmount: newExpense.whtAmount,
              },
              timestamp: new Date().toISOString(),
            });
          } else {
            console.log("[ExpenseFormModal] ⏭️ WHT RECORD NOT EXPECTED:", {
              expenseId: newExpense._id,
              accountType: newExpense.accountType,
              whtDeducted: newExpense.whtDeducted,
              reason: newExpense.accountType !== AccountType.Company 
                ? "Not a company expense" 
                : newExpense.whtDeducted !== true 
                  ? "WHT not deducted" 
                  : "Unknown",
              timestamp: new Date().toISOString(),
            });
          }
          
          // Add expense to Redux store (optimistic update)
          dispatch(expensesActions.addExpense(newExpense));
        } else {
          console.error("[ExpenseFormModal] ❌ No expense data in response:", {
            response,
            responseData: response?.data,
            timestamp: new Date().toISOString(),
          });
        }
        
        // Invalidate cache to refetch summary
        dispatch(expensesActions.invalidateCache());
        
        // Company/Business expenses with VAT affect the VAT summary (Input VAT)
        if ((expenseData.accountType === AccountType.Company || expenseData.accountType === AccountType.Business) && expenseData.isTaxDeductible) {
          dispatch(vatActions.invalidateCache());
            console.log("[ExpenseFormModal] VAT cache invalidated - company/business expense with VAT created", {
            accountId: expenseData.accountId,
            accountType: expenseData.accountType,
            isTaxDeductible: expenseData.isTaxDeductible,
            amount: expenseData.amount,
            timestamp: new Date().toISOString(),
          });
        }
        
        // CRITICAL: Invalidate CIT cache if this is a company expense
        // Company tax-deductible expenses reduce taxable profit, affecting CIT calculations
        if (expenseData.accountType === AccountType.Company && expenseData.isTaxDeductible) {
          dispatch(citActions.invalidateCache());
          console.log("[ExpenseFormModal] CIT cache invalidated - company tax-deductible expense created", {
            accountId: expenseData.accountId,
            accountType: expenseData.accountType,
            isTaxDeductible: expenseData.isTaxDeductible,
            amount: expenseData.amount,
            expenseMonth: newExpense?.month,
            expenseYear: newExpense?.year,
            timestamp: new Date().toISOString(),
          });
        }
        
        // CRITICAL: Invalidate PIT cache if this is an individual expense
        // Individual expenses affect PIT calculations (allowable deductions reduce taxable income)
        if (expenseData.accountType === AccountType.Individual && expenseData.isTaxDeductible) {
          dispatch(pitActions.invalidateCache());
          console.log("[ExpenseFormModal] PIT cache invalidated - individual expense with tax deduction created", {
            accountId: expenseData.accountId,
            accountType: expenseData.accountType,
            isTaxDeductible: expenseData.isTaxDeductible,
            amount: expenseData.amount,
            timestamp: new Date().toISOString(),
          });
        }
        
        // CRITICAL: Invalidate WHT cache if this is a company expense with WHT deducted
        // This ensures the WHT page refetches and shows the new WHT record immediately
        // Only invalidate if expense had WHT deducted (whtDeducted === true)
        const shouldInvalidateWHT = expenseData.accountType === AccountType.Company && expenseData.whtDeducted === true;
        console.log("[ExpenseFormModal] 🔍 WHT cache invalidation check:", {
          accountType: expenseData.accountType,
          whtDeducted: expenseData.whtDeducted,
          shouldInvalidateWHT,
          expenseMonth: newExpense?.month,
          expenseYear: newExpense?.year,
          timestamp: new Date().toISOString(),
        });
        
        if (shouldInvalidateWHT) {
          dispatch(whtActions.invalidateCache());
          console.log("[ExpenseFormModal] ✅ WHT CACHE INVALIDATED - Company expense with WHT created", {
            accountId: expenseData.accountId,
            accountType: expenseData.accountType,
            transactionType: TransactionType.Expense,
            whtDeducted: expenseData.whtDeducted,
            whtType: expenseData.whtType,
            amount: expenseData.amount,
            expenseId: newExpense?._id,
            expenseMonth: newExpense?.month,
            expenseYear: newExpense?.year,
            timestamp: new Date().toISOString(),
            note: "WHT page should refetch and show the new WHT record. Expected WHT record details:",
            expectedWHTRecord: {
              transactionId: newExpense?._id,
              transactionType: TransactionType.Expense,
              month: newExpense?.month,
              year: newExpense?.year,
              companyId: expenseData.accountId,
              whtAmount: newExpense?.whtAmount,
              whtType: newExpense?.whtType,
            },
            troubleshooting: {
              step1: "Check WHT page logs for fetchAllWHTData call",
              step2: `Check WHT page logs for records fetched with month=${newExpense?.month} and year=${newExpense?.year}`,
              step3: "Verify backend created WHT record when expense was created",
              step4: "Check if WHT page filters match the expense month/year",
            },
          });
        } else {
          console.log("[ExpenseFormModal] ⏭️ WHT cache NOT invalidated:", {
            reason: expenseData.accountType !== AccountType.Company 
              ? "Not a company expense" 
              : expenseData.whtDeducted !== true 
                ? "WHT not deducted" 
                : "Unknown",
            accountType: expenseData.accountType,
            whtDeducted: expenseData.whtDeducted,
            timestamp: new Date().toISOString(),
          });
        }
        
        // CRITICAL: Pass created expense data to onSuccess callback
        // This allows the parent component to perform additional cache invalidation if needed
        if (onSuccess) {
          onSuccess({
            whtDeducted: expenseData.whtDeducted ?? false,
            accountType: expenseData.accountType,
          });
        }
        onClose();
      },
      errorRes: (errorResponse: any) => {
        // Check if this is an upgrade-required error
        if (errorResponse?.status === 403 && errorResponse?.data?.data?.upgradeRequired) {
          const upgradeData = errorResponse.data.data.upgradeRequired;
          const featureName = upgradeData.feature === "more_expenses" 
            ? "More Expenses" 
            : "Unlimited Expenses";
          
          showUpgradePrompt({
            feature: featureName,
            currentPlan: upgradeData.currentPlan,
            requiredPlan: upgradeData.requiredPlan,
            requiredPlanPrice: upgradeData.requiredPlanPrice,
            message: errorResponse?.data?.description || "You've reached your monthly expense limit. Upgrade to continue adding expenses.",
            reason: upgradeData.reason,
            usageInfo: upgradeData.usageInfo,
          });
          return false; // Don't show error toast, upgrade prompt handles it
        }
        return true; // Show error toast for other errors
      },
      requestConfig: {
        url: "/expenses",
        method: HttpMethod.POST,
        body: expenseData,
        successMessage: "Expense added successfully!",
      },
    });
  };

  const amount = parseFloat(values.amount) || 0;
  const vatAmount = calculateTax();
  // Validate supplier information when WHT is deducted (NRS requirement)
  const isSupplierInfoValid = !values.whtDeducted || (
    values.supplierName?.trim().length >= 2 &&
    values.supplierType
  );

  const isFormValid = 
    values.description.trim().length >= 3 &&
    amount > 0 &&
    values.category &&
    (!values.whtDeducted || values.whtType) && // WHT type required if WHT deducted
    isSupplierInfoValid && // Supplier info required if WHT deducted
    values.date;

  // Dynamic title based on account type
  const getModalTitle = () => {
    switch (accountType) {
      case AccountType.Company:
        return "Add Company Expense";
      case AccountType.Business:
        return "Add Business Expense";
      case AccountType.Individual:
        return "Add Personal Expense";
      default:
        return "Add New Expense";
    }
  };

  const getSubtitle = () => {
    if (accountType === AccountType.Individual) {
      return "Record money you spent. This helps track your finances.";
    }
    return "Record any money you spent for your company. This helps reduce your tax.";
  };

  return (
    <>
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Receipt className="w-8 h-8 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-900">{getModalTitle()}</h2>
          </div>
          <p className="text-slate-600 ml-11">{getSubtitle()}</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <motion.div variants={itemVariants}>
            <Card>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="What did you spend money on?"
                    type="text"
                    required
                    value={values.description}
                    onChange={handleChange("description")}
                    onBlur={handleBlur("description")}
                    error={touched.description ? errors.description : undefined}
                    placeholder="e.g., Printer paper, Fuel for delivery, Lunch meeting"
                    helperText="Describe what you bought or paid for"
                  />
                  <Select
                    label="Category"
                    required
                    value={values.category}
                    onChange={handleChange("category")}
                    onBlur={handleBlur("category")}
                    error={touched.category ? errors.category : undefined}
                    helperText="Choose the type of expense"
                  >
                    <option value="">Choose a category</option>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="How much did you spend? (₦)"
                    type="number"
                    step="0.01"
                    required
                    value={values.amount}
                    onChange={handleChange("amount")}
                    onBlur={handleBlur("amount")}
                    error={touched.amount ? errors.amount : undefined}
                    placeholder="e.g., 5000"
                    helperText="Enter the amount in Naira"
                  />
                  <Input
                    label="When did you spend this?"
                    type="date"
                    required
                    value={values.date}
                    onChange={handleChange("date")}
                    onBlur={handleBlur("date")}
                    error={touched.date ? errors.date : undefined}
                  />
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-300 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsTaxDeductibleExpanded(!isTaxDeductibleExpanded)}
                    className="w-full flex items-center justify-between p-4 hover:bg-emerald-100/50 transition-colors text-left"
                    aria-expanded={isTaxDeductibleExpanded}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        id="taxDeductible"
                        checked={values.isTaxDeductible}
                        onChange={handleChange("isTaxDeductible")}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 shrink-0"
                      />
                      <label htmlFor="taxDeductible" className="text-base font-bold text-emerald-900 cursor-pointer flex-1">
                        This expense can reduce my tax (Tax-Deductible)
                      </label>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <span className="text-sm font-medium">
                        {isTaxDeductibleExpanded ? "Hide" : "Show"} details
                      </span>
                      {isTaxDeductibleExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isTaxDeductibleExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 space-y-4 border-t-2 border-emerald-200">
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-2">
                             <p className="text-xs text-blue-800 leading-relaxed">
                               <strong>Compliance Note:</strong> This list covers all <strong>Operating Expenses</strong> under NTA 2025. 
                               For <em>Assets</em>, claim <strong>Capital Allowance</strong>. 
                               For <em>Infrastructure/Green Energy</em>, claim <strong>Tax Credits</strong>.
                               <strong>Warning:</strong> Related party bad debts are <span className="underline">disallowed</span>.
                             </p>
                          </div>
                          <p className="text-sm text-slate-800 leading-relaxed font-semibold pt-2">
                             What expenses can reduce tax per Nigeria Tax Act 2025 (effective 2026+)?
                          </p>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-emerald-200">
                              <p className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                                <span className="text-lg">✅</span> Tax-Deductible Expenses
                              </p>
                              <ul className="text-sm text-slate-700 space-y-2 leading-relaxed">
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Cost of Sales:</strong> Stock, Materials, Direct Production Costs</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Stock Loss:</strong> Proven inventory write-offs & Obsolescence</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Staff & Directors:</strong> Salaries, Redundancy Pay, Directors' Fees</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Staff Welfare:</strong> Meals/Parties for staff ONLY (Client entertainment is BANNED)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Travel & Hotels:</strong> Local & Foreign (Strictly for business purpose)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Statutory Contribs:</strong> Pension, ITF, NSITF, NHIS (Employer portion)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>AGM & Meetings:</strong> Statutory meetings and Filing fees</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Fuel & Power:</strong> Generator Diesel, PHCN, Vehicle Fuel</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Security & Cleaning:</strong> Guards, Janitorial services, Waste disposal</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Rent & Service Charge:</strong> Business premises & Estate dues</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Utilities/Internet:</strong> Strictly for business operations</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Professional Fees:</strong> Audit, Legal, Consulting (WHT deducted)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Mgmt & Tech Fees:</strong> NOTAP approval required for foreign payments</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Licenses & Subscriptions:</strong> Regulatory permits, Trade dues, Software</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Marketing:</strong> Ads, Promo materials (exclude gifts/entertainment)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Transport:</strong> Fuel, Logistics (Business trips only)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Finance:</strong> Bank charges, Interest on loans, Realized FX Loss</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Donations & CSR:</strong> Sch 5 bodies, Public Funds, Capital & Revenue based</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>General:</strong> Any expense "Wholly & Exclusively" for business</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Startup Costs:</strong> Pre-operational expenses (Allowed up to 6 years prior)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1">•</span>
                                  <span><strong>Digital Assets:</strong> Realized losses (Ring-fenced to Crypto gains ONLY)</span>
                                </li>
                              </ul>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-red-200">
                              <p className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                                <span className="text-lg">❌</span> NOT Tax-Deductible
                              </p>
                              <ul className="text-sm text-red-700 space-y-2 leading-relaxed">
                                <li className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold mt-1">×</span>
                                  <span><strong>Personal Expenses:</strong> Clothes, Groceries, Rent for home (unless Individual relief used)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold mt-1">×</span>
                                  <span><strong>Capital Improvements:</strong> Building extensions, New Roofs (Claim Capital Allowance)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold mt-1">×</span>
                                  <span><strong>Taxes & Fines:</strong> CIT, Development Levy, Penalties, Unpaid VAT expenses</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold mt-1">×</span>
                                  <span><strong>Unverified Pay:</strong> Payments to persons without TIN/NIN (Risk of disallowance)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold mt-1">×</span>
                                  <span><strong>Related Party Bad Debt:</strong> Loans to friends/family/subsidiaries</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold mt-1">×</span>
                                  <span><strong>Donations (Political):</strong> Political parties or bribes</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                          
                          <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-300">
                            <p className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                              <span>⚠️</span> Important NRS Requirements
                            </p>
                            <ul className="text-sm text-amber-800 space-y-1.5 leading-relaxed">
                              <li>• Expense must be <strong>wholly, exclusively, and necessarily</strong> for company</li>
                              <li>• Keep <strong>receipts/invoices</strong> for 6 years</li>
                              <li>• Expense must be <strong>reasonable</strong> - NRS may disallow excessive amounts</li>
                              <li>• Companies: Reduces taxable profit (CIT)</li>
                              <li>• Individuals: Reduces taxable income (PIT)</li>
                            </ul>
                          </div>
                          
                          {amount > 0 && (
                            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
                              <p className="text-sm font-bold text-blue-900 mb-2">
                                💡 Estimated Tax Savings
                              </p>
                              <p className="text-sm text-blue-800 leading-relaxed">
                                Spending ₦{amount.toLocaleString("en-NG")} could reduce your taxable profit.
                              </p>
                              <ul className="mt-2 space-y-1 text-xs text-blue-700">
                                <li>• <strong>Small Companies (Turnover ≤ ₦50M):</strong> You pay <strong>0% CIT</strong>. Expenses do not reduce tax as you are exempt.</li>
                                <li>• <strong>Other Companies (Turnover &gt; ₦50M):</strong> You save approx <strong>₦{Math.round(amount * 0.30).toLocaleString("en-NG")}</strong> (30% CIT).</li>
                                {accountType === AccountType.Business && (
                                  <li>• <strong>Sole Proprietorships:</strong> Reduces Personal Income Tax (PIT) liability.</li>
                                )}
                                <li className="mt-2 pt-2 border-t border-blue-200 font-semibold">• <strong>Input VAT (7.5%):</strong> Only claimable if you are <u>VAT Registered</u> (Turnover &gt; ₦25M or have VRN).</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {amount > 0 && (
                  <TaxCalculationPreview
                    amount={amount}
                    vatAmount={vatAmount}
                    accountType={accountType!}
                    isTaxDeductible={values.isTaxDeductible}
                  />
                )}

                {/* WHT Section - For Company and Business accounts */}
                {(accountType === AccountType.Company || accountType === AccountType.Business) && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <input
                        type="checkbox"
                        id="whtDeducted"
                        checked={values.whtDeducted}
                        onChange={handleChange("whtDeducted")}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-0.5"
                      />
                      <div className="flex-1">
                        <label htmlFor="whtDeducted" className="text-sm font-medium text-slate-900 cursor-pointer">
                          WHT was deducted from this payment
                        </label>
                        <p className="text-xs text-slate-600 mt-1">
                          Check this if you deducted WHT. <strong>Do NOT check</strong> if the supplier is exempt (e.g., turnover &le; ₦25M per WHT Regs).
                        </p>
                      </div>
                    </div>

                    {values.whtDeducted && (
                      <>
                        <div>
                          <Select
                            label="WHT Type"
                            required={values.whtDeducted}
                            value={values.whtType}
                            onChange={handleChange("whtType")}
                            onBlur={handleBlur("whtType")}
                            error={touched.whtType && values.whtDeducted && !values.whtType ? "WHT type is required" : undefined}
                            helperText="Select the type of payment to determine WHT rate"
                          >
                            <option value="">Select WHT type</option>
                            <option value="">Select WHT type</option>
                            <option value="professional_services">Professional Services</option>
                            <option value="technical_services">Technical Services</option>
                            <option value="management_services">Management Services</option>
                            <option value="other_services">Other Services</option>
                            <option value="dividends">Dividends</option>
                            <option value="interest">Interest</option>
                            <option value="royalties">Royalties</option>
                            <option value="rent">Rent</option>
                            <option value="commission">Commission</option>
                          </Select>
                          <p className="text-xs text-slate-500 mt-1">
                            WHT will be calculated automatically and tracked for remittance to NRS (Nigeria Revenue Service).
                          </p>
                        </div>

                        {/* Supplier Information (REQUIRED for WHT compliance per NRS) */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                          <p className="text-sm font-semibold text-slate-900">
                            Supplier/Vendor Information <span className="text-red-500">*</span>
                          </p>
                          <p className="text-xs text-slate-600 -mt-2">
                            Required by NRS (Nigeria Revenue Service) for WHT compliance. This information is used to issue WHT certificates and track WHT credits.
                          </p>

                          <Input
                            label="Supplier/Vendor Name"
                            required={values.whtDeducted}
                            value={values.supplierName}
                            onChange={handleChange("supplierName")}
                            onBlur={handleBlur("supplierName")}
                            error={touched.supplierName && values.whtDeducted && !values.supplierName ? "Supplier name is required for WHT compliance" : undefined}
                            placeholder="Enter supplier/vendor name"
                            helperText="Name of the supplier/vendor who received the payment"
                          />

                          <Input
                            label="Supplier TIN (Tax Identification Number)"
                            value={values.supplierTIN}
                            onChange={handleChange("supplierTIN")}
                            onBlur={handleBlur("supplierTIN")}
                            placeholder="Enter supplier TIN (if available)"
                            helperText="Strongly recommended for NRS (Nigeria Revenue Service) compliance. Leave blank if TIN is not available."
                          />

                          <Select
                            label="Supplier Type"
                            required={values.whtDeducted}
                            value={values.supplierType}
                            onChange={handleChange("supplierType")}
                            onBlur={handleBlur("supplierType")}
                            error={touched.supplierType && values.whtDeducted && !values.supplierType ? "Supplier type is required" : undefined}
                            helperText="Is the supplier a company or individual? This affects WHT rates."
                          >
                            <option value="">Select supplier type</option>
                            <option value={AccountType.Company}>Company</option>
                            <option value={AccountType.Individual}>Individual / Business Name</option>
                          </Select>

                          <div className="flex items-start space-x-3 pt-2">
                            <input
                              type="checkbox"
                              id="isNonResident"
                              checked={values.isNonResident}
                              onChange={handleChange("isNonResident")}
                              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-1"
                            />
                            <div>
                              <label htmlFor="isNonResident" className="text-sm font-medium text-slate-900 cursor-pointer">
                                Non-Resident Supplier?
                              </label>
                              <p className="text-xs text-slate-600">
                                Check this if the supplier is NOT resident in Nigeria. Non-residents typically attract a higher WHT rate (e.g., 10% instead of 5%).
                              </p>
                            </div>
                          </div>

                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100"
          >
            <Button
              type="button"
              variant={ButtonVariant.Outline}
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto border-slate-200 hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || !isFormValid || !accountId}
              className="w-full sm:w-auto min-w-[140px]"
            >
              <Save className="w-4 h-4" />
              Add Expense
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

