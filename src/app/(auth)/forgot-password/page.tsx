"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { SuccessState } from "@/components/shared/SuccessState";
import { ForgotPasswordForm } from "@/components/auth/forgot-password/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { isLoading, sendHttpRequest: forgotPasswordReq } = useHttp();
  const [success, setSuccess] = useState(false);

  const { values, errors, touched, handleChange, handleBlur, validate } = useForm(
    {
      email: "",
    },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
    }
  );

  const forgotPasswordSuccessResHandler = (response: any) => {
    if (response?.data?.message === "success") {
      setSuccess(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    forgotPasswordReq({
      successRes: forgotPasswordSuccessResHandler,
      requestConfig: {
        url: "/auth/forgot-password",
        method: HttpMethod.POST,
        body: {
          email: values.email,
        },
        successMessage: "Password reset link sent to your email",
      },
    });
  };

  if (success) {
    return (
      <AuthLayout>
        <AuthCard>
          <SuccessState
            title="Check Your Email"
            description={`We've sent a password reset link to <email>`}
            email={values.email}
            additionalInfo="The link will expire in 1 hour. If you don't see the email, check your spam folder."
            actionLabel="Back to Sign In"
            onAction={() => router.push("/sign-in")}
          />
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <ForgotPasswordForm
          values={values}
          errors={errors}
          touched={touched}
          handleChange={handleChange}
          handleBlur={handleBlur}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </AuthCard>
    </AuthLayout>
  );
}

