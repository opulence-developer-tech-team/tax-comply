"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useHttp } from "@/hooks/useHttp";
import { HttpMethod } from "@/lib/utils/http-method";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { toast } from "sonner";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sendHttpRequest, isLoading } = useHttp();
  
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your payment...");
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentReference = searchParams.get("paymentReference");
      const transactionReference = searchParams.get("transactionReference");

      if (!paymentReference && !transactionReference) {
        console.log("For Debugging: Missing references from URL");
        setStatus("error");
        setMessage("Invalid payment reference. Please try again.");
        return;
      }
      
      console.log("For Debugging: Verifying with:", { paymentReference, transactionReference });

      try {
        await sendHttpRequest({
          requestConfig: {
              url: "/payment/verify",
              method: HttpMethod.POST,
              body: {
                paymentReference,
                transactionReference,
              },
          },
          successRes: (response) => {
              console.log("For Debugging: Verification success response:", response);
              if (response.status === 200 || response.data?.success) {
                setStatus("success");
                setMessage("Payment verified successfully!");
                setSubscriptionDetails(response.data?.data?.subscription || {});
                
                // Auto-redirect after 5 seconds
                setTimeout(() => {
                  router.push("/dashboard/subscription");
                }, 5000);
              } else {
                console.log("For Debugging: Verification failed in success handler:", response);
                setStatus("error");
                setMessage(response.data?.message || "Payment verification failed.");
              }
          },
          errorRes: (error) => {
             console.log("For Debugging: Verification error response:", error);
             // Let useHttp handle the toast, but we update local state
             setStatus("error");
             setMessage(error.response?.data?.message || error.message || "An error occurred during verification.");
             return false; 
          }
        });

      } catch (error: any) {
        // This catch block might not be reached if useHttp handles everything, but good for safety
        console.error("Verification error:", error);
        setStatus("error");
        setMessage(error.message || "An error occurred during verification.");
      }
    };

    verifyPayment();
  }, [searchParams, sendHttpRequest, router]);

  const handleContinue = () => {
    router.push("/dashboard/subscription");
  };

  const handleRetry = () => {
    router.push("/dashboard/subscription/upgrade");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl border-t-4 border-t-blue-600">
        <div className="text-center space-y-6">
          {/* Icon Animation */}
          <div className="flex justify-center">
            {status === "verifying" && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Loader2 className="w-16 h-16 text-blue-600" />
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <CheckCircle2 className="w-20 h-20 text-green-500" />
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <XCircle className="w-20 h-20 text-red-500" />
              </motion.div>
            )}
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {status === "verifying" && "Verifying Payment"}
              {status === "success" && "Payment Successful!"}
              {status === "error" && "Verification Failed"}
            </h1>
            <p className="text-gray-600">
              {status === "verifying" && "Please wait while we secure your transaction..."}
              {status === "success" && "Your subscription has been updated successfully. Redirecting you shortly..."}
              {status === "error" && message}
            </p>
          </div>

          {/* Success Details */}
          {status === "success" && subscriptionDetails?.bonusDays && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-green-50 p-4 rounded-lg border border-green-100 text-sm text-green-800"
             >
                <p><strong>Bonus Applied!</strong></p>
                <p>We've added {subscriptionDetails.bonusDays} extra days to your plan.</p>
             </motion.div>
          )}

          {/* Actions */}
          <div className="pt-4">
            {status === "success" && (
              <Button onClick={handleContinue} className="w-full gap-2">
                Continue to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {status === "error" && (
              <div className="flex flex-col gap-3">
                <Button onClick={handleRetry} variant={ButtonVariant.Outline} className="w-full">
                  Try Again
                </Button>
                <Button 
                    onClick={() => router.push("/dashboard")} 
                    variant={ButtonVariant.Ghost} 
                    className="w-full text-gray-500 hover:text-gray-700"
                >
                  Return to Dashboard
                </Button>
              </div>
            )}
            
            {status === "verifying" && (
                 <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-4">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Secured by Monnify</span>
                 </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
       </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
