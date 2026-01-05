"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { subscriptionActions } from "@/store/redux/subscription/subscription-slice";
import { AccountType } from "@/lib/utils/account-type";
import { CreditCard, Check, ArrowUpRight, Sparkles, Gift } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { RouteGuard } from "@/components/shared/RouteGuard";

import { BillingCycle } from "@/lib/utils/billing-cycle";
import { ButtonVariant, LoadingStateSize } from "@/lib/utils/client-enums";
import { NextStepCard } from "@/components/shared/NextStepCard";

interface Subscription {
  plan: string;
  billingCycle: string;
  amount: number;
  status: string;
  startDate: string;
  endDate: string;
  bonusDays?: number;
  previousPlan?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightPlanRef = useRef<HTMLDivElement>(null);
  
  const dispatch = useAppDispatch();
  const { isLoading: isLoadingSubscription, sendHttpRequest: fetchSubscriptionReq } = useHttp();
  const { isLoading: isLoadingPlans, sendHttpRequest: fetchPlansReq } = useHttp();
  
  // CRITICAL: Use Redux subscription state instead of local state
  // This ensures subscription is consistent across all pages
  const { currentSubscription } = useAppSelector((state: any) => state.subscription);
  const subscription = currentSubscription;
  
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(BillingCycle.Monthly);
  const [highlightedPlan, setHighlightedPlan] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Subscriptions are user-based, fetch on mount
  // CRITICAL: Only fetch if not already in Redux to avoid duplicate requests
  // Also check isLoading to prevent race conditions with DashboardLayout
  const { hasFetched: hasFetchedSubscription, isLoading: isLoadingSubscriptionFromRedux } = useAppSelector((state: any) => state.subscription);

  // CRITICAL FIX: Define fetchSubscriptionData BEFORE it's used in useEffect
  // This prevents "Cannot access before initialization" error
  const fetchSubscriptionData = useCallback(() => {
    fetchSubscriptionReq({
      successRes: (response: any) => {
        const subscriptionData = response?.data?.data || null;
        // CRITICAL: Update Redux state, not local state
        // This ensures subscription is available across all pages
        dispatch(subscriptionActions.setCurrentSubscription(subscriptionData));
        setLoading(false);
      },
      errorRes: (errorResponse: any) => {
        // On error, set subscription to null in Redux (defaults to Free plan)
        dispatch(subscriptionActions.setCurrentSubscription(null));
        setLoading(false);
        return true;
      },
      requestConfig: {
        url: `/subscription`, // Subscriptions are user-based, no companyId needed
        method: HttpMethod.GET,
      },
    });
  }, [dispatch, fetchSubscriptionReq]);

  const fetchPricingPlans = () => {
    fetchPlansReq({
      successRes: (response: any) => {
        setPlans(response?.data?.data || []);
      },
      errorRes: () => true,
      requestConfig: {
        url: "/subscription/plans",
        method: HttpMethod.GET,
      },
    });
  };

  // Check for plan highlight and payment success from URL params
  useEffect(() => {
    const highlight = searchParams.get("highlight");
    const payment = searchParams.get("payment");
    
    if (highlight) {
      setHighlightedPlan(highlight.toLowerCase());
      // Scroll to highlighted plan after a short delay (allows plans to load)
      setTimeout(() => {
        if (highlightPlanRef.current) {
          highlightPlanRef.current.scrollIntoView({ 
            behavior: "smooth", 
            block: "center" 
          });
        }
      }, 500);
    }
    
    if (payment === "success") {
      setPaymentSuccess(true);
      // CRITICAL: Invalidate Redux cache and refetch subscription
      // This ensures all pages see the updated subscription immediately
      dispatch(subscriptionActions.invalidateCache());
      fetchSubscriptionData();
      // Clear URL param after showing success
      setTimeout(() => {
        router.replace("/dashboard/subscription");
      }, 5000);
    }
  }, [searchParams, router, dispatch, fetchSubscriptionData]);

