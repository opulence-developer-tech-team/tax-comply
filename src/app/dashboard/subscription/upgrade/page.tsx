"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { BillingCycle } from "@/lib/utils/billing-cycle";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useHttp } from "@/hooks/useHttp";
import { LoadingState } from "@/components/shared/LoadingState";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { AccountType } from "@/lib/utils/account-type";
import { CreditCard, ArrowLeft, Sparkles, Gift, Calendar, CheckCircle2 } from "lucide-react";
import { ButtonVariant, ButtonSize, LoadingStateSize } from "@/lib/utils/client-enums";
import { toast } from "sonner";

interface UpgradeInfo {
  hasBonus: boolean;
  bonusDays: number;
  previousPlan?: string;
  newEndDate: string;
  standardEndDate: string;
  message: string;
}

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, sendHttpRequest: initializePaymentReq } = useHttp();
  const { sendHttpRequest: fetchPlansReq } = useHttp();
  const { sendHttpRequest: calculateUpgradeReq } = useHttp();
  
  const [plan, setPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(BillingCycle.Monthly);
  const [upgradeInfo, setUpgradeInfo] = useState<UpgradeInfo | null>(null);
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const planParam = searchParams.get("plan");
    const cycleParam = searchParams.get("cycle");
    
    if (planParam) {
      setPlan(planParam);
    }
    if (cycleParam === BillingCycle.Yearly || cycleParam === BillingCycle.Monthly) {
      setBillingCycle(cycleParam as BillingCycle);
    }
  }, [searchParams]);

  // Fetch plan details and calculate upgrade info
  useEffect(() => {
    if (!plan) return;

    setIsCalculating(true);

    // Fetch plan details
    fetchPlansReq({
      successRes: (response: any) => {
         const plans = response?.data?.data || [];
         const selectedPlan = plans.find((p: any) => p.plan.toLowerCase() === plan.toLowerCase());
         if (selectedPlan) {
           setPlanDetails(selectedPlan);
         }
         // Only turn off calculating if upgrade calc is also done or failed? 
         // Actually safest to let both requests run independently, but setIsCalculating(false) needs coordination or separate flags.
         // However, simplest is to let them run and we rely on the last one or just keep it simple.
         // Since calculateUpgradeReq is distinct, let's keep setIsCalculating logic attached to it primarily for the "calculating..." UI. 
         // But plan details are also needed. 
      },
      errorRes: () => true, // Suppress error
      requestConfig: {
        url: "/subscription/plans",
        method: HttpMethod.GET
      }
    });

    // Calculate upgrade info (bonus days) without initializing payment
    calculateUpgradeReq({
      successRes: (response: any) => {
        if (response?.data?.data) {
          setUpgradeInfo(response.data.data);
        }
        setIsCalculating(false);
      },
      errorRes: () => {
        setIsCalculating(false);
        return true;
      },
      requestConfig: {
        url: "/subscription/calculate-upgrade",
        method: HttpMethod.POST,
        body: { plan, billingCycle }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, billingCycle, fetchPlansReq, calculateUpgradeReq]);

  const handleProceedToPayment = () => {
    if (!plan) return;

    setIsCalculating(true);
    
    initializePaymentReq({
      successRes: (response: any) => {
        const data = response?.data?.data;
        const checkoutUrl = data?.checkoutUrl;
        
        if (checkoutUrl) {
          // Show bonus message if applicable
          if (data?.upgradeInfo?.hasBonus) {
            toast.success(data.upgradeInfo.message, {
              duration: 5000,
            });
          }
          
          // Redirect to Monnify checkout
          window.location.href = checkoutUrl;
        } else {
          toast.error("Failed to initialize payment. Please try again.");
          setIsCalculating(false);
        }
      },
      errorRes: (errorResponse: any) => {
        const errorMessage = errorResponse?.data?.description || "Failed to initialize payment";
        toast.error(errorMessage);
        setIsCalculating(false);
        return true;
      },
      requestConfig: {
        url: "/subscription/initialize",
        method: HttpMethod.POST,
        body: {
          plan,
          billingCycle,
        },
      },
    });
  };

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Invalid plan selected</p>
          <Button onClick={() => router.push("/dashboard/subscription")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Subscription
          </Button>
        </div>
      </div>
    );
  }

  const planName = planDetails?.name || plan.charAt(0).toUpperCase() + plan.slice(1);
  const planPrice = billingCycle === BillingCycle.Yearly 
    ? planDetails?.yearly || 0 
    : planDetails?.monthly || 0;

  return (
    <RouteGuard requireAccountType={[AccountType.Company, AccountType.Individual, AccountType.Business]} redirectTo="/dashboard/expenses" loadingMessage="Loading upgrade...">
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant={ButtonVariant.Outline}
            onClick={() => router.push("/dashboard/subscription")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-3">
            <CreditCard className="w-8 h-8 text-emerald-600" />
            <h1 className="text-4xl font-bold text-slate-900">Upgrade Subscription</h1>
          </div>
        </motion.div>

        {isCalculating ? (
          <Card className="p-8">
            <LoadingState message="Calculating upgrade details..." size={LoadingStateSize.Md} />
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Plan Summary */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Plan Summary</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-600">Selected Plan</p>
                    <p className="text-xl font-bold text-slate-900">{planName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Billing Cycle</p>
                    <p className="text-xl font-bold text-slate-900 capitalize">{billingCycle}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                  <div>
                    <p className="text-sm text-emerald-700 font-semibold">Total Amount</p>
                    <p className="text-3xl font-bold text-emerald-700">
                      {formatCurrency(planPrice)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Bonus Days Alert */}
            {upgradeInfo?.hasBonus && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <Card className="p-6 bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-emerald-50 border-2 border-emerald-300 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Sparkles className="w-5 h-5 text-emerald-700" />
                        <h3 className="text-xl font-bold text-emerald-900">Bonus Days Added!</h3>
                      </div>
                      <p className="text-emerald-800 mb-4 leading-relaxed">
                        {upgradeInfo.message}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-white/80 p-4 rounded-lg border border-emerald-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <Calendar className="w-5 h-5 text-emerald-600" />
                            <p className="text-sm font-semibold text-emerald-900">Bonus Days</p>
                          </div>
                          <p className="text-2xl font-bold text-emerald-700">
                            +{upgradeInfo.bonusDays} day{upgradeInfo.bonusDays > 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="bg-white/80 p-4 rounded-lg border border-emerald-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <p className="text-sm font-semibold text-emerald-900">New End Date</p>
                          </div>
                          <p className="text-lg font-bold text-emerald-700">
                            {formatDate(new Date(upgradeInfo.newEndDate))}
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">
                            (Instead of {formatDate(new Date(upgradeInfo.standardEndDate))})
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Payment CTA */}
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Ready to upgrade?
                  </h3>
                  <p className="text-slate-600">
                    Click the button below to proceed to secure payment. You'll be redirected to our
                    payment partner to complete the transaction.
                  </p>
                </div>
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  className="w-full"
                  onClick={handleProceedToPayment}
                  disabled={isLoading || isCalculating}
                >
                  {isLoading || isCalculating ? (
                    <>
                      <div className="mr-2">
                        <LoadingState size={LoadingStateSize.Sm} />
                      </div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Proceed to Payment - {formatCurrency(planPrice)}
                    </>
                  )}
                </Button>
                {upgradeInfo?.hasBonus && (
                  <p className="text-sm text-center text-emerald-700 font-semibold">
                    ✨ You'll get {upgradeInfo.bonusDays} bonus day{upgradeInfo.bonusDays > 1 ? "s" : ""} added to your subscription!
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}
        </div>
      </div>
    </RouteGuard>
  );
}

