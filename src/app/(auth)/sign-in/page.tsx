"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { userActions } from "@/store/redux/user/user-slice";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { EmailVerificationPrompt } from "@/components/auth/EmailVerificationPrompt";
import { SignInForm } from "@/components/auth/signin/SignInForm";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { SignInFormField } from "@/lib/utils/client-enums";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isLoading, sendHttpRequest: signInReq, error, clearError } = useHttp();

  // Get email and verified status from query params
  const emailFromQuery = searchParams?.get("email") ? decodeURIComponent(searchParams.get("email")!) : "";
  const isVerified = searchParams?.get("verified") === "true";

  const { values, errors, touched, handleChange: originalHandleChange, handleBlur, validate, isValid, setValue } = useForm(
    {
      email: emailFromQuery || "",
      password: "",
    },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      password: {
        required: true,
      },
    }
  );

  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  // Remember me checkbox - default to true (checked) for better UX
  const [rememberMe, setRememberMe] = useState(true);

  // Pre-fill email from query parameter
  useEffect(() => {
    if (emailFromQuery && emailFromQuery !== values.email) {
      setValue("email", emailFromQuery);
    }
    // Show success message if user just verified their email
    if (isVerified) {
      setShowVerificationSuccess(true);
      // Clear the verified param from URL after showing message
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("verified");
      window.history.replaceState({}, "", newUrl.toString());
      // Hide success message after 5 seconds
      const timer = setTimeout(() => {
        setShowVerificationSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailFromQuery, isVerified]);

  // Wrap handleChange to clear errors when user starts typing
  const handleChange = (field: SignInFormField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    if (showVerificationSuccess) {
      setShowVerificationSuccess(false);
    }
    originalHandleChange(field)(e);
  };

  const signInSuccessResHandler = async (response: any) => {
    if (response?.data?.message === "success") {
      const userData = response?.data?.data;
      const accountType = userData?.accountType;
      
      // Store user data in Redux
      dispatch(userActions.setUser({
        _id: userData._id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        accountType: accountType,
        isEmailVerified: userData.isEmailVerified,
        companyId: userData.companyId || null,
        role: userData.role,
      }));

      // Check for saved redirect path (session restoration)
      const redirectPath = sessionStorage.getItem("redirectAfterLogin");
      if (redirectPath) {
        sessionStorage.removeItem("redirectAfterLogin");
        router.push(redirectPath);
        return;
      }

      // Check for return URL token (from review flow)
      const returnToken = sessionStorage.getItem("return_url");
      if (returnToken) {
        try {
          // Dynamic import for client-side compatibility
          const { validateReturnUrl } = await import("@/lib/utils/return-url");
          const validatedPath = validateReturnUrl(returnToken);
          if (validatedPath === "/reviews/write") {
            sessionStorage.removeItem("return_url");
            router.push("/reviews/write");
            return;
          }
        } catch (error) {
          // If validation fails (e.g., crypto not available in browser), just clear token
          console.warn("Failed to validate return URL:", error);
          sessionStorage.removeItem("return_url");
        }
      }

      // Default: For individual accounts, redirect to expenses page
      // For company accounts, redirect to dashboard
      if (accountType === AccountType.Individual) {
        router.push("/dashboard/expenses");
      } else {
        router.push("/dashboard");
      }
    } else if (response?.data?.message === "verify_email") {
      setVerificationEmail(values.email);
      setShowEmailVerification(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    signInReq({
      successRes: signInSuccessResHandler,
      errorRes: (errorResponse: any) => {
        if (errorResponse?.status === 403 && errorResponse?.data?.data?.requiresVerification) {
          const email = errorResponse.data.data.email || values.email.trim();
          setVerificationEmail(email);
          setShowEmailVerification(true);
          return false;
        }
        return true;
      },
      requestConfig: {
        url: "/auth/sign-in",
        method: HttpMethod.POST,
        body: {
          email: values.email.trim(),
          password: values.password,
        },
        successMessage: "Signed in successfully",
      },
    });
  };

  return (
    <AuthLayout>
      <AuthCard>
        {showEmailVerification ? (
          <EmailVerificationPrompt
            email={verificationEmail}
            onBack={() => {
              setShowEmailVerification(false);
              setVerificationEmail("");
            }}
          />
        ) : (
          <SignInForm
            values={values}
            errors={errors}
            touched={touched}
            handleChange={handleChange}
            handleBlur={handleBlur}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            isValid={isValid}
            error={error ? (error.description || error.message) : null}
            showVerificationSuccess={showVerificationSuccess}
            onClearError={clearError}
            rememberMe={rememberMe}
            onRememberMeChange={setRememberMe}
          />
        )}
      </AuthCard>
    </AuthLayout>
  );
}
