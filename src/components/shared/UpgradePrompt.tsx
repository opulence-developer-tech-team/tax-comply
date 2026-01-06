"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { BillingCycle } from "@/lib/utils/billing-cycle";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { X, Sparkles, ArrowRight, Lock, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { LoadingState } from "@/components/shared/LoadingState";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";
import { UsagePeriod } from "@/lib/utils/usage-period";
import { LoadingStateSize, ButtonVariant } from "@/lib/utils/client-enums";

export interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  currentPlan?: string;
  requiredPlan?: string;
  requiredPlanPrice?: number;
  message?: string;
  reason?: UpgradeReason;
  usageInfo?: {
    current: number;
    limit: number;
    period?: UsagePeriod;
  };
}

interface PricingPlan {
  name: string;
  plan: string;
  monthly: number;
  yearly: number;
  features: string[];
  gradient: string;
  border: string;
}

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  company: "Company",
  accountant: "Accountant",
};

const PLAN_ORDER = [
  SubscriptionPlan.Free,
  SubscriptionPlan.Starter,
  SubscriptionPlan.Standard,
  SubscriptionPlan.Premium,
];

const PLAN_GRADIENTS: Record<string, string> = {
  starter: "from-emerald-50 to-white",
  company: "from-blue-50 to-white",
  accountant: "from-purple-50 to-white",
};

const PLAN_BORDERS: Record<string, string> = {
  starter: "border-emerald-200",
  company: "border-blue-200",
  accountant: "border-purple-200",
};

