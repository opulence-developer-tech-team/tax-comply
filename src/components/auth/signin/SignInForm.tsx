"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthHeader } from "../AuthHeader";
import { SignInFormField, AlertVariant } from "@/lib/utils/client-enums";

interface SignInFormProps {
  values: {
    email: string;
    password: string;
  };
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  handleChange: (field: SignInFormField) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (field: SignInFormField) => (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isValid: boolean;
  error: string | null;
  showVerificationSuccess?: boolean;
  onClearError?: () => void;
  rememberMe?: boolean;
  onRememberMeChange?: (checked: boolean) => void;
}

export function SignInForm({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  handleSubmit,
  isLoading,
  isValid,
  error,
  showVerificationSuccess = false,
  onClearError,
  rememberMe = true,
  onRememberMeChange,
}: SignInFormProps) {
  return (
    <>
      <AuthHeader
        logo
        title="Sign in to your account"
        subtitle="Stay Compliant. Avoid Penalties. 🇳🇬"
      />

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 space-y-6"
        onSubmit={handleSubmit}
      >
        {showVerificationSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-1"
          >
            <Alert variant={AlertVariant.Success}>
              <p className="font-medium">Email verified successfully! Please sign in to continue.</p>
            </Alert>
          </motion.div>
        )}
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-1"
          >
            <Alert variant={AlertVariant.Error} onClose={onClearError}>
              <p className="font-medium">{error}</p>
            </Alert>
          </motion.div>
        )}

        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Input
              label="Email Address"
              type="email"
              required
              placeholder="you@example.com"
              value={values.email}
              onChange={handleChange(SignInFormField.Email)}
              onBlur={handleBlur(SignInFormField.Email)}
              error={touched.email ? (errors.email ?? undefined) : undefined}
              autoComplete="email"
              name="email"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <PasswordInput
              label="Password"
              required
              placeholder="Enter your password"
              value={values.password}
              onChange={handleChange(SignInFormField.Password)}
              onBlur={handleBlur(SignInFormField.Password)}
              error={touched.password ? (errors.password ?? undefined) : undefined}
              autoComplete="current-password"
              name="password"
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center group">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange?.(e.target.checked)}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer transition-colors"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 cursor-pointer group-hover:text-slate-900 transition-colors">
              Remember me
            </label>
          </div>

          <Link
            href="/forgot-password"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Forgot password?
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Button
            type="submit"
            disabled={isLoading || !isValid}
            loading={isLoading}
            className="w-full py-3 text-base font-semibold"
          >
            Sign In
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="text-center pt-4 border-t border-slate-100"
        >
          <p className="text-sm text-slate-600">
            Don't have an account?{" "}
            <Link
              href="/sign-up"
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Create one
            </Link>
          </p>
        </motion.div>
      </motion.form>
    </>
  );
}
