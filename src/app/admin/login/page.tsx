"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { SignInFormField, ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { adminActions } from "@/store/redux/admin/admin-slice";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/shared/LoadingState";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, sendHttpRequest: signInReq, error, clearError } = useHttp();

  const { values, errors, touched, handleChange: originalHandleChange, handleBlur, validate, isValid } = useForm(
    {
      email: "",
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

  // Wrap handleChange to clear errors when user starts typing
  const handleChange = (field: SignInFormField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    originalHandleChange(field)(e);
  };

  const signInSuccessResHandler = (response: any) => {
    if (response?.data?.message === "success") {
      const adminData = response?.data?.data;
      
      // Store admin data in Redux
      dispatch(adminActions.setAdminUser({
        _id: adminData._id,
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        phoneNumber: adminData.phoneNumber,
        role: "admin",
      }));
      
      // Check for saved redirect path (session restoration)
      const redirectPath = sessionStorage.getItem("adminRedirectAfterLogin");
      if (redirectPath) {
        sessionStorage.removeItem("adminRedirectAfterLogin");
        router.push(redirectPath);
      } else {
        router.push("/admin/dashboard");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validate()) {
      return;
    }

    signInReq({
      successRes: signInSuccessResHandler,
      errorRes: () => true,
      requestConfig: {
        url: "/admin/auth/login",
        method: HttpMethod.POST,
        body: {
          email: values.email,
          password: values.password,
        },
      },
    });
  };

  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-emerald-100 p-3 rounded-full">
              <Shield className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Login</h1>
          <p className="text-slate-600">Sign in to access the admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            value={values.email}
            onChange={handleChange(SignInFormField.Email)}
            onBlur={handleBlur(SignInFormField.Email)}
            placeholder="admin@taxcomply.com.ng"
            error={touched.email && errors.email ? errors.email : undefined}
            disabled={isLoading}
            required
          />

          <Input
            label="Password"
            type="password"
            value={values.password}
            onChange={handleChange(SignInFormField.Password)}
            onBlur={handleBlur(SignInFormField.Password)}
            placeholder="Enter your password"
            error={touched.password && errors.password ? errors.password : undefined}
            disabled={isLoading}
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {typeof error === 'string' ? error : (error as any)?.message || "An error occurred"}
            </div>
          )}

          <Button
            type="submit"
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            className="w-full"
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <span className="mr-2">Signing in...</span>
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

