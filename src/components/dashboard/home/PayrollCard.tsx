"use client";

import { motion, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { useAppSelector } from "@/hooks/useAppSelector";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoadingStateSize, ButtonVariant } from "@/lib/utils/client-enums";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";

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

import { AccountType } from "@/lib/utils/account-type";

interface PayrollCardProps {
  payrollData: {
    totalEmployees: number;
    totalPAYE: number;
    totalNetSalary: number;
  } | null;
  accountType?: AccountType;
}

/**
 * Validates that a string is a valid SubscriptionPlan enum value
 * @throws Error if plan is not a valid SubscriptionPlan
 */
function validateSubscriptionPlan(plan: string | undefined): SubscriptionPlan {
  if (!plan) {
    throw new Error("PayrollCard: Subscription plan is missing. Subscription data may not be loaded.");
  }

  const validPlans = Object.values(SubscriptionPlan);
  if (!validPlans.includes(plan as SubscriptionPlan)) {
    throw new Error(
      `PayrollCard: Invalid subscription plan "${plan}". Valid plans are: ${validPlans.join(", ")}`
    );
  }

  return plan as SubscriptionPlan;
}

type SubscriptionPricing = typeof SUBSCRIPTION_PRICING[SubscriptionPlan.Free] | typeof SUBSCRIPTION_PRICING[SubscriptionPlan.Starter] | typeof SUBSCRIPTION_PRICING[SubscriptionPlan.Standard] | typeof SUBSCRIPTION_PRICING[SubscriptionPlan.Premium];

/**
 * Validates that subscription pricing data exists for the given plan
 * @throws Error if pricing data is missing
 */
function validateSubscriptionPricing(plan: SubscriptionPlan): SubscriptionPricing {
  const pricing = SUBSCRIPTION_PRICING[plan];
  if (!pricing) {
    throw new Error(
      `PayrollCard: Subscription pricing data missing for plan "${plan}". This is a configuration error.`
    );
  }

  if (typeof pricing.features !== "object" || pricing.features === null) {
    throw new Error(
      `PayrollCard: Subscription features data missing for plan "${plan}". This is a configuration error.`
    );
  }

  return pricing as SubscriptionPricing;
}

/**
 * Validates that payroll feature exists in pricing data
 * @throws Error if payroll feature is missing
 */
function validatePayrollFeature(pricing: SubscriptionPricing): boolean {
  if (!("payroll" in pricing.features)) {
    throw new Error(
      `PayrollCard: Payroll feature definition missing in subscription pricing. This is a configuration error.`
    );
  }

  const payrollAccess = pricing.features.payroll;
  if (typeof payrollAccess !== "boolean") {
    throw new Error(
      `PayrollCard: Payroll feature must be a boolean, got ${typeof payrollAccess}. This is a configuration error.`
    );
  }

  return payrollAccess;
}

