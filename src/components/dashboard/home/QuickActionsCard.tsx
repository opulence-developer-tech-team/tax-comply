"use client";

import { motion, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { useAppSelector } from "@/hooks/useAppSelector";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { FileText, DollarSign, CheckCircle2, Lock, TrendingUp, TrendingDown } from "lucide-react";
import { AccountType } from "@/lib/utils/account-type";
import { ButtonVariant } from "@/lib/utils/client-enums";
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

export function QuickActionsCard() {
  const router = useRouter();
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();
  // Get subscription from Redux subscription slice (user-based, works for both individual and company accounts)
  const { currentSubscription } = useAppSelector((state: any) => state.subscription);
  const { user } = useAppSelector((state: any) => state.user);
  const accountType = user?.accountType;
  const isIndividualAccount = accountType === AccountType.Individual;
  const isBusinessAccount = accountType === AccountType.Business;
  const currentPlan = currentSubscription?.plan || SubscriptionPlan.Free;
  const planFeatures = SUBSCRIPTION_PRICING[currentPlan as SubscriptionPlan]?.features;
  const hasPayrollAccess = planFeatures?.payroll === true;
  const hasPITReturns = planFeatures?.pitReturns === true;

  const handlePayrollClick = () => {
    if (isIndividualAccount) {
      showUpgradePrompt({
        feature: "Payroll Management",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "company",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly,
        message: "Payroll management is available for Company accounts on Company plan (₦8,500/month) and above. Upgrade to unlock this feature.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }
    if (!hasPayrollAccess) {
      showUpgradePrompt({
        feature: "Payroll Management",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "company",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly,
        message: "Payroll management is available on Company plan (₦8,500/month) and above. Upgrade to unlock this feature.",
        reason: UpgradeReason.PlanLimitation,
      });
    } else {
      router.push(isBusinessAccount ? "/dashboard/business/payroll" : "/dashboard/payroll");
    }
  };

  const handleInvoiceClick = () => {
    if (isIndividualAccount) {
      showUpgradePrompt({
        feature: "Invoice Management",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "company",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
        message: "Invoice management is available for Company accounts. Create a company account to manage invoices.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }
    router.push(isBusinessAccount ? "/dashboard/business/invoices" : "/dashboard/invoices");
  };

  const handleComplianceClick = () => {
    if (isIndividualAccount) {
      showUpgradePrompt({
        feature: "Compliance Dashboard",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "company",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
        message: "Compliance dashboard is available for Company accounts. Create a company account to access compliance tracking.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }
    router.push(isBusinessAccount ? "/dashboard/business/compliance" : "/dashboard/compliance");
  };

  const handlePITReturnClick = () => {
    if (!isIndividualAccount) {
      showUpgradePrompt({
        feature: "PIT Return Generation",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "individual",
        requiredPlanPrice: 0,
        message: "PIT Return generation is available for Individual accounts. Switch to an individual account to access this feature.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }
    if (!hasPITReturns) {
      showUpgradePrompt({
        feature: "PIT Return Generation",
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan: "starter",
        requiredPlanPrice: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
        message: "PIT Return generation is available on Starter plan (₦3,500/month) and above. Upgrade to generate PIT returns.",
        reason: UpgradeReason.PlanLimitation,
      });
      return;
    }
    router.push("/dashboard/tax-filing");
  };

  // Show different actions based on account type
  if (isIndividualAccount) {
    return (
      <>
        <motion.div variants={itemVariants}>
          <Card title="What Would You Like to Do?">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant={ButtonVariant.Outline}
                  onClick={() => router.push("/dashboard/income")}
                  className="w-full h-auto py-4 border-green-200 text-green-700 hover:bg-green-50 flex flex-col items-center space-y-2"
                >
                  <TrendingUp className="w-6 h-6" />
                  <span>Manage Income</span>
                  <span className="text-xs text-slate-500 mt-1">Add income sources</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant={ButtonVariant.Outline}
                  onClick={() => router.push(isBusinessAccount ? "/dashboard/business/expenses" : "/dashboard/expenses")}
                  className="w-full h-auto py-4 border-blue-200 text-blue-700 hover:bg-blue-50 flex flex-col items-center space-y-2"
                >
                  <TrendingDown className="w-6 h-6" />
                  <span>Track Expenses</span>
                  <span className="text-xs text-slate-500 mt-1">Manage tax-deductible expenses</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant={ButtonVariant.Outline}
                  onClick={handlePITReturnClick}
                  className={`w-full h-auto py-4 flex flex-col items-center space-y-2 ${
                    hasPITReturns
                      ? "border-purple-200 text-purple-700 hover:bg-purple-50"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {hasPITReturns ? (
                    <FileText className="w-6 h-6" />
                  ) : (
                    <Lock className="w-6 h-6" />
                  )}
                  <span>Generate PIT Return</span>
                  <span className="text-xs text-slate-500 mt-1">
                    {hasPITReturns ? "File your PIT return" : "Upgrade to unlock"}
                  </span>
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
        <UpgradePromptComponent />
      </>
    );
  }

  // Company account actions (existing code)
  return (
    <>
    <motion.div variants={itemVariants}>
      <Card title="What Would You Like to Do?">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant={ButtonVariant.Outline}
              onClick={handleInvoiceClick}
              className="w-full h-auto py-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex flex-col items-center space-y-2"
            >
              <FileText className="w-6 h-6" />
              <span>Create New Invoice</span>
              <span className="text-xs text-slate-500 mt-1">Send bill to customer</span>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant={ButtonVariant.Outline}
              onClick={handlePayrollClick}
              className={`w-full h-auto py-4 flex flex-col items-center space-y-2 ${
                hasPayrollAccess
                  ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {hasPayrollAccess ? (
                <DollarSign className="w-6 h-6" />
              ) : (
                <Lock className="w-6 h-6" />
              )}
              <span>Calculate Staff Salary</span>
              <span className="text-xs text-slate-500 mt-1">
                {hasPayrollAccess ? "Pay your workers" : "Upgrade to unlock"}
              </span>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant={ButtonVariant.Outline}
              onClick={handleComplianceClick}
              className="w-full h-auto py-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex flex-col items-center space-y-2"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>Check Tax Status</span>
              <span className="text-xs text-slate-500 mt-1">Review your tax compliance status</span>
            </Button>
          </motion.div>
        </div>
      </Card>
    </motion.div>
    <UpgradePromptComponent />
    </>
  );
}
