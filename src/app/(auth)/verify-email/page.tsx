"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { VerifyEmailForm } from "@/components/auth/verify-email/VerifyEmailForm";
import { hasPendingReviewIntent, getReviewIntent } from "@/lib/utils/review-redirect";
import { validateReturnUrl } from "@/lib/utils/return-url";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, sendHttpRequest: verifyReq } = useHttp();
  const { isLoading: isResending, sendHttpRequest: resendReq } = useHttp();

  // Extract email from query parameter
  const emailFromQuery = searchParams?.get("email") ? decodeURIComponent(searchParams.get("email")!) : "";

  const { values, errors, touched, handleChange, handleBlur, validate, setValue } = useForm(
    {
      email: emailFromQuery || "",
      otp: "",
    },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      otp: {
        required: true,
        minLength: 6,
        maxLength: 6,
      },
    }
  );

  // Populate email from query parameter when component mounts or query param changes
  useEffect(() => {
    if (emailFromQuery && emailFromQuery !== values.email) {
      setValue("email", emailFromQuery);
    }
  }, [emailFromQuery, setValue, values.email]);

  const verifySuccessResHandler = (response: any) => {
    if (response?.data?.message === "success") {
      setTimeout(() => {
        const email = encodeURIComponent(values.email.trim());
        
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
        router.push(`/sign-in?email=${email}&verified=true`);
      }, 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    verifyReq({
      successRes: verifySuccessResHandler,
      requestConfig: {
        url: "/auth/verify",
        method: HttpMethod.POST,
        body: {
          email: values.email,
          otp: values.otp,
        },
        successMessage: "Email verified successfully! Redirecting...",
      },
    });
  };

  const handleResend = async () => {
    if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      return;
    }

    resendReq({
      successRes: () => {},
      requestConfig: {
        url: "/auth/resend-otp",
        method: HttpMethod.POST,
        body: {
          email: values.email,
        },
        successMessage: "Verification code sent to your email",
      },
    });
  };

  return (
    <AuthLayout>
      <AuthCard>
        <VerifyEmailForm
          values={values}
          errors={errors}
          touched={touched}
          handleChange={handleChange}
          handleBlur={handleBlur}
          handleSubmit={handleSubmit}
          handleResend={handleResend}
          isLoading={isLoading}
          isResending={isResending}
        />
      </AuthCard>
    </AuthLayout>
  );
}