export function PayrollCard({ payrollData, accountType }: PayrollCardProps) {
  const router = useRouter();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  
  // Get subscription state from Redux (user-based, works for both individual and company accounts)
  const subscriptionState = useAppSelector((state: any) => state.subscription);
  const { currentSubscription, hasFetched, isLoading, error } = subscriptionState;

  // Determine target URL based on account type
  const targetUrl = accountType === AccountType.Business 
    ? "/dashboard/business/payroll" 
    : "/dashboard/payroll";

  // CRITICAL: Show loading state if subscription hasn't been fetched yet
  if (!hasFetched || isLoading) {
    return (
      <motion.div variants={itemVariants}>
        <Card title="Staff Salary This Month" subtitle="Loading subscription data...">
          <div className="flex items-center justify-center py-8">
            <LoadingState message="Loading subscription..." size={LoadingStateSize.Sm} />
          </div>
        </Card>
      </motion.div>
    );
  }

  // CRITICAL: Show error state if subscription fetch failed
  if (error) {
    return (
      <motion.div variants={itemVariants}>
        <Card title="Staff Salary This Month" subtitle="Subscription error">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-red-600 text-center">
              Failed to load subscription data: {error}
            </p>
            <p className="text-xs text-slate-500 text-center">
              Please refresh the page or contact support if the issue persists.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  // CRITICAL: Validate subscription exists (no fallback to Free plan)
  if (!currentSubscription) {
    return (
      <motion.div variants={itemVariants}>
        <Card title="Staff Salary This Month" subtitle="No subscription found">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-amber-600 text-center">
              No subscription found. Please subscribe to access payroll features.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  // CRITICAL: Validate plan is a valid SubscriptionPlan enum (no fallback)
  let currentPlan: SubscriptionPlan;
  try {
    currentPlan = validateSubscriptionPlan(currentSubscription.plan);
  } catch (validationError) {
    const errorMessage = validationError instanceof Error ? validationError.message : "Unknown validation error";
    console.error("[PayrollCard] Subscription plan validation failed:", errorMessage);
    return (
      <motion.div variants={itemVariants}>
        <Card title="Staff Salary This Month" subtitle="Invalid subscription plan">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
            <p className="text-xs text-slate-500 text-center">
              Please contact support. This is a configuration error.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  // CRITICAL: Validate subscription pricing data exists (no optional chaining fallback)
  let pricing: SubscriptionPricing;
  try {
    pricing = validateSubscriptionPricing(currentPlan);
  } catch (validationError) {
    const errorMessage = validationError instanceof Error ? validationError.message : "Unknown validation error";
    console.error("[PayrollCard] Subscription pricing validation failed:", errorMessage);
    return (
      <motion.div variants={itemVariants}>
        <Card title="Staff Salary This Month" subtitle="Configuration error">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
            <p className="text-xs text-slate-500 text-center">
              Please contact support. This is a configuration error.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  // CRITICAL: Validate payroll feature exists and is boolean (no optional chaining fallback)
  let hasPayrollAccess: boolean;
  try {
    hasPayrollAccess = validatePayrollFeature(pricing);
  } catch (validationError) {
    const errorMessage = validationError instanceof Error ? validationError.message : "Unknown validation error";
    console.error("[PayrollCard] Payroll feature validation failed:", errorMessage);
    return (
      <motion.div variants={itemVariants}>
        <Card title="Staff Salary This Month" subtitle="Configuration error">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
            <p className="text-xs text-slate-500 text-center">
              Please contact support. This is a configuration error.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  // CRITICAL: Get required plan for payroll feature (no hardcoded values)
  // Accountant plan has payroll, so if user doesn't have access, they need Company plan minimum
  const requiredPlanForPayroll = SubscriptionPlan.Standard;

  const handleCardClick = () => {
    if (!hasPayrollAccess) {
      // CRITICAL: Get actual required plan price from SUBSCRIPTION_PRICING
      const requiredPlanPricing = SUBSCRIPTION_PRICING[requiredPlanForPayroll];
      if (!requiredPlanPricing) {
        console.error("[PayrollCard] Required plan pricing missing for", requiredPlanForPayroll);
        return;
      }

      showUpgradePrompt({
        feature: "Payroll Management",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: requiredPlanForPayroll.toLowerCase(),
        requiredPlanPrice: requiredPlanPricing.monthly,
        message: `Payroll management is available on ${requiredPlanForPayroll} plan (₦${requiredPlanPricing.monthly.toLocaleString()}/month) and above. Upgrade to unlock this feature.`,
        reason: UpgradeReason.PlanLimitation,
      });
    } else {
      router.push(targetUrl);
    }
  };

  return (
    <>
    <motion.div variants={itemVariants}>
      <div
        onClick={!hasPayrollAccess ? handleCardClick : undefined}
        className={!hasPayrollAccess ? "cursor-pointer" : ""}
      >
        <Card 
          title="Staff Salary This Month" 
          subtitle={payrollData ? "What you paid your workers" : "Payroll management"}
          className={!hasPayrollAccess ? "hover:shadow-lg transition-shadow" : ""}
        >
        {payrollData ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Number of staff:</span>
              <span className="font-bold text-slate-900">{payrollData.totalEmployees}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Tax deducted (PAYE):</span>
              <span className="font-bold text-slate-900">{formatCurrency(payrollData.totalPAYE)}</span>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between">
              <span className="text-sm font-semibold text-slate-900">Total salary paid:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(payrollData.totalNetSalary)}</span>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <Button
                variant={ButtonVariant.Outline}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(targetUrl);
                }}
                className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                View Payroll Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : hasPayrollAccess ? (
          // User has payroll access but no payroll data yet - show "Get Started" message
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-6 border-2 border-emerald-200 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <ArrowRight className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Payroll Management</h3>
              <p className="text-sm text-slate-600 mb-4">
                Calculate staff salaries, manage PAYE deductions, and generate payroll reports.
              </p>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(targetUrl);
                }}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-0"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-slate-500 mt-3">
                Start managing your payroll
              </p>
            </div>
          </div>
        ) : (
          // User doesn't have payroll access - show upgrade prompt
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 border-2 border-slate-200 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-500 rounded-2xl flex items-center justify-center">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Payroll Management</h3>
              <p className="text-sm text-slate-600 mb-4">
                Calculate staff salaries, manage PAYE deductions, and generate payroll reports.
              </p>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-0"
              >
                <Lock className="w-4 h-4 mr-2" />
                Upgrade to Unlock
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-slate-500 mt-3">
                Available on Company plan (₦8,500/month)
              </p>
            </div>
          </div>
        )}
        </Card>
      </div>
    </motion.div>
    <UpgradePromptComponent />
    </>
  );
}