export function UpgradePrompt({
  isOpen,
  onClose,
  feature,
  currentPlan = "free",
  requiredPlan,
  requiredPlanPrice,
  message,
  reason = UpgradeReason.PlanLimitation,
  usageInfo,
}: UpgradePromptProps) {
  const router = useRouter();
  const { sendHttpRequest: fetchPlansReq } = useHttp();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(BillingCycle.Monthly);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch pricing plans when modal opens
  useEffect(() => {
    if (isOpen && plans.length === 0) {
      setIsLoadingPlans(true);
      fetchPlansReq({
        successRes: (response: any) => {
          const fetchedPlans = response?.data?.data || [];
          // Filter out Free plan and plans below current plan
          const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan as SubscriptionPlan);
          const filteredPlans = fetchedPlans.filter((plan: PricingPlan) => {
            const planIndex = PLAN_ORDER.indexOf(plan.plan as SubscriptionPlan);
            return planIndex > currentPlanIndex;
          });
          setPlans(filteredPlans);
          setIsLoadingPlans(false);
          
          // Auto-select required plan if provided, otherwise select first available plan
          if (requiredPlan) {
            setSelectedPlan(requiredPlan.toLowerCase());
          } else if (filteredPlans.length > 0) {
            setSelectedPlan(filteredPlans[0].plan.toLowerCase());
          }
        },
        errorRes: () => {
          setIsLoadingPlans(false);
          return true;
        },
        requestConfig: {
          url: "/subscription/plans",
          method: HttpMethod.GET,
        },
      });
    }
  }, [isOpen, currentPlan, requiredPlan, fetchPlansReq]);

  // Reset selected plan when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlan(null);
      setBillingCycle(BillingCycle.Monthly);
    }
  }, [isOpen]);

  const handleUpgrade = () => {
    if (!selectedPlan) return;
    
    // Close modal first
    onClose();
    
    // Navigate to subscription page with highlighted plan
    // If requiredPlan is provided, use it for highlighting; otherwise use selectedPlan
    const planToHighlight = requiredPlan || selectedPlan;
    router.push(`/dashboard/subscription?highlight=${planToHighlight}&plan=${selectedPlan}&cycle=${billingCycle}`);
  };

  const isPlanRecommended = (planName: string) => {
    if (requiredPlan) {
      return planName.toLowerCase() === requiredPlan.toLowerCase();
    }
    // If no required plan, recommend the first available plan
    return plans.length > 0 && planName.toLowerCase() === plans[0].plan.toLowerCase();
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="upgrade-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100]"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4 py-8 overflow-y-auto pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full relative border-2 border-emerald-100 my-auto overflow-hidden pointer-events-auto"
            >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100 z-20"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Section with Gradient Background */}
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 px-6 py-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
            </div>
            <div className="relative z-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30">
                  <Lock className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-2">
                Upgrade to Unlock {feature}
              </h3>
              {message ? (
                <p className="text-emerald-50 text-lg">{message}</p>
              ) : (
                <p className="text-emerald-50 text-lg">
                  {reason === UpgradeReason.UsageLimitReached && usageInfo
                    ? `You've used ${usageInfo.current} of ${usageInfo.limit} this ${usageInfo.period || "month"}. Choose a plan to continue.`
                    : "Select a plan below to unlock this feature and more."}
                </p>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6 pt-12">
            {/* Current Plan Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-200">
                <span className="text-xs text-slate-500">Current Plan:</span>
                <span className="font-semibold text-slate-900">
                  {PLAN_NAMES[currentPlan.toLowerCase()] || currentPlan}
                </span>
              </div>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center space-x-1 p-1 bg-slate-100 rounded-lg shadow-inner border border-slate-200">
                <button
                  onClick={() => setBillingCycle(BillingCycle.Monthly)}
                  className={`px-6 py-2.5 rounded-md font-semibold text-sm transition-all duration-200 ${
                    billingCycle === BillingCycle.Monthly
                      ? "bg-white text-slate-900 shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle(BillingCycle.Yearly)}
                  className={`px-6 py-2.5 rounded-md font-semibold text-sm transition-all duration-200 ${
                    billingCycle === BillingCycle.Yearly
                      ? "bg-white text-slate-900 shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Yearly
                  <span className="ml-1.5 text-xs text-emerald-700 font-bold">Save 17%</span>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isLoadingPlans ? (
              <div className="py-16">
                <LoadingState message="Loading plans..." size={LoadingStateSize.Md} />
              </div>
            ) : plans.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <p>No upgrade plans available</p>
              </div>
            ) : (
              <>
                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 pt-2">
                  {plans.map((plan, index) => {
                    const isRecommended = isPlanRecommended(plan.plan);
                    const isSelected = selectedPlan === plan.plan.toLowerCase();
                    const price = billingCycle === BillingCycle.Yearly ? plan.yearly : plan.monthly;
                    const monthlyEquivalent = billingCycle === BillingCycle.Yearly ? Math.round(plan.yearly / 12) : plan.monthly;
                    const planKey = plan.plan.toLowerCase();
                    const gradient = PLAN_GRADIENTS[planKey] || "from-slate-50 to-white";
                    const borderColor = PLAN_BORDERS[planKey] || "border-slate-200";

                    return (
                      <motion.div
                        key={plan.plan}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        onClick={() => setSelectedPlan(plan.plan.toLowerCase())}
                        className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? `border-emerald-500 bg-gradient-to-br ${gradient} shadow-xl ring-4 ring-emerald-200`
                            : isRecommended
                            ? `border-blue-400 bg-gradient-to-br ${gradient} shadow-lg`
                            : `border-slate-200 bg-gradient-to-br ${gradient} hover:border-slate-300 hover:shadow-md`
                        }`}
                      >
                        {isRecommended && !isSelected && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg">
                            <Sparkles className="w-3 h-3" />
                            Recommended
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute -top-3 right-3 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                        
                        <div className="mb-4">
                          <h4 className="text-xl font-bold text-slate-900 mb-3">{plan.name}</h4>
                          <div>
                            {price === 0 ? (
                              <p className="text-3xl font-bold text-slate-900">Free</p>
                            ) : (
                              <>
                                <p className="text-3xl font-bold text-slate-900 mb-1">
                                  {formatCurrency(price)}
                                  <span className="text-base text-slate-500 font-normal ml-1">
                                    /{billingCycle === BillingCycle.Yearly ? "yr" : "mo"}
                                  </span>
                                </p>
                                {billingCycle === BillingCycle.Yearly && (
                                  <p className="text-xs text-slate-600">
                                    {formatCurrency(monthlyEquivalent)}/month billed annually
                                  </p>
                                )}
                                {billingCycle === BillingCycle.Monthly && plan.yearly > 0 && (
                                  <p className="text-xs text-emerald-700 font-semibold">
                                    Save {formatCurrency((plan.monthly * 12) - plan.yearly)}/year with yearly
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="max-h-[280px] overflow-y-auto pr-2">
                          <ul className="space-y-2 text-sm text-slate-700">
                            {plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start">
                                <Check className="w-4 h-4 text-emerald-600 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="text-xs leading-relaxed">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Selected Plan Summary & Actions */}
                <div className="border-t border-slate-200 pt-6 mt-6">
                  {selectedPlan ? (
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl p-5 mb-6 border-2 border-emerald-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 mb-1">Selected Plan</p>
                            <p className="font-bold text-emerald-900 text-xl">
                              {PLAN_NAMES[selectedPlan] || selectedPlan}
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right pl-[4rem] sm:pl-0">
                          <p className="text-sm text-slate-600 mb-1">Total Price</p>
                          <p className="font-bold text-emerald-600 text-xl">
                            {(() => {
                              const plan = plans.find((p) => p.plan.toLowerCase() === selectedPlan);
                              if (!plan) return "—";
                              const price = billingCycle === BillingCycle.Yearly ? plan.yearly : plan.monthly;
                              return formatCurrency(price) + (billingCycle === BillingCycle.Yearly ? "/year" : "/month");
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-200 text-center">
                      <p className="text-slate-600 text-sm">Please select a plan to continue</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant={ButtonVariant.Outline}
                      onClick={onClose}
                      className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 py-3"
                    >
                      Maybe Later
                    </Button>
                    <Button
                      onClick={handleUpgrade}
                      disabled={!selectedPlan}
                      variant={ButtonVariant.Primary}
                      className="flex-1 shadow-lg py-3"
                    >
                      {selectedPlan ? "Upgrade Now" : "Select a Plan"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
