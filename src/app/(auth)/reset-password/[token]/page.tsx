"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { SuccessState } from "@/components/shared/SuccessState";
import { ResetPasswordForm } from "@/components/auth/reset-password/ResetPasswordForm";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  const { isLoading, sendHttpRequest: resetPasswordReq } = useHttp();
  const [success, setSuccess] = useState(false);

  const { values, errors, touched, handleChange, handleBlur, validate } = useForm(
    {
      newPassword: "",
      confirmPassword: "",
    },
    {
      newPassword: {
        required: true,
        minLength: 8,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      },
      confirmPassword: {
        required: true,
        custom: (value) => {
          if (value !== values.newPassword) {
            return "Passwords do not match";
          }
          return null;
        },
      },
    }
  );

  const resetPasswordSuccessResHandler = (response: any) => {
    if (response?.data?.message === "success") {
      setSuccess(true);
      setTimeout(() => {
        router.push("/sign-in");
      }, 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (!token) {
      return;
    }

    resetPasswordReq({
      successRes: resetPasswordSuccessResHandler,
      requestConfig: {
        url: "/auth/reset-password",
        method: HttpMethod.POST,
        body: {
          token,
          newPassword: values.newPassword,
        },
        successMessage: "Password reset successfully! Redirecting...",
      },
    });
  };

  if (success) {
    return (
      <AuthLayout>
        <AuthCard>
          <SuccessState
            title="Password Reset Successful"
            description="Your password has been reset. You can now sign in with your new password."
            actionLabel="Go to Sign In"
            onAction={() => router.push("/sign-in")}
          />
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <ResetPasswordForm
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

