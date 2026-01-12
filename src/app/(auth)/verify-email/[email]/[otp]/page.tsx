"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { useHttp } from "@/hooks/useHttp";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { hasPendingReviewIntent, getReviewIntent } from "@/lib/utils/review-redirect";
import { validateReturnUrl } from "@/lib/utils/return-url";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface VerifyEmailPageProps {
  params: Promise<{
    email: string;
    otp: string;
  }>;
}

export default function VerifyEmailLinkPage({ params }: VerifyEmailPageProps) {
  const router = useRouter();
  const { isLoading, sendHttpRequest: verifyReq } = useHttp();
  const { isLoading: isResending, sendHttpRequest: resendReq } = useHttp();
  
  const [verificationStatus, setVerificationStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  
  const { email: encodedEmail, otp } = use(params);
  const email = decodeURIComponent(encodedEmail);

  const verifySuccessResHandler = (response: any) => {
    if (response?.data?.message === "success" || response?.data?.user) {
      setVerificationStatus("success");
      
      setTimeout(() => {
        const encodedEmail = encodeURIComponent(email.trim());
        
        // Check for return URL token (from review flow)
        const returnToken = typeof window !== "undefined" ? sessionStorage.getItem("return_url") : null;
        
        if (returnToken) {
          const validatedPath = validateReturnUrl(returnToken);
          if (validatedPath === "/reviews/write") {
            // Clear return URL and redirect to review form
            sessionStorage.removeItem("return_url");
            router.push("/reviews/write");
            return;
          }
        }
        
        // Check if user has pending review intent (from guest review attempt)
        if (hasPendingReviewIntent()) {
          const intent = getReviewIntent();
          // Store review intent in sessionStorage for review page to access
          if (intent?.reviewData) {
            sessionStorage.setItem("pending_review_data", JSON.stringify(intent.reviewData));
            sessionStorage.setItem("pending_review_source", intent.source || "unknown");
          }
          // Store redirect path for after login
          sessionStorage.setItem("redirectAfterLogin", "/reviews/write");
        }
        
        // Default: Redirect to sign-in with email pre-filled for convenience
        router.push(`/sign-in?email=${encodedEmail}&verified=true`);
      }, 2000);
    } else {
        setVerificationStatus("error");
        setErrorMessage(response?.message || "Verification failed. Please try again.");
    }
  };

  const handleVerificationError = (err: any) => {
      setVerificationStatus("error");
      setErrorMessage(err?.message || "Verification failed. Please try again.");
  }

  useEffect(() => {
    if (email && otp) {
      verifyReq({
        successRes: verifySuccessResHandler,
        errorRes: handleVerificationError,
        requestConfig: {
          url: "/auth/verify",
          method: HttpMethod.POST,
          body: {
            email,
            otp,
          },
        },
      });
    } else {
        setVerificationStatus("error");
        setErrorMessage("Invalid verification link.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, otp]); 

  const handleResend = async () => {
    if (!email) return;

    resendReq({
      successRes: () => {},
      requestConfig: {
        url: "/auth/resend-otp",
        method: HttpMethod.POST,
        body: {
          email: email,
        },
        successMessage: "Verification code sent to your email",
      },
    });
  };

  return (
    <AuthLayout>
      <AuthCard>
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          
          {verificationStatus === "verifying" && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
            >
              <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
              <p className="text-sm text-gray-600">Please wait while we confirm your email address.</p>
            </motion.div>
          )}

          {verificationStatus === "success" && (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
            >
              <div className="rounded-full bg-emerald-100 p-3 mb-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-sm text-gray-600 mb-6">Your email has been successfully verified. Redirecting you...</p>
            </motion.div>
          )}

          {verificationStatus === "error" && (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center w-full"
            >
              <div className="rounded-full bg-red-100 p-3 mb-4">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-sm text-gray-600 mb-6 text-center max-w-xs">{errorMessage}</p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                    {isResending ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        "Resend Verification Email"
                    )}
                </button>
                
                <Link 
                    href={`/verify-email?email=${encodeURIComponent(email)}`}
                    className="text-sm text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
                >
                    Enter Code Manually
                </Link>
              </div>
            </motion.div>
          )}

        </div>
      </AuthCard>
    </AuthLayout>
  );
}
