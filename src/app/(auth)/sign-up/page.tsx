"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignUpForm } from "@/components/auth/signup/SignUpForm";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { SignUpFormField } from "@/lib/utils/client-enums";

interface SignUpPageProps {
  referralId?: string;
}

export default function SignUpPage({ referralId: propReferralId }: SignUpPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, sendHttpRequest: signUpReq, error, clearError } = useHttp();
  
  // Get referralId from props, URL params, or search params
  const urlReferralId = searchParams?.get("ref") || propReferralId;
  
  // Get return URL for review flow
  const returnUrl = searchParams?.get("return");

  const { values, errors, touched, handleChange: originalHandleChange, handleBlur, validate, isValid } = useForm(
    {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      accountType: AccountType.Company,
      referralId: urlReferralId || "",
    },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      password: {
        required: true,
        minLength: 8,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      },
      confirmPassword: {
        required: true,
        custom: (value) => {
          if (value !== values.password) {
            return "Passwords do not match";
          }
          return null;
        },
      },
      firstName: {
        required: true,
        minLength: 2,
        maxLength: 50,
      },
      lastName: {
        required: true,
        minLength: 2,
        maxLength: 50,
      },
    }
  );

  // Note: referralId is pre-filled in initial values from urlReferralId

  // Wrap handleChange to clear errors when user starts typing
  const handleChange = (field: SignUpFormField) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    clearError();
    originalHandleChange(field)(e);
  };

  const signUpSuccessResHandler = (response: any) => {
    if (response?.data?.message === "success") {
      const accountType = values.accountType;
      // Pass email as query parameter to verify-email page
      const email = encodeURIComponent(values.email.trim());
      
      // Store return URL token if present (for review flow)
      if (returnUrl && typeof window !== "undefined") {
        sessionStorage.setItem("return_url", returnUrl);
      }
      
      setTimeout(() => {
        router.push(`/verify-email?email=${email}`);
      }, 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const { confirmPassword, ...signUpData } = values;
    signUpReq({
      successRes: signUpSuccessResHandler,
      requestConfig: {
        url: "/auth/sign-up",
        method: HttpMethod.POST,
        body: signUpData,
        successMessage: "Account created! Please check your email for verification code.",
      },
    });
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col items-center">
        <AuthCard>
        <SignUpForm
          values={{
            ...values,
            accountType: values.accountType,
            referralId: values.referralId || "",
          }}
          errors={errors}
          touched={touched}
          handleChange={handleChange}
          handleBlur={handleBlur}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          isValid={isValid}
          error={error ? (error.description || error.message) : null}
          onClearError={clearError}
        />
        </AuthCard>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center text-xs text-emerald-200/70 mt-4 relative z-10 w-full max-w-md"
        >
          By signing up, you agree to our{" "}
          <a href="#" className="text-emerald-300 hover:text-emerald-200 font-medium underline">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-emerald-300 hover:text-emerald-200 font-medium underline">Privacy Policy</a>
        </motion.p>
      </div>
    </AuthLayout>
  );
}