  useEffect(() => {
    // CRITICAL: Prevent race conditions - don't fetch if already fetched OR already loading
    // DashboardLayout might be fetching simultaneously, so check both flags
    if (!hasFetchedSubscription && !isLoadingSubscriptionFromRedux) {
      fetchSubscriptionData();
    } else {
      // If already fetched or loading, just set loading to false
      setLoading(false);
    }
    fetchPricingPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFetchedSubscription, isLoadingSubscriptionFromRedux]);


  const handleUpgrade = (plan: string, billingCycle: string) => {
    router.push(`/dashboard/subscription/upgrade?plan=${plan}&cycle=${billingCycle}`);
  };

  // CRITICAL: Show loading if local loading state OR Redux loading state OR HTTP loading
  // This ensures we show loading even if DashboardLayout is fetching
  if (loading || isLoadingSubscription || isLoadingSubscriptionFromRedux) {
    return (
      <RouteGuard requireAccountType={[AccountType.Company, AccountType.Individual, AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading subscription information...">
        <LoadingState message="Loading subscription information..." size={LoadingStateSize.Md} />
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAccountType={[AccountType.Company, AccountType.Individual, AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading subscription information...">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <CreditCard className="w-8 h-8 text-emerald-600" />
          <h1 className="text-4xl font-bold text-slate-900">Subscription</h1>
        </div>
        <p className="text-slate-600 ml-11">Manage your subscription plan and billing</p>
      </motion.div>

      {/* Payment Success Message */}
      {paymentSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-emerald-50 border-2 border-emerald-300">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-emerald-900 mb-2">
                  🎉 Subscription Upgraded Successfully!
                </h3>
                <p className="text-emerald-800 mb-2">
                  Your subscription has been upgraded. If you had remaining days on your previous plan, 
                  we've added them as bonus days to your new subscription!
                </p>
                {subscription?.bonusDays && subscription.bonusDays > 0 && (
                  <p className="text-emerald-700 font-semibold">
                    ✨ {subscription.bonusDays} bonus day{subscription.bonusDays > 1 ? "s" : ""} added to your subscription!
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {subscription && (
        <motion.div variants={itemVariants}>
          <Card title="Current Plan">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 capitalize mb-1">
                    {subscription.plan} Plan
                  </h3>
                  <p className="text-sm text-slate-600">
                    {subscription.billingCycle === BillingCycle.Monthly ? "Monthly" : "Yearly"} billing
                  </p>
                </div>
                <div className="text-right">
                  <motion.p
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent"
                  >
                    {formatCurrency(subscription.amount)}
                  </motion.p>
                  <p className="text-sm text-slate-600">
                    {subscription.billingCycle === BillingCycle.Monthly ? "per month" : "per year"}
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-slate-600 mb-1">Status</p>
                    <p className="font-bold capitalize text-slate-900">{subscription.status}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Next Billing</p>
                    <p className="font-bold text-slate-900">{formatDate(subscription.endDate)}</p>
                  </div>
                </div>
              </div>
              
              {/* Bonus Days Display */}
              {subscription.bonusDays && subscription.bonusDays > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-lg border border-emerald-200"
                >
                  <div className="flex items-center space-x-3">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Bonus Days Active
                      </p>
                      <p className="text-xs text-emerald-700">
                        {subscription.bonusDays} extra day{subscription.bonusDays > 1 ? "s" : ""} added from your previous {subscription.previousPlan ?? "plan"} subscription
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card title="Available Plans">
          {isLoadingPlans ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="rounded-full h-12 w-12 border-4 border-emerald-100 border-t-emerald-600 mx-auto animate-spin"></div>
                <p className="mt-4 text-slate-600">Loading plans...</p>
              </div>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>No plans available at the moment</p>
            </div>
          ) : (
            <>
              {/* Billing Cycle Toggle */}
              <div className="flex justify-center mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="inline-flex items-center space-x-1 p-1 bg-slate-200 rounded-md shadow-inner border border-slate-300"
                >
                  <button
                    onClick={() => setBillingCycle(BillingCycle.Monthly)}
                    className={`px-6 py-2 rounded-md font-semibold text-sm transition-all duration-300 ${
                      billingCycle === BillingCycle.Monthly
                        ? "bg-white text-slate-900 shadow-md"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle(BillingCycle.Yearly)}
                    className={`px-6 py-2 rounded-md font-semibold text-sm transition-all duration-300 ${
                      billingCycle === BillingCycle.Yearly
                        ? "bg-white text-slate-900 shadow-md"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Yearly
                    <span className="ml-1 text-xs text-emerald-700 font-bold">Save 20%</span>
                  </button>
                </motion.div>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, index) => {
                const isHighlighted = highlightedPlan === plan.plan.toLowerCase();
                const isCurrent = subscription?.plan === plan.plan.toLowerCase();
                
                return (
                <motion.div
                  key={plan.name}
                  ref={isHighlighted ? highlightPlanRef : null}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: isHighlighted ? 1.05 : 1,
                  }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className={`relative p-6 rounded-xl border-2 ${
                    isCurrent
                      ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-white shadow-lg"
                      : isHighlighted
                      ? "border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-xl ring-4 ring-blue-200"
                      : plan.border
                  } bg-gradient-to-br ${plan.gradient} hover:shadow-lg transition-all`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 right-4 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg">
                      Current
                    </div>
                  )}
                  {isHighlighted && !isCurrent && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-3 left-4 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Recommended
                    </motion.div>
                  )}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                    {(plan as any).description && (
                      <p className="text-xs text-slate-600 mb-3 italic">{(plan as any).description}</p>
                    )}
                    <div className="mb-4">
                      {plan.monthly === 0 ? (
                        <p className="text-3xl font-bold text-slate-900">₦0</p>
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-slate-900">
                            {formatCurrency(billingCycle === BillingCycle.Yearly ? plan.yearly : plan.monthly)}
                            <span className="text-sm text-slate-500 font-normal">
                              /{billingCycle === BillingCycle.Yearly ? "year" : "mo"}
                            </span>
                          </p>
                          {billingCycle === BillingCycle.Yearly && plan.monthly > 0 && (
                            <p className="text-sm text-slate-600 mt-1">
                              {formatCurrency(plan.monthly)}/month billed annually
                            </p>
                          )}
                          {billingCycle === BillingCycle.Monthly && plan.yearly > 0 && (
                            <p className="text-sm text-emerald-700 font-semibold mt-1">
                              Save {formatCurrency((plan.monthly * 12) - plan.yearly)}/year with yearly billing
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm text-slate-700">
                    {plan.features.map((feature: string, featureIndex: number) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 + featureIndex * 0.05 }}
                        className="flex items-start"
                      >
                        <Check className="w-4 h-4 text-emerald-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                  {subscription?.plan !== plan.plan.toLowerCase() && plan.monthly > 0 && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant={ButtonVariant.Outline}
                        className={`w-full ${
                          isHighlighted
                            ? "border-blue-500 bg-blue-600 text-white hover:bg-blue-700"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                        onClick={() => handleUpgrade(plan.plan, billingCycle)}
                      >
                        {isHighlighted ? "Upgrade to Unlock" : "Upgrade"}
                        <ArrowUpRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
                );
              })}
            </div>
            </>
          )}
        </Card>
        <motion.div variants={itemVariants}>
        <NextStepCard
          title="Return to Dashboard"
          description="Finished managing your subscription? Return to the main dashboard."
          href="/dashboard"
          actionLabel="Go to Dashboard"
        />
      </motion.div>
      </motion.div>
    </motion.div>
    </RouteGuard>
  );
}
